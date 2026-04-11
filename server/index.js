import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRouter from './routes/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '../client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

app.use('/api/ai', aiRouter);
app.use(express.static(clientDir));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'aira-web', port: PORT });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AIRA Web running at http://localhost:${PORT}`);
});