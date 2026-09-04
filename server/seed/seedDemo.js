import { connectDB, disconnectDB } from '../src/config/db.js';
import { DemoPage } from '../src/models/DemoPage.js';
import { demoPageSeeds } from '../src/data/demoPageSeeds.js';
import logger from '../src/utils/logger.js';

/** Seed the database with local demo pages only. Usage: npm run seed */
async function main() {
  try {
    await connectDB();
    for (const seed of demoPageSeeds) {
      await DemoPage.updateOne({ key: seed.key }, { $set: seed }, { upsert: true });
    }
    logger.info('Demo pages seeded. No user accounts were created.');
  } catch (err) {
    logger.error({ err: err.message }, 'Seed failed');
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seedDemo.js')) {
  main();
}

export default main;
