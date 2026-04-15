// ── Memory Routes ─────────────────────────────────────────────────────────────
// POST /api/memory/save       — persist a beat memory entry
// GET  /api/memory/recent     — return last 50 entries
// GET  /api/memory/injection  — return prompt-ready text string

import { Router } from 'express';
import { saveMemory, loadRecent } from '../memory/memoryStore.js';
import { buildPromptInjection } from '../memory/memoryPromptBuilder.js';

const router = Router();

router.post('/save', (req, res) => {
  try {
    const saved = saveMemory(req.body);
    res.json({ ok: true, saved });
  } catch (err) {
    console.error('[memory/save]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/recent', (req, res) => {
  try {
    const n = parseInt(req.query.n || '50', 10);
    res.json(loadRecent(n));
  } catch (err) {
    console.error('[memory/recent]', err);
    res.status(500).json([]);
  }
});

router.get('/injection', (req, res) => {
  try {
    const storyId = req.query.storyId || 'second-time-around';
    const topK = parseInt(req.query.topK || '5', 10);
    const maxChars = parseInt(req.query.maxChars || '800', 10);
    const injection = buildPromptInjection({ storyId, topK, maxChars });
    res.type('text/plain').send(injection || '(no memories yet)');
  } catch (err) {
    console.error('[memory/injection]', err);
    res.status(500).send('');
  }
});

export default router;
