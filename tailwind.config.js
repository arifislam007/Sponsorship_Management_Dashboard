/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#14856E',
          600: '#0f6b5a',
          700: '#0d5c4d',
        }
      }
    },
  },
  plugins: [],
}
