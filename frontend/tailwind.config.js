/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: { 750: '#293548', 850: '#172033', 950: '#0c1624' },
      },
      boxShadow: {
        'card': '0 0 0 1px rgba(255,255,255,0.025) inset, 0 4px 8px -2px rgba(0,0,0,0.5), 0 24px 48px -8px rgba(0,0,0,0.6)',
        'glow-teal': '0 0 32px -6px rgba(20,184,166,0.4)',
        'glow-indigo': '0 0 32px -6px rgba(99,102,241,0.4)',
      },
      animation: {
        'fade-up':    'fadeUp 0.4s cubic-bezier(0.2,0,0,1) both',
        'fade-in':    'fadeIn 0.3s cubic-bezier(0.2,0,0,1) both',
        'scale-in':   'scaleIn 0.35s cubic-bezier(0.2,0,0,1) both',
        'slide-up':   'fadeUp 0.3s cubic-bezier(0.2,0,0,1) both',
        'float':      'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':    'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeUp:  { from:{opacity:'0',transform:'translateY(10px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        fadeIn:  { from:{opacity:'0'}, to:{opacity:'1'} },
        scaleIn: { from:{opacity:'0',transform:'scale(0.93)'}, to:{opacity:'1',transform:'scale(1)'} },
        float:   { '0%,100%':{transform:'translateY(0px)'}, '50%':{transform:'translateY(-6px)'} },
        shimmer: { from:{backgroundPosition:'-200% center'}, to:{backgroundPosition:'200% center'} },
      },
    },
  },
  plugins: [],
};
