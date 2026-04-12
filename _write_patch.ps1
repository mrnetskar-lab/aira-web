# AIRA Patch 1 + Patch 2 merged — writes all 4 client files

$base = "D:\V3\Aira_web\client"

# ── index.html ────────────────────────────────────────────────────────────────
@'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <title>AIRA</title>
    <meta
      name="description"
      content="AIRA Web — a living AI room in a minimal AIRA OS shell."
    />
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <div class="app-shell">
      <main class="screen-stack">
        <section id="homeView" class="view view--active" aria-label="AIRA home">
          <div class="home-view">
            <div class="home-mark" aria-hidden="true"></div>

            <button
              id="homeRing"
              class="home-ring"
              type="button"
              aria-label="Open Chat"
            >
              <div class="home-ring__content">
                <span class="home-ring__eyebrow">AIRA</span>

                <nav class="home-ring__nav" aria-label="AIRA apps">
                  <button
                    class="ring-link ring-link--primary"
                    type="button"
                    data-open-app="chat"
                  >
                    Chat
                  </button>
                  <button
                    class="ring-link"
                    type="button"
                    data-open-app="messages"
                  >
                    Messages
                  </button>
                  <button
                    class="ring-link"
                    type="button"
                    data-open-app="gallery"
                  >
                    Gallery
                  </button>
                  <button
                    class="ring-link"
                    type="button"
                    data-open-app="clues"
                  >
                    Clues
                  </button>
                  <button
                    class="ring-link"
                    type="button"
                    data-open-app="settings"
                  >
                    Settings
                  </button>
                </nav>
              </div>
            </button>
          </div>
        </section>

        <section id="chatView" class="view" aria-label="AIRA chat">
          <div class="chat-view">
            <header class="topbar">
              <button
                id="backToHomeBtn"
                class="icon-button"
                type="button"
                aria-label="Back to home"
              >
                <span aria-hidden="true">&#8592;</span>
              </button>

              <div class="topbar-brand" aria-label="AIRA">
                <span class="topbar-brand__ring" aria-hidden="true"></span>
                <span class="topbar-brand__text">AIRA</span>
              </div>

              <button
                id="resetChatBtn"
                class="icon-button icon-button--ghost"
                type="button"
                aria-label="Reset chat"
                title="Reset chat"
              >
                <span aria-hidden="true">&#x27F3;</span>
              </button>
            </header>

            <div id="chatMessages" class="chat-messages" aria-live="polite">
              <div class="message-row message-row--system">
                <div class="system-note">
                  The room is quiet. Start with something small.
                </div>
              </div>
            </div>

            <form id="chatForm" class="composer" autocomplete="off">
              <label class="sr-only" for="chatInput">Message</label>
              <textarea
                id="chatInput"
                class="composer__input"
                rows="1"
                maxlength="1200"
                placeholder="Say something..."
              ></textarea>
              <button id="sendBtn" class="composer__send" type="submit">
                Send
              </button>
            </form>
          </div>
        </section>

        <section id="appView" class="view" aria-label="App placeholder">
          <div class="placeholder-view">
            <header class="topbar">
              <button
                id="backFromAppBtn"
                class="icon-button"
                type="button"
                aria-label="Back to home"
              >
                <span aria-hidden="true">&#8592;</span>
              </button>

              <div class="topbar-brand" aria-label="AIRA">
                <span class="topbar-brand__ring" aria-hidden="true"></span>
                <span id="placeholderTitle" class="topbar-brand__text">
                  Messages
                </span>
              </div>

              <div class="topbar-spacer" aria-hidden="true"></div>
            </header>

            <div class="placeholder-body">
              <div class="placeholder-card">
                <div class="placeholder-card__ring" aria-hidden="true"></div>
                <h2 id="placeholderHeading">Messages</h2>
                <p id="placeholderText">
                  This space is waiting quietly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <script type="module" src="./app.js"></script>
  </body>
</html>
'@ | Set-Content -Path "$base\index.html" -Encoding UTF8 -Force

# ── style.css (Patch 1 + Patch 2 merged) ─────────────────────────────────────
@'
:root {
  color-scheme: dark;
  --bg: #030307;
  --bg-soft: #090914;
  --panel: rgba(255, 255, 255, 0.04);
  --panel-strong: rgba(255, 255, 255, 0.06);
  --line: rgba(255, 230, 173, 0.12);
  --line-strong: rgba(255, 230, 173, 0.2);
  --text: #f5f2eb;
  --muted: rgba(245, 242, 235, 0.64);
  --muted-soft: rgba(245, 242, 235, 0.42);
  --gold: #c8a86a;
  --gold-soft: #a1834f;
  --gold-dim: rgba(200, 168, 106, 0.16);
  --gold-glow: rgba(200, 168, 106, 0.1);
  --user: #4d56a8;
  --user-soft: rgba(77, 86, 168, 0.18);
  --lucy: #c9a7ff;
  --sam: #8eaef9;
  --angie: #d7a65f;
  --subtext: rgba(201, 167, 255, 0.7);
  --subtext-strong: rgba(201, 167, 255, 0.82);
  --danger: #c07f7f;
  --shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  --radius-xl: 28px;
  --radius-lg: 22px;
  --radius-md: 16px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  --ease-soft: 220ms cubic-bezier(0.22, 1, 0.36, 1);
  --ease-slow: 420ms cubic-bezier(0.22, 1, 0.36, 1);
  --ring-size: min(84vw, 430px);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: var(--font);
  color: var(--text);
  background:
    radial-gradient(circle at 50% 20%, rgba(32, 27, 18, 0.28), transparent 28%),
    radial-gradient(circle at 70% 70%, rgba(27, 22, 12, 0.18), transparent 26%),
    radial-gradient(circle at 30% 30%, rgba(18, 18, 34, 0.35), transparent 34%),
    linear-gradient(180deg, #04040a 0%, #020204 100%);
  overflow: hidden;
}

button,
input,
textarea {
  font: inherit;
}

button {
  color: inherit;
}

.app-shell {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  isolation: isolate;
}

.screen-stack {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
}

.view {
  position: absolute;
  inset: 0;
  display: none;
}

.view--active {
  display: block;
}

.home-view,
.chat-view,
.placeholder-view {
  min-height: 100vh;
  min-height: 100dvh;
}

.home-view {
  display: grid;
  place-items: center;
  padding:
    calc(24px + var(--safe-top))
    24px
    calc(32px + var(--safe-bottom));
}

@keyframes airaRingBreath {
  0%, 100% {
    transform: scale(1);
    filter: saturate(0.94);
  }
  50% {
    transform: scale(1.008);
    filter: saturate(1);
  }
}

@keyframes airaGlowDrift {
  0%, 100% {
    opacity: 0.34;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(1.02);
  }
}

@keyframes airaMessageIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.home-mark {
  position: absolute;
  inset: auto auto 50% 50%;
  width: calc(var(--ring-size) * 0.92);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background:
    radial-gradient(circle, transparent 54%, rgba(200, 168, 106, 0.07) 55%, transparent 71%);
  filter: blur(24px);
  opacity: 0.44;
  pointer-events: none;
  animation: airaGlowDrift 7.5s ease-in-out infinite;
}

.home-ring {
  position: relative;
  width: var(--ring-size);
  aspect-ratio: 1;
  border: 0;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  outline: none;
  transition:
    transform var(--ease-soft),
    filter var(--ease-soft);
  animation: airaRingBreath 8s ease-in-out infinite;
}

.home-ring:hover,
.home-ring:focus-visible {
  transform: translateY(-2px) scale(1.006);
  filter: brightness(1.03);
}

.home-ring::before,
.home-ring::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

.home-ring::before {
  background:
    conic-gradient(
      from -42deg,
      transparent 0deg 14deg,
      #c8a86a 14deg 360deg
    );
  -webkit-mask: radial-gradient(circle, transparent calc(50% - 1.5px), #000 calc(50% - 0.5px));
  mask: radial-gradient(circle, transparent calc(50% - 1.5px), #000 calc(50% - 0.5px));
  opacity: 0.9;
  filter: saturate(0.88);
}

.home-ring::after {
  inset: -10px;
  background:
    conic-gradient(
      from -42deg,
      transparent 0deg 14deg,
      rgba(200, 168, 106, 0.1) 14deg 360deg
    );
  -webkit-mask: radial-gradient(circle, transparent calc(50% - 1px), #000 calc(50% + 12px));
  mask: radial-gradient(circle, transparent calc(50% - 1px), #000 calc(50% + 12px));
  filter: blur(12px);
  opacity: 0.24;
}

.home-ring__content {
  position: absolute;
  inset: 13%;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 16px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 45%, rgba(255, 244, 219, 0.012), transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(200, 168, 106, 0.022), transparent 74%);
}

.home-ring__eyebrow {
  font-size: 0.68rem;
  letter-spacing: 0.5em;
  color: rgba(200, 168, 106, 0.68);
  text-transform: uppercase;
}

.home-ring__nav {
  display: grid;
  gap: 9px;
  width: min(100%, 184px);
}

.ring-link {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 3px 0;
  text-align: center;
  font-size: clamp(0.94rem, 2.3vw, 1.03rem);
  font-weight: 300;
  letter-spacing: 0.16em;
  color: rgba(245, 242, 235, 0.58);
  cursor: pointer;
  transition:
    color var(--ease-soft),
    letter-spacing var(--ease-soft),
    transform var(--ease-soft),
    opacity var(--ease-soft);
}

.ring-link:hover,
.ring-link:focus-visible {
  color: rgba(245, 242, 235, 0.88);
  letter-spacing: 0.18em;
  transform: translateY(-1px);
  outline: none;
}

.ring-link--primary {
  color: rgba(200, 168, 106, 0.92);
}

.ring-link[data-open-app="chat"]::after {
  content: "";
  display: block;
  width: 28px;
  height: 1px;
  margin: 7px auto 0;
  background: rgba(200, 168, 106, 0.36);
  border-radius: 999px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 12px;
  padding:
    calc(16px + var(--safe-top))
    18px
    12px;
  background:
    linear-gradient(180deg, rgba(3, 3, 7, 0.9), rgba(3, 3, 7, 0.55) 72%, transparent);
  backdrop-filter: blur(8px);
}

.topbar-spacer {
  width: 44px;
  height: 44px;
}

.icon-button {
  width: 44px;
  height: 44px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.02);
  display: inline-grid;
  place-items: center;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.icon-button:hover,
.icon-button:focus-visible {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--line-strong);
  transform: translateY(-1px);
  outline: none;
}

.icon-button--ghost {
  color: var(--muted);
}

.topbar-brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 0;
}

.topbar-brand__ring {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  position: relative;
  flex: 0 0 auto;
}

.topbar-brand__ring::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    conic-gradient(
      from -42deg,
      transparent 0deg 18deg,
      var(--gold) 18deg 360deg
    );
  -webkit-mask: radial-gradient(circle, transparent calc(50% - 1px), #000 calc(50% - 0px));
  mask: radial-gradient(circle, transparent calc(50% - 1px), #000 calc(50% - 0px));
}

.topbar-brand__text {
  letter-spacing: 0.34em;
  font-size: 0.75rem;
  font-weight: 300;
  color: rgba(245, 242, 235, 0.68);
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-view {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
  min-height: 100dvh;
}

.chat-messages {
  overflow-y: auto;
  padding: 10px 18px 22px;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}

.message-row {
  display: flex;
  margin: 0 0 20px;
  animation: airaMessageIn 240ms var(--ease-soft);
}

.message-row--user {
  justify-content: flex-end;
}

.message-row--system {
  justify-content: center;
}

.message {
  max-width: min(84%, 460px);
}

.message__name {
  margin: 0 0 8px;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: var(--muted-soft);
  text-transform: uppercase;
}

.message__name--Lucy {
  color: var(--lucy);
}

.message__name--Sam {
  color: var(--sam);
}

.message__name--Angie {
  color: var(--angie);
}

.message__bubble {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.042);
  border: 1px solid rgba(255, 255, 255, 0.045);
  line-height: 1.58;
  box-shadow: var(--shadow);
  word-break: break-word;
  backdrop-filter: blur(10px);
}

.message-row--user .message__bubble {
  background:
    linear-gradient(180deg, rgba(88, 98, 191, 0.24), rgba(61, 69, 144, 0.28));
  border-color: rgba(109, 122, 226, 0.16);
}

.message__meta {
  margin-top: 8px;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--muted-soft);
}

.message__thought {
  margin-top: 8px;
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--subtext);
  font-style: italic;
}

.system-note {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 8px 12px;
  border-radius: 999px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
}

.message.is-anomalous .message__bubble {
  border-color: rgba(200, 168, 106, 0.22);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(200, 168, 106, 0.06);
}

.message-row--user.is-anomalous .message__bubble {
  background:
    linear-gradient(180deg, rgba(107, 86, 140, 0.26), rgba(66, 62, 118, 0.28));
}

.home-ring.is-reactive::after {
  opacity: 0.38;
  filter: blur(14px);
}

.composer {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding:
    12px 18px
    calc(14px + var(--safe-bottom));
  background:
    linear-gradient(180deg, transparent, rgba(3, 3, 7, 0.8) 18%, rgba(3, 3, 7, 0.94));
  backdrop-filter: blur(14px);
}

.composer__input {
  resize: none;
  min-height: 52px;
  max-height: 180px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.028);
  color: var(--text);
  padding: 14px 16px;
  outline: none;
  overflow-y: auto;
  transition:
    border-color var(--ease-soft),
    background var(--ease-soft),
    transform var(--ease-soft);
}

.composer__input::placeholder {
  color: var(--muted-soft);
}

.composer__input:focus {
  border-color: rgba(200, 168, 106, 0.24);
  background: rgba(255, 255, 255, 0.04);
  transform: translateY(-1px);
}

.composer__send {
  min-width: 82px;
  border: 1px solid rgba(200, 168, 106, 0.18);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(200, 168, 106, 0.1), rgba(200, 168, 106, 0.07));
  color: var(--gold);
  padding: 0 16px;
  cursor: pointer;
  transition:
    transform var(--ease-soft),
    border-color var(--ease-soft),
    background var(--ease-soft);
}

.composer__send:hover,
.composer__send:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(200, 168, 106, 0.34);
  background:
    linear-gradient(180deg, rgba(200, 168, 106, 0.16), rgba(200, 168, 106, 0.11));
  outline: none;
}

.composer__send:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.placeholder-body {
  display: grid;
  place-items: center;
  padding:
    32px 20px
    calc(32px + var(--safe-bottom));
  min-height: calc(100vh - 90px);
  min-height: calc(100dvh - 90px);
}

.placeholder-card {
  width: min(100%, 420px);
  padding: 28px 24px;
  border-radius: var(--radius-xl);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.018));
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  text-align: center;
}

.placeholder-card__ring {
  width: 84px;
  height: 84px;
  margin: 0 auto 22px;
  border-radius: 50%;
  position: relative;
}

.placeholder-card__ring::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    conic-gradient(
      from -42deg,
      transparent 0deg 18deg,
      rgba(200, 168, 106, 0.85) 18deg 360deg
    );
  -webkit-mask: radial-gradient(circle, transparent calc(50% - 2px), #000 calc(50% - 1px));
  mask: radial-gradient(circle, transparent calc(50% - 2px), #000 calc(50% - 1px));
  filter: blur(0.15px);
}

.placeholder-card h2 {
  margin: 0 0 10px;
  font-size: 1.3rem;
  font-weight: 500;
  letter-spacing: 0.08em;
}

.placeholder-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.dev-drawer {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + var(--safe-bottom));
  z-index: 40;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(16, 16, 24, 0.96), rgba(7, 7, 11, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
  transform: translateY(calc(100% + 24px));
  transition: transform 220ms ease;
  overflow: hidden;
  backdrop-filter: blur(18px);
}

.dev-drawer.is-open {
  transform: translateY(0);
}

.dev-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dev-drawer__title {
  letter-spacing: 0.18em;
  font-size: 0.76rem;
  color: var(--muted);
  text-transform: uppercase;
}

.dev-drawer__close {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 1rem;
  cursor: pointer;
}

.dev-drawer__content {
  max-height: min(52vh, 460px);
  overflow-y: auto;
  padding: 14px 16px 18px;
}

.dev-grid {
  display: grid;
  gap: 10px;
}

.dev-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 14px;
}

.dev-card__label {
  font-size: 0.72rem;
  color: var(--muted-soft);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.dev-card__value {
  font-size: 0.95rem;
  color: var(--text);
  line-height: 1.45;
  word-break: break-word;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (min-width: 640px) {
  .home-ring {
    width: min(72vw, 430px);
  }

  .chat-messages,
  .composer,
  .topbar {
    padding-left: 24px;
    padding-right: 24px;
  }

  .dev-drawer {
    left: max(24px, calc(50vw - 280px));
    right: max(24px, calc(50vw - 280px));
  }
}
'@ | Set-Content -Path "$base\style.css" -Encoding UTF8 -Force

# ── app.js (Patch 1 + Patch 2 merged) ────────────────────────────────────────
@'
import { AiraDevDrawer } from "./devPanel.js";

const views = {
  home: document.getElementById("homeView"),
  chat: document.getElementById("chatView"),
  app: document.getElementById("appView"),
};

const elements = {
  homeRing: document.getElementById("homeRing"),
  ringLinks: Array.from(document.querySelectorAll("[data-open-app]")),
  backToHomeBtn: document.getElementById("backToHomeBtn"),
  backFromAppBtn: document.getElementById("backFromAppBtn"),
  resetChatBtn: document.getElementById("resetChatBtn"),
  chatMessages: document.getElementById("chatMessages"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  sendBtn: document.getElementById("sendBtn"),
  placeholderTitle: document.getElementById("placeholderTitle"),
  placeholderHeading: document.getElementById("placeholderHeading"),
  placeholderText: document.getElementById("placeholderText"),
};

const state = {
  currentView: "home",
  activeApp: null,
  messages: [],
  latestState: null,
  isSending: false,
};

const placeholderCopy = {
  messages: {
    title: "Messages",
    text: "Private threads will live here when the room starts splitting into whispers.",
  },
  gallery: {
    title: "Gallery",
    text: "Portraits, clues, distortions, and image events will appear here later.",
  },
  clues: {
    title: "Clues",
    text: "Investigation tools and anomaly evidence will gather here over time.",
  },
  settings: {
    title: "Settings",
    text: "Visual, audio, language, and access controls will settle here later.",
  },
};

function setActiveView(name) {
  Object.entries(views).forEach(([key, node]) => {
    node.classList.toggle("view--active", key === name);
  });
  state.currentView = name;
}

function showHome() {
  state.activeApp = null;
  setActiveView("home");
}

function showChat() {
  state.activeApp = "chat";
  setActiveView("chat");
  requestAnimationFrame(() => {
    elements.chatInput.focus();
    scrollMessagesToBottom();
  });
}

function showPlaceholder(appName) {
  const copy = placeholderCopy[appName] ?? {
    title: appName,
    text: "This space is waiting quietly.",
  };
  state.activeApp = appName;
  elements.placeholderTitle.textContent = copy.title;
  elements.placeholderHeading.textContent = copy.title;
  elements.placeholderText.textContent = copy.text;
  setActiveView("app");
}

function autoResizeTextarea() {
  const input = elements.chatInput;
  input.style.height = "0px";
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function characterNameClass(name) {
  if (name === "Lucy") return "message__name--Lucy";
  if (name === "Sam") return "message__name--Sam";
  if (name === "Angie") return "message__name--Angie";
  return "";
}

function createMessageClasses(message) {
  const classes = ["message"];
  if (message.anomalous) classes.push("is-anomalous");
  return classes.join(" ");
}

function scrollMessagesToBottom() {
  requestAnimationFrame(() => {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  });
}

function renderMessages() {
  if (!state.messages.length) {
    elements.chatMessages.innerHTML = `
      <div class="message-row message-row--system">
        <div class="system-note">The room is quiet. Start with something small.</div>
      </div>
    `;
    return;
  }

  const html = state.messages
    .map((message) => {
      if (message.type === "user") {
        return `
          <div class="message-row message-row--user ${message.anomalous ? "is-anomalous" : ""}">
            <article class="${createMessageClasses(message)}">
              <div class="message__bubble">${escapeHtml(message.text)}</div>
              <div class="message__meta">${escapeHtml(message.time)}</div>
            </article>
          </div>
        `;
      }

      if (message.type === "system") {
        return `
          <div class="message-row message-row--system">
            <div class="system-note">${escapeHtml(message.text)}</div>
          </div>
        `;
      }

      const thoughtHtml = message.thought
        ? `<div class="message__thought">${escapeHtml(message.thought)}</div>`
        : "";

      return `
        <div class="message-row">
          <article class="${createMessageClasses(message)}">
            <div class="message__name ${characterNameClass(message.agent)}">
              ${escapeHtml(message.agent)}
            </div>
            <div class="message__bubble">${escapeHtml(message.text)}</div>
            ${thoughtHtml}
            <div class="message__meta">${escapeHtml(message.time)}</div>
          </article>
        </div>
      `;
    })
    .join("");

  elements.chatMessages.innerHTML = html;
  scrollMessagesToBottom();
}

function updatePresenceHooks() {
  const ring = elements.homeRing;
  const manifestation = state.latestState?.aira?.manifestation || "none";
  const reactiveStages = new Set(["shadow", "figure", "watcher"]);
  ring.classList.toggle("is-reactive", reactiveStages.has(manifestation));
}

async function fetchState() {
  try {
    const response = await fetch("/api/ai/state");
    if (!response.ok) return;
    const payload = await response.json();
    if (payload?.ok) {
      state.latestState = payload.state ?? null;
      updatePresenceHooks();
    }
  } catch (error) {
    console.warn("Failed to fetch state:", error);
  }
}

function normalizeResponses(payload) {
  const responses = payload?.result?.responses ?? [];
  const gmLine = payload?.result?.gmLine ?? null;
  const time = formatTime();

  const items = responses.map((entry) => ({
    type: "character",
    agent: entry.agent || "AIRA",
    text: entry.spoken || "",
    thought: entry.thought || "",
    anomalous: Boolean(entry.anomalous),
    time,
  }));

  if (gmLine && window.__AIRA_DEV_MODE__) {
    items.push({
      type: "system",
      text: gmLine,
      time,
    });
  }

  return items;
}

async function sendMessage(text) {
  if (state.isSending) return;

  state.isSending = true;
  elements.sendBtn.disabled = true;

  state.messages.push({
    type: "user",
    text,
    anomalous: false,
    time: formatTime(),
  });
  renderMessages();

  try {
    const response = await fetch("/api/ai/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text }),
    });

    const payload = await response.json();

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Request failed");
    }

    state.latestState = payload.state ?? null;
    updatePresenceHooks();
    state.messages.push(...normalizeResponses(payload));

    if (Array.isArray(payload.issues) && payload.issues.length && window.__AIRA_DEV_MODE__) {
      state.messages.push({
        type: "system",
        text: `Issues: ${payload.issues.join(", ")}`,
        time: formatTime(),
      });
    }

    renderMessages();
  } catch (error) {
    console.error(error);
    state.messages.push({
      type: "system",
      text: "Something slipped in the dark. Try again.",
      time: formatTime(),
    });
    renderMessages();
  } finally {
    state.isSending = false;
    elements.sendBtn.disabled = false;
  }
}

async function resetChat() {
  try {
    const response = await fetch("/api/ai/reset", { method: "POST" });
    if (!response.ok) throw new Error("Reset failed");

    state.messages = [];
    state.latestState = null;
    updatePresenceHooks();
    renderMessages();
    await fetchState();
  } catch (error) {
    console.error(error);
    state.messages.push({
      type: "system",
      text: "Reset failed.",
      time: formatTime(),
    });
    renderMessages();
  }
}

function bindEvents() {
  elements.homeRing.addEventListener("click", (event) => {
    const action = event.target.closest("[data-open-app]")?.dataset.openApp;
    if (!action || action === "chat") {
      showChat();
      return;
    }
    showPlaceholder(action);
  });

  elements.ringLinks.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const appName = button.dataset.openApp;
      if (appName === "chat") {
        showChat();
        return;
      }
      showPlaceholder(appName);
    });
  });

  elements.backToHomeBtn.addEventListener("click", showHome);
  elements.backFromAppBtn.addEventListener("click", showHome);
  elements.chatInput.addEventListener("input", autoResizeTextarea);

  elements.chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = elements.chatInput.value.trim();
    if (!text) return;
    elements.chatInput.value = "";
    autoResizeTextarea();
    await sendMessage(text);
  });

  elements.chatInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const text = elements.chatInput.value.trim();
      if (!text) return;
      elements.chatInput.value = "";
      autoResizeTextarea();
      await sendMessage(text);
    }
  });

  elements.resetChatBtn.addEventListener("click", resetChat);
}

async function init() {
  bindEvents();
  autoResizeTextarea();
  renderMessages();
  await fetchState();

  const devDrawer = new AiraDevDrawer({
    getState: () => state.latestState,
    onReset: resetChat,
  });

  devDrawer.mount();
}

init();
'@ | Set-Content -Path "$base\app.js" -Encoding UTF8 -Force

# ── devPanel.js (Patch 1) ─────────────────────────────────────────────────────
@'
export class AiraDevDrawer {
  constructor({ getState, onReset }) {
    this.getState = getState;
    this.onReset = onReset;
    this.isOpen = false;
    this.pollTimer = null;
    this.root = null;

    window.__AIRA_DEV_MODE__ = false;
  }

  mount() {
    this.root = document.createElement("aside");
    this.root.className = "dev-drawer";
    this.root.setAttribute("aria-hidden", "true");

    this.root.innerHTML = `
      <div class="dev-drawer__header">
        <div class="dev-drawer__title">AIRA Dev</div>
        <button class="dev-drawer__close" type="button" aria-label="Close dev drawer">&#x2715;</button>
      </div>
      <div class="dev-drawer__content">
        <div class="dev-grid" id="devGrid">
          <div class="dev-card">
            <div class="dev-card__label">Status</div>
            <div class="dev-card__value">Waiting&#x2026;</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.root);

    this.root
      .querySelector(".dev-drawer__close")
      .addEventListener("click", () => this.close());

    window.addEventListener("keydown", (event) => {
      if (event.key === "§") {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
      return;
    }
    this.open();
  }

  open() {
    this.isOpen = true;
    window.__AIRA_DEV_MODE__ = true;
    this.root.classList.add("is-open");
    this.root.setAttribute("aria-hidden", "false");
    this.refresh();
    this.startPolling();
  }

  close() {
    this.isOpen = false;
    window.__AIRA_DEV_MODE__ = false;
    this.root.classList.remove("is-open");
    this.root.setAttribute("aria-hidden", "true");
    this.stopPolling();
  }

  startPolling() {
    this.stopPolling();
    this.pollTimer = window.setInterval(() => this.refresh(), 1000);
  }

  stopPolling() {
    if (this.pollTimer) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  refresh() {
    const state = this.getState?.() || null;
    const grid = this.root.querySelector("#devGrid");

    if (!state) {
      grid.innerHTML = `
        <div class="dev-card">
          <div class="dev-card__label">State</div>
          <div class="dev-card__value">No state loaded yet.</div>
        </div>
      `;
      return;
    }

    const relationships = state.relationships || {};
    const aira = state.aira || {};

    grid.innerHTML = `
      <div class="dev-card">
        <div class="dev-card__label">Turns</div>
        <div class="dev-card__value">${safe(state.turnCount)}</div>
      </div>
      <div class="dev-card">
        <div class="dev-card__label">Tension</div>
        <div class="dev-card__value">${safeNumber(state.tension)}</div>
      </div>
      <div class="dev-card">
        <div class="dev-card__label">Manifestation</div>
        <div class="dev-card__value">${safe(aira.manifestation)}</div>
      </div>
      <div class="dev-card">
        <div class="dev-card__label">Presence</div>
        <div class="dev-card__value">${safeNumber(aira.presenceLevel)}</div>
      </div>
      <div class="dev-card">
        <div class="dev-card__label">Voice Unlocked</div>
        <div class="dev-card__value">${aira.voiceUnlocked ? "true" : "false"}</div>
      </div>
      <div class="dev-card">
        <div class="dev-card__label">Lucy</div>
        <div class="dev-card__value">${relationshipText(relationships.Lucy)}</div>
      </div>
      <div class="dev-card">
        <div class="dev-card__label">Sam</div>
        <div class="dev-card__value">${relationshipText(relationships.Sam)}</div>
      </div>
      <div class="dev-card">
        <div class="dev-card__label">Angie</div>
        <div class="dev-card__value">${relationshipText(relationships.Angie)}</div>
      </div>
      <div class="dev-card">
        <div class="dev-card__label">Reset</div>
        <div class="dev-card__value">
          <button id="devResetBtn" class="icon-button" type="button">Reset chat</button>
        </div>
      </div>
    `;

    const resetBtn = this.root.querySelector("#devResetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.onReset?.(), { once: true });
    }
  }
}

function safe(value) {
  return value ?? "&#x2014;";
}

function safeNumber(value) {
  return typeof value === "number" ? value.toFixed(3) : "&#x2014;";
}

function relationshipText(entry) {
  if (!entry) return "&#x2014;";
  const trust = typeof entry.trust === "number" ? entry.trust.toFixed(2) : "&#x2014;";
  const attraction = typeof entry.attraction === "number" ? entry.attraction.toFixed(2) : "&#x2014;";
  return `trust ${trust} &middot; attraction ${attraction}`;
}
'@ | Set-Content -Path "$base\devPanel.js" -Encoding UTF8 -Force

Write-Host "All 4 client files written successfully."
