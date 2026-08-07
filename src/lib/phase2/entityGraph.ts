/**
 * REAL entity knowledge graph — derived deterministically from text, not
 * hallucinated by an LLM.
 *
 * Nodes = entities actually mentioned in the source text.
 * Edges = two entities that co-occur inside a small window
 *         (i.e. the speaker discusses them together), weighted by frequency.
 *
 * Sources are scanned independently (so co-occurrence is always within one
 * source) and their windows accumulate. Passing the transcript PLUS the
 * summary/quotes lets the graph still form when the raw transcript is in a
 * different language or script than the extracted entity names.
 */

export interface EntityLike {
  type?: string;
  name?: string;
}

export interface EntityNode {
  id: string;
  name: string;
  type: string;
  /** Number of co-occurrence edges touching this node. */
  degree: number;
  /** Times the entity name appears across the scanned sources. */
  mentions: number;
}

export interface EntityEdge {
  source: string;
  target: string;
  weight: number;
}

const WINDOW = 110;
const STEP = 55;
const MAX_NODES = 14;

function slugify(name: string): string {
  return 'n' + (name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'node');
}

export function analyzeEntityGraph(
  transcript: string,
  entities: EntityLike[],
  extraSources: string[] = [],
): { nodes: EntityNode[]; edges: EntityEdge[] } {
  const sources = [transcript, ...extraSources].filter(s => typeof s === 'string' && s.length > 0);
  if (sources.length === 0 || !Array.isArray(entities) || entities.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Dedupe entity names (case-insensitive).
  const seen = new Map<string, { name: string; type: string }>();
  for (const e of entities) {
    const name = (e?.name || '').trim();
    if (name.length < 2) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, { name, type: (e?.type || 'Entity').trim() || 'Entity' });
  }

  const toRegex = (name: string) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'giu');
  };

  // Count mentions + edge weights across every source (windows per source).
  const mentionCount = new Map<string, number>();
  const edgeWeight = new Map<string, number>();

  for (const source of sources) {
    const text = source.toLowerCase();
    for (const [key, ent] of seen) {
      const m = text.match(toRegex(ent.name));
      if (m) mentionCount.set(key, (mentionCount.get(key) || 0) + m.length);
    }
    for (let start = 0; start < text.length; start += STEP) {
      const windowText = text.slice(start, start + WINDOW);
      const present = [...seen.entries()].filter(([, ent]) => toRegex(ent.name).test(windowText));
      for (let i = 0; i < present.length; i++) {
        for (let j = i + 1; j < present.length; j++) {
          const key = [present[i][0], present[j][0]].sort().join('||');
          edgeWeight.set(key, (edgeWeight.get(key) || 0) + 1);
        }
      }
    }
  }

  // Only entities actually mentioned get a node.
  const active = [...seen.entries()]
    .filter(([key]) => mentionCount.has(key))
    .sort((a, b) => (mentionCount.get(b[0]) || 0) - (mentionCount.get(a[0]) || 0))
    .slice(0, MAX_NODES);

  if (active.length === 0) return { nodes: [], edges: [] };

  const degree = new Map<string, number>();
  for (const [key, w] of edgeWeight) {
    const [a, b] = key.split('||');
    degree.set(a, (degree.get(a) || 0) + w);
    degree.set(b, (degree.get(b) || 0) + w);
  }

  const nodes: EntityNode[] = active.map(([key, ent]) => ({
    id: slugify(ent.name),
    name: ent.name,
    type: ent.type,
    degree: degree.get(key) || 0,
    mentions: mentionCount.get(key) || 0,
  }));

  const edges: EntityEdge[] = [...edgeWeight.entries()]
    .map(([key, weight]) => {
      const [a, b] = key.split('||');
      const nameA = seen.get(a)?.name || a;
      const nameB = seen.get(b)?.name || b;
      return { source: slugify(nameA), target: slugify(nameB), weight };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 40);

  return { nodes, edges };
}

/** Deterministically render the graph as Mermaid for the UI. */
export function entityGraphToMermaid(nodes: EntityNode[], edges: EntityEdge[]): string {
  if (nodes.length === 0) return '';
  const lines: string[] = ['graph LR'];
  for (const n of nodes) {
    const label = n.name.replace(/["[\]#;]/g, '');
    lines.push(`  ${n.id}["${label}"]`);
  }
  for (const e of edges) {
    if (e.weight > 0) lines.push(`  ${e.source} -->|${e.weight}| ${e.target}`);
  }
  // Style nodes by entity type for legibility.
  const types = [...new Set(nodes.map(n => n.type))];
  const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
  types.forEach((t, i) => {
    const cls = 'typ' + i;
    const color = palette[i % palette.length];
    lines.push(`  classDef ${cls} fill:${color}22,stroke:${color},color:${color}`);
    const members = nodes.filter(n => n.type === t).map(n => n.id).join(',');
    if (members) lines.push(`  class ${members} ${cls}`);
  });
  return lines.join('\n');
}
