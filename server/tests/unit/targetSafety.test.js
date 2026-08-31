import { describe, it, expect } from 'vitest';
import {
  checkExternalUrlTarget,
  checkBareHost,
  assertSafeExternalUrl,
  assertNavigableTarget,
} from '../../src/services/browser/resolveTarget.js';

describe('SSRF target validation', () => {
  it.each([
    ['http://localhost', false],
    ['http://localhost:8080/app', false],
    ['http://127.0.0.1', false],
    ['http://0.0.0.0', false],
    ['http://169.254.169.254', false],
    ['http://10.0.0.1', false],
    ['http://172.16.0.1', false],
    ['http://192.168.1.1/admin', false],
    ['http://[::1]', false],
    ['http://myhost.local', false],
    ['http://intranet.internal', false],
    ['https://www.example.com', true],
    ['http://example.com', true],
    ['https://public.example.org/path?q=1', true],
  ])('external URL "%s" is allowed=%s', (url, allowed) => {
    expect(checkExternalUrlTarget(url).allowed).toBe(allowed);
  });

  it('rejects unsupported protocols', () => {
    expect(checkExternalUrlTarget('ftp://example.com/file.txt').allowed).toBe(false);
    expect(checkExternalUrlTarget('file:///etc/passwd').allowed).toBe(false);
    expect(checkExternalUrlTarget('javascript:alert(1)').allowed).toBe(false);
    expect(checkExternalUrlTarget('gopher://localhost/_').allowed).toBe(false);
  });

  it('rejects malformed / empty URLs', () => {
    expect(checkExternalUrlTarget('not a url').allowed).toBe(false);
    expect(checkExternalUrlTarget('').allowed).toBe(false);
  });

  it('assertSafeExternalUrl throws an ApiError(400) for private targets', () => {
    let threw = false;
    try {
      assertSafeExternalUrl('http://127.0.0.1');
    } catch (err) {
      threw = true;
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('SSRF');
    }
    expect(threw).toBe(true);
  });

  it('rejects private/internal bare hosts and accepts public hostnames', () => {
    expect(checkBareHost('localhost').allowed).toBe(false);
    expect(checkBareHost('10.0.0.1').allowed).toBe(false);
    expect(checkBareHost('*.192.168.1.1').allowed).toBe(false);
    expect(checkBareHost('srv.internal').allowed).toBe(false);
    expect(checkBareHost('example.com').allowed).toBe(true);
    expect(checkBareHost('*.example.com').allowed).toBe(true);
  });
});

describe('plan target safety', () => {
  const resolution = { url: 'https://example.com/target' };

  it('allows a matching navigate URL', () => {
    const plan = [{ action: 'navigate', url: 'https://example.com/target' }];
    assertNavigableTarget(plan, resolution); // must not throw
  });

  it('allows a plan without a navigate URL or empty plan', () => {
    assertNavigableTarget([{ action: 'extract', params: {} }], resolution);
    assertNavigableTarget([], resolution);
  });

  it('rejects a navigate URL that differs from the resolved target', () => {
    const plan = [{ action: 'navigate', url: 'https://evil.example.com' }];
    let threw = false;
    try {
      assertNavigableTarget(plan, resolution);
    } catch (err) {
      threw = true;
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('attempted to change the task target');
    }
    expect(threw).toBe(true);
  });
});