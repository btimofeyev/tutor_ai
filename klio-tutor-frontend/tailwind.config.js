/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'fredoka': ['Fredoka', 'system-ui', 'sans-serif'],
      },
      colors: {
        'accent-blue': '#B3E0F8',
        'accent-blue-hover': '#a1d4ee', 
        'accent-blue-border': '#87b8d4',
        'accent-yellow': '#FFE6A7',
        'accent-yellow-hover': '#fddc8a',
        'accent-yellow-border': '#e6c67f',
        'accent-green': '#A7F3D0',
        'accent-green-hover': '#82E0AA',
        'accent-green-border': '#69D899',
        'accent-red': '#FDA4AF',
        'accent-red-hover': '#FB7185',
        'accent-red-border': '#F85A71',
      },
      animation: {
        'bounce-gentle': 'bounce-gentle 1.5s infinite',
        'progress-bar': 'progress-bar 2s cubic-bezier(0.25, 1, 0.5, 1) forwards',
      },
      keyframes: {
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
        'progress-bar': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
}