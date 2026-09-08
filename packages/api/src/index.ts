import { createApp } from './app';
import { initDb } from './db';

const PORT = process.env.PORT ?? 3001;

initDb();

const app = createApp();

app.listen(Number(PORT), () => {
  console.log(`\nDailyFlow API  →  http://localhost:${PORT}`);
  console.log(`Health check   →  http://localhost:${PORT}/health\n`);
});
