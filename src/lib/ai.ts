export type { Provider } from '@/lib/providers';
export { PROVIDERS, PROVIDER_LABELS } from '@/lib/providers';
import { PROVIDERS, PROVIDER_LABELS, type Provider } from '@/lib/providers';

// BYOK provider layer — bring-your-own-key completions.
//
// Providers:
//   - openrouter : strictly `:free` models (live-verified against the catalog)
//   - groq       : strictly the free-tier allowlist (live-verified against the catalog)
//   - deepseek   : deepseek-chat / deepseek-reasoner (NOT free — cheap, user-billed)
//   - openai     : gpt-4o-mini family (NOT free — cheap, user-billed)
//
// A key can come from the request body (BYOK) or fall back to env vars.

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const DEEPSEEK_BASE = 'https://api.deepseek.com';
const OPENAI_BASE = 'https://api.openai.com/v1';

// ---------------------------------------------------------------------------
// Free model selection — STRICTLY free for openrouter & groq.
// ---------------------------------------------------------------------------

// Preferred OpenRouter free models (best summarizers first). The full list is
// fetched live and appended, so selection always reflects what is actually free.
const PREFERRED_OPENROUTER_FREE = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
];

// Groq free-tier allowlist. Only models in this list are ever called.
const GROQ_FREE_ALLOWLIST = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'llama-3.2-3b-preview',
  'llama-3.2-1b-preview',
];

// Non-free model lists for the paid "etc" providers.
const DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-reasoner'];
const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'];

let openRouterCache: { at: number; models: string[] } | null = null;
const OPENROUTER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/** Live list of OpenRouter `:free` models (preferred order first). */
async function getOpenRouterFreeModels(): Promise<string[]> {
  if (openRouterCache && Date.now() - openRouterCache.at < OPENROUTER_CACHE_TTL) {
    return openRouterCache.models;
  }
  try {
    const res = await fetch(`${OPENROUTER_BASE}/models`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`catalog ${res.status}`);
    const json = (await res.json()) as { data?: { id: string }[] };
    const free = (json.data ?? [])
      .map((m) => m.id)
      .filter((id) => id.includes(':free'));
    // Preferred first, then the rest.
    const ordered = [
      ...PREFERRED_OPENROUTER_FREE.filter((id) => free.includes(id)),
      ...free.filter((id) => !PREFERRED_OPENROUTER_FREE.includes(id)),
    ];
    openRouterCache = { at: Date.now(), models: ordered };
    return ordered;
  } catch {
    // Offline / catalog down — fall back to the preferred list (still all :free).
    openRouterCache = { at: Date.now(), models: PREFERRED_OPENROUTER_FREE };
    return PREFERRED_OPENROUTER_FREE;
  }
}

/** Groq models that are BOTH free-tier allowlisted AND live on the account. */
async function getGroqFreeModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`${GROQ_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return GROQ_FREE_ALLOWLIST;
    const json = (await res.json()) as { data?: { id: string }[] };
    const live = new Set((json.data ?? []).map((m) => m.id));
    const intersect = GROQ_FREE_ALLOWLIST.filter((id) => live.has(id));
    return intersect.length ? intersect : GROQ_FREE_ALLOWLIST;
  } catch {
    return GROQ_FREE_ALLOWLIST;
  }
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

interface ChatOptions {
  model: string;
  apiKey: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  extraHeaders?: Record<string, string>;
}

async function chatCompletion(
  baseUrl: string,
  opts: ChatOptions
): Promise<string | null> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
      ...opts.extraHeaders,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 4000,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (res.status === 429) {
    const err = new Error('rate_limited') as Error & { code?: string };
    err.code = 'rate_limited';
    throw err;
  }
  if (res.status === 401) {
    const err = new Error('invalid_key') as Error & { code?: string };
    err.code = 'invalid_key';
    throw err;
  }
  if (res.status === 402) {
    const err = new Error('insufficient_credits') as Error & { code?: string };
    err.code = 'insufficient_credits';
    throw err;
  }
  if (!res.ok) return null; // other errors → try next model

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? null;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface CompletionResult {
  content: string;
  model: string;
}

export async function summarizeWithProvider(opts: {
  provider: Provider;
  apiKey: string;
  system: string;
  transcript: string;
  maxTokens?: number;
}): Promise<CompletionResult> {
  const { provider, apiKey, system, transcript } = opts;
  const user = `Transcript:\n\n${transcript.substring(0, 35000)}`;
  const extraHeaders =
    provider === 'openrouter'
      ? {
          'HTTP-Referer': 'https://youtube-summary-ai.vercel.app',
          'X-Title': 'YouTube Summary AI',
        }
      : undefined;

  let models: string[] = [];
  let baseUrl = '';
  switch (provider) {
    case 'openrouter':
      baseUrl = OPENROUTER_BASE;
      models = await getOpenRouterFreeModels(); // strictly :free
      break;
    case 'groq':
      baseUrl = GROQ_BASE;
      models = await getGroqFreeModels(apiKey); // strictly free-tier allowlist
      break;
    case 'deepseek':
      baseUrl = DEEPSEEK_BASE;
      models = DEEPSEEK_MODELS;
      break;
    case 'openai':
      baseUrl = OPENAI_BASE;
      models = OPENAI_MODELS;
      break;
  }

  if (!models.length) throw new Error(`No models available for ${provider}.`);

  let lastErr: Error | null = null;

  for (const model of models) {
    try {
      const content = await chatCompletion(baseUrl, {
        model,
        apiKey,
        system,
        user,
        maxTokens: opts.maxTokens,
        extraHeaders,
      });
      if (content) return { content, model };
      lastErr = new Error(`Empty response from ${model}.`);
      console.error(`  ${provider}/${model} empty response`);
    } catch (err: any) {
      const code = err?.code;
      if (code === 'invalid_key') {
        throw new Error(`Invalid API key for ${PROVIDER_LABELS[provider]}.`);
      }
      if (code === 'insufficient_credits') {
        throw new Error(
          provider === 'openrouter'
            ? 'OpenRouter account needs credits (free models still need $0.01 balance on OpenRouter).'
            : `${PROVIDER_LABELS[provider]} account needs credits.`
        );
      }
      if (code === 'rate_limited') {
        console.error(`  ${provider}/${model} rate-limited, waiting...`);
        await delay(2000);
        lastErr = new Error('Rate limited (free tier). Try again in a minute.');
        continue;
      }
      lastErr = err;
      console.error(`  ${provider}/${model} error:`, err?.message);
      await delay(1000);
    }
  }

  throw lastErr || new Error(`All ${PROVIDER_LABELS[provider]} models failed.`);
}
