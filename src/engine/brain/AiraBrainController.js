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
    const plan = this._buildScenePlan(candidates, input, context);

    const responses = [];

    if (plan.primary) {
      const primary = await this.aiService.generate({
        characterName: plan.primary.name,
        personality: plan.primary.personality,
        input,
        context: {
          ...context,
          conversation: {
            ...context.conversation,
            responseMode: plan.primaryMode || context.conversation?.responseMode || 'brief'
          },
          sceneFlow: {
            role: 'primary',
            mainSpeaker: plan.primary.name,
            followUpSpeaker: plan.secondary?.name || null,
            instruction: 'Answer directly and naturally as the main speaker.'
          }
        }
      });

      if (primary && (primary.spoken || primary.thought)) {
        responses.push({
          agent: plan.primary.name,
          spoken: primary.spoken || '',
          thought: primary.thought || null,
          meta: primary.meta || null
        });
      }
    }

    if (plan.secondary) {
      const lastPrimary = responses[0]?.spoken || '';

      const secondary = await this.aiService.generate({
        characterName: plan.secondary.name,
        personality: plan.secondary.personality,
        input,
        context: {
          ...context,
          conversation: {
            ...context.conversation,
            responseMode: 'brief'
          },
          sceneFlow: {
            role: 'secondary',
            mainSpeaker: plan.primary?.name || null,
            followUpSpeaker: plan.secondary.name,
            primarySpoken: lastPrimary,
            instruction:
              'Do not start a new conversation. React briefly to the same moment. You are a short in-room follow-up only.'
          }
        }
      });

      if (secondary && (secondary.spoken || secondary.thought)) {
        responses.push({
          agent: plan.secondary.name,
          spoken: shortenSecondary(secondary.spoken || ''),
          thought: secondary.thought || null,
          meta: secondary.meta || null
        });
      }
    }

    return responses;
  }

  _buildScenePlan(candidates, input, context) {
    const lowerInput = String(input || '').toLowerCase();
    const emotionalBeat = context?.conversation?.emotionalBeat || 'neutral';
    const tension =
      context?.world?.tension ??
      context?.conversation?.intensity ??
      0;

    const primary = this._selectPrimary(candidates, lowerInput, context);
    const secondary = this._selectSecondary(candidates, primary, lowerInput, emotionalBeat, tension, context);

    return {
      primary,
      secondary,
      primaryMode: this._getPrimaryMode(emotionalBeat, tension)
    };
  }

  _selectPrimary(candidates, lowerInput, context) {
    const focus = context?.cast || {};

    // DM thread — always use the thread's character as the speaker
    const threadId = context?.active_app?.threadId;
    if (context?.active_app?.type === 'messages' && threadId) {
      const threadName = threadId.charAt(0).toUpperCase() + threadId.slice(1);
      const match = candidates.find((brain) => brain.name === threadName);
      if (match) return match;
    }

    if (/\b(lucy)\b/.test(lowerInput)) {
      return candidates.find((brain) => brain.name === 'Lucy') || candidates[0];
    }

    if (/\b(sam)\b/.test(lowerInput)) {
      return candidates.find((brain) => brain.name === 'Sam') || candidates[0];
    }

    if (/\b(angie)\b/.test(lowerInput)) {
      return candidates.find((brain) => brain.name === 'Angie') || candidates[0];
    }

    const focused = candidates.find((brain) => focus?.[brain.name]?.focus);
    if (focused) return focused;

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  _selectSecondary(candidates, primary, lowerInput, emotionalBeat, tension, context) {
    if (!primary) return null;

    // No secondary speakers in private DM threads
    if (context?.active_app?.type === 'messages') return null;

    const others = candidates.filter((brain) => brain.name !== primary.name);
    if (!others.length) return null;

    let chance = 0.18;

    if (emotionalBeat === 'intimacy' || emotionalBeat === 'rupture') {
      chance = 0.42;
    } else if (tension > 0.65) {
      chance = 0.36;
    } else if (/\b(lucy|sam|angie)\b/.test(lowerInput)) {
      chance = 0.28;
    }

    if (Math.random() > chance) {
      return null;
    }

    return others[Math.floor(Math.random() * others.length)];
  }

  _getPrimaryMode(emotionalBeat, tension) {
    if (emotionalBeat === 'intimacy' || emotionalBeat === 'repair') {
      return 'normal';
    }

    if (emotionalBeat === 'rupture' || tension > 0.7) {
      return 'normal';
    }

    return 'brief';
  }

  getBrain(name) {
    return this.brains.get(name);
  }
}

function shortenSecondary(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';

  const oneSentence = trimToSentences(raw, 1);
  return trimToWords(oneSentence, 16);
}

function trimToSentences(text, maxSentences) {
  const parts = text.match(/[^.!?]+[.!?]?/g);
  if (!parts) return text;
  return parts.slice(0, maxSentences).join(' ').trim();
}

function trimToWords(text, maxWords) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ').trim();
}
