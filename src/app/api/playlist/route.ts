import { NextResponse } from 'next/server';
import { fetchPlaylist, extractPlaylistId } from '@/lib/playlist';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      return NextResponse.json({ error: 'Not a valid playlist URL' }, { status: 400 });
    }

    const playlist = await fetchPlaylist(playlistId, 50);

    return NextResponse.json({
      title: playlist.title,
      items: playlist.items.map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
      }))
    });

  } catch (error: any) {
    console.error("[Playlist Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
