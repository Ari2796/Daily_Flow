import { createApp } from './app';
import { initDb, db } from './db';

const PORT = process.env.PORT ?? 3001;

initDb();

// Seed a default dev user so the frontend works without a login flow.
// Safe to call on every startup — INSERT OR IGNORE is idempotent.
db.prepare(
  `INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`
).run('default-user', 'dev@dailyflow.local', 'Dev User');

const app = createApp();

app.listen(Number(PORT), () => {
  console.log(`\nDailyFlow API  →  http://localhost:${PORT}`);
  console.log(`Health check   →  http://localhost:${PORT}/health\n`);
});
