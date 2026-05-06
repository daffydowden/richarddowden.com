/**
 * Generate /public/og.png — a 1200x630 frozen render of the canvas at T=0.
 *
 * The same artifact serves three roles:
 *   1. OpenGraph social share image (linked in index.html meta).
 *   2. <noscript> fallback for visitors with JavaScript disabled.
 *   3. WebGL-unavailable fallback (main.ts injects <img class="fallback">).
 *
 * Requires the dev server to be running locally. From repo root:
 *   npm run dev      (in one terminal)
 *   npm run generate:og   (in another)
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const port = process.env.PORT ?? '5173';

async function main() {
  await mkdir(join(root, 'public'), { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
  // Wait for the canvas to draw at least once. T=0 reduced-motion path
  // renders synchronously in main.ts after document.fonts.ready, so a
  // short settle is plenty.
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(root, 'public', 'og.png'),
    type: 'png',
    omitBackground: false,
    fullPage: false,
  });
  await browser.close();
  console.log(`Wrote ${join(root, 'public', 'og.png')} (1200x630)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
