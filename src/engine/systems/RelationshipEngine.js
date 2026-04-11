export class RelationshipEngine {
  update({ input, state, context }) {
    const text = String(input || '').toLowerCase();

    if (!state.relationships || !state.cast) return;

    for (const name of Object.keys(state.relationships)) {
      const rel = state.relationships[name];
      const char = state.cast[name];

      // --- FLIRT / POSITIVE ---
      if (/(like|love|cute|beautiful|miss you)/.test(text)) {
        rel.attraction += 0.05;
        rel.trust += 0.03;
        char.hidden.attraction += 0.05;
      }

      // --- NEGATIVE / CONFLICT ---
      if (/(hate|annoying|leave|shut up)/.test(text)) {
        rel.trust -= 0.06;
        rel.hurt += 0.08;
        char.hidden.hurt += 0.08;
      }

      // --- IGNORING (simple heuristic) ---
      if (!text.includes(name.toLowerCase())) {
        rel.jealousy += 0.02;
        char.hidden.jealousy += 0.02;
      }

      // Clamp values
      clamp(rel);
      clamp(char.hidden);
    }
  }
}

/* ---------------- HELPERS ---------------- */

function clamp(obj) {
  for (const key of Object.keys(obj)) {
    obj[key] = Math.max(0, Math.min(1, obj[key]));
  }
}
