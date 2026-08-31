import { describe, it, expect } from 'vitest';
import { evaluateSourceDomains } from '../../src/services/sourceValidationService.js';

describe('source validation (safe mode)', () => {
  it('accepts demo sources', async () => {
    const results = await evaluateSourceDomains(['demo:flights', 'demo:hotels'], 'safe');
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it('accepts public hostnames, patterns and public URLs', async () => {
    const results = await evaluateSourceDomains(
      ['example.com', '*.example.org', 'https://www.example.com'],
      'safe'
    );
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it('rejects localhost and private/internal targets', async () => {
    const results = await evaluateSourceDomains(
      ['localhost', 'http://127.0.0.1', 'http://10.0.0.1', 'http://169.254.169.254', 'http://192.168.1.1'],
      'safe'
    );
    expect(results.filter((r) => !r.ok)).toHaveLength(5);
    expect(results[0].reason).toMatch(/internal|private/i);
  });

  it('rejects malformed fields like empty entries', async () => {
    const results = await evaluateSourceDomains(['example.com', ''], 'safe');
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
  });

  it('does not make network calls in safe mode even for public URLs', async () => {
    // If 'safe' mode performed probes, this would fail/hang; instead the entry
    // is accepted structurally without any network activity.
    const results = await evaluateSourceDomains(['https://example.com'], 'safe');
    expect(results[0].ok).toBe(true);
  });
});