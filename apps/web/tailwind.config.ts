import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#141816',
        panel: '#1c2420',
        paper: '#f4f0e6',
        rule: '#d9d2c3',
        amber: '#e39b2b',
        signal: '#c4472f',
        sage: '#2c6b48',
        moss: '#7f9a78',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'var(--font-arabic)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
