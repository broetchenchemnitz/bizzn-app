import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { Database } from '@/types/supabase';



export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  
  try {
    const { rawText } = await req.json();

    if (!rawText) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a culinary data extractor. Convert menu text into JSON: { items: [{ name: string, description: string, price: string }] }"
        },
        { role: "user", content: rawText }
      ],
      response_format: { type: "json_object" }
    });

    const parsedData = JSON.parse(response.choices[0].message.content || '{}');

    // DB-Insertion: Speichert die erkannten Gerichte direkt in die Tabelle menu_items
    const { data, error } = await supabase
      .from('menu_items')
      .insert(parsedData.items.map((item: { name: string; description: string; price: string }) => ({ 
        ...item, 
        created_at: new Date().toISOString() 
      })))
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error('AI Import Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
