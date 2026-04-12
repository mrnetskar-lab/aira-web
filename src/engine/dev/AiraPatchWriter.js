export class AiraPatchWriter {
  constructor(observer) {
    this.observer = observer;
    this.patches = [];

    observer.onIssue((issue) => {
      this._generatePatch(issue);
    });
  }

  _generatePatch(issue) {
    const suggestion = this._buildSuggestion(issue);

    const patch = {
      type: issue.type,
      severity: suggestion.severity,
      file: suggestion.file,
      method: suggestion.method,
      confidence: suggestion.confidence,
      reason: suggestion.reason,
      suggestion: suggestion.patchIntent,
      created: Date.now(),
      applied: false
    };

    this.patches.push(patch);

    if (this.patches.length > 40) {
      this.patches.shift();
    }

    return patch;
  }

  _buildSuggestion(issue) {
    switch (issue.type) {
      case 'NO_RESPONSE':
        return {
          severity: 'high',
          file: 'src/engine/brain/AiraBrainController.js',
          method: 'process',
          confidence: 0.92,
          reason: 'No characters returned a visible response.',
          patchIntent: 'Add or strengthen fallback primary response handling.'
        };

      case 'LOW_VARIETY':
        return {
          severity: 'medium',
          file: 'src/engine/brain/AiraBrainController.js',
          method: '_selectPrimary',
          confidence: 0.76,
          reason: 'Room variety is too low.',
          patchIntent: 'Add recent-speaker cooldown or relationship-weighted responder selection.'
        };

      case 'EMOTION_MISMATCH':
        return {
          severity: 'medium',
          file: 'src/engine/services/CharacterAIService.js',
          method: 'buildSystemPrompt',
          confidence: 0.81,
          reason: 'Scene tension is high but dialogue tone remains too calm.',
          patchIntent: 'Increase high-tension language pressure and allow sharper anomaly-aware reactions.'
        };

      case 'PRIMARY_LOCK':
        return {
          severity: 'medium',
          file: 'src/engine/brain/AiraBrainController.js',
          method: '_selectPrimary',
          confidence: 0.88,
          reason: 'The same character is dominating too many turns.',
          patchIntent: 'Add recent-primary cooldown and stronger relationship-based scoring.'
        };

      case 'AIRA_INTERFERENCE_OVERUSE':
        return {
          severity: 'high',
          file: 'src/engine/systems/AiraInterferenceSystem.js',
          method: 'apply',
          confidence: 0.91,
          reason: 'Interference frequency is high enough to reduce mystery.',
          patchIntent: 'Increase cooldown or reduce activation probability.'
        };

      case 'AIRA_INTERFERENCE_TOO_WEAK':
        return {
          severity: 'medium',
          file: 'src/engine/systems/AiraPresenceSystem.js',
          method: 'update',
          confidence: 0.83,
          reason: 'Presence is high but the player is not feeling the effect.',
          patchIntent: 'Raise mid-stage interference chance slightly or unlock more subtle tone shifts earlier.'
        };

      case 'AIRA_INTERFERENCE_REPETITIVE':
        return {
          severity: 'medium',
          file: 'src/engine/systems/AiraInterferenceSystem.js',
          method: '_buildEvent',
          confidence: 0.89,
          reason: 'The same interference type is repeating too often.',
          patchIntent: 'Add recent-pattern suppression and expand variation pool.'
        };

      case 'ROMANCE_TOO_FLAT':
        return {
          severity: 'medium',
          file: 'src/engine/systems/RelationshipEngine.js',
          method: 'update',
          confidence: 0.82,
          reason: 'Romantic tension is not increasing even in repeated high-affinity scenes.',
          patchIntent: 'Increase tension transfer from selective warmth, near-confession scenes, and delayed follow-up moments.'
        };

      case 'CONTINUITY_TOO_WEAK':
        return {
          severity: 'medium',
          file: 'src/engine/systems/RelationshipContinuitySystem.js',
          method: 'tick',
          confidence: 0.75,
          reason: 'Characters are not following up on unresolved emotional threads.',
          patchIntent: 'Lower delayed outreach thresholds and increase follow-up scheduling for high-attachment characters.'
        };

      case 'TIMING_TOO_PUNITIVE':
        return {
          severity: 'medium',
          file: 'src/engine/systems/RelationshipEngine.js',
          method: 'update',
          confidence: 0.78,
          reason: 'Players are losing relationship progress too quickly from timing missteps.',
          patchIntent: 'Reduce avoidance growth rate and soften betrayal sensitivity defaults.'
        };

      case 'SOCIAL_RISK_TOO_RANDOM':
        return {
          severity: 'medium',
          file: 'src/engine/systems/RelationshipEngine.js',
          method: 'update',
          confidence: 0.72,
          reason: 'Social risk consequences feel arbitrary rather than behaviorally grounded.',
          patchIntent: 'Tie suspicion and resentment growth more tightly to detected overlap patterns, not random hits.'
        };

      case 'PLAYER_CONFUSION_STALL':
        return {
          severity: 'low',
          file: 'src/engine/systems/AiraPresenceSystem.js',
          method: 'update',
          confidence: 0.68,
          reason: 'Player confusion is high and social momentum has stalled.',
          patchIntent: 'Consider seeding a soft manifestation hint or lowering the guide-mode activation threshold.'
        };

      default:
        return {
          severity: 'low',
          file: 'src/engine/dev/AiraPatchWriter.js',
          method: '_buildSuggestion',
          confidence: 0.4,
          reason: issue.message || 'Unknown issue.',
          patchIntent: 'Review new observer signal and map it to a targeted patch ticket.'
        };
    }
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
