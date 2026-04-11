export class DualLayerSystem {
  constructor() {
    this.thoughtChance = 0.5;
    this.thoughtDelay = 400;
  }

  apply(responses, state) {
    const chance =
      state.tension > 0.5
        ? Math.min(0.9, this.thoughtChance + state.tension * 0.3)
        : this.thoughtChance;

    return responses.map((response) => ({
      ...response,
      showThought: !!response.thought && Math.random() < chance,
      thoughtDelay: Math.round(this.thoughtDelay + Math.random() * 250)
    }));
  }

  setThoughtChance(value) {
    this.thoughtChance = Math.max(0, Math.min(1, value));
  }
}
