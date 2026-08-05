/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Roboto', 'sans-serif'], 
        'gloock': ['Gloock', 'serif'],
        'concert-one': ['Concert One', 'cursive'],
        'basic': ['Basic', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        carbon: {
          900: '#1A1A1A',
          800: '#3A3A3A',
          700: '#4A4A4A',
        },
        gold: {
          DEFAULT: '#F2B705',
          light: '#F6D365',
          cream: '#FFF3D6',
        }
      },
      boxShadow: {
        'gold-glow': '0 10px 30px -10px rgba(242, 183, 5, 0.3)',
      }
    },
  },
  plugins: [],
}