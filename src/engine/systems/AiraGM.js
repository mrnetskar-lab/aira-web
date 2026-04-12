/**
 * AiraGM — Aira as a silent playmaker / game director.
 *
 * plan(state)  → called BEFORE brain.process. Returns a directive object
 *                that gets injected into context so characters feel her influence.
 * tick(state)  → called AFTER responses. Logs and stores last play for dev panel.
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

export class AiraGM {
  constructor() {
    this.lastPlay = null;
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
   * Legacy tick — returns a short log line for dev mode.
   */
  tick(state, responses) {
    const aira = state.aira;
    const p = aira?.presenceLevel ?? 0;
    const play = this.lastPlay ? `[${this.lastPlay.type}]` : '[idle]';
    const speakers = responses.map((r) => r.agent).join(', ') || 'silence';
    return `Aira ${play} p=${p.toFixed(3)} — ${speakers} responded. tension=${state.tension.toFixed(2)}`;
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
