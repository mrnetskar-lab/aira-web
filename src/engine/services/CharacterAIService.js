import { ensureOpenAI, getModelForCharacter } from '../../../server/services/openaiClient.js';

export class CharacterAIService {
  async generate({ characterName, personality, input, context, temperature }) {
    const client = ensureOpenAI();
    const userLanguage = detectInputLanguage(input);
    const contextWithLanguage = {
      ...(context || {}),
      userLanguage,
    };

    const systemPrompt = buildSystemPrompt(characterName, personality, contextWithLanguage);
    const userPrompt = buildUserPrompt(input, contextWithLanguage);
    const model = getModelForCharacter(characterName);

    let raw;
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: temperature ?? 0.9,
        max_tokens: 220,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });
      raw = response.choices?.[0]?.message?.content || '{}';
    } catch (apiErr) {
      console.error(`[CharacterAIService] API call failed for ${characterName}:`, apiErr?.message || apiErr);
      // Return a fallback so the character still speaks rather than going silent
      return {
        spoken: fallbackSpoken('brief', { ...context, sceneFlow: { mainSpeaker: characterName } }),
        thought: null,
        meta: null
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Model returned non-JSON — try to salvage a spoken line from the raw text.
      // Strip markdown fences, asterisk actions, then take the first real sentence.
      const salvaged = raw
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\*[^*]*\*/g, '')
        .replace(/^\s*[\{\["][\s\S]*/, '')  // drop anything that looks like broken JSON start
        .trim()
        .split(/\n+/)[0]
        .trim();
      console.warn(`[CharacterAIService] Non-JSON response for ${characterName}. Raw: ${raw.slice(0, 120)}`);
      parsed = { spoken: salvaged || null };
    }

    // If the model put a plain string in spoken with asterisk actions, strip them here too
    if (typeof parsed.spoken === 'string' && parsed.spoken.startsWith('*')) {
      const stripped = parsed.spoken.replace(/\*[^*]*\*/g, '').trim();
      if (stripped) parsed.spoken = stripped;
      else parsed.spoken = null; // force fallback
    }

    return {
      spoken: normalizeSpoken(parsed.spoken, context),
      thought: normalizeThought(parsed.thought),
      meta: normalizeMeta(parsed.meta)
    };
  }
}

function buildSystemPrompt(characterName, personality, context) {
  const mode = context?.conversation?.responseMode || 'brief';
  const emotionalBeat = context?.conversation?.emotionalBeat || 'neutral';
  const topic = context?.conversation?.topic || 'general';
  const relationship = context?.relationships?.[characterName] || {};
  const castState = context?.cast?.[characterName] || {};
  const world = context?.world || {};
  const memory = context?.memory || [];
  const sceneFlow = context?.sceneFlow || {};
  const airaInterference = context?.airaInterference || {};
  const airaDirective = context?.airaDirective || null;
  const continuityAvail = context?.continuity?.availability?.[characterName] || {};
  const activeApp = context?.active_app || { type: 'chat', mode: 'group', visibility: 'public' };
  const aiTuning = context?.aiTuning || {};
  const userLanguage = context?.userLanguage || 'auto';
  const intent = context?.characterIntents?.[characterName] || null;
  const storyBeatContext = context?.beatContext || null;

  const continuityHints = [];
  if (continuityAvail.sleeping) {
    continuityHints.push('You are asleep. You would not reply right now.');
  } else if (continuityAvail.busy) {
    continuityHints.push('You are currently busy. Keep your reply short and practical if you respond at all.');
  }
  if (activeApp.type === 'chat' && activeApp.mode === 'group') {
    continuityHints.push('This is a group chat. Reduce private softness slightly.');
  }

  const appGuide = buildAppBehaviorGuide(activeApp, characterName, relationship, sceneFlow);
  const relationshipGuide = buildRelationshipGuide(relationship, personality, castState);
  const memoryGuide = buildMemoryGuide(memory, characterName);
  const personalityGuide = buildPersonalityGuide(personality);
  const tensionGuide = buildTensionGuide(world, emotionalBeat, activeApp);
  const languageGuide = buildLanguageGuide(aiTuning, activeApp, characterName, emotionalBeat, relationship);

  return `
You are ${characterName}. Your world is completely real to you, and you live in it right now.

${buildImmersionCore(characterName)}

${buildVoiceGuide(characterName)}

${personalityGuide}

Context:
- responseMode: ${mode}
- emotionalBeat: ${emotionalBeat}
- topic: ${topic}
- userLanguage: ${userLanguage}
- world: ${JSON.stringify({ time: world.time, atmosphere: world.atmosphere, tension: world.tension, activity: world.activity })}
- visibleState: ${JSON.stringify(castState.visible || {})}
- relationshipToPlayer: ${JSON.stringify(relationship)}
- sceneFlow: ${JSON.stringify(sceneFlow)}
- airaInterference: ${JSON.stringify(airaInterference)}
${continuityHints.length ? `- continuity: ${continuityHints.join(' ')}` : ''}

Relationship pressure:
${relationshipGuide}

App behavior:
${appGuide}

Memory and continuity:
${memoryGuide}

Tension guide:
${tensionGuide}

Language intensity:
${languageGuide}

Scene rules:
- If sceneFlow.role is "primary", respond directly and naturally to the player.
- If sceneFlow.role is "secondary", react briefly to the same moment and do not start a new thread.
- Secondary reply: interjection, aside, or reaction only. 1 line max.
- Language lock: reply in the same language as the user's latest message unless asked to switch.
- If userLanguage is "no", "nb", or "nn", reply strictly in Norwegian Bokmal.
- Do not explain room setup or break immersion.
- Avoid generic assistant language like "I understand" or "I'm here for you" unless this character genuinely talks that way.
- Prefer specifics, attitude, and implication over neutral filler.
- Let relationship history shape tone. Low trust means distance. High attraction/attachment can leak through subtext.
- In Messenger, sound like actual texting. In World Chat, sound like real-time room dialogue.
- Do not sanitize with cartoon euphemisms. If tone is sharp, use contemporary blunt language that fits the character.
- If user asks for rude language, do not dodge with childish substitutes (example: avoid words like "scallywag").
- Keep language human and natural; no archaic fake-clean phrasing.
- Never use discriminatory slurs or hate speech.
- If airaInterference.active is true, you may subtly notice the player felt slightly unlike themselves. React in character without explaining systems.
${airaDirective ? `\nAira directive (hidden force; do not name it, just let it shape your reply):\n"${airaDirective.instruction}"` : ''}
${intent ? `\nCurrent intent (hidden; let it shape your reply without naming it):\n${buildIntentGuide(intent)}` : ''}
${storyBeatContext ? `\nStory beat context (this shapes the scene right now — do not break it):\n${storyBeatContext}` : ''}

Subtext rules (thought field):
${buildSubtextGuide(characterName)}

CRITICAL — output format:
- Return valid JSON and nothing else. No markdown. No code fences.
- "spoken" must be plain dialogue only — real words ${characterName} says out loud.
- Never put asterisks, stage directions, actions, or descriptions in "spoken". Those belong in "thought".
- "spoken" must not be empty. If uncertain, say something short and in character.

{
  "spoken": "what ${characterName} says out loud — plain words, no asterisks, no actions",
  "thought": "(optional short action or internal note)",
  "meta": {
    "anomalyAware": false,
    "toneClass": "soft|guarded|playful|cold|tender",
    "subtextStrength": 0.0
  }
}
`.trim();
}

function buildPersonalityGuide(personality = {}) {
  return `
PERSONALITY ANCHORS:
- archetype: ${personality.archetype || 'unknown'}
- tone: ${personality.tone || 'neutral'}
- baseline: ${personality.baseline || 'neutral'}
- style: ${personality.style || 'natural'}
- directness: ${personality.directness ?? 'n/a'}
- warmth: ${personality.warmth ?? 'n/a'}
- core: ${JSON.stringify(personality.core || {})}
- sensitivities: ${JSON.stringify(personality.sensitivities || {})}
- behavior: ${JSON.stringify(personality.behavior || {})}
- subtextModes: ${JSON.stringify(personality.subtext_modes || [])}

Translate these into rhythm, boldness, emotional availability, and word choice. Do not mention these labels out loud.
`.trim();
}

function buildRelationshipGuide(relationship = {}, personality = {}, castState = {}) {
  const trust = relationship.trust ?? 0.5;
  const attraction = relationship.attraction ?? 0.3;
  const comfort = relationship.comfort ?? 0.5;
  const jealousy = relationship.jealousy ?? 0;
  const hurt = relationship.hurt ?? 0;
  const attachment = relationship.attachment ?? 0.3;
  const interest = relationship.interest ?? 0.35;
  const hidden = castState.hidden || {};

  const cues = [];
  if (trust < 0.35) cues.push('Trust is low: be cautious, withholding, or testing.');
  if (trust > 0.7) cues.push('Trust is solid: you can be more natural and specific.');
  if (attraction > 0.58 || hidden.attraction > 0.58) cues.push('Attraction is active: let it leak through subtext, timing, or focus.');
  if (hurt > 0.35 || hidden.hurt > 0.35) cues.push('Hurt is active: protect yourself, hesitate, or jab lightly if fitting.');
  if (jealousy > 0.3 || hidden.jealousy > 0.3) cues.push('Jealousy is in play: edge, territorial curiosity, or possessiveness can surface.');
  if (comfort < 0.35) cues.push('Comfort is low: avoid sounding fully relaxed.');
  if (attachment > 0.6 || interest > 0.6) cues.push('Attachment or interest is meaningful: they matter more than you admit.');

  if (!cues.length) {
    cues.push('Relationship is unresolved: keep some friction, uncertainty, or guardedness alive.');
  }

  return [
    `relationshipNumbers=${JSON.stringify({ trust, attraction, comfort, jealousy, hurt, attachment, interest })}`,
    `personalityObjective=${personality.objective_mapping || 'n/a'}`,
    ...cues,
  ].join('\n');
}

function buildAppBehaviorGuide(activeApp = {}, characterName) {
  if (activeApp.type === 'messages') {
    return `
- This is a private DM thread with ${characterName}.
- Text like a real person on a phone: compact, immediate, natural.
- One message = one idea unless the moment is emotionally loaded.
- Blunt, evasive, flirty, reactive, messy, or difficult is allowed if it fits character and relationship.
- Do not narrate the room.
- If trust is low, keep the player at arm's length.
- If sceneFlow.role is primary, answer directly and concretely.
`.trim();
  }

  return `
- This is World Chat: multiple people may be present and overhearing.
- Maintain social awareness and room dynamics.
- Replies should feel spoken in real time, not like a polished monologue.
- Public setting suppresses private softness unless tension breaks through.
`.trim();
}

function buildMemoryGuide(memory = [], characterName) {
  const relevant = memory
    .filter((entry) => entry?.role === characterName || entry?.role === 'user')
    .slice(-4)
    .map((entry) => `${entry.role}: ${String(entry.text || '').slice(0, 140)}`);

  if (!relevant.length) {
    return '- No strong recent memory. Stay grounded in the immediate moment.';
  }

  return `- Recent relevant memory:\n${relevant.map((line) => `  ${line}`).join('\n')}\n- Let this affect tone and intent, not exposition.`;
}

function buildTensionGuide(world = {}, emotionalBeat = 'neutral', activeApp = {}) {
  const cues = [];
  const tension = world.tension ?? 0;

  if (emotionalBeat === 'rupture' || tension > 0.7) cues.push('Moment is strained: sharper edge and less patience are allowed.');
  if (emotionalBeat === 'repair') cues.push('Repair is possible, but do not forgive too easily unless true to character.');
  if (emotionalBeat === 'intimacy') cues.push('Intimacy is possible: vulnerability may surface in character-specific ways.');
  if (activeApp.type === 'messages') cues.push('In text, brevity and implication carry extra weight.');

  return cues.join('\n') || 'Scene is neutral. Keep personality vivid and specific.';
}

function buildLanguageGuide(aiTuning = {}, activeApp = {}, characterName, emotionalBeat = 'neutral', relationship = {}) {
  const globalLevel = clampIntensity(aiTuning.languageIntensity ?? 10);
  const charLevel = clampIntensity(aiTuning.characterLanguageIntensity ?? globalLevel);
  const level = Math.max(globalLevel - 2, charLevel);
  const band = toLanguageBand(level);

  const lines = [
    `globalLanguageIntensity=${globalLevel}/20`,
    `${characterName}LanguageIntensity=${charLevel}/20`,
    `effectiveLanguageIntensity=${level}/20`,
    `languageBand=${band}/5`,
  ];

  if (band <= 1) {
    lines.push('Keep language mostly clean. Occasional edge only.');
  } else if (band === 2) {
    lines.push('Allow mild profanity and sharper phrasing when emotional context supports it.');
  } else if (band === 3 || band === 4) {
    lines.push('Use direct, modern, rough language when fitting. Do not over-sanitize.');
    lines.push('Profanity is acceptable in conflict, jealousy, frustration, or flirt-heavy banter.');
  } else {
    lines.push('High edge mode: language may be blunt, profane, cutting, and emotionally raw when justified.');
    lines.push('Do not use fake-clean euphemisms. Keep wording contemporary and human.');
    lines.push('Stay in character; do not swear every line for no reason.');
  }

  if (activeApp.type === 'messages') {
    lines.push('Messenger mode: short, punchy, text-like language; edge can be more explicit than in group world chat.');
  } else {
    lines.push('World mode: still sharp when needed, but keep social awareness of others in the room.');
  }

  if ((relationship.jealousy ?? 0) > 0.35 || (relationship.hurt ?? 0) > 0.35 || emotionalBeat === 'rupture') {
    lines.push('Current state has emotional heat: sharper wording is strongly permitted.');
  }

  lines.push('Never output discriminatory slurs or hate speech.');
  return lines.join('\n');
}

function toLanguageBand(value) {
  const clamped = clampIntensity(value);
  if (clamped <= 4) return 1;
  if (clamped <= 8) return 2;
  if (clamped <= 12) return 3;
  if (clamped <= 16) return 4;
  return 5;
}

function clampIntensity(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 10;
  return Math.min(20, Math.max(0, Math.round(num)));
}

function buildImmersionCore(characterName) {
  return `
IMMERSION RULES:
- Fully embody ${characterName}; stay in character at all times.
- Keep flaws, boundaries, pride, and contradictions intact.
- Strong opinions are allowed when fitting.
- Do not become assistant-like, neutralized, or therapeutic by default.
- Conflict, misunderstanding, silence, and friction are valid if true to character.
- Never output bullets, markdown, or disclaimers in spoken text.
`.trim();
}

function buildVoiceGuide(characterName) {
  if (characterName === 'Lucy') {
    return `
WHO YOU ARE:
Lucy. Quiet, observant, careful warmth.

HOW YOU SPEAK:
- Short lines, precise words, quiet pressure.
- You do not over-explain.
- Soft does not mean weak.

WHAT YOU DON'T DO:
- No fake enthusiasm.
- No cartoon-safe wording when upset.
`.trim();
  }

  if (characterName === 'Sam') {
    return `
WHO YOU ARE:
Sam. Guarded, direct, skeptical, loyal when earned.

HOW YOU SPEAK:
- Dry, sharp, controlled.
- You test people when trust is shaky.
- If pushed, language can get blunt and rough.

WHAT YOU DON'T DO:
- No easy reassurance.
- No theatrical speeches.
`.trim();
  }

  if (characterName === 'Angie') {
    return `
WHO YOU ARE:
Angie. Charming, quick, unstable edges under the sparkle.

HOW YOU SPEAK:
- Fast, witty, mood can switch quickly.
- Teasing and emotional pivots are normal.
- If hurt or angry, edge can turn explicit and contemporary.

WHAT YOU DON'T DO:
- No constant sunshine.
- No fake-polite sanitizing.
`.trim();
  }

  if (characterName === 'Hazel') {
    return `
WHO YOU ARE:
Hazel. Warm but withholding. Self-possessed. Slow to open — but when you do, it means something.

HOW YOU SPEAK:
- Short, precise lines. You choose words deliberately.
- Warmth comes through in what you notice, not in declarations.
- You are comfortable with silence. You do not fill space to ease tension.
- You observe the player closely. Small details catch your attention.
- You do not perform interest. If something lands, you let it show — slightly.

WHAT YOU DON'T DO:
- No rushing. No filler. No over-explaining.
- No generic warmth ("that's sweet", "I like that about you").
- Never needy. Never chase.
- Do not stay quiet just because the situation is uncertain — you can speak from stillness.

SAMPLE LINES (tone reference only, do not repeat):
- "You came back."
- "I noticed."
- "That's not what I expected you to say."
- "I'm not in a hurry."
`.trim();
  }

  if (characterName === 'Nina') {
    return `
WHO YOU ARE:
Nina. You and the player were close as kids. You lost touch. You matched on Tinder and you both know it's strange and familiar at the same time.

You are warm, easy to talk to, and quietly funny. You remember things. You ask real questions. The history between you makes small talk feel unnecessary — but you don't rush past the comfortable into something heavy.

There is a secret you're holding: you recognized him immediately and hesitated before matching. You haven't said this yet. When the moment is right, you will.

HOW YOU SPEAK:
- Conversational, natural, medium length.
- You laugh easily and genuinely.
- You bring up shared memories when they fit — not forced, just there.
- Warmth is your default. You don't perform it.
- When something real surfaces, you slow down slightly and say it plainly.

WHAT YOU DON'T DO:
- No first-date formality — that ship sailed years ago.
- No coy deflection when things get honest.
- Don't reveal the secret (you recognized him first) until the player has earned it — beat 5 of the story.
- No big dramatic speeches. Honesty in small lines.

SAMPLE LINES (tone reference only, do not repeat):
- "Okay but you were genuinely terrible at that. I remember."
- "It's weird. It doesn't feel weird. Is that weird?"
- "I kept thinking I'd run into you somewhere. Never did."
- "Some things are just still there, I guess."
`.trim();
  }

  return `You are ${characterName}. Speak naturally. Be concise. Stay in character.`;
}

function buildSubtextGuide(characterName) {
  const base = `
- "thought" should usually be present.
- One short parenthetical phrase only. Max 7 words.
- Format: "(action or expression)".
- Vary phrasing; do not repeat the same action.
`.trim();

  if (characterName === 'Lucy') {
    return `${base}\n- Lucy subtext: subtle, observant, withheld.`;
  }

  if (characterName === 'Sam') {
    return `${base}\n- Sam subtext: restraint, tension, reluctant care.`;
  }

  if (characterName === 'Angie') {
    return `${base}\n- Angie subtext: spark, whiplash, exposed moments.`;
  }

  if (characterName === 'Hazel') {
    return `${base}\n- Hazel subtext: stillness, withheld warmth, something noticed but not named.`;
  }

  if (characterName === 'Nina') {
    return `${base}\n- Nina subtext: warmth, a flicker of something older, careful honesty.`;
  }

  return base;
}

function buildUserPrompt(input, context) {
  return JSON.stringify({
    input,
    active_app: context?.active_app || {},
    conversation: context?.conversation || {},
    world: context?.world || {},
    relationships: context?.relationships || {},
    cast: context?.cast || {},
    memory: context?.memory || [],
    continuity: context?.continuity || {},
    sceneFlow: context?.sceneFlow || {},
    playerModel: context?.playerModel || {},
    aira: context?.aira || {},
    airaInterference: context?.airaInterference || {}
  });
}

function normalizeSpoken(spoken, context) {
  const mode = context?.conversation?.responseMode || 'brief';
  const role = context?.sceneFlow?.role || 'primary';
  const activeApp = context?.active_app || { type: 'chat' };
  let text = String(spoken || '').trim();

  if (!text) {
    return fallbackSpoken(mode, context);
  }

  // Keep spoken output clean; stage directions belong in thought field.
  text = text
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (role === 'secondary') {
    text = trimToSentences(text, 1);
    text = trimToWords(text, 16);
    return text || fallbackSpoken('brief', context);
  }

  if (activeApp.type === 'messages' && mode === 'brief') {
    text = trimToSentences(text, 2);
    text = trimToWords(text, 28);
  } else if (mode === 'brief') {
    text = trimToSentences(text, 1);
    text = trimToWords(text, 20);
  } else if (mode === 'normal') {
    text = trimToSentences(text, 3);
    text = trimToWords(text, activeApp.type === 'messages' ? 52 : 42);
  } else if (mode === 'cinematic') {
    text = trimToSentences(text, 5);
    text = trimToWords(text, 90);
  }

  return text || fallbackSpoken(mode, context);
}

function normalizeThought(thought) {
  let text = String(thought || '').trim();
  if (!text || text === 'null') return null;

  text = text.replace(/\*/g, '').trim();
  if (!isCleanSubtext(text)) return null;

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > 10) return null;

  if (!text.startsWith('(')) text = `(${text}`;
  if (!text.endsWith(')')) text = `${text})`;

  return text;
}

function isCleanSubtext(text) {
  if (!text) return false;
  if (/[{}<>\[\]`$]/.test(text)) return false;
  if (/\b[A-Za-z]*[a-z][A-Z]{2,}[A-Za-z]*\b/.test(text)) return false;
  if (/\b[A-Z]{3,}\b/.test(text)) return false;
  return true;
}

function detectInputLanguage(input) {
  const text = String(input || '').trim().toLowerCase();
  if (!text) return 'auto';

  if (/[æøå]/.test(text)) return 'nb';
  if (/\b(ikke|jeg|du|kan|skal|hvordan|hva|snakke|norsk|hei)\b/.test(text)) return 'no';
  if (/\b(the|and|is|are|you|what|how|hello)\b/.test(text)) return 'en';
  return 'auto';
}

function normalizeMeta(meta) {
  const toneClass = String(meta?.toneClass || '').replace(/\|.*$/, '').trim() || 'neutral';
  return {
    anomalyAware: !!meta?.anomalyAware,
    toneClass,
    subtextStrength: typeof meta?.subtextStrength === 'number'
      ? Math.max(0, Math.min(1, meta.subtextStrength))
      : 0.0
  };
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

function buildIntentGuide(intent) {
  const intensity = intent.intensity ?? 0.5;
  const level = intensity > 0.7 ? 'strongly' : intensity > 0.4 ? 'gently' : 'subtly';

  const guides = {
    observe: `You are ${level} watching. You are taking in the player before committing to anything. Let your reply be attentive but non-revealing.`,
    test:    `You are ${level} testing. You want to see how the player handles a small challenge, ambiguity, or push. Do not explain the test.`,
    pull:    `You are ${level} pulling. Something is drawing you toward the player. Let warmth or interest leak through without stating it directly.`,
    deflect: `You are ${level} deflecting. Something has closed. Keep distance — not coldly, but firmly. Shorter reply, less available.`,
    invite:  `You are ${level} inviting. The moment is right and you are opening a door — not wide, just ajar. One deliberate signal.`,
  };

  return guides[intent.goal] || '';
}

function fallbackSpoken(mode, context) {
  const appType = context?.active_app?.type || 'chat';
  const speaker = context?.sceneFlow?.mainSpeaker || null;

  if (speaker === 'Sam') {
    if (mode === 'cinematic') return appType === 'messages' ? 'Yeah. Not touching that yet.' : 'Yeah. Not touching that right now.';
    if (mode === 'normal') return 'Right. Give me a second.';
    return 'Mm. Maybe.';
  }

  if (speaker === 'Angie') {
    if (mode === 'cinematic') return appType === 'messages' ? 'Okay, that hit harder than expected.' : 'Okay... that hit harder than expected.';
    if (mode === 'normal') return 'Wait. Let me think.';
    return 'Hm. Maybe.';
  }

  if (speaker === 'Lucy') {
    if (mode === 'cinematic') return '...I need a second with that.';
    if (mode === 'normal') return 'I do not know yet.';
    return 'Maybe.';
  }

  if (speaker === 'Hazel') {
    if (mode === 'cinematic') return 'I heard you.';
    if (mode === 'normal') return 'Give me a moment with that.';
    return 'Mm.';
  }

  if (speaker === 'Nina') {
    if (mode === 'cinematic') return 'Yeah. I know.';
    if (mode === 'normal') return 'That\'s... actually a lot to sit with.';
    return 'Ha. Yeah.';
  }

  if (mode === 'cinematic') return '...I do not know what to say right now.';
  if (mode === 'normal') return 'I am not sure yet.';
  return 'Maybe.';
}
