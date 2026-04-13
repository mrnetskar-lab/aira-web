import { createEngine } from '../../src/engine/createEngine.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const engine = createEngine();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHARS_DIR = path.resolve(__dirname, '../../characters');

function hydrateEngineMemoryFromCharacterHistory() {
	if (!fs.existsSync(CHARS_DIR)) return;

	const charNameById = {};
	const charFiles = fs.readdirSync(CHARS_DIR).filter((f) => f.endsWith('.json') && !f.endsWith('.history.json'));

	for (const filename of charFiles) {
		const id = filename.replace(/\.json$/i, '').toLowerCase();
		try {
			const raw = fs.readFileSync(path.join(CHARS_DIR, filename), 'utf-8');
			const parsed = JSON.parse(raw);
			charNameById[id] = String(parsed?.name || id).trim();
		} catch {
			charNameById[id] = id;
		}
	}

	const historyFiles = fs.readdirSync(CHARS_DIR).filter((f) => f.endsWith('.history.json'));
	const now = Date.now();
	let loaded = 0;

	for (const filename of historyFiles) {
		const id = filename.replace(/\.history\.json$/i, '').toLowerCase();
		const characterName = charNameById[id] || id;
		const historyPath = path.join(CHARS_DIR, filename);

		let history = [];
		try {
			history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
		} catch {
			history = [];
		}

		if (!Array.isArray(history) || history.length === 0) continue;

		const trimmed = history.slice(-80);
		trimmed.forEach((item, index) => {
			const role = String(item?.role || '').toLowerCase();
			const text = String(item?.content || '').trim();
			if (!text) return;

			engine.memory.store({
				role: role === 'assistant' ? characterName : 'user',
				text,
				time: now - (trimmed.length - index) * 1000,
				weight: 1,
			});
			loaded += 1;
		});
	}

	if (loaded > 0) {
		console.log(`[MemorySync] Hydrated ${loaded} entries from character history files.`);
	}
}

hydrateEngineMemoryFromCharacterHistory();
