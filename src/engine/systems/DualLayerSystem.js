const SUBTEXT_CHANCE = [0, 0.1, 0.3, 0.6, 0.82, 1.0]; // index 1–5

export class DualLayerSystem {
  constructor(tuning) {
    this.tuning = tuning || { subtextFrequency: 3 };
    this.thoughtDelay = 400;
  }

  get thoughtChance() {
    return SUBTEXT_CHANCE[this.tuning.subtextFrequency] ?? 0.6;
  }

  syncTuning(tuning) {
    this.tuning = tuning;
  }

  apply(responses, state) {
    const base = this.thoughtChance;
    const chance = state.tension > 0.5
      ? Math.min(1.0, base + state.tension * 0.2)
      : base;

    return responses.map((response) => ({
      ...response,
      showThought: !!response.thought && Math.random() < chance,
      thoughtDelay: Math.round(this.thoughtDelay + Math.random() * 250)
    }));
  }

  setThoughtChance(value) {
    this.tuning.subtextFrequency = Math.round(value * 5);
  }
}
