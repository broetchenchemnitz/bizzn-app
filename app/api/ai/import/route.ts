import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const { rawText } = await req.json();

    if (!rawText) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

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
      .insert(parsedData.items.map((item: any) => ({ 
        ...item, 
        created_at: new Date().toISOString() 
      })))
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('AI Import Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
