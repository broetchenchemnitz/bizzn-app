import type { Config } from 'tailwindcss'

const config: Config = {
  // Force dark mode globally via the 'dark' class on <html>
  // Combined with className="dark" in layout.tsx, this locks the app
  // into dark mode permanently — no light-mode variants activate.
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#77CC00',
          dark: '#66b300',
          darker: '#5eaa00',
        },
        surface: {
          base: '#1A1A1A',
          card: '#242424',
          raised: '#2d2d2d',
          border: '#333333',
          footer: '#141414',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
