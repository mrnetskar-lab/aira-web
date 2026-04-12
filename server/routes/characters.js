import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openai, getModelForCharacter } from '../services/openaiClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHARS_DIR = path.resolve(__dirname, '../../characters');
const HIST_DIR  = path.resolve(__dirname, '../../characters');

const router = express.Router();

function loadCharacter(id) {
  const p = path.join(CHARS_DIR, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function loadHistory(id) {
  const p = path.join(HIST_DIR, `${id}.history.json`);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}

function saveHistory(id, history) {
  const p = path.join(HIST_DIR, `${id}.history.json`);
  fs.writeFileSync(p, JSON.stringify(history.slice(-200), null, 2), 'utf-8');
}

// POST /api/characters/:id/chat
router.post('/:id/chat', async (req, res) => {
  const char = loadCharacter(req.params.id);
  if (!char) return res.status(404).json({ ok: false, error: 'Character not found' });

  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ ok: false, error: 'text required' });

  if (!openai) return res.status(500).json({ ok: false, error: 'No AI client configured' });

  const history = loadHistory(req.params.id);
  const messages = [{ role: 'system', content: char.system_prompt }];
  history.slice(-20).forEach(h => messages.push({ role: h.role, content: h.content }));
  messages.push({ role: 'user', content: text });

  const model = 'anthropic/claude-3.5-haiku';

  const resp = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.85,
    max_tokens: 300,
  });

  const reply = (resp.choices[0].message.content || '').trim() || '...';

  history.push({ role: 'user', content: text });
  history.push({ role: 'assistant', content: reply });
  saveHistory(req.params.id, history);

  return res.json({ ok: true, reply, character: char.name });
});

// DELETE /api/characters/:id/history
router.delete('/:id/history', (req, res) => {
  saveHistory(req.params.id, []);
  res.json({ ok: true });
});

export default router;
