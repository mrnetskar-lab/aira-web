import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CharacterAIService } from '../../src/engine/services/CharacterAIService.js';
import { CHARACTER_NAME_BY_ID, CHARACTER_PROFILES } from '../../src/engine/brain/characterProfiles.js';
import { MemorySystem } from '../../src/engine/systems/MemorySystem.js';
import { EmotionSystem } from '../../src/engine/systems/EmotionSystem.js';
import { engine } from '../services/engineInstance.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHARS_DIR = path.resolve(__dirname, '../../characters');

const router = express.Router();
const aiService = new CharacterAIService();
const emotionSystem = new EmotionSystem();

// Per-character memory — persistent to disk
const memoryCache = {};

function getMemory(id) {
  if (!memoryCache[id]) {
    const mem = new MemorySystem(300);
    const p = path.join(CHARS_DIR, `${id}.memory.json`);
    if (fs.existsSync(p)) {
      try {
        const entries = JSON.parse(fs.readFileSync(p, 'utf-8'));
        entries.forEach(e => mem.store(e));
      } catch { /* ignore corrupt memory */ }
    }
    memoryCache[id] = mem;
  }
  return memoryCache[id];
}

function saveMemory(id) {
  const mem = memoryCache[id];
  if (!mem) return;
  const p = path.join(CHARS_DIR, `${id}.memory.json`);
  fs.writeFileSync(p, JSON.stringify(mem.entries, null, 2), 'utf-8');
}

// Per-character emotion state — in-memory is fine (resets on restart)
const emotionStates = {};

function withTimeout(promise, ms, message = 'AI request timed out') {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

function loadCharacter(id) {
  const p = path.join(CHARS_DIR, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function loadHistory(id) {
  const p = path.join(CHARS_DIR, `${id}.history.json`);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}

function saveHistory(id, history) {
  const p = path.join(CHARS_DIR, `${id}.history.json`);
  fs.writeFileSync(p, JSON.stringify(history.slice(-200), null, 2), 'utf-8');
}

// Shared chat logic — exported so /api/chat can call directly without HTTP round-trip
export async function handleCharacterChat(id, text) {
  const char = loadCharacter(id);
  if (!char) return { ok: false, error: 'Character not found', status: 404 };
  if (!text) return { ok: false, error: 'text required', status: 400 };

  const history = loadHistory(id);
  const characterName = CHARACTER_NAME_BY_ID[id] || char.name || id;
  const personality = CHARACTER_PROFILES[characterName] || {};

  // Emotion state
  if (!emotionStates[id]) emotionStates[id] = { tension: 0.1 };
  const emotionState = emotionStates[id];
  emotionSystem.analyzeInput(text, emotionState);

  // Persistent memory — recent + relevant
  const mem = getMemory(id);
  const recentMemory = mem.getRecent(8).map(e => ({ role: e.role, text: String(e.text || '') }));
  const relevantMemory = mem.search(text).slice(0, 3).map(e => ({ role: e.role, text: String(e.text || '') }));
  const combinedMemory = [...relevantMemory, ...recentMemory]
    .filter((e, i, arr) => arr.findIndex(x => x.text === e.text) === i)
    .slice(-10);

  // Fall back to history if memory is empty (first session)
  const contextMemory = combinedMemory.length
    ? combinedMemory
    : history.slice(-10).map(h => ({ role: h.role === 'assistant' ? characterName : 'user', text: String(h.content || '') }));

  let ai;
  try {
    ai = await withTimeout(
      aiService.generate({
        characterName,
        personality,
        input: text,
        temperature: 0.85,
        context: {
          active_app: { type: 'messages', mode: 'dm', visibility: 'private' },
          conversation: { responseMode: 'brief', topic: 'direct-message' },
          emotion: { tension: emotionState.tension },
          sceneFlow: {
            role: 'primary',
            mainSpeaker: characterName,
            followUpSpeaker: null,
            instruction: 'Answer as a private DM message.'
          },
          memory: contextMemory
        }
      }),
      20000
    );
  } catch (aiError) {
    console.warn('Character AI fallback used:', aiError.message);
    ai = { thought: null, spoken: 'Jeg er her. Svarte tregt akkurat nå, men vi kan fortsette.' };
  }

  const thought = String(ai?.thought || '').replace(/^\(|\)$/g, '').trim();
  const spoken = String(ai?.spoken || '').trim();
  const reply = (thought && spoken ? `*${thought}* ${spoken}` : spoken || '...').trim();

  const now = new Date().toISOString();
  history.push({ role: 'user', content: text, time: now });
  history.push({ role: 'assistant', content: reply, time: now });
  saveHistory(id, history);

  // Store in persistent memory
  mem.store({ role: 'user', text, time: Date.now(), weight: 1 });
  mem.store({ role: characterName, text: spoken || reply, thought: thought || null, time: Date.now(), weight: 1 });
  saveMemory(id);

  try {
    engine.memory.store({ role: 'user', text, time: Date.now(), weight: 1 });
    engine.memory.store({ role: characterName, text: spoken || reply, thought: thought || null, time: Date.now(), weight: 1 });
  } catch (syncError) {
    console.warn('Memory mirror failed (non-blocking):', syncError.message);
  }

  return { ok: true, reply, character: char.name };
}

// GET /api/characters — list all characters
const SYSTEM_CHARACTER_IDS = new Set(['aira']);

router.get('/', (_req, res) => {
  try {
    const files = fs.readdirSync(CHARS_DIR)
      .filter(f => f.endsWith('.json') && !f.includes('.history'));
    const characters = files.map(f => {
      const id = f.replace('.json', '');
      if (SYSTEM_CHARACTER_IDS.has(id)) return null;
      try { return { id, ...JSON.parse(fs.readFileSync(path.join(CHARS_DIR, f), 'utf-8')) }; }
      catch { return null; }
    }).filter(Boolean);
    res.json({ ok: true, characters });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/characters — create new character
router.post('/', (req, res) => {
  try {
    const { name, bio, personality, system_prompt, color } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ ok: false, error: 'name required' });

    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filePath = path.join(CHARS_DIR, `${id}.json`);

    const char = {
      id,
      name: name.trim(),
      bio: (bio || '').trim(),
      personality: (personality || '').trim(),
      system_prompt: (system_prompt || `Du er ${name.trim()}. Svar naturlig og kortfattet.`).trim(),
      color: color || '#6b7280',
      created_at: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(char, null, 2), 'utf-8');
    res.json({ ok: true, character: char });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/characters/:id — get single character with recent messages
router.get('/:id', (req, res) => {
  try {
    const char = loadCharacter(req.params.id);
    if (!char) return res.status(404).json({ ok: false, error: 'Character not found' });

    const history = loadHistory(req.params.id);
    const messages = history.slice(-20).map(h => ({
      role: h.role,
      text: String(h.content || ''),
      time: h.time || null,
    }));

    res.json({ ok: true, character: char, messages });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/characters/:id — update character
router.put('/:id', (req, res) => {
  try {
    const existing = loadCharacter(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, error: 'Not found' });

    const updated = { ...existing, ...req.body, id: req.params.id };
    const filePath = path.join(CHARS_DIR, `${req.params.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    res.json({ ok: true, character: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/characters/:id — delete character
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const reserved = ['lucy', 'sam', 'angie', 'hazel', 'nina', 'aira', 'iris', 'vale'];
  if (reserved.includes(id)) return res.status(403).json({ ok: false, error: 'Cannot delete core character' });

  const filePath = path.join(CHARS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: 'Not found' });
  fs.unlinkSync(filePath);
  res.json({ ok: true });
});

// POST /api/characters/:id/chat
router.post('/:id/chat', async (req, res) => {
  try {
    const text = (req.body?.text || '').trim();
    const result = await handleCharacterChat(req.params.id, text);
    res.status(result.status || 200).json(result);
  } catch (error) {
    console.error('Character chat route error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Character chat failed' });
  }
});

// DELETE /api/characters/:id/history
router.delete('/:id/history', (req, res) => {
  saveHistory(req.params.id, []);
  res.json({ ok: true });
});

export default router;
