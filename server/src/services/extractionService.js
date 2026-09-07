import crypto from 'crypto';

/**
 * Extraction & normalization pipeline.
 *
 * Supports two modes:
 *  1. Legacy selector map: { field: '#selector' } -> { field: string }
 *  2. Schema-driven: ExtractionSchema document with typed fields, validation,
 *     normalization, repeating selectors, confidence scoring.
 */

/** Compute a stable content hash from extracted data (used to skip identical runs). */
export function contentHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data || {})).digest('hex');
}

/** Read a JSON blob from the demo page's embedded <script type="application/json">. */
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

/** Generic selector-based extraction for arbitrary pages. */
export async function extractBySelectors(page, extractors = {}) {
  const out = {};
  for (const [field, selector] of Object.entries(extractors)) {
    try {
      if (!selector || typeof selector !== 'string') {
        out[field] = '';
        continue;
      }
      const text = await page.locator(selector).first().innerText();
      out[field] = text?.trim() ?? '';
    } catch {
      out[field] = '';
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Normalization / validation / confidence (pure, testable, reused by runEngine
// and by POST /api/schemas/:id/test + POST /api/extract)
// ---------------------------------------------------------------------------

export function parseCurrencyToNumber(raw) {
  if (typeof raw === 'number') return raw;
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

export function parseToDate(raw) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  // Accept ISO + common D/M/Y variants before falling back to Date.parse.
  const dmY = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmY) {
    const [, a, b, c] = dmY;
    const year = c.length === 2 ? 2000 + Number(c) : Number(c);
    const d = new Date(year, Number(b) - 1, Number(a));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

export function parseToBoolean(raw) {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'available', 'in stock', 'open'].includes(s)) return true;
  if (['false', 'no', 'n', '0', 'unavailable', 'sold out', 'closed'].includes(s)) return false;
  return null;
}

/** Apply a schema field's normalization transform. Returns { value } . */
export function normalizeFieldValue(raw, field = {}) {
  const transform = field?.normalization?.transform || 'trim';
  let value = typeof raw === 'string' ? raw : raw;
  if (typeof value === 'string') {
    if (transform === 'trim' || transform === 'none') value = value.trim();
    else if (transform === 'uppercase') value = value.trim().toUpperCase();
    else if (transform === 'lowercase') value = value.trim().toLowerCase();
    else if (transform === 'parseFloat') {
      const n = parseCurrencyToNumber(value);
      value = n === null ? value.trim() : n;
    } else if (transform === 'parseDate') {
      const d = parseToDate(value);
      value = d ? d.toISOString() : value.trim();
    }
  }
  // Coerce numbers that arrived as strings when the declared type is number.
  if (field?.type === 'number' && typeof value === 'string') {
    const n = parseCurrencyToNumber(value);
    if (n !== null) value = n;
  }
  if (field?.type === 'boolean' && typeof value === 'string') {
    const b = parseToBoolean(value);
    if (b !== null) value = b;
  }
  if (field?.type === 'date' && typeof value === 'string') {
    const d = parseToDate(value);
    if (d) value = d.toISOString();
  }
  return value;
}

/** Validate a normalized value against a schema field. Returns array of issue strings. */
export function validateFieldValue(value, field = {}) {
  const issues = [];
  const empty = value === null || value === undefined || value === '';
  if (empty) {
    if (field.isRequired) issues.push(`Required field "${field.name}" is missing`);
    return issues;
  }
  const v = field.validation || {};
  if (typeof value === 'string') {
    if (v.minLength && value.length < v.minLength) issues.push(`"${field.name}" shorter than minLength ${v.minLength}`);
    if (v.maxLength && value.length > v.maxLength) issues.push(`"${field.name}" longer than maxLength ${v.maxLength}`);
    if (v.pattern) {
      try {
        if (!new RegExp(v.pattern).test(value)) issues.push(`"${field.name}" does not match pattern ${v.pattern}`);
      } catch {
        issues.push(`"${field.name}" has an invalid validation pattern`);
      }
    }
  }
  if (typeof value === 'number') {
    if (v.minValue !== undefined && v.minValue !== null && value < v.minValue) issues.push(`"${field.name}" below minValue ${v.minValue}`);
    if (v.maxValue !== undefined && v.maxValue !== null && value > v.maxValue) issues.push(`"${field.name}" above maxValue ${v.maxValue}`);
  }
  if (field.type === 'number' && typeof value !== 'number') {
    issues.push(`"${field.name}" expected number, got ${typeof value}`);
  }
  if (field.type === 'boolean' && typeof value !== 'boolean') {
    issues.push(`"${field.name}" expected boolean, got ${typeof value}`);
  }
  if (field.type === 'date' && typeof value === 'string' && !parseToDate(value)) {
    issues.push(`"${field.name}" is not a parseable date`);
  }
  return issues;
}

/** Per-field confidence 0..1 from presence + validation outcome. */
export function confidenceForField(value, issues = [], field = {}) {
  const empty = value === null || value === undefined || value === '';
  if (empty) return field.isRequired ? 0.1 : 0.4;
  if (issues.length === 0) return 0.95;
  if (issues.length === 1) return 0.65;
  return 0.35;
}

/** Remove exact-duplicate records from an array (stable JSON key). */
export function dedupeRecords(records = []) {
  const seen = new Set();
  const out = [];
  for (const r of records) {
    const key = JSON.stringify(r ?? null);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

/**
 * Extract + normalize + validate a flat object against schema fields.
 * @param {Object} rawMap field -> raw string/value
 * @param {Array} fields schema field definitions
 * @returns {{ data, fieldMeta, confidence, warnings }}
 */
export function applySchemaToRecord(rawMap = {}, fields = []) {
  const data = {};
  const fieldMeta = {};
  const warnings = [];
  let confSum = 0;
  let confCount = 0;

  for (const field of fields) {
    const raw = rawMap[field.name];
    const normalized = normalizeFieldValue(raw, field);
    const issues = validateFieldValue(normalized, field);
    const confidence = confidenceForField(normalized, issues, field);
    data[field.name] = normalized ?? null;
    fieldMeta[field.name] = { confidence, issues, required: Boolean(field.isRequired), type: field.type || 'string' };
    confSum += confidence;
    confCount += 1;
    for (const issue of issues) {
      warnings.push({ field: field.name, issue, confidence });
    }
    if ((normalized === null || normalized === '' || normalized === undefined) && !field.isRequired) {
      // Low-confidence but non-blocking: keep the null so downstream diffs
      // distinguish "missing" from "" consistently.
      data[field.name] = null;
    }
  }

  const confidence = confCount ? Math.round((confSum / confCount) * 100) / 100 : 0;
  return { data, fieldMeta, confidence, warnings };
}

/**
 * Schema-driven DOM extraction using jsdom-like document OR a Playwright page.
 * For Playwright pages, pass { page, schema }; for raw HTML, use extractFromHtml().
 */
export async function extractWithSchema(page, schema) {
  const fields = schema?.fields || [];
  const rawMap = {};
  for (const field of fields) {
    try {
      if (!field.selector) {
        rawMap[field.name] = null;
        continue;
      }
      const text = await page.locator(field.selector).first().innerText();
      rawMap[field.name] = text ?? null;
    } catch {
      rawMap[field.name] = null;
    }
  }
  return applySchemaToRecord(rawMap, fields);
}

/** Extract from a raw HTML string (used by schema test endpoint + /api/extract). */
export async function extractFromHtml(html, schemaOrFields) {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM(html || '');
  const document = dom.window.document;
  const fields = Array.isArray(schemaOrFields) ? schemaOrFields : schemaOrFields?.fields || [];
  const repeatingSelector = !Array.isArray(schemaOrFields) ? schemaOrFields?.repeatingSelector : '';

  if (repeatingSelector) {
    const nodes = [...document.querySelectorAll(repeatingSelector)];
    const records = nodes.map((node) => {
      const rawMap = {};
      for (const field of fields) {
        try {
          const el = field.selector ? node.querySelector(field.selector) : null;
          rawMap[field.name] = el ? el.textContent : null;
        } catch {
          rawMap[field.name] = null;
        }
      }
      return applySchemaToRecord(rawMap, fields);
    });
    const data = dedupeRecords(records.map((r) => r.data));
    const warnings = records.flatMap((r) => r.warnings);
    const confidence = records.length
      ? Math.round((records.reduce((s, r) => s + r.confidence, 0) / records.length) * 100) / 100
      : 0;
    return { data, records: records.map((r) => ({ data: r.data, fieldMeta: r.fieldMeta })), confidence, warnings };
  }

  const rawMap = {};
  for (const field of fields) {
    try {
      const el = field.selector ? document.querySelector(field.selector) : null;
      rawMap[field.name] = el ? el.textContent : null;
    } catch {
      rawMap[field.name] = null;
    }
  }
  return applySchemaToRecord(rawMap, fields);
}

export default {
  contentHash,
  readEmbeddedJson,
  extractBySelectors,
  normalizeFieldValue,
  validateFieldValue,
  confidenceForField,
  dedupeRecords,
  applySchemaToRecord,
  extractWithSchema,
  extractFromHtml,
  parseCurrencyToNumber,
  parseToDate,
  parseToBoolean,
};
