// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'background-main': 'var(--background-main)',
        'background-card': 'var(--background-card)',
        'background-card-hover': 'var(--background-card-hover)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-on-accent': 'var(--text-on-accent)',
        
        'accent-blue': 'var(--accent-blue)',
        'accent-blue-hover': 'var(--accent-blue-hover)',
        'accent-blue-darker-for-border': 'var(--accent-blue-darker-for-border)',

        'accent-yellow': 'var(--accent-yellow)',
        'accent-yellow-hover': 'var(--accent-yellow-hover)',
        'accent-yellow-darker-for-border': 'var(--accent-yellow-darker-for-border)',
        
        'accent-dark': 'var(--accent-dark)',
        'accent-green': 'var(--accent-green)',
        'accent-orange': 'var(--accent-orange)',
        'accent-red': 'var(--accent-red)',
        'border-subtle': 'var(--border-subtle)',
        'border-input': 'var(--border-input)',
        'border-input-focus': 'var(--border-input-focus)',

        'messageTextDanger': 'var(--messageTextDanger)',
      },
      fontFamily: {
        sans: ['var(--font-main)', 'sans-serif'],
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
