/**
 * Shared AI provider layer for Phase 2 features.
 *
 * Reuses the exact BYOK fallback chain already proven in /api/summarize:
 *   TIER 0: user-configured custom providers (any OpenAI-compatible endpoint)
 *   TIER 1: OpenRouter (free models) -> TIER 2: Groq -> TIER 3: Gemini
 *
 * `llmJson<T>` guarantees a parsed object (or throws), so every feature
 * consumes a deterministic JSON shape regardless of which provider answered.
 */
import { safeProviderBaseUrl } from '@/lib/net';

/** A user-defined provider: any OpenAI-compatible /chat/completions endpoint. */
export interface CustomProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
}

export type AiKeys = {
  gemini?: string | null;
  groq?: string | null;
  openrouter?: string | null;
  customProviders?: CustomProvider[];
};

/** Read user-defined providers from the `x-custom-providers` header. */
export function resolveCustomProviders(headers?: Headers): CustomProvider[] {
  const raw = headers?.get('x-custom-providers');
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return (Array.isArray(arr) ? arr : [])
      .filter(p => p?.baseUrl && p?.apiKey && Array.isArray(p.models) && p.models.length)
      .map(p => ({
        name: String(p.name || 'Custom'),
        baseUrl: String(p.baseUrl).replace(/\/+$/, ''),
        apiKey: String(p.apiKey),
        models: p.models.map(String).filter(Boolean),
      }));
  } catch {
    return [];
  }
}

/** Pull keys from request headers first (BYOK), then server env. */
export function resolveKeys(headers?: Headers): AiKeys {
  return {
    gemini: headers?.get('x-gemini-key') || process.env.GEMINI_API_KEY || null,
    groq: headers?.get('x-groq-key') || process.env.GROQ_API_KEY || null,
    openrouter:
      headers?.get('x-openrouter-key') ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENAI_API_KEY ||
      null,
    customProviders: resolveCustomProviders(headers),
  };
}

/**
 * OpenAI-compatible chat completion against a user-configured endpoint.
 * Returns the raw content string, or null on any failure (so the chain moves on).
 * No `response_format` is sent — maximum compatibility (Ollama, LM Studio, etc.)
 * relies on extractJson to parse the answer.
 */
export async function callCustomProvider(
  provider: CustomProvider,
  model: string,
  system: string,
  user: string,
  temperature = 0.2,
  maxTokens = 4096,
): Promise<string | null> {
  try {
    // SSRF guard: never fetch user-supplied private/metadata/localhost URLs.
    if (!(await safeProviderBaseUrl(provider.baseUrl))) return null;
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export function extractJson(raw: string): any {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch {}

  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch {} }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) { try { return JSON.parse(trimmed.slice(start, end + 1)); } catch {} }

  const fixed = trimmed
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":');
  try { return JSON.parse(fixed); } catch {}

  throw new Error(`Failed to parse AI response. Raw start: ${trimmed.substring(0, 150)}`);
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Verified working OpenRouter free models (Aug 2026). Older IDs like
// `google/gemini-2.0-flash-lite-preview-02-05:free` have been retired — any
// stale ID silently 400s and burns the whole fallback chain, so keep this list
// in sync with https://openrouter.ai/models?q=free
const OPENROUTER_FALLBACK_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'google/gemma-4-31b-it:free',
];

interface LlmOptions {
  system: string;
  user: string;
  keys: AiKeys;
  temperature?: number;
  maxTokens?: number;
  /** Cap the transcript passed to cheaper/faster providers to dodge rate limits. */
  maxUserChars?: number;
  /** Extra OpenRouter model ids to try before the shared fallback list. */
  preferredOpenRouterModels?: string[];
}

/**
 * Run an LLM call expecting a JSON object, walking the provider fallback chain.
 * Truncates the user payload for Groq/OpenRouter so free-tier rate limits are
 * respected (Gemini's 1M-token context gets the full transcript).
 */
export async function llmJson<T>(opts: LlmOptions): Promise<T> {
  const {
    system,
    user,
    keys,
    temperature = 0.2,
    maxTokens = 4096,
    maxUserChars = 12000,
    preferredOpenRouterModels = [],
  } = opts;

  let lastErr: Error | null = null;

  // ── TIER 0: user-configured custom providers (BYOK endpoints) ────────────
  if (keys.customProviders && keys.customProviders.length > 0) {
    for (const provider of keys.customProviders) {
      for (const model of provider.models) {
        const truncated = user.length > maxUserChars
          ? user.slice(0, maxUserChars) + '\n\n[INPUT TRUNCATED]'
          : user;
        const content = await callCustomProvider(provider, model, system, truncated, temperature, maxTokens);
        if (content) {
          try { return extractJson(content) as T; } catch {}
        }
      }
    }
  }

  // ── TIER 1: OpenRouter (the reliable path — validated working free models) ─
  const openRouterKey = keys.openrouter;
  if (openRouterKey) {
    const models = [...preferredOpenRouterModels, ...OPENROUTER_FALLBACK_MODELS];
    for (const model of models) {
      try {
        const truncated = user.length > maxUserChars
          ? user.slice(0, maxUserChars) + '\n\n[INPUT TRUNCATED]'
          : user;
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://synop.local',
            'X-Title': 'Synop',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: truncated },
            ],
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          }),
        });
        if (res.status === 429) { await delay(1000); continue; }
        if (!res.ok) continue;
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) return extractJson(content) as T;
      } catch (err: any) {
        lastErr = err;
        await delay(500);
      }
    }
  }

  // ── TIER 2: Groq ────────────────────────────────────────────────────────
  const groqKey = keys.groq;
  if (groqKey) {
    // Try the big model first, then the small (far more lenient) one.
    const groqModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
    for (const model of groqModels) {
      try {
        const truncated = user.length > maxUserChars
          ? user.slice(0, maxUserChars) + '\n\n[INPUT TRUNCATED]'
          : user;
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: truncated },
            ],
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content;
          if (content) return extractJson(content) as T;
        } else {
          const err = await res.text();
          console.warn(`[ai] Groq ${model} failed:`, res.status, err.substring(0, 150));
          if (res.status === 413) continue; // input too large for this model
        }
      } catch (err: any) {
        console.warn('[ai] Groq error:', err.message);
      }
    }
  }

  // ── TIER 3: Gemini (used when a key with quota is available) ─────────────
  const geminiKey = keys.gemini;
  if (geminiKey) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
          encodeURIComponent(geminiKey),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `System Prompt:\n${system}\n\nUser Request:\n${user}` }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              responseMimeType: 'application/json',
            },
          }),
        },
      );
      if (res.ok) {
        const json = await res.json();
        const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (content) return extractJson(content) as T;
      } else {
        const err = await res.text();
        console.warn('[ai] Gemini failed, falling back:', err.substring(0, 150));
      }
    } catch (err: any) {
      console.warn('[ai] Gemini error:', err.message);
    }
  }

  throw lastErr || new Error('No working AI provider. Add a Gemini, Groq, or OpenRouter key in Settings.');
}

/**
 * Like llmJson but returns raw text (for prose/markdown reports).
 * Same provider fallback chain: custom → OpenRouter → Groq → Gemini.
 */
export async function llmText(opts: {
  system: string;
  user: string;
  keys: AiKeys;
  temperature?: number;
  maxTokens?: number;
  maxUserChars?: number;
}): Promise<string> {
  const { system, user, keys, temperature = 0.3, maxTokens = 6000, maxUserChars = 12000 } = opts;
  const truncated = user.length > maxUserChars ? user.slice(0, maxUserChars) + '\n\n[INPUT TRUNCATED]' : user;

  // Custom providers
  for (const p of keys.customProviders || []) {
    for (const model of p.models) {
      const content = await callCustomProvider(p, model, system, truncated, temperature, maxTokens);
      if (content && content.trim()) return content.trim();
    }
  }

  // OpenRouter
  if (keys.openrouter) {
    for (const model of OPENROUTER_FALLBACK_MODELS) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${keys.openrouter}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://synop.local', 'X-Title': 'Synop' },
          body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: truncated }], temperature, max_tokens: maxTokens }),
        });
        if (res.status === 429) { await delay(1000); continue; }
        if (!res.ok) continue;
        const j = await res.json();
        const content = j.choices?.[0]?.message?.content;
        if (content && content.trim()) return content.trim();
      } catch {}
    }
  }

  // Groq
  if (keys.groq) {
    for (const model of ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${keys.groq}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: truncated }], temperature, max_tokens: maxTokens }),
        });
        if (!res.ok) continue;
        const j = await res.json();
        const content = j.choices?.[0]?.message?.content;
        if (content && content.trim()) return content.trim();
      } catch {}
    }
  }

  // Gemini
  if (keys.gemini) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(keys.gemini),
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `System Prompt:\n${system}\n\nUser Request:\n${user}` }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens } }) },
      );
      if (res.ok) {
        const j = await res.json();
        const content = j.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content && content.trim()) return content.trim();
      }
    } catch {}
  }

  throw new Error('No working AI provider for report generation.');
}
