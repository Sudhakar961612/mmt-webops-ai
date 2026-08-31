import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Task } from '../src/models/Task.js';
import { DemoPage } from '../src/models/DemoPage.js';
import { demoPageSeeds } from '../src/data/demoPageSeeds.js';
import logger from '../src/utils/logger.js';

/**
 * Seed the database with demo pages, an admin + demo users and sample tasks.
 * Usage: npm run seed  (from server/)
 */

async function seedDemoPages() {
  for (const seed of demoPageSeeds) {
    await DemoPage.updateOne(
      { key: seed.key },
      { $set: seed },
      { upsert: true }
    );
  }
  logger.info('Demo pages seeded');
}

async function seedUser({ username, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    logger.info(`User ${username} already exists`);
    return existing;
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, password: hashed, role });
  logger.info(`Created user ${username} (${role})`);
  return user;
}

async function seedTasks(admin) {
  const existing = await Task.findOne({ name: 'Flight Price Monitor (DEL→BOM)' });
  if (existing) {
    logger.info('Sample tasks already exist');
    return;
  }
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
  logger.info('Sample tasks seeded');
}

async function main() {
  try {
    await connectDB();
    logger.info('Connected. Seeding…');

    await seedDemoPages();

    const admin = await seedUser({
      username: 'admin',
      email: 'admin@mmt.local',
      password: 'Admin@Secure#2026!',
      role: 'admin',
    });
    await seedUser({
      username: 'manager',
      email: 'manager@mmt.local',
      password: 'Manager@Secure#2026!',
      role: 'manager',
    });
    await seedUser({
      username: 'analyst',
      email: 'analyst@mmt.local',
      password: 'Analyst@Secure#2026!',
      role: 'analyst',
    });

    await seedTasks(admin);

    logger.info('Seed complete.');
  } catch (err) {
    logger.error({ err: err.message }, 'Seed failed');
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

// Guard against accidental run when imported (tests import models, not this file).
if (process.argv[1] && process.argv[1].endsWith('seedDemo.js')) {
  main();
}

export default main;
