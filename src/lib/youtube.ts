import { YoutubeTranscript } from 'youtube-transcript';

const transcriptCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function extractVideoId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
  return match ? match[1] : null;
}

export async function getTranscript(videoId: string): Promise<string> {
  const cached = transcriptCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text;
  }

  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  const text = segments.map(s => s.text).join(' ');

  const cleaned = text
    .replace(/[♪♫♬🎵🎶]/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  transcriptCache.set(videoId, { text: cleaned, timestamp: Date.now() });
  return cleaned;
}
