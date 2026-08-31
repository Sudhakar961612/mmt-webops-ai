import crypto from 'crypto';

/**
 * Pure helpers for the extraction & snapshot pipeline.
 */

/**
 * Compute a stable content hash from extracted data (used to skip identical runs).
 */
export function contentHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data || {})).digest('hex');
}

/**
 * Read a JSON blob from the demo page's embedded <script type="application/json">.
 * @param {import('playwright').Page} page
 * @param {string} id - element id of the embedded data (default '__DATA__')
 */
export async function readEmbeddedJson(page, id = '__DATA__') {
  const raw = await page
    .locator(`script[id="${id}"]`)
    .textContent()
    .catch(() => null);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed?.data ?? parsed ?? {};
  } catch {
    return {};
  }
}

/**
 * Generic selector-based extraction for arbitrary pages.
 * @param {import('playwright').Page} page
 * @param {Object} extractors - map of field -> CSS selector
 */
export async function extractBySelectors(page, extractors = {}) {
  const out = {};
  for (const [field, selector] of Object.entries(extractors)) {
    try {
      const text = await page.locator(selector).first().innerText();
      out[field] = text?.trim() ?? '';
    } catch {
      out[field] = '';
    }
  }
  return out;
}

export default { contentHash, readEmbeddedJson, extractBySelectors };
