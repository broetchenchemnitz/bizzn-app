// app/api/push/vapid-key/route.ts — Gibt den öffentlichen VAPID-Key zurück

import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID nicht konfiguriert.' }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
