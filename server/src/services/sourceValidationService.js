import { checkExternalUrlTarget, checkBareHost } from './browser/resolveTarget.js';

/**
 * Safe source availability validation.
 *
 * Modes (a nullable actual connectivity probe is NOT performed by default so
 * the server can never be co-opted as an internal-network scanner):
 *  - 'safe' (default): structural + SSRF checks only. No outbound requests.
 *    This does not falsely report success — internal/private host entries are
 *    marked inactive with an explicit reason.
 *  - 'full': additionally runs a bounded HTTP probe (5s timeout, no redirects)
 *    for explicitly-listed external URLs.
 *
 * `demo:` sources always validate as active (demo architecture is trusted).
 */
export async function evaluateSourceDomains(domains, mode = 'safe') {
  const list = Array.isArray(domains) ? domains : [];
  const results = [];

  for (const raw of list) {
    const domain = String(raw || '').trim();
    if (!domain) {
      results.push({ domain: '', ok: false, reason: 'Empty domain entry' });
      continue;
    }

    // demo: sources are always valid in this architecture.
    if (/^demo:/i.test(domain)) {
      results.push({ domain, ok: true, reason: 'Demo source' });
      continue;
    }

    // Full URL entries.
    if (/^https?:\/\//i.test(domain)) {
      const check = checkExternalUrlTarget(domain);
      if (!check.allowed) {
        results.push({ domain, ok: false, reason: check.reason });
        continue;
      }
      if (mode === 'full') {
        const probe = await probeExternalUrl(domain);
        results.push({ domain, ...probe });
        continue;
      }
      results.push({ domain, ok: true, reason: 'Public HTTPS URL (safe mode)' });
      continue;
    }

    // Bare hostname / wildcard pattern (governance entries, e.g. example.com,
    // *.example.com). Structural + SSRF checks only.
    const check = checkBareHost(domain);
    results.push({ domain, ok: check.allowed, reason: check.allowed ? 'Public hostname pattern' : check.reason });
  }

  return results;
}

/** Bounded (5s) HTTP probe used only in 'full' mode against public URLs. */
async function probeExternalUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    });
    // 4xx/5xx still prove reachability; only <500 2xx-3xx count as healthy.
    return { ok: response.status < 500 && response.status >= 200, reason: `HTTP ${response.status}` };
  } catch {
    return { ok: false, reason: 'Unreachable (timeout/network error)' };
  } finally {
    clearTimeout(timer);
  }
}

export default evaluateSourceDomains;