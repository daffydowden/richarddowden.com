import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('home', () => {
  test('loads with accessible name and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (msg) => {
      // Filter out the harmless WebGL "GPU stall due to ReadPixels"
      // performance warning that headless Chromium emits.
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Richard Dowden');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('axe-core a11y scan finds no violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('canvas is the visible artifact and is aria-hidden', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas#canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  test('reduced-motion: canvas renders T=0, no fallback image injected', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    // Canvas is still the render surface in reduced-motion mode (renders
    // the T=0 frame once and exits). No <img class="fallback"> is created;
    // the noscript block is parsed by JS-disabled clients, not us.
    await expect(page.locator('canvas#canvas')).toBeVisible();
    await expect(page.locator('img.fallback')).toHaveCount(0);
    await ctx.close();
  });

  test('uses only field + mark colors, no #000 or #fff', async ({ page }) => {
    await page.goto('/');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const fg = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(bg).not.toBe('rgb(0, 0, 0)');
    expect(bg).not.toBe('rgb(255, 255, 255)');
    expect(fg).not.toBe('rgb(0, 0, 0)');
    expect(fg).not.toBe('rgb(255, 255, 255)');
  });

  test('serves required static assets', async ({ request }) => {
    // Direct HEAD/GET checks: og.png is referenced from <noscript> /
    // <meta property="og:image">, neither of which the JS-enabled page
    // requests, so we fetch them directly. Anton WOFF2 IS requested by
    // styles.css's @font-face, but we still fetch directly for clarity.
    const font = await request.head('/fonts/anton-latin.woff2');
    expect(font.status()).toBe(200);
    const og = await request.head('/og.png');
    expect(og.status()).toBe(200);
    const favicon = await request.head('/favicon.svg');
    expect(favicon.status()).toBe(200);
  });
});
