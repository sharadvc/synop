import { llmJson, type AiKeys } from '@/lib/ai';
import { webSearch } from '@/lib/web';
import type { FreshnessCheck, FreshnessStatus } from './types';

/**
 * Temporal Decay & "Freshness" Flagging.
 *
 * Fact-checks a handful of the video's most checkable claims against current
 * web data so stale information is never consumed as fact:
 *   VALIDATED        (green)  — claim still matches current data
 *   CONTEXT_CHANGED  (yellow) — claim was true but context shifted
 *   DEBUNKED_OUTDATED(red)    — claim is now wrong / outdated
 *
 * Web search is keyless-first (Tavily if configured, else DuckDuckGo), and the
 * whole feature degrades gracefully: if a claim can't be verified it is simply
 * marked VALIDATED-with-caveat rather than failing the request.
 */

const EXTRACT_SYSTEM = `You are a fact-checker. From the transcript, extract the 3-8 most CHECKABLE factual claims a viewer might rely on — statistics, prices, dates, "as of 2024/2025" claims, definitions tied to a current state, product versions, laws, rankings. Skip subjective opinions, predictions, and untestable claims.

For each claim output:
- claim: the exact claim, reworded into a tight, self-contained, verifiable sentence (keep the number/name).
- entity: the core subject noun phrase, e.g. "OpenAI GPT-4 pricing" or "India GDP growth 2025".

Return ONLY JSON:
{"claims":[{"claim":"...","entity":"..."}]}`;

const CLASSIFY_SYSTEM = `You are a research librarian with the latest web search results in hand. For each claim you are given, compare the claim against the CURRENT web search results and decide its freshness status:

- VALIDATED: the claim matches what current sources say. Green.
- CONTEXT_CHANGED: the claim was correct in context but the situation has since shifted (numbers changed, product renamed, policy replaced). Yellow.
- DEBUNKED_OUTDATED: the claim is contradicted by current sources, or refers to something that no longer exists/holds. Red.

Rules:
- If search results are empty/unhelpful, mark VALIDATED but set note to "Could not find current data to contradict this." (do not guess).
- note must be 1-2 sentences, concrete, citing what current data actually says.
- sources: the 1-3 most relevant URLs that support the verdict.

Return ONLY JSON:
{"results":[{"claim":"...","status":"VALIDATED","note":"...","sources":["..."]}]}`;

interface ExtractedClaim {
  claim: string;
  entity: string;
}

/**
 * Deterministic fallback: pull sentences that LOOK checkable (contain
 * numbers/percentages/currency/years) so Freshness always returns something
 * even when every AI provider is down.
 */
function extractClaimsHeuristically(transcript: string): ExtractedClaim[] {
  const sentences = transcript
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 25 && s.length < 260);
  return sentences
    .filter(s => /\d|%|\$|€|₹|as of|by \d{4}|in \d{4}/i.test(s))
    .slice(0, 6)
    .map(s => ({ claim: s, entity: s.split(' ').slice(0, 6).join(' ') }));
}

export async function analyzeFreshness(
  transcript: string,
  keys: AiKeys,
  language = 'English',
): Promise<FreshnessCheck[]> {
  // ── Step 1: pull the checkable claims ──────────────────────────────────
  let claims: ExtractedClaim[] = [];
  try {
    const extracted = await llmJson<{ claims?: ExtractedClaim[] }>({
      system: EXTRACT_SYSTEM,
      user: `Language for output text: ${language}.\nTranscript:\n${transcript}`,
      keys,
      temperature: 0.1,
      maxTokens: 2000,
      maxUserChars: 13000,
    });
    claims = (extracted?.claims || []).filter(c => c.claim).slice(0, 8);
  } catch (err: any) {
    // Provider failed — degrade to heuristic claims so Freshness never empties.
    console.warn('[phase2] Claim extraction failed, using heuristic:', err.message);
    claims = extractClaimsHeuristically(transcript);
  }

  if (claims.length === 0) return [];

  // ── Step 2: search each claim in parallel ───────────────────────────────
  const searched = await Promise.all(
    claims.map(async c => ({
      claim: c,
      results: await webSearch(c.claim + (c.entity ? ' ' + c.entity : ''), 3),
    })),
  );

  const searchBlob = searched
    .map(
      s =>
        `CLAIM: ${s.claim.claim}\n` +
        (s.results.length === 0
          ? 'RESULTS: (none returned)\n'
          : s.results
              .map((r, i) => `  [${i + 1}] ${r.title} — ${r.snippet}\n      ${r.url}`)
              .join('\n')),
    )
    .join('\n\n');

  // ── Step 3: classify against current data ───────────────────────────────
  try {
    const verdicts = await llmJson<{ results?: FreshnessCheck[] }>({
      system: CLASSIFY_SYSTEM,
      user: `Language for output text: ${language}.\n\n${searchBlob}`,
      keys,
      temperature: 0.1,
      maxTokens: 4000,
      maxUserChars: 12000,
    });

    const byClaim = new Map<string, FreshnessCheck>();
    for (const v of verdicts?.results || []) {
      if (!v?.claim) continue;
      byClaim.set(v.claim.trim().toLowerCase(), v);
    }

    return claims.map(c => {
      const matched = byClaim.get(c.claim.trim().toLowerCase());
      const status: FreshnessStatus = matched?.status === 'CONTEXT_CHANGED'
        ? 'CONTEXT_CHANGED'
        : matched?.status === 'DEBUNKED_OUTDATED'
          ? 'DEBUNKED_OUTDATED'
          : 'VALIDATED';
      const sources =
        Array.isArray(matched?.sources) && matched.sources.length > 0
          ? matched.sources.slice(0, 3)
          : searched.find(s => s.claim.claim === c.claim)?.results.map(r => r.url) || [];
      return {
        claim: c.claim,
        entity: c.entity,
        status,
        note: matched?.note || 'Could not find current data to contradict this claim.',
        sources: sources.filter(Boolean),
      };
    });
  } catch (err: any) {
    // Classification provider failed — still return the claims, honestly marked
    // as unverified instead of failing the whole feature.
    console.warn('[phase2] Freshness classification failed, marking unverified:', err.message);
    return claims.map(c => ({
      claim: c.claim,
      entity: c.entity,
      status: 'VALIDATED' as const,
      note: 'Could not auto-verify this claim (fact-check unavailable) — treat as unverified.',
      sources: (searched.find(s => s.claim.claim === c.claim)?.results || []).map(r => r.url).filter(Boolean),
    }));
  }
}
