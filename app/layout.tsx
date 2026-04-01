import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
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
        <Navbar />
        <main className="flex-1 w-full flex flex-col">
          {children}
        </main>

        {/* ── Globaler Footer ── */}
        <footer className="w-full bg-[#141414] border-t border-white/5 py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center" aria-label="Bizzn Startseite">
              <Image
                src="/logo.svg"
                alt="Bizzn Logo"
                width={90}
                height={34}
                className="h-8 w-auto"
                priority={false}
              />
            </Link>
            <p className="text-sm text-white/30">
              © {new Date().getFullYear()} Bizzn. Alle Rechte vorbehalten.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
