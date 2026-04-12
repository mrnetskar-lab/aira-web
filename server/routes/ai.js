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

router.post('/emotion', (req, res) => {
  const preset = req.body?.preset || 'neutral';
  engine.orchestrator.setEmotion(preset);
  res.json({ ok: true, preset, tension: engine.orchestrator.getState().tension });
});

router.get('/tune', (_req, res) => {
  res.json({ ok: true, tuning: engine.tuning });
});

router.post('/tune', (req, res) => {
  const patch = req.body || {};
  engine.tune(patch);
  res.json({ ok: true, tuning: engine.tuning });
});

router.post('/tick', async (_req, res) => {
  try {
    const response = await engine.orchestrator.tick();
    return res.json({ ok: true, response: response || null });
  } catch (error) {
    console.error('Tick error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/patches', (_req, res) => {
  res.json({
    ok: true,
    patches: engine.patchWriter.getPending(),
    issues: engine.observer.getIssues()
  });
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

router.post('/mute', (req, res) => {
  const { name, muted } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: 'name required' });
  if (muted) {
    engine.orchestrator.brain.mute(name);
  } else {
    engine.orchestrator.brain.unmute(name);
  }
  res.json({ ok: true, muted: engine.orchestrator.brain.getMuted() });
});

router.post('/aira/push', (_req, res) => {
  if (engine.orchestrator.gm?.forcePresence) {
    engine.orchestrator.gm.forcePresence(engine.orchestrator.state);
  }
  res.json({ ok: true, aira: engine.orchestrator.state.aira });
});

router.post('/reset', (_req, res) => {
  engine.memory.clear();
  engine.focus.clear();
  engine.orchestrator.reset();
  res.json({ ok: true });
});

export default router;
