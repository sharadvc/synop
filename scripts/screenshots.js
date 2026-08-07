// Generate README screenshots. Requires the dev server running (npm run dev -p 3001).
// Usage: node scripts/screenshots.js
const { chromium } = require('playwright');

const BASE = 'http://localhost:3001';
const OUT = 'public/screenshots';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  // Seed a persona so the dashboard renders in "student mode".
  await page.addInitScript(() => {
    try {
      localStorage.setItem('synop_persona', 'student');
      localStorage.setItem('synop_language', 'English');
    } catch {}
  });

  const shot = async (name) => {
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('  saved', name);
  };

  console.log('→ landing');
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await shot('landing');

  console.log('→ briefing (dashboard default)');
  await page.goto(BASE + '/dashboard', { waitUntil: 'load' });
  await page.waitForSelector('text=Your Briefing', { timeout: 15000 }).catch(() => {});
  await shot('dashboard-briefing');

  console.log('→ summaries');
  await page.getByText('Summaries', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await shot('dashboard-summaries');

  console.log('→ library');
  await page.getByText('Library', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await shot('dashboard-library');

  console.log('→ channels');
  await page.getByText('Channels', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await shot('dashboard-channels');

  console.log('→ settings');
  await page.getByText('Settings', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await shot('dashboard-settings');

  console.log('→ summary (topics)');
  await page.goto(BASE + '/summary/okSKt_C_SE8', { waitUntil: 'load' });
  await page.waitForTimeout(4500);
  await shot('summary');

  console.log('→ study mode');
  await page.getByText('Study Mode', { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await shot('study-mode');

  await browser.close();
  console.log('done');
})();
