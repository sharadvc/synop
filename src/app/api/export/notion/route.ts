import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userScope, requireUserId } from '@/lib/user';
import { wikiLinkEntities } from '@/lib/pkm';

export async function POST(req: Request) {
  try {
    const __uid = await requireUserId(req); if (!__uid) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { videoId } = await req.json();
    if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

    const apiKey = req.headers.get('x-notion-key') || process.env.NOTION_API_KEY;
    const databaseId = req.headers.get('x-notion-db') || process.env.NOTION_DATABASE_ID;

    if (!apiKey || !databaseId) {
      return NextResponse.json(
        { error: 'Notion integration not configured. Please set your Notion API Key and Database ID in Settings.' },
        { status: 500 }
      );
    }

    const summary = await db.summary.findFirst({ where: { videoId, ...(await userScope()) } });
    if (!summary) return NextResponse.json({ error: 'Summary not found' }, { status: 404 });

    const parse = (raw: string | null) => {
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    };

    const frameworks = parse(summary.frameworks) || [];
    const biasAnalysis = parse(summary.biasAnalysis) || [];
    const quotes = parse(summary.quotes) || [];
    const resources = parse(summary.resources) || [];
    const entities = parse(summary.entities) || [];
    const topicClusters = parse(summary.topicClusters) || [];
    const signalDensity = parse(summary.signalDensity);
    const freshness = parse(summary.freshness) || [];

    const linkText = (text: string) => ({ type: 'text' as const, text: { content: text } });
    const heading = (content: string) => ({
      object: 'block' as const,
      type: 'heading_2' as const,
      heading_2: { rich_text: [linkText(content)] },
    });
    const bullets = (items: string[]) => items.map(item => ({
      object: 'block' as const,
      type: 'bulleted_list_item' as const,
      bulleted_list_item: { rich_text: [linkText(item)] },
    }));

    const body: any[] = [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [linkText(`Channel: ${summary.channel} | URL: https://youtube.com/watch?v=${videoId}`)] },
      },
      { object: 'block', type: 'divider', divider: {} },
      heading('Executive Summary'),
      { object: 'block', type: 'paragraph', paragraph: { rich_text: [linkText(summary.executiveSummary)] } },
    ];

    // Signal Density
    if (signalDensity && signalDensity.density_score != null) {
      body.push(heading(`Signal Density: ${signalDensity.density_score}%`));
      body.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [linkText(
            `${signalDensity.value_minutes ?? 0} minutes of real value extracted from a ${signalDensity.total_minutes ?? '?'}-minute video.` +
            (signalDensity.removed_segments?.length
              ? ` Removed: ${signalDensity.removed_segments.map((s: any) => `${s.type} (${s.approx_minutes} min)`).join(', ')}.`
              : '')
          )],
        },
      });
    }

    // Semantic Topic Clusters
    if (topicClusters.length > 0) {
      body.push(heading('Topics'));
      for (const t of topicClusters) {
        body.push({
          object: 'block', type: 'heading_3', heading_3: { rich_text: [linkText(t.topic || '')] },
        });
        body.push({
          object: 'block', type: 'paragraph',
          paragraph: { rich_text: [linkText(wikiLinkEntities(t.summary || '', entities))] },
        });
      }
    }

    // Frameworks
    if (frameworks.length > 0) {
      body.push(heading('Frameworks'));
      body.push(...bullets(frameworks.map((f: any) => `${f.name}: ${f.description}`)));
    }

    // Bias & Critique
    if (biasAnalysis.length > 0) {
      body.push(heading('Bias & Critique'));
      body.push(...bullets(biasAnalysis));
    }

    // Quotes
    if (quotes.length > 0) {
      body.push(heading('Quotes'));
      body.push(...quotes.map((q: string) => ({
        object: 'block' as const,
        type: 'quote' as const,
        quote: { rich_text: [linkText(q)] },
      })));
    }

    // Entities — [[Wiki-Links]] injected so they connect back to the PKM graph
    if (entities.length > 0) {
      body.push(heading('Entities'));
      body.push(...bullets(entities.map((e: any) => `[[${e.name}]] (${e.type || 'Entity'})`)));
    }

    // Resources
    if (resources.length > 0) {
      body.push(heading('Resources'));
      body.push(...bullets(resources));
    }

    // Freshness Check
    if (freshness.length > 0) {
      body.push(heading('Freshness Check'));
      body.push(...bullets(freshness.map((f: any) => {
        const badge =
          f.status === 'DEBUNKED_OUTDATED' ? '🔴' :
          f.status === 'CONTEXT_CHANGED' ? '🟡' : '🟢';
        return `${badge} ${f.claim} — ${f.note}`;
      })));
    }

    body.push(
      { object: 'block', type: 'divider', divider: {} },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [linkText(`Verdict: ${summary.verdict}`)] },
      },
    );

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{ type: 'text', text: { content: summary.title } }],
          }
        },
        children: body,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Notion API error:', err);
      return NextResponse.json({ error: `Notion API error: ${err.substring(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, pageUrl: data.url });
  } catch (error: any) {
    console.error('Export to Notion error:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
