export class AiraDevDrawer {
  constructor({ getState, onReset }) {
    this.getState = getState;
    this.onReset = onReset;
    this.isOpen = false;
    this.pollTimer = null;
    this.root = null;
    this.tuning = null;

    window.__AIRA_DEV_MODE__ = false;
  }

  mount() {
    this.root = document.createElement("aside");
    this.root.className = "dev-drawer";
    this.root.setAttribute("aria-hidden", "true");

    this.root.innerHTML = `
      <div class="dev-drawer__header">
        <div class="dev-drawer__title">AIRA Dev</div>
        <button class="dev-drawer__close" type="button" aria-label="Close">&#x2715;</button>
      </div>
      <div class="dev-drawer__content">
        <div class="dev-section-title">Tuning</div>
        <div class="dev-tuning" id="devTuning">Loading&#x2026;</div>
        <div class="dev-section-title">Engine State</div>
        <div class="dev-grid" id="devGrid">
          <div class="dev-card"><div class="dev-card__label">Status</div><div class="dev-card__value">Waiting&#x2026;</div></div>
        </div>
        <div class="dev-section-title">Aira</div>
        <div class="dev-aira" id="devAira"></div>
        <div class="dev-section-title">Relationships</div>
        <div class="dev-grid" id="devRelGrid"></div>
        <div class="dev-section-title">Emotion Override</div>
        <div class="dev-emotions" id="devEmotions">
          <button class="dev-emotion-btn" data-preset="neutral">neutral</button>
          <button class="dev-emotion-btn" data-preset="happy">happy</button>
          <button class="dev-emotion-btn" data-preset="charged">charged</button>
          <button class="dev-emotion-btn" data-preset="tension">tension</button>
          <button class="dev-emotion-btn" data-preset="sad">sad</button>
          <button class="dev-emotion-btn" data-preset="angry">angry</button>
          <button class="dev-emotion-btn" data-preset="jealous">jealous</button>
        </div>
        <div class="dev-section-title">Camera</div>
        <div class="dev-camera" id="devCamera">
          <button id="devCaptureBtn" class="dev-btn" type="button">Capture scene</button>
          <div class="dev-camera__preview" id="devCameraPreview"></div>
        </div>
        <div class="dev-section-title">Actions</div>
        <div class="dev-actions" id="devActions">
          <button id="devResetBtn" class="dev-btn" type="button">Reset chat</button>
          <button id="devAiraPushBtn" class="dev-btn" type="button">+Presence</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.root);

    this.root.querySelector(".dev-drawer__close").addEventListener("click", () => this.close());
    this.root.querySelector("#devResetBtn").addEventListener("click", () => this.onReset?.());
    this.root.querySelector("#devAiraPushBtn").addEventListener("click", () => this._pushAiraPresence());
    this.root.querySelector("#devCaptureBtn").addEventListener("click", () => this._captureScene());

    this.root.querySelectorAll(".dev-emotion-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._setEmotion(btn.dataset.preset));
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "§") { e.preventDefault(); this.toggle(); }
    });

    this._loadTuning();
  }

  async _pushAiraPresence() {
    try {
      await fetch("/api/ai/aira/push", { method: "POST" });
    } catch { /* silent */ }
  }

  async _captureScene() {
    const btn = this.root.querySelector("#devCaptureBtn");
    const preview = this.root.querySelector("#devCameraPreview");
    if (!btn || !preview) return;

    btn.disabled = true;
    btn.textContent = "Generating…";
    preview.innerHTML = `<div class="dev-camera__status">Talking to DALL-E…</div>`;

    try {
      const res = await fetch("/api/camera/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (data.ok && data.shot?.path) {
        preview.innerHTML = `
          <img class="dev-camera__img" src="${data.shot.path}" alt="Scene capture" />
          <div class="dev-camera__caption">${escapeHtml(data.shot.filename)}</div>
        `;
      } else {
        preview.innerHTML = `<div class="dev-camera__status">Failed: ${escapeHtml(data.error || "unknown error")}</div>`;
      }
    } catch (e) {
      preview.innerHTML = `<div class="dev-camera__status">Error: ${escapeHtml(e.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Capture scene";
    }
  }

  async _setEmotion(preset) {
    this.root.querySelectorAll(".dev-emotion-btn").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.preset === preset);
    });
    try {
      await fetch("/api/ai/emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
    } catch { /* silent */ }
  }

  async _loadTuning() {
    try {
      const res = await fetch("/api/ai/tune");
      const data = await res.json();
      if (data.ok) {
        this.tuning = data.tuning;
        this._renderTuning();
      }
    } catch { /* silent */ }
  }

  async _saveTuning(key, value) {
    this.tuning[key] = value;

    // Expose client-side params to app.js
    if (!window.__AIRA_TUNING__) window.__AIRA_TUNING__ = {};
    window.__AIRA_TUNING__[key] = value;

    try {
      await fetch("/api/ai/tune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    } catch { /* silent */ }
  }

  _renderTuning() {
    const container = this.root.querySelector("#devTuning");
    if (!container || !this.tuning) return;

    const params = [
      { key: "responseLength",    label: "Response Length",    hint: "1=very short  5=cinematic" },
      { key: "subtextFrequency",  label: "Subtext Frequency",  hint: "1=rare  5=always" },
      { key: "secondaryChance",   label: "Secondary Speaker",  hint: "1=rare  5=often" },
      { key: "temperature",       label: "AI Temperature",     hint: "1=predictable  5=chaotic" },
      { key: "autoTalkFrequency", label: "Auto-Talk",          hint: "1=rare (120s)  5=often (25s)" },
      { key: "typingSpeed",       label: "Typing Delay",       hint: "1=instant  5=slow" },
    ];

    container.innerHTML = params.map(({ key, label, hint }) => `
      <div class="dev-tuning-row">
        <div class="dev-tuning-label">
          <span>${label}</span>
          <span class="dev-tuning-hint">${hint}</span>
        </div>
        <div class="dev-tuning-control">
          <input
            class="dev-slider"
            type="range"
            min="1" max="5" step="1"
            value="${this.tuning[key] ?? 3}"
            data-key="${key}"
          />
          <span class="dev-slider-val" id="sliderVal_${key}">${this.tuning[key] ?? 3}</span>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".dev-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const key = e.target.dataset.key;
        const val = Number(e.target.value);
        const display = this.root.querySelector(`#sliderVal_${key}`);
        if (display) display.textContent = val;
        this._saveTuning(key, val);
      });
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    window.__AIRA_DEV_MODE__ = true;
    this.root.classList.add("is-open");
    this.root.setAttribute("aria-hidden", "false");
    this._loadTuning();
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
    this.pollTimer = window.setInterval(() => this.refresh(), 1500);
  }

  stopPolling() {
    if (this.pollTimer) { window.clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  refresh() {
    const state = this.getState?.() || null;
    const grid = this.root.querySelector("#devGrid");
    const relGrid = this.root.querySelector("#devRelGrid");

    if (!state) {
      grid.innerHTML = `<div class="dev-card"><div class="dev-card__label">State</div><div class="dev-card__value">No state yet.</div></div>`;
      return;
    }

    const aira = state.aira || {};
    const investigation = state.investigation || {};
    const tuning = state.tuning || {};

    grid.innerHTML = `
      <div class="dev-card">
        <div class="dev-card__label">Turns</div>
        <div class="dev-card__value">${safe(state.turnCount)}</div>
      </div>
      <div class="dev-card">
        <div class="dev-card__label">Tension</div>
        <div class="dev-card__value">${safeNum(state.tension)}</div>
      </div>
      <div class="dev-card">
        <div class="dev-card__label">Avg Score</div>
        <div class="dev-card__value">${safeNum(tuning.avgScore)}</div>
      </div>
    `;

    // Aira GM section
    const airaPanel = this.root.querySelector("#devAira");
    if (airaPanel) {
      const lp = state.airaLastPlay;
      const lastPlay = lp ? `[${lp.type}] ${lp.instruction}` : "idle";
      const profile = aira.interferenceProfile || {};
      const clues = (investigation.cluesFound || []).length;
      airaPanel.innerHTML = `
        ${airaRelRow("presence",    aira.presenceLevel)}
        ${airaRelRow("anomaly",     aira.anomalyLevel)}
        ${airaRelRow("awareness",   investigation.awarenessLevel)}
        ${airaRelRow("suspicion",   investigation.suspicion)}
        <div class="dev-aira-row">
          <span class="dev-rel-row__label">stage</span>
          <span class="dev-rel-row__val">${safe(aira.manifestation)}</span>
        </div>
        <div class="dev-aira-row">
          <span class="dev-rel-row__label">voice</span>
          <span class="dev-rel-row__val">${aira.voiceUnlocked ? "unlocked" : "locked"}</span>
        </div>
        <div class="dev-aira-row">
          <span class="dev-rel-row__label">clues</span>
          <span class="dev-rel-row__val">${clues}</span>
        </div>
        <div class="dev-aira-row">
          <span class="dev-rel-row__label">interference</span>
          <span class="dev-rel-row__val">${[
            profile.subtleRewriteUnlocked ? "rewrite" : null,
            profile.contradictionUnlocked ? "contradict" : null,
            profile.ghostMessageUnlocked  ? "ghost" : null,
            profile.directInsertionUnlocked ? "direct" : null,
          ].filter(Boolean).join(" · ") || "none"}</span>
        </div>
        <div class="dev-aira-play" id="devAiraPlay">last play: ${escapeHtml(lastPlay)}</div>
      `;
    }

    const relationships = state.relationships || {};
    const muted = state.mutedAgents || [];
    relGrid.innerHTML = Object.entries(relationships).map(([name, rel]) => {
      const isMuted = muted.includes(name);
      return `
      <div class="dev-rel-card">
        <div class="dev-rel-name">
          ${name}
          <button class="dev-mute-btn ${isMuted ? 'is-muted' : ''}" data-agent="${escapeHtml(name)}">${isMuted ? 'unmute' : 'mute'}</button>
        </div>
        ${relRow("trust",           rel.trust)}
        ${relRow("attraction",      rel.attraction)}
        ${relRow("comfort",         rel.comfort)}
        ${relRow("attachment",      rel.attachment)}
        ${relRow("romanticTension", rel.romanticTension)}
        ${relRow("longing",         rel.longing)}
        ${relRow("jealousy",        rel.jealousy)}
        ${relRow("hurt",            rel.hurt)}
        ${relRow("avoidance",       rel.avoidance)}
      </div>
    `;
    }).join("");

    relGrid.querySelectorAll(".dev-mute-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._toggleMute(btn.dataset.agent, !btn.classList.contains("is-muted")));
    });
  }

  async _toggleMute(name, mute) {
    try {
      await fetch("/api/ai/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, muted: mute }),
      });
    } catch { /* silent */ }
  }
}

function safe(v) { return v ?? "—"; }
function safeNum(v) { return typeof v === "number" ? v.toFixed(3) : "—"; }
function escapeHtml(v) {
  return String(v ?? "—").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function airaRelRow(label, value) {
  const num = typeof value === "number" ? value : null;
  const pct = num !== null ? Math.round(num * 100) : null;
  const fill = pct !== null ? `<div class="dev-rel-bar__fill" style="width:${pct}%"></div>` : "";
  return `
    <div class="dev-aira-row">
      <span class="dev-rel-row__label">${label}</span>
      <div class="dev-rel-bar">${fill}</div>
      <span class="dev-rel-row__val">${num !== null ? num.toFixed(2) : "—"}</span>
    </div>
  `;
}

function relRow(label, value) {
  const num = typeof value === "number" ? value : null;
  const pct = num !== null ? Math.round(num * 100) : null;
  const fill = pct !== null ? `<div class="dev-rel-bar__fill" style="width:${pct}%"></div>` : "";
  return `
    <div class="dev-rel-row">
      <span class="dev-rel-row__label">${label}</span>
      <div class="dev-rel-bar">${fill}</div>
      <span class="dev-rel-row__val">${num !== null ? num.toFixed(2) : "—"}</span>
    </div>
  `;
}
