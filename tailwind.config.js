/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./service/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#D32F2F',
        secondary: '#00BCD4',
        darker: '#0F172A',
        dark: '#1E293B',
        accent: '#D32F2F',
        'dark-card': '#1E293B', // Using slate-800 equivalent
        'dark-border': '#334155', // Using slate-700 equivalent
        'dark-bg': '#0F172A', // Using slate-900 equivalent
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'button': '8px',
      },
      boxShadow: {
        'glow': '0 0 15px rgba(0, 188, 212, 0.6)',
        'corporate': '0 4px 20px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [],
}
