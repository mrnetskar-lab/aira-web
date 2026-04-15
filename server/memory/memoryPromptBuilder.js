// ── Memory Prompt Builder ─────────────────────────────────────────────────────
// Builds a short text block to inject into the AI system prompt.

import { queryRelevantMemories } from './memoryQuery.js';

export function buildPromptInjection(opts = {}) {
  const { storyId, topK = 5, maxChars = 800 } = opts;
  const memories = queryRelevantMemories({ storyId, topK, lastN: 200 });
  if (!memories || memories.length === 0) return '';

  const parts = memories.map(m => {
    const tm = m.beatCompletedAt
      ? new Date(m.beatCompletedAt).toISOString().split('T')[0]
      : 'unknown-date';
    const beat = m.beatId || 'unknown-beat';
    const lines = (m.salientUtterances || []).slice(0, 2).map(s => s.replace(/\s+/g, ' ').trim());
    const person = m.otherPerson?.name
      ? `${m.otherPerson.name} (${m.otherPerson.appearance || 'appearance'})`
      : '';
    const imp = typeof m.importanceScore === 'number'
      ? `imp=${m.importanceScore.toFixed(2)}`
      : '';
    const snippet = lines.length ? lines.join(' | ') : '';
    return `[${beat}|${tm}] ${snippet} ${person} ${imp}`.trim();
  });

  let injection = `Relevant memories:\n` + parts.join('\n');
  if (injection.length > maxChars) injection = injection.slice(0, maxChars - 3) + '...';
  return injection;
}
