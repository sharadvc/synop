import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
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

    const summary = await db.summary.findFirst({ where: { videoId } });
    if (!summary) return NextResponse.json({ error: 'Summary not found' }, { status: 404 });

    const keyInsights = JSON.parse(summary.keyInsights || '[]');
    const actionItems = JSON.parse(summary.actionItems || '[]');
    const quotes = JSON.parse(summary.quotes || '[]');
    const timestamps = JSON.parse(summary.timestamps || '[]');

    const body = [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: `Channel: ${summary.channel} | URL: https://youtube.com/watch?v=${videoId}` } }] },
      },
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: 'Executive Summary' } }] },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: summary.executiveSummary } }] },
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: 'Key Insights' } }] },
      },
      ...keyInsights.map((insight: string) => ({
        object: 'block' as const,
        type: 'bulleted_list_item' as const,
        bulleted_list_item: { rich_text: [{ type: 'text' as const, text: { content: insight } }] },
      })),
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: 'Action Items' } }] },
      },
      ...actionItems.map((item: string) => ({
        object: 'block' as const,
        type: 'to_do' as const,
        to_do: { rich_text: [{ type: 'text' as const, text: { content: item } }], checked: false },
      })),
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: 'Quotes' } }] },
      },
      ...quotes.map((quote: string) => ({
        object: 'block' as const,
        type: 'quote' as const,
        quote: { rich_text: [{ type: 'text' as const, text: { content: quote } }] },
      })),
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: 'Timestamps' } }] },
      },
      ...timestamps.map((ts: { time: string; topic: string; details: string }) => ({
        object: 'block' as const,
        type: 'numbered_list_item' as const,
        numbered_list_item: {
          rich_text: [
            { type: 'text' as const, text: { content: `[${ts.time}] ${ts.topic} — ${ts.details}` } },
          ],
        },
      })),
      {
        object: 'block',
        type: 'divider',
        divider: {},
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: `Verdict: ${summary.verdict}` } },
          ],
        },
      },
    ];

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
