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
