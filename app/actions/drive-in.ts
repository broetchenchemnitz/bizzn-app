'use server'

import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export type DriveInArriveResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Markiert, dass ein Bizzn-Pass-Kunde am Drive-In angekommen ist.
 * Schickt eine Push-Benachrichtigung an den Gastronomen.
 *
 * Eligibility:
 * - Kunde eingeloggt + Bestellung gehört ihm
 * - Betrieb hat drive_in_enabled = true
 * - Kunde hat aktiven Bizzn-Pass
 * - Zahlung erfolgt (payment_status = 'paid' oder payment_method = 'loyalty')
 * - Noch nicht angekommen (drive_in_arrived_at IS NULL)
 */
export async function arriveAtDriveIn(
  orderId: string,
  licensePlate: string,
): Promise<DriveInArriveResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht eingeloggt.' }

  const plate = licensePlate.trim().toUpperCase()
  if (!plate) return { success: false, error: 'Bitte gib dein Kennzeichen ein.' }

  const admin = createAdminClient()

  // Bestellung laden + Eigentümerschaft prüfen
  const { data: order } = await admin
    .from('orders')
    .select(`
      id, project_id, status, payment_status, order_type,
      drive_in_arrived_at, customer_name
    `)
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) return { success: false, error: 'Bestellung nicht gefunden.' }

  // Schon angekommen?
  if (order.drive_in_arrived_at) {
    return { success: false, error: 'Du hast bereits gemeldet, dass du da bist.' }
  }

  // Status ok?
  if (['delivered', 'cancelled'].includes(order.status)) {
    return { success: false, error: 'Die Bestellung ist bereits abgeschlossen.' }
  }

  // Zahlung ok? (paid via Stripe oder Guthabenkarte = loyalty)
  const isPaid =
    order.payment_status === 'paid' ||
    (order as { payment_method?: string }).payment_method === 'loyalty'

  if (!isPaid) {
    return { success: false, error: 'Drive-In ist nur nach Online-Zahlung verfügbar.' }
  }

  // Betrieb: drive_in_enabled + aktiver Pass
  const { data: project } = await admin
    .from('projects')
    .select('id, name, drive_in_enabled')
    .eq('id', order.project_id)
    .maybeSingle()

  if (!project?.drive_in_enabled) {
    return { success: false, error: 'Dieser Betrieb unterstützt Drive-In nicht.' }
  }

  const { data: passRow } = await admin.rpc('has_active_bizzn_pass', {
    p_user_id: user.id,
  })

  if (!passRow) {
    return { success: false, error: 'Drive-In ist exklusiv für Bizzn-Pass-Kunden.' }
  }

  // DB updaten
  const { error: updateErr } = await admin
    .from('orders')
    .update({
      drive_in_arrived_at: new Date().toISOString(),
      drive_in_license_plate: plate,
    })
    .eq('id', orderId)

  if (updateErr) {
    console.error('[drive-in] update error:', updateErr)
    return { success: false, error: 'Fehler beim Speichern.' }
  }

  // Push-Benachrichtigung an alle Subscriptions des Betriebs
  try {
    const { data: pushSubs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('project_id', order.project_id)

    if (pushSubs && pushSubs.length > 0) {
      const payload = JSON.stringify({
        title: '🚗 Drive-In — Kunde da!',
        body: `Kennzeichen: ${plate} · ${order.customer_name ?? 'Kunde'} wartet`,
        icon: '/icon-192.png',
        data: {
          orderId,
          url: `/dashboard/project/${order.project_id}`,
        },
      })

      await Promise.allSettled(
        pushSubs.map(row =>
          webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            payload,
          ),
        ),
      )
    }
  } catch (e) {
    // Push-Fehler nicht als fatal behandeln
    console.error('[drive-in] push error:', e)
  }

  return { success: true }
}

/**
 * Prüft ob eine Bestellung Drive-In-eligible ist.
 * Gibt { eligible, arrived, plate } zurück.
 */
export async function getDriveInStatus(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select(`
      id, project_id, status, payment_status,
      drive_in_arrived_at, drive_in_license_plate
    `)
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) return null

  const { data: project } = await admin
    .from('projects')
    .select('drive_in_enabled')
    .eq('id', order.project_id)
    .maybeSingle()

  if (!project?.drive_in_enabled) return null

  const { data: hasPass } = await admin.rpc('has_active_bizzn_pass', {
    p_user_id: user.id,
  })
  if (!hasPass) return null

  const isPaid =
    order.payment_status === 'paid' ||
    (order as { payment_method?: string }).payment_method === 'loyalty'

  const isDone = ['delivered', 'cancelled'].includes(order.status)

  return {
    eligible: isPaid && !isDone,
    arrived: !!order.drive_in_arrived_at,
    arrivedAt: order.drive_in_arrived_at,
    plate: order.drive_in_license_plate,
  }
}
