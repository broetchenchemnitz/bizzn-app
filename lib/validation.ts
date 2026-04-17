/**
 * Telefonnummer-Validierung für Bizzn
 * Prüft auf echte deutsche Nummern und verhindert Fake-Eingaben.
 */

export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  // Whitespace entfernen
  const cleaned = phone.replace(/[\s\-\(\)\/]/g, '')

  // Muss mit +49, 0049 oder 0 beginnen
  if (!/^(\+49|0049|0)/.test(cleaned)) {
    return { valid: false, error: 'Bitte gib eine gültige deutsche Telefonnummer ein (z.B. +49 171 1234567).' }
  }

  // Nur Ziffern extrahieren (nach dem +)
  const digitsOnly = cleaned.replace(/\D/g, '')

  // Mindestens 10 Ziffern (mit Ländervorwahl) bzw. 8 Ziffern (ohne)
  if (digitsOnly.length < 10) {
    return { valid: false, error: 'Telefonnummer ist zu kurz. Bitte vollständige Nummer eingeben.' }
  }

  if (digitsOnly.length > 15) {
    return { valid: false, error: 'Telefonnummer ist zu lang.' }
  }

  // Keine Wiederholungen: nicht nur gleiche Ziffern (0000000000, 1111111111)
  if (/^(\d)\1{7,}$/.test(digitsOnly.slice(-8))) {
    return { valid: false, error: 'Bitte gib eine echte Telefonnummer ein.' }
  }

  // Keine einfachen aufsteigenden/absteigenden Sequenzen
  const lastEight = digitsOnly.slice(-8)
  const ascending = '01234567890123456789'
  const descending = '98765432109876543210'
  if (ascending.includes(lastEight) || descending.includes(lastEight)) {
    return { valid: false, error: 'Bitte gib eine echte Telefonnummer ein.' }
  }

  // Keine offensichtlich falschen Nummern
  const fakePatterns = [
    /^0{8,}$/, // 00000000
    /^1{8,}$/, // 11111111
    /^123456/, // 123456...
  ]
  if (fakePatterns.some(p => p.test(lastEight))) {
    return { valid: false, error: 'Bitte gib eine echte Telefonnummer ein.' }
  }

  return { valid: true }
}

/**
 * Normalisiert eine Telefonnummer auf kanonisches +49-Format (nur Ziffern).
 * Damit werden verschiedene Schreibweisen (0171..., +49171..., 0049171...)
 * als identisch erkannt.
 */
export function normalizePhone(phone: string): string {
  // Alles außer Ziffern und + entfernen
  let cleaned = phone.replace(/[^\d+]/g, '')

  // 0049 → +49
  if (cleaned.startsWith('0049')) {
    cleaned = '+49' + cleaned.slice(4)
  }
  // 0 → +49 (deutsche Ortsvorwahl)
  else if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = '+49' + cleaned.slice(1)
  }
  // Falls kein + vorhanden, aber mit 49 beginnt
  else if (/^\d/.test(cleaned) && cleaned.startsWith('49') && cleaned.length >= 12) {
    cleaned = '+' + cleaned
  }

  return cleaned
}

/**
 * Formatiert eine Telefonnummer für die Anzeige
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\/]/g, '')
  if (cleaned.startsWith('+49')) {
    const number = cleaned.slice(3)
    return `+49 ${number.slice(0, 3)} ${number.slice(3)}`
  }
  return phone
}
