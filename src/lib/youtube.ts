import { YoutubeTranscript } from 'youtube-transcript';
import ytdl from '@distube/ytdl-core';
import Groq from 'groq-sdk';
import { setGlobalDispatcher, ProxyAgent } from 'undici';

if (process.env.YOUTUBE_PROXY) {
  console.log('[System] Initializing YouTube Proxy from environment variables...');
  const proxyAgent = new ProxyAgent(process.env.YOUTUBE_PROXY);
  setGlobalDispatcher(proxyAgent);
}

const transcriptCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Extreme Token Optimization: Map-Reduce Chunking
export async function optimizeTranscript(rawText: string, videoId: string): Promise<string> {
  // If transcript is relatively short, don't waste time/tokens optimizing it
  if (rawText.length < 15000) return rawText;
  
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log(`[Token Optimization] Pruning ${rawText.length} characters for ${videoId}...`);
    
    // Chunk the text into roughly 15k character segments
    const chunkSize = 15000;
    const chunks = [];
    for (let i = 0; i < rawText.length; i += chunkSize) {
      chunks.push(rawText.slice(i, i + chunkSize));
    }

    // Process chunks concurrently using Llama 3 8B (ultra-fast, cheap)
    const compressedChunks = await Promise.all(chunks.map(async (chunk, index) => {
      const response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { 
            role: 'system', 
            content: 'You are an extreme token optimizer. Your job is to compress the provided transcript segment into highly dense, information-rich bullet points. Remove all filler words, repeated phrases, stuttering, and conversational fluff. Retain ONLY core facts, arguments, and key entities. Output ONLY the compressed bullet points.' 
          },
          { role: 'user', content: chunk }
        ],
        temperature: 0.1,
      });
      return response.choices[0]?.message?.content || "";
    }));

    const optimized = compressedChunks.join('\n\n');
    console.log(`[Token Optimization] Success! Reduced from ${rawText.length} to ${optimized.length} characters.`);
    return optimized;
  } catch (error) {
    console.error('[Token Optimization Error]', error);
    return rawText; // Fallback to raw if optimization fails
  }
}

export function extractVideoId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
  return match ? match[1] : null;
}

async function fallbackToGroqAudioTranscription(videoId: string): Promise<string> {
  try {
    if (!process.env.GROQ_API_KEY) {
       throw new Error("GROQ_API_KEY is missing. Audio transcription requires Groq API.");
    }
    
    console.log(`[Audio Fallback] Extracting audio for ${videoId}...`);
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    const info = await ytdl.getInfo(url);
    
    // Check duration (abort if > 15 mins to save compute)
    const lengthSeconds = parseInt(info.videoDetails.lengthSeconds);
    if (lengthSeconds > 900) {
      throw new Error("Video is too long for local audio transcription (> 15 mins). Please use a shorter video or one with closed captions.");
    }

    const format = ytdl.chooseFormat(info.formats, { quality: 'lowest', filter: 'audioonly' });
    const audioStream = ytdl(url, { format });

    // Collect stream into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    console.log(`[Audio Fallback] Audio downloaded. Size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB. Sending to Groq...`);

    // We must convert the buffer to a Blob/File for the FormData to work with fetch
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'json');

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: formData as any
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API Error: ${err}`);
    }

    const data = await res.json();
    return data.text || "";
  } catch (err: any) {
    console.error("[Audio Fallback Error]", err.message);
    throw new Error(`Audio extraction failed: ${err.message}`);
  }
}

export async function getTranscript(videoId: string): Promise<string> {
  const cached = transcriptCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text;
  }

  try {
    const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);
    const text = transcriptList.map(t => t.text).join(' ');

    const cleaned = text
      .replace(/[♪♫♬🎵🎶]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    // Apply extreme token optimization
    const optimized = await optimizeTranscript(cleaned, videoId);

    transcriptCache.set(videoId, { text: optimized, timestamp: Date.now() });
    return optimized;
  } catch (error: any) {
    console.log(`[Transcript Failed] Error: ${error.message}. Triggering audio fallback for ${videoId}`);
    try {
      const text = await fallbackToGroqAudioTranscription(videoId);
      const optimized = await optimizeTranscript(text, videoId);
      transcriptCache.set(videoId, { text: optimized, timestamp: Date.now() });
      return optimized;
    } catch (audioErr: any) {
      throw audioErr;
    }
  }
}
