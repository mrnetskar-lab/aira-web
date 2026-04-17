import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASKS_FILE = path.resolve(__dirname, '../claude_tasks.json');

function loadTasks() {
  try {
    if (!fs.existsSync(TASKS_FILE)) return [];
    const raw = fs.readFileSync(TASKS_FILE, 'utf-8') || '[]';
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load Claude tasks:', e);
    return [];
  }
}

function saveTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save Claude tasks:', e);
    throw e;
  }
}

// Simple webhook that expects a shared secret in CLAUDE_WEBHOOK_SECRET.
// Claude (or any sender) should set `Authorization: Bearer <secret>` or
// `X-CLAUDE-TOKEN: <secret>` on requests.
router.post('/webhook', (req, res) => {
  const secret = process.env.CLAUDE_WEBHOOK_SECRET;
  const authHeader = String(req.get('authorization') || '').trim();
  const tokenHeader = String(req.get('x-claude-token') || '').trim();

  if (!secret) {
    return res.status(400).json({ ok: false, error: 'CLAUDE_WEBHOOK_SECRET not configured on server.' });
  }

  let authorized = false;
  if (authHeader.startsWith('Bearer ')) {
    authorized = authHeader.slice(7) === secret;
  }
  if (!authorized && tokenHeader) authorized = tokenHeader === secret;

  if (!authorized) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const payload = req.body || {};
  const entry = { receivedAt: new Date().toISOString(), payload };
  const tasks = loadTasks();
  tasks.push(entry);
  try {
    saveTasks(tasks);
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to persist task' });
  }

  return res.json({ ok: true, saved: true, receivedAt: entry.receivedAt });
});

// Read tasks (requires the same secret)
router.get('/tasks', (req, res) => {
  const secret = process.env.CLAUDE_WEBHOOK_SECRET;
  const authHeader = String(req.get('authorization') || '').trim();
  if (!secret) return res.status(400).json({ ok: false, error: 'CLAUDE_WEBHOOK_SECRET not configured on server.' });
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== secret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const tasks = loadTasks();
  res.json({ ok: true, tasks });
});

export default router;
