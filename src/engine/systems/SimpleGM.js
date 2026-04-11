export class SimpleGM {
  tick(state, responses) {
    if (!responses.length) {
      return `GM: silence. tension=${state.tension.toFixed(2)}`;
    }

    const speakerNames = responses.map((r) => r.agent).join(', ');
    return `GM: ${speakerNames} responded. tension=${state.tension.toFixed(2)}`;
  }
}
