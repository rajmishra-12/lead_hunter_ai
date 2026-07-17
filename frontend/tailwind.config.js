/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#030712', // Pure deep black
          900: '#090d16', // Dark background
          800: '#111827', // Card background
          700: '#1f2937', // Border / subtle highlight
          600: '#374151',
          500: '#4b5563'
        },
        brand: {
          accent: '#8b5cf6', // Indigo / Purple glow
          green: '#10b981',  // High score / Won
          yellow: '#f59e0b', // Med score / Negotiating
          red: '#ef4444'     // Low score / Lost
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 15px 2px rgba(139, 92, 246, 0.15)',
      },
      backdropBlur: {
        glass: '16px',
      }
    },
  },
  plugins: [],
}
