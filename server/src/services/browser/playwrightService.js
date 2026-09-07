import { chromium } from 'playwright';
import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Playwright wrapper. Each call gets a fresh browser context so runs are
 * isolated. Handles headless mode and an optional custom executable path.
 *
 * Error taxonomy (err.code): BROWSER_LAUNCH_FAILED, NAV_TIMEOUT, NAV_BLOCKED,
 * PAGE_STRUCTURE_CHANGED, EXTRACTION_FAILED, BROWSER_UNKNOWN.
 */
export function classifyBrowserError(err) {
  const msg = String(err?.message || err || '');
  if (/Executable doesn't exist|browserType\.launch|Failed to launch/i.test(msg)) {
    return { code: 'BROWSER_LAUNCH_FAILED', retryable: false, statusCode: 500 };
  }
  if (/Timeout|TIMEDOUT|waiting for|exceeded/i.test(msg)) {
    return { code: 'NAV_TIMEOUT', retryable: true, statusCode: 504 };
  }
  if (/net::|ERR_|blocked|denied|403|401|forbidden|unauthorized/i.test(msg)) {
    return { code: 'NAV_BLOCKED', retryable: false, statusCode: 502 };
  }
  if (/Target closed|Session closed|crash/i.test(msg)) {
    return { code: 'BROWSER_UNKNOWN', retryable: true, statusCode: 500 };
  }
  return { code: 'BROWSER_UNKNOWN', retryable: true, statusCode: 500 };
}

export async function withBrowser(fn, { retries = env.BROWSER_RETRIES } = {}) {
  const launchOptions = { headless: env.BROWSER_HEADLESS };
  if (env.BROWSER_EXECUTABLE_PATH) launchOptions.executablePath = env.BROWSER_EXECUTABLE_PATH;

  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let browser;
    try {
      logger.info({ headless: env.BROWSER_HEADLESS, attempt }, 'Launching browser');
      browser = await chromium.launch(launchOptions);
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      // Dismiss simple blocking popups best-effort so runs fail visibly less.
      page.on('dialog', (d) => d.dismiss().catch(() => {}));
      const result = await fn(page, { attempt });
      await context.close();
      return result;
    } catch (err) {
      lastErr = err;
      const { code, retryable } = classifyBrowserError(err);
      logger.error({ err: err.message, code, attempt }, 'Browser automation failed');
      if (/Executable doesn't exist|browserType\.launch/.test(err.message)) {
        throw new ApiError(
          500,
          'Playwright Chromium is not installed. Run `npx playwright install chromium` ' +
            '(add `--with-deps` on Linux/CI). Then try again.',
          { code: 'BROWSER_LAUNCH_FAILED', original: err.message }
        );
      }
      if (!retryable || attempt >= retries) {
        const apiErr = new ApiError(code === 'NAV_BLOCKED' ? 502 : 500, err.message);
        apiErr.code = code;
        throw apiErr;
      }
      // Exponential backoff before retry.
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    } finally {
      if (typeof browser !== 'undefined' && browser) {
        await browser.close().catch(() => {});
      }
    }
  }
  throw lastErr;
}

export async function gotoPage(page, url, { timeout = env.BROWSER_TIMEOUT_MS } = {}) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (err) {
    const { code } = classifyBrowserError(err);
    const apiErr = new ApiError(code === 'NAV_BLOCKED' ? 502 : 504, `Navigation failed for ${url}: ${err.message}`);
    apiErr.code = code;
    throw apiErr;
  }
}

/** Close cookie/pop-up overlays best-effort using common selectors. */
export async function dismissOverlays(page) {
  const selectors = [
    '[aria-label="Close"]',
    '[aria-label="Dismiss"]',
    'button:has-text("Accept")',
    'button:has-text("Got it")',
    'button:has-text("Close")',
    '.modal-close',
    '.popup-close',
  ];
  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 800 })) await el.click({ timeout: 1500 }).catch(() => {});
    } catch {
      // best-effort only
    }
  }
}

export async function takeScreenshot(page, { quality = 60 } = {}) {
  try {
    return await page.screenshot({ type: 'jpeg', quality });
  } catch {
    return null;
  }
}

/** Non-destructive check whether a Chromium binary is available (for System Health). */
export function isBrowserAvailable() {
  try {
    // Resolves the executable path without launching a browser.
    const p = chromium.executablePath();
    return Boolean(p);
  } catch {
    return false;
  }
}

export default { withBrowser, gotoPage, dismissOverlays, takeScreenshot, isBrowserAvailable, classifyBrowserError };
