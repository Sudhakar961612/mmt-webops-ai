# API Reference

Auth: `Authorization: Bearer <JWT>`. Roles: admin, manager, analyst, viewer.

## Tasks
- `POST /api/tasks` — `{name, type, target(demo:<key>|https://...), extractors?, extractionSchema?, schedule(cron)?, autoApprove?}`
- `GET /api/tasks`, `GET /api/tasks/:id`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`
- `POST /api/tasks/:id/plan` — plan + register run (auto-executes if privileged + autoApprove)
- `POST /api/tasks/:id/run` — manager/admin immediate run
- `POST /api/tasks/run/:runId/approve` — manager/admin approve
- `PATCH /api/tasks/:id/pause` — `{paused:true|false}`

## Spec aliases (§7.3)
- `POST /api/plans` `{taskId}` — same as plan
- `POST /api/runs` `{taskId}` — plan + execute (manager/admin)
- `GET /api/runs`, `GET /api/runs/:id`, `POST /api/runs/:id/reject`
- `POST /api/extract` `{html, schemaId|fields}` or `{record, fields}` — normalize/validate + confidence
- `POST /api/compare` `{previous, current}` or `{previousSnapshotId, currentSnapshotId}`
- `POST /api/complete` `{runId, regenerateInsight?}` — insight + notify + export payload

## Governance
- `POST/GET/PATCH/DELETE /api/templates` + `POST /api/templates/:id/use`, `GET /api/templates/stats`
- `POST/GET/PATCH/DELETE /api/sources` + `POST /api/sources/:id/validate`, `GET /api/sources/stats`
- `POST/GET/PATCH/DELETE /api/schemas` + `POST /api/schemas/:id/test`, `GET /api/schemas/stats`

## Results & ops
- `GET /api/insights`, `GET /api/insights/:id`
- `GET /api/dashboard`, `GET /api/audit`, `GET /api/demo`, `POST /api/feedback`
- `GET /api/exports/runs/:id?format=json|csv`, `GET /api/exports/tasks/:id/insights`
- `GET /api/system/status`, `GET /api/system/health` (admin)
- `GET /health` (public)

Errors: `{success:false, message}` with codes 400/401/403/404/409/429/500. Runs carry `errorCode` (`NAV_TIMEOUT`, `NAV_BLOCKED`, `BROWSER_LAUNCH_FAILED`, ...).
