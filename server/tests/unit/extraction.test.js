import { describe, it, expect } from 'vitest';
import {
  normalizeFieldValue,
  validateFieldValue,
  confidenceForField,
  applySchemaToRecord,
  dedupeRecords,
  parseCurrencyToNumber,
  parseToDate,
  extractFromHtml,
} from '../../src/services/extractionService.js';
import { toStorableScreenshot } from '../../src/services/runEngine.js';
import { classifyBrowserError } from '../../src/services/browser/playwrightService.js';

describe('extraction pipeline', () => {
  it('parses currency strings to numbers', () => {
    expect(parseCurrencyToNumber('₹5,400')).toBe(5400);
    expect(parseCurrencyToNumber('$1,299.50')).toBe(1299.5);
    expect(parseCurrencyToNumber('')).toBe(null);
  });

  it('normalizes per transform + type', () => {
    expect(normalizeFieldValue('  Goa  ', { normalization: { transform: 'trim' } })).toBe('Goa');
    expect(normalizeFieldValue('goa', { normalization: { transform: 'uppercase' } })).toBe('GOA');
    expect(normalizeFieldValue('₹5,400', { type: 'number' })).toBe(5400);
    expect(parseToDate('2026-09-07')).toBeInstanceOf(Date);
  });

  it('validates required + ranges + patterns', () => {
    expect(validateFieldValue('', { name: 'price', isRequired: true })).toHaveLength(1);
    expect(validateFieldValue(-5, { name: 'price', validation: { minValue: 0 } })).toHaveLength(1);
    expect(validateFieldValue('abc', { name: 'code', validation: { pattern: '^[A-Z]{3}$' } })).toHaveLength(1);
    expect(validateFieldValue('DEL', { name: 'code', validation: { pattern: '^[A-Z]{3}$' } })).toHaveLength(0);
  });

  it('scores confidence lower for missing/invalid fields', () => {
    expect(confidenceForField(null, [], { isRequired: true })).toBeLessThan(0.5);
    expect(confidenceForField('x', [], {})).toBeGreaterThan(0.9);
    expect(confidenceForField('x', ['bad'], {})).toBeLessThan(0.9);
  });

  it('applies schema to record with meta + warnings', () => {
    const fields = [
      { name: 'price_value', type: 'number', isRequired: true, validation: { minValue: 0 }, normalization: { transform: 'parseFloat' } },
      { name: 'hotel_name', type: 'string', isRequired: true, normalization: { transform: 'trim' } },
    ];
    const { data, fieldMeta, confidence, warnings } = applySchemaToRecord({ price_value: '₹5,400', hotel_name: '  Taj  ' }, fields);
    expect(data.price_value).toBe(5400);
    expect(data.hotel_name).toBe('Taj');
    expect(fieldMeta.price_value.confidence).toBeGreaterThan(0.9);
    expect(confidence).toBeGreaterThan(0.9);
    expect(warnings).toHaveLength(0);
  });

  it('dedupes exact-duplicate records', () => {
    expect(dedupeRecords([{ a: 1 }, { a: 1 }, { a: 2 }])).toHaveLength(2);
  });

  it('extracts from raw HTML with schema', async () => {
    const html = '<html><body><div class="price">₹5,400</div><div class="name">Taj</div></body></html>';
    const fields = [
      { name: 'price_value', type: 'number', selector: '.price', isRequired: true, normalization: { transform: 'parseFloat' } },
      { name: 'hotel_name', type: 'string', selector: '.name', isRequired: true, normalization: { transform: 'trim' } },
    ];
    const { data, confidence } = await extractFromHtml(html, fields);
    expect(data.price_value).toBe(5400);
    expect(data.hotel_name).toBe('Taj');
    expect(confidence).toBeGreaterThan(0.8);
  });

  it('caps oversize screenshots', async () => {
    const big = Buffer.alloc(500000, 1);
    const { env } = await import('../../src/config/env.js');
    const capped = toStorableScreenshot(big);
    expect(capped.truncated).toBe(env.SCREENSHOT_MAX_BYTES < 500000);
  });

  it('classifies browser errors', () => {
    expect(classifyBrowserError(new Error('Timeout exceeded')).code).toBe('NAV_TIMEOUT');
    expect(classifyBrowserError(new Error("Executable doesn't exist")).code).toBe('BROWSER_LAUNCH_FAILED');
  });
});
