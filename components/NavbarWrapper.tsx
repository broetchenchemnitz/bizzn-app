'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

export default function NavbarWrapper() {
  const pathname = usePathname()
  // Hide Navbar on pages that have their own navigation
  if (pathname === '/' || pathname === '/mein-konto') return null
  return <Navbar />
}
