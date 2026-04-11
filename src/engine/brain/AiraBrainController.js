import { AiraBrain } from './AiraBrain.js';

export class AiraBrainController {
  constructor() {
    this.brains = new Map();

    this.register(
      new AiraBrain('Sam', {
        tone: 'guarded',
        directness: 0.7,
        emotionRange: 0.6,
        baseline: 'defensive',
        reaction: 'resistant',
        intensity: 0.7
      })
    );

    this.register(
      new AiraBrain('Lucy', {
        tone: 'warm',
        directness: 0.5,
        emotionRange: 0.8,
        baseline: 'intuitive',
        reaction: 'curious',
        intensity: 0.6
      })
    );

    this.register(
      new AiraBrain('Angie', {
        tone: 'playful',
        directness: 0.4,
        emotionRange: 0.7,
        baseline: 'grounded',
        reaction: 'calm',
        intensity: 0.5
      })
    );
  }

  register(brain) {
    this.brains.set(brain.name, brain);
  }

  process(input, context) {
    const candidates = [...this.brains.values()];
    const responders = this._selectResponders(candidates, input, context);

    const responses = [];

    for (const brain of responders) {
      const result = brain.respond(input, context);
      if (result && (result.spoken || result.thought)) {
        responses.push({
          agent: result.agent,
          spoken: result.spoken || '',
          thought: result.thought || null
        });
      }
    }

    return responses;
  }

  _selectResponders(candidates, input, context) {
    const lowerInput = String(input || '').toLowerCase();
    const tension = context?.tension ?? 0;
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);

    if (/\b(sam)\b/.test(lowerInput)) {
      return shuffled.filter((brain) => brain.name === 'Sam').slice(0, 1);
    }

    if (/\b(lucy)\b/.test(lowerInput)) {
      return shuffled.filter((brain) => brain.name === 'Lucy').slice(0, 1);
    }

    if (/\b(angie)\b/.test(lowerInput)) {
      return shuffled.filter((brain) => brain.name === 'Angie').slice(0, 1);
    }

    const maxResponders = tension > 0.55 ? candidates.length : 2;
    return shuffled.slice(0, maxResponders);
  }

  getBrain(name) {
    return this.brains.get(name);
  }
}