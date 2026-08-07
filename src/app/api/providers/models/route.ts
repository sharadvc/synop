import { NextResponse } from 'next/server';

/**
 * POST /api/providers/models  { baseUrl, apiKey }
 * Probes an OpenAI-compatible provider for its live model list.
 * Tries GET {baseUrl}/models (OpenAI, DeepSeek, Together, OpenRouter, …),
 * then GET {baseUrl-without-/v1}/api/tags (Ollama's native endpoint).
 */
export async function POST(req: Request) {
  try {
    const { baseUrl, apiKey } = await req.json();
    if (!baseUrl) return NextResponse.json({ error: 'Base URL is required' }, { status: 400 });

    const base = String(baseUrl).trim().replace(/\/+$/, '');
    const models = await fetchModelList(base, apiKey);

    if (models.length === 0) {
      return NextResponse.json(
        { error: 'Could not fetch models from that endpoint. Check the URL/key, or enter models manually.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ models });
  } catch (e: any) {
    console.error('[providers/models]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function fetchModelList(base: string, apiKey?: string): Promise<string[]> {
  // 1. OpenAI-compatible GET /models
  try {
    const res = await fetch(`${base}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const j = await res.json();
      const ids = (j.data || []).map((m: any) => m.id).filter(Boolean);
      if (ids.length) return ids;
    }
  } catch {}

  // 2. Ollama-style GET /api/tags (no auth; strip a trailing /v1)
  try {
    const ollamaBase = base.replace(/\/v1$/i, '');
    const res = await fetch(`${ollamaBase}/api/tags`, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const j = await res.json();
      const ids = (j.models || []).map((m: any) => m.name).filter(Boolean);
      if (ids.length) return ids;
    }
  } catch {}

  return [];
}
