// app/api/push/subscribe/route.ts — Push-Subscription speichern

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, p256dh, auth, projectId, userId } = body as {
      endpoint: string;
      p256dh: string;
      auth: string;
      projectId: string;
      userId?: string;
    };

    if (!endpoint || !p256dh || !auth || !projectId) {
      return NextResponse.json({ error: 'Fehlende Felder.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Prüfen, ob das Projekt existiert und öffentlich ist
    const { data: project } = await admin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden.' }, { status: 404 });
    }

    // Upsert: bei gleicher endpoint-URL nur updaten
    const { error } = await admin
      .from('push_subscriptions')
      .upsert(
        {
          project_id: projectId,
          user_id: userId ?? null,
          endpoint,
          p256dh,
          auth,
        },
        { onConflict: 'endpoint', ignoreDuplicates: false }
      );

    if (error) {
      console.error('push/subscribe error:', error);
      return NextResponse.json({ error: 'Fehler beim Speichern.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('push/subscribe exception:', e);
    return NextResponse.json({ error: 'Server-Fehler.' }, { status: 500 });
  }
}
