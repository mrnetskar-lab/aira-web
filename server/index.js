import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRouter from './routes/ai.js';
import cameraRouter from './routes/camera.js';
import { engine } from './services/engineInstance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientCandidates = [
  path.resolve(__dirname, '../client'),
  path.resolve(process.cwd(), 'client')
];
const clientDir = clientCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')));

if (!clientDir) {
  throw new Error('Could not locate frontend index.html (expected in ../client or ./client).');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const noStorePath =
    req.path === '/' ||
    req.path.endsWith('.html') ||
    req.path.endsWith('.js') ||
    req.path.endsWith('.css') ||
    req.path.endsWith('.json') ||
    req.path.endsWith('.svg');

  if (noStorePath) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
});

app.use('/api/ai', aiRouter);
app.use('/api/camera', cameraRouter);

// Hard guard: always serve JSON from this route even if router wiring changes.
app.get('/api/ai/patches', (_req, res) => {
  res.json({
    ok: true,
    patches: engine.patchWriter.getPending(),
    issues: engine.observer.getIssues()
  });
});

// Helpful response when reset is queried with GET instead of POST.
app.get('/api/ai/reset', (_req, res) => {
  res.status(405).json({
    ok: false,
    error: 'Use POST /api/ai/reset'
  });
});

// Serve generated images
const imagesDir = path.resolve(__dirname, '../images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
app.use('/images', express.static(imagesDir));

// Serve gallery page
const galleryDir = path.resolve(__dirname, '../gallery');
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
app.use('/gallery', express.static(galleryDir));

app.use(express.static(clientDir));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'aira-web', port: PORT });
});

app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AIRA Web running at http://localhost:${PORT}`);
});
