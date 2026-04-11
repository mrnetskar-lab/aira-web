import { buildContext } from './buildContext.js';
import { RelationshipEngine } from '../systems/RelationshipEngine.js';

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
    explicitMode
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

    this.relationshipEngine = new RelationshipEngine();

    const agents = [...brain.brains.keys()];
    this.state = {
      tension: 0,
      randomness: 0.5,
      lastInput: null,
      turnCount: 0,
      relationships: Object.fromEntries(agents.map(name => [name, {
        trust: 0.5, attraction: 0.3, comfort: 0.5, jealousy: 0.1, hurt: 0, attachment: 0.3
      }])),
      cast: Object.fromEntries(agents.map(name => [name, {
        hidden: { attraction: 0.3, jealousy: 0.1, hurt: 0, trust: 0.5 }
      }]))
    };

    this.tuning = {
      successScore: 0,
      interactions: 0,
      avgScore: 0
    };
  }

  async run(input) {
    this.state.lastInput = input;
    this.state.turnCount += 1;

    this.emotion.analyzeInput(input, this.state);

    this.memory.store({
      role: 'user',
      text: input,
      time: Date.now()
    });

    const context = buildContext({
      input,
      state: this.state,
      memory: this.memory,
      focus: this.focus,
      brain: this.brain
    });

    this.relationshipEngine.update({
      input,
      state: this.state,
      context
    });

    let responses = await this.brain.process(input, context);

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

    this.observer.analyze(input, responses, this.state);

    const score = this._evaluateInteraction(responses);
    this.tuning.successScore += score;
    this.tuning.interactions += 1;
    this.tuning.avgScore =
      this.tuning.interactions > 0
        ? this.tuning.successScore / this.tuning.interactions
        : 0;

    this._autoTune();

    return {
      responses,
      gmLine
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

  getState() {
    return {
      ...this.state,
      tuning: { ...this.tuning }
    };
  }

  reset() {
    this.state = {
      tension: 0,
      randomness: 0.5,
      lastInput: null,
      turnCount: 0
    };

    this.tuning = {
      successScore: 0,
      interactions: 0,
      avgScore: 0
    };
  }
}
