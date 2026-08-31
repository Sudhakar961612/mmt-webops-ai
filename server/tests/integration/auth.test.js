import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectDB, disconnectDB, startMemoryMongo } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import bcrypt from 'bcryptjs';

const STRONG_PASSWORD = 'Dev@Secure#2026!';
const ALTERNATE_STRONG_PASSWORD = 'Manager@Secure#2026!';

// Create a user directly in the DB (used to provision an admin, since public
// registration must NEVER be able to create elevated roles).
async function seedUser({ username, email, password, role }) {
  const hashed = await bcrypt.hash(password, 4);
  return User.create({ username, email, password: hashed, role });
}

async function loginAs(app, identifier, password) {
  const res = await request(app).post('/api/auth/login').send({ identifier, password });
  return res.body.data.token;
}

// Integration tests use an in-memory MongoDB so no real DB is required.
describe('Auth & Task API (integration)', () => {
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
  });

  it('rejects weak passwords that do not meet the security requirements', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'weakpass',
      email: 'weak@example.com',
      password: 'secret123',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('12 characters');
    expect(res.body.errors).toContain('Password must be at least 12 characters');
  });

  it('registers a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.username).toBe('testuser');
    expect(res.body.data.user.role).toBe('analyst');
  });

  it('public registration always creates an analyst (no role sent)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'defaultrole',
      email: 'defaultrole@example.com',
      password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('analyst');
    const dbUser = await User.findOne({ email: 'defaultrole@example.com' });
    expect(dbUser.role).toBe('analyst');
  });

  it('public registration ignores a forged role: admin', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'forgedadmin',
      email: 'forgedadmin@example.com',
      password: STRONG_PASSWORD,
      role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('analyst');
    const dbUser = await User.findOne({ email: 'forgedadmin@example.com' });
    expect(dbUser.role).toBe('analyst');
  });

  it('public registration ignores a forged role: manager', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'forgedmgr',
      email: 'forgedmgr@example.com',
      password: STRONG_PASSWORD,
      role: 'manager',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('analyst');
    const dbUser = await User.findOne({ email: 'forgedmgr@example.com' });
    expect(dbUser.role).toBe('analyst');
  });

  it('rejects unauthenticated user creation with elevated role', async () => {
    const res = await request(app).post('/api/auth/users').send({
      username: 'anonadmin',
      email: 'anonadmin@example.com',
      password: STRONG_PASSWORD,
      role: 'admin',
    });
    expect(res.status).toBe(401);
  });

  it('rejects analyst from creating elevated-role accounts', async () => {
    await seedUser({ username: 'analysta', email: 'analysta@example.com', password: STRONG_PASSWORD, role: 'analyst' });
    const token = await loginAs(app, 'analysta@example.com', STRONG_PASSWORD);
    const asManager = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newmgr', email: 'newmgr@example.com', password: STRONG_PASSWORD, role: 'manager' });
    expect(asManager.status).toBe(403);
    const asAdmin = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newadm', email: 'newadm@example.com', password: STRONG_PASSWORD, role: 'admin' });
    expect(asAdmin.status).toBe(403);
  });

  it('rejects viewer from creating elevated-role accounts', async () => {
    await seedUser({ username: 'viewera', email: 'viewera@example.com', password: STRONG_PASSWORD, role: 'viewer' });
    const token = await loginAs(app, 'viewera@example.com', STRONG_PASSWORD);
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newmgr', email: 'newmgr@example.com', password: STRONG_PASSWORD, role: 'manager' });
    expect(res.status).toBe(403);
  });

  it('rejects manager (non-admin) from creating elevated-role accounts', async () => {
    await seedUser({ username: 'managera', email: 'managera@example.com', password: ALTERNATE_STRONG_PASSWORD, role: 'manager' });
    const token = await loginAs(app, 'managera@example.com', ALTERNATE_STRONG_PASSWORD);
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'boss', email: 'boss@example.com', password: STRONG_PASSWORD, role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('allows authorized admin to create a manager', async () => {
    await seedUser({ username: 'boss', email: 'boss@example.com', password: STRONG_PASSWORD, role: 'admin' });
    const token = await loginAs(app, 'boss@example.com', STRONG_PASSWORD);
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newmgr', email: 'newmgr@example.com', password: STRONG_PASSWORD, role: 'manager' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('manager');
  });

  it('allows authorized admin to create an admin', async () => {
    await seedUser({ username: 'boss', email: 'boss@example.com', password: STRONG_PASSWORD, role: 'admin' });
    const token = await loginAs(app, 'boss@example.com', STRONG_PASSWORD);
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'coadmin', email: 'coadmin@example.com', password: STRONG_PASSWORD, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('admin');
  });

  it('allows authorized admin to create an analyst and a viewer', async () => {
    await seedUser({ username: 'boss', email: 'boss@example.com', password: STRONG_PASSWORD, role: 'admin' });
    const token = await loginAs(app, 'boss@example.com', STRONG_PASSWORD);
    const analyst = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newan', email: 'newan@example.com', password: STRONG_PASSWORD, role: 'analyst' });
    expect(analyst.status).toBe(201);
    expect(analyst.body.data.user.role).toBe('analyst');
    const viewer = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newvw', email: 'newvw@example.com', password: STRONG_PASSWORD, role: 'viewer' });
    expect(viewer.status).toBe(201);
    expect(viewer.body.data.user.role).toBe('viewer');
  });

  it('rejects duplicate email', async () => {
    await User.create({ username: 'aaaa', email: 'dup@example.com', password: await bcrypt.hash('x'.repeat(12) + 'A1!', 4) });
    const res = await request(app).post('/api/auth/register').send({
      username: 'bbbb',
      email: 'dup@example.com',
      password: STRONG_PASSWORD,
    });
    expect(res.status).toBe(409);
  });

  it('logs in and accesses protected /auth/me', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'loginuser',
      email: 'login@example.com',
      password: STRONG_PASSWORD,
    });
    const login = await request(app).post('/api/auth/login').send({ identifier: 'login@example.com', password: STRONG_PASSWORD });
    expect(login.status).toBe(200);
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('login@example.com');
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: 'nobody', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects protected route without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('creates and lists tasks for admin', async () => {
    // Public registration can no longer create an admin, so seed one directly.
    await seedUser({ username: 'adminuser', email: 'adminuser@example.com', password: STRONG_PASSWORD, role: 'admin' });
    const token = await loginAs(app, 'adminuser@example.com', STRONG_PASSWORD);
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My flight monitor', type: 'flight_monitor', target: 'demo:flights', autoApprove: false });
    expect(create.status).toBe(201);

    const list = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.tasks.length).toBe(1);
    expect(list.body.data.tasks[0].target).toBe('demo:flights');
  });
});

