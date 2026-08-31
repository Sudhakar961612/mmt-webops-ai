import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectDB, disconnectDB, startMemoryMongo } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { ExtractionSchema } from '../../src/models/ExtractionSchema.js';
import bcrypt from 'bcryptjs';

const PASSWORD = 'Dev@Secure#2026!';

async function seedAdmin() {
  const hashed = await bcrypt.hash(PASSWORD, 4);
  return User.create({ username: 'schemaadmin', email: 'schemaadmin@example.com', password: hashed, role: 'admin' });
}

async function loginAs(app) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'schemaadmin@example.com', password: PASSWORD });
  return res.body.data.token;
}

describe('Extraction Schema versioning & testing', () => {
  let app;
  let token;

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
    await ExtractionSchema.deleteMany({});
    await seedAdmin();
    token = await loginAs(app);
  });

  const createSchema = (fields) =>
    request(app)
      .post('/api/schemas')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Schema A', schemaType: 'custom', fields, targetSelector: '#main' });

  it('creates a schema with version 1', async () => {
    const res = await createSchema([{ name: 'price', type: 'string', selector: '#price' }]);
    expect(res.status).toBe(201);
    expect(res.body.data.version).toBe(1);
  });

  it('does not increment version when fields are unchanged', async () => {
    const created = await createSchema([{ name: 'price', type: 'string', selector: '#price' }]);
    const res = await request(app)
      .patch(`/api/schemas/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fields: [{ name: 'price', type: 'string', selector: '#price' }] });
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(1);
  });

  it('increments version when fields change', async () => {
    const created = await createSchema([{ name: 'price', type: 'string', selector: '#price' }]);
    const res = await request(app)
      .patch(`/api/schemas/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fields: [
          { name: 'price', type: 'number', selector: '#price' },
          { name: 'availability', type: 'string', selector: '#avail' },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(2);
  });

  it('preserves other schema fields while versioning on field change', async () => {
    const created = await createSchema([{ name: 'price', type: 'string', selector: '#price' }]);
    const res = await request(app)
      .patch(`/api/schemas/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fields: [{ name: 'price', type: 'string', selector: '#newprice' }],
        description: 'Updated description',
        status: 'TESTING',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(2);
    expect(res.body.data.description).toBe('Updated description');
    expect(res.body.data.status).toBe('TESTING');
    expect(res.body.data.name).toBe('Schema A');
    expect(res.body.data.schemaType).toBe('custom');
  });

  it('updates non-fields without bumping the version', async () => {
    const created = await createSchema([{ name: 'price', type: 'string', selector: '#price' }]);
    const res = await request(app)
      .patch(`/api/schemas/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Just metadata' });
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.description).toBe('Just metadata');
  });

  it('tests a schema against sample HTML (jsdom)', async () => {
    const created = await createSchema([{ name: 'price', type: 'string', selector: '#price' }]);
    const res = await request(app)
      .post(`/api/schemas/${created.body.data._id}/test`)
      .set('Authorization', `Bearer ${token}`)
      .send({ html: '<html><body><div id="price">₹5,400</div></body></html>' });
    expect(res.status).toBe(200);
    expect(res.body.data.results).toMatchObject({ price: '₹5,400' });
    expect(res.body.data.errors).toHaveLength(0);
  });
});