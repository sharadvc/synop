import { llmJson, type AiKeys } from '@/lib/ai';
import type { DebateMatrix } from './types';

/**
 * Multi-Speaker Argument Mapping ("Debate Matrix").
 *
 * YouTube transcripts do not carry speaker labels, so this performs best-effort
 * *soft* diarization: the LLM infers distinct speakers from conversational
 * structure (interruptions, question/answer pairs, named turns, shifts in
 * viewpoint). When the video is a solo monologue it reports multiSpeaker=false
 * and the UI hides the matrix, exactly as the PRD demands.
 */

const SYSTEM = `You are a debate analyst who maps arguments to the people who made them.

Analyze the transcript for distinct speakers or clearly opposing viewpoints. If the transcript is a single monologue (one person talking the whole time), set multiSpeaker=false and return empty arrays.

How to infer speakers without labels:
- Any explicit names ("Host:", "Guest:", "Lex:", "Elon:") — use them as speaker names.
- Question-and-answer exchanges (one party asks, another answers) — label them "Questioner" / "Respondent" unless a name appears.
- Clear topic ownership: when the video keeps cutting between two people with distinct opinions, attribute each claim to the best-fit inferred speaker ("Speaker 1", "Speaker 2").
- Do NOT invent speakers who are not plausibly present. A podcast with one host who never interviews anyone is still a monologue.

For each speaker, capture:
- name: the cleanest label.
- stance: their position on the central topic in 1-2 sentences.
- claims: 2-6 verbatim or near-verbatim claims they make (paraphrase tightly; keep numbers and names).

Then build contentions — the points where speakers engage each other:
- topic: the disputed subject (noun phrase).
- speaker_a / speaker_b: names of the two sides.
- point_of_contention: exactly what they disagree (or agree) about.
- alignment: "AGREE" if they land on the same conclusion, "DISAGREE" otherwise.

Return ONLY JSON exactly:
{
  "multiSpeaker": true,
  "speakers": [{"name": "", "stance": "", "claims": []}],
  "contentions": [{"topic": "", "speaker_a": "", "speaker_b": "", "point_of_contention": "", "alignment": "AGREE"}]
}`;

export async function analyzeDebateMatrix(
  transcript: string,
  keys: AiKeys,
  language = 'English',
): Promise<DebateMatrix> {
  const user = `Language for all output text: ${language}.
Transcript:
${transcript}`;

  const res = await llmJson<DebateMatrix>({
    system: SYSTEM,
    user,
    keys,
    temperature: 0.2,
    maxTokens: 4000,
    maxUserChars: 13000,
  });

  const multiSpeaker = Boolean(res?.multiSpeaker) && Array.isArray(res?.speakers) && res.speakers.length > 1;
  return {
    multiSpeaker,
    speakers: Array.isArray(res?.speakers)
      ? res.speakers.map(s => ({
          name: (s.name || 'Speaker').trim(),
          stance: (s.stance || '').trim(),
          claims: Array.isArray(s.claims) ? s.claims.slice(0, 6) : [],
        }))
      : [],
    contentions: multiSpeaker && Array.isArray(res?.contentions)
      ? res.contentions.slice(0, 12).map(c => ({
          topic: (c.topic || '').trim(),
          speaker_a: (c.speaker_a || '').trim(),
          speaker_b: (c.speaker_b || '').trim(),
          point_of_contention: (c.point_of_contention || '').trim(),
          alignment: c.alignment === 'AGREE' ? 'AGREE' : 'DISAGREE',
        }))
      : [],
  };
}
