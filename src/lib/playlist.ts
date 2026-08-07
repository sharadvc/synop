import ytpl from 'ytpl';

/**
 * Playlist fetching with graceful degradation:
 *  1. YouTube Data API v3 (reliable, official) — when YOUTUBE_API_KEY is set.
 *  2. ytpl scraper (keyless) — fallback. The scraper is currently being
 *     broken by YouTube's bot-check on the browse endpoint; the Data API is
 *     the dependable path.
 */

export interface PlaylistItem {
  id: string;
  title: string;
  url: string;
  author: string;
  thumbUrl: string;
}

export interface PlaylistData {
  title: string;
  items: PlaylistItem[];
}

/** Extract the playlist id from a URL or a raw id string. */
export function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  try {
    const u = new URL(input);
    const list = u.searchParams.get('list');
    if (list) return list;
  } catch {}
  if (/^[a-zA-Z0-9_-]{13,}$/.test(input)) return input;
  return null;
}

export async function fetchPlaylist(playlistId: string, limit = 50): Promise<PlaylistData> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      return await fetchViaDataApi(playlistId, apiKey, limit);
    } catch (err: any) {
      console.warn('[playlist] Data API failed, falling back to scraper:', err.message);
    }
  }
  return fetchViaScraper(playlistId, limit);
}

async function fetchViaDataApi(playlistId: string, apiKey: string, limit: number): Promise<PlaylistData> {
  const base = 'https://www.googleapis.com/youtube/v3';

  const plRes = await fetch(`${base}/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${apiKey}`);
  if (!plRes.ok) throw new Error('Data API playlists ' + plRes.status);
  const plJson = await plRes.json();
  if (!plJson.items?.[0]) throw new Error('Data API playlist not found');
  const title = plJson.items[0].snippet?.title || 'Playlist';

  const itemsRes = await fetch(`${base}/playlistItems?part=snippet&maxResults=${limit}&playlistId=${encodeURIComponent(playlistId)}&key=${apiKey}`);
  if (!itemsRes.ok) throw new Error('Data API playlistItems ' + itemsRes.status);
  const itemsJson = await itemsRes.json();

  const items: PlaylistItem[] = (itemsJson.items || [])
    .filter((it: any) => it?.snippet?.resourceId?.kind === 'youtube#video')
    .map((it: any) => {
      const id: string = it.snippet.resourceId.videoId;
      return {
        id,
        title: it.snippet.title || 'Untitled',
        url: `https://youtube.com/watch?v=${id}`,
        author: it.snippet.videoOwnerChannelTitle || it.snippet.channelTitle || '',
        thumbUrl: it.snippet.thumbnails?.high?.url || it.snippet.thumbnails?.default?.url || '',
      };
    });

  return { title, items };
}

async function fetchViaScraper(playlistId: string, limit: number): Promise<PlaylistData> {
  const playlist = await ytpl(playlistId, { limit });
  return {
    title: playlist.title,
    items: playlist.items.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
      author: item.author?.name || '',
      thumbUrl: item.bestThumbnail?.url || '',
    })),
  };
}
