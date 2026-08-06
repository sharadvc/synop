import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exec, execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { YoutubeTranscript } from 'youtube-transcript';

const execAsync = util.promisify(exec);
const execFileAsync = util.promisify(execFile);

// Helper to convert MM:SS to total seconds
function timeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return 0;
}

// Helper to format seconds to SRT timestamp format: HH:MM:SS,mmm
function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get('synop_auth');
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoId, timeRange, script, hook } = await req.json();

    if (!videoId || !timeRange || !script) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const [startStr, endStr] = timeRange.split('-').map((s: string) => s.trim());
    const startSec = timeToSeconds(startStr);
    const endSec = timeToSeconds(endStr);
    const duration = endSec - startSec;

    if (duration <= 0 || duration > 120) {
      return NextResponse.json({ error: 'Invalid duration. Must be between 1 and 120 seconds.' }, { status: 400 });
    }

    // 1. Fetch REAL transcript for precise subtitles alignment
    let srtContent = '';
    
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      const clipStartMs = startSec * 1000;
      const clipEndMs = endSec * 1000;
      
      const clipTranscript = transcript.filter((t: any) => {
        // A subtitle belongs to the clip if it overlaps with the clip time range
        const tStart = t.offset;
        const tEnd = t.offset + t.duration;
        return tStart < clipEndMs && tEnd > clipStartMs;
      });

      if (clipTranscript.length > 0) {
        clipTranscript.forEach((t: any, index: number) => {
          // Adjust timestamps relative to the start of the clip
          const tStart = Math.max(0, t.offset - clipStartMs) / 1000;
          let tEnd = (t.offset + t.duration - clipStartMs) / 1000;
          
          // Cap the end time to the duration of the clip
          if (tEnd > duration) {
            tEnd = duration;
          }

          srtContent += `${index + 1}\n`;
          srtContent += `${formatSrtTime(tStart)} --> ${formatSrtTime(tEnd)}\n`;
          
          // Clean up HTML entities that might be in transcript
          const cleanText = t.text.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
          srtContent += `${cleanText}\n\n`;
        });
      }
    } catch (e) {
      console.warn("Could not fetch real transcript, falling back to fake timing", e);
    }

    if (!srtContent) {
      // Fallback: Generate Fake Timed SRT Subtitles based on Word Count
      const words = script.replace(/\n/g, ' ').split(' ').filter((w: string) => w.length > 0);
      const wordsPerChunk = 5;
      const chunks = [];
      for (let i = 0; i < words.length; i += wordsPerChunk) {
        chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
      }

      const timePerChunk = duration / chunks.length;

      chunks.forEach((chunk, index) => {
        // For ffmpeg processing of the sliced video, the video starts at 00:00:00
        const chunkStart = index * timePerChunk;
        const chunkEnd = (index + 1) * timePerChunk;
        srtContent += `${index + 1}\n`;
        srtContent += `${formatSrtTime(chunkStart)} --> ${formatSrtTime(chunkEnd)}\n`;
        srtContent += `${chunk}\n\n`;
      });
    }

    const tmpDir = os.tmpdir();
    const srtFile = path.join(tmpDir, `subs-${Date.now()}.srt`);
    const rawVideoFile = path.join(tmpDir, `raw-${videoId}-${Date.now()}.mp4`);
    await fs.promises.writeFile(srtFile, srtContent);

    // Ensure the reels directory exists
    const publicReelsDir = path.join(process.cwd(), 'public', 'reels');
    if (!fs.existsSync(publicReelsDir)) {
      fs.mkdirSync(publicReelsDir, { recursive: true });
    }

    const outputFileName = `reel-${videoId}-${Date.now()}.mp4`;
    const outputPath = path.join(publicReelsDir, outputFileName);

    console.log(`[FFmpeg Engine] Fetching video chunk for video ${videoId} via yt-dlp...`);
    
    // 2. Use yt-dlp to download exactly the chunk we need as a local temp file
    // By keeping it local, we bypass YouTube's ffmpeg stream 403 Forbidden blockers
    await execFileAsync('yt-dlp', [
      '--download-sections', `*${startSec}-${endSec}`,
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best',
      `https://www.youtube.com/watch?v=${videoId}`,
      '-o', rawVideoFile
    ]);

    console.log(`[FFmpeg Engine] Rendering reel from local slice...`);

    // 3. Render using FFmpeg
    // -vf applies 9:16 crop, forces resolution, and burns subtitles
    // We use ffmpeg-full which is compiled with libass for subtitles support
    const ffmpegPath = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
    await execFileAsync(ffmpegPath, [
      '-i', rawVideoFile,
      '-vf', `crop=ih*(9/16):ih,scale=1080:1920,subtitles=filename='${srtFile}':force_style='FontName=Arial,FontSize=18,PrimaryColour=&H00FFFF,OutlineColour=&H000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=100'`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y', outputPath
    ]);

    console.log(`[FFmpeg Engine] Render complete: ${outputFileName}`);

    // Cleanup
    fs.promises.unlink(srtFile).catch(console.error);
    fs.promises.unlink(rawVideoFile).catch(console.error);

    return NextResponse.json({ success: true, url: `/reels/${outputFileName}` });
  } catch (err: any) {
    console.error('[FFmpeg Engine Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
