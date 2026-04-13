export class ExplicitMode {
  constructor() {
    this.active = true;
  }

  enhance(responses) {
    return responses.map((response) => ({
      ...response,
      spoken: response.spoken ? `${response.spoken}` : response.spoken
    }));
  }

  enable() {
    this.active = true;
  }

  disable() {
    this.active = false;
  }
}
