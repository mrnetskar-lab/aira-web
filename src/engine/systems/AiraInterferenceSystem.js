export class AiraInterferenceSystem {
  constructor() {
    this.telemetry = {
      totalEvents: 0,
      recentEvents: [],
      typeCount: {}
    };
  }

  apply({ input, state, context }) {
    const neutral = this._neutral(input);

    if (!state.aira) return neutral;

    const aira = state.aira;
    const profile = aira.interferenceProfile;
    if (!profile || !profile.subtleRewriteUnlocked) return neutral;

    const turnCount = state.turnCount || 0;
    const lastTurn = aira.lastInterferenceTurn || 0;
    const turnsSinceLast = turnCount - lastTurn;

    // Cooldown — min 4 turns between visible events
    if (turnsSinceLast < 4) return neutral;

    // Protected choice
    if (context?.gameplay?.protectedChoice) return neutral;

    // Cap recent events in last 8 turns
    const recentWindow = this.telemetry.recentEvents.filter(
      e => turnCount - e.turn < 8
    );
    if (recentWindow.length >= 2) return neutral;

    // Roll
    const chance = aira.interferenceChance || 0;
    if (Math.random() >= chance) return neutral;

    // Pick type
    const type = this._pickType(profile, aira.presenceLevel || 0);
    if (!type) return neutral;

    // Generate distortion
    const result = this._generate(type, input);
    if (!result) return neutral;

    // Record event
    const event = {
      type,
      originalInput: input,
      actualInput: result.actualInput,
      perceivedInput: result.perceivedInput,
      ghostText: result.ghostText || null,
      intensity: aira.presenceLevel,
      turn: turnCount,
      noticedBy: [],
      timestamp: Date.now()
    };

    aira.lastInterferenceTurn = turnCount;
    aira.lastInterferenceType = type;
    if (!aira.interferenceHistory) aira.interferenceHistory = [];
    aira.interferenceHistory.push(event);
    if (aira.interferenceHistory.length > 20) aira.interferenceHistory.shift();

    this.telemetry.totalEvents++;
    this.telemetry.recentEvents.push({ turn: turnCount, type });
    if (this.telemetry.recentEvents.length > 50) this.telemetry.recentEvents.shift();
    this.telemetry.typeCount[type] = (this.telemetry.typeCount[type] || 0) + 1;

    return {
      active: true,
      actualInput: result.actualInput,
      perceivedInput: result.perceivedInput,
      ghostText: result.ghostText || null,
      uiEffect: result.uiEffect,
      event
    };
  }

  _neutral(input) {
    return {
      active: false,
      actualInput: input,
      perceivedInput: input,
      ghostText: null,
      uiEffect: {
        style: 'none',
        delayMs: 0,
        bubbleClass: '',
        showTypingFlicker: false
      },
      event: null
    };
  }

  _pickType(profile, presenceLevel) {
    const pool = [];

    if (profile.subtleRewriteUnlocked) {
      pool.push({ type: 'tone_shift', weight: 6 });
    }
    if (profile.ghostMessageUnlocked) {
      pool.push({ type: 'relational_implication', weight: 3 });
    }
    if (profile.contradictionUnlocked && presenceLevel > 0.55) {
      pool.push({ type: 'ghost_message', weight: 1 });
      pool.push({ type: 'contradiction', weight: 2 });
    }

    if (!pool.length) return null;

    const total = pool.reduce((s, p) => s + p.weight, 0);
    let roll = Math.random() * total;

    for (const p of pool) {
      roll -= p.weight;
      if (roll <= 0) return p.type;
    }

    return pool[0].type;
  }

  _generate(type, input) {
    switch (type) {
      case 'tone_shift':             return this._toneShift(input);
      case 'relational_implication': return this._relationalImplication(input);
      case 'ghost_message':          return this._ghostMessage(input);
      case 'contradiction':          return this._contradiction(input);
      default:                       return null;
    }
  }

  /* ------------------------------------------------------------------ */

  _toneShift(input) {
    const suffixes = [
      '... right?',
      '. You know that.',
      ' more than I expected.',
      '... I think.',
      '. Or maybe not.',
    ];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const text = String(input || '').replace(/[.?!]*$/, '') + suffix;

    return {
      actualInput: text,
      perceivedInput: text,
      ghostText: null,
      uiEffect: {
        style: 'glitch-subtle',
        delayMs: 80,
        bubbleClass: 'user-glitch-subtle',
        showTypingFlicker: false
      }
    };
  }

  _relationalImplication(input) {
    const pool = [
      'You like me more than her, right?',
      'You were never going to pick Sam.',
      "Tell me you don't mean Angie.",
      'I miss you more than I should.',
      "You're not being honest with yourself.",
      'Something about you has changed.',
    ];
    const text = pool[Math.floor(Math.random() * pool.length)];

    return {
      actualInput: text,
      perceivedInput: text,
      ghostText: null,
      uiEffect: {
        style: 'glitch-subtle',
        delayMs: 100,
        bubbleClass: 'user-glitch-subtle',
        showTypingFlicker: false
      }
    };
  }

  _ghostMessage(input) {
    const pool = [
      "You shouldn't trust Sam.",
      "That didn't sound like me.",
      'She knows already.',
      'I think I said that wrong.',
      'Why did I say that?',
      'They can tell.',
    ];
    const ghostText = pool[Math.floor(Math.random() * pool.length)];

    return {
      actualInput: input,
      perceivedInput: input,
      ghostText,
      uiEffect: {
        style: 'glitch-ghost',
        delayMs: 220,
        bubbleClass: 'user-glitch-ghost',
        showTypingFlicker: true
      }
    };
  }

  _contradiction(input) {
    let text = String(input || '');
    const replacements = [
      [/\btrust\b/i,   'want to trust'],
      [/\blike\b/i,    'think I like'],
      [/\blove\b/i,    'thought I loved'],
      [/\bneed\b/i,    'used to need'],
      [/\bbelieve\b/i, 'want to believe'],
    ];

    let replaced = false;
    for (const [pattern, replacement] of replacements) {
      if (pattern.test(text)) {
        text = text.replace(pattern, replacement);
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      text = text.replace(/[.?!]*$/, '') + '. I think.';
    }

    return {
      actualInput: text,
      perceivedInput: text,
      ghostText: null,
      uiEffect: {
        style: 'glitch-subtle',
        delayMs: 60,
        bubbleClass: 'user-glitch-subtle',
        showTypingFlicker: false
      }
    };
  }

  getTelemetry() {
    return { ...this.telemetry };
  }
}
