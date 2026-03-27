import type { Config } from 'tailwindcss'

const config: Config = {
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
        },
        surface: {
          base: '#1A1A1A',
          card: '#242424',
          raised: '#2d2d2d',
          border: '#333333',
        },
      },
    },
  },
  plugins: [],
}
export default config
