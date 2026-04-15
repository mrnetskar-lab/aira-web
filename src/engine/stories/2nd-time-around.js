// server.js — enkel lokal server + memory store + query + prompt builder
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const MEM_PATH = path.join(__dirname, 'memories.jsonl');

//
// Simple memory store
//
function saveMemory(memory) {
  const entry = Object.assign({}, memory, { savedAt: new Date().toISOString() });
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(MEM_PATH, line, { encoding: 'utf8' });
  return entry;
}

function loadRecent(n = 200) {
  if (!fs.existsSync(MEM_PATH)) return [];
  const lines = fs.readFileSync(MEM_PATH, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-n).map(l => JSON.parse(l));
}

//
// Simple memory query (recency + importance)
//
function queryRelevantMemories(opts = {}) {
  const {
    storyId,
    lastN = 200,
    topK = 10,
    recencyWeight = 0.6,
    importanceWeight = 0.4,
  } = opts;

  const recent = loadRecent(lastN);
  const filtered = storyId ? recent.filter(m => m.storyId === storyId) : recent;
  if (filtered.length === 0) return [];

  const len = filtered.length;
  const scored = filtered.map((m, idx) => {
    const posFromEnd = len - idx; // 1..len, 1 = newest
    const recencyNorm = posFromEnd / len;
    const imp = typeof m.importanceScore === 'number' ? m.importanceScore : 0.5;
    const score = recencyWeight * recencyNorm + importanceWeight * imp;
    return { memory: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => s.memory);
}

//
// Prompt builder
//
function buildPromptInjection(opts = {}) {
  const { storyId, topK = 5, maxChars = 800 } = opts;
  const memories = queryRelevantMemories({ storyId, topK, lastN: 200 });
  if (!memories || memories.length === 0) return '';

  const parts = memories.map(m => {
    const tm = m.beatCompletedAt ? new Date(m.beatCompletedAt).toISOString().split('T')[0] : 'unknown-date';
    const beat = m.beatId || 'unknown-beat';
    const lines = (m.salientUtterances || []).slice(0,2).map(s => s.replace(/\s+/g, ' ').trim());
    const person = m.otherPerson && m.otherPerson.name ? `${m.otherPerson.name} (${m.otherPerson.appearance || 'appearance'})` : '';
    const imp = typeof m.importanceScore === 'number' ? `imp=${m.importanceScore.toFixed(2)}` : '';
    const snippet = lines.length ? lines.join(' | ') : '';
    return `[${beat}|${tm}] ${snippet} ${person} ${imp}`.trim();
  });

  let injection = `Relevant memories:\n` + parts.join('\n');
  if (injection.length > maxChars) injection = injection.slice(0, maxChars - 3) + '...';
  return injection;
}

//
// Express server + endpoints
//
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Save memory
app.post('/save-memory', (req, res) => {
  try {
    const memory = req.body;
    const saved = saveMemory(memory);
    res.json({ ok: true, saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Return recent memories
app.get('/memories', (req, res) => {
  try {
    const recent = loadRecent(50);
    res.json(recent);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// Prompt injection endpoint
app.get('/prompt-injection', (req, res) => {
  try {
    const storyId = req.query.storyId || 'second-time-around';
    const topK = parseInt(req.query.topK || '5', 10);
    const maxChars = parseInt(req.query.maxChars || '800', 10);
    const injection = buildPromptInjection({ storyId, topK, maxChars });
    res.type('text/plain').send(injection);
  } catch (err) {
    console.error(err);
    res.status(500).send('');
  }
});

// Quick health
app.get('/ping', (req, res) => res.send('pong'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
