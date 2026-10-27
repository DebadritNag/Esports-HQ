/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        editorial: {
          ivory: '#F5F3EE',
          surface: '#FFFFFF',
          charcoal: '#202522',
          muted: '#777A75',
          green: '#246B4B',
          'green-hover': '#1B543A',
          'green-light': '#EBF4F0',
          orange: '#D97736',
          'orange-hover': '#BF6328',
          'orange-light': '#FDF3EC',
          border: '#E4E1D9',
          'border-strong': '#CCC7BA',
          dark: '#202522',
          'dark-surface': '#282E2A',
          'dark-border': '#39403B',
        },
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(32, 37, 34, 0.05)',
        card: '0 2px 8px -2px rgba(32, 37, 34, 0.08)',
        float: '0 8px 24px -4px rgba(32, 37, 34, 0.12)',
      },
    },
  },
  plugins: [],
}
