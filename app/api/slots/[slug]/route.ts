import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

// ─── Öffnungszeiten-Keys: 'mo','di','mi','do','fr','sa','so' ──────────────────
// JS Date.getDay(): 0=So,1=Mo,2=Di,3=Mi,4=Do,5=Fr,6=Sa
const DOW_TO_KEY = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa']

const DAY_LABEL: Record<string, string> = {
  so: 'Sonntag', mo: 'Montag', di: 'Dienstag', mi: 'Mittwoch',
  do: 'Donnerstag', fr: 'Freitag', sa: 'Samstag',
}

export interface SlotEntry {
  value: string    // "Montag · 12:15 Uhr"  ← wird in orders.pickup_slot gespeichert
  time: string     // "12:15"
  available: boolean
  full: boolean
}

export interface SlotDay {
  date: string     // "2026-04-11"
  label: string    // "Heute" | "Morgen" | "Dienstag, 12. Apr."
  dayKey: string   // "mo"
  slots: SlotEntry[]
  open: boolean
}

// ─── Parse "11:00–22:00" → { open: 11*60, close: 22*60 } ────────────────────
function parseHours(str: string): { openMin: number; closeMin: number } | null {
  if (!str || str.toLowerCase().includes('geschlossen')) return null
  // Unterstütze sowohl "11:00-22:00" als auch "11:00–22:00"
  const [a, b] = str.split(/[–\-]/).map(s => s.trim())
  if (!a || !b) return null
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return NaN
    return h * 60 + m
  }
  const openMin = toMin(a)
  const closeMin = toMin(b)
  if (isNaN(openMin) || isNaN(closeMin)) return null
  return { openMin, closeMin }
}

// ─── Minuten → "HH:MM" ───────────────────────────────────────────────────────
function minToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── Round up to next slot boundary ─────────────────────────────────────────
function ceilToSlot(min: number, intervalMin: number): number {
  return Math.ceil(min / intervalMin) * intervalMin
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  // Wie viele Tage voraus? Default: 4 (heute + 3)
  const daysAhead = Math.min(parseInt(searchParams.get('days') ?? '4'), 7)

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── 1. Projekt-Daten laden ─────────────────────────────────────────────────
  const { data: project } = await supabase
    .from('projects')
    .select(`
      id, name,
      opening_hours,
      prep_time_minutes,
      slot_interval_minutes,
      max_orders_per_slot,
      pickup_slots_enabled
    `)
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Restaurant nicht gefunden' }, { status: 404 })
  }

  if (!project.pickup_slots_enabled) {
    return NextResponse.json({ days: [], enabled: false })
  }

  const prepTime = project.prep_time_minutes ?? 20
  const interval = project.slot_interval_minutes ?? 15
  const maxPerSlot = project.max_orders_per_slot ?? null  // null = unbegrenzt
  const openingHours = (project.opening_hours ?? {}) as Record<string, string>

  // ── 2. Jetzt (Serverzeit, Europe/Berlin) ──────────────────────────────────
  const nowUTC = new Date()
  // Lokale Zeit in Minuten (Europe/Berlin GMT+2 im April)
  const berlinOffset = 2 * 60  // UTC+2 im Sommer (ausreichend für Testzwecke)
  const nowLocalMin = (nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes()) + berlinOffset

  // ── 3. Für jeden Tag: Slots generieren ────────────────────────────────────
  const result: SlotDay[] = []

  for (let d = 0; d < daysAhead; d++) {
    const dayDate = new Date(nowUTC)
    dayDate.setUTCDate(dayDate.getUTCDate() + d)
    // Lokales Datum (Berlin) — simple Annäherung: UTC+2
    const localDate = new Date(dayDate.getTime() + berlinOffset * 60 * 1000)
    const dateStr = localDate.toISOString().split('T')[0]  // "YYYY-MM-DD"
    const dow = localDate.getUTCDay()  // 0=So,1=Mo…6=Sa
    const dayKey = DOW_TO_KEY[dow]

    const hoursStr = openingHours[dayKey] ?? ''
    const hours = parseHours(hoursStr)

    if (!hours) {
      // Geschlossen oder keine Einträge
      result.push({
        date: dateStr,
        label: d === 0 ? 'Heute' : d === 1 ? 'Morgen' : formatDateLabel(localDate),
        dayKey,
        slots: [],
        open: false,
      })
      continue
    }

    const { openMin, closeMin } = hours

    // Frühester Slot: heute = max(openMin, nowLocalMin + prepTime), andere = openMin
    let startMin: number
    if (d === 0) {
      startMin = ceilToSlot(Math.max(openMin, nowLocalMin + prepTime), interval)
    } else {
      startMin = ceilToSlot(openMin, interval)
      // Vorlaufzeit auch für zukünftige Tage: mind. prepTime ab jetzt
      // → kein Slot falls gesamter Tag noch zu früh (sehr unwahrscheinlich, ignorieren)
    }

    // Slots generieren
    const slots: SlotEntry[] = []
    for (let t = startMin; t < closeMin; t += interval) {
      const timeStr = minToTime(t)
      const slotLabel = `${DAY_LABEL[dayKey]} · ${timeStr} Uhr`
      slots.push({
        value: slotLabel,
        time: timeStr,
        available: true,  // wird nach DB-Check gesetzt
        full: false,
      })
    }

    result.push({
      date: dateStr,
      label: d === 0 ? 'Heute' : d === 1 ? 'Morgen' : formatDateLabel(localDate),
      dayKey,
      slots,
      open: slots.length > 0,
    })
  }

  // ── 4. Kapazitäts-Check (nur wenn max gesetzt) ────────────────────────────
  if (maxPerSlot !== null) {
    // Alle relevanten Datumsstrings
    const allDates = result.filter(d => d.slots.length > 0).map(d => d.date)

    if (allDates.length > 0) {
      // Bestellungen der nächsten N Tage mit pickup_slot laden
      const startDate = allDates[0]
      const endDate = allDates[allDates.length - 1]

      const { data: orders } = await supabase
        .from('orders')
        .select('pickup_slot, created_at')
        .eq('project_id', project.id)
        .not('pickup_slot', 'is', null)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`)
        .in('status', ['pending', 'preparing', 'ready'])

      // Zähle pro Slot-Value
      const countMap: Record<string, number> = {}
      for (const o of orders ?? []) {
        if (o.pickup_slot) {
          countMap[o.pickup_slot] = (countMap[o.pickup_slot] ?? 0) + 1
        }
      }

      // Slots als voll markieren wenn >= maxPerSlot
      for (const day of result) {
        for (const slot of day.slots) {
          const count = countMap[slot.value] ?? 0
          if (count >= maxPerSlot) {
            slot.available = false
            slot.full = true
          }
        }
      }
    }
  }

  return NextResponse.json({
    enabled: true,
    prepTime,
    interval,
    maxPerSlot,
    days: result,
  })
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}
