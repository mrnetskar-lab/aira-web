export class FocusSystem {
  constructor() {
    this.current = null;
    this.listeners = [];
  }

  setFocus(agent) {
    if (this.current === agent) {
      return;
    }

    this.current = agent;

    for (const fn of this.listeners) {
      fn(agent);
    }
  }

  getCurrent() {
    return this.current;
  }

  clear() {
    this.current = null;
  }

  onFocusChange(fn) {
    this.listeners.push(fn);
  }
}
