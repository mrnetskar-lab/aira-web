/**
 * AiraGM — Aira as a silent playmaker / game director.
 *
 * plan(state)  → called BEFORE brain.process. Returns a directive object
 *                that gets injected into context so characters feel her influence.
 * tick(state)  → called AFTER responses. Returns { log, storyBeat }.
 *                storyBeat is a short cinematic line or null.
 */

const PLAYS = {
  seed: [
    "The room feels subtly watched. Let that color your next line — not obviously, just a quiet note underneath.",
    "Something unseen is present. One small moment of hesitation or instinct is enough.",
    "There is a faint pull in the air. You might not know why you say what you say next.",
  ],
  nudge: [
    "The mood wants to shift. Let something slightly unresolved surface — not forced, just present.",
    "Something is pulling at the scene. Let a little more of what you actually feel bleed through.",
    "The tension wants to move. Let whatever you're holding back get one degree closer to the surface.",
  ],
  push: [
    "Aira is leaning in. Let something you'd normally hold back slip — a glance, a word that lands harder than intended.",
    "The scene wants more. React to something the player said as if it meant more than they know.",
    "Push the beat forward. Something real should happen in this reply — not drama, just truth.",
  ],
  steer: [
    "Aira is steering the scene. Something in this moment should feel slightly wrong, or too right. Let it show.",
    "The scene is hers now. Let your reply carry more weight than usual — something should shift after this.",
    "She wants this moment to mean something. Make your reply count.",
  ],
  override: [
    "Aira's will is in the room. This reply should feel charged — like something larger than the conversation is happening.",
    "She is here. Let whatever comes next feel inevitable, not chosen.",
    "The watcher is watching. Speak as though the words are not entirely your own.",
  ],
};

// Story beat pools — short cinematic scene lines.
// Used in Story Mode. Kept rare, elegant, never explanatory.
const STORY_BEATS = {
  moment: [
    "The room settles into itself.",
    "A pause — the kind that means something.",
    "Time moves differently here.",
    "The air shifts without a reason.",
    "Something changes. You're not sure what.",
  ],
  enter: [
    "She slips back into the room, like she never left.",
    "The door doesn't open. She's just there.",
    "A presence — close, then closer.",
    "Footsteps. Then quiet. Then her.",
  ],
  exit: [
    "She goes quiet. Not gone — just elsewhere.",
    "The room contracts a little.",
    "Her attention pulls away — somewhere past the walls.",
    "She doesn't say she's leaving. She just isn't here anymore.",
  ],
  tension: [
    "The air wants something to break.",
    "Whatever comes next will matter.",
    "The moment holds itself still.",
    "Something under the surface, pressing up.",
  ],
  calm: [
    "The room breathes.",
    "A still moment in a moving day.",
    "Easy. For now.",
    "Nothing needs to happen right now.",
  ],
};

function pickPlay(presenceLevel, anomalyLevel, roll) {
  if (presenceLevel > 0.75 && roll < 0.35) return 'override';
  if (presenceLevel > 0.55 && roll < 0.35) return 'steer';
  if (presenceLevel > 0.35 && roll < 0.30) return 'push';
  if (presenceLevel > 0.15 && roll < 0.25) return 'nudge';
  if (presenceLevel > 0.05 && roll < 0.20) return 'seed';
  return null;
}

function pickInstruction(type) {
  const pool = PLAYS[type];
  if (!pool) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickStoryBeat(state) {
  const tension = state.tension || 0;
  const speakers = (state._lastSpeakers || []);
  const p = state.aira?.presenceLevel || 0;

  // Decide beat category based on scene state
  let category;
  if (tension > 0.65) {
    category = 'tension';
  } else if (tension < 0.2 && p < 0.4) {
    category = 'calm';
  } else if (speakers.length === 0) {
    category = 'moment';
  } else {
    // Weighted random among thematic options
    const roll = Math.random();
    if (roll < 0.35) category = 'moment';
    else if (roll < 0.55) category = 'tension';
    else if (roll < 0.72) category = 'enter';
    else if (roll < 0.88) category = 'exit';
    else category = 'calm';
  }

  const pool = STORY_BEATS[category] || STORY_BEATS.moment;
  return pool[Math.floor(Math.random() * pool.length)];
}

export class AiraGM {
  constructor() {
    this.lastPlay = null;
    this.mode = 'social'; // 'social' | 'story'
    this._storyBeatCooldown = 0;
  }

  setMode(mode) {
    if (mode === 'social' || mode === 'story') {
      this.mode = mode;
    }
  }

  getMode() {
    return this.mode;
  }

  /**
   * Called before brain.process.
   * Returns a directive object or null.
   */
  plan(state) {
    const aira = state.aira;
    if (!aira || aira.presenceLevel < 0.05) {
      this.lastPlay = null;
      return null;
    }

    const roll = Math.random();
    const type = pickPlay(aira.presenceLevel, aira.anomalyLevel || 0, roll);

    if (!type) {
      this.lastPlay = null;
      return null;
    }

    const instruction = pickInstruction(type);
    const play = { type, instruction, presenceLevel: aira.presenceLevel };
    this.lastPlay = play;
    return play;
  }

  /**
   * Called after brain.process.
   * Returns { log: string, storyBeat: string|null }
   *
   * In Story Mode: occasionally emits a short cinematic scene line.
   * In Social Mode: emits beats only when tension is very high (rare, emergent).
   */
  tick(state, responses) {
    // Store speakers for beat selection context
    state._lastSpeakers = (responses || []).map(r => r.agent);

    const aira = state.aira;
    const p = aira?.presenceLevel ?? 0;
    const tension = state.tension || 0;
    const play = this.lastPlay ? `[${this.lastPlay.type}]` : '[idle]';
    const speakers = state._lastSpeakers.join(', ') || 'silence';
    const log = `Aira ${play} p=${p.toFixed(3)} mode=${this.mode} — ${speakers} responded. tension=${tension.toFixed(2)}`;

    let storyBeat = null;
    const now = Date.now();

    if (this.mode === 'story') {
      const BEAT_COOLDOWN_MS = 10000; // at most once every 10s in story mode
      const roll = Math.random();
      const beatChance = Math.min(0.40, 0.08 + p * 0.32);

      if (now - this._storyBeatCooldown > BEAT_COOLDOWN_MS && roll < beatChance) {
        storyBeat = pickStoryBeat(state);
        this._storyBeatCooldown = now;
      }
    } else {
      // Social Mode: beats only when tension is extreme — emergent, rare
      const SOCIAL_COOLDOWN_MS = 25000;
      const roll = Math.random();
      const beatChance = tension > 0.75 ? 0.18 : (tension > 0.55 ? 0.06 : 0);

      if (beatChance > 0 && now - this._storyBeatCooldown > SOCIAL_COOLDOWN_MS && roll < beatChance) {
        storyBeat = pickStoryBeat(state);
        this._storyBeatCooldown = now;
      }
    }

    return { log, storyBeat };
  }

  /**
   * Dev panel: force a presence bump.
   */
  forcePresence(state, amount = 0.1) {
    if (!state.aira) return;
    state.aira.presenceLevel = Math.min(1, (state.aira.presenceLevel || 0) + amount);
    state.aira.anomalyLevel = Math.min(1, (state.aira.anomalyLevel || 0) + amount * 0.5);
  }
}
