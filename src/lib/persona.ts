/**
 * Persona system — "who are you?" on first run, then the app reshapes itself
 * around that job: summary tabs reorder, the default tab changes, and the
 * dashboard shows a persona-specific quick-start. Persisted in localStorage.
 */

export type PersonaId = 'student' | 'researcher' | 'creator' | 'general';

const KEY = 'synop_persona';

export interface PersonaDef {
  id: PersonaId;
  label: string;
  tagline: string;
  emoji: string;
  /** Order of summary-page tabs (tab ids) for this persona. */
  tabOrder: string[];
  /** Tabs hidden entirely for this persona (tailoring, per the audit). */
  hiddenTabs: string[];
  defaultTab: string;
  dashboardHint: string;
  onboardingBlurb: string;
}

export const PERSONAS: Record<PersonaId, PersonaDef> = {
  student: {
    id: 'student',
    label: 'Student',
    tagline: 'Turn lectures into study decks, notes & flashcards',
    emoji: '🎓',
    tabOrder: ['topics', 'notebook', 'notes', 'frameworks', 'bias', 'quotes'],
    hiddenTabs: ['debate'],
    defaultTab: 'topics',
    dashboardHint: 'Paste a course playlist → build a whole-course Anki deck & quiz.',
    onboardingBlurb: 'Study Mode, course playlists, flashcards, and exam-ready Anki exports.',
  },
  researcher: {
    id: 'researcher',
    label: 'Researcher / Analyst',
    tagline: 'Fact-check claims, trace entities & export to your notes',
    emoji: '🔬',
    tabOrder: ['quotes', 'research', 'notebook', 'bias', 'debate', 'topics', 'frameworks'],
    hiddenTabs: ['notes'],
    defaultTab: 'quotes',
    dashboardHint: 'Paste a video → get its claims fact-checked against current data.',
    onboardingBlurb: 'Freshness fact-checks, Bias & Critique, and Obsidian/Notion export.',
  },
  creator: {
    id: 'creator',
    label: 'Creator / Writer',
    tagline: 'Extract quotable moments, sources & frameworks',
    emoji: '✍️',
    tabOrder: ['quotes', 'notebook', 'topics', 'bias', 'frameworks', 'debate'],
    hiddenTabs: ['notes'],
    defaultTab: 'quotes',
    dashboardHint: 'Pull shareable quotes, resources & mental models from any video.',
    onboardingBlurb: 'Sharable quotes, mentioned resources, frameworks, and clean exports.',
  },
  general: {
    id: 'general',
    label: 'Just exploring',
    tagline: 'All features, no particular focus',
    emoji: '🧠',
    tabOrder: ['topics', 'notebook', 'debate', 'frameworks', 'bias', 'quotes', 'notes', 'research'],
    hiddenTabs: [],
    defaultTab: 'topics',
    dashboardHint: 'Summarize any video and explore every angle.',
    onboardingBlurb: 'Every feature, in the classic order. You can change this anytime in Settings.',
  },
};

export const PERSONA_LIST: PersonaDef[] = [
  PERSONAS.student,
  PERSONAS.researcher,
  PERSONAS.creator,
  PERSONAS.general,
];

/** Read the saved persona (client-side only — localStorage). */
export function getPersona(): PersonaId {
  if (typeof window === 'undefined') return 'general';
  const v = localStorage.getItem(KEY);
  return v && PERSONAS[v as PersonaId] ? (v as PersonaId) : 'general';
}

export function savePersona(id: PersonaId) {
  localStorage.setItem(KEY, id);
  window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: id }));
}

export function personaDef(id: PersonaId): PersonaDef {
  return PERSONAS[id] || PERSONAS.general;
}
