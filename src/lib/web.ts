/**
 * Keyless-first web search for the Temporal Decay feature.
 *
 * Prefers Tavily when TAVILY_API_KEY is set (clean structured JSON), and
 * falls back to DuckDuckGo's HTML endpoint so the feature works with zero
 * external keys — at the cost of less pristine snippets.
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string, maxResults = 3): Promise<SearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          search_depth: 'basic',
          max_results: maxResults,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const results: SearchResult[] = (json.results || []).map((r: any) => ({
          title: r.title || '',
          url: r.url || '',
          snippet: (r.content || '').replace(/\s+/g, ' ').slice(0, 500),
        }));
        if (results.length > 0) return results.slice(0, maxResults);
      }
    } catch (err: any) {
      console.warn('[web] Tavily search failed, using DuckDuckGo fallback:', err.message);
    }
  }

  // DuckDuckGo HTML fallback — no API key required.
  try {
    const res = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Each hit is <a class="result__a" href="...">Title</a> followed by
    // <a class="result__snippet" ...>Snippet</a>
    const results: SearchResult[] = [];
    const blockRe = /<div[^>]*class="[^"]*result[^"]*result__body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
    let block: RegExpExecArray | null;
    while ((block = blockRe.exec(html)) !== null && results.length < maxResults) {
      const chunk = block[1];
      const titleMatch = chunk.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = chunk.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      if (titleMatch) {
        const url = unescapeDdgHref(titleMatch[1]);
        if (isAdUrl(url)) continue; // skip sponsored placements
        results.push({
          title: stripTags(titleMatch[2]),
          url,
          snippet: snippetMatch ? stripTags(snippetMatch[1]).slice(0, 500) : '',
        });
      }
    }

    // Fallback simpler parser if the block regex missed anything
    if (results.length === 0) {
      const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null && results.length < maxResults) {
        const url = unescapeDdgHref(m[1]);
        if (isAdUrl(url)) continue;
        results.push({ title: stripTags(m[2]), url, snippet: '' });
      }
    }

    return results;
  } catch (err: any) {
    console.warn('[web] DuckDuckGo search failed:', err.message);
    return [];
  }
}

/** DuckDuckGo HTML results mix in Bing-powered sponsored links — skip them. */
function isAdUrl(url: string): boolean {
  return /ad_domain=|ad_provider=|bing\.com\/aclick|y\.js\?ad_/i.test(url);
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** DuckDuckGo wraps real URLs in its own redirect — unwrap when present. */
function unescapeDdgHref(href: string): string {
  const decoded = href.replace(/&amp;/g, '&');
  const m = decoded.match(/uddg=([^&]+)/);
  if (m) {
    try { return decodeURIComponent(m[1]); } catch { return decoded; }
  }
  return decoded;
}
