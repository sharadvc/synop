/**
 * YouTube Data API v3 helpers for the channel watchlist.
 * Requires YOUTUBE_API_KEY (set in .env.local / env).
 */

const BASE = 'https://www.googleapis.com/youtube/v3';

function key(): string {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) throw new Error('YOUTUBE_API_KEY is not configured — add it to .env.local');
  return k;
}

export interface ChannelInfo {
  channelId: string;
  title: string;
  handle?: string;
  avatar?: string;
  description?: string;
}

export interface UploadVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbUrl: string;
}

async function getJson(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(key())}`);
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${(await res.text()).slice(0, 150)}`);
  return res.json();
}

/** Live search for channels matching a query. */
export async function searchChannels(query: string, maxResults = 6): Promise<ChannelInfo[]> {
  const q = encodeURIComponent(query);
  const json = await getJson(`/search?part=snippet&type=channel&q=${q}&maxResults=${maxResults}`);
  return (json.items || []).map((it: any) => {
    const s = it.snippet || {};
    return {
      channelId: s.channelId || it.id?.channelId || '',
      title: s.title || 'Untitled',
      handle: s.customUrl || undefined,
      avatar: s.thumbnails?.default?.url || s.thumbnails?.medium?.url || undefined,
      description: s.description?.slice(0, 200) || undefined,
    };
  }).filter((c: ChannelInfo) => c.channelId);
}

/** Details for one channel (by ID or handle URL). */
export async function getChannel(channelId: string): Promise<ChannelInfo | null> {
  const json = await getJson(`/channels?part=snippet&id=${encodeURIComponent(channelId)}`);
  const it = json.items?.[0];
  if (!it) return null;
  const s = it.snippet || {};
  return {
    channelId: it.id,
    title: s.title || 'Untitled',
    handle: s.customUrl || undefined,
    avatar: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || undefined,
    description: s.description?.slice(0, 300) || undefined,
  };
}

/** Resolve a channel from a handle/@name or full URL. */
export async function resolveChannel(input: string): Promise<ChannelInfo | null> {
  let handle = input.trim();
  // Full URL like https://youtube.com/@handle
  const urlMatch = handle.match(/youtube\.com\/(?:c\/|channel\/|@)?([^/?#]+)/i);
  if (urlMatch) handle = urlMatch[1];
  if (handle.startsWith('@')) handle = handle.slice(1);
  // by handle
  const byHandle = await getJson(`/channels?part=snippet&forHandle=${encodeURIComponent(handle)}`);
  if (byHandle.items?.[0]) {
    const s = byHandle.items[0].snippet || {};
    return { channelId: byHandle.items[0].id, title: s.title || handle, handle: s.customUrl, avatar: s.thumbnails?.medium?.url };
  }
  // by search
  const results = await searchChannels(handle, 1);
  return results[0] || null;
}

/** Fetch the most recent uploads for a channel (via its uploads playlist). */
export async function getRecentUploads(channelId: string, maxResults = 5): Promise<UploadVideo[]> {
  const details = await getJson(`/channels?part=contentDetails&id=${encodeURIComponent(channelId)}`);
  const uploadsId = details.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) return [];
  const json = await getJson(`/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${maxResults}`);
  return (json.items || [])
    .filter((it: any) => it?.snippet?.resourceId?.kind === 'youtube#video')
    .map((it: any) => ({
      id: it.snippet.resourceId.videoId,
      title: it.snippet.title || 'Untitled',
      publishedAt: it.snippet.publishedAt || '',
      thumbUrl: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url || '',
    }));
}
