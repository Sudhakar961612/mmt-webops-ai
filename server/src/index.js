import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';
import { DemoPage } from './models/DemoPage.js';
import { User } from './models/User.js';
import { Task } from './models/Task.js';
import { demoPageSeeds } from './data/demoPageSeeds.js';
import { startScheduler } from './services/schedulerService.js';
import bcrypt from 'bcryptjs';
import logger from './utils/logger.js';

// Idempotently ensure demo pages exist (important with in-memory/blank databases).
async function ensureDemoPages() {
  const count = await DemoPage.countDocuments();
  if (count > 0) return;
  for (const seed of demoPageSeeds) {
    await DemoPage.updateOne({ key: seed.key }, { $set: seed }, { upsert: true });
  }
  logger.info('Boot: demo pages registered');
}

// Idempotently seed demo users and sample tasks (important with in-memory databases).
async function ensureDemoUsers() {
  const existing = await User.findOne({ email: 'admin@mmt.local' });
  if (existing) return; // Already seeded

  const demoUsers = [
    { username: 'admin', email: 'admin@mmt.local', password: 'Admin@Secure#2026!', role: 'admin' },
    { username: 'manager', email: 'manager@mmt.local', password: 'Manager@Secure#2026!', role: 'manager' },
    { username: 'analyst', email: 'analyst@mmt.local', password: 'Analyst@Secure#2026!', role: 'analyst' },
    { username: 'viewer', email: 'viewer@mmt.local', password: 'Viewer@Secure#2026!', role: 'viewer' },
  ];

  let admin = null;
  for (const { username, email, password, role } of demoUsers) {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed, role, isActive: true });
    if (role === 'admin') admin = user;
  }

  // Create sample tasks for demo
  if (admin) {
    await Task.create([
      {
        name: 'Flight Price Monitor (DEL→BOM)',
        description: 'Monitors flight prices and seat availability on the local demo page.',
        type: 'flight_monitor',
        target: 'demo:flights',
        autoApprove: false,
        schedule: '',
        owner: admin._id,
        status: 'DRAFT',
      },
      {
        name: 'Goa Hotel Rate Monitor',
        description: 'Tracks nightly rates and availability for Goa hotels every 5 minutes.',
        type: 'hotel_monitor',
        target: 'demo:hotels',
        autoApprove: true,
        schedule: '*/5 * * * *',
        owner: admin._id,
        status: 'DRAFT',
      },
    ]);
  }

  logger.info('Boot: demo users and sample tasks registered');
}

async function bootstrap() {
  try {
    await connectDB();
    await ensureDemoPages();
    await ensureDemoUsers();
    const server = app.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, demoMode: env.DEMO_MODE, aiConfigured: Boolean(env.AI_API_KEY) },
        'mmt-webops-ai server started'
      );
    });
    // Start the scheduler after DB is ready (populates scheduled tasks).
    await startScheduler();

    const shutdown = async () => {
      logger.info('Shutting down…');
      server.close();
      await import('./config/db.js').then((m) => m.disconnectDB());
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    logger.error({ err: err.message }, 'Server failed to start');
    process.exit(1);
  }
}

bootstrap();

export default bootstrap;
