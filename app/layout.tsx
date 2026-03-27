import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navbar from '@/components/Navbar'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bizzn App',
  description: 'Enterprise AI Coding Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#1A1A1A] text-white min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1 w-full mx-auto flex flex-col">
          {children}
        </main>
      </body>
    </html>
  )
}
