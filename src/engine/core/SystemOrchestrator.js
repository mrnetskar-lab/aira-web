import { buildContext } from './buildContext.js';
import { RelationshipEngine } from '../systems/RelationshipEngine.js';
import { AiraPresenceSystem } from '../systems/AiraPresenceSystem.js';
import { RelationshipContinuitySystem, buildInitialContinuityState } from '../systems/RelationshipContinuitySystem.js';

export class SystemOrchestrator {
  constructor({
    brain,
    gm,
    observer,
    memory,
    ghost,
    emotion,
    focus,
    avatarManager,
    dualLayer,
    explicitMode,
    interference,
    continuity
  }) {
    this.brain = brain;
    this.gm = gm;
    this.observer = observer;
    this.memory = memory;
    this.ghost = ghost;
    this.emotion = emotion;
    this.focus = focus;
    this.avatarManager = avatarManager;
    this.dualLayer = dualLayer;
    this.explicitMode = explicitMode;
    this.interference = interference;
    this.continuity = continuity || new RelationshipContinuitySystem();

    this.relationshipEngine = new RelationshipEngine();
    this.airaPresenceSystem = new AiraPresenceSystem();

    this.state = this._createInitialState();

    this.tuning = {
      successScore: 0,
      interactions: 0,
      avgScore: 0
    };
  }

  _createInitialState() {
    const agents = [...this.brain.brains.keys()];

    const relByName = {
      Lucy: {
        trust: 0.68,
        attraction: 0.62,
        comfort: 0.65,
        jealousy: 0.52,
        hurt: 0.32,
        attachment: 0.66,
        interest: 0.71,
        romanticTension: 0.41,
        exclusivityPressure: 0.6,
        betrayalSensitivity: 0.78,
        intimacyReadiness: 0.28,
        avoidance: 0.18,
        longing: 0.55
      },
      Sam: {
        trust: 0.61,
        attraction: 0.59,
        comfort: 0.62,
        jealousy: 0.54,
        hurt: 0.42,
        attachment: 0.62,
        interest: 0.68,
        romanticTension: 0.36,
        exclusivityPressure: 0.54,
        betrayalSensitivity: 0.87,
        intimacyReadiness: 0.21,
        avoidance: 0.3,
        longing: 0.51
      },
      Angie: {
        trust: 0.66,
        attraction: 0.61,
        comfort: 0.67,
        jealousy: 0.56,
        hurt: 0.34,
        attachment: 0.68,
        interest: 0.69,
        romanticTension: 0.38,
        exclusivityPressure: 0.51,
        betrayalSensitivity: 0.79,
        intimacyReadiness: 0.23,
        avoidance: 0.2,
        longing: 0.53
      }
    };

    return {
      tension: 0.9,
      randomness: 0.82,
      lastInput: null,
      turnCount: 0,
      lastEvent: null,
      protectedChoice: false,
      aira: null,
      investigation: null,
      emotionOverride: null,
      relationships: Object.fromEntries(
        agents.map((name) => [name, {
          ...(relByName[name] || {
            trust: 0.58,
            attraction: 0.54,
            comfort: 0.57,
            jealousy: 0.48,
            hurt: 0.28,
            attachment: 0.52,
            interest: 0.59,
            romanticTension: 0.21,
            exclusivityPressure: 0.36,
            betrayalSensitivity: 0.74,
            intimacyReadiness: 0.13,
            avoidance: 0.2,
            longing: 0.38
          })
        }])
      ),
      cast: Object.fromEntries(
        agents.map((name) => [name, {
          hidden: {
            attraction: 0.85,
            jealousy: 0.6,
            hurt: 0.3,
            trust: 0.88
          }
        }])
      ),
      continuity: buildInitialContinuityState(),
      // Scene state
      scene: {
        type: 'private',
        phase: 'open', // open | rising | peak | resolve
        focusCharacter: 'Hazel',
      },
    };
  }


  // Called on every /api/ai POST
  setActiveApp(app) {
    this.state.continuity.activeApp = app;
  }

  // Basic scene phase progression
  updateScenePhase({ interactionCount, emotionalSignal }) {
    if (!this.state.scene) return;
    if (emotionalSignal > 0.7) {
      this.state.scene.phase = 'peak';
    } else if (interactionCount > 3) {
      this.state.scene.phase = 'rising';
    } else {
      this.state.scene.phase = 'open';
    }
  }

  async run(input, options = {}) {
    this.state.lastInput = input;
    this.state.turnCount += 1;

    if (options.activeApp) {
      this.setActiveApp(options.activeApp);
    }

    if (options.focusCharacter) {
      this.state.focusCharacter = options.focusCharacter;
    } else {
      this.state.focusCharacter = null;
    }

    this.state.beatContext = options.beatContext || null;

    // Simple phase progression (demo: count + random emotion)
    const interactionCount = this.state.turnCount;
    const emotionalSignal = Math.random(); // Replace with real signal if available
    this.updateScenePhase({ interactionCount, emotionalSignal });

    // 1. Increment turn clock + update continuity
    this.continuity.update({ state: this.state });

    this.emotion.analyzeInput(input, this.state);

    this.memory.store({
      role: 'user',
      text: input,
      time: Date.now()
    });

    // 2. Build pre-context
    const preContext = buildContext({
      input,
      state: this.state,
      memory: this.memory,
      focus: this.focus,
      brain: this.brain,
      scene: this.state.scene
    });

    this.relationshipEngine.update({
      input,
      state: this.state,
      context: preContext
    });

    this.airaPresenceSystem.update({
      input,
      state: this.state,
      context: preContext
    });

    const interference = this.interference
      ? this.interference.apply({
          input,
          state: this.state,
          context: preContext
        })
      : {
          active: false,
          actualInput: input,
          perceivedInput: input,
          uiEffect: { style: 'none', delayMs: 0, bubbleClass: '', showTypingFlicker: false },
          whisper: null,
          event: null
        };

    const processedInput = interference.actualInput || input;

    const context = buildContext({
      input: processedInput,
      state: this.state,
      memory: this.memory,
      focus: this.focus,
      brain: this.brain,
      scene: this.state.scene
    });

    context.airaInterference = {
      active: interference.active,
      type: interference.event?.type || null,
      anomalyHint: interference.active
        ? "The player's last message felt slightly unlike them."
        : null,
      whisper: interference.whisper || null
    };

    // Aira GM: plan this turn's directive before brain runs
    const airaDirective = this.gm.plan ? this.gm.plan(this.state) : null;
    if (airaDirective) {
      context.airaDirective = airaDirective;
    }

    // Character intent — derived per character, injected into context before brain runs
    context.characterIntents = deriveCharacterIntents(this.state);

    let responses = await this.brain.process(processedInput, context);

    responses = this.dualLayer.apply(responses, this.state);

    if (this.explicitMode.active) {
      responses = this.explicitMode.enhance(responses);
    }

    for (const response of responses) {
      this.memory.store({
        role: response.agent,
        text: response.spoken,
        thought: response.thought,
        time: Date.now()
      });
    }

    if (responses.length > 0) {
      this.focus.setFocus(responses[0].agent);
    }

    this.avatarManager.reactToDialogue(responses, this.state);

    const gmResult = this.gm.tick(this.state, responses);
    const gmLine   = typeof gmResult === 'string' ? gmResult : (gmResult?.log ?? '');
    const storyBeat = typeof gmResult === 'object' ? (gmResult?.storyBeat ?? null) : null;

    this.observer.analyze(input, responses, this.state, interference);

    const score = this._evaluateInteraction(responses);
    this.tuning.successScore += score;
    this.tuning.interactions += 1;
    this.tuning.avgScore =
      this.tuning.interactions > 0
        ? this.tuning.successScore / this.tuning.interactions
        : 0;

    this._autoTune();

    // Consume any ready continuity events
    const continuityEvents = this.continuity.consumeReadyEvents(this.state);

    const continuitySnapshot = {
      timeBlock: this.state.continuity?.timeBlock,
      activeApp: this.state.continuity?.activeApp,
      availability: this.continuity.getAvailabilitySnapshot(this.state),
      events: continuityEvents,
    };

    return {
      responses,
      gmLine,
      storyBeat,
      interference,
      continuity: continuitySnapshot,
    };
  }

  _evaluateInteraction(responses) {
    let score = 0;

    for (const response of responses) {
      if (response.thought) {
        score += 1;
      }

      if (response.spoken && response.spoken.length > 10) {
        score += 1;
      } else if (response.spoken && response.spoken.length > 5) {
        score += 0.5;
      }

      if (response.spoken && response.spoken.includes('...')) {
        score -= 0.25;
      }
    }

    return score;
  }

  _autoTune() {
    if (this.tuning.avgScore < 1.5) {
      this.state.tension = Math.min(1, this.state.tension + 0.05);
    } else if (this.tuning.avgScore > 2.5) {
      this.state.tension = Math.max(0, this.state.tension - 0.05);
    }
  }

  async tick() {
    // Enable Story Mode for this tick so Aira may emit a scene beat
    const prevMode = this.gm.mode;
    this.gm.setMode('story');

    const speaker = this._pickSpontaneousSpeaker();
    if (!speaker) {
      this.gm.setMode(prevMode);
      return null;
    }

    const brain = this.brain.getBrain(speaker);
    if (!brain) {
      this.gm.setMode(prevMode);
      return null;
    }

    const context = buildContext({
      input: '',
      state: this.state,
      memory: this.memory,
      focus: this.focus,
      brain: this.brain
    });

    context.sceneFlow = {
      role: 'primary',
      mainSpeaker: speaker,
      followUpSpeaker: null,
      instruction: 'The player has been quiet. You are breaking the silence naturally. Keep it very short — one line at most. Do not ask multiple questions. Do not explain that you are checking in. Just say something real and brief that fits the moment.'
    };

    const result = await this.brain.aiService.generate({
      characterName: speaker,
      personality: brain.personality,
      input: '',
      context
    });

    if (!result?.spoken) {
      this.gm.setMode(prevMode);
      return null;
    }

    const response = {
      agent: speaker,
      spoken: result.spoken,
      thought: result.thought || null,
      meta: result.meta || null
    };

    const [withLayer] = this.dualLayer.apply([response], this.state);

    this.memory.store({
      role: speaker,
      text: response.spoken,
      thought: response.thought,
      time: Date.now()
    });

    this.focus.setFocus(speaker);

    // Get story beat from GM (Story Mode is active for this tick)
    const gmResult = this.gm.tick(this.state, [withLayer]);
    const storyBeat = gmResult?.storyBeat ?? null;

    // Restore previous mode
    this.gm.setMode(prevMode);

    return { ...withLayer, storyBeat };
  }

  _pickSpontaneousSpeaker() {
    const agents = [...this.brain.brains.keys()];
    const scores = agents.map((name) => {
      const rel = this.state.relationships?.[name] || {};
      const score =
        (rel.longing || 0) * 2 +
        (rel.attachment || 0) +
        (rel.interest || 0) * 0.5 +
        Math.random() * 0.15;
      return { name, score };
    });

    scores.sort((a, b) => b.score - a.score);
    const top = scores[0];

    // Only speak if there's enough emotional weight
    if (top.score < 0.4) return null;

    return top.name;
  }

  setEmotion(preset) {
    const presets = {
      neutral:  { beat: 'neutral',  atmosphere: 'calm',    tension: 0.0,  responseMode: 'brief'   },
      happy:    { beat: 'warmth',   atmosphere: 'warm',    tension: 0.0,  responseMode: 'brief'   },
      charged:  { beat: 'intimacy', atmosphere: 'charged', tension: 0.35, responseMode: 'normal'  },
      tension:  { beat: 'rising',   atmosphere: 'tense',   tension: 0.55, responseMode: 'normal'  },
      sad:      { beat: 'hurt',     atmosphere: 'heavy',   tension: 0.3,  responseMode: 'normal'  },
      angry:    { beat: 'rupture',  atmosphere: 'hostile', tension: 0.8,  responseMode: 'normal'  },
      jealous:  { beat: 'jealousy', atmosphere: 'tense',   tension: 0.45, responseMode: 'normal'  },
    };

    if (!preset || preset === 'neutral') {
      this.state.emotionOverride = null;
      this.state.tension = 0;
      return;
    }

    const p = presets[preset];
    if (!p) return;

    this.state.emotionOverride = { beat: p.beat, atmosphere: p.atmosphere, responseMode: p.responseMode };
    this.state.tension = p.tension;
  }

  getState() {
    return {
      ...this.state,
      tuning: { ...this.tuning },
      airaLastPlay: this.gm.lastPlay || null,
      mutedAgents: this.brain.getMuted ? this.brain.getMuted() : []
    };
  }

  reset() {
    this.state = this._createInitialState();

    this.tuning = {
      successScore: 0,
      interactions: 0,
      avgScore: 0
    };
  }
}

// ── Character intent derivation ───────────────────────────────────────────────
// Returns { [characterName]: { goal, intensity } } for each character in state.
// Goal is one of: 'observe' | 'test' | 'pull' | 'deflect' | 'invite'
// Derived from chemistry signals, avoidance, scene phase, and turn count.
// Injected into prompt context — never exposed in UI.

function deriveCharacterIntents(state) {
  const relationships = state?.relationships || {};
  const phase = state?.scene?.phase || 'open';
  const turnCount = state?.turnCount || 0;
  const intents = {};

  for (const [name, rel] of Object.entries(relationships)) {
    intents[name] = deriveOneIntent(rel, phase, turnCount);
  }

  return intents;
}

function deriveOneIntent(rel, phase, turnCount) {
  const attraction       = rel?.attraction        ?? 0.5;
  const romanticTension  = rel?.romanticTension   ?? 0.3;
  const intimacyReady    = rel?.intimacyReadiness ?? 0.3;
  const avoidance        = rel?.avoidance         ?? 0.2;
  const trust            = rel?.trust             ?? 0.5;
  const hurt             = rel?.hurt              ?? 0.1;

  // Deflect first — high avoidance or hurt overrides everything
  if (avoidance > 0.6 || hurt > 0.55) {
    return { goal: 'deflect', intensity: Math.min(1, avoidance + hurt * 0.4) };
  }

  // Chemistry score: how much pull is building
  const chem = romanticTension * 0.4 + attraction * 0.35 + intimacyReady * 0.25;

  // Early scene / low trust — observe or test
  if (turnCount <= 2 || trust < 0.45) {
    const goal = trust < 0.4 ? 'test' : 'observe';
    return { goal, intensity: 0.3 + (1 - trust) * 0.3 };
  }

  // Scene phase drives the shift from test → pull → invite
  if (phase === 'open') {
    if (chem < 0.4) return { goal: 'observe', intensity: 0.3 + chem * 0.4 };
    return { goal: 'test', intensity: 0.4 + chem * 0.3 };
  }

  if (phase === 'rising') {
    if (chem < 0.5) return { goal: 'test', intensity: 0.5 };
    return { goal: 'pull', intensity: 0.5 + chem * 0.3 };
  }

  if (phase === 'peak') {
    if (intimacyReady > 0.65 && chem > 0.6) {
      return { goal: 'invite', intensity: 0.7 + intimacyReady * 0.3 };
    }
    return { goal: 'pull', intensity: 0.7 + chem * 0.2 };
  }

  // Fallback
  return { goal: 'observe', intensity: 0.3 };
}
