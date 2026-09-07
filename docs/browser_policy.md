# Browser Policy

- Allowlist via Source registry; demo targets (`demo:<key>`) always safe.
- SSRF guard in `resolveTarget.js`: only http/https, blocks loopback/private/link-local/CGNAT/test-net/multicast/reserved IPv4, IPv6 loopback/link-local/unique-local/multicast, and internal hostnames (`localhost`, `*.local`, `*.internal`, `*.lan`, `*.home`).
- AI plans cannot change the task target (`assertNavigableTarget`); violations reject with 400.
- Fresh browser context per run, headless by default, 1280×900, `domcontentloaded` + configurable `BROWSER_TIMEOUT_MS` (default 20s), retries `BROWSER_RETRIES` (default 2, exponential backoff).
- Overlays dismissed best-effort (`dismissOverlays`); dialogs auto-dismissed; failures classified (`NAV_TIMEOUT`, `NAV_BLOCKED`, ...) and stored as `run.errorCode`.
- Screenshots capped by `SCREENSHOT_MAX_BYTES` (default 400KB); oversize ones dropped with `meta.screenshotTruncated=true`.
- Rate limits: global `/api` 500/15min; per-source `requestsPerHour`/`concurrent` in Source model; scheduler never stacks `AWAITING_APPROVAL` runs.
- No credential capture in browser; secrets stay in backend env; screenshots carry no cookies; retention per Source `compliance.retentionDays`.
