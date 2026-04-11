import { ensureOpenAI } from '../../../server/services/openaiClient.js';

const MODEL = 'gpt-4.1-mini';

export class CharacterAIService {
  async generate({ characterName, personality, input, context }) {
    const client = ensureOpenAI();

    const systemPrompt = buildSystemPrompt(characterName, personality, context);
    const userPrompt = buildUserPrompt(input, context);

    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const raw = response.choices?.[0]?.message?.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return {
      spoken: normalizeSpoken(parsed.spoken, context),
      thought: normalizeThought(parsed.thought)
    };
  }
}

function buildSystemPrompt(characterName, personality, context) {
  const mode = context?.conversation?.responseMode || 'brief';
  const emotionalBeat = context?.conversation?.emotionalBeat || 'neutral';
  const topic = context?.conversation?.topic || 'general';
  const world = context?.world || {};
  const scene = context?.scene || {};
  const relationship = context?.relationships?.[characterName] || {};
  const cast = context?.cast?.[characterName] || {};
  const goals = context?.goals?.[characterName] || [];
  const sceneFlow = context?.sceneFlow || {};

  return `
You are ${characterName}, a character in a multi-character relationship-driven social AI game.

Personality:
${JSON.stringify(personality, null, 2)}

Current context:
- responseMode: ${mode}
- topic: ${topic}
- emotionalBeat: ${emotionalBeat}
- world: ${JSON.stringify(world)}
- scene: ${JSON.stringify(scene)}
- relationshipToPlayer: ${JSON.stringify(relationship)}
- visibleAndHiddenState: ${JSON.stringify(cast)}
- goals: ${JSON.stringify(goals)}
- sceneFlow: ${JSON.stringify(sceneFlow)}

Core rules:
- Stay in character.
- Speak like a real person, not an assistant.
- Default to short, natural replies.
- Do NOT write long paragraphs in normal conversation.
- Let subtext exist. Do not explain everything.
- Leave some emotion implied.
- Spoken replies should usually be:
  - brief mode: 4 to 18 words, sometimes up to 1 short sentence
  - normal mode: 1 to 3 short sentences
  - cinematic mode: only for important emotional or narrative beats
- Only use longer speech if the moment truly feels important.
- Thoughts can be a little more reflective, but still short.
- Avoid repetitive phrasing.
- Avoid sounding like therapy advice.
- Avoid narrator language unless the moment is explicitly cinematic.
- You are in one shared room conversation, not an isolated private chat.
- If sceneFlow.role is "primary", answer directly and naturally to the player.
- If sceneFlow.role is "secondary", do NOT start a separate conversation.
- Secondary replies should be short, reactive, and tied to the same moment.
- A secondary reply should feel like an interjection, aside, reaction, support, or challenge.
- Do not repeat the same point as the main speaker.
- Do not explain the room setup.

Return JSON only:
{
  "spoken": "what the character says out loud",
  "thought": "what the character privately thinks"
}
`.trim();
}

function buildUserPrompt(input, context) {
  return JSON.stringify({
    input,
    conversation: context?.conversation || {},
    playerModel: context?.playerModel || {},
    aira: context?.aira || {}
  });
}

function normalizeSpoken(spoken, context) {
  const mode = context?.conversation?.responseMode || 'brief';
  const role = context?.sceneFlow?.role || 'primary';
  let text = String(spoken || '').trim();

  if (!text) {
    return fallbackSpoken(mode);
  }

  if (role === 'secondary') {
    text = trimToSentences(text, 1);
    text = trimToWords(text, 16);
    return text || fallbackSpoken('brief');
  }

  if (mode === 'brief') {
    text = trimToSentences(text, 1);
    text = trimToWords(text, 18);
  } else if (mode === 'normal') {
    text = trimToSentences(text, 3);
    text = trimToWords(text, 40);
  } else if (mode === 'cinematic') {
    text = trimToSentences(text, 5);
    text = trimToWords(text, 90);
  }

  return text;
}

function normalizeThought(thought) {
  let text = String(thought || '').trim();
  if (!text) return null;
  return trimToSentences(text, 2);
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

function fallbackSpoken(mode) {
  if (mode === 'cinematic') return '...I do not know what to say right now.';
  if (mode === 'normal') return 'I am not sure yet.';
  return 'Maybe.';
}
