import { AiraDevPanel } from './devPanel.js';

const devPanel = new AiraDevPanel();

/* ------------------------------------------------------------------ */
/* ELEMENTS */
/* ------------------------------------------------------------------ */

const form        = document.getElementById('form');
const input       = document.getElementById('input');
const log         = document.getElementById('log');
const backBtn     = document.getElementById('backBtn');
const presenceDot = document.getElementById('presenceDot');
const statusTime  = document.getElementById('statusTime');
const homeClock   = document.getElementById('homeClock');
const chipButtons = document.querySelectorAll('.chip-btn');

/* ------------------------------------------------------------------ */
/* CLOCK */
/* ------------------------------------------------------------------ */

function updateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${h}:${m}`;
  if (statusTime) statusTime.textContent = timeStr;
  if (homeClock)  homeClock.textContent  = timeStr;
}
updateTime();
setInterval(updateTime, 30000);

/* ------------------------------------------------------------------ */
/* NAVIGATION */
/* ------------------------------------------------------------------ */

const PLACEHOLDER_APPS = {
  messages: { label: 'Messages', icon: 'icon-messages' },
  gallery:  { label: 'Gallery',  icon: 'icon-gallery'  },
  clues:    { label: 'Clues',    icon: 'icon-clues'    },
  settings: { label: 'Settings', icon: 'icon-settings' }
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id + 'Screen');
  if (target) target.classList.add('active');
  if (id === 'chat') setTimeout(() => input?.focus(), 100);
}

function showPlaceholder(appName) {
  const meta = PLACEHOLDER_APPS[appName];
  if (!meta) return;

  const title = document.getElementById('placeholderTitle');
  const icon  = document.getElementById('placeholderIcon');
  const label = document.getElementById('placeholderLabel');

  if (title) title.textContent = meta.label;
  if (icon)  { icon.className = 'placeholder-icon'; icon.classList.add(meta.icon); }
  if (label) label.textContent = meta.label;

  showScreen('placeholder');
}

// App icon clicks
document.querySelectorAll('[data-app]').forEach(el => {
  el.addEventListener('click', () => {
    const app = el.dataset.app;
    if (app === 'chat') showScreen('chat');
    else showPlaceholder(app);
  });
});

// Back buttons
backBtn?.addEventListener('click', () => showScreen('home'));
document.querySelectorAll('[data-back]').forEach(el => {
  el.addEventListener('click', () => showScreen(el.dataset.back));
});

/* ------------------------------------------------------------------ */
/* MESSAGE RENDERING */
/* ------------------------------------------------------------------ */

function appendUserMessage(text, extraClass = '') {
  const el = document.createElement('div');
  el.className = 'msg user';
  if (extraClass) el.classList.add(...extraClass.split(' ').filter(Boolean));
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function appendCharacterMessage(agent, text) {
  const group = document.createElement('div');
  group.className = 'msg-group';

  const name = document.createElement('div');
  name.className = `msg-name name-${agent.toLowerCase()}`;
  name.textContent = agent;

  const bubble = document.createElement('div');
  bubble.className = 'msg ai';
  bubble.textContent = text;

  group.appendChild(name);
  group.appendChild(bubble);
  log.appendChild(group);
  log.scrollTop = log.scrollHeight;

  return bubble; // return bubble for subtext attachment
}

function appendSystemMessage(text, kind = 'system') {
  const el = document.createElement('div');
  el.className = `msg ${kind}`;
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
  const manifestation = state?.aira?.manifestation || 'none';

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

  // Show user bubble immediately
  const userBubble = appendUserMessage(text);

  try {
    const res = await fetch('/api/ai/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text })
    });

    const data = await res.json();

    if (!data.ok) {
      appendSystemMessage(data.error || 'Unknown error', 'system');
      return;
    }

    const result       = data.result       || {};
    const responses    = result.responses  || [];
    const interference = result.interference || {};

    // Apply interference to user bubble
    if (interference.active) {
      const perceived   = interference.perceivedInput || text;
      const bubbleClass = interference.uiEffect?.bubbleClass || '';
      const delayMs     = interference.uiEffect?.delayMs || 80;

      setTimeout(() => {
        userBubble.textContent = perceived;
        if (bubbleClass) userBubble.classList.add(bubbleClass);
      }, delayMs);

      // Ghost bubble
      if (interference.ghostText) {
        setTimeout(() => {
          appendUserMessage(interference.ghostText, 'user-glitch-ghost');
        }, (interference.uiEffect?.delayMs || 80) + 300);
      }
    }

    // Render character responses
    for (const response of responses) {
      if (response.spoken) {
        const bubble = appendCharacterMessage(response.agent, response.spoken);

        if (response.thought) {
          setTimeout(() => {
            appendSubtext(response.thought, bubble);
          }, 260);
        }
      }
    }

    // GM line — dev mode only
    if (window.__AIRA_DEV_MODE__ && result.gmLine) {
      appendSystemMessage(result.gmLine, 'gm');
    }

    renderState(data.state);

  } catch (error) {
    appendSystemMessage(error.message, 'system');
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
