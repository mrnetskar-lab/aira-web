const landingView = document.getElementById('landingView');
const roomView = document.getElementById('roomView');
const enterRoomBtn = document.getElementById('enterRoomBtn');
const backBtn = document.getElementById('backBtn');

const form = document.getElementById('form');
const input = document.getElementById('input');
const log = document.getElementById('log');
const stateBox = document.getElementById('stateBox');
const issueBox = document.getElementById('issueBox');
const patchBox = document.getElementById('patchBox');
const heroTitle = document.getElementById('heroTitle');
const heroSubtitle = document.getElementById('heroSubtitle');
const chipButtons = document.querySelectorAll('.chip-btn');

function showLanding() {
  landingView.classList.add('active');
  roomView.classList.remove('active');
}

function showRoom() {
  landingView.classList.remove('active');
  roomView.classList.add('active');
  input.focus();
}

enterRoomBtn?.addEventListener('click', showRoom);
backBtn?.addEventListener('click', showLanding);

function appendMessage(text, kind = 'system') {
  const el = document.createElement('div');
  el.className = `msg ${kind}`;
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function renderState(state) {
  stateBox.textContent = JSON.stringify(state, null, 2);

  const tension = state?.tension ?? 0;
  if (tension > 0.7) {
    heroTitle.textContent = 'The room feels different';
    heroSubtitle.textContent = 'Tension is high. Something feels slightly off.';
  } else if (tension > 0.4) {
    heroTitle.textContent = 'Charged atmosphere';
    heroSubtitle.textContent = 'The scene is still calm on the surface, but not fully.';
  } else {
    heroTitle.textContent = 'Late evening conversation';
    heroSubtitle.textContent = 'Subtle tension. No obvious threat.';
  }
}

function renderIssues(issues) {
  if (!issues || !issues.length) {
    issueBox.textContent = 'No issues yet.';
    return;
  }

  issueBox.textContent = issues
    .map((issue, index) => `${index + 1}. [${issue.type}] ${issue.message}`)
    .join('\n');
}

function renderPatches(patches) {
  if (!patches || !patches.length) {
    patchBox.textContent = 'No patches yet.';
    return;
  }

  patchBox.textContent = patches
    .map((patch, index) => `${index + 1}. ${patch.type}\n${patch.suggestion}`)
    .join('\n\n');
}

async function refreshState() {
  try {
    const res = await fetch('/api/ai/state');
    const data = await res.json();

    if (data.ok) {
      renderState(data.state);
    }
  } catch (error) {
    console.error('State refresh failed:', error);
  }
}

async function sendPrompt(text) {
  appendMessage(`YOU: ${text}`, 'user');

  try {
    const res = await fetch('/api/ai/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text })
    });

    const data = await res.json();

    if (!data.ok) {
      appendMessage(`SYSTEM: ${data.error || 'Unknown error'}`, 'system');
      return;
    }

    const result = data.result || {};
    const responses = result.responses || [];

    for (const response of responses) {
      if (response.spoken) {
        appendMessage(`${response.agent}: ${response.spoken}`, 'ai');
      }

      if (response.showThought && response.thought) {
        setTimeout(() => {
          appendMessage(`${response.agent} thought: ${response.thought}`, 'thought');
        }, response.thoughtDelay || 350);
      }
    }

    if (result.gmLine) {
      appendMessage(result.gmLine, 'gm');
    }

    renderState(data.state);
    renderIssues(data.issues);
    renderPatches(data.patches);
  } catch (error) {
    appendMessage(`SYSTEM: ${error.message}`, 'system');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  await sendPrompt(text);
});

chipButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const text = button.dataset.prompt?.trim();
    if (!text) return;
    await sendPrompt(text);
  });
});

refreshState();
