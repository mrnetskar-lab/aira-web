import { CHARACTER_PROFILES } from './characterProfiles.js';
import { CharacterAIService } from '../services/CharacterAIService.js';

export class AiraBrainController {
  constructor() {
    this.brains = new Map();
    this.aiService = new CharacterAIService();

    for (const [name, profile] of Object.entries(CHARACTER_PROFILES)) {
      this.register(name, profile);
    }
  }

  register(name, profile) {
    this.brains.set(name, {
      name,
      personality: profile
    });
  }

  async process(input, context) {
    const candidates = [...this.brains.values()];
    const responders = this._selectResponders(candidates, input, context);

    const responses = [];

    for (const brain of responders) {
      const result = await this.aiService.generate({
        characterName: brain.name,
        personality: brain.personality,
        input,
        context
      });

      if (result && (result.spoken || result.thought)) {
        responses.push({
          agent: brain.name,
          spoken: result.spoken || '',
          thought: result.thought || null
        });
      }
    }

    return responses;
  }

  _selectResponders(candidates, input, context) {
    const lowerInput = String(input || '').toLowerCase();
    const tension = context?.world?.tension ?? context?.conversation?.intensity ?? 0;
    const emotionalBeat = context?.conversation?.emotionalBeat || 'neutral';
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);

    if (/\b(lucy)\b/.test(lowerInput)) {
      return shuffled.filter((brain) => brain.name === 'Lucy').slice(0, 1);
    }

    if (/\b(sam)\b/.test(lowerInput)) {
      return shuffled.filter((brain) => brain.name === 'Sam').slice(0, 1);
    }

    if (/\b(angie)\b/.test(lowerInput)) {
      return shuffled.filter((brain) => brain.name === 'Angie').slice(0, 1);
    }

    if (emotionalBeat === 'intimacy' || emotionalBeat === 'rupture') {
      return shuffled.slice(0, 2);
    }

    if (tension > 0.65) {
      return shuffled.slice(0, 2);
    }

    return shuffled.slice(0, 1);
  }

  getBrain(name) {
    return this.brains.get(name);
  }
}
