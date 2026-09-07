# Architecture — Autonomous Web Operations Agent

## Job lifecycle
`DRAFT → PLANNED → AWAITING_APPROVAL → APPROVED → RUNNING → EXTRACTING → COMPARING → REASONING → SUCCEEDED|FAILED`, plus `REJECTED`, `PAUSED`, `COMPLETED`.

- Task intake: `POST /api/tasks` (`server/src/controllers/taskController.js`).
- Planning: `planTask()` → `generatePlan()` (Gemini or deterministic fallback) → `reviewPlan()` score.
- Approval gate: analysts always land in `AWAITING_APPROVAL`; `POST /api/tasks/run/:runId/approve` (manager/admin) or `POST /api/runs/:id/reject`.
- Execution: `executeRun()` in `server/src/services/runEngine.js` — resolve target (SSRF-guarded) → Playwright `goto` → `dismissOverlays` → screenshot (capped) → extract → snapshot → diff → reason → notify.
- Extraction: legacy selector map, embedded demo JSON, or `extractionSchema` (typed fields, validation, normalization, confidence). See `server/src/services/extractionService.js`.
- Comparison: `diffSnapshots()` → `Change` docs with `ADDED|REMOVED|MODIFIED` + `low|medium|high` severity.
- Reasoning: `generateInsight()` (Gemini text or rule fallback with price deltas).
- Completion: `Insight` + audit + optional `COMPLETION_WEBHOOK_URL` POST + `GET /api/exports/runs/:id?format=json|csv`.

## Data models
Task (incl. `extractionSchema` ref), ExecutionRun (incl. `errorCode`), Snapshot (`extractedData`, capped `screenshot`, `meta.fieldMeta/extractionConfidence`), Change, Insight, TaskTemplate, Source, ExtractionSchema, User, Feedback, AuditLog, DemoPage.

## Security
JWT + RBAC, SSRF guard (`resolveTarget.js`), domain governance via Source, server-side secrets only, audit on every mutation, helmet + CORS + rate limit in `app.js`.
