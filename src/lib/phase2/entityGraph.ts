/**
 * Unified knowledge graph — nodes from BOTH Semantic Topic Clusters and
 * Entities, edges from real evidence (co-occurrence + topic membership).
 *
 * - Entity nodes: things actually mentioned in the transcript (or summary).
 *   Entity↔entity edges: two entities that co-occur in a small window, weighted.
 * - Topic nodes: the semantic topic clusters. Topic↔entity edges: the entity
 *   is literally mentioned in that topic's unified summary.
 *
 * Everything is deterministic — no LLM is asked to "invent" a relationship.
 */

export interface EntityLike {
  type?: string;
  name?: string;
}

export interface TopicLike {
  topic?: string;
  summary?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  /** Number of edges touching this node. */
  degree: number;
  /** Times the entity name appears across the scanned sources (0 for topics). */
  mentions: number;
  kind: 'entity' | 'topic';
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  kind: 'cooccur' | 'membership';
}

const WINDOW = 110;
const STEP = 55;
const MAX_ENTITY_NODES = 14;
const MAX_TOPIC_NODES = 8;

function slugify(name: string): string {
  return 'n' + (name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'node');
}

function toRegex(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'giu');
}

export function analyzeEntityGraph(
  transcript: string,
  entities: EntityLike[],
  extraSources: string[] = [],
  topics: TopicLike[] = [],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
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

  // Mention counts + co-occurrence windows per source.
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

  const active = [...seen.entries()]
    .filter(([key]) => mentionCount.has(key))
    .sort((a, b) => (mentionCount.get(b[0]) || 0) - (mentionCount.get(a[0]) || 0))
    .slice(0, MAX_ENTITY_NODES);

  if (active.length === 0) return { nodes: [], edges: [] };

  const degree = new Map<string, number>();
  for (const [key, w] of edgeWeight) {
    const [a, b] = key.split('||');
    degree.set(a, (degree.get(a) || 0) + w);
    degree.set(b, (degree.get(b) || 0) + w);
  }

  const nodes: GraphNode[] = active.map(([key, ent]) => ({
    id: slugify(ent.name),
    name: ent.name,
    type: ent.type,
    degree: degree.get(key) || 0,
    mentions: mentionCount.get(key) || 0,
    kind: 'entity',
  }));
  const edges: GraphEdge[] = [...edgeWeight.entries()]
    .map(([key, weight]) => {
      const [a, b] = key.split('||');
      const nameA = seen.get(a)?.name || a;
      const nameB = seen.get(b)?.name || b;
      return { source: slugify(nameA), target: slugify(nameB), weight, kind: 'cooccur' as const };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 40);

  const byId = new Map(nodes.map(n => [n.id, n]));

  // Topic nodes + topic→entity membership edges (entity literally appears in
  // the topic's unified summary). Every topic is shown; unlinked ones are fine.
  const topicNodes: GraphNode[] = [];
  const membershipEdges: GraphEdge[] = [];
  for (const t of (Array.isArray(topics) ? topics : [])) {
    const name = (t?.topic || '').trim();
    const summary = (t?.summary || '');
    if (!name) continue;
    if (topicNodes.length >= MAX_TOPIC_NODES) break;
    const tid = 't' + name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'ttopic';
    if (byId.has(tid) || topicNodes.some(n => n.id === tid)) continue; // collision → skip
    const members = nodes.filter(en => toRegex(en.name).test(summary));
    topicNodes.push({
      id: tid,
      name,
      type: 'Topic',
      degree: members.length,
      mentions: 0,
      kind: 'topic',
    });
    for (const m of members) {
      membershipEdges.push({ source: tid, target: m.id, weight: 1, kind: 'membership' });
    }
  }

  return {
    nodes: [...nodes, ...topicNodes],
    edges: [...edges, ...membershipEdges],
  };
}

/** Deterministically render the graph as Mermaid for the UI. */
export function entityGraphToMermaid(nodes: GraphNode[], edges: GraphEdge[]): string {
  if (nodes.length === 0) return '';
  const lines: string[] = ['graph LR'];
  for (const n of nodes) {
    const label = n.name.replace(/["[\]#;]/g, '');
    if (n.kind === 'topic') lines.push(`  ${n.id}(["${label}"])`);
    else lines.push(`  ${n.id}["${label}"]`);
  }
  for (const e of edges) {
    if (e.kind === 'membership') lines.push(`  ${e.source} --- ${e.target}`);
    else lines.push(`  ${e.source} -->|${e.weight}| ${e.target}`);
  }
  // Style: topics in a distinct hue, entities by their own type.
  lines.push(`  classDef topic fill:#8b5cf622,stroke:#8b5cf6,color:#8b5cf6`);
  const topicIds = nodes.filter(n => n.kind === 'topic').map(n => n.id).join(',');
  if (topicIds) lines.push(`  class ${topicIds} topic`);

  const entityTypes = [...new Set(nodes.filter(n => n.kind === 'entity').map(n => n.type))];
  const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
  entityTypes.forEach((t, i) => {
    const cls = 'typ' + i;
    const color = palette[i % palette.length];
    lines.push(`  classDef ${cls} fill:${color}22,stroke:${color},color:${color}`);
    const members = nodes.filter(n => n.kind === 'entity' && n.type === t).map(n => n.id).join(',');
    if (members) lines.push(`  class ${members} ${cls}`);
  });
  return lines.join('\n');
}
