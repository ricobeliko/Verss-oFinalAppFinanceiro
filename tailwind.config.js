/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // AJUSTE: O darkMode foi removido para fixar o tema.
  theme: {
    extend: {
      fontFamily: {
        // AJUSTE: 'Roboto' agora é a fonte padrão 'sans'.
        'sans': ['Roboto', 'sans-serif'], 
        'gloock': ['Gloock', 'serif'],
        'concert-one': ['Concert One', 'cursive'],
        'basic': ['Basic', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'], // Inter mantida caso precise dela.
      },
    },
  },
  plugins: [],
}
