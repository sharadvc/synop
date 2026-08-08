import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUserId } from '@/lib/user';

/** POST /api/share/deck  { title, sourceUrl?, deck: [{front, back}] } */
export async function POST(req: Request) {
  try {
    const __uid = await requireUserId(req); if (!__uid) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { title, sourceUrl, deck } = await req.json();
    if (!title || !Array.isArray(deck) || deck.length === 0) {
      return NextResponse.json({ error: 'title and a non-empty deck are required' }, { status: 400 });
    }
    const shared = await db.sharedDeck.create({
      data: {
        title: String(title).slice(0, 200),
        sourceUrl: sourceUrl ? String(sourceUrl).slice(0, 500) : null,
        deck: JSON.stringify(deck.slice(0, 200)),
      },
    });
    return NextResponse.json({ id: shared.id, url: `/share/${shared.id}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
