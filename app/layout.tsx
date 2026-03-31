import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navbar from '@/components/Navbar'
import ViewportFix from '@/components/ViewportFix'
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
    <html lang="en" className="dark bg-[#1A1A1A] text-white">
      <body className={`${inter.className} bg-[#1A1A1A] text-white min-h-screen flex flex-col`}>
        <ViewportFix />
        <Navbar />
        <main className="flex-1 w-full mx-auto flex flex-col bg-[#1A1A1A]">
          {children}
        </main>
      </body>
    </html>
  )
}
