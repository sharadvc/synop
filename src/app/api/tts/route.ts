import { NextResponse } from 'next/server';
import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const tts = new EdgeTTS({
      voice: 'en-US-ChristopherNeural', // Deep, professional, podcast-like voice
    });

    const tmpFilePath = path.join(os.tmpdir(), `tts-${Date.now()}.mp3`);
    
    // Generate the TTS file to the temporary directory
    await tts.ttsPromise(text, tmpFilePath);

    // Read the generated file into a buffer
    const audioBuffer = await fs.promises.readFile(tmpFilePath);

    // Clean up the temp file asynchronously
    fs.promises.unlink(tmpFilePath).catch(console.error);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (err: any) {
    console.error("Edge TTS Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
