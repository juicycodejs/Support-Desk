import { GoogleGenAI, Type } from '@google/genai';
import { Server } from 'socket.io';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/database';
import { createTrace, langfuse } from '../config/langfuse';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface AIAnalysis {
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  visualAssessment: string;
  aiDraftResponse: string;
  sentimentScore: number;
  keyIssues: string[];
  suggestedActions: string[];
}

export async function processMultimodalTicket(
  ticketId: string,
  textContext: string,
  imagePath: string | null,
  io: Server
): Promise<void> {
  const trace = createTrace('support-triage-pipeline', { ticketId });
  const startTime = Date.now();

  try {
    const span = trace.span({ name: 'gemini-analysis', input: { ticketId, textLength: textContext.length } });

    const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      {
        text: `You are an expert e-commerce support triage AI. Analyze this customer support ticket and provide a structured assessment.

Customer Message: "${textContext}"

${imagePath ? 'An image has been provided. Carefully analyze it for: shipping damage, wrong items, packaging issues, fraud indicators, or any visible defects.' : 'No image provided — base your assessment solely on the text.'}

Provide a thorough, empathetic analysis following the JSON schema exactly.`,
      },
    ];

    if (imagePath && fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const ext = path.extname(imagePath).toLowerCase().replace('.', '');
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
      contents.push({
        inlineData: { mimeType, data: imageBuffer.toString('base64') },
      });
    }

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents as Parameters<typeof ai.models.generateContent>[0]['contents'],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'Primary issue category: DAMAGE, SHIPPING, FRAUD, BILLING, WRONG_ITEM, RETURN_REFUND, GENERAL',
            },
            priority: {
              type: Type.STRING,
              description: 'Urgency level: LOW, MEDIUM, HIGH, URGENT',
            },
            visualAssessment: {
              type: Type.STRING,
              description: imagePath
                ? 'Detailed visual breakdown of what was observed in the image — specific damage types, condition of packaging, item state, any fraud indicators'
                : 'Text-only analysis — describe the customer issue based on their message',
            },
            aiDraftResponse: {
              type: Type.STRING,
              description: 'Empathetic, professional draft response to send the customer. Address their specific concern, apologize sincerely, and outline next steps clearly.',
            },
            sentimentScore: {
              type: Type.NUMBER,
              description: 'Customer sentiment score from 1 (very angry/distressed) to 10 (calm/neutral)',
            },
            keyIssues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of 2-4 specific issues identified',
            },
            suggestedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of 2-4 recommended agent actions to resolve this ticket',
            },
          },
          required: ['category', 'priority', 'visualAssessment', 'aiDraftResponse', 'sentimentScore', 'keyIssues', 'suggestedActions'],
        },
      },
    });

    const latencyMs = Date.now() - startTime;
    const rawText = aiResponse.text ?? '{}';
    const analysis: AIAnalysis = JSON.parse(rawText);

    span.end({
      output: { category: analysis.category, priority: analysis.priority, sentimentScore: analysis.sentimentScore },
      metadata: { latencyMs, modelUsed: 'gemini-2.5-flash' },
    });

    trace.generation({
      name: 'ticket-classification',
      model: 'gemini-2.5-flash',
      input: textContext,
      output: rawText,
      metadata: { latencyMs, ticketId },
    });

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        category: analysis.category,
        priority: analysis.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        visualAssessment: analysis.visualAssessment,
        aiDraftResponse: analysis.aiDraftResponse,
        status: 'ASSIGNED',
      },
    });

    await prisma.message.create({
      data: {
        ticketId,
        text: `**AI Triage Complete** ✦\n\n**Draft Response:**\n${analysis.aiDraftResponse}\n\n**Key Issues Detected:**\n${analysis.keyIssues.map(i => `• ${i}`).join('\n')}\n\n**Suggested Actions:**\n${analysis.suggestedActions.map(a => `→ ${a}`).join('\n')}`,
        sender: 'AI_SYSTEM',
      },
    });

    io.emit('ticket:queued', {
      ticketId,
      updatedTicket,
      draft: analysis.aiDraftResponse,
      keyIssues: analysis.keyIssues,
      suggestedActions: analysis.suggestedActions,
      sentimentScore: analysis.sentimentScore,
      latencyMs,
    });

    await langfuse.flushAsync().catch(() => {});
  } catch (error) {
    console.error('AI Ingestion Pipeline Failed:', error);

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { category: 'GENERAL', priority: 'MEDIUM', status: 'ASSIGNED' },
    });

    io.emit('ticket:queued', {
      ticketId,
      updatedTicket: await prisma.ticket.findUnique({ where: { id: ticketId } }),
      draft: 'Thank you for reaching out. Our team is reviewing your case and will respond shortly.',
      keyIssues: ['Manual review required'],
      suggestedActions: ['Review ticket manually', 'Contact customer within 2 hours'],
      sentimentScore: 5,
      latencyMs: Date.now() - startTime,
    });
  }
}

export async function generateAgentReply(
  ticketId: string,
  agentInput: string,
  conversationHistory: Array<{ sender: string; text: string }>
): Promise<string> {
  const trace = createTrace('agent-reply-assist', { ticketId });

  try {
    const historyContext = conversationHistory
      .slice(-6)
      .map(m => `${m.sender}: ${m.text}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          text: `You are an expert e-commerce support assistant helping an agent compose a reply.

Recent conversation:
${historyContext}

Agent's draft/intent: "${agentInput}"

Improve this into a professional, empathetic customer-facing reply. Keep it concise (2-3 paragraphs max). Do not add placeholders like [Name] — write it ready to send.`,
        },
      ],
    });

    const improved = response.text ?? agentInput;
    trace.generation({ name: 'reply-improvement', model: 'gemini-2.5-flash', input: agentInput, output: improved });
    await langfuse.flushAsync().catch(() => {});
    return improved;
  } catch {
    return agentInput;
  }
}
