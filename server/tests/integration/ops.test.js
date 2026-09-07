import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../../src/services/browser/playwrightService.js', () => {
  const fakePage = {
    goto: async () => {},
    waitForTimeout: async () => {},
    screenshot: async () => Buffer.from('fake-image'),
    title: async () => 'Ops Page',
    locator: () => ({ textContent: async () => '{"data":{"price":100}}' }),
  };
  return {
    withBrowser: async (fn) => fn(fakePage),
    gotoPage: async () => {},
    takeScreenshot: async () => Buffer.from('fake-image'),
    dismissOverlays: async () => {},
    classifyBrowserError: () => ({ code: 'BROWSER_UNKNOWN', retryable: false, statusCode: 500 }),
    isBrowserAvailable: () => true,
  };
});

import request from 'supertest';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB, startMemoryMongo } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Task } from '../../src/models/Task.js';
import { ExecutionRun } from '../../src/models/ExecutionRun.js';
import { env } from '../../src/config/env.js';

const PASSWORD = 'Dev@Secure#2026!';

describe('spec alias ops endpoints', () => {
  let app;
  let managerToken;
  let taskId;

  beforeAll(async () => {
    env.GEMINI_API_KEY = '';
    const uri = await startMemoryMongo();
    await connectDB(uri);
    app = createApp();
    const hashed = await bcrypt.hash(PASSWORD, 4);
    await User.create({ username: 'opsmgr', email: 'opsmgr@test.com', password: hashed, role: 'manager' });
    const login = await request(app).post('/api/auth/login').send({ identifier: 'opsmgr@test.com', password: PASSWORD });
    managerToken = login.body.data.token;
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await ExecutionRun.deleteMany({});
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Ops alias task', type: 'generic', target: 'https://example.com' });
    taskId = create.body.data.task._id;
  });

  it('POST /api/plans creates a run with a plan', async () => {
    const res = await request(app).post('/api/plans').set('Authorization', `Bearer ${managerToken}`).send({ taskId });
    expect(res.status).toBe(201);
    expect(res.body.data.plan.length).toBeGreaterThan(0);
  });

  it('POST /api/extract normalizes a record against fields', async () => {
    const res = await request(app)
      .post('/api/extract')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ record: { price_value: '₹5,400' }, fields: [{ name: 'price_value', type: 'number', normalization: { transform: 'parseFloat' } }] });
    expect(res.status).toBe(200);
    expect(res.body.data.data.price_value).toBe(5400);
  });

  it('POST /api/compare diffs two objects', async () => {
    const res = await request(app)
      .post('/api/compare')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ previous: { price: 100 }, current: { price: 120 } });
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.changes[0].field).toBe('price');
  });

  it('POST /api/runs executes immediately and GET export returns json+csv', async () => {
    const started = await request(app).post('/api/runs').set('Authorization', `Bearer ${managerToken}`).send({ taskId });
    expect(started.status).toBe(201);
    const runId = started.body.data.run._id;
    const completed = await request(app).post('/api/complete').set('Authorization', `Bearer ${managerToken}`).send({ runId });
    expect(completed.status).toBe(200);
    const json = await request(app).get(`/api/exports/runs/${runId}?format=json`).set('Authorization', `Bearer ${managerToken}`);
    expect(json.status).toBe(200);
    const csv = await request(app).get(`/api/exports/runs/${runId}?format=csv`).set('Authorization', `Bearer ${managerToken}`);
    expect(csv.status).toBe(200);
    expect(csv.text).toContain('field,type,previousValue');
  });
});
