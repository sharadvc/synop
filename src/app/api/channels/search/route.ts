import { NextResponse } from 'next/server';
import { searchChannels } from '@/lib/youtubeApi';

/** GET /api/channels/search?q=... — live channel search. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await searchChannels(q, 8);
    return NextResponse.json({ results });
  } catch (e: any) {
    console.error('[channels/search]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
