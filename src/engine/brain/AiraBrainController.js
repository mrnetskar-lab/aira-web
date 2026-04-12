import { CHARACTER_NAME_BY_ID, CHARACTER_PROFILES } from './characterProfiles.js';
import { CharacterAIService } from '../services/CharacterAIService.js';

const SECONDARY_BASE = [0, 0.05, 0.12, 0.22, 0.35, 0.5];  // index 1–5
const TEMPERATURE    = [0,  0.5,  0.7,  0.9,  1.1, 1.3];  // index 1–5
const RESPONSE_MODE  = [null, 'brief', 'brief', 'normal', 'normal', 'cinematic']; // index 1–5

export class AiraBrainController {
  constructor(tuning) {
    this.tuning = tuning || { secondaryChance: 3, temperature: 3, responseLength: 3 };
    this.brains = new Map();
    this.muted = new Set();
    this.aiService = new CharacterAIService();

    for (const [name, profile] of Object.entries(CHARACTER_PROFILES)) {
      this.register(name, profile);
    }
  }

  mute(name)   { this.muted.add(name); }
  unmute(name) { this.muted.delete(name); }
  getMuted()   { return [...this.muted]; }

  register(name, profile) {
    this.brains.set(name, { name, personality: profile });
  }

  syncTuning(tuning) {
    this.tuning = tuning;
  }

  async process(input, context) {
    const candidates = [...this.brains.values()].filter((b) => !this.muted.has(b.name));
    const plan = this._buildScenePlan(candidates, input, context);

    const responses = [];

    const temperature = TEMPERATURE[this.tuning.temperature] ?? 0.9;
    const forcedMode = RESPONSE_MODE[this.tuning.responseLength] || null;

    if (plan.primary) {
      const primary = await this.aiService.generate({
        characterName: plan.primary.name,
        personality: plan.primary.personality,
        input,
        temperature,
        context: {
          ...context,
          conversation: {
            ...context.conversation,
            responseMode: forcedMode || plan.primaryMode || context.conversation?.responseMode || 'brief'
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
        temperature,
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
      const mappedName = CHARACTER_NAME_BY_ID[threadId] || null;
      if (mappedName) {
        const matchById = candidates.find((brain) => brain.name === mappedName);
        if (matchById) return matchById;
      }

      const matchByName = candidates.find((brain) => brain.name.toLowerCase() === String(threadId).toLowerCase());
      if (matchByName) return matchByName;
    }

    if (/\b(lucy|north|c1)\b/.test(lowerInput)) {
      return candidates.find((brain) => brain.name === 'Lucy') || candidates[0];
    }

    if (/\b(sam|vale|c2)\b/.test(lowerInput)) {
      return candidates.find((brain) => brain.name === 'Sam') || candidates[0];
    }

    if (/\b(angie|mira|c3)\b/.test(lowerInput)) {
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

    const baseChance = SECONDARY_BASE[this.tuning.secondaryChance] ?? 0.22;
    let chance = baseChance;

    if (emotionalBeat === 'intimacy' || emotionalBeat === 'rupture') {
      chance = Math.min(0.7, baseChance * 2.2);
    } else if (tension > 0.65) {
      chance = Math.min(0.6, baseChance * 1.8);
    } else if (/\b(lucy|sam|angie)\b/.test(lowerInput)) {
      chance = Math.min(0.5, baseChance * 1.4);
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
