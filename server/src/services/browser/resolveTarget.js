import { env } from '../../config/env.js';
import { DemoPage } from '../../models/DemoPage.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Resolve a task target into { url, fields, source }.
 *  - target "demo:flights"  -> local demo page URL (+ its field list)
 *  - otherwise              -> an absolute external URL
 */

// ---------------------------------------------------------------------------
// SSRF protection
// ---------------------------------------------------------------------------
// IPv4 ranges that must never be navigated to from the server. Covers
// loopback, private, link-local, CGNAT, documentation/test-net, multicast
// and reserved space (includes 0.0.0.0, 127.0.0.0/8, 169.254.169.254).
const IPV4_BLOCK_RANGES = [
  // [start, end] inclusive, as unsigned 32-bit integers
  [0x00000000, 0x00ffffff], // 0.0.0.0/8        – "this network"
  [0x0a000000, 0x0affffff], // 10.0.0.0/8       – private
  [0x64400000, 0x647fffff], // 100.64.0.0/10    – CGNAT
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8      – loopback
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16   – link-local
  [0xac100000, 0xac1fffff], // 172.16.0.0/12    – private
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16   – private
  [0xc0000000, 0xc00000ff], // 192.0.0.0/24     – IETF protocol assignments
  [0xc0000200, 0xc00002ff], // 192.0.2.0/24     – TEST-NET-1
  [0xc6120000, 0xc613ffff], // 198.18.0.0/15    – benchmarking
  [0xc6336400, 0xc63364ff], // 198.51.100.0/24  – TEST-NET-2
  [0xcb007100, 0xcb0071ff], // 203.0.113.0/24   – TEST-NET-3
  [0xe0000000, 0xefffffff], // 224.0.0.0/4      – multicast
  [0xf0000000, 0xffffffff], // 240.0.0.0/4      – reserved
];

function ipv4ToInt(host) {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    if (Number(part) > 255) return null;
  }
  return (
    ((Number(parts[0]) << 24) >>> 0) +
    (Number(parts[1]) << 16) +
    (Number(parts[2]) << 8) +
    Number(parts[3])
  );
}

function isBlockedIpv4(host) {
  const value = ipv4ToInt(host);
  if (value === null) return false;
  return IPV4_BLOCK_RANGES.some(([min, max]) => value >= min && value <= max);
}

function isBlockedIpv6(host) {
  // IPv6 literals arrive bracketed, e.g. "[::1]".
  const literal = host.startsWith('[') ? host.slice(1, -1) : host;
  if (!literal || literal === '::' || literal === '::1') return true; // unspecified + loopback
  const lower = literal.toLowerCase();
  if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
  if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique-local
  if (/^ff/.test(lower)) return true; // ff00::/8 multicast
  return false;
}

const INTERNAL_HOSTNAME_RES = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.lan$/i,
  /\.home$/i,
];

/**
 * Check a raw URL (external navigation target) for SSRF hazards.
 * Only http:/https: with public (non-internal) hosts are allowed.
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkExternalUrlTarget(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { allowed: false, reason: 'URL is missing' };
  }
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { allowed: false, reason: 'URL is malformed' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { allowed: false, reason: `Protocol "${url.protocol}" is not allowed` };
  }
  const host = url.hostname.toLowerCase();
  if (INTERNAL_HOSTNAME_RES.some((re) => re.test(host))) {
    return { allowed: false, reason: 'Internal hostnames are not allowed' };
  }
  if (host.includes(':') || host.startsWith('[')) {
    return isBlockedIpv6(host)
      ? { allowed: false, reason: 'Internal IPv6 ranges are not allowed' }
      : { allowed: true };
  }
  if (isBlockedIpv4(host)) {
    return { allowed: false, reason: 'Private/internal IP addresses are not allowed' };
  }
  return { allowed: true };
}

/**
 * Check a bare hostname / wildcard pattern (e.g. "example.com",
 * "*.example.com", "localhost", "10.0.0.1") used by Source governance.
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkBareHost(hostRaw) {
  const host = String(hostRaw || '').trim().toLowerCase().replace(/^(\*\.|\.)/, '');
  if (!host) return { allowed: false, reason: 'Host is empty' };
  if (host.startsWith('[') || host.includes(':')) {
    return checkExternalUrlTarget(`http://${host}`);
  }
  if (isBlockedIpv4(host)) {
    return { allowed: false, reason: 'Private/internal IP addresses are not allowed' };
  }
  if (INTERNAL_HOSTNAME_RES.some((re) => re.test(host))) {
    return { allowed: false, reason: 'Internal hostnames are not allowed' };
  }
  if (!host.includes('.')) {
    return { allowed: false, reason: 'Hostname is not a fully-qualified public hostname' };
  }
  return { allowed: true };
}

/** Throw an ApiError(400) when an external URL fails the SSRF guard. */
export function assertSafeExternalUrl(rawUrl) {
  const result = checkExternalUrlTarget(rawUrl);
  if (!result.allowed) {
    throw new ApiError(400, `External target rejected (SSRF guard): ${result.reason}`);
  }
}

/**
 * The AI-generated plan must never silently change the task's trusted target.
 * If a navigate step carries a URL that differs from the resolved target URL,
 * the plan is rejected instead of executed.
 */
export function assertNavigableTarget(plan, resolution) {
  const navigateStep = Array.isArray(plan) ? plan.find((s) => s && s.action === 'navigate') : null;
  if (navigateStep && typeof navigateStep.url === 'string' && navigateStep.url && navigateStep.url !== resolution.url) {
    throw new ApiError(400, 'Generated plan attempted to change the task target');
  }
}

export async function resolveTarget(target, fieldsOverride = []) {
  if (typeof target !== 'string') {
    throw new Error('Task target must be a string');
  }

  const demoMatch = target.match(/^demo:(.+)$/i);
  if (demoMatch) {
    const key = demoMatch[1].toLowerCase();
    const demo = await DemoPage.findOne({ key });
    if (!demo) throw new Error(`Unknown demo page key: "${key}"`);
    return {
      url: demo.url.startsWith('http') ? demo.url : `${env.PUBLIC_BASE_URL}${demo.url}`,
      fields: fieldsOverride.length ? fieldsOverride : demo.fields,
      source: `demo:${key}`,
    };
  }

  if (!/^https?:\/\//i.test(target)) {
    throw new Error('target must be "demo:<key>" or an absolute http(s) URL');
  }
  // External targets are validated against SSRF hazards (protocol + host checks).
  assertSafeExternalUrl(target);
  return { url: target, fields: fieldsOverride, source: target };
}
