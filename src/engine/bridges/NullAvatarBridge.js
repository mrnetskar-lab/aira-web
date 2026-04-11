export class NullAvatarBridge {
  constructor() {
    this.listeners = [];
  }

  reactToDialogue(responses, state) {
    for (const response of responses) {
      for (const fn of this.listeners) {
        fn({
          type: 'dialogue',
          avatar: { name: response.agent, state: 'talking', emotion: 'neutral' },
          response,
          state
        });
      }
    }
  }

  broadcast(action) {
    for (const fn of this.listeners) {
      fn({ type: 'broadcast', action });
    }
  }

  onEvent(fn) {
    this.listeners.push(fn);
  }
}
