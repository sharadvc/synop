import dns from 'node:dns/promises';

/**
 * SSRF protection for user-supplied provider base URLs.
 *
 * Custom providers let users point the server at any OpenAI-compatible
 * endpoint. On a deployed multi-user server that's a Server-Side Request
 * Forgery vector — an attacker could hit cloud metadata (169.254.169.254),
 * localhost services, or internal IPs. We block those by default.
 *
 * Local endpoints (Ollama on localhost, LAN models) can be re-enabled for a
 * self-hosted single-user install by setting ALLOW_LOCAL_PROVIDERS=true.
 */

const PRIVATE_RANGES: [string, string][] = [
  ['0.0.0.0', '0.255.255.255'],
  ['10.0.0.0', '10.255.255.255'],
  ['100.64.0.0', '100.127.255.255'],
  ['127.0.0.0', '127.255.255.255'],
  ['169.254.0.0', '169.254.255.255'],
  ['172.16.0.0', '172.31.255.255'],
  ['192.168.0.0', '192.168.255.255'],
];

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p))) return false;
  const n = ipToInt(ip);
  return PRIVATE_RANGES.some(([lo, hi]) => n >= ipToInt(lo) && n <= ipToInt(hi));
}

/** Block cloud metadata + known bad hostnames even when DNS resolves elsewhere. */
const BLOCKED_HOSTNAMES = new Set([
  '169.254.169.254',
  '100.100.100.200',
  'metadata.google.internal',
  'metadata',
  'instance-data',
  'instance-data.ec2.internal',
]);

export async function isSafeProviderBaseUrl(baseUrl: string): Promise<boolean> {
  if (process.env.ALLOW_LOCAL_PROVIDERS === 'true') {
    // Explicit opt-in for self-hosters running local models.
    try { const u = new URL(baseUrl); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  }

  let u: URL;
  try { u = new URL(baseUrl); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;

  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host === '::1' || host === '::' || host === '0:0:0:0:0:0:0:1') return false;

  // Literal IPv4 addresses → check ranges directly.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return !isPrivateIpv4(host);

  // Hostnames → resolve and check every address (also catches DNS rebinding).
  try {
    const addrs = await dns.lookup(host, { all: true });
    if (addrs.length === 0) return false;
    return addrs.every(a => !isPrivateIpv4(a.address));
  } catch {
    return false; // unresolvable → block by default
  }
}

const safeCache = new Map<string, Promise<boolean>>();

/** Cached safety check so hot LLM loops don't re-resolve DNS every call. */
export function safeProviderBaseUrl(baseUrl: string): Promise<boolean> {
  let p = safeCache.get(baseUrl);
  if (!p) {
    p = isSafeProviderBaseUrl(baseUrl);
    safeCache.set(baseUrl, p);
  }
  return p;
}
