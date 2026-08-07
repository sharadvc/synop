// Generate README screenshots. Requires the dev server running (npm run dev -p 3001).
// Usage: node scripts/screenshots.js
const { chromium } = require('playwright');

const BASE = 'http://localhost:3001';
const OUT = 'public/screenshots';

(async () => {
  const browser = await chromium.launch();

  const ctx = async (persona) => {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
    await c.addInitScript((p) => {
      try { localStorage.setItem('synop_persona', p); localStorage.setItem('synop_language', 'English'); } catch {}
    }, persona);
    return c;
  };

  const shot = async (page, name) => {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('  saved', name);
  };

  // ── Student context ────────────────────────────────────────────────
  const s = await (await ctx('student')).newPage();

  console.log('→ landing');
  await s.goto(BASE + '/', { waitUntil: 'load' });
  await shot(s, 'landing');

  console.log('→ briefing (streak)');
  await s.goto(BASE + '/dashboard', { waitUntil: 'load' });
  await s.waitForSelector('text=Your Briefing', { timeout: 15000 }).catch(() => {});
  await shot(s, 'dashboard-briefing');

  console.log('→ summaries');
  await s.getByText('Summaries', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await shot(s, 'dashboard-summaries');

  console.log('→ library');
  await s.getByText('Library', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await s.waitForTimeout(3000);
  await shot(s, 'dashboard-library');

  console.log('→ channels');
  await s.getByText('Channels', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await shot(s, 'dashboard-channels');

  console.log('→ settings');
  await s.getByText('Settings', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await shot(s, 'dashboard-settings');

  console.log('→ summary (topics)');
  await s.goto(BASE + '/summary/okSKt_C_SE8', { waitUntil: 'load' });
  await s.waitForTimeout(4500);
  await shot(s, 'summary');

  console.log('→ notebook');
  await s.getByText('Notebook', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await s.waitForTimeout(1000);
  // Generate notes if the button is present.
  const genNotes = s.getByText('Generate Notes', { exact: true });
  if (await genNotes.count()) { await genNotes.first().click(); await s.waitForTimeout(45000); }
  await shot(s, 'notebook');

  console.log('→ study mode');
  await s.getByText('Study Mode', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await shot(s, 'study-mode');

  // ── Researcher context ─────────────────────────────────────────────
  const r = await (await ctx('researcher')).newPage();
  console.log('→ research report');
  await r.goto(BASE + '/summary/okSKt_C_SE8', { waitUntil: 'load' });
  await r.waitForTimeout(4000);
  await r.getByText('Research Report', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await r.waitForTimeout(1000);
  const genReport = r.getByText('Generate Research Report', { exact: true });
  if (await genReport.count()) { await genReport.first().click(); await r.waitForTimeout(50000); }
  await shot(r, 'research-report');

  // ── Course tracker (playlist) ──────────────────────────────────────
  const p = await (await ctx('student')).newPage();
  console.log('→ course tracker');
  await p.goto(BASE + '/playlist/PL8dPuuaLjXtOAKed_MxxWBNaPno5h3Zs8', { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  await shot(p, 'course-tracker');

  await browser.close();
  console.log('done');
})();
