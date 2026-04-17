console.log('SERVER ENTRY');
import express from 'express';
console.log('import express OK');
import fs from 'fs';
console.log('import fs OK');
import path from 'path';
console.log('import path OK');
import { fileURLToPath } from 'url';
console.log('import fileURLToPath OK');
import aiRouter from './routes/ai.js';
console.log('import aiRouter OK');
import cameraRouter from './routes/camera.js';
console.log('import cameraRouter OK');
import charactersRouter from './routes/characters.js';
import memoryRouter from './routes/memory.js';
import claudeRouter from './routes/claude.js';
console.log('import claudeRouter OK');
console.log('import charactersRouter OK');
import { engine } from './services/engineInstance.js';
console.log('import engine OK');
import { resolveSafeImagePath } from './utils/safeImagePath.js';
console.log('import resolveSafeImagePath OK');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Global error handlers — capture uncaught errors and unhandled rejections
// into a file so local runs produce a diagnosable log (server_error.log).
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException', err);
  try {
    const logPath = path.resolve(__dirname, '../server_error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] uncaughtException: ${err && err.stack ? err.stack : String(err)}\n`);
  } catch (e) {
    // best-effort logging
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection', reason);
  try {
    const logPath = path.resolve(__dirname, '../server_error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] unhandledRejection: ${String(reason)}\n`);
  } catch (e) {
    // best-effort logging
  }
});
const clientCandidates = [
  path.resolve(__dirname, '../client/the-grid'),
  path.resolve(process.cwd(), 'client/the-grid')
];
const clientDir = clientCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')));

if (!clientDir) {
  throw new Error('Could not locate frontend index.html (expected in ../client or ./client).');
}

const app = express();
const PORT = process.env.PORT || 3000;

const cloudinaryRequiredVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const missingCloudinaryVars = cloudinaryRequiredVars.filter((name) => !process.env[name]);
const cloudinaryConfigured = missingCloudinaryVars.length === 0;

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
app.use('/api/characters', charactersRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/claude', claudeRouter);

// /api/chat — unified chat endpoint used by the-grid frontend
app.post('/api/chat', async (req, res) => {
  const character = (req.body?.character || req.body?.room || '').toLowerCase().trim();
  if (!character) return res.status(400).json({ ok: false, error: 'character required' });

  const text = (req.body?.message || req.body?.text || '').trim();
  if (!text) return res.status(400).json({ ok: false, error: 'message required' });

  // Forward to the characters chat handler
  req.params = { id: character };
  req.body = { ...req.body, text };

  try {
    const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/characters/${character}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

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


// Serve generated images (persisted via Render disk mounted at /images)
const imagesDir = path.resolve(__dirname, '../images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
app.get('/images/:filename', (req, res) => {
  const safeImagePath = resolveSafeImagePath(imagesDir, req.params.filename);
  if (!safeImagePath) {
    res.status(404).json({ ok: false, error: 'Image not found' });
    return;
  }

  if (!fs.existsSync(safeImagePath)) {
    res.status(404).json({ ok: false, error: 'Image not found' });
    return;
  }

  res.sendFile(safeImagePath, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ ok: false, error: 'Failed to serve image' });
    }
  });
});

// Serve gallery page
const galleryDir = path.resolve(__dirname, '../gallery');
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
app.use('/gallery', express.static(galleryDir));

// Serve profile pictures
const profilePicsDir = path.resolve(__dirname, '../profile_pictures');
if (fs.existsSync(profilePicsDir)) {
  app.use('/profile_pictures', express.static(profilePicsDir));
}

// Serve src/engine/stories so nina-room.html can import beats as ES modules
const srcDir = path.resolve(__dirname, '../src');
if (fs.existsSync(srcDir)) {
  app.use('/src', express.static(srcDir));
}

app.use(express.static(clientDir));

app.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({
    ok: true,
    service: 'aira-web',
    port: PORT,
    cloudinary: {
      configured: cloudinaryConfigured,
      missing: missingCloudinaryVars
    }
  });
});

app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AIRA Web running at http://localhost:${PORT}`);
  if (cloudinaryConfigured) {
    console.log('Cloudinary status: configured');
  } else {
    console.warn(`Cloudinary status: missing env vars -> ${missingCloudinaryVars.join(', ')}`);
  }
});
