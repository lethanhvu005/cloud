import { config } from './config.js';
import { connectDatabase } from './database.js';
import { createSessionStore } from './session.js';
import { createApp } from './app.js';
try {
  const settings = config();
  const repository = await connectDatabase(settings);
  const store = createSessionStore(settings);
  const server = createApp(settings, repository, store).listen(settings.port, () => console.log(`Book Manager: http://localhost:${settings.port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.close(async () => { await Promise.allSettled([repository.close(), store.close()]); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
} catch (error) {
  console.error('Startup failed:', /^(Missing |STUDENT_ID |SESSION_SECRET |Read and write)/.test(error.message) ? error.message : 'Check MongoDB credentials, permissions and network access.');
  process.exit(1);
}
