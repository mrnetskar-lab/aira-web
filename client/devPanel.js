// Sensible starting values that match the engine's own defaults
const OFFLINE_DEFAULTS = {
  tension:    0.9,
  randomness: 0.82,
  aira: {
    presenceLevel: 0.92,
    anomalyLevel:  0.88,
  },
  investigation: {
    awarenessLevel: 0.9,
    suspicion:      0.86,
  },
  relationships: {
    Lucy:  { trust: 0.91, attraction: 0.9, comfort: 0.9, attachment: 0.88, interest: 0.93, romanticTension: 0.89, longing: 0.85, jealousy: 0.62, hurt: 0.32, avoidance: 0.18, intimacyReadiness: 0.9, exclusivityPressure: 0.8, betrayalSensitivity: 0.78 },
    Sam:   { trust: 0.86, attraction: 0.88, comfort: 0.84, attachment: 0.82, interest: 0.9, romanticTension: 0.91, longing: 0.81, jealousy: 0.74, hurt: 0.42, avoidance: 0.3, intimacyReadiness: 0.85, exclusivityPressure: 0.84, betrayalSensitivity: 0.87 },
    Angie: { trust: 0.93, attraction: 0.9, comfort: 0.91, attachment: 0.88, interest: 0.92, romanticTension: 0.87, longing: 0.84, jealousy: 0.66, hurt: 0.34, avoidance: 0.2, intimacyReadiness: 0.9, exclusivityPressure: 0.81, betrayalSensitivity: 0.79 },
  },
};

export class AiraDevDrawer {
  constructor({ getState, onStateUpdate, onReset }) {
    this.getState = getState;
    this.onStateUpdate = onStateUpdate;
    this.onReset = onReset;
    this.isOpen = false;
    this.pollTimer = null;
    this.root = null;
    this.tuning = null;
    this._activeSliders = new Set();
    this._pendingPatch = {};
    this._patchDebounce = null;
    this._relRendered = false;

    window.__AIRA_DEV_MODE__ = false;
  }

  // ─── Character color map ──────────────────────────────────────────────────
  _charColor(name) {
    return { Lucy: "#c9a7ff", Sam: "#8eaef9", Angie: "#d7a65f" }[name] || "var(--subtext)";
  }

  // ─── Relationship stat definitions ────────────────────────────────────────
  _REL_PARAMS = [
    { key: "trust",               label: "trust"              },
    { key: "attraction",          label: "attraction"         },
    { key: "comfort",             label: "comfort"            },
    { key: "attachment",          label: "attachment"         },
    { key: "interest",            label: "interest"           },
    { key: "romanticTension",     label: "romantic tension"   },
    { key: "longing",             label: "longing"            },
    { key: "jealousy",            label: "jealousy"           },
    { key: "hurt",                label: "hurt"               },
    { key: "avoidance",           label: "avoidance"          },
    { key: "intimacyReadiness",   label: "intimacy ready"     },
    { key: "exclusivityPressure", label: "exclusivity"        },
    { key: "betrayalSensitivity", label: "betrayal sensitiv." },
  ];

  // ─── Mount ────────────────────────────────────────────────────────────────
  mount() {
    this.root = document.createElement("aside");
    this.root.className = "dev-drawer";
    this.root.setAttribute("aria-hidden", "true");

    this.root.innerHTML = `
      <div class="dev-drawer__header">
        <div class="dev-drawer__title">AIRA Dev</div>
        <div class="dev-drawer__header-actions">
          <button id="devTickBtn"  class="dev-btn dev-btn--sm" type="button">tick</button>
          <button class="dev-drawer__close" type="button" aria-label="Close">&#x2715;</button>
        </div>
      </div>
      <div class="dev-drawer__content">

        <div class="dev-section-title">Engine Stats</div>
        <div id="devStats" class="dev-stat-row"></div>

        <div class="dev-section-title">State</div>
        <div id="devStateSliders" class="dev-tuning"></div>

        <div class="dev-section-title">Tuning</div>
        <div id="devTuning" class="dev-tuning">Loading&#x2026;</div>

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

        <div class="dev-section-title">Relationships</div>
        <div id="devRelSection" class="dev-rel-section"></div>

        <div class="dev-section-title">Aira GM</div>
        <div id="devAiraSliders" class="dev-tuning"></div>
        <div id="devAiraInfo" class="dev-aira"></div>

        <div class="dev-section-title">Camera</div>
        <div class="dev-camera" id="devCamera">
          <button id="devCaptureBtn" class="dev-btn" type="button">Capture scene</button>
          <div class="dev-camera__preview" id="devCameraPreview"></div>
        </div>

        <div class="dev-section-title">Actions</div>
        <div class="dev-actions" id="devActions">
          <button id="devResetBtn"    class="dev-btn" type="button">Reset chat</button>
          <button id="devAiraPushBtn" class="dev-btn" type="button">+Presence</button>
        </div>

      </div>
    `;

    document.body.appendChild(this.root);

    this.root.querySelector(".dev-drawer__close").addEventListener("click", () => this.close());
    this.root.querySelector("#devResetBtn").addEventListener("click", () => this.onReset?.());
    this.root.querySelector("#devAiraPushBtn").addEventListener("click", () => this._pushAiraPresence());
    this.root.querySelector("#devCaptureBtn").addEventListener("click", () => this._captureScene());
    this.root.querySelector("#devTickBtn").addEventListener("click", () => this._tick());

    this.root.querySelectorAll(".dev-emotion-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._setEmotion(btn.dataset.preset));
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "§") { e.preventDefault(); this.toggle(); }
    });

    this._renderStateSliders();
    this._renderAiraSliders();
    this._loadTuning();
  }

  // ─── State sliders (tension, randomness) ─────────────────────────────────
  _renderStateSliders() {
    const container = this.root.querySelector("#devStateSliders");
    if (!container) return;

    const params = [
      { key: "tension",    label: "Tension",    hint: "0=calm  1=max"      },
      { key: "randomness", label: "Randomness", hint: "0=stable  1=chaotic" },
    ];

    container.innerHTML = params.map(({ key, label, hint }) => {
      const def = (OFFLINE_DEFAULTS[key] ?? 0).toFixed(2);
      return `
      <div class="dev-tuning-row">
        <div class="dev-tuning-label">
          <span>${label}</span>
          <span class="dev-tuning-hint">${hint}</span>
        </div>
        <div class="dev-tuning-control">
          <input class="dev-slider dev-slider--state" type="range"
            min="0" max="1" step="0.01" value="${def}"
            data-state-key="${key}" />
          <span class="dev-slider-val" id="stateVal_${key}">${def}</span>
        </div>
      </div>
    `;}).join("");

    container.querySelectorAll(".dev-slider--state").forEach((slider) => {
      const k = slider.dataset.stateKey;
      slider.addEventListener("pointerdown", () => this._activeSliders.add("state:" + k));
      slider.addEventListener("pointerup",   () => setTimeout(() => this._activeSliders.delete("state:" + k), 2000));
      slider.addEventListener("input", (e) => {
        const val = Number(e.target.value);
        const lbl = this.root.querySelector(`#stateVal_${k}`);
        if (lbl) lbl.textContent = val.toFixed(2);
        this._queueStatePatch({ [k]: val });
      });
    });
  }

  // ─── Aira sliders ─────────────────────────────────────────────────────────
  _renderAiraSliders() {
    const container = this.root.querySelector("#devAiraSliders");
    if (!container) return;

    const params = [
      { ns: "aira",          key: "presenceLevel",  label: "Presence Level"  },
      { ns: "aira",          key: "anomalyLevel",   label: "Anomaly Level"   },
      { ns: "investigation", key: "awarenessLevel", label: "Awareness Level" },
      { ns: "investigation", key: "suspicion",      label: "Suspicion"       },
    ];

    container.innerHTML = params.map(({ ns, key, label }) => {
      const def = ((OFFLINE_DEFAULTS[ns] || {})[key] ?? 0).toFixed(2);
      return `
      <div class="dev-tuning-row">
        <div class="dev-tuning-label">
          <span>${label}</span>
          <span class="dev-slider-val" id="airaVal_${ns}_${key}">${def}</span>
        </div>
        <div class="dev-tuning-control">
          <input class="dev-slider dev-slider--aira" type="range"
            min="0" max="1" step="0.01" value="${def}"
            data-aira-ns="${ns}" data-aira-key="${key}" />
        </div>
      </div>
    `;}).join("");

    container.querySelectorAll(".dev-slider--aira").forEach((slider) => {
      const id = `aira:${slider.dataset.airaNs}:${slider.dataset.airaKey}`;
      slider.addEventListener("pointerdown", () => this._activeSliders.add(id));
      slider.addEventListener("pointerup",   () => setTimeout(() => this._activeSliders.delete(id), 2000));
      slider.addEventListener("input", (e) => {
        const { airaNs: ns, airaKey: key } = e.target.dataset;
        const val = Number(e.target.value);
        const lbl = this.root.querySelector(`#airaVal_${ns}_${key}`);
        if (lbl) lbl.textContent = val.toFixed(2);
        this._queueStatePatch({ [ns]: { [key]: val } });
      });
    });
  }

  // ─── Relationship sliders (initial render) ────────────────────────────────
  _renderRelSliders(state) {
    const container = this.root.querySelector("#devRelSection");
    if (!container) return;

    const relationships = state?.relationships || {};
    const muted = state?.mutedAgents || [];

    container.innerHTML = Object.entries(relationships).map(([name, rel]) => {
      const isMuted = muted.includes(name);
      const color = this._charColor(name);

      return `
        <div class="dev-rel-card" data-char="${escapeHtml(name)}">
          <div class="dev-rel-name">
            <span style="color:${color}">${escapeHtml(name)}</span>
            <button class="dev-mute-btn ${isMuted ? "is-muted" : ""}" data-agent="${escapeHtml(name)}">${isMuted ? "unmute" : "mute"}</button>
          </div>
          ${this._REL_PARAMS.map(({ key, label }) => {
            const val = typeof rel[key] === "number" ? rel[key] : 0;
            return `
              <div class="dev-rel-slider-row">
                <span class="dev-rel-row__label">${label}</span>
                <input class="dev-slider dev-slider--rel" type="range"
                  min="0" max="1" step="0.01" value="${val.toFixed(2)}"
                  data-char="${escapeHtml(name)}" data-key="${key}"
                  style="--slider-color:${color}" />
                <span class="dev-slider-val" id="relVal_${name}_${key}">${val.toFixed(2)}</span>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }).join("");

    container.querySelectorAll(".dev-slider--rel").forEach((slider) => {
      const id = `rel:${slider.dataset.char}:${slider.dataset.key}`;
      slider.addEventListener("pointerdown", () => this._activeSliders.add(id));
      slider.addEventListener("pointerup",   () => setTimeout(() => this._activeSliders.delete(id), 2000));
      slider.addEventListener("input", (e) => {
        const { char, key } = e.target.dataset;
        const val = Number(e.target.value);
        const lbl = this.root.querySelector(`#relVal_${char}_${key}`);
        if (lbl) lbl.textContent = val.toFixed(2);
        this._queueStatePatch({ relationships: { [char]: { [key]: val } } });
      });
    });

    container.querySelectorAll(".dev-mute-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        this._toggleMute(btn.dataset.agent, !btn.classList.contains("is-muted"))
      );
    });
  }

  // Update rel slider values from polled state (skip active sliders)
  _updateRelSliders(state) {
    const relationships = state?.relationships || {};
    const muted = state?.mutedAgents || [];

    for (const [name, rel] of Object.entries(relationships)) {
      for (const { key } of this._REL_PARAMS) {
        if (this._activeSliders.has(`rel:${name}:${key}`)) continue;
        const slider = this.root.querySelector(`.dev-slider--rel[data-char="${name}"][data-key="${key}"]`);
        const lbl    = this.root.querySelector(`#relVal_${name}_${key}`);
        const val    = typeof rel[key] === "number" ? rel[key] : ((OFFLINE_DEFAULTS.relationships[name] || {})[key] ?? 0);
        if (slider) slider.value = val.toFixed(2);
        if (lbl)    lbl.textContent = val.toFixed(2);
      }

      // Sync mute button
      const muteBtn = this.root.querySelector(`.dev-mute-btn[data-agent="${name}"]`);
      if (muteBtn) {
        const isMuted = muted.includes(name);
        muteBtn.classList.toggle("is-muted", isMuted);
        muteBtn.textContent = isMuted ? "unmute" : "mute";
      }
    }
  }

  // Update state sliders from polled state
  _updateStateSliders(state) {
    const fields = ["tension", "randomness"];
    for (const k of fields) {
      if (this._activeSliders.has("state:" + k)) continue;
      const slider = this.root.querySelector(`.dev-slider--state[data-state-key="${k}"]`);
      const lbl    = this.root.querySelector(`#stateVal_${k}`);
      const val    = typeof state?.[k] === "number" ? state[k] : (OFFLINE_DEFAULTS[k] ?? 0);
      if (slider) slider.value = val.toFixed(2);
      if (lbl)    lbl.textContent = val.toFixed(2);
    }
  }

  // Update aira sliders from polled state
  _updateAiraSliders(state) {
    const params = [
      { ns: "aira",          key: "presenceLevel"  },
      { ns: "aira",          key: "anomalyLevel"   },
      { ns: "investigation", key: "awarenessLevel" },
      { ns: "investigation", key: "suspicion"      },
    ];
    for (const { ns, key } of params) {
      const id  = `aira:${ns}:${key}`;
      if (this._activeSliders.has(id)) continue;
      const src = state?.[ns];
      const val = typeof src?.[key] === "number" ? src[key] : ((OFFLINE_DEFAULTS[ns] || {})[key] ?? 0);
      const slider = this.root.querySelector(`.dev-slider--aira[data-aira-ns="${ns}"][data-aira-key="${key}"]`);
      const lbl    = this.root.querySelector(`#airaVal_${ns}_${key}`);
      if (slider) slider.value = val.toFixed(2);
      if (lbl)    lbl.textContent = val.toFixed(2);
    }
  }

  // ─── Patch queue (debounced, deep-merged) ─────────────────────────────────
  _queueStatePatch(partial) {
    this._pendingPatch = deepMerge(this._pendingPatch, partial);
    if (this._patchDebounce) clearTimeout(this._patchDebounce);
    this._patchDebounce = setTimeout(() => this._flushStatePatch(), 80);
  }

  async _flushStatePatch() {
    const patch = this._pendingPatch;
    this._pendingPatch = {};
    try {
      const res = await fetch("/api/ai/state/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.ok && data.state && this.onStateUpdate) {
        this.onStateUpdate(data.state);
      }
    } catch { /* silent */ }
  }

  // ─── API helpers ──────────────────────────────────────────────────────────
  async _tick() {
    try {
      const res  = await fetch("/api/ai/tick", { method: "POST" });
      const data = await res.json();
      if (data.ok && data.response) {
        window.dispatchEvent(new CustomEvent("aira:tick-response", { detail: data.response }));
      }
    } catch { /* silent */ }
  }

  async _pushAiraPresence() {
    try {
      await fetch("/api/ai/aira/push", { method: "POST" });
    } catch { /* silent */ }
  }

  async _captureScene() {
    const btn     = this.root.querySelector("#devCaptureBtn");
    const preview = this.root.querySelector("#devCameraPreview");
    if (!btn || !preview) return;

    btn.disabled = true;
    btn.textContent = "Generating…";
    preview.innerHTML = `<div class="dev-camera__status">Talking to DALL-E…</div>`;

    try {
      const res  = await fetch("/api/camera/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
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
      const res  = await fetch("/api/ai/tune");
      const data = await res.json();
      if (data.ok) {
        this.tuning = data.tuning;
        this._renderTuning();
      }
    } catch { /* silent */ }
  }

  async _saveTuning(key, value) {
    this.tuning[key] = value;
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
      { key: "responseLength",    label: "Response Length",   hint: "1=very short  5=cinematic",    min: 1, max: 5,  step: 1 },
      { key: "subtextFrequency",  label: "Subtext Frequency", hint: "1=rare  5=always",              min: 1, max: 5,  step: 1 },
      { key: "secondaryChance",   label: "Secondary Speaker", hint: "1=rare  5=often",               min: 1, max: 5,  step: 1 },
      { key: "temperature",       label: "AI Temperature",    hint: "1=predictable  5=chaotic",      min: 1, max: 5,  step: 1 },
      { key: "autoTalkFrequency", label: "Auto-Talk",         hint: "1=rare (120s)  5=often (25s)",  min: 1, max: 5,  step: 1 },
      { key: "typingSpeed",       label: "Typing Delay",      hint: "1=instant  5=slow",             min: 1, max: 5,  step: 1 },
      { key: "languageIntensity", label: "Language Global",   hint: "0=clean  20=raw edge",          min: 0, max: 20, step: 1 },
      { key: "languageLucy",      label: "Lucy Edge",         hint: "0=soft  20=sharp",              min: 0, max: 20, step: 1 },
      { key: "languageSam",       label: "Sam Edge",          hint: "0=restrained  20=aggressive",   min: 0, max: 20, step: 1 },
      { key: "languageAngie",     label: "Angie Edge",        hint: "0=light  20=volatile",          min: 0, max: 20, step: 1 },
    ];

    container.innerHTML = params.map(({ key, label, hint, min, max, step }) => `
      <div class="dev-tuning-row">
        <div class="dev-tuning-label">
          <span>${label}</span>
          <span class="dev-tuning-hint">${hint}</span>
        </div>
        <div class="dev-tuning-control">
          <input class="dev-slider" type="range"
            min="${min}" max="${max}" step="${step}"
            value="${this.tuning[key] ?? 3}"
            data-key="${key}" />
          <input class="dev-slider-num" type="number"
            min="${min}" max="${max}" step="${step}"
            value="${this.tuning[key] ?? 3}"
            data-key="${key}" id="sliderNum_${key}" />
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".dev-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const key = e.target.dataset.key;
        const val = Number(e.target.value);
        const num = this.root.querySelector(`#sliderNum_${key}`);
        if (num) num.value = String(val);
        this._saveTuning(key, val);
      });
    });

    container.querySelectorAll(".dev-slider-num").forEach((numInput) => {
      numInput.addEventListener("change", (e) => {
        const key = e.target.dataset.key;
        const val = Number(e.target.value);
        if (!Number.isFinite(val)) return;
        const slider = this.root.querySelector(`.dev-slider[data-key="${key}"]`);
        if (slider) slider.value = String(val);
        this._saveTuning(key, val);
      });
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

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  toggle() { this.isOpen ? this.close() : this.open(); }

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

  // ─── Refresh (polls getState) ─────────────────────────────────────────────
  refresh() {
    const state = this.getState?.() || null;

    // ── Stats row
    const statsEl = this.root.querySelector("#devStats");
    if (statsEl && state) {
      const tuning = state.tuning || {};
      statsEl.innerHTML = `
        <div class="dev-stat-card"><div class="dev-stat-card__label">turns</div><div class="dev-stat-card__val">${safe(state.turnCount)}</div></div>
        <div class="dev-stat-card"><div class="dev-stat-card__label">avg score</div><div class="dev-stat-card__val">${safeNum(tuning.avgScore)}</div></div>
        <div class="dev-stat-card"><div class="dev-stat-card__label">last event</div><div class="dev-stat-card__val">${escapeHtml(state.lastEvent || "—")}</div></div>
      `;
    }

    // ── State sliders (tension, randomness)
    if (state) this._updateStateSliders(state);

    // ── Aira sliders
    if (state) this._updateAiraSliders(state);

    // ── Relationships — fall back to OFFLINE_DEFAULTS if server hasn't sent state
    const relState = state?.relationships ? state : { relationships: OFFLINE_DEFAULTS.relationships };
    if (!this._relRendered) {
      this._renderRelSliders(relState);
      this._relRendered = true;
    } else if (state?.relationships) {
      this._updateRelSliders(state);
    }

    // ── Aira GM info
    const airaInfo = this.root.querySelector("#devAiraInfo");
    if (airaInfo && state) {
      const aira = state.aira || {};
      const inv  = state.investigation || {};
      const lp   = state.airaLastPlay;
      const lastPlay = lp ? `[${lp.type}] ${lp.instruction}` : "idle";
      const profile  = aira.interferenceProfile || {};
      const clues    = (inv.cluesFound || []).length;

      airaInfo.innerHTML = `
        ${airaInfoRow("stage",     aira.manifestation  || "—")}
        ${airaInfoRow("voice",     aira.voiceUnlocked ? "unlocked" : "locked")}
        ${airaInfoRow("clues",     clues)}
        ${airaInfoRow("interference", [
          profile.subtleRewriteUnlocked  ? "rewrite"   : null,
          profile.contradictionUnlocked  ? "contradict" : null,
          profile.ghostMessageUnlocked   ? "ghost"     : null,
          profile.directInsertionUnlocked ? "direct"   : null,
        ].filter(Boolean).join(" · ") || "none")}
        <div class="dev-aira-play">last play: ${escapeHtml(lastPlay)}</div>
      `;
    }
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function safe(v)    { return v ?? "—"; }
function safeNum(v) { return typeof v === "number" ? v.toFixed(3) : "—"; }

function escapeHtml(v) {
  return String(v ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function airaInfoRow(label, value) {
  return `
    <div class="dev-aira-row">
      <span class="dev-rel-row__label">${label}</span>
      <span class="dev-rel-row__val">${escapeHtml(String(value))}</span>
    </div>
  `;
}

/** Shallow-then-deep merge for nested patch objects */
function deepMerge(target, source) {
  const out = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(typeof out[k] === "object" ? out[k] : {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
