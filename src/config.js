export function config(env = process.env) {
  env = { ...env, MONGO_URI_SESSION: env.SESSION_URI || env.MONGO_URI_SESSION };
  const required = ['STUDENT_NAME', 'STUDENT_ID', 'MONGO_URI_READ', 'MONGO_URI_WRITE', 'MONGO_URI_SESSION', 'SESSION_SECRET'];
  for (const key of required) if (!env[key]?.trim()) throw new Error(`Missing ${key}`);
  if (!/^[A-Za-z0-9]{0,17}\d{3}$/.test(env.STUDENT_ID)) throw new Error('STUDENT_ID must contain 3-20 letters or digits and end with 3 digits');
  if (env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  if (env.MONGO_URI_READ === env.MONGO_URI_WRITE) throw new Error('Read and write accounts must be distinct');
  return { name: env.STUDENT_NAME, studentId: env.STUDENT_ID, prefix: env.STUDENT_ID.slice(-3), vat: Number(env.STUDENT_ID.slice(-1)) + 4, dbName: `DB_${env.STUDENT_ID}`, readUri: env.MONGO_URI_READ, writeUri: env.MONGO_URI_WRITE, sessionUri: env.MONGO_URI_SESSION, secret: env.SESSION_SECRET, production: env.NODE_ENV === 'production', port: Number(env.PORT || 3000) };
}
