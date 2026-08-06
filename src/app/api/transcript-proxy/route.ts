import { YoutubeTranscript } from 'youtube-transcript';
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  if (!videoId) return new Response('Missing videoId', { status: 400 });

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return new Response(JSON.stringify(transcript), { headers: { 'Content-Type': 'application/json' } });
  } catch(e: any) {
    return new Response(e.message, { status: 500 });
  }
}
