import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Groq from 'groq-sdk';
import { resolveCustomProviders } from '@/lib/ai';
import { userScope, requireUserId } from '@/lib/user';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const __uid = await requireUserId(req); if (!__uid) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { messages, videoId, language = "English", persona = "general" } = await req.json();
    if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    if (!messages || messages.length === 0) return NextResponse.json({ error: 'No messages provided' }, { status: 400 });

    const recentMessages = messages.slice(-6);

    let systemPrompt = '';

    if (videoId === 'global') {
      // Global Chat Mode: Fetch recent summaries
      const summaries = await db.summary.findMany({
        where: await userScope(),
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      if (summaries.length === 0) {
        return NextResponse.json({ error: 'No summaries found in your library yet.' }, { status: 404 });
      }

      systemPrompt = `You are a highly intelligent AI assistant answering questions based on the user's entire library of saved YouTube video summaries.
You have been provided with summaries of their recently analyzed videos.

When answering:
- Be direct, conversational, and highly accurate.
- Synthesize information across multiple videos if relevant.
- Cite the "Title" of the video when referencing specific facts.
- Format your response in clean Markdown.
- IMPORTANT: You MUST answer in ${language.toUpperCase()}.

--- USER'S VIDEO LIBRARY (RECENT) ---
${summaries.map(s => `
[Title: ${s.title}] (Channel: ${s.channel})
Executive Summary: ${s.executiveSummary}
Frameworks: ${s.frameworks ?? ''}
`).join('\n')}
`;
    } else {
      // Specific Video Mode
      const summary = await db.summary.findFirst({ where: { videoId, language, persona, ...(await userScope()) } })
        ?? await db.summary.findFirst({ where: { videoId, language, ...(await userScope()) } });
      if (!summary) return NextResponse.json({ error: 'Summary not found. Please summarize the video first.' }, { status: 404 });

      systemPrompt = `You are a highly intelligent AI assistant answering questions about a YouTube video.
You have been provided with a rich summary as context.

When answering:
- Be direct, conversational, and highly accurate.
- Ground every specific fact, quote, or point you state in the provided summary context below. Do not invent details not present in it.
- Format your response in clean Markdown.
- IMPORTANT: You MUST answer in ${language.toUpperCase()}.

--- VIDEO SUMMARY ---
Title: ${summary.title}
Channel: ${summary.channel}
Executive Summary: ${summary.executiveSummary}
Bias & Critique: ${summary.biasAnalysis ?? ''}
Frameworks: ${summary.frameworks ?? ''}
Entities: ${summary.entities ?? ''}
Quotes: ${summary.quotes}
Verdict: ${summary.verdict}
`;
    }

    const geminiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY;
    const groqKey = req.headers.get('x-groq-key') || process.env.GROQ_API_KEY;
    const openRouterKey = req.headers.get('x-openrouter-key') || process.env.OPENAI_API_KEY;

    // Normalize messages to simple {role, content} format
    const chatMessages = recentMessages.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content || '',
    }));

    let responseText = '';
    const errors: string[] = [];

    // Provider 0: user-configured custom providers (BYOK endpoints)
    if (!responseText) {
      const customProviders = resolveCustomProviders(req.headers);
      for (const p of customProviders) {
        try {
          const client = createOpenAI({ baseURL: p.baseUrl, apiKey: p.apiKey });
          const result = await generateText({
            model: client(p.models[0]),
            system: systemPrompt,
            messages: chatMessages,
            temperature: 0.7,
            maxRetries: 1,
          });
          if (result.text) { responseText = result.text; break; }
        } catch (err: any) {
          errors.push(`Custom ${p.name}: ${err.message}`);
        }
      }
    }

    // Provider 1: Groq (fastest, most reliable with native SDK)
    if (!responseText && groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
          temperature: 0.7,
          max_tokens: 2048,
        });
        responseText = completion.choices[0]?.message?.content || '';
      } catch (err: any) {
        errors.push(`Groq: ${err.message}`);
      }
    }

    // Provider 2: Gemini
    if (!responseText && geminiKey) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: geminiKey });
        const result = await generateText({
          model: google('gemini-2.0-flash'),
          system: systemPrompt,
          messages: chatMessages,
          temperature: 0.7,
          maxRetries: 1,
        });
        responseText = result.text;
      } catch (err: any) {
        errors.push(`Gemini: ${err.message}`);
      }
    }

    // Provider 3: OpenRouter
    if (!responseText && openRouterKey) {
      try {
        const openRouter = createOpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: openRouterKey,
        });
        const result = await generateText({
          model: openRouter('google/gemma-4-26b-a4b-it:free'),
          system: systemPrompt,
          messages: chatMessages,
          temperature: 0.7,
          maxRetries: 1,
        });
        responseText = result.text;
      } catch (err: any) {
        errors.push(`OpenRouter: ${err.message}`);
      }
    }

    if (!responseText) {
      const errorMsg = errors.length > 0
        ? `All providers failed: ${errors.join(' | ')}`
        : 'No API keys configured. Please add keys in Settings.';
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    // Return plain JSON - simple, reliable, no streaming protocol issues
    return NextResponse.json({ reply: responseText });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Chat failed' }, { status: 500 });
  }
}
