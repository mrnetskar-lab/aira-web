export class AiraObserver {
  constructor() {
    this.log = [];
    this.issues = [];
    this.listeners = [];
  }

  analyze(input, responses, state) {
    const entry = {
      input,
      responseCount: responses.length,
      tension: state.tension,
      time: Date.now()
    };

    this.log.push(entry);

    if (this.log.length > 100) {
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

    // Interference quality checks
    if (state.aira?.interferenceHistory) {
      const history = state.aira.interferenceHistory;
      const turnCount = state.turnCount || 0;

      const recentEvents = history.filter(e => turnCount - e.turn < 8);

      if (recentEvents.length > 3) {
        this._flag('AIRA_INTERFERENCE_OVERUSE', 'Interference firing too frequently.', {
          count: recentEvents.length
        });
      }

      if (recentEvents.length >= 2) {
        const types = recentEvents.map(e => e.type);
        if (types.every(t => t === types[0])) {
          this._flag('AIRA_INTERFERENCE_REPETITIVE', `Same interference type "${types[0]}" repeated.`, {
            type: types[0]
          });
        }
      }

      if ((state.aira.presenceLevel || 0) > 0.4 && history.length === 0) {
        this._flag('AIRA_INTERFERENCE_TOO_WEAK', 'High presence but no interference events.', {
          presenceLevel: state.aira.presenceLevel
        });
      }
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

    if (this.issues.length > 50) {
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
