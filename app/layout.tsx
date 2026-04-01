import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import NavbarWrapper from '@/components/NavbarWrapper'
import FooterWrapper from '@/components/FooterWrapper'
import ViewportFix from '@/components/ViewportFix'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bizzn – Die Gastronomie-Plattform',
  description:
    'Speisekarte, Bestellungen und Zahlungen in einer Plattform. Das Betriebssystem für die moderne Gastronomie.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="dark" style={{ colorScheme: 'dark' }}>
      <body
        className={`${inter.className} bg-[#1A1A1A] text-white min-h-screen flex flex-col antialiased`}
      >
        <ViewportFix />
        <NavbarWrapper />
        <main className="flex-1 w-full flex flex-col">
          {children}
        </main>
        <FooterWrapper />
      </body>
    </html>
  )
}
