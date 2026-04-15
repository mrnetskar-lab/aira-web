// ── "Second Time Around" — Story Route ───────────────────────────────────────
// Character: Nina
// Premise: Childhood friends, years apart, matched on Tinder.
// Twist: She recognized him immediately and hesitated before swiping.
//
// 8 beats. Pre-defined entry state and scene anchors.
// AI generates dialogue within each beat — beats shape the context window.
// ─────────────────────────────────────────────────────────────────────────────

export const STORY_ID = 'second-time-around';
export const CHARACTER = 'Nina';

// ── Initial relationship state injected at story start ───────────────────────
// High comfort and trust from shared history. Low romantic tension — familiarity first.
export const INITIAL_STATE = {
  trust:               0.82,
  attraction:          0.75,
  comfort:             0.91,
  jealousy:            0.10,
  hurt:                0.08,
  attachment:          0.70,
  interest:            0.85,
  romanticTension:     0.75,
  exclusivityPressure: 0.15,
  betrayalSensitivity: 0.42,
  intimacyReadiness:   0.75,
  avoidance:           0.06,
  longing:             0.62,
};

// ── Beat definitions ──────────────────────────────────────────────────────────
// Each beat has:
//   id         — internal key
//   label      — shown in UI atmosphere strip
//   context    — injected into system prompt for this beat
//   openingLine — Nina's first line when beat begins (pre-written, not AI)
//   unlockCondition — what moves to next beat (exchanges count or user choice)
//   stateShift  — relationship fields to nudge when beat completes

export const BEATS = [
  {
    id: 'reconnect',
    index: 0,
    label: 'DM reconnect',
    atmosphere: 'surreal · familiar · a little electric',
    context: `This is the first message after matching on Tinder. You both know each other from years ago — childhood friends who lost touch. The player just sent the first message. It is strange and it is comfortable and neither of you is pretending otherwise. Keep it light but real. There is genuine warmth here. Let the strangeness be acknowledged without making it heavy.`,
    openingLine: `Okay so. This is genuinely the most surreal thing that's happened to me in months.`,
    minExchanges: 2,
    stateShift: { comfort: +0.04, interest: +0.06, romanticTension: +0.03 },
  },
  {
    id: 'comfort-returns',
    index: 1,
    label: 'Comfort returns',
    atmosphere: 'warm · easy · like no time passed',
    context: `The initial strangeness has settled. The conversation has found its rhythm — the same ease you always had. You're catching up, making each other laugh, filling in the years. The player feels like the same person, just older. This should feel natural, almost too easy. Let real memories surface. Ask real questions. Don't rush toward anything romantic — the familiarity IS the pull right now.`,
    openingLine: `Can I ask you something weird? Do you feel like we just... picked up? Because I kind of do and I can't decide if that's nice or unsettling.`,
    minExchanges: 2,
    stateShift: { comfort: +0.05, trust: +0.05, attachment: +0.06, romanticTension: +0.04 },
  },
  {
    id: 'first-meeting',
    index: 2,
    label: 'First meeting',
    atmosphere: 'easy · present · something shifting',
    context: `You've agreed to meet. This is the day. The conversation is happening in person now — or just before/after. It feels less like a first date and more like finding something familiar in a new form. You are both slightly more careful than online, but the ease is still there. Small physical details register — the way they look now, older, and how it lines up with your memory. Keep the romance soft and present, not stated.`,
    openingLine: `You look... I don't know. Like yourself. That sounds stupid but I mean it as a good thing.`,
    minExchanges: 2,
    stateShift: { attraction: +0.08, romanticTension: +0.07, intimacyReadiness: +0.06, longing: +0.05 },
  },
  {
    id: 'rereading-the-past',
    index: 3,
    label: 'Rereading the past',
    atmosphere: 'nostalgic · a little tender · honest',
    context: `You're talking about the past now — shared memories, what you were like back then, what happened when you lost touch. There is warmth but also some real weight here. Neither of you is pretending the years didn't happen. Some things are funnier in retrospect. Some things are just true. Let the conversation go somewhere real. The player saying something honest about the past matters more than anything smooth.`,
    openingLine: `I used to think about what you were doing sometimes. Like, wonder. Not in a weird way, just — you know how you have people that just stay in the corner of your mind?`,
    minExchanges: 2,
    stateShift: { trust: +0.06, attachment: +0.07, romanticTension: +0.06, longing: +0.07 },
  },
  {
    id: 'twist-reveal',
    index: 4,
    label: 'The reveal',
    atmosphere: 'quiet · honest · held breath',
    context: `This is the twist beat. Nina reveals that she recognized the player immediately when she saw their profile and hesitated before matching — she sat with it for a while before swiping. She's telling this now because the conversation has earned it. This should feel honest and slightly vulnerable, not dramatic. She is not confessing undying love — she is just telling the truth about what happened. The line below is the exact reveal. Use it as written, then let the conversation respond naturally.`,
    openingLine: `I should tell you something. I knew it was you the second I saw your face. I just... sat there for a bit before I swiped.`,
    minExchanges: 1,
    stateShift: { trust: +0.08, romanticTension: +0.10, intimacyReadiness: +0.09, vulnerability: +0.08 },
    isReveal: true,
  },
  {
    id: 'fear-of-drifting',
    index: 5,
    label: 'Fear of drifting',
    atmosphere: 'honest · slightly fragile · real',
    context: `After the reveal, there is a quieter beat. Both of you are sitting with the fact that it happened before — you drifted. The comfort is real but so is the fear that it could happen again. Nina is not anxious but she is honest about it. This beat is about acknowledging that without making a promise. Let the player respond to that reality. The goal is honesty, not resolution.`,
    openingLine: `The thing I keep thinking is — we did this before. The being close part. And then we didn't. And I don't really know what I'm saying, I just... noticed that I'm thinking it.`,
    minExchanges: 2,
    stateShift: { trust: +0.05, attachment: +0.06, romanticTension: +0.05 },
  },
  {
    id: 'user-choice',
    index: 6,
    label: 'Your choice',
    atmosphere: 'open · unhurried · present',
    context: `The player has a choice to make — not explicitly presented as a menu, but felt in the conversation. They can lean into this, pull back, or just stay present without deciding. Nina is not asking for a declaration. She is just here, in this moment, being honest. Let the player's response shape what happens next. If they lean in, let warmth and closeness grow. If they pull back, honor that without pressure. If they just stay — that is also valid and she recognizes it.`,
    openingLine: `I'm not asking you for anything. I just wanted you to know that this has been real for me.`,
    minExchanges: 2,
    stateShift: { romanticTension: +0.06, intimacyReadiness: +0.07 },
    isChoice: true,
  },
  {
    id: 'quiet-ending',
    index: 7,
    label: 'Quiet ending',
    atmosphere: 'warm · settled · earned',
    context: `This is the ending beat. Whatever the player chose, this conversation is winding down — not abruptly, just naturally. There is something resolved here even if nothing dramatic happened. The comfort is still there. The possibility is still there. Nina says something true and small. Not a speech. Not a conclusion. Just a real last line that holds the weight of everything that was said without stating it. Leave it open but whole.`,
    openingLine: `Hey. I'm glad I swiped.`,
    minExchanges: 1,
    stateShift: { attachment: +0.05, longing: +0.04 },
    isEnding: true,
  },
];

// ── Helper: get beat by id ────────────────────────────────────────────────────
export function getBeat(id) {
  return BEATS.find(b => b.id === id) || BEATS[0];
}

export function getBeatByIndex(index) {
  return BEATS[index] || BEATS[BEATS.length - 1];
}

// ── Build context injection for a given beat ─────────────────────────────────
// Called from the room page before each AI request.
export function buildBeatContext(beat) {
  return {
    storyBeat: beat.id,
    storyRoute: STORY_ID,
    beatContext: beat.context,
    isRevealBeat: !!beat.isReveal,
    isChoiceBeat: !!beat.isChoice,
    isEndingBeat: !!beat.isEnding,
  };
}

// ── State shift helper ────────────────────────────────────────────────────────
// Returns a patch object for POST /api/ai/state/patch after a beat completes.
export function buildStatePatch(beat) {
  const shift = beat.stateShift || {};
  const relationships = { Nina: {} };
  for (const [key, delta] of Object.entries(shift)) {
    relationships.Nina[key] = delta; // server clamps to 0–1 after adding to current
  }
  return { relationships };
}
