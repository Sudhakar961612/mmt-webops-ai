import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';
import { DemoPage } from './models/DemoPage.js';
import { demoPageSeeds } from './data/demoPageSeeds.js';
import { startScheduler } from './services/schedulerService.js';
import logger from './utils/logger.js';

async function ensureDemoPages() {
  const count = await DemoPage.countDocuments();
  if (count > 0) return;
  for (const seed of demoPageSeeds) {
    await DemoPage.updateOne({ key: seed.key }, { $set: seed }, { upsert: true });
  }
  logger.info('Boot: demo pages registered');
}

async function bootstrap() {
  try {
    await connectDB();
    await ensureDemoPages();
    const server = app.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, demoMode: env.DEMO_MODE, aiConfigured: Boolean(env.GEMINI_API_KEY) },
        'mmt-webops-ai server started'
      );
    });
    await startScheduler();

    const shutdown = async () => {
      logger.info('Shutting down...');
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
