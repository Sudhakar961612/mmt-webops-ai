import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectDB, disconnectDB, startMemoryMongo } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { TaskTemplate } from '../../src/models/TaskTemplate.js';
import { Task } from '../../src/models/Task.js';
import bcrypt from 'bcryptjs';

const PASSWORD = 'Dev@Secure#2026!';

async function seedUser({ username, email, role }) {
  const hashed = await bcrypt.hash(PASSWORD, 4);
  return User.create({ username, email, password: hashed, role });
}

async function loginAs(app, email = 'tpladmin@example.com') {
  const res = await request(app).post('/api/auth/login').send({ identifier: email, password: PASSWORD });
  return res.body.data.token;
}

describe('Template → Task (create task from template)', () => {
  let app;

  beforeAll(async () => {
    const uri = await startMemoryMongo();
    await connectDB(uri);
    app = createApp();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await TaskTemplate.deleteMany({});
    await Task.deleteMany({});
  });

  const createTemplate = async (token, overrides = {}) => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Flight monitor', category: 'custom', targetPattern: 'demo:flights', ...overrides });
    expect(res.status).toBe(201);
    return res.body.data;
  };

  it('creates a task from a template using the route id (no body templateId)', async () => {
    await seedUser({ username: 'tpladmin', email: 'tpladmin@example.com', role: 'admin' });
    const token = await loginAs(app);
    const template = await createTemplate(token);

    const res = await request(app)
      .post(`/api/templates/${template._id}/use`)
      .set('Authorization', `Bearer ${token}`)
      .send({ taskName: 'My flight task', autoApprove: false });

    expect(res.status).toBe(201);
    const task = res.body.data;
    expect(task.name).toBe('My flight task');
    expect(task._id).toBeTruthy();
    expect(task.target).toBe('demo:flights');
    expect(task.owner).toBeTruthy();

    const updated = await TaskTemplate.findById(template._id);
    expect(updated.usageCount).toBe(1);
    expect(updated.lastUsedAt).toBeTruthy();
  });

  it('ignores a body templateId and trusts req.params.id', async () => {
    await seedUser({ username: 'tpladmin', email: 'tpladmin@example.com', role: 'admin' });
    const token = await loginAs(app);
    const templateA = await createTemplate(token, { targetPattern: 'demo:hotels' });
    const templateB = await createTemplate(token, { targetPattern: 'demo:flights' });

    // The client tries to smuggle a different templateId in the body; the
    // backend must honour the URL path (templateB), not the body.
    const res = await request(app)
      .post(`/api/templates/${templateB._id}/use`)
      .set('Authorization', `Bearer ${token}`)
      .send({ templateId: templateA._id, taskName: 'Smuggled', autoApprove: false });

    expect(res.status).toBe(201);
    expect(res.body.data.target).toBe('demo:flights');
  });

  it('returns 404 for a missing template', async () => {
    await seedUser({ username: 'tpladmin', email: 'tpladmin@example.com', role: 'admin' });
    const token = await loginAs(app);
    const res = await request(app)
      .post('/api/templates/000000000000000000000000/use')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('blocks analysts from enabling auto-approval via a template', async () => {
    await seedUser({ username: 'tpladmin', email: 'tpladmin@example.com', role: 'admin' });
    await seedUser({ username: 'analyst', email: 'analyst@example.com', role: 'analyst' });
    const adminToken = await loginAs(app, 'tpladmin@example.com');
    const template = await createTemplate(adminToken, { defaultAutoApprove: true });

    const analystToken = await loginAs(app, 'analyst@example.com');
    const res = await request(app)
      .post(`/api/templates/${template._id}/use`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ autoApprove: true });
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request', async () => {
    await seedUser({ username: 'tpladmin', email: 'tpladmin@example.com', role: 'admin' });
    const template = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${await loginAs(app)}`)
      .send({ name: 'Template T', targetPattern: 'demo:flights' });
    expect(template.status).toBe(201);
    const res = await request(app).post(`/api/templates/${template.body.data._id}/use`).send({});
    expect(res.status).toBe(401);
  });
});