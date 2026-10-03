/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#090a0f',
          800: '#11131c',
          700: '#181b28',
          600: '#222638'
        }
      }
    },
  },
  plugins: [],
};
