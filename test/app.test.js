import { test } from 'node:test';
import assert from 'node:assert/strict';
import session from 'express-session';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { validateBook } from '../src/books.js';
import { config } from '../src/config.js';
const settings = { name: 'Sinh viên kiểm thử', studentId: '123456', prefix: '456', vat: 10, secret: 'test-secret-only-12345678901234567890', production: false };
const valid = { code: '456-001', title: 'Sách thử', author: 'Tác giả', price: '100001' };
test('prefix, dynamic VAT and integer rounding', () => {
  const book = validateBook(valid, settings);
  assert.equal(book.priceAfterTax, 110001);
  for (let digit = 0; digit <= 9; digit++) {
    const cfg = config({ STUDENT_NAME: 'Test', STUDENT_ID: `12345${digit}`, SESSION_SECRET: settings.secret, MONGO_URI_READ: 'read', MONGO_URI_WRITE: 'write', MONGO_URI_SESSION: 'session' });
    assert.equal(cfg.vat, digit + 4);
    assert.equal(cfg.dbName, `DB_12345${digit}`);
  }
});
test('reject invalid prefix, prices and structured fields', () => {
  for (const change of [{ code: '000-001' }, { price: '-1' }, { price: '1.5' }, { price: '' }, { price: '1e3' }, { price: '1000000000' }, { title: { $ne: null } }]) assert.throws(() => validateBook({ ...valid, ...change }, settings));
});
test('alphanumeric student ID 23IT316 maps to correct database, prefix and VAT', () => {
  const env = { STUDENT_NAME: 'Test', STUDENT_ID: '23IT316', SESSION_SECRET: settings.secret, MONGO_URI_READ: 'read', MONGO_URI_WRITE: 'write', MONGO_URI_SESSION: 'session' };
  const cfg = config(env);
  assert.equal(cfg.dbName, 'DB_23IT316');
  assert.equal(cfg.prefix, '316');
  assert.equal(cfg.vat, 10);
  assert.equal(validateBook({ ...valid, code: '316-001', price: '100000' }, cfg).priceAfterTax, 110000);
  for (const id of ['23IT31X', '../316', '31', '23 IT316']) assert.throws(() => config({ ...env, STUDENT_ID: id }));
});
test('HTTP add/list, validation, CSRF, escaping, duplicate and cross-instance session', async () => {
  const books = [];
  const repo = { list: async () => books, ping: async () => {}, insert: async book => {
    if (books.some(item => item.code === book.code)) throw Object.assign(new Error('duplicate'), { code: 11000 });
    books.push(book);
  } };
  // Test double only. Production always constructs connect-mongo in server.js.
  const store = new session.MemoryStore();
  const app = createApp(settings, repo, store);
  const agent = request.agent(app);
  const first = await agent.get('/').expect(200);
  const csrf = first.text.match(/name="_csrf" value="([^"]+)"/)[1];
  await agent.post('/books').type('form').send(valid).expect(403);
  await agent.post('/books').type('form').send({ ...valid, code: '000', _csrf: csrf }).expect(400);
  assert.equal(books.length, 0);
  await agent.post('/books').type('form').send({ ...valid, title: '<script>alert(1)</script>', _csrf: csrf }).expect(303);
  assert.equal(books[0].priceAfterTax, 110001);
  const list = await agent.get('/').expect(200);
  assert.match(list.text, /&lt;script&gt;/);
  assert.match(list.text, /Đã thêm sách/);
  await agent.post('/books').type('form').send({ ...valid, _csrf: csrf }).expect(409);
  const secondApp = createApp(settings, repo, store);
  const other = await request(secondApp).get('/').set('Cookie', first.headers['set-cookie'][0].split(';')[0]).expect(200);
  assert.match(other.text, /Lượt xem trong phiên: 3/);
  await agent.get('/missing').expect(404);
  await agent.get('/health').expect(200);
});
test('database outage returns 503 without exposing credentials', async () => {
  const fail = async () => { throw new Error('mongodb://secret'); };
  const app = createApp(settings, { list: fail, ping: fail }, new session.MemoryStore());
  const response = await request(app).get('/').expect(503);
  assert.ok(!response.text.includes('mongodb://secret'));
  await request(app).get('/health').expect(503);
});
