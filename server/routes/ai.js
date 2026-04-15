import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from '../services/engineInstance.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHARS_DIR = path.resolve(__dirname, '../../characters');

function characterExists(id) {
  const p = path.join(CHARS_DIR, `${id}.json`);
  return fs.existsSync(p);
}

function loadCharacterHistory(id) {
  const p = path.join(CHARS_DIR, `${id}.history.json`);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return [];
  }
}

function saveCharacterHistory(id, history) {
  const p = path.join(CHARS_DIR, `${id}.history.json`);
  fs.writeFileSync(p, JSON.stringify(history.slice(-200), null, 2), 'utf-8');
}

function syncWorldTurnToCharacterHistory(input, responses = []) {
  const userText = String(input || '').trim();
  if (!userText || !Array.isArray(responses) || responses.length === 0) return;

  for (const response of responses) {
    const agentName = String(response?.agent || '').trim();
    const spoken = String(response?.spoken || '').trim();
    if (!agentName || !spoken) continue;

    const charId = agentName.toLowerCase();
    if (!characterExists(charId)) continue;

    const history = loadCharacterHistory(charId);
    history.push({ role: 'user', content: userText });
    history.push({ role: 'assistant', content: spoken });
    saveCharacterHistory(charId, history);
  }
}

router.post('/run', async (req, res) => {
  try {
    const input = String(req.body?.input || '').trim();

    if (!input) {
      return res.status(400).json({
        ok: false,
        error: 'Input is required.'
      });
    }

    const activeApp      = req.body?.context?.active_app    || null;
    const focusCharacter = req.body?.context?.focusCharacter || null;
    const beatContext    = req.body?.context?.beatContext    || null;
    const result = await engine.orchestrator.run(input, { activeApp, focusCharacter, beatContext });

    // Keep World Chat and Messenger in sync by writing world turns into
    // the same per-character history files used by /api/characters/:id/chat.
    syncWorldTurnToCharacterHistory(input, result?.responses || []);

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
    const result = await engine.orchestrator.tick();
    if (!result) return res.json({ ok: true, response: null, storyBeat: null });
    const { storyBeat, ...response } = result;
    return res.json({ ok: true, response, storyBeat: storyBeat || null });
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

router.post('/state/patch', (req, res) => {
  const patch = req.body || {};
  const state = engine.orchestrator.state;

  const clamp01 = (v) => Math.max(0, Math.min(1, Number(v)));

  if (typeof patch.tension    === 'number') state.tension    = clamp01(patch.tension);
  if (typeof patch.randomness === 'number') state.randomness = clamp01(patch.randomness);

  if (patch.relationships) {
    for (const [name, fields] of Object.entries(patch.relationships)) {
      if (!state.relationships[name]) continue;
      for (const [key, val] of Object.entries(fields)) {
        if (typeof val === 'number') state.relationships[name][key] = clamp01(val);
      }
    }
  }

  if (patch.aira) {
    if (!state.aira) state.aira = {};
    for (const [key, val] of Object.entries(patch.aira)) {
      if (typeof val === 'number') state.aira[key] = clamp01(val);
    }
  }

  if (patch.investigation) {
    if (!state.investigation) state.investigation = {};
    for (const [key, val] of Object.entries(patch.investigation)) {
      if (typeof val === 'number') state.investigation[key] = clamp01(val);
    }
  }

  res.json({ ok: true, state: engine.orchestrator.getState() });
});

export default router;
