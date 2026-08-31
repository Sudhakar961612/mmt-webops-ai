import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import runRoutes from './routes/run.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import insightRoutes from './routes/insight.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import auditRoutes from './routes/audit.routes.js';
import demoRoutes from './routes/demo.routes.js';
import templateRoutes from './routes/template.routes.js';
import sourceRoutes from './routes/source.routes.js';
import schemaRoutes from './routes/schema.routes.js';
import systemRoutes from './routes/system.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoPagesDir = path.join(__dirname, 'services', 'browser', 'demoPages');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Demo pages rely on inline scripts/styles; allow them while keeping CSP on.
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
        },
      },
    })
  );
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  // Rate limit API to protect login/auth endpoints.
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later.' },
    })
  );

  // Demo pages are served so Playwright can navigate to them (Demo Mode).
  app.use('/demo', express.static(demoPagesDir));

  // Health check.
  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', demoMode: env.DEMO_MODE, time: new Date().toISOString() } });
  });

  // API routes.
  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/runs', runRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/insights', insightRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/demo', demoRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/sources', sourceRoutes);
  app.use('/api/schemas', schemaRoutes);
  app.use('/api/system', systemRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
