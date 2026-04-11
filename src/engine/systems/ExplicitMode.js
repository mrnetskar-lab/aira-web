export class ExplicitMode {
  constructor() {
    this.active = false;
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
