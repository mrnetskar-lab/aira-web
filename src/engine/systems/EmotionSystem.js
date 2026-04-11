export class EmotionSystem {
  analyzeInput(input, state) {
    const text = String(input || '').toLowerCase();

    let delta = 0;

    if (/\b(angry|mad|furious|fight|danger|hate|kill)\b/.test(text)) {
      delta += 0.25;
    }

    if (/\b(sad|hurt|cry|alone|lost)\b/.test(text)) {
      delta += 0.15;
    }

    if (/\b(happy|love|great|safe|calm|relax)\b/.test(text)) {
      delta -= 0.10;
    }

    if (text.includes('!')) {
      delta += 0.08;
    }

    state.tension = Math.max(0, Math.min(1, state.tension + delta));

    if (delta === 0) {
      state.tension = Math.max(0, state.tension - 0.02);
    }
  }
}
