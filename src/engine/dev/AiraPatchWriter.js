export class AiraPatchWriter {
  constructor(observer) {
    this.observer = observer;
    this.patches = [];

    observer.onIssue((issue) => {
      this._generatePatch(issue);
    });
  }

  _generatePatch(issue) {
    let suggestion = '';

    switch (issue.type) {
      case 'NO_RESPONSE':
        suggestion =
          '// PATCH: Add fallback response for unhandled input\n' +
          `// Input was: "${issue.data.input}"\n` +
          '// Suggestion: Add a catch-all in AiraBrainController.process().';
        break;

      case 'LOW_VARIETY':
        suggestion =
          '// PATCH: Improve responder selection variety\n' +
          '// Suggestion: Add cooldown or rotation in _selectResponders().';
        break;

      case 'EMOTION_MISMATCH':
        suggestion =
          '// PATCH: Sync dialogue tone with tension level\n' +
          `// Tension was ${issue.data.tension}\n` +
          '// Suggestion: Increase punctuation or intensity in AiraBrain._applyTone().';
        break;

      case 'AIRA_INTERFERENCE_OVERUSE':
        suggestion =
          '// PATCH: Reduce interference frequency\n' +
          `// ${issue.data.count} events in last 8 turns.\n` +
          '// Suggestion: Increase MIN_COOLDOWN or reduce interferenceChance scaling in AiraInterferenceSystem.';
        break;

      case 'AIRA_INTERFERENCE_REPETITIVE':
        suggestion =
          `// PATCH: Add diversity to interference type selection\n` +
          `// Type "${issue.data.type}" is overused.\n` +
          '// Suggestion: Add recent-type suppression in AiraInterferenceSystem._pickType().';
        break;

      case 'AIRA_INTERFERENCE_TOO_WEAK':
        suggestion =
          '// PATCH: Interference threshold may be too high\n' +
          `// presenceLevel is ${issue.data.presenceLevel} but no events fired.\n` +
          '// Suggestion: Review interferenceChance scaling in AiraPresenceSystem.';
        break;

      default:
        suggestion =
          `// PATCH: Unknown issue type "${issue.type}"\n` +
          `// ${issue.message}`;
    }

    const patch = {
      type: issue.type,
      suggestion,
      created: Date.now(),
      applied: false
    };

    this.patches.push(patch);

    if (this.patches.length > 30) {
      this.patches.shift();
    }

    return patch;
  }

  getPending() {
    return this.patches.filter((patch) => !patch.applied);
  }

  markApplied(index) {
    if (this.patches[index]) {
      this.patches[index].applied = true;
    }
  }

  getAll() {
    return [...this.patches];
  }
}
