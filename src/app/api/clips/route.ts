import { NextResponse } from 'next/server';
import { extractVideoId, getTranscript } from '@/lib/youtube';

const buildClipsPrompt = (language: string = "English") => `You are an elite short-form video editor and viral strategist (expert in TikTok, YouTube Shorts, and Reels).
Your job is to analyze this YouTube video transcript and EXTRACT the 3 absolute BEST, highest-retention clips (30-60 seconds long).

IMPORTANT: ALL CLIP TITLES, HOOKS, AND SCRIPTS MUST BE TRANSLATED AND WRITTEN IN ${language.toUpperCase()}.
For each clip, you must provide:
1. The start and end time (MM:SS) of the clip.
2. A viral "Hook" (the first 3 seconds of text to put on screen to stop the scroll).
3. The EXACT, VERBATIM transcript segment that is spoken during this time range. DO NOT REWRITE OR SUMMARIZE. You must copy and paste exactly word-for-word from the transcript provided.
4. B-Roll/Visual instructions (what visuals, images, or sound effects should the editor add to make it highly engaging).

You MUST return ONLY valid JSON matching this exact schema:
{
  "clips": [
    {
      "timeRange": "MM:SS - MM:SS",
      "hook": "...",
      "script": "...",
      "bRoll": "..."
    }
  ]
}
NO MARKDOWN. NO CODE BLOCKS. JUST RAW JSON.`;

export async function POST(req: Request) {
  try {
    // Auth removed at 04d6622 (master-password auth deleted, cookie never set) — muted for local dev.

    const body = await req.json();
    const language = body.language || "English";
    const { videoUrl } = body;

    const videoId = extractVideoId(videoUrl);
    if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

    const transcript = await getTranscript(videoId);
    if (!transcript || transcript.startsWith('Error')) {
      return NextResponse.json({ error: 'Could not fetch transcript' }, { status: 400 });
    }

    // Use Gemini for the extraction
    const geminiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY;
    let content = "";
    
    if (geminiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `System Prompt: ${buildClipsPrompt(language)}\n\nTranscript:\n\n${transcript}` }] }],
            generationConfig: { temperature: 0.7 }
          }),
        });

        if (res.ok) {
          const json = await res.json();
          content = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
          console.warn("[Clips API] Gemini failed, falling back to Groq", await res.text());
        }
      } catch (err) {
        console.warn("[Clips API] Gemini error:", err);
      }
    }

    // Fallback to Groq
    if (!content) {
      const groqKey = req.headers.get('x-groq-key') || process.env.GROQ_API_KEY;
      if (!groqKey) {
        return NextResponse.json({ error: 'No valid API Keys provided for Clips generation.' }, { status: 500 });
      }

      console.log("[Clips API] Attempting Groq llama-3.3-70b-versatile...");
      
      // Groq Free Tier has a strict 12,000 TPM limit for 70b. 
      // We must aggressively truncate the transcript for clips if we fall back to Groq.
      // 12k tokens = ~48k characters. We'll truncate to 35,000 characters to be safe.
      const maxChars = 35000;
      const truncatedTranscript = transcript.length > maxChars 
        ? transcript.slice(0, maxChars) + "\n\n[TRANSCRIPT TRUNCATED DUE TO GROQ RATE LIMITS]" 
        : transcript;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: buildClipsPrompt(language) },
            { role: "user", content: `Transcript:\n\n${truncatedTranscript}` }
          ],
          temperature: 0.7,
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq API Error: ${errText}`);
      }

      const json = await res.json();
      content = json.choices?.[0]?.message?.content || "";
    }
    
    // Cleanup any accidental markdown or conversational text
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      content = match[1];
    }
    content = content.trim();
    
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
