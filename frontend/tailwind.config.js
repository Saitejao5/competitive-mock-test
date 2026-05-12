/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace']
      },
      colors: {
        ink: { 950: '#07070d', 900: '#0d0d18', 800: '#13131f', 700: '#1a1a2e', 600: '#252540', 500: '#32325a' },
        violet: { DEFAULT: '#7c5cfc', soft: '#a98dff', dim: 'rgba(124,92,252,0.15)' },
        emerald: { exam: '#2dd98a', dim: 'rgba(45,217,138,0.12)' },
        flame: { DEFAULT: '#ff5757', dim: 'rgba(255,87,87,0.12)' },
        gold: { DEFAULT: '#f5a623', dim: 'rgba(245,166,35,0.12)' },
        sky: { exam: '#38bdf8', dim: 'rgba(56,189,248,0.12)' }
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-in': 'slideIn 0.35s ease forwards',
        'shimmer': 'shimmer 1.6s infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite'
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideIn: { '0%': { opacity: 0, transform: 'translateX(-12px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } }
      }
    }
  },
  plugins: []
};
