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
