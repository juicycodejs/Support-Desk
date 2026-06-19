import { Langfuse } from 'langfuse';

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
  secretKey: process.env.LANGFUSE_SECRET_KEY || '',
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
  flushAt: 1,
});

export function createTrace(name: string, metadata?: Record<string, unknown>) {
  return langfuse.trace({
    name,
    metadata,
    tags: ['support-desk', 'ai-triage'],
  });
}
