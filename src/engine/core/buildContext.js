export function buildContext({ input, state, memory, focus, brain }) {
  const recent = memory.getRecent(6);
  const recalled = memory.recall(5);

  const activeAgents = [...brain.brains.keys()];

  return {
    session: {
      userId: "local-user",
      name: "Player",
      language: "no",
      playStyle: "curious"
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
      location: "living_room",
      time: getTimeOfDay(),
      atmosphere: state.tension > 0.6 ? "tense" : "calm",
      activity: "free_chat",
      tension: state.tension
    },

    characters: buildCharacterStates(activeAgents, focus, state),

    relationships: buildRelationshipState(activeAgents),

    memory: recalled,

    gameplay: {
      mode: "free_chat",
      activeChallenge: null,
      lastEvent: null,
      emotionalBeat: getEmotionalBeat(state.tension)
    }
  };
}

/* ---------------- HELPERS ---------------- */

function detectTopic(input) {
  const text = input.toLowerCase();

  if (text.includes("love") || text.includes("like")) return "romance";
  if (text.includes("angry") || text.includes("mad")) return "conflict";
  if (text.includes("game")) return "game";

  return "general";
}

function getTimeOfDay() {
  const hour = new Date().getHours();

  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getEmotionalBeat(tension, input) {
  if (tension > 0.7) return "high_tension";
  if (tension > 0.4) return "rising";
  return "neutral";
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

function buildCharacterStates(agents, focus, state) {
  const result = {};

  for (const name of agents) {
    result[name] = {
      visible: {
        mood: state.tension > 0.6 ? "tense" : "calm",
        expression: state.tension > 0.6 ? "guarded" : "soft"
      },

      hidden: {
        attraction: Math.random() * 0.8,
        jealousy: Math.random() * 0.4,
        hurt: Math.random() * 0.3,
        trust: Math.random() * 0.7
      },

      phase: "curious",
      focus: focus.getCurrent() === name
    };
  }

  return result;
}

function buildRelationshipState(agents) {
  const result = {};

  for (const name of agents) {
    result[name] = {
      trust: Math.random() * 0.7,
      attraction: Math.random() * 0.8,
      comfort: Math.random() * 0.6,
      jealousy: Math.random() * 0.4,
      attachment: Math.random() * 0.5
    };
  }

  return result;
}
