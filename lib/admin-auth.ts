import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'

const ADMIN_COOKIE = 'bizzn_admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 Stunden

/**
 * Admin-Login validieren.
 * Vergleicht gegen ADMIN_EMAIL + ADMIN_PASSWORD_HASH (SHA-256) aus .env.
 */
export function validateAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH

  if (!adminEmail || !adminPasswordHash) {
    console.error('ADMIN_EMAIL oder ADMIN_PASSWORD_HASH nicht gesetzt!')
    return false
  }

  if (email.toLowerCase() !== adminEmail.toLowerCase()) return false

  const inputHash = createHash('sha256').update(password).digest('hex')
  return inputHash === adminPasswordHash
}

/**
 * Admin-Session erstellen (setzt httpOnly Cookie).
 */
export async function createAdminSession(): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })

  // Token hashen und als Env-Session speichern (in-memory für Dev)
  // In Produktion könnte man Redis oder DB nutzen
  globalThis.__adminSessionToken = token
}

/**
 * Prüft ob eine gültige Admin-Session existiert.
 */
export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  if (!token) return false
  return token === (globalThis as any).__adminSessionToken
}

/**
 * Admin-Session beenden.
 */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
  ;(globalThis as any).__adminSessionToken = undefined
}

// TypeScript: globale Variable deklarieren
declare global {
  // eslint-disable-next-line no-var
  var __adminSessionToken: string | undefined
}
