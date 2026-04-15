// ── Memory Query ──────────────────────────────────────────────────────────────
// Returns top-k relevant memories scored by recency + importanceScore.

import { loadRecent } from './memoryStore.js';

export function queryRelevantMemories(opts = {}) {
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
    const posFromEnd = len - idx; // 1 = newest
    const recencyNorm = posFromEnd / len;
    const imp = typeof m.importanceScore === 'number' ? m.importanceScore : 0.5;
    const score = recencyWeight * recencyNorm + importanceWeight * imp;
    return { memory: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => s.memory);
}
