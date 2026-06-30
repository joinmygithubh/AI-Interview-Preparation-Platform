/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#8B5CF6',
          500: '#6D28D9',
          600: '#5B21B6',
          700: '#4C1D95',
          800: '#3B1481',
          900: '#2E1065',
          950: '#1E0A45',
        },
        accent: { 400: '#FB923C', 500: '#F97316', 600: '#EA580C' },
        success: { 400: '#34D399', 500: '#10B981', 600: '#059669' },
        warning: { 400: '#FBBF24', 500: '#F59E0B' },
        danger: { 400: '#F87171', 500: '#EF4444' },
        surface: { light: '#FAFAF9', dark: '#0F172A' },
      },
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [],
};
