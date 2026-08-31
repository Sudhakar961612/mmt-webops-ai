import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Mock the browser layer so approval execution runs without a real Chromium.
vi.mock('../../src/services/browser/playwrightService.js', () => {
  const fakePage = {
    goto: async () => {},
    waitForTimeout: async () => {},
    screenshot: async () => Buffer.from('fake-image'),
    title: async () => 'Test Page',
    locator: () => ({
      textContent: async () => '{"data":{"price":5400,"currency":"INR"}}',
    }),
  };
  return {
    withBrowser: async (fn) => fn(fakePage),
    gotoPage: async () => {},
    takeScreenshot: async () => Buffer.from('fake-image'),
    isBrowserAvailable: () => true,
  };
});

import request from 'supertest';
import { connectDB, disconnectDB, startMemoryMongo } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Task } from '../../src/models/Task.js';
import { ExecutionRun } from '../../src/models/ExecutionRun.js';
import { Snapshot } from '../../src/models/Snapshot.js';
import { Change } from '../../src/models/Change.js';
import { Insight } from '../../src/models/Insight.js';
import { env } from '../../src/config/env.js';
import bcrypt from 'bcryptjs';

const PASSWORD = 'Dev@Secure#2026!';

async function seedUser({ username, email, role }) {
  const hashed = await bcrypt.hash(PASSWORD, 4);
  return User.create({ username, email, password: hashed, role });
}

async function loginAs(app, email) {
  const res = await request(app).post('/api/auth/login').send({ identifier: email, password: PASSWORD });
  return res.body.data.token;
}

describe('Run approval state machine', () => {
  let app;
  let adminToken;
  let managerToken;
  let analystToken;
  let viewerToken;

  beforeAll(async () => {
    env.AI_API_KEY = ''; // keep tests offline (no real AI calls)
    const uri = await startMemoryMongo();
    await connectDB(uri);
    app = createApp();
    await Promise.all([
      seedUser({ username: 'adminuser', email: 'admin@test.com', role: 'admin' }),
      seedUser({ username: 'manageruser', email: 'manager@test.com', role: 'manager' }),
      seedUser({ username: 'analystuser', email: 'analyst@test.com', role: 'analyst' }),
      seedUser({ username: 'vieweruser', email: 'viewer@test.com', role: 'viewer' }),
    ]);
    adminToken = await loginAs(app, 'admin@test.com');
    managerToken = await loginAs(app, 'manager@test.com');
    analystToken = await loginAs(app, 'analyst@test.com');
    viewerToken = await loginAs(app, 'viewer@test.com');
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await ExecutionRun.deleteMany({});
    await Snapshot.deleteMany({});
    await Change.deleteMany({});
    await Insight.deleteMany({});
  });

  async function createTaskAs(token) {
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Approval flow test', type: 'generic', target: 'https://example.com', autoApprove: false });
    expect(create.status).toBe(201);
    return { taskId: create.body.data.task._id };
  }

  it('analyst cannot approve a pending run', async () => {
    const { taskId } = await createTaskAs(adminToken);
    const plan = await request(app).post(`/api/tasks/${taskId}/plan`).set('Authorization', `Bearer ${adminToken}`);
    expect(plan.status).toBe(200);
    const runId = plan.body.data.run._id;
    const res = await request(app)
      .post(`/api/tasks/run/${runId}/approve`)
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(403);
  });

  it('viewer cannot approve a pending run', async () => {
    const { taskId } = await createTaskAs(adminToken);
    const plan = await request(app).post(`/api/tasks/${taskId}/plan`).set('Authorization', `Bearer ${adminToken}`);
    const runId = plan.body.data.run._id;
    const res = await request(app)
      .post(`/api/tasks/run/${runId}/approve`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('manager can approve and execute a pending run', async () => {
    const { taskId } = await createTaskAs(adminToken);
    const plan = await request(app).post(`/api/tasks/${taskId}/plan`).set('Authorization', `Bearer ${adminToken}`);
    const runId = plan.body.data.run._id;
    const res = await request(app)
      .post(`/api/tasks/run/${runId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.run.status).toBe('SUCCEEDED');
  });

  it('admin can approve and execute a pending run', async () => {
    const { taskId } = await createTaskAs(adminToken);
    const plan = await request(app).post(`/api/tasks/${taskId}/plan`).set('Authorization', `Bearer ${adminToken}`);
    const runId = plan.body.data.run._id;
    const res = await request(app)
      .post(`/api/tasks/run/${runId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.run.status).toBe('SUCCEEDED');
  });

  it('already approved (executed) run cannot be approved again', async () => {
    const { taskId } = await createTaskAs(adminToken);
    const plan = await request(app).post(`/api/tasks/${taskId}/plan`).set('Authorization', `Bearer ${adminToken}`);
    const runId = plan.body.data.run._id;
    const first = await request(app)
      .post(`/api/tasks/run/${runId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(first.status).toBe(200);
    const again = await request(app)
      .post(`/api/tasks/run/${runId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(again.status).toBe(409);
  });

  it.each(['SUCCEEDED', 'FAILED', 'REJECTED'])('cannot approve a %s run', async (status) => {
    const { taskId } = await createTaskAs(adminToken);
    const plan = await request(app).post(`/api/tasks/${taskId}/plan`).set('Authorization', `Bearer ${adminToken}`);
    const runId = plan.body.data.run._id;
    const run = await ExecutionRun.findById(runId);
    run.status = status;
    await run.save();
    const res = await request(app)
      .post(`/api/tasks/run/${runId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain(status);
  });
});