import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveChannel } from '@/lib/youtubeApi';

/** GET /api/watchlist — list watched channels. */
export async function GET() {
  const channels = await db.channelWatch.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ channels });
}

/**
 * POST /api/watchlist
 * Body: { channelId, title?, handle?, avatar? }  OR  { input: "@handle or URL" }
 * Adds a channel (resolving from a handle/URL when only `input` is given).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let channelId = body.channelId;
    let title = body.title || '';
    let handle = body.handle || null;
    let avatar = body.avatar || null;

    if (!channelId && body.input) {
      const resolved = await resolveChannel(body.input);
      if (!resolved) return NextResponse.json({ error: 'Could not find that channel.' }, { status: 404 });
      channelId = resolved.channelId;
      title = resolved.title;
      handle = resolved.handle || null;
      avatar = resolved.avatar || null;
    }
    if (!channelId) return NextResponse.json({ error: 'channelId is required' }, { status: 400 });

    const channel = await db.channelWatch.upsert({
      where: { channelId },
      create: { channelId, title, handle, avatar, autoSummarize: body.autoSummarize ?? true },
      update: {
        title, handle, avatar,
        ...(typeof body.autoSummarize === 'boolean' ? { autoSummarize: body.autoSummarize } : {}),
      },
    });
    return NextResponse.json({ channel });
  } catch (e: any) {
    console.error('[watchlist]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** DELETE /api/watchlist — body { id } removes a watched channel. */
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await db.channelWatch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
