'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

export default function NavbarWrapper() {
  const pathname = usePathname()
  // Hide Navbar on the landing/root page
  if (pathname === '/') return null
  return <Navbar />
}
