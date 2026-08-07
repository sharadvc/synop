import { llmJson, type AiKeys } from '@/lib/ai';
import type { TopicCluster } from './types';

/**
 * Semantic Topic Clustering — groups transcript content by THEME instead of
 * by chronology. Chunks -> embeddings -> K-means -> LLM labels each cluster.
 *
 * Embeddings come from Gemini's free text-embedding-004 (same key as the rest
 * of the app). If no Gemini key is available (or the call fails) we fall back
 * to pure LLM topic extraction so the feature still works.
 */

const CHUNK_CHARS = 500;
const OVERLAP = 80;

function chunkTranscript(transcript: string): string[] {
  const chunks: string[] = [];
  const step = CHUNK_CHARS - OVERLAP;
  for (let i = 0; i < transcript.length; i += step) {
    const chunk = transcript.slice(i, i + CHUNK_CHARS).trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

async function embedWithGemini(texts: string[], key: string): Promise<number[][]> {
  const out: number[][] = [];
  // Some projects only expose text-embedding-001; try the GA model first then fall back.
  const candidates = ['text-embedding-004', 'text-embedding-001'];
  let lastErr: Error | null = null;
  for (const model of candidates) {
    try {
      return await embedBatch(texts, key, model);
    } catch (err: any) {
      lastErr = err;
      console.warn(`[phase2] embedding model ${model} failed:`, err.message);
    }
  }
  throw lastErr || new Error('Gemini embedding unavailable');
}

async function embedBatch(texts: string[], key: string, model: string): Promise<number[][]> {
  const out: number[][] = [];
  // batchEmbedContents accepts up to 100 requests per call.
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' +
        model +
        ':batchEmbedContents?key=' +
        encodeURIComponent(key),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: batch.map(t => ({
            model: 'models/' + model,
            content: { parts: [{ text: t }] },
          })),
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error('Gemini embedding failed: ' + body.slice(0, 200));
    }
    const json = await res.json();
    const values: number[][] = (json.embeddings || []).map((e: any) => e.values);
    if (values.length !== batch.length) throw new Error('Embedding count mismatch');
    out.push(...values);
  }
  return out;
}

function euclid(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/** K-means++ with lazy (sparse) centroid recompute. Returns a label per point. */
function kMeans(points: number[][], k: number, maxIter = 20): number[] {
  const n = points.length;
  if (n <= 1) return new Array(n).fill(0);
  const kk = Math.max(1, Math.min(k, n));
  if (kk === 1) return new Array(n).fill(0);

  // k-means++ init
  const centroids: number[][] = [];
  centroids.push(points[Math.floor(Math.random() * n)]);
  while (centroids.length < kk) {
    const weights = points.map(p => {
      let best = Infinity;
      for (const c of centroids) best = Math.min(best, euclid(p, c));
      return best * best;
    });
    const total = weights.reduce((s, w) => s + w, 0) + 1e-9;
    let r = Math.random() * total;
    let idx = n - 1;
    for (let i = 0; i < n; i++) {
      r -= weights[i];
      if (r <= 0) { idx = i; break; }
    }
    centroids.push(points[idx]);
  }

  let labels = new Array<number>(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    const next = points.map(p => {
      let best = 0, bd = Infinity;
      for (let ci = 0; ci < centroids.length; ci++) {
        const d = euclid(p, centroids[ci]);
        if (d < bd) { bd = d; best = ci; }
      }
      return best;
    });
    // recompute centroids
    for (let ci = 0; ci < centroids.length; ci++) {
      const members: number[][] = [];
      for (let i = 0; i < n; i++) if (next[i] === ci) members.push(points[i]);
      if (members.length === 0) continue;
      const mean = new Array(points[0].length).fill(0);
      for (const m of members) for (let d = 0; d < mean.length; d++) mean[d] += m[d];
      for (let d = 0; d < mean.length; d++) mean[d] /= members.length;
      centroids[ci] = mean;
    }
    const changed = next.some((l, i) => l !== labels[i]);
    labels = next;
    if (!changed) break;
  }
  return labels;
}

const CLUSTER_LABEL_SYSTEM = `You are a topic architect. You are given a set of transcript excerpts that all belong to ONE theme. Produce a crisp, specific name for that theme and a dense unified summary.

Rules:
- The topic name must be a short noun phrase (2-6 words), e.g. "Tax Law Implications" or "Scaling GPU Clusters". Never generic labels like "Introduction" or "Main Topic".
- The summary must synthesize ONLY what these excerpts actually say: every concrete number, name, claim and example. Keep it tight but information-dense.
- If the excerpts are unrelated noise, use the strongest recurring idea as the theme.

Return ONLY JSON:
{"topic": "...", "summary": "..."}`;

async function labelCluster(chunkText: string, keys: AiKeys, language: string): Promise<{ topic: string; summary: string }> {
  const user = `Language for output text: ${language}.
Transcript excerpts belonging to this theme:
"""${chunkText}"""`;
  const res = await llmJson<{ topic?: string; summary?: string }>({
    system: CLUSTER_LABEL_SYSTEM,
    user,
    keys,
    temperature: 0.2,
    maxTokens: 1500,
    maxUserChars: 6000,
  });
  return {
    topic: (res?.topic || 'Untitled Theme').trim(),
    summary: (res?.summary || '').trim(),
  };
}

const LLM_ONLY_SYSTEM = `You are a topic architect. Group the following transcript into distinct THEMES (3-8), regardless of where each appears chronologically.

Rules:
- Each cluster has a short specific topic name (2-6 words), a dense unified summary of everything that theme covers, and a count (number of distinct points you folded into it).
- Preserve concrete numbers, names and claims in the summaries.
- Cover the ENTIRE transcript. Merge near-duplicate themes; split only genuinely distinct subjects.
- STRICTLY IGNORE sponsor reads, ad reads, discount codes, self-promotion, and "like and subscribe" segments — never make them a topic.

Return ONLY JSON:
{"clusters":[{"topic":"...","summary":"...","count":0}]}`;

async function clusterWithLlm(transcript: string, keys: AiKeys, language: string): Promise<TopicCluster[]> {
  const user = `Language for output text: ${language}.
Transcript:
${transcript}`;
  const res = await llmJson<{ clusters?: TopicCluster[] }>({
    system: LLM_ONLY_SYSTEM,
    user,
    keys,
    temperature: 0.2,
    maxTokens: 6000,
    maxUserChars: 13000,
  });
  return (res?.clusters || []).map(c => ({
    topic: (c.topic || 'Theme').trim(),
    summary: (c.summary || '').trim(),
    count: Math.max(1, Number(c.count) || 1),
  }));
}

export async function analyzeTopicClusters(
  transcript: string,
  keys: AiKeys,
  language = 'English',
): Promise<TopicCluster[]> {
  const chunks = chunkTranscript(transcript);
  if (chunks.length === 0) return [];

  const geminiKey = keys.gemini;
  if (geminiKey && chunks.length >= 2) {
    try {
      const vectors = await embedWithGemini(chunks, geminiKey);
      const k = Math.min(8, Math.max(2, Math.ceil(chunks.length / 4)));
      const labels = kMeans(vectors, k);

      const groups = new Map<number, string[]>();
      chunks.forEach((chunk, i) => {
        const g = groups.get(labels[i]) || [];
        g.push(chunk);
        groups.set(labels[i], g);
      });

      const results = await Promise.allSettled(
        [...groups.entries()].map(([, groupChunks]) =>
          labelCluster(groupChunks.join(' ').slice(0, 5500), keys, language),
        ),
      );

      const clusters: TopicCluster[] = [];
      [...groups.entries()].forEach(([label, groupChunks], idx) => {
        const r = results[idx];
        const labeled =
          r.status === 'fulfilled' ? r.value : { topic: 'Theme ' + (label + 1), summary: groupChunks.join(' ') };
        clusters.push({
          topic: labeled.topic,
          summary: labeled.summary,
          count: groupChunks.length,
        });
      });

      // Merge clusters that ended up with near-identical topics.
      const seen = new Set<string>();
      return clusters.filter(c => {
        const key = c.topic.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch (err: any) {
      console.warn('[phase2] Embedding clustering failed, using LLM fallback:', err.message);
    }
  }

  // LLM-only fallback (no key / embedding failure / very short transcript).
  try {
    const llmClusters = await clusterWithLlm(chunks.slice(0, 12).join('\n---\n'), keys, language);
    if (llmClusters.length > 0) return llmClusters;
  } catch (err: any) {
    console.warn('[phase2] LLM clustering failed:', err.message);
  }

  // Everything failed — surface it so the UI shows a retry rather than a
  // misleading "Full Transcript" pseudo-cluster.
  throw new Error('Topic clustering could not be completed.');
}
