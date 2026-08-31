import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectDB, disconnectDB, startMemoryMongo } from '../../src/config/db.js';
import { User } from '../../src/models/User.js';
import { Task } from '../../src/models/Task.js';
import { ExecutionRun } from '../../src/models/ExecutionRun.js';
import { buildScheduledFlow } from '../../src/services/schedulerService.js';
import { env } from '../../src/config/env.js';
import bcrypt from 'bcryptjs';

const PASSWORD = 'Dev@Secure#2026!';

describe('Scheduler duplicate-approval protection', () => {
  let owner;

  beforeAll(async () => {
    env.AI_API_KEY = ''; // keep tests offline (no real AI calls)
    const uri = await startMemoryMongo();
    await connectDB(uri);
    const hashed = await bcrypt.hash(PASSWORD, 4);
    owner = await User.create({
      username: 'schedadmin',
      email: 'schedadmin@example.com',
      password: hashed,
      role: 'admin',
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await ExecutionRun.deleteMany({});
  });

  async function makeTask() {
    return Task.create({
      name: 'Scheduled task',
      description: '',
      type: 'generic',
      target: 'https://example.com',
      extractors: {},
      schedule: '*/5 * * * *',
      autoApprove: false,
      owner: owner._id,
      status: 'DRAFT',
    });
  }

  it('skips creating another pending run when one is already awaiting approval', async () => {
    const task = await makeTask();
    await ExecutionRun.create({ task: task._id, status: 'AWAITING_APPROVAL', plan: [], trigger: 'scheduler' });

    await buildScheduledFlow(task._id)();

    const runs = await ExecutionRun.find({ task: task._id });
    expect(runs).toHaveLength(1);
  });

  it('still schedules a new pending run after the previous one is settled', async () => {
    const task = await makeTask();
    await ExecutionRun.create({ task: task._id, status: 'SUCCEEDED', plan: [], trigger: 'scheduler' });

    await buildScheduledFlow(task._id)();

    const runs = await ExecutionRun.find({ task: task._id });
    expect(runs).toHaveLength(2);
    const newest = runs.find((r) => r.status === 'AWAITING_APPROVAL');
    expect(newest).toBeTruthy();
  });

  it('does nothing for paused tasks', async () => {
    const task = await makeTask();
    task.status = 'PAUSED';
    await task.save();

    await buildScheduledFlow(task._id)();

    const runs = await ExecutionRun.find({ task: task._id });
    expect(runs).toHaveLength(0);
  });
});