import { AiraDevPanel } from './devPanel.js';

const devPanel = new AiraDevPanel();

/* ------------------------------------------------------------------ */
/* ELEMENTS */
/* ------------------------------------------------------------------ */

const form        = document.getElementById('form');
const input       = document.getElementById('input');
const log         = document.getElementById('log');
const backBtn     = document.getElementById('backBtn');
const roomStatus  = document.getElementById('roomStatus');
const presenceDot = document.getElementById('presenceDot');
const statusTime  = document.getElementById('statusTime');
const chipButtons = document.querySelectorAll('.chip-btn');

/* ------------------------------------------------------------------ */
/* CLOCK */
/* ------------------------------------------------------------------ */

function updateTime() {
  if (!statusTime) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  statusTime.textContent = `${h}:${m}`;
}
updateTime();
setInterval(updateTime, 30000);

/* ------------------------------------------------------------------ */
/* NAVIGATION */
/* ------------------------------------------------------------------ */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id + 'Screen');
  if (target) target.classList.add('active');
  if (id === 'chat') setTimeout(() => input?.focus(), 100);
}

document.querySelectorAll('[data-app]').forEach(el => {
  el.addEventListener('click', () => showScreen(el.dataset.app));
});

document.querySelectorAll('[data-back]').forEach(el => {
  el.addEventListener('click', () => showScreen(el.dataset.back));
});

document.querySelectorAll('[data-open]').forEach(el => {
  el.addEventListener('click', () => showScreen(el.dataset.open));
});

backBtn?.addEventListener('click', () => showScreen('home'));

/* ------------------------------------------------------------------ */
/* MESSAGE RENDERING */
/* ------------------------------------------------------------------ */

function appendMessage(text, kind = 'system', extraClass = '') {
  const el = document.createElement('div');
  el.className = `msg ${kind}`;
  if (extraClass) el.classList.add(...extraClass.split(' ').filter(Boolean));
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function appendSubtext(text, parentEl) {
  if (!text || !parentEl) return;
  const sub = document.createElement('div');
  sub.className = 'msg-subtext';
  sub.textContent = text;
  parentEl.appendChild(sub);
}

/* ------------------------------------------------------------------ */
/* STATE RENDERING */
/* ------------------------------------------------------------------ */

function renderState(state) {
  const tension      = state?.tension ?? 0;
  const manifestation = state?.aira?.manifestation || 'none';

  if (roomStatus) {
    if (tension > 0.7)      roomStatus.textContent = 'High tension';
    else if (tension > 0.4) roomStatus.textContent = 'Charged atmosphere';
    else                    roomStatus.textContent = 'Late evening';
  }

  if (presenceDot) {
    presenceDot.className = 'presence-dot';
    if (manifestation !== 'none') {
      presenceDot.classList.add(`presence-${manifestation}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* SEND PROMPT */
/* ------------------------------------------------------------------ */

async function sendPrompt(rawText) {
  const text = rawText.trim();
  if (!text) return;

  // Show user bubble immediately — may be updated after response
  const userBubble = appendMessage(`You: ${text}`, 'user');

  try {
    const res = await fetch('/api/ai/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text })
    });

    const data = await res.json();

    if (!data.ok) {
      appendMessage(`System: ${data.error || 'Unknown error'}`, 'system');
      return;
    }

    const result     = data.result     || {};
    const responses  = result.responses || [];
    const interference = result.interference || {};

    // Update user bubble with interference
    if (interference.active) {
      const perceived  = interference.perceivedInput || text;
      const bubbleClass = interference.uiEffect?.bubbleClass || '';
      const delayMs    = interference.uiEffect?.delayMs || 80;

      setTimeout(() => {
        userBubble.textContent = `You: ${perceived}`;
        if (bubbleClass) userBubble.classList.add(bubbleClass);
      }, delayMs);

      // Ghost message — separate bubble after a pause
      if (interference.ghostText) {
        setTimeout(() => {
          appendMessage(`You: ${interference.ghostText}`, 'user', 'user-glitch-ghost');
        }, (interference.uiEffect?.delayMs || 80) + 300);
      }
    }

    // Render character responses
    for (const response of responses) {
      if (response.spoken) {
        const el = appendMessage(`${response.agent}: ${response.spoken}`, 'ai');

        if (response.thought) {
          setTimeout(() => {
            appendSubtext(response.thought, el);
          }, 260);
        }
      }
    }

    // GM line — dev mode only
    if (window.__AIRA_DEV_MODE__ && result.gmLine) {
      appendMessage(result.gmLine, 'gm');
    }

    renderState(data.state);

  } catch (error) {
    appendMessage(`System: ${error.message}`, 'system');
  }
}

/* ------------------------------------------------------------------ */
/* FORM + CHIPS */
/* ------------------------------------------------------------------ */

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await sendPrompt(text);
});

chipButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    const text = btn.dataset.prompt?.trim();
    if (!text) return;
    await sendPrompt(text);
  });
});

/* ------------------------------------------------------------------ */
/* INITIAL STATE */
/* ------------------------------------------------------------------ */

async function refreshState() {
  try {
    const res = await fetch('/api/ai/state');
    const data = await res.json();
    if (data.ok) renderState(data.state);
  } catch { /* silent */ }
}

refreshState();
