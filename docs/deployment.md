# Deployment

## Recommended: Vercel (frontend) + Render (backend) + Atlas (DB)
1. Push to GitHub.
2. Vercel → New → repo root. Uses root `vercel.json` (builds `client/`, outputs `client/dist`).
3. Set in Vercel env: `VITE_API_BASE_URL=https://<backend>.onrender.com/api`, redeploy (Vite embeds at build time).
4. Render → New Web Service → repo. Uses `render.yaml`: build installs server workspace + Playwright chromium; start `npm run start --workspace server` (needs root `package.json` workspaces).
5. Set in Render env: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN=https://<frontend>.vercel.app`, `DEMO_MODE=true`, `GEMINI_API_KEY` (optional), `COMPLETION_WEBHOOK_URL` (optional).
6. Verify `GET /health`, then login → Tasks → Run now.

## Docker (backend)
`docker build -f server/Dockerfile -t mmt-webops . && docker run -p 5000:5000 --env-file server/.env mmt-webops`

## Local
`cp server/.env.example server/.env` → set `AUTO_MONGODB_MEMORY=true` for zero-setup (falls back to in-memory if Atlas unreachable) → `npm run install:all` → `npx --workspace server playwright install chromium` → `npm run dev` (root runs both) or `npm run dev:server` / `dev:client`.

## Demo flow
Tasks → create target `demo:flights` → Plan → Approve (manager) → RunDetail shows snapshot + changes → run again to see diff → Insights → Exports (`/api/exports/runs/:id?format=csv`).
