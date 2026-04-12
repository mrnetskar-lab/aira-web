export class AiraPresenceSystem {
  update({ input, state, context }) {
    if (!state.aira) {
      state.aira = createDefaultAiraState();
    }

    if (!state.investigation) {
      state.investigation = createDefaultInvestigationState();
    }

    const text = String(input || '').toLowerCase();
    const tension = state.tension || 0;
    const relationships = state.relationships || {};

    // Base passive drift
    state.aira.presenceLevel = clamp01(
      state.aira.presenceLevel + getPassivePresenceGain(tension)
    );

    // Mystery-seeking input raises awareness
    if (/\b(aira|weird|shadow|watching|voice|strange|someone here)\b/.test(text)) {
      state.investigation.awarenessLevel = clamp01(state.investigation.awarenessLevel + 0.08);
      state.investigation.suspicion = clamp01(state.investigation.suspicion + 0.06);
      state.aira.anomalyLevel = clamp01(state.aira.anomalyLevel + 0.05);
    }

    // Emotional intensity opens the room up
    if (/\b(love|need you|hate|leave|sorry|miss you)\b/.test(text)) {
      state.aira.presenceLevel = clamp01(state.aira.presenceLevel + 0.03);
      state.aira.anomalyLevel = clamp01(state.aira.anomalyLevel + 0.02);
    }

    // Presence grows with accumulated room tension
    if (tension > 0.6) {
      state.aira.presenceLevel = clamp01(state.aira.presenceLevel + 0.02);
    }

    // Choose a preferred target based on strongest relationship signal
    state.aira.preferredTarget = selectPreferredTarget(relationships);

    // Stage manifestation
    state.aira.manifestation = getManifestationStage(state.aira);

    // Unlock milestones
    if (state.aira.presenceLevel > 0.18) {
      state.aira.imagePresenceUnlocked = true;
      state.aira.imageStage = Math.max(state.aira.imageStage || 0, 1);
    }

    if (state.aira.presenceLevel > 0.35) {
      state.aira.whisperStage = Math.max(state.aira.whisperStage || 0, 1);
    }

    if (state.aira.presenceLevel > 0.55) {
      state.aira.voiceUnlocked = true;
      state.aira.whisperStage = Math.max(state.aira.whisperStage || 0, 2);
    }

    // Interference chance scales with presence and anomaly
    state.aira.interferenceChance = clamp01(
      0.008 +
      state.aira.presenceLevel * 0.10 +
      state.aira.anomalyLevel * 0.10
    );

    // Interference profile unlocks
    if (!state.aira.interferenceProfile) {
      state.aira.interferenceProfile = {
        subtleRewriteUnlocked: false,
        ghostMessageUnlocked: false,
        contradictionUnlocked: false,
        directInsertionUnlocked: false
      };
    }

    if (state.aira.presenceLevel > 0.18) {
      state.aira.interferenceProfile.subtleRewriteUnlocked = true;
    }
    if (state.aira.presenceLevel > 0.42) {
      state.aira.interferenceProfile.contradictionUnlocked = true;
    }
    if (state.aira.presenceLevel > 0.68) {
      state.aira.interferenceProfile.ghostMessageUnlocked = true;
    }
    if (state.aira.presenceLevel > 0.85) {
      state.aira.interferenceProfile.directInsertionUnlocked = true;
    }

    // Investigation lead generation
    if (!state.investigation.currentLead && state.aira.presenceLevel > 0.2) {
      state.investigation.currentLead = 'background_presence';
    }

    // Storage unlock setup for future detector/tool discovery
    if (state.investigation.awarenessLevel > 0.3) {
      state.investigation.storageUnlocked = true;
    }

    // Optional clue milestones
    addClueIfMissing(state.investigation, state.aira.presenceLevel > 0.2, 'someone_in_the_background');
    addClueIfMissing(state.investigation, state.aira.presenceLevel > 0.4, 'not_all_messages_feel_authentic');
    addClueIfMissing(state.investigation, state.aira.presenceLevel > 0.55, 'the_presence_seems_intentional');
  }
}

/* ------------------------------------------------------------------ */
/* HELPERS */
/* ------------------------------------------------------------------ */

function createDefaultAiraState() {
  return {
    mode: 'hidden',
    presenceLevel: 0.0,
    manifestation: 'none',
    interferenceChance: 0.0,
    anomalyLevel: 0.0,
    preferredTarget: null,
    whisperStage: 0,
    imageStage: 0,
    lastInterferenceTurn: null,
    lastInterferenceType: null,
    active: false,
    target: null,
    voiceUnlocked: false,
    imagePresenceUnlocked: false,
    interferenceProfile: {
      subtleRewriteUnlocked: false,
      ghostMessageUnlocked: false,
      contradictionUnlocked: false,
      directInsertionUnlocked: false
    },
    interferenceHistory: []
  };
}

function createDefaultInvestigationState() {
  return {
    cluesFound: [],
    unlockedTools: [],
    currentLead: null,
    awarenessLevel: 0.0,
    suspicion: 0.0,
    storageUnlocked: false
  };
}

function getPassivePresenceGain(tension) {
  if (tension > 0.7) return 0.015;
  if (tension > 0.4) return 0.008;
  return 0.003;
}

function getManifestationStage(aira) {
  const p = aira.presenceLevel || 0;
  const a = aira.anomalyLevel || 0;

  if (p < 0.12 && a < 0.1) return 'none';
  if (p < 0.28) return 'hint';
  if (p < 0.45) return 'shadow';
  if (p < 0.65) return 'figure';
  return 'watcher';
}

function selectPreferredTarget(relationships) {
  const entries = Object.entries(relationships || {});
  if (!entries.length) return null;

  entries.sort((a, b) => {
    const scoreA = ((a[1]?.attraction || 0) + (a[1]?.attachment || 0) + (a[1]?.hurt || 0));
    const scoreB = ((b[1]?.attraction || 0) + (b[1]?.attachment || 0) + (b[1]?.hurt || 0));
    return scoreB - scoreA;
  });

  return entries[0][0] || null;
}

function addClueIfMissing(investigation, condition, clue) {
  if (!condition) return;
  if (!investigation.cluesFound.includes(clue)) {
    investigation.cluesFound.push(clue);
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
