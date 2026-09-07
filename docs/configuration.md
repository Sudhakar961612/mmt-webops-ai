# Configuration

| Var | Default | Purpose |
|---|---|---|
| PORT | 5000 | API listen port |
| MONGODB_URI | mongodb://127.0.0.1:27017/mmt-webops-ai | Atlas/local URI; empty + `AUTO_MONGODB_MEMORY=true` → in-memory |
| AUTO_MONGODB_MEMORY | false | Zero-setup dev + fallback when primary URI fails |
| CLIENT_ORIGIN | http://localhost:5173,https://mmt-webops-ai.vercel.app | CORS allowlist (comma-separated) |
| JWT_SECRET / JWT_EXPIRES_IN | — / 7d | Auth signing |
| DEMO_MODE | true | Serve/use local demo pages |
| PUBLIC_BASE_URL | http://localhost:5000 | Demo URL base |
| BROWSER_HEADLESS | true | Headless chromium |
| BROWSER_EXECUTABLE_PATH | — | Custom chromium path |
| BROWSER_TIMEOUT_MS | 20000 | Navigation timeout |
| BROWSER_RETRIES | 2 | Browser retry count |
| SCREENSHOT_MAX_BYTES | 400000 | Screenshot cap in MongoDB |
| COMPLETION_WEBHOOK_URL | — | Slack-compatible POST on completion |
| ENABLE_SCHEDULER | true | node-cron scheduler |
| GEMINI_API_KEY / GEMINI_MODEL / GEMINI_TEMPERATURE | — / gemma-4-26b-a4b-it / 0.2 | Optional AI; empty → deterministic fallback |
| LOG_LEVEL | info | pino level |
