/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './client/index.html',
    './client/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
