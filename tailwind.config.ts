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
          DEFAULT: 'var(--brand-accent)',
          hover: 'var(--brand-hover)',
          dark: 'var(--brand-dark)',
          gold: '#E8B86D',
        },
        surface: {
          base: '#16161E',
          card: '#1F1F2E',
          raised: '#272737',
          border: '#2E2E40',
          footer: '#111118',
        },
        // shadcn/ui CSS variable mappings
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
