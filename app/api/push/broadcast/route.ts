// app/api/push/broadcast/route.ts — Push-Broadcast an alle Restaurant-Kunden

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendPushNotification } from '@/lib/web-push-server';

export async function POST(req: NextRequest) {
  try {
    // Auth-Check: nur eingeloggte Restaurant-Owner
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, title, message, url } = body as {
      projectId: string;
      title: string;
      message: string;
      url?: string;
    };

    if (!projectId || !title || !message) {
      return NextResponse.json({ error: 'Fehlende Felder.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Ownership-Check: nur der Project-Owner darf broadcasten
    const { data: project } = await admin
      .from('projects')
      .select('id, slug')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    // Alle Subscriptions für dieses Restaurant laden
    const { data: subscriptions, error: fetchError } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('project_id', projectId);

    if (fetchError) {
      console.error('broadcast fetch error:', fetchError);
      return NextResponse.json({ error: 'Fehler beim Laden der Subscribers.' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: 'Keine Subscriber.' });
    }

    const payload = {
      title,
      body: message,
      url: url || `https://${project.slug}.bizzn.de`,
    };

    let sent = 0;
    let failed = 0;
    const deadEndpoints: string[] = [];

    // Alle Notifications parallel senden
    await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        );
        if (result.ok) {
          sent++;
        } else {
          failed++;
          if (result.gone) {
            deadEndpoints.push(sub.id);
          }
        }
      })
    );

    // Dead subscriptions löschen (abgemeldete Browser)
    if (deadEndpoints.length > 0) {
      await admin.from('push_subscriptions').delete().in('id', deadEndpoints);
    }

    return NextResponse.json({ sent, failed });
  } catch (e) {
    console.error('broadcast exception:', e);
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 });
  }
}

// Subscriber-Anzahl abrufen (GET)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId fehlt.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Ownership-Check
  const { data: project } = await admin
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
  }

  const { count, error } = await admin
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (error) {
    return NextResponse.json({ error: 'Fehler beim Zählen.' }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
