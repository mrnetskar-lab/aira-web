export class AiraObserver {
  constructor() {
    this.log = [];
    this.issues = [];
    this.listeners = [];
  }

  analyze(input, responses, state, interference = null) {
    const entry = {
      input,
      responseCount: responses.length,
      tension: state.tension,
      time: Date.now(),
      primaryAgent: responses[0]?.agent || null,
      interferenceType: interference?.event?.type || null,
      interferenceActive: !!interference?.active
    };

    this.log.push(entry);

    if (this.log.length > 120) {
      this.log.shift();
    }

    if (responses.length === 0) {
      this._flag('NO_RESPONSE', 'No character responded to input.', { input });
    }

    if (responses.length > 1) {
      const uniqueAgents = new Set(responses.map((r) => r.agent));
      if (uniqueAgents.size === 1) {
        this._flag('LOW_VARIETY', 'Only one agent is repeatedly responding.', {});
      }
    }

    if (state.tension > 0.6 && responses.length > 0) {
      const allCalm = responses.every((r) => !String(r.spoken || '').includes('!'));
      if (allCalm) {
        this._flag(
          'EMOTION_MISMATCH',
          'High tension but dialogue still looks calm.',
          { tension: state.tension }
        );
      }
    }

    this._checkPrimaryLock();
    this._checkInterferenceOveruse();
    this._checkInterferenceTooWeak(state);
    this._checkInterferenceRepetitive();
    this._checkRomanceTooFlat(state);
    this._checkPlayerConfusionStall(state);
  }

  _checkPrimaryLock() {
    const recent = this.log.slice(-6).map((e) => e.primaryAgent).filter(Boolean);
    if (recent.length < 5) return;

    if (new Set(recent).size === 1) {
      this._flag('PRIMARY_LOCK', 'The same character is dominating too many turns.', {
        primary: recent[0],
        sample: recent
      });
    }
  }

  _checkInterferenceOveruse() {
    const recent = this.log.slice(-10).filter((e) => e.interferenceActive);
    if (recent.length > 3) {
      this._flag('AIRA_INTERFERENCE_OVERUSE', 'Visible interference is happening too often.', {
        recentCount: recent.length
      });
    }
  }

  _checkInterferenceTooWeak(state) {
    const presence = state?.aira?.presenceLevel || 0;
    const recent = this.log.slice(-10).filter((e) => e.interferenceActive);

    if (presence > 0.55 && recent.length === 0) {
      this._flag('AIRA_INTERFERENCE_TOO_WEAK', 'Presence is high but no interference is landing.', {
        presenceLevel: presence
      });
    }
  }

  _checkInterferenceRepetitive() {
    const types = this.log
      .slice(-10)
      .map((e) => e.interferenceType)
      .filter(Boolean);

    if (types.length < 4) return;

    const unique = new Set(types);
    if (unique.size === 1) {
      this._flag('AIRA_INTERFERENCE_REPETITIVE', 'The same interference pattern is repeating.', {
        type: types[0],
        count: types.length
      });
    }
  }

  _checkRomanceTooFlat(state) {
    const relationships = state?.relationships || {};
    const agents = Object.keys(relationships);
    if (agents.length === 0) return;

    const recent = this.log.slice(-15);
    if (recent.length < 10) return;

    const allFlat = agents.every((name) => {
      const rel = relationships[name];
      return (rel.attraction || 0) < 0.35 && (rel.romanticTension || 0) < 0.15;
    });

    if (allFlat) {
      this._flag('ROMANCE_TOO_FLAT', 'Romantic tension is not building despite repeated interactions.', {
        relationships
      });
    }
  }

  _checkPlayerConfusionStall(state) {
    const confusion = state?.aira?.playerConfusionScore || 0;
    if (confusion > 0.7) {
      this._flag('PLAYER_CONFUSION_STALL', 'Player confusion score is high. System may not be guiding engagement.', {
        confusionScore: confusion
      });
    }
  }

  _flag(type, message, data) {
    const issue = {
      type,
      message,
      data,
      time: Date.now()
    };

    this.issues.push(issue);

    if (this.issues.length > 60) {
      this.issues.shift();
    }

    for (const fn of this.listeners) {
      fn(issue);
    }
  }

  onIssue(fn) {
    this.listeners.push(fn);
  }

  getIssues() {
    return [...this.issues];
  }
}
