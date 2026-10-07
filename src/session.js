import session from 'express-session';
import MongoStore from 'connect-mongo';
export function createSessionStore(config) {
  const store = MongoStore.create({ mongoUrl: config.sessionUri, dbName: config.dbName, collectionName: 'sessions', autoRemove: 'disabled', ttl: 86400, mongoOptions: { serverSelectionTimeoutMS: 10000 } });
  store.on('error', () => console.error('Session store unavailable'));
  return store;
}
export function sessionMiddleware(config, store) {
  if (!store) throw new Error('Persistent session store is required');
  return session({ name: 'books.sid', secret: config.secret, store, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: config.production, maxAge: 86400000 } });
}
