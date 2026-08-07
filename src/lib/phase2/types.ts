// Shared payload shapes for the Phase 2 (next-gen) analysis features.

export interface SignalDensity {
  /** Percentage of the video that is real, high-signal content (0-100). */
  density_score: number;
  /** Estimated minutes of high-value content extracted. */
  value_minutes: number;
  /** Total video length in minutes. */
  total_minutes: number;
  /** Condensed, high-signal transcript — the value stripped of filler. */
  high_signal_transcript: string;
  /** Breakdown of what was stripped away. */
  removed_segments: { type: string; count: number; approx_minutes: number }[];
}

export interface TopicCluster {
  /** Human label for the theme, e.g. "Tax Law Implications". */
  topic: string;
  /** Unified summary of every chunk that maps to this theme. */
  summary: string;
  /** Number of transcript chunks grouped under this topic. */
  count: number;
}

export interface DebateSpeaker {
  name: string;
  stance: string;
  claims: string[];
}

export interface DebateContention {
  topic: string;
  speaker_a: string;
  speaker_b: string;
  point_of_contention: string;
  alignment: 'AGREE' | 'DISAGREE';
}

export interface DebateMatrix {
  multiSpeaker: boolean;
  speakers: DebateSpeaker[];
  contentions: DebateContention[];
}

export type FreshnessStatus = 'VALIDATED' | 'CONTEXT_CHANGED' | 'DEBUNKED_OUTDATED';

export interface FreshnessCheck {
  claim: string;
  entity: string;
  status: FreshnessStatus;
  /** Human note explaining the verdict against current data. */
  note: string;
  sources: string[];
}

export interface Phase2Payload {
  signalDensity: SignalDensity | null;
  topicClusters: TopicCluster[] | null;
  debateMatrix: DebateMatrix | null;
  freshness: FreshnessCheck[] | null;
}
