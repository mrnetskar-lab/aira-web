export class RelationshipEngine {
  update({ input, state, context }) {
    const text = String(input || '').toLowerCase();

    if (!state.relationships || !state.cast) return;

    for (const name of Object.keys(state.relationships)) {
      const rel = state.relationships[name];
      const char = state.cast[name];

      // Ensure extended fields exist
      rel.interest          = rel.interest          ?? 0.35;
      rel.romanticTension   = rel.romanticTension   ?? 0.15;
      rel.exclusivityPressure = rel.exclusivityPressure ?? 0.0;
      rel.betrayalSensitivity = rel.betrayalSensitivity ?? 0.25;
      rel.intimacyReadiness = rel.intimacyReadiness ?? 0.0;
      rel.avoidance         = rel.avoidance         ?? 0.0;
      rel.longing           = rel.longing           ?? 0.0;

      // --- FLIRT / POSITIVE ---
      if (/(like|love|cute|beautiful|miss you)/.test(text)) {
        rel.attraction += 0.05;
        rel.trust += 0.03;
        rel.interest += 0.04;
        rel.romanticTension += 0.03;
        char.hidden.attraction += 0.05;
      }

      // --- NEGATIVE / CONFLICT ---
      if (/(hate|annoying|leave|shut up)/.test(text)) {
        rel.trust -= 0.06;
        rel.hurt += 0.08;
        rel.avoidance += 0.04;
        char.hidden.hurt += 0.08;
      }

      // --- IGNORING (simple heuristic) ---
      if (!text.includes(name.toLowerCase())) {
        rel.jealousy += 0.02;
        rel.longing += 0.01;
        char.hidden.jealousy += 0.02;
      }

      // --- INTIMACY READINESS: requires trust + comfort + attraction ---
      if (rel.trust > 0.6 && rel.comfort > 0.6 && rel.attraction > 0.5) {
        rel.intimacyReadiness = Math.min(1, rel.intimacyReadiness + 0.02);
      }

      // --- ROMANTIC TENSION decays slowly at low engagement ---
      if (rel.romanticTension > 0.1) {
        rel.romanticTension = Math.max(0, rel.romanticTension - 0.005);
      }

      // Clamp all values
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
