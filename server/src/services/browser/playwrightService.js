import { chromium } from 'playwright';
import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Playwright wrapper. Each call gets a fresh browser context so runs are
 * isolated. Handles headless mode and an optional custom executable path.
 */
export async function withBrowser(fn) {
  const launchOptions = { headless: env.BROWSER_HEADLESS };
  if (env.BROWSER_EXECUTABLE_PATH) launchOptions.executablePath = env.BROWSER_EXECUTABLE_PATH;

  let browser;
  try {
    logger.info({ headless: env.BROWSER_HEADLESS }, 'Launching browser');
    browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const result = await fn(page);
    await context.close();
    return result;
  } catch (err) {
    logger.error({ err: err.message }, 'Browser automation failed');
    // Give a helpful message about installing browsers.
    if (/Executable doesn't exist|browserType\.launch/.test(err.message)) {
      throw new Error(
        'Playwright Chromium is not installed. Run `npx playwright install chromium` ' +
          '(add `--with-deps` on Linux/CI). Then try again. Original error: ' +
          err.message
      );
    }
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export async function gotoPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
}

export async function takeScreenshot(page) {
  try {
    return await page.screenshot({ type: 'jpeg', quality: 60 });
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

export default { withBrowser, gotoPage, takeScreenshot, isBrowserAvailable };
