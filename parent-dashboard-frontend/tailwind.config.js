// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'background-main': 'var(--background-main)',
        'background-card': 'var(--background-card)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-on-accent': 'var(--text-on-accent)',
        
        'accent-blue': 'var(--accent-blue)',
        'accent-blue-hover': 'var(--accent-blue-hover)',
        'blue-700': '#0052B2',
        'blue-800': '#00418C', 

        'gray-100': '#F3F4F6',
        'gray-200': '#E5E7EB',
        'gray-300': '#D1D5DB',
        'gray-400': '#9CA3AF', 
        'gray-500': '#6B7280', 

        'accent-green': 'var(--accent-green)',
        'accent-orange': 'var(--accent-orange)',
        'accent-red': 'var(--accent-red)',
        'border-subtle': 'var(--border-subtle)',
        'border-input': 'var(--border-input)',
        'border-input-focus': 'var(--border-input-focus)',
      },
      fontFamily: {
        sans: ['var(--font-main)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)', 
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)', 
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(5px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0px) scale(1)' },
        },
      },
      scale: {
        '97': '0.97',
      }
    },
  },
  plugins: [],
};