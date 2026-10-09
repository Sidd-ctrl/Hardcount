import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: '#07080a',
          900: '#0c0e11',
          850: '#111418',
          800: '#171b20',
          750: '#1d2228',
          700: '#252b33',
          600: '#333b45',
          500: '#4a545f',
          400: '#6b7683',
          300: '#98a2ad',
          200: '#c2c9d1',
          100: '#e4e8ec',
        },
        amber: {
          glow: '#ffb547',
          deep: '#e08b1c',
        },
        steel: {
          glow: '#5ab0f0',
          deep: '#2b6f9e',
        },
        alert: {
          glow: '#ff6b5e',
          deep: '#b23c33',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Inter',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'JetBrains Mono',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        inset: 'inset 0 1px 0 0 rgb(255 255 255 / 0.04)',
        panel: '0 24px 48px -24px rgb(0 0 0 / 0.72), 0 2px 6px -2px rgb(0 0 0 / 0.4)',
        raised: '0 40px 80px -32px rgb(0 0 0 / 0.8)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.9' },
        },
        sweep: {
          '0%': { transform: 'translateY(-110%)' },
          '100%': { transform: 'translateY(210%)' },
        },
      },
      animation: {
        breathe: 'breathe 3.6s ease-in-out infinite',
        sweep: 'sweep 7s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
