export function config(env = process.env) {
  const required = ['STUDENT_NAME', 'STUDENT_ID', 'MONGODB_READ_URI', 'MONGODB_WRITE_URI', 'MONGODB_SESSION_URI', 'SESSION_SECRET'];
  for (const key of required) if (!env[key]?.trim()) throw new Error(`Missing ${key}`);
  if (!/^\d{3,20}$/.test(env.STUDENT_ID)) throw new Error('STUDENT_ID must contain 3-20 digits');
  if (env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  if (env.MONGODB_READ_URI === env.MONGODB_WRITE_URI) throw new Error('Read and write accounts must be distinct');
  return { name: env.STUDENT_NAME, studentId: env.STUDENT_ID, prefix: env.STUDENT_ID.slice(-3), vat: Number(env.STUDENT_ID.slice(-1)) + 4, dbName: `DB_${env.STUDENT_ID}`, readUri: env.MONGODB_READ_URI, writeUri: env.MONGODB_WRITE_URI, sessionUri: env.MONGODB_SESSION_URI, secret: env.SESSION_SECRET, production: env.NODE_ENV === 'production', port: Number(env.PORT || 3000) };
}
