/** @type {import('tailwindcss').Config} */
export default {
  content: [],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        blue: {
          50:  '#f0f4f9',
          100: '#dbe7f4',
          200: '#b6d1ea',
          300: '#87b5de',
          400: '#5a94ce',
          500: '#316faa',
          600: '#143C72',
          700: '#0F2D57',
          800: '#0C2344',
          900: '#08182F',
        },
        'dark-base': '#0D1412',
        'dark-surface': '#1A1F1D',
        'dark-glass': 'rgba(255, 255, 255, 0.05)',
        'dark-border': 'rgba(255, 255, 255, 0.1)',
        'dark-text': '#E8E8E8',
        'dark-text-secondary': '#A0A0A0',
        'light-base': '#FFFFFF',
        'light-surface': '#FFFFFF',
        'light-glass': 'rgba(30, 58, 138, 0.05)',
        'light-border': 'rgba(30, 58, 138, 0.1)',
        'light-text': '#1e293b',
        'light-text-secondary': '#475569',
        'lime-accent': '#1e3a8a',
        'lime-glow': 'rgba(30, 58, 138, 0.2)',
        'pxo': {
          'primary': '#143C72',
          'secondary': '#0F2D57',
          'gradient-start': '#143C72',
          'gradient-end': '#0F2D57',
        }
      },
      fontFamily: {
        'editorial': ['Outfit', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(30, 58, 138, 0.3)',
        'glow-lg': '0 0 40px rgba(30, 58, 138, 0.4)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
      },
      backdropBlur: {
        'glass': '16px',
      },
      backgroundImage: {
        'pxo-gradient': 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        'pxo-gradient-reverse': 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
      }
    },
  },
  plugins: [],
};
