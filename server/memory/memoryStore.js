// ── Memory Store ─────────────────────────────────────────────────────────────
// Persists story memory entries to memories.jsonl (one JSON object per line).
// Uses ESM to match the rest of the Aira_web server.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEM_PATH = path.join(__dirname, '../../memories.jsonl');

export function saveMemory(memory) {
  const entry = { ...memory, savedAt: new Date().toISOString() };
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(MEM_PATH, line, { encoding: 'utf8' });
  return entry;
}

export function loadRecent(n = 200) {
  if (!fs.existsSync(MEM_PATH)) return [];
  const lines = fs.readFileSync(MEM_PATH, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-n).map(l => JSON.parse(l));
}
