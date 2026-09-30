/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './privacy/index.html', './faq/index.html', './*.tsx', './components/**/*.tsx'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
