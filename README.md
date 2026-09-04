# ✈️ MakeMyTrip Autonomous Web Operations Agent

A **controlled, auditable AI-powered system** for automating recurring web monitoring and operations workflows. It plans browser automation tasks, executes them safely, extracts structured data, detects changes, reasons about business impact, and maintains full audit trails — designed for growth and operations teams managing travel commerce.

**[📱 Live Demo](#deployment--access)** · **[📚 Full Documentation](#documentation)** · **[🏗️ Architecture](#architecture)** · **[🔒 Security](#security--compliance)**

---

## 🎯 Executive Summary

### Problem
MakeMyTrip growth, operations, and business teams need to monitor competitor pricing, hotel availability, campaign changes, partner updates, and travel demand signals across multiple web surfaces. Manual monitoring doesn't scale; information becomes stale before it's actionable.

### Solution
The Autonomous Web Operations Agent converts repetitive web monitoring work into reliable, governed, AI-assisted workflows:
- **Task Intake**: Define monitoring objectives (e.g., "track competitor hotel prices")
- **Agent Planning**: AI decomposes into safe browser steps
- **Plan Review**: Human approval gate before execution
- **Browser Execution**: Controlled Playwright automation on allowlisted sources
- **Data Extraction**: Schema-based field extraction with confidence scores
- **Change Detection**: Compare against prior snapshots, flag business-relevant changes
- **Reasoning**: AI interprets changes into operational insights
- **Audit Trail**: Every action logged for compliance and debugging

### Key Features
✅ **Controlled Autonomy** — AI planning + human approval + auditable execution  
✅ **Structured Extraction** — Schema-based field mapping with validation  
✅ **Change Detection** — Smart comparison with severity scoring  
✅ **Source Governance** — Allowlisting, rate limits, compliance policies  
✅ **Task Templates** — Reusable workflows for recurring monitoring  
✅ **Full Audit Trail** — Every browser action, extraction, decision logged  
✅ **Demo Mode** — Complete end-to-end workflow with zero external APIs  
✅ **Production Ready** — Easy deployment to Vercel + Render + MongoDB Atlas

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 · Vite · Tailwind CSS · Axios |
| **Backend** | Node.js · Express.js · JWT auth · REST APIs |
| **Database** | MongoDB · Mongoose · Indexed queries |
| **Browser Automation** | Playwright (headless Chromium) |
| **Scheduling** | node-cron (task recurrence) |
| **AI** | OpenAI-compatible LLM API (GPT-4o-mini) → Deterministic fallback |
| **Observability** | Pino structured logging, Audit logs, Metrics |
| **Testing** | Vitest, Supertest, mongodb-memory-server |
| **Deployment** | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

---

## ✨ Core Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ TASK CREATION                                                   │
│ User defines: objective, target domain, expected fields, schedule
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ AGENT PLANNING (AI or Deterministic)                            │
│ Generate ordered browser steps: navigate → wait → extract → ... 
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ PLAN REVIEW & APPROVAL (Human Gate)                             │
│ Manager/admin reviews plan, scores for safety (rule-based)     │
│ Auto-approve or queue for manual approval                      │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ BROWSER EXECUTION (Playwright)                                  │
│ • Navigate to approved domain                                   │
│ • Wait for page render (configurable timeout)                  │
│ • Take screenshot                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ DATA EXTRACTION (Schema-based)                                  │
│ • Parse HTML via CSS selectors or embedded JSON                │
│ • Extract fields: price, availability, title, etc.            │
│ • Validate against schema (type, range, pattern)              │
│ • Normalize: trim, parse numbers, convert dates               │
│ • Compute confidence score                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ SNAPSHOT STORAGE & COMPARISON                                  │
│ • Store extracted data + screenshot + metadata                │
│ • Compare against previous snapshot                           │
│ • Detect field-level changes (ADDED, REMOVED, MODIFIED)       │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ AI REASONING (Insight Generation)                              │
│ • Evaluate business relevance of changes                      │
│ • Compute deltas: price %, availability counts                │
│ • Assign confidence (0-1) and severity (high/med/low)          │
│ • Generate concise operational summary                         │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ COMPLETION & HANDOFF                                            │
│ • Create Insight record (UI-reviewable)                        │
│ • Log actions to Audit trail                                   │
│ • Route to team for action (dashboard, export, alert)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (tested on 20)
- **MongoDB** (local, Docker, or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) free tier)
- **Git**

### 1. Clone & Install
```bash
git clone https://github.com/your-org/mmt-webops-ai.git
cd mmt-webops-ai

npm install
npm run install:all                    # Install server + client workspaces
npx playwright install chromium        # Download Chromium for browser automation
```

### 2. Configure Environment
```bash
# Create .env in server/ directory
cp server/.env.example server/.env
```

Edit `server/.env`:
```bash
# Database (use in-memory for quick start)
AUTO_MONGODB_MEMORY=true

# AI (leave empty for demo mode with deterministic fallback)
AI_API_KEY=

# Server
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
DEMO_MODE=true
BROWSER_HEADLESS=true

# Authentication
JWT_SECRET=dev-secret-change-in-production
```

### 3. Seed Local Demo Pages (Optional)
```bash
npm run seed
```

No user accounts are seeded. Create an account from the registration page before signing in.

### 4. Start Development Servers
```bash
npm run dev
```

This starts:
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:5173

### 5. Try It Out
1. Open http://localhost:5173
2. Create an account, then sign in
3. Go to **Tasks** and create a task
4. Click **Run now**
5. Watch the browser execute (demo page loads, data extracts)
6. After ~5 seconds, view the **Extracted Data**
7. Run the task again — **Change Detection** will show differences

---

## 🔍 Product Features

### Task Management
- ✅ Create tasks with objectives, target domains, expected fields
- ✅ Save reusable task templates (competitor_offer, hotel_pricing, campaign_page, partner_update, travel_trend)
- ✅ Cron-based scheduling (daily, weekly, event-triggered)
- ✅ Auto-approve or manual approval gate
- ✅ Task pause/resume

### Agent Planning & Review
- ✅ AI-powered plan generation (OpenAI-compatible API)
- ✅ Deterministic fallback (works offline)
- ✅ Rule-based plan validation (completeness, safety)
- ✅ Risk scoring (0-100)
- ✅ Human review & approval UI

### Browser Automation
- ✅ Controlled Playwright execution (headless Chromium)
- ✅ Source allowlisting & rate limiting
- ✅ Screenshot capture
- ✅ Timeout & retry logic
- ✅ Demo pages (flights, hotels, offers, partner)

### Data Extraction
- ✅ Schema-based field mapping (CSS selectors or embedded JSON)
- ✅ Type validation (string, number, date, boolean, array, object)
- ✅ Normalization (trim, case, number parsing)
- ✅ Confidence scoring per field
- ✅ Test extraction against HTML samples

### Change Detection
- ✅ Snapshot comparison (current vs. previous)
- ✅ Field-level diff algorithm (ADDED, REMOVED, MODIFIED)
- ✅ Severity classification (high=pricing, medium=availability, low=other)
- ✅ Delta computation (% change for prices)
- ✅ Business-relevant filtering

### Insights & Reasoning
- ✅ AI-powered insight generation
- ✅ Deterministic fallback with rule-based reasoning
- ✅ Change summarization with evidence
- ✅ Confidence scoring (0-1)
- ✅ Actionable business impact assessment

### Governance & Security
- ✅ Role-based access control (admin, manager, analyst, viewer)
- ✅ Source registration & approval workflow
- ✅ Data classification (public, internal, confidential)
- ✅ Rate limiting per source
- ✅ Extraction field allowlists
- ✅ Credential management (server-side only)
- ✅ Full audit trail of all actions

### Operations Dashboard
- ✅ Task completion statistics
- ✅ Source health metrics
- ✅ Extraction accuracy tracking
- ✅ Run history & retry patterns
- ✅ Cost tracking per workflow

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[architecture.md](docs/architecture.md)** | System design, layers, data models, integration points |
| **[browser_policy.md](docs/browser_policy.md)** | Security constraints, source governance, compliance rules |
| **[api_reference.md](docs/api_reference.md)** | Complete API endpoint reference with examples |
| **[deployment.md](docs/deployment.md)** | Production deployment (Vercel + Render + Atlas) |
| **[configuration.md](docs/configuration.md)** | Environment variables, setup options |

---

## 🏗️ Architecture

### Layers

**Frontend (React + Vite)**
- Task Intake Console
- Plan Review Panel
- Browser Workflow Monitor
- Extracted Data Review
- Insights Dashboard
- Operations Dashboard

**Backend (Express.js)**
- REST APIs (tasks, runs, templates, sources, schemas)
- Agent orchestration (planner, reviewer, reasoner)
- Browser worker pool (Playwright)
- Database integration (MongoDB)
- Scheduler (node-cron)

**Data (MongoDB)**
- Task, ExecutionRun, Snapshot, Change, Insight
- TaskTemplate, Source, ExtractionSchema
- User, AuditLog, Feedback, DemoPage

**External Services (Optional)**
- LLM Provider (OpenAI-compatible API)
- Object Storage (S3, GCS for screenshots)
- Vector DB (Qdrant for semantic search)
- Email/Notifications (SendGrid, Slack)

See **[architecture.md](docs/architecture.md)** for detailed diagrams and state machines.

---

## 🔒 Security & Compliance

### Data Governance
- ✅ Source allowlisting (domains, categories)
- ✅ Rate limiting (requests/hour per source)
- ✅ Data classification (public, internal, confidential)
- ✅ Retention policies (90 days default)
- ✅ Screenshot capture control per source

### Authentication & Authorization
- ✅ JWT tokens (7-day expiry)
- ✅ Role-based access (admin, manager, analyst, viewer)
- ✅ Password hashing (bcryptjs)
- ✅ Session management

### Browser Safety
- ✅ Demo mode by default (no external sites)
- ✅ Blocked domains (government, banking, private IPs)
- ✅ No credential theft (server-side auth only)
- ✅ Screenshot size limits
- ✅ Timeout protection

### Audit & Compliance
- ✅ Full action trail (every task, run, approval, approval)
- ✅ Actor identification (user, IP, timestamp)
- ✅ Entity tracking (what changed, when, why)
- ✅ Compliance notes (legal contacts, ToS links)

See **[browser_policy.md](docs/browser_policy.md)** for complete security guidelines.

---

## 🚢 Deployment & Access

### Local Development
```bash
npm run dev        # http://localhost:5173 (frontend)
                   # http://localhost:5000 (backend)
```

### Production (Recommended Stack)
- **Frontend**: Vercel (`vercel.com`) — Auto-builds on push, CDN
- **Backend**: Render (`render.com`) — Docker container, environment vars
- **Database**: MongoDB Atlas (`mongodb.com/cloud/atlas`) — Managed, backups

### Deploy to Production

**Option 1: Vercel + Render (5 minutes)**

```bash
# 1. Push to GitHub
git push origin main

# 2. Vercel dashboard → New → Select repo → Deploy
# (auto-detects React app in client/)

# 3. Render dashboard → New → Web Service → Select repo
# - Build: npm install --workspaces
# - Start: npm start --workspace server
# - Add env vars (MONGODB_URI, AI_API_KEY, JWT_SECRET)

# 4. In Vercel → Project → Settings → Environment Variables, add this for
#    Production (and Preview if you use preview deployments), then redeploy.
#    Do not use the Vercel frontend URL here.
# VITE_API_BASE_URL=https://your-backend.render.com/api
#
# 5. In Render, set CLIENT_ORIGIN to the exact Vercel frontend URL, for example:
# CLIENT_ORIGIN=https://mmt-webops-ai.vercel.app
```

The Vite development proxy exists only on `localhost`. If `VITE_API_BASE_URL`
is missing from a production frontend build, the browser sends login requests to
`https://your-frontend-host/api/auth/login`; a static frontend deployment has no
such route and returns 404. `VITE_API_BASE_URL` is embedded during the build, so
redeploy the frontend after setting or changing it.

See **[deployment.md](docs/deployment.md)** for step-by-step guides, Docker, Kubernetes options.

---

## 📦 Project Structure

```
mmt-webops-ai/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── pages/                   # Task, Insight, Audit pages
│   │   ├── components/              # Reusable UI components
│   │   ├── api/                     # Axios client setup
│   │   └── context/                 # Auth context
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                          # Node.js backend (Express)
│   ├── src/
│   │   ├── app.js                   # Express app setup
│   │   ├── index.js                 # Server entry point
│   │   ├── models/                  # Mongoose schemas
│   │   │   ├── Task.js
│   │   │   ├── ExecutionRun.js
│   │   │   ├── Snapshot.js
│   │   │   ├── Change.js
│   │   │   ├── Insight.js
│   │   │   ├── TaskTemplate.js       # ← NEW
│   │   │   ├── Source.js             # ← NEW
│   │   │   └── ExtractionSchema.js   # ← NEW
│   │   ├── controllers/
│   │   │   ├── taskController.js
│   │   │   ├── templateController.js # ← NEW
│   │   │   ├── sourceController.js   # ← NEW
│   │   │   └── schemaController.js   # ← NEW
│   │   ├── routes/
│   │   │   ├── task.routes.js
│   │   │   ├── template.routes.js    # ← NEW
│   │   │   ├── source.routes.js      # ← NEW
│   │   │   └── schema.routes.js      # ← NEW
│   │   ├── services/
│   │   │   ├── runEngine.js          # Orchestrates full workflow
│   │   │   ├── agent/
│   │   │   │   ├── plannerService.js # Generate browser steps
│   │   │   │   ├── reviewerService.js # Validate plan
│   │   │   │   ├── reasonerService.js # Generate insights
│   │   │   │   └── aiProvider.js     # LLM API wrapper
│   │   │   ├── browser/
│   │   │   │   ├── playwrightService.js # Browser automation
│   │   │   │   └── demoPages/        # Local HTML demos
│   │   │   ├── extractionService.js  # Field extraction
│   │   │   ├── comparisonService.js  # Change detection
│   │   │   ├── schedulerService.js   # Task scheduling
│   │   │   └── auditService.js       # Audit logging
│   │   ├── middleware/               # Auth, validation, error handling
│   │   └── utils/                    # Helpers (logger, errors)
│   ├── seed/seedDemo.js              # Demo data
│   └── .env.example
│
├── docs/
│   ├── architecture.md               # ← NEW: System design
│   ├── browser_policy.md             # ← NEW: Security & governance
│   ├── api_reference.md              # ← NEW: Complete API docs
│   ├── deployment.md                 # ← NEW: Production setup
│   └── configuration.md              # Environment variables
│
├── package.json                      # Monorepo root
└── README.md                         # This file
```

---

## 🧪 Testing

```bash
# Unit & integration tests
npm run test

# Specific file
npm run test -- src/services/comparisonService.test.js

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage
```

**Test Scenarios:**
- Task creation and validation
- Plan generation (AI + fallback)
- Browser execution (demo pages)
- Extraction accuracy (schema compliance)
- Change detection (snapshots)
- Insight reasoning (business logic)
- Error recovery (timeouts, retries)

---

## 📊 Demo Workflow

The system includes seeded demo data for quick testing:

### Demo Pages
- `http://localhost:5000/demo/flights` — Flight pricing (regenerates on load)
- `http://localhost:5000/demo/hotels` — Hotel availability (regenerates on load)
- `http://localhost:5000/demo/offers` — Campaign offers (regenerates on load)
- `http://localhost:5000/demo/partner` — Partner updates (regenerates on load)

### Demo Tasks
Pre-created sample tasks:
1. **Flight Price Monitor** (manual, no schedule)
2. **Hotel Availability Tracker** (scheduled daily at 9 AM)

### Demo Workflow
1. Login as `analyst@mmt.local`
2. Go to **Tasks**
3. Select "Flight Price Monitor"
4. Click **Plan** (AI generates steps)
5. Manager clicks **Approve**
6. System executes: navigate → extract → compare → reason
7. View **Insights** (change summary)
8. Review **Audit Log** (every action traced)

---

## 🔌 API Overview

### Tasks
- `POST /api/tasks` — Create task
- `GET /api/tasks` — List tasks
- `GET /api/tasks/:id` — Get task details
- `POST /api/tasks/:id/plan` — Generate execution plan
- `POST /api/tasks/:id/run` — Execute task immediately

### Runs (Execution)
- `GET /api/runs` — List execution history
- `GET /api/runs/:id` — Get run details & status
- `POST /api/runs/:runId/approve` — Approve & execute (manager only)

### Templates ← NEW
- `POST /api/templates` — Create reusable template
- `GET /api/templates` — List by category
- `POST /api/templates/:id/use` — Create task from template

### Sources ← NEW
- `POST /api/sources` — Register data source
- `GET /api/sources` — List with filters
- `POST /api/sources/:id/validate` — Health check

### Extraction Schemas ← NEW
- `POST /api/schemas` — Define field extraction rules
- `GET /api/schemas` — List by type
- `POST /api/schemas/:id/test` — Test against HTML

### Insights
- `GET /api/insights` — List generated insights
- `GET /api/insights/:id` — Get insight details

### Dashboard
- `GET /api/dashboard` — Statistics & metrics
- `GET /api/audit` — Audit trail

See **[api_reference.md](docs/api_reference.md)** for complete endpoint documentation.

---

## 🎓 Use Cases

### 1. Competitor Offer Tracking
**Task**: Monitor competitor hotel offers daily  
**Workflow**: Navigate → Extract (price, copy, CTA) → Compare with yesterday → Alert if price drops >10%  
**Output**: Dashboard shows competitor moves, team responds  
**Frequency**: Daily at 6 AM, 12 PM, 6 PM

### 2. Hotel Pricing Watch
**Task**: Track selected hotels' nightly rates for upcoming weeks  
**Workflow**: Extract by date range → Detect price movement patterns → Flag anomalies  
**Output**: Pricing intelligence for revenue team  
**Frequency**: Hourly during peak season

### 3. Campaign Page Monitoring  
**Task**: Track landing page changes (copy, CTAs, placement)  
**Workflow**: Screenshot + OCR → Compare layout → Detect messaging shifts  
**Output**: Campaign performance correlation with page changes  
**Frequency**: Per-deployment (manual)

### 4. Partner Update Review
**Task**: Monitor partner portal for announcements  
**Workflow**: Extract partner updates → Detect new/changed content → Route to owner  
**Output**: Partner communication log with timestamps  
**Frequency**: Daily

### 5. Travel Trend Scanning
**Task**: Aggregate signals from destination websites, search trends, event pages  
**Workflow**: Multi-source extraction → Sentiment analysis → Trend correlation  
**Output**: Emerging travel demand indicators  
**Frequency**: Weekly

---

## 🚧 Future Enhancements

- [ ] Multi-source aggregation (run 10 tasks in parallel)
- [ ] Export to CSV/JSON (for external analytics)
- [ ] Webhook notifications (Slack, email on change)
- [ ] Vector search (find similar changes across time)
- [ ] ML-based anomaly detection (flag unexpected patterns)
- [ ] Mobile app (view insights, approve plans on-the-go)
- [ ] Advanced scheduling (trigger on external events)
- [ ] Cost optimization dashboard (track browser/API spend)
- [ ] Custom extraction models (train on domain-specific data)
- [ ] Multi-language support (extract + reason in local languages)

---

## 📝 Environment Variables

See **[docs/configuration.md](docs/configuration.md)** for complete reference.

**Essential:**
```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mmt-webops-ai
AUTO_MONGODB_MEMORY=true  # or false for real MongoDB

# AI (optional, leave empty for demo mode)
AI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# Server
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=dev-secret-change-in-production
```

---

## 🔗 Resources

- **[OpenAI API](https://platform.openai.com/docs)** — LLM for planning & reasoning
- **[Playwright Docs](https://playwright.dev)** — Browser automation
- **[MongoDB Docs](https://docs.mongodb.com)** — Data storage
- **[Express.js Guide](https://expressjs.com)** — Backend framework
- **[React Docs](https://react.dev)** — Frontend framework

---

## 👥 Team Contributions

This system was designed collaboratively across roles:

| Role | Contributions |
|------|---------------|
| **Product Manager** | Feature requirements, user journeys, success metrics |
| **Engineering Lead** | Architecture, state machine design, scalability |
| **Frontend Engineer** | Task console, workflow UI, dashboard |
| **Backend Engineer** | APIs, database models, job orchestration |
| **AI Engineer** | Planner, reasoner, prompt engineering, fallback logic |
| **Data Analyst** | Extraction schemas, comparison logic, metrics |
| **QA Lead** | Test scenarios, edge cases, reliability |
| **Security Lead** | Source governance, compliance, audit trails |

---

## 📄 License

[LICENSE file](LICENSE) — Internal use only

---

## 📞 Support

Questions or issues? Contact:
- **Product**: [product-team@mmt.local](mailto:product-team@mmt.local)
- **Engineering**: [engineering-team@mmt.local](mailto:engineering-team@mmt.local)
- **Security**: [security-team@mmt.local](mailto:security-team@mmt.local)

---

**Made with ❤️ for MakeMyTrip Growth & Operations teams**  
*Last updated: Jan 2024 | Version: 1.0.0*

## 🗂 Project Structure

```
mmt-webops-ai/
├── package.json                 # root scripts + workspaces
├── server/                      # Express backend
│   ├── .env.example
│   ├── seed/seedDemo.js
│   ├── src/
│   │   ├── index.js             # bootstrap (db, server, scheduler)
│   │   ├── app.js               # express app + routes + demo static serving
│   │   ├── config/              # env, db
│   │   ├── models/              # User, Task, ExecutionRun, Snapshot, Change,
│   │   │                        # Insight, Feedback, AuditLog, DemoPage
│   │   ├── middleware/          # auth (JWT), authorize (RBAC), validate, errors
│   │   ├── controllers/         # route handlers
│   │   ├── routes/              # REST endpoints
│   │   ├── services/
│   │   │   ├── agent/           # aiProvider, planner, reviewer, reasoner
│   │   │   ├── browser/         # playwright + demoPages (flights, hotels)
│   │   │   ├── extractionService.js
│   │   │   ├── comparisonService.js
│   │   │   ├── auditService.js · notifierService.js · schedulerService.js
│   │   │   └── runEngine.js     # orchestrates the full workflow
│   │   └── utils/               # logger, asyncHandler, ApiError
│   └── tests/                   # unit + integration (Vitest)
├── client/                      # React + Vite + Tailwind frontend
│   └── src/
│       ├── api/client.js        # axios instance (auth interceptor)
│       ├── context/AuthContext.jsx
│       ├── components/          # Layout, ProtectedRoute, Badge, Spinner…
│       └── pages/               # Login, Register, Dashboard, Tasks, TaskDetail,
│                                # RunDetail, Insights, AuditLog, DemoPages
└── docs/
```

## 🔐 Roles & Access (RBAC)

| Role    | Capabilities                                                     |
|---------|------------------------------------------------------------------|
| admin   | Everything, incl. setting user roles                             |
| manager | View all tasks, create/plan/run, **approve runs**, delete tasks  |
| analyst | Create/run their own tasks, view results, submit feedback        |
| viewer  | Read-only                                                        |

Route guards use `authenticate` (JWT) + `authorize(...roles)`.

## 🛡 Security & Reliability
- bcrypt password hashing, JWT with expiry, `helmet`, CORS whitelist, rate limiting
- `express-validator` validation, centralized error handler
- Structured logging (pino) + an **audit log** for every action
- Browser/AI failures fall back gracefully

## 🧪 Tests
```bash
npm run test        # server Vitest unit + integration tests
```
- Unit: comparisonService · reasonerService · plannerService
- Integration: auth register/login/me + task CRUD (in-memory MongoDB)

## 📜 License
Internal reference project for demonstration and learning purposes.
