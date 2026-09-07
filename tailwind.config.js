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
        },
        fc: {
          bg: 'var(--fc-bg)',
          'bg-subtle': 'var(--fc-bg-subtle)',
          surface: {
            1: 'var(--fc-surface-1)',
            2: 'var(--fc-surface-2)',
            3: 'var(--fc-surface-3)',
          },
          text: {
            primary: 'var(--fc-text-primary)',
            secondary: 'var(--fc-text-secondary)',
            muted: 'var(--fc-text-muted)',
            inverse: 'var(--fc-text-inverse)',
          },
          border: {
            subtle: 'var(--fc-border-subtle)',
            DEFAULT: 'var(--fc-border-default)',
            strong: 'var(--fc-border-strong)',
          },
          accent: {
            DEFAULT: 'var(--fc-accent)',
            hover: 'var(--fc-accent-hover)',
            soft: 'var(--fc-accent-soft)',
            contrast: 'var(--fc-accent-contrast)',
          },
          success: {
            DEFAULT: 'var(--fc-success)',
            soft: 'var(--fc-success-soft)',
          },
          warning: {
            DEFAULT: 'var(--fc-warning)',
            soft: 'var(--fc-warning-soft)',
          },
          danger: {
            DEFAULT: 'var(--fc-danger)',
            soft: 'var(--fc-danger-soft)',
          },
          info: {
            DEFAULT: 'var(--fc-info)',
            soft: 'var(--fc-info-soft)',
          },
          'focus-ring': 'var(--fc-focus-ring)',
        }
      },
      boxShadow: {
        'gold-glow': '0 10px 30px -10px rgba(242, 183, 5, 0.3)',
        'fc-sm': 'var(--fc-shadow-sm)',
        'fc-md': 'var(--fc-shadow-md)',
        'fc-lg': 'var(--fc-shadow-lg)',
        'fc-glow': 'var(--fc-shadow-glow)',
      },
      borderRadius: {
        'fc-sm': 'var(--fc-radius-sm)',
        'fc-md': 'var(--fc-radius-md)',
        'fc-lg': 'var(--fc-radius-lg)',
        'fc-xl': 'var(--fc-radius-xl)',
      }
    },
  },
  plugins: [],
}