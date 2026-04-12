import express from 'express';
import { engine } from '../services/engineInstance.js';

const router = express.Router();

router.post('/run', async (req, res) => {
  try {
    const input = String(req.body?.input || '').trim();

    if (!input) {
      return res.status(400).json({
        ok: false,
        error: 'Input is required.'
      });
    }

    const activeApp = req.body?.context?.active_app || null;
    const result = await engine.orchestrator.run(input, { activeApp });

    return res.json({
      ok: true,
      result,
      state: engine.orchestrator.getState(),
      recentMemory: engine.memory.getRecent(12),
      issues: engine.observer.getIssues(),
      patches: engine.patchWriter.getPending()
    });
  } catch (error) {
    console.error('AI route error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Internal server error.'
    });
  }
});

router.get('/state', (_req, res) => {
  res.json({
    ok: true,
    state: engine.orchestrator.getState(),
    focus: engine.focus.getCurrent(),
    memoryCount: engine.memory.entries.length,
    issueCount: engine.observer.getIssues().length
  });
});

router.post('/reset', (_req, res) => {
  engine.memory.clear();
  engine.focus.clear();
  engine.orchestrator.reset();
  res.json({ ok: true });
});

export default router;
