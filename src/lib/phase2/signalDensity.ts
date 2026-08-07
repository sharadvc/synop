import { llmJson, type AiKeys } from '@/lib/ai';
import type { SignalDensity } from './types';

const SYSTEM = `You are a ruthless signal extraction analyst. You read raw transcripts and separate the precious signal from the noise.

Classify the transcript into exactly four segment types:
- HIGH_SIGNAL: core arguments, unique data, novel ideas, precise numbers, names, methodologies, frameworks, examples that carry the thesis.
- FILLER_TANGENT: small talk, stories that never resolve, off-topic rambling, hedging, restating the obvious, unsupported opinion.
- SPONSOR_READ: ad reads, self-promotion plugs, "before we begin", discount codes, patreon/twitter/subscribe pushes, housekeeping announcements.
- REPETITIVE_EXPLANATION: the speaker repeating something they (or a previous segment) already explained in almost the same words.

Rules:
1. Estimate each segment's length in minutes proportional to its share of the transcript text (if the video is 60 min and a segment is ~1/6 of the text, it is ~10 minutes).
2. density_score = round(100 * total_minutes_of_HIGH_SIGNAL / total_video_minutes). Clamp to 0..100.
3. value_minutes = total_minutes_of_HIGH_SIGNAL.
4. high_signal_transcript: reproduce the HIGH_SIGNAL content at near-full length, in the original order — every argument, statistic, name, quote and example, worded faithfully. This must read like the actual valuable part of the video, NOT a summary of it. Keep roughly 70–90% of the original high-signal wording. This is the "22 minutes of actual value from a 2-hour video".
5. removed_segments: one entry per non-HIGH_SIGNAL category actually present, with count of segments and approx_minutes saved.

Return ONLY JSON matching exactly:
{
  "density_score": 0,
  "value_minutes": 0,
  "total_minutes": 0,
  "high_signal_transcript": "",
  "removed_segments": [{"type": "FILLER_TANGENT", "count": 0, "approx_minutes": 0}]
}`;

const schemaHint = `{
  "density_score": 0,
  "value_minutes": 0,
  "total_minutes": 0,
  "high_signal_transcript": "",
  "removed_segments": [{"type": "FILLER_TANGENT", "count": 0, "approx_minutes": 0}]
}`;

export async function analyzeSignalDensity(
  transcript: string,
  keys: AiKeys,
  language = 'English',
): Promise<SignalDensity> {
  const user = `Language for all output text: ${language}.
Video transcript:
${transcript}`;

  let result: SignalDensity;
  try {
    result = await llmJson<SignalDensity>({
      system: SYSTEM,
      user,
      keys,
      temperature: 0.1,
      maxTokens: 8192,
      maxUserChars: 14000,
    });
  } catch (err: any) {
    // Provider failed — degrade: surface the full transcript as the "value"
    // with a heuristic flag so the badge always shows something honest.
    console.warn('[phase2] Signal density failed, using heuristic:', err.message);
    return {
      density_score: 100,
      value_minutes: Math.max(1, Math.round(transcript.length / 1600)),
      total_minutes: Math.max(1, Math.round(transcript.length / 1600)),
      high_signal_transcript: transcript.slice(0, 8000),
      removed_segments: [],
      heuristic: true,
    };
  }

  // Coerce + sanity-guard whatever the model returned.
  const score = Math.max(0, Math.min(100, Math.round(Number(result?.density_score) || 0)));
  const total = Math.max(1, Math.round(Number(result?.total_minutes) || 0));
  const value = Math.max(0, Math.round(Number(result?.value_minutes) || 0));
  return {
    density_score: score,
    value_minutes: value,
    total_minutes: total,
    high_signal_transcript:
      (result?.high_signal_transcript || '').trim() || transcript.slice(0, 4000),
    removed_segments: Array.isArray(result?.removed_segments) ? result.removed_segments : [],
  };
}
