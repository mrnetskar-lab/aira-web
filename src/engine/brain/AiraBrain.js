export class AiraBrain {
  constructor(name, personality = {}) {
    this.name = name;
    this.personality = {
      tone: personality.tone || 'neutral',
      directness: personality.directness ?? 0.5,
      emotionRange: personality.emotionRange ?? 0.5,
      baseline: personality.baseline || 'neutral',
      reaction: personality.reaction || 'calm',
      intensity: personality.intensity ?? 0.5
    };
  }

  respond(input, context = {}) {
    const tension = context.tension ?? 0;
    const spoken = this._applyTone(this._baseResponse(input, tension), tension);
    const thought = this._generateThought(input, tension);

    if (!this.isValidMessage(spoken)) {
      return {
        agent: this.name,
        spoken: '',
        thought
      };
    }

    return {
      agent: this.name,
      spoken,
      thought
    };
  }

  isValidMessage(text) {
    if (!text) return false;
    if (text.trim().length < 6) return false;
    return true;
  }

  _baseResponse(input, tension) {
    const lower = String(input || '').toLowerCase();
    const p = this.personality;

    if (p.baseline === 'defensive' && tension > 0.4) {
      return this._pick([
        "I'm not sure about this.",
        "Why would you say that?",
        "Hold on, that doesn't feel right.",
        "I don't trust where this is going."
      ]);
    }

    if (p.baseline === 'intuitive') {
      if (tension > 0.5) {
        return this._pick([
          "Something feels off here.",
          "There's more to this than you're saying.",
          "I can feel something changing.",
          "Something isn't right."
        ]);
      }

      if (/\b(hello|hi|hey|hei)\b/.test(lower)) {
        return this._pick([
          "Hey. I was just thinking about that.",
          "Hi. Tell me more.",
          "Hello. I had a feeling you'd say that."
        ]);
      }

      return this._pick([
        "Hmm, interesting.",
        "Tell me more.",
        "I was just thinking about that.",
        "I had a feeling you'd say that."
      ]);
    }

    if (p.baseline === 'grounded') {
      if (tension > 0.5) {
        return this._pick([
          "Let's slow down a bit.",
          "Take a breath. What's really going on?",
          "Let's think about this clearly.",
          "One thing at a time."
        ]);
      }

      if (/\b(hello|hi|hey|hei)\b/.test(lower)) {
        return this._pick([
          "Hey. Good to see you.",
          "Hi. That makes sense already.",
          "Hello. I'm here."
        ]);
      }

      return this._pick([
        "That makes sense.",
        "Sounds good to me.",
        "Sure, why not.",
        "I'm comfortable with that."
      ]);
    }

    return this._pick([
      `${this.name} hears you.`,
      "Hmm, okay.",
      "I see what you mean.",
      "That's interesting.",
      "Let me think about that."
    ]);
  }

  _generateThought(input, tension) {
    const lower = String(input || '').toLowerCase();

    if (tension > 0.65) {
      return this._pick([
        "This is getting serious.",
        "I need to be careful here.",
        "Something is about to change.",
        "I'm not sure I can handle this."
      ]);
    }

    if (/\b(hello|hi|hey|hei)\b/.test(lower)) {
      return this._pick([
        "This feels like a soft opening.",
        "Maybe this conversation will go somewhere good.",
        "I should pay attention."
      ]);
    }

    return this._pick([
      "I'm reading the room.",
      "I want to understand this better.",
      "There's probably more under the surface.",
      "I should stay aware."
    ]);
  }

  _applyTone(text, tension) {
    const p = this.personality;
    let output = text;

    if (p.tone === 'warm') {
      output = output.replace(/\.$/, '') + '.';
    }

    if (p.tone === 'guarded' && tension > 0.55) {
      output = output.charAt(0).toUpperCase() + output.slice(1) + '!';
    }

    if (p.tone === 'playful' && tension < 0.4) {
      output = output.replace(/\.$/, '') + ' :)';
    }

    return output;
  }

  _pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }
}