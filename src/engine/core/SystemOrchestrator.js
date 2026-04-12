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

    return {
      tension: 0,
      randomness: 0.5,
      lastInput: null,
      turnCount: 0,
      lastEvent: null,
      protectedChoice: false,
      aira: null,
      investigation: null,
      emotionOverride: null,
      relationships: Object.fromEntries(
        agents.map((name) => [name, {
          trust: 0.5,
          attraction: 0.3,
          comfort: 0.5,
          jealousy: 0.1,
          hurt: 0,
          attachment: 0.3,
          interest: 0.35,
          romanticTension: 0.15,
          exclusivityPressure: 0.0,
          betrayalSensitivity: 0.25,
          intimacyReadiness: 0.0,
          avoidance: 0.0,
          longing: 0.0
        }])
      ),
      cast: Object.fromEntries(
        agents.map((name) => [name, {
          hidden: {
            attraction: 0.3,
            jealousy: 0.1,
            hurt: 0,
            trust: 0.5
          }
        }])
      ),
      continuity: buildInitialContinuityState(),
    };
  }

  async run(input, options = {}) {
    this.state.lastInput = input;
    this.state.turnCount += 1;

    if (options.activeApp) {
      this.state.continuity = { ...this.state.continuity, activeApp: options.activeApp };
    }

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
      brain: this.brain
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
      brain: this.brain
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

    const gmLine = this.gm.tick(this.state, responses);

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
    const speaker = this._pickSpontaneousSpeaker();
    if (!speaker) return null;

    const brain = this.brain.getBrain(speaker);
    if (!brain) return null;

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

    if (!result?.spoken) return null;

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

    return withLayer;
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
