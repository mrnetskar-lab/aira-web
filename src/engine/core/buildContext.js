export function buildContext({ input, state, memory, focus, brain }) {
  const recent = memory.getRecent(6);
  const recalled = memory.recall(5);
  const activeAgents = [...brain.brains.keys()];

  return {
    session: {
      userId: 'local-user',
      name: 'Player',
      language: 'no',
      playStyle: 'curious'
    },

    conversation: {
      lastInput: input,
      turnCount: state.turnCount,
      topic: detectTopic(input),
      intensity: state.tension,
      recentMessages: recent,
      emotionalBeat: getEmotionalBeat(state.tension, input),
      responseMode: getResponseMode(state, input)
    },

    world: {
      location: 'living_room',
      time: getTimeOfDay(),
      atmosphere: state.tension > 0.6 ? 'tense' : 'calm',
      activity: 'free_chat',
      tension: state.tension
    },

    cast: buildPersistentCast(activeAgents, focus, state),

    relationships: state.relationships || {},

    memory: recalled,

    gameplay: {
      mode: 'free_chat',
      activeChallenge: null,
      lastEvent: state.lastEvent || null,
      emotionalBeat: getEmotionalBeat(state.tension, input),
      protectedChoice: !!state.protectedChoice
    },

    aira: state.aira || null,
    investigation: state.investigation || null,

    active_app: state.continuity?.activeApp || { type: "chat", mode: "group", visibility: "public" },

    continuity: {
      timeBlock: state.continuity?.timeBlock,
      availability: state.continuity?.availability,
    },
  };
}

function detectTopic(input) {
  const text = String(input || '').toLowerCase();

  if (text.includes('love') || text.includes('like')) return 'romance';
  if (text.includes('angry') || text.includes('mad')) return 'conflict';
  if (text.includes('game')) return 'game';

  return 'general';
}

function getTimeOfDay() {
  const hour = new Date().getHours();

  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function getEmotionalBeat(tension, input) {
  const text = String(input || '').toLowerCase();

  if (/\b(sorry|forgive|i was wrong|come back|make it right)\b/.test(text)) return 'repair';
  if (/\b(love you|need you|miss you|want you|hold me|together)\b/.test(text)) return 'intimacy';
  if (tension > 0.7 || /\b(hate|done|over|leave|fight|shut up)\b/.test(text)) return 'rupture';
  if (tension > 0.4) return 'rising';
  return 'neutral';
}

function getResponseMode(state, input) {
  const text = String(input || '').toLowerCase();

  if (/\b(sorry|forgive|miss you|love|need you|want you)\b/.test(text)) {
    return 'normal';
  }

  if ((state.tension || 0) > 0.75) {
    return 'normal';
  }

  if (state.lastEvent === 'major_reveal' || state.lastEvent === 'aira_manifestation') {
    return 'cinematic';
  }

  return 'brief';
}

function buildPersistentCast(agents, focus, state) {
  const result = {};

  for (const name of agents) {
    result[name] = {
      visible: {
        mood: state.tension > 0.6 ? 'tense' : 'calm',
        expression: state.tension > 0.6 ? 'guarded' : 'soft'
      },

      hidden: {
        ...(state.cast?.[name]?.hidden || {
          attraction: 0.3,
          jealousy: 0.1,
          hurt: 0,
          trust: 0.5
        })
      },

      phase: 'curious',
      focus: focus.getCurrent() === name
    };
  }

  return result;
}
