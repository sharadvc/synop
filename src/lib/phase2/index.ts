import { analyzeTopicClusters } from './topicClusters';
import { analyzeDebateMatrix } from './debateMatrix';
import { analyzeFreshness } from './freshness';
import type { AiKeys } from '@/lib/ai';
import type { Phase2Payload, TopicCluster, DebateMatrix, FreshnessCheck } from './types';

export type { Phase2Payload, TopicCluster, DebateMatrix, FreshnessCheck };

/**
 * Runs every Phase 2 feature in parallel. Each is independently guarded so a
 * failure in one (e.g. no web results, embedding hiccup) never blocks the rest.
 */
export async function enrichTranscript(
  transcript: string,
  keys: AiKeys,
  language = 'English',
): Promise<Phase2Payload> {
  const [topicClusters, debateMatrix, freshness] = await Promise.all([
    runGuarded(() => analyzeTopicClusters(transcript, keys, language)),
    runGuarded(() => analyzeDebateMatrix(transcript, keys, language)),
    runGuarded(() => analyzeFreshness(transcript, keys, language)),
  ]);

  return {
    topicClusters,
    debateMatrix,
    freshness,
  };
}

async function runGuarded<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    console.warn('[phase2] Feature failed (continuing):', err.message);
    return null;
  }
}
