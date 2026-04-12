export class AiraInterferenceSystem {
  constructor() {
    this.minCooldownTurns = 4;
    this.maxRecentEvents = 3;
  }

  apply({ input, state, context }) {
    const safeInput = String(input || '');
    const aira = state.aira || {};
    const turnCount = state.turnCount || 0;
    const history = Array.isArray(aira.interferenceHistory) ? aira.interferenceHistory : [];
    const lastTurn = aira.lastInterferenceTurn ?? -999;
    const turnsSinceLast = turnCount - lastTurn;

    const recentEvents = history.filter((event) => {
      const turn = event?.turn ?? -999;
      return turnCount - turn <= 12;
    });

    const protectedChoice = !!context?.gameplay?.protectedChoice;
    const unlocked = aira.interferenceProfile || {};
    const canInterfere =
      !protectedChoice &&
      (aira.interferenceChance || 0) > 0 &&
      turnsSinceLast >= this.minCooldownTurns &&
      recentEvents.length < this.maxRecentEvents;

    if (!canInterfere || Math.random() >= (aira.interferenceChance || 0)) {
      state.aira.active = false;
      return {
        active: false,
        actualInput: safeInput,
        perceivedInput: safeInput,
        uiEffect: {
          style: 'none',
          delayMs: 0,
          bubbleClass: '',
          showTypingFlicker: false
        },
        whisper: null,
        event: null
      };
    }

    const event = this._buildEvent({
      input: safeInput,
      state,
      unlocked
    });

    state.aira.active = true;
    state.aira.lastInterferenceTurn = turnCount;
    state.aira.lastInterferenceType = event.type;
    state.aira.interferenceHistory = [...history, event].slice(-24);

    return {
      active: true,
      actualInput: event.actualInput,
      perceivedInput: event.perceivedInput,
      uiEffect: event.uiEffect,
      whisper: event.whisper || null,
      event
    };
  }

  _buildEvent({ input, state, unlocked }) {
    const presence = state?.aira?.presenceLevel || 0;
    const type = this._selectType(presence, unlocked);
    const intensity = this._getIntensity(presence);

    if (type === 'tone_shift') {
      const rewritten = rewriteToneShift(input);
      return {
        type,
        turn: state.turnCount || 0,
        intensity,
        originalInput: input,
        actualInput: rewritten,
        perceivedInput: rewritten,
        uiEffect: {
          style: 'glitch-subtle',
          delayMs: 120,
          bubbleClass: 'user-glitch-subtle',
          showTypingFlicker: false
        },
        whisper: maybeWhisper(intensity)
      };
    }

    if (type === 'contradiction') {
      const rewritten = rewriteContradiction(input);
      return {
        type,
        turn: state.turnCount || 0,
        intensity,
        originalInput: input,
        actualInput: rewritten,
        perceivedInput: rewritten,
        uiEffect: {
          style: 'glitch-subtle',
          delayMs: 160,
          bubbleClass: 'user-glitch-subtle',
          showTypingFlicker: true
        },
        whisper: maybeWhisper(intensity)
      };
    }

    if (type === 'ghost_message') {
      const ghost = buildGhostMessage(state);
      return {
        type,
        turn: state.turnCount || 0,
        intensity,
        originalInput: input,
        actualInput: ghost,
        perceivedInput: ghost,
        uiEffect: {
          style: 'glitch-ghost',
          delayMs: 220,
          bubbleClass: 'user-glitch-ghost',
          showTypingFlicker: true
        },
        whisper: pickWhisper([
          'watch out for him',
          'dont trust her',
          'not this one',
          'she remembers'
        ])
      };
    }

    const fallback = rewriteToneShift(input);
    return {
      type: 'tone_shift',
      turn: state.turnCount || 0,
      intensity,
      originalInput: input,
      actualInput: fallback,
      perceivedInput: fallback,
      uiEffect: {
        style: 'glitch-subtle',
        delayMs: 120,
        bubbleClass: 'user-glitch-subtle',
        showTypingFlicker: false
      },
      whisper: maybeWhisper(intensity)
    };
  }

  _selectType(presence, unlocked) {
    if (presence > 0.65 && unlocked?.ghostMessageUnlocked && Math.random() < 0.18) {
      return 'ghost_message';
    }

    if (presence > 0.45 && unlocked?.contradictionUnlocked && Math.random() < 0.42) {
      return 'contradiction';
    }

    return 'tone_shift';
  }

  _getIntensity(presence) {
    if (presence > 0.75) return 0.85;
    if (presence > 0.55) return 0.62;
    if (presence > 0.35) return 0.42;
    return 0.24;
  }
}

function rewriteToneShift(input) {
  const text = String(input || '').trim();
  if (!text) return text;

  const lowered = text.toLowerCase();

  if (lowered.includes('i like you')) {
    return text.replace(/i like you/i, 'I like you... right');
  }

  if (lowered.includes('i trust you')) {
    return text.replace(/i trust you/i, 'I want to trust you');
  }

  if (lowered.includes('miss you')) {
    return text.replace(/miss you/i, 'miss you more than I should');
  }

  return `${text}${text.endsWith('?') ? '' : '...'}`;
}

function rewriteContradiction(input) {
  const text = String(input || '').trim();
  if (!text) return text;

  const lowered = text.toLowerCase();

  if (lowered.includes('i like you')) {
    return 'You like me more than her, right?';
  }

  if (lowered.includes('i trust you')) {
    return "I don't know if I trust you.";
  }

  if (lowered.includes('sam')) {
    return 'Sam, why are you acting like that?';
  }

  return text.replace(/\byou\b/i, 'me');
}

function buildGhostMessage(state) {
  const target = state?.aira?.preferredTarget || null;

  if (target === 'Sam') return "You shouldn't trust Sam.";
  if (target === 'Lucy') return 'She already knows.';
  if (target === 'Angie') return "Don't let Angie think that.";

  return pickWhisper([
    "You shouldn't trust him.",
    'Not this one.',
    'She remembers.',
    "That didn't sound like you."
  ]);
}

function maybeWhisper(intensity) {
  if (intensity < 0.4 || Math.random() > 0.55) return null;

  return pickWhisper([
    'watch out for him',
    'dont trust her',
    'not this one',
    'not yet',
    'she remembers',
    'youve done this before'
  ]);
}

function pickWhisper(list) {
  return list[Math.floor(Math.random() * list.length)];
}
