// LEGACY SHELL: This file is backend-dependent and requires API routes. Not for static hosting. Use index-v2.html + app-v2.js for static local runs.
// import { AiraDevDrawer } from "./devPanel.js"; // Disabled for browser compatibility




// PATCH: Single shell, one source of truth for views, safe event binding
const VIEWS = { home: "homeView", chat: "chatView", lab: "labView", dm: "dmView" };
let activeView = "home";

function setPrimaryView(viewName) {
  Object.values(VIEWS).forEach((id) => {
    document.getElementById(id)?.classList.remove("view--active");
  });
  const targetId = VIEWS[viewName] || "homeView";
  document.getElementById(targetId)?.classList.add("view--active");
  state.currentView = viewName;
  activeView = viewName;
  syncBodyMode();
}



function bindShellEvents() {
  document.getElementById("enterChatBtn")?.addEventListener("click", () => setPrimaryView("chat"));
  document.getElementById("backToHomeBtn")?.addEventListener("click", () => setPrimaryView("home"));
}




// PATCH: Remove early event binding, only bind in init
// PATCH: Remove Aira from nav/threads/character lists
const CHARACTERS = {
  c1: { id: "c1", name: "Lucy",  displayName: "Lucy",  key: "lucy"  },
  c2: { id: "c2", name: "Sam",   displayName: "Sam",   key: "sam"   },
  c3: { id: "c3", name: "Angie", displayName: "Angie", key: "angie" },
  // c4: { id: "c4", name: "Aira",  displayName: "Aira",  key: "aira"  }, // Aira is now hidden/system only
};

// Ensure syncBodyMode is defined before any usage
function syncBodyMode() {
  document.body.classList.toggle("is-home", state.currentView === "home");
  document.body.classList.toggle("is-chat", state.currentView === "chat");
}



/** Returns true if the character is visible (not system/GM/hidden). */
function isVisibleCharacter(char) {
  if (!char) return false;
  const k = (char.key || char.id || char.name || "").toLowerCase();
  return k !== "aira" && k !== "c4" && k !== "aira";
}

/** Look up a character by name or key (e.g. "lucy", "Lucy", "c1"). */
function getCharacterByKey(nameOrId) {
  const lower = (nameOrId || "").toLowerCase();
  return Object.values(CHARACTERS).find(
    (c) => c.key === lower || c.name.toLowerCase() === lower || c.id === lower
  ) || null;
}

/** Default thread/message state — always built from the registry. */
function buildDefaultMessagesApp() {
  const previews = {
    c1: "Du forsvant.",
    c2: "Er her fortsatt.",
    c3: "Hei, hvor ble du av?",
    // c4: "Jeg har ventet.",
  };
  const now = Date.now();
  const seedBase = now - 1000 * 60 * 12;

  return {
    activeThread: null,
    threads: [
      { id: "c1", name: "Lucy",  displayName: "Lucy",  preview: previews.c1, unread: false },
      { id: "c2", name: "Sam",   displayName: "Sam",   preview: previews.c2, unread: false },
      { id: "c3", name: "Angie", displayName: "Angie", preview: previews.c3, unread: false },
      // No Aira thread
    ],
    messages: {
      c1: [{ text: previews.c1, me: false, timestamp: new Date(seedBase).toISOString() }],
      c2: [{ text: previews.c2, me: false, timestamp: new Date(seedBase + 1000 * 60 * 3).toISOString() }],
      c3: [{ text: previews.c3, me: false, timestamp: new Date(seedBase + 1000 * 60 * 6).toISOString() }],
      // c4: [{ text: previews.c4, me: false, timestamp: new Date(seedBase + 1000 * 60 * 9).toISOString() }],
    },
  };
}

function toValidIsoDate(value) {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

function normalizePhoneMessage(message, fallbackIso = new Date().toISOString()) {
  if (!message || typeof message.text !== "string") return null;
  return {
    text: message.text,
    me: Boolean(message.me),
    timestamp: toValidIsoDate(message.timestamp) || fallbackIso,
  };
}

function formatPhoneThreadTime(isoDate) {
  const date = isoDate ? new Date(isoDate) : new Date();
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPhoneThreadDate(isoDate) {
  const date = isoDate ? new Date(isoDate) : new Date();
  return new Intl.DateTimeFormat([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatPhoneThreadListDate(isoDate) {
  const date = isoDate ? new Date(isoDate) : new Date();
  return new Intl.DateTimeFormat([], {
    day: "2-digit",
    month: "short",
  }).format(date);
}

let messageToneContext = null;

function playMessageTone(kind = "incoming") {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    if (!messageToneContext) {
      messageToneContext = new AudioCtx();
    }

    if (messageToneContext.state === "suspended") {
      messageToneContext.resume().catch(() => {});
    }

    const now = messageToneContext.currentTime;
    const oscillator = messageToneContext.createOscillator();
    const gain = messageToneContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(kind === "incoming" ? 860 : 620, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "incoming" ? 740 : 560, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "incoming" ? 0.05 : 0.03, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    oscillator.connect(gain);
    gain.connect(messageToneContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  } catch {
    // Ignore audio failures from autoplay policies or unsupported contexts.
  }
}

async function clearLegacyClientCaches() {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.warn("[AIRA] service worker cleanup failed", error);
    }
  }

  if ("caches" in window) {
    try {
      const cacheKeys = await window.caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.toLowerCase().startsWith("aira"))
          .map((key) => window.caches.delete(key))
      );
    } catch (error) {
      console.warn("[AIRA] cache cleanup failed", error);
    }
  }
}

const views = {
  chat: document.getElementById("chatView"),
};

const QUICK_PROMPTS = [
  "Hva tenker du akkurat naa?",
  "Kan vi snakke norsk bokmaal?",
  "Hva foeler du egentlig her?",
  "La oss vaere helt aeerlige na.",
  "Hva husker du fra i gaar?",
  "Hvis du maatte velge na, hva ville du valgt?",
  "Hva vil du at scenen skal bli?",
];

const elements = {
  backToHomeBtn: document.getElementById("backToHomeBtn"),
  resetChatBtn: document.getElementById("resetChatBtn"),
  chatMessages: document.getElementById("chatMessages"),
  worldRoomBar: document.getElementById("worldRoomBar"),
  worldRoomCount: document.getElementById("worldRoomCount"),
  worldRoomVibe: document.getElementById("worldRoomVibe"),
  worldRoomScene: document.getElementById("worldRoomScene"),
  serverHeartbeat: document.getElementById("serverHeartbeat"),
  leftRailHeartbeat: document.getElementById("leftRailHeartbeat"),
  worldPresenceState: document.getElementById("worldPresenceState"),
  quickPromptBar: document.getElementById("quickPromptBar"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  voiceToggleBtn: document.getElementById("voiceToggleBtn"),
  sendBtn: document.getElementById("sendBtn"),
  sceneProgressBtn: document.getElementById("sceneProgressBtn"),
  composer: document.getElementById("chatForm"),
  phoneHandle: document.getElementById("phoneHandle"),
  phoneView: document.getElementById("phoneView"),
  phoneScrim: document.getElementById("phoneScrim"),
  phoneSheet: document.getElementById("phoneSheet"),
  phoneGrabber: document.getElementById("phoneGrabber"),
  phoneHome: document.getElementById("phoneHome"),
  phoneAppLayer: document.getElementById("phoneAppLayer"),
  phoneGalleryApp: document.getElementById("phoneGalleryApp"),
  phoneGalleryGrid: document.getElementById("phoneGalleryGrid"),
  phoneGalleryBackBtn: document.getElementById("phoneGalleryBackBtn"),
  phoneSnapApp: document.getElementById("phoneSnapApp"),
  phoneSnapBackBtn: document.getElementById("phoneSnapBackBtn"),
  phoneSnapShutterBtn: document.getElementById("phoneSnapShutterBtn"),
  phoneSnapSaveBtn: document.getElementById("phoneSnapSaveBtn"),
  phoneSnapRetakeBtn: document.getElementById("phoneSnapRetakeBtn"),
  phoneSnapIdle: document.getElementById("phoneSnapIdle"),
  phoneSnapSpinner: document.getElementById("phoneSnapSpinner"),
  phoneSnapResult: document.getElementById("phoneSnapResult"),
  phoneGalleryGenerating: document.getElementById("phoneGalleryGenerating"),
  phoneGalleryCaptureBtn: document.getElementById("phoneGalleryCaptureBtn"),
  phoneGalleryLightbox: document.getElementById("phoneGalleryLightbox"),
  phoneGalleryLightboxImg: document.getElementById("phoneGalleryLightboxImg"),
  phoneGalleryLightboxClose: document.getElementById("phoneGalleryLightboxClose"),
  phoneGalleryLightboxDelete: document.getElementById("phoneGalleryLightboxDelete"),
  phoneMessagesApp: document.getElementById("phoneMessagesApp"),
  phoneMessagesList: document.getElementById("phoneMessagesList"),
  phoneMessagesThread: document.getElementById("phoneMessagesThread"),
  phoneMessagesLog: document.getElementById("phoneMessagesLog"),
  phoneMessagesTitle: document.getElementById("phoneMessagesTitle"),
  phoneMessagesInput: document.getElementById("phoneMessagesInput"),
  phoneMessagesForm: document.getElementById("phoneMessagesForm"),
  phoneMessagesBackBtn: document.getElementById("phoneMessagesBackBtn"),
  phoneThreadBackBtn: document.getElementById("phoneThreadBackBtn"),
  phoneCastApp: document.getElementById("phoneCastApp"),
  phoneCastBackBtn: document.getElementById("phoneCastBackBtn"),
  phoneCastNewBtn: document.getElementById("phoneCastNewBtn"),
  phoneCastList: document.getElementById("phoneCastList"),
  phoneCastCreator: document.getElementById("phoneCastCreator"),
  phoneCastCreatorClose: document.getElementById("phoneCastCreatorClose"),
  phoneCastCreatorForm: document.getElementById("phoneCastCreatorForm"),
};

const state = {
  currentView: "home",
  messages: [],
  latestState: null,
  serverOnline: null,
  isSending: false,
  sceneProgress: {
    lastAt: 0,
    burstStartsAt: 0,
    burstCount: 0,
  },
  tts: {
    enabled: false,
    speaking: false,
    voicesReady: false,
  },
  messagesApp: buildDefaultMessagesApp(),
  phoneApp: null,
  booting: true,
  phone: {
    open: false,
    dragging: false,
    startY: 0,
    currentY: 0,
  },
};

let frozenWorldScrollTop = 0;
let serverHeartbeatTimer = null;

function getSpeechSynth() {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis || null;
}

function stripSpeechMarkup(text) {
  return String(text || "")
    .replace(/\*[^*]*\*/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectSpeechLang(text) {
  const s = String(text || "").toLowerCase();
  if (!s) return "nb-NO";
  if (/[\u00e6\u00f8\u00e5]/.test(s)) return "nb-NO";
  if (/\b(ikke|jeg|du|kan|skal|hvordan|hva|norsk|hei)\b/.test(s)) return "nb-NO";
  return "en-US";
}

function isLikelyFemaleVoice(name = "") {
  const n = String(name || "").toLowerCase();
  return /(female|woman|girl|kvinne|pernille|hedda|hulda|nora|noora|liv|ida|sara|sofie|silje|kari|frida|mia|tone|aria|zira|hazel|emma|anna|eva|x-cfn|f01|f02)/.test(n);
}

function isLikelyMaleVoice(name = "") {
  const n = String(name || "").toLowerCase();
  return /(male|man|boy|finn|olav|lars|jon|erik|clayton|david|mark|thomas|harald|x-cmn|m01|m02)/.test(n);
}

function isBlockedVoice(name = "") {
  const n = String(name || "").toLowerCase();
  // User explicitly reported this voice as undesirable.
  return /\bclayton\b/.test(n);
}

function voiceScore(voice, lang) {
  const vLang = String(voice?.lang || "").toLowerCase();
  const vName = String(voice?.name || "");
  const target = String(lang || "nb-NO").toLowerCase();
  const targetBase = target.slice(0, 2);

  let score = 0;

  if (isBlockedVoice(vName)) return -1000;

  if (vLang === target) score += 120;
  if (vLang.startsWith(targetBase)) score += 70;

  // Strong preference for Norwegian voices for this app.
  if (vLang.startsWith("nb") || vLang.startsWith("nn") || vLang.startsWith("no")) score += 60;

  if (isLikelyFemaleVoice(vName)) score += 28;
  if (isLikelyMaleVoice(vName)) score -= 42;

  // Slight preference for higher quality neural/natural voices when available.
  if (/natural|neural|online/i.test(vName)) score += 8;

  // If no Norwegian female is available, still prefer female over male fallback voices.
  if (!vLang.startsWith("nb") && !vLang.startsWith("nn") && !vLang.startsWith("no")) {
    if (isLikelyFemaleVoice(vName)) score += 18;
    if (isLikelyMaleVoice(vName)) score -= 16;
  }

  return score;
}

function chooseSpeechVoice(lang) {
  const synth = getSpeechSynth();
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  if (!voices.length) return null;

  const clean = voices.filter((v) => !isBlockedVoice(v?.name));
  const langLower = String(lang || "nb-NO").toLowerCase();
  const base = langLower.slice(0, 2);
  const wantsNorwegian = base === "nb" || base === "nn" || base === "no";

  const langVoices = clean.filter((v) => String(v?.lang || "").toLowerCase().startsWith(base));
  const femaleLangVoices = langVoices.filter((v) => isLikelyFemaleVoice(v?.name));

  if (femaleLangVoices.length) {
    return [...femaleLangVoices].sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0];
  }

  // For Norwegian text, pronunciation quality matters most.
  // Prefer any Norwegian voice before falling back to an English female voice.
  if (wantsNorwegian && langVoices.length) {
    return [...langVoices].sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0];
  }

  const anyFemale = clean.filter((v) => isLikelyFemaleVoice(v?.name));
  if (anyFemale.length) {
    return [...anyFemale].sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0];
  }

  const nonMaleLang = langVoices.filter((v) => !isLikelyMaleVoice(v?.name));
  if (nonMaleLang.length) {
    return [...nonMaleLang].sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0];
  }

  const ranked = [...clean].sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang));
  return ranked[0] || clean[0] || voices[0] || null;
}

function updateTtsButtonUI() {
  const btn = elements.voiceToggleBtn;
  if (!btn) return;
  btn.classList.toggle("is-on", state.tts.enabled);
  btn.setAttribute("aria-pressed", state.tts.enabled ? "true" : "false");
  btn.title = state.tts.enabled ? "TTS on" : "TTS off";
}

function setTtsEnabled(enabled) {
  state.tts.enabled = Boolean(enabled);
  const synth = getSpeechSynth();
  if (!state.tts.enabled && synth) {
    synth.cancel();
    state.tts.speaking = false;
  }
  updateTtsButtonUI();
}

function speakText(text, agentName = "") {
  if (!state.tts.enabled) return;
  const synth = getSpeechSynth();
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return;

  const spokenText = stripSpeechMarkup(text);
  if (!spokenText) return;

  const lang = detectSpeechLang(spokenText);
  const selectedVoice = chooseSpeechVoice(lang);
  const femaleLike = isLikelyFemaleVoice(selectedVoice?.name || "");
  const maleLike = isLikelyMaleVoice(selectedVoice?.name || "");

  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = lang;
  utterance.voice = selectedVoice;
  utterance.rate = 1.0;
  const basePitch = agentName === "Lucy" ? 1.08 : agentName === "Sam" ? 1.02 : 1.1;
  // If browser keeps giving a male-ish voice, push pitch up for softer/feminine playback.
  utterance.pitch = maleLike && !femaleLike ? Math.max(1.22, basePitch) : basePitch;
  utterance.volume = 1;

  utterance.onstart = () => {
    state.tts.speaking = true;
  };
  utterance.onend = () => {
    state.tts.speaking = false;
  };
  utterance.onerror = () => {
    state.tts.speaking = false;
  };

  synth.cancel();
  synth.speak(utterance);
}



function syncPresenceModes() {
  document.body.classList.toggle("is-phone-open", state.phone.open);
  document.body.classList.toggle("is-phone-app-open", Boolean(state.phoneApp));
}

function setWorldAvailability(isAvailable) {
  elements.chatForm?.classList.toggle("is-disabled", !isAvailable);
  elements.chatInput?.toggleAttribute("disabled", !isAvailable);
  elements.sendBtn?.toggleAttribute("disabled", !isAvailable);
  views.chat?.classList.toggle("is-world-inactive", !isAvailable);

  if (elements.worldPresenceState) {
    elements.worldPresenceState.hidden = isAvailable;
  }

  if (!isAvailable) {
    elements.chatInput?.blur();
  }
}

function updateServerHeartbeat(isOnline, detail = "") {
  state.serverOnline = typeof isOnline === "boolean" ? isOnline : null;

  const targets = [elements.serverHeartbeat, elements.leftRailHeartbeat].filter(Boolean);
  if (!targets.length) return;

  targets.forEach(el => el.classList.remove("is-online", "is-offline", "is-unknown"));

  if (isOnline === true) {
    targets.forEach(el => {
      el.classList.add("is-online");
      el.setAttribute("aria-label", "Server online");
      el.title = detail || "Server status: online";
    });
    return;
  }

  if (isOnline === false) {
    targets.forEach(el => {
      el.classList.add("is-offline");
      el.setAttribute("aria-label", "Server offline");
      el.title = detail || "Server status: offline";
    });
    return;
  }

  targets.forEach(el => {
    el.classList.add("is-unknown");
    el.setAttribute("aria-label", "Server status unknown");
    el.title = detail || "Server status: checking";
  });
}

async function checkServerHeartbeat() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2800);

  try {
    const response = await fetch("/health", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      updateServerHeartbeat(false, `Server status: HTTP ${response.status}`);
      return false;
    }

    const payload = await response.json().catch(() => null);
    const cloudHint = payload?.cloudinary?.configured === false
      ? " (cloudinary missing)"
      : "";

    updateServerHeartbeat(true, `Server status: online${cloudHint}`);
    return true;
  } catch {
    updateServerHeartbeat(false, "Server status: offline");
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

function startServerHeartbeatChecks() {
  if (serverHeartbeatTimer) {
    window.clearInterval(serverHeartbeatTimer);
    serverHeartbeatTimer = null;
  }

  updateServerHeartbeat(null, "Server status: checking");
  checkServerHeartbeat();
  serverHeartbeatTimer = window.setInterval(() => {
    checkServerHeartbeat();
  }, 15_000);
}

function freezeWorldStage() {
  if (!elements.chatMessages) return;
  frozenWorldScrollTop = elements.chatMessages.scrollTop;
  elements.chatMessages.classList.add("is-frozen");
}

function unfreezeWorldStage() {
  if (!elements.chatMessages) return;
  elements.chatMessages.classList.remove("is-frozen");
  elements.chatMessages.scrollTop = frozenWorldScrollTop;
}

function openPhone() {
  if (state.booting) return;
  state.phone.open = true;
  state.phone.dragging = false;

  elements.phoneView?.classList.remove("is-peeking");
  elements.phoneView?.classList.add("is-open");
  elements.phoneView?.setAttribute("aria-hidden", "false");
  elements.phoneHandle?.setAttribute("aria-expanded", "true");
  elements.phoneSheet?.style.setProperty("--phone-sheet-offset", "0px");
  elements.phoneHome?.removeAttribute("hidden");
  document.body.classList.add("is-in-private-mode");
  freezeWorldStage();

  setWorldAvailability(false);
  syncPresenceModes();
}

function closePhone() {
  state.phone.open = false;
  state.phone.dragging = false;

  elements.phoneView?.classList.remove("is-open", "is-peeking", "is-dragging");
  elements.phoneView?.setAttribute("aria-hidden", "true");
  elements.phoneHandle?.setAttribute("aria-expanded", "false");
  elements.phoneSheet?.style.removeProperty("--phone-sheet-offset");
  document.body.classList.remove("is-in-private-mode");

  closePhoneApp();
  closePhoneThread();

  setWorldAvailability(true);
  unfreezeWorldStage();
  syncPresenceModes();

  if (!state.booting) {
    window.setTimeout(() => {
      elements.chatInput?.focus();
    }, 140);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getClientY(event) {
  if (event.touches?.length) return event.touches[0].clientY;
  if (event.changedTouches?.length) return event.changedTouches[0].clientY;
  return event.clientY ?? 0;
}

function beginPhoneDrag(event) {
  // Prevent swipe-up open; allow drag gestures only when phone is already open.
  if (!state.phone.open) return;
  state.phone.dragging = true;
  state.phone.startY = getClientY(event);
  state.phone.currentY = 0;
  elements.phoneView?.classList.add("is-dragging");
}

function updatePhoneDrag(event) {
  if (!state.phone.dragging) return;

  const currentY = getClientY(event);
  const delta = currentY - state.phone.startY;

  if (!state.phone.open) {
    const upward = clamp(-delta, 0, window.innerHeight);
    const offset = clamp(window.innerHeight - upward, 0, window.innerHeight);
    state.phone.currentY = offset;
    elements.phoneView?.classList.add("is-peeking");
    elements.phoneView?.setAttribute("aria-hidden", "false");
    elements.phoneSheet?.style.setProperty("--phone-sheet-offset", `${offset}px`);
    return;
  }

  const downward = clamp(delta, 0, window.innerHeight);
  state.phone.currentY = downward;
  elements.phoneSheet?.style.setProperty("--phone-sheet-offset", `${downward}px`);
}

function endPhoneDrag() {
  if (!state.phone.dragging) return;

  elements.phoneView?.classList.remove("is-dragging");

  const threshold = window.innerHeight * 0.22;

  if (!state.phone.open) {
    const pulledEnough = state.phone.currentY < window.innerHeight - threshold;
    if (pulledEnough) {
      openPhone();
    } else {
      elements.phoneView?.classList.remove("is-peeking");
      elements.phoneView?.setAttribute("aria-hidden", "true");
      elements.phoneSheet?.style.removeProperty("--phone-sheet-offset");
    }
  } else {
    const closedEnough = state.phone.currentY > threshold;
    if (closedEnough) {
      closePhone();
    } else {
      openPhone();
    }
  }

  state.phone.dragging = false;
  state.phone.startY = 0;
  state.phone.currentY = 0;
}

let transitionLock = false;

function withTransitionLock(callback, duration = 260) {
  if (transitionLock) return;
  transitionLock = true;
  callback?.();
  window.setTimeout(() => {
    transitionLock = false;
  }, duration);
}

function togglePhone() {
  if (state.booting) return;
  withTransitionLock(() => {
    if (state.phone.open) {
      closePhone();
      return;
    }
    openPhone();
  });
}

function openPhoneApp(appName) {
  state.phoneApp = appName;

  elements.phoneHome?.setAttribute("hidden", "");
  elements.phoneAppLayer?.removeAttribute("hidden");

  if (appName === "messages") {
    elements.phoneMessagesApp?.removeAttribute("hidden");
    elements.phoneMessagesThread?.classList.add("hidden");
    if (elements.phoneMessagesList) {
      elements.phoneMessagesList.style.display = "";
    }
    renderPhoneThreads();
  }

  if (appName === "gallery") {
    elements.phoneGalleryApp?.removeAttribute("hidden");
    renderPhoneGallery();
  }

  if (appName === "snap") {
    elements.phoneSnapApp?.removeAttribute("hidden");
    resetSnapApp();
  }

  if (appName === "cast") {
    elements.phoneCastApp?.removeAttribute("hidden");
    renderCastList();
  }

  syncPresenceModes();
}

function closePhoneApp() {
  state.phoneApp = null;

  elements.phoneAppLayer?.setAttribute("hidden", "");
  elements.phoneMessagesApp?.setAttribute("hidden", "");
  elements.phoneGalleryApp?.setAttribute("hidden", "");
  elements.phoneSnapApp?.setAttribute("hidden", "");
  elements.phoneCastApp?.setAttribute("hidden", "");
  elements.phoneHome?.removeAttribute("hidden");
  syncPresenceModes();
}

function resetSnapApp() {
  elements.phoneSnapIdle?.classList.remove("hidden");
  elements.phoneSnapSpinner?.classList.add("hidden");
  elements.phoneSnapResult?.classList.add("hidden");
  if (elements.phoneSnapResult) elements.phoneSnapResult.src = "";
  elements.phoneSnapSaveBtn?.classList.add("hidden");
  elements.phoneSnapRetakeBtn?.classList.add("hidden");
  elements.phoneSnapShutterBtn?.classList.remove("is-loading");
}

async function renderPhoneGallery() {
  const grid = elements.phoneGalleryGrid;
  if (!grid) return;

  grid.innerHTML = `<div class="phone-gallery__loading">Loading…</div>`;

  try {
    const res = await fetch("/api/camera/list");
    const data = await res.json();
    const shots = data.shots || [];

    if (!shots.length) {
      grid.innerHTML = `<div class="phone-gallery__empty">No photos yet.<br>Tap the camera button to capture a scene.</div>`;
      return;
    }

    grid.innerHTML = shots.map((s) => `
      <div class="phone-gallery__item" data-src="${escapeHtml(s.path)}">
        <img src="${escapeHtml(s.path)}" alt="" loading="lazy" />
      </div>
    `).join("");

    grid.querySelectorAll(".phone-gallery__item").forEach((item) => {
      item.addEventListener("click", () => {
        if (elements.phoneGalleryLightboxImg) elements.phoneGalleryLightboxImg.src = item.dataset.src;
        elements.phoneGalleryLightbox?.classList.remove("hidden");
      });
    });
  } catch {
    grid.innerHTML = `<div class="phone-gallery__empty">Could not load photos.</div>`;
  }
}

function closePhoneThread() {
  state.messagesApp.activeThread = null;
  elements.phoneMessagesThread?.classList.add("hidden");
  if (elements.phoneMessagesList) {
    elements.phoneMessagesList.style.display = "";
  }
  renderPhoneThreads();
}

const THREAD_AVATAR_COLORS = {
  c1: { bg: "#2e1f4a", fg: "#c9a7ff" },
  c2: { bg: "#162038", fg: "#8eaef9" },
  c3: { bg: "#3a2210", fg: "#d7a65f" },
  c4: { bg: "#0b2e2a", fg: "#6be8b8" },
};

function renderPhoneThreads() {
  if (!elements.phoneMessagesList) return;

  elements.phoneMessagesList.innerHTML = state.messagesApp.threads
    .filter(isVisibleCharacter)
    .map((thread) => {
      const threadMessages = state.messagesApp.messages[thread.id] || [];
      const lastMessage = threadMessages[threadMessages.length - 1] || null;
      const previewText = lastMessage?.text || thread.preview || "";
      const timeLabel = lastMessage?.timestamp ? formatPhoneThreadTime(lastMessage.timestamp) : "";
      const colors = THREAD_AVATAR_COLORS[thread.id] || { bg: "#2a2a32", fg: "#ccc" };
      const initial = (thread.displayName || thread.name || "?")[0].toUpperCase();

      return `
      <button
        class="phone-thread ${thread.unread ? "is-unread" : ""}"
        type="button"
        data-thread="${escapeHtml(thread.id)}"
      >
        <div class="phone-thread__avatar" style="--avatar-bg:${colors.bg};--avatar-fg:${colors.fg}">${initial}</div>
        <div class="phone-thread__body">
          <div class="phone-thread__top">
            <span class="phone-thread__name">${escapeHtml(thread.displayName || thread.name)}</span>
            <span class="phone-thread__time">${escapeHtml(timeLabel)}</span>
          </div>
          <div class="phone-thread__bottom">
            <span class="phone-thread__preview">${escapeHtml(previewText)}</span>
            ${thread.unread ? '<div class="phone-thread__dot"></div>' : ""}
          </div>
        </div>
      </button>
    `;
    })
    .join("");
}

function renderPhoneThreadMessages() {
  const id = state.messagesApp.activeThread;
  const msgs = state.messagesApp.messages[id] || [];

  if (!elements.phoneMessagesLog) return;

  const rows = [];

  msgs.forEach((message, index) => {
    const previous = msgs[index - 1];
    const sameSide = previous && previous.me === message.me;
    const dayLabel = formatPhoneThreadDate(message.timestamp);
    const previousDayLabel = previous ? formatPhoneThreadDate(previous.timestamp) : null;

    if (!previous || dayLabel !== previousDayLabel) {
      rows.push(`<div class="phone-msg-date">${escapeHtml(dayLabel)}</div>`);
    }

    rows.push(`
      <div class="phone-msg-row ${message.me ? "phone-msg-row--me" : "phone-msg-row--them"} ${sameSide ? "is-stacked" : ""} ${message.animate ? "is-new" : ""}">
        <div class="phone-msg-bubble ${message.me ? "phone-msg-me" : "phone-msg-them"}">
          ${escapeHtml(message.text)}
        </div>
        <div class="phone-msg-meta">${escapeHtml(formatPhoneThreadTime(message.timestamp))}</div>
      </div>
    `);
  });

  elements.phoneMessagesLog.innerHTML = rows.join("");

  for (const message of msgs) {
    if (message?.animate) message.animate = false;
  }

  requestAnimationFrame(() => {
    elements.phoneMessagesLog.scrollTop = elements.phoneMessagesLog.scrollHeight;
  });
}

function openPhoneThread(id) {
  const thread = getThreadById(id);
  if (!thread) return;

  state.messagesApp.activeThread = id;
  thread.unread = false;

  if (elements.phoneMessagesTitle) {
    elements.phoneMessagesTitle.textContent = thread.displayName || thread.name;
  }

  // Update thread avatar colors in topbar
  const threadAvatar = document.querySelector(".phone-thread-avatar");
  if (threadAvatar) {
    const colors = THREAD_AVATAR_COLORS[id] || { bg: "#2a2a32", fg: "#ccc" };
    const initial = (thread.displayName || thread.name || "?")[0].toUpperCase();
    threadAvatar.style.setProperty("--avatar-bg", colors.bg);
    threadAvatar.style.setProperty("--avatar-fg", colors.fg);
    threadAvatar.textContent = initial;
  }

  if (elements.phoneMessagesList) {
    elements.phoneMessagesList.style.display = "none";
  }
  elements.phoneMessagesThread?.classList.remove("hidden");

  renderPhoneThreadMessages();

  requestAnimationFrame(() => {
    elements.phoneMessagesInput?.blur();
  });
}

async function sendPhoneThreadMessage() {
  const text = elements.phoneMessagesInput?.value.trim();
  if (!text) return;

  const id = state.messagesApp.activeThread;
  if (!id) return;

  state.messagesApp.messages[id].push({
    text,
    me: true,
    timestamp: new Date().toISOString(),
    animate: true,
  });

  updateThreadPreview(id, `You: ${text}`);
  if (elements.phoneMessagesInput) {
    elements.phoneMessagesInput.value = "";
  }
  renderPhoneThreadMessages();
  renderPhoneThreads();
  saveLocalState();
  await simulatePhoneThreadResponse(id, text);

  requestAnimationFrame(() => {
    elements.phoneMessagesInput?.focus();
  });
}

function showPhoneTyping() {
  if (!elements.phoneMessagesLog) return;
  hidePhoneTyping();
  const el = document.createElement("div");
  el.id = "phoneTypingBubble";
  el.className = "phone-msg-row phone-msg-row--them";
  el.innerHTML = `<div class="phone-msg-bubble phone-msg-them typing-bubble"><div class="typing-bubble__dots"><span></span><span></span><span></span></div></div>`;
  elements.phoneMessagesLog.appendChild(el);
  elements.phoneMessagesLog.scrollTop = elements.phoneMessagesLog.scrollHeight;
}

function hidePhoneTyping() {
  document.getElementById("phoneTypingBubble")?.remove();
}

async function simulatePhoneThreadResponse(id, text) {
  showPhoneTyping();

  try {
    const char = CHARACTERS[id];
    if (!char) {
      hidePhoneTyping();
      return;
    }

    const startedAt = performance.now();
    const response = await fetch(`/api/characters/${char.key}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = { ok: false, error: "Invalid JSON from server" };
    }

    if (window.__AIRA_DEV_MODE__) {
      const tookMs = Math.round(performance.now() - startedAt);
      const debugText = `[DEV phone] ${response.status} ${response.statusText || ""} (${tookMs}ms)`;
      state.messagesApp.messages[id].push({
        text: debugText.trim(),
        me: false,
        timestamp: new Date().toISOString(),
        animate: true,
      });
    }

    hidePhoneTyping();

    if (!payload?.ok) {
      const errorText = payload?.error || "Ingen svar akkurat na. Proev igjen.";
      state.messagesApp.messages[id].push({
        text: errorText,
        me: false,
        timestamp: new Date().toISOString(),
        animate: true,
      });
      updateThreadPreview(id, errorText);
      renderPhoneThreadMessages();
      renderPhoneThreads();
      saveLocalState();
      return;
    }

    state.messagesApp.messages[id].push({
      text: payload.reply || "...",
      me: false,
      timestamp: new Date().toISOString(),
      animate: true,
    });

    speakText(payload.reply || "", char.name || "");

    updateThreadPreview(id, payload.reply || "...");
    playMessageTone("incoming");
    renderPhoneThreadMessages();
    renderPhoneThreads();
    saveLocalState();
  } catch (err) {
    hidePhoneTyping();
    console.warn("Phone thread response failed", err);
    if (window.__AIRA_DEV_MODE__) {
      const debugText = `[DEV phone] network error: ${err?.message || "unknown"}`;
      state.messagesApp.messages[id].push({
        text: debugText,
        me: false,
        timestamp: new Date().toISOString(),
        animate: true,
      });
    }
    const fallbackText = "Ingen svar akkurat na. Proev igjen om et oyeblikk.";
    state.messagesApp.messages[id].push({
      text: fallbackText,
      me: false,
      timestamp: new Date().toISOString(),
      animate: true,
    });
    updateThreadPreview(id, fallbackText);
    renderPhoneThreadMessages();
    renderPhoneThreads();
    saveLocalState();
  }
}

function showHome() {
  closePhone();
}

function showChat() {
  closePhone();
  state.currentView = "chat";
  syncBodyMode();
  requestAnimationFrame(() => {
    elements.chatInput?.focus();
    scrollMessagesToBottom();
  });
}

function getThreadById(id) {
  return state.messagesApp.threads.find((thread) => thread.id === id) || null;
}

function updateThreadPreview(id, previewText) {
  const thread = getThreadById(id);
  if (!thread) return;
  thread.preview = previewText;
}

// ─── Cast App ─────────────────────────────────────────────────────────────────

const CORE_CHARACTERS = ['lucy', 'sam', 'angie']; // Aira is not visible

let castMutedSet = new Set();

async function fetchMuted() {
  try {
    const res = await fetch('/api/ai/state');
    const data = await res.json();
    const muted = data?.state?.mutedAgents || data?.state?.muted || [];
    castMutedSet = new Set(muted.map(n => n.toLowerCase()));
  } catch { castMutedSet = new Set(); }
}

async function renderCastList() {
  const list = elements.phoneCastList;
  if (!list) return;
  list.innerHTML = '<div class="phone-cast-section-label">Loading…</div>';

  await fetchMuted();

  let characters = [];
  try {
    const res = await fetch('/api/characters');
    const data = await res.json();
    characters = data.characters || [];
  } catch { list.innerHTML = '<div class="phone-cast-section-label">Error loading characters</div>'; return; }

  if (!characters.length) {
    list.innerHTML = '<div class="phone-cast-section-label">No characters found</div>';
    return;
  }

  list.innerHTML = '';

  for (const char of characters) {
    if (!isVisibleCharacter(char)) continue;
    const isCore = CORE_CHARACTERS.includes(char.id);
    const isMuted = castMutedSet.has((char.name || char.id).toLowerCase());
    const initial = (char.name || '?')[0].toUpperCase();
    const color = char.color || '#6b7280';
    const threadId = char.id;

    const card = document.createElement('div');
    card.className = 'phone-cast-card';
    card.innerHTML = `
      <div class="phone-cast-card__avatar" style="background:${escapeHtml(color)}">${escapeHtml(initial)}</div>
      <div class="phone-cast-card__info">
        <div class="phone-cast-card__name">${escapeHtml(char.name || char.id)}</div>
        <div class="phone-cast-card__bio">${escapeHtml(char.bio || char.personality || '')}</div>
      </div>
      <div class="phone-cast-card__actions">
        <div>
          <button class="phone-cast-toggle${isMuted ? '' : ' is-active'}" data-char-name="${escapeHtml(char.name || char.id)}" title="${isMuted ? 'Off in world chat' : 'Active in world chat'}"></button>
          <span class="phone-cast-toggle__label">World</span>
        </div>
        <button class="phone-cast-msg-btn" data-thread-id="${escapeHtml(threadId)}">DM</button>
        ${!isCore ? `<button class="phone-cast-del-btn" data-char-id="${escapeHtml(char.id)}" title="Delete">×</button>` : ''}
      </div>
    `;

    // World chat toggle
    const toggle = card.querySelector('.phone-cast-toggle');
    toggle?.addEventListener('click', async () => {
      const name = toggle.dataset.charName;
      const willMute = toggle.classList.contains('is-active');
      toggle.classList.toggle('is-active', !willMute);
      toggle.title = willMute ? 'Off in world chat' : 'Active in world chat';
      try {
        await fetch('/api/ai/mute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, muted: willMute }),
        });
      } catch { /* non-blocking */ }
    });

    // DM button → open Messenger thread or add one
    const dmBtn = card.querySelector('.phone-cast-msg-btn');
    dmBtn?.addEventListener('click', () => {
      let thread = state.messagesApp.threads.find(t => t.id === threadId);
      if (!thread) {
        // Add thread dynamically
        thread = { id: threadId, name: char.name, displayName: char.name, preview: '', unread: false };
        state.messagesApp.threads.push(thread);
        if (!state.messagesApp.messages[threadId]) {
          state.messagesApp.messages[threadId] = [];
        }
      }
      // Close cast, open messages, open thread
      elements.phoneCastApp?.setAttribute('hidden', '');
      elements.phoneMessagesApp?.removeAttribute('hidden');
      elements.phoneAppLayer?.removeAttribute('hidden');
      state.phoneApp = 'messages';
      openPhoneThread(threadId);
    });

    // Delete button
    const delBtn = card.querySelector('.phone-cast-del-btn');
    delBtn?.addEventListener('click', async () => {
      if (!confirm(`Delete ${char.name}?`)) return;
      try {
        await fetch(`/api/characters/${char.id}`, { method: 'DELETE' });
        card.remove();
        // Remove from messenger threads if present
        state.messagesApp.threads = state.messagesApp.threads.filter(t => t.id !== threadId);
      } catch (err) { alert('Delete failed: ' + err.message); }
    });

    list.appendChild(card);
  }
}

function openCastCreator() {
  elements.phoneCastCreator?.classList.remove('hidden');
  document.getElementById('castFieldName')?.focus();
}

function closeCastCreator() {
  elements.phoneCastCreator?.classList.add('hidden');
  elements.phoneCastCreatorForm?.reset();
}

async function submitCastCreator(e) {
  e.preventDefault();
  const name = document.getElementById('castFieldName')?.value.trim();
  const bio = document.getElementById('castFieldBio')?.value.trim();
  const personality = document.getElementById('castFieldPersonality')?.value.trim();
  const system_prompt = document.getElementById('castFieldPrompt')?.value.trim();
  const color = document.getElementById('castFieldColor')?.value || '#6b7280';

  if (!name) return;

  const saveBtn = document.getElementById('phoneCastSaveBtn');
  if (saveBtn) { saveBtn.textContent = 'Creating…'; saveBtn.disabled = true; }

  try {
    const res = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, bio, personality, system_prompt, color }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Failed');

    closeCastCreator();
    renderCastList();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    if (saveBtn) { saveBtn.textContent = 'Create Character'; saveBtn.disabled = false; }
  }
}

// Wire up Cast app buttons
elements.phoneCastBackBtn?.addEventListener('click', () => {
  closeCastCreator();
  closePhoneApp();
});

elements.phoneCastNewBtn?.addEventListener('click', openCastCreator);
elements.phoneCastCreatorClose?.addEventListener('click', closeCastCreator);
elements.phoneCastCreatorForm?.addEventListener('submit', submitCastCreator);

// ─── Web App Shell — View Switching ──────────────────────────────────────────



// ─── Lab View ─────────────────────────────────────────────────────────────────

let labSelectedId = null;
let labMutedSet = new Set();
let labCharacters = [];

async function renderLabView() {
  const list = document.getElementById('labCharList');
  if (!list) return;
  list.innerHTML = '<div style="padding:20px;color:rgba(255,255,255,0.3);font-size:.85rem;">Loading…</div>';

  try {
    const [charsRes, stateRes] = await Promise.all([
      fetch('/api/characters'),
      fetch('/api/ai/state'),
    ]);
    const charsData = await charsRes.json();
    const stateData = await stateRes.json();
    labCharacters = charsData.characters || [];
    const muted = stateData?.state?.mutedAgents || stateData?.state?.muted || [];
    labMutedSet = new Set(muted.map(n => n.toLowerCase()));
  } catch {
    list.innerHTML = '<div style="padding:20px;color:rgba(255,80,80,0.7);font-size:.85rem;">Failed to load</div>';
    return;
  }

  list.innerHTML = '';
  for (const char of labCharacters) {
    if (!isVisibleCharacter(char)) continue;
    const isMuted = labMutedSet.has((char.name || '').toLowerCase());
    const initial = (char.name || '?')[0].toUpperCase();
    const item = document.createElement('div');
    item.className = 'lab-char-item' + (char.id === labSelectedId ? ' is-selected' : '');
    item.dataset.charId = char.id;
    item.innerHTML = `
      <div class="lab-char-avatar" style="background:${escapeHtml(char.color || '#6b7280')}">${escapeHtml(initial)}</div>
      <div class="lab-char-info">
        <div class="lab-char-name">${escapeHtml(char.name || char.id)}</div>
        <div class="lab-char-bio">${escapeHtml(char.bio || char.personality || '')}</div>
      </div>
      <span class="lab-char-badge${isMuted ? ' is-muted' : ''}">${isMuted ? 'Off' : 'Live'}</span>
    `;
    item.addEventListener('click', () => openLabPanel(char.id));
    list.appendChild(item);
  }
}

function openLabPanel(charId) {
  const char = labCharacters.find(c => c.id === charId);
  if (!char) return;
  labSelectedId = charId;

  // Highlight selected
  document.querySelectorAll('.lab-char-item').forEach(el => {
    el.classList.toggle('is-selected', el.dataset.charId === charId);
  });

  const panel = document.getElementById('labPanel');
  if (panel) panel.removeAttribute('hidden');

  document.getElementById('labPanelTitle').textContent = char.name || char.id;
  document.getElementById('labFieldName').value = char.name || '';
  document.getElementById('labFieldBio').value = char.bio || '';
  document.getElementById('labFieldPersonality').value = char.personality || '';
  document.getElementById('labFieldPrompt').value = char.system_prompt || '';
  document.getElementById('labFieldColor').value = char.color || '#6b7280';

  const isMuted = labMutedSet.has((char.name || '').toLowerCase());
  const toggle = document.getElementById('labWorldToggle');
  if (toggle) {
    toggle.textContent = isMuted ? 'Muted' : 'Active';
    toggle.classList.toggle('is-muted', isMuted);
    toggle.dataset.charName = char.name || char.id;
    toggle.dataset.muted = isMuted ? '1' : '';
  }

  // Populate visual profile fields
  const v = char.visual || {};
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  setVal('labVisualAvatarImage',    v.avatarImage    || '');
  setVal('labVisualModelName',      v.modelName      || '');
  setVal('labVisualModelVersion',   v.modelVersion   || '');
  setVal('labVisualLoraStack',      v.loraStack      || '');
  setVal('labVisualPositivePrompt', v.positivePrompt || '');
  setVal('labVisualNegativePrompt', v.negativePrompt || '');
  setVal('labVisualSeed',           v.seed != null ? v.seed : '');
  setVal('labVisualSteps',          v.steps != null ? v.steps : '');
  setVal('labVisualCfg',            v.cfg != null ? v.cfg : '');
  setVal('labVisualAspect',         v.preferredAspect || '');
  setVal('labVisualAssetSource',    v.assetSource    || '');
  setVal('labVisualAssetCreator',   v.assetCreator   || '');
  setVal('labVisualAssetPage',      v.assetPage      || '');
  setVal('labVisualLicenseType',    v.licenseType    || '');
  setVal('labVisualNotes',          v.notes          || '');
  const commBtn = document.getElementById('labVisualCommercial');
  if (commBtn) {
    const allowed = Boolean(v.commercialUseAllowed);
    commBtn.dataset.value = allowed ? 'true' : 'false';
    commBtn.textContent = allowed ? 'Yes' : 'No';
    commBtn.classList.toggle('is-muted', !allowed);
  }

  // Reset tabs to profile
  document.querySelectorAll('.lab-tab').forEach(t => t.classList.toggle('is-active', t.dataset.labTab === 'profile'));
  document.getElementById('labTabProfile')?.removeAttribute('hidden');
  document.getElementById('labTabVisual')?.setAttribute('hidden', '');
  document.getElementById('labTabSandbox')?.setAttribute('hidden', '');

  // Clear sandbox log
  const log = document.getElementById('labSandboxLog');
  if (log) log.innerHTML = `<div class="lab-sandbox-msg lab-sandbox-msg--system">Chat with ${escapeHtml(char.name)} — isolated test session</div>`;
}

// Panel tab switching
document.querySelectorAll('.lab-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lab-tab').forEach(t => t.classList.remove('is-active'));
    btn.classList.add('is-active');
    const tab = btn.dataset.labTab;
    document.getElementById('labTabProfile')?.toggleAttribute('hidden', tab !== 'profile');
    document.getElementById('labTabVisual')?.toggleAttribute('hidden', tab !== 'visual');
    document.getElementById('labTabSandbox')?.toggleAttribute('hidden', tab !== 'sandbox');
  });
});

// Close panel
document.getElementById('labPanelClose')?.addEventListener('click', () => {
  document.getElementById('labPanel')?.setAttribute('hidden', '');
  labSelectedId = null;
  document.querySelectorAll('.lab-char-item').forEach(el => el.classList.remove('is-selected'));
});

// World chat toggle
document.getElementById('labWorldToggle')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const name = btn.dataset.charName;
  const willMute = !btn.dataset.muted;
  btn.dataset.muted = willMute ? '1' : '';
  btn.textContent = willMute ? 'Muted' : 'Active';
  btn.classList.toggle('is-muted', willMute);
  // Update badge in list
  const badge = document.querySelector(`.lab-char-item[data-char-id="${labSelectedId}"] .lab-char-badge`);
  if (badge) { badge.textContent = willMute ? 'Off' : 'Live'; badge.classList.toggle('is-muted', willMute); }
  try {
    await fetch('/api/ai/mute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, muted: willMute }),
    });
  } catch { /* non-blocking */ }
});

// Save character edits
document.getElementById('labEditForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!labSelectedId) return;
  const saveBtn = document.getElementById('labSaveBtn');
  if (saveBtn) { saveBtn.textContent = 'Saving…'; saveBtn.disabled = true; }
  try {
    const body = {
      name: document.getElementById('labFieldName')?.value.trim(),
      bio: document.getElementById('labFieldBio')?.value.trim(),
      personality: document.getElementById('labFieldPersonality')?.value.trim(),
      system_prompt: document.getElementById('labFieldPrompt')?.value.trim(),
      color: document.getElementById('labFieldColor')?.value,
    };
    const res = await fetch(`/api/characters/${labSelectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    // Refresh list
    renderLabView();
    if (saveBtn) saveBtn.textContent = 'Saved ✓';
    setTimeout(() => { if (saveBtn) saveBtn.textContent = 'Save'; }, 1800);
  } catch (err) {
    alert('Save failed: ' + err.message);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
});

// Open DM from lab
document.getElementById('labOpenDmBtn')?.addEventListener('click', () => {
  if (!labSelectedId) return;
  switchView('dm');
  setTimeout(() => openDmThread(labSelectedId), 80);
});

// Commercial use toggle in visual tab
document.getElementById('labVisualCommercial')?.addEventListener('click', (e) => {
  const btn = e.currentTarget;
  const current = btn.dataset.value === 'true';
  const next = !current;
  btn.dataset.value = next ? 'true' : 'false';
  btn.textContent = next ? 'Yes' : 'No';
  btn.classList.toggle('is-muted', !next);
});

// Save visual profile
document.getElementById('labVisualSaveBtn')?.addEventListener('click', async () => {
  if (!labSelectedId) return;
  const saveBtn = document.getElementById('labVisualSaveBtn');
  if (saveBtn) { saveBtn.textContent = 'Saving…'; saveBtn.disabled = true; }
  try {
    const numOrNull = (id) => {
      const v = document.getElementById(id)?.value.trim();
      return v !== '' && v != null ? Number(v) : null;
    };
    const visual = {
      avatarImage:         document.getElementById('labVisualAvatarImage')?.value.trim() || null,
      modelName:           document.getElementById('labVisualModelName')?.value.trim() || null,
      modelVersion:        document.getElementById('labVisualModelVersion')?.value.trim() || null,
      loraStack:           document.getElementById('labVisualLoraStack')?.value.trim() || null,
      positivePrompt:      document.getElementById('labVisualPositivePrompt')?.value.trim() || null,
      negativePrompt:      document.getElementById('labVisualNegativePrompt')?.value.trim() || null,
      seed:                numOrNull('labVisualSeed'),
      steps:               numOrNull('labVisualSteps'),
      cfg:                 numOrNull('labVisualCfg'),
      preferredAspect:     document.getElementById('labVisualAspect')?.value || null,
      assetSource:         document.getElementById('labVisualAssetSource')?.value.trim() || null,
      assetCreator:        document.getElementById('labVisualAssetCreator')?.value.trim() || null,
      assetPage:           document.getElementById('labVisualAssetPage')?.value.trim() || null,
      licenseType:         document.getElementById('labVisualLicenseType')?.value.trim() || null,
      commercialUseAllowed: document.getElementById('labVisualCommercial')?.dataset.value === 'true',
      notes:               document.getElementById('labVisualNotes')?.value.trim() || null,
    };
    const res = await fetch(`/api/characters/${labSelectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visual }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    // Update local cache
    const idx = labCharacters.findIndex(c => c.id === labSelectedId);
    if (idx >= 0) labCharacters[idx] = { ...labCharacters[idx], visual };
    if (saveBtn) saveBtn.textContent = 'Saved ✓';
    setTimeout(() => { if (saveBtn) saveBtn.textContent = 'Save Visual'; }, 1800);
  } catch (err) {
    alert('Save failed: ' + err.message);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
});

// New character
document.getElementById('labNewCharBtn')?.addEventListener('click', () => {
  document.getElementById('labCreator')?.classList.remove('hidden');
  document.getElementById('labNewName')?.focus();
});

document.getElementById('labCreatorClose')?.addEventListener('click', () => {
  document.getElementById('labCreator')?.classList.add('hidden');
  document.getElementById('labCreatorForm')?.reset();
});

document.getElementById('labCreatorForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  if (btn) { btn.textContent = 'Creating…'; btn.disabled = true; }
  try {
    const body = {
      name: document.getElementById('labNewName')?.value.trim(),
      bio: document.getElementById('labNewBio')?.value.trim(),
      personality: document.getElementById('labNewPersonality')?.value.trim(),
      system_prompt: document.getElementById('labNewPrompt')?.value.trim(),
      color: document.getElementById('labNewColor')?.value,
    };
    const res = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    document.getElementById('labCreator')?.classList.add('hidden');
    document.getElementById('labCreatorForm')?.reset();
    renderLabView();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    if (btn) { btn.textContent = 'Create Character'; btn.disabled = false; }
  }
});

// Sandbox test chat
let sandboxHistory = {};

document.getElementById('labSandboxForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('labSandboxInput');
  const text = input?.value.trim();
  if (!text || !labSelectedId) return;
  input.value = '';

  const log = document.getElementById('labSandboxLog');
  const addMsg = (content, side) => {
    const el = document.createElement('div');
    el.className = `lab-sandbox-msg lab-sandbox-msg--${side}`;
    el.textContent = content;
    log?.appendChild(el);
    log?.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  };

  addMsg(text, 'me');

  const typing = document.createElement('div');
  typing.className = 'lab-sandbox-msg lab-sandbox-msg--them';
  typing.textContent = '…';
  log?.appendChild(typing);
  log?.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });

  try {
    const res = await fetch(`/api/characters/${labSelectedId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    typing.remove();
    addMsg(data.reply || '…', 'them');
  } catch {
    typing.remove();
    addMsg('(failed to respond)', 'system');
  }
});

document.getElementById('labSandboxReset')?.addEventListener('click', () => {
  const log = document.getElementById('labSandboxLog');
  const char = labCharacters.find(c => c.id === labSelectedId);
  if (log) log.innerHTML = `<div class="lab-sandbox-msg lab-sandbox-msg--system">Chat with ${escapeHtml(char?.name || '')} — isolated test session</div>`;
});

// ─── DM View ──────────────────────────────────────────────────────────────────

const DM_AVATAR_COLORS = {
  lucy:  { bg: '#2e1f4a', fg: '#c9a7ff' },
  sam:   { bg: '#162038', fg: '#8eaef9' },
  angie: { bg: '#3a2210', fg: '#d7a65f' },
  // aira:  { bg: '#0b2e2a', fg: '#6be8b8' },
};

let dmActiveThread = null;
let dmMessages = {};

// Premium Inbox/DM thread list for Lucy, Sam, Angie, Hazel, Nina
async function renderDmView() {
  const inner = document.getElementById('dmThreadListInner');
  if (!inner) return;

  // Static character list for now (can be dynamic later)
  const characters = [
    { id: 'lucy', name: 'Lucy', color: '#bfa3e3', bio: 'Lucy: clever, direct, warm.' },
    { id: 'sam', name: 'Sam', color: '#a3cbe3', bio: 'Sam: playful, honest, sharp.' },
    { id: 'angie', name: 'Angie', color: '#e3bfa3', bio: 'Angie: bold, loyal, funny.' },
    { id: 'hazel', name: 'Hazel', color: '#e3a3b7', bio: 'Hazel: mysterious, gentle, deep.' },
    { id: 'nina', name: 'Nina', color: '#a3e3b7', bio: 'Nina: nostalgic, sweet, surprising.' }
  ];

  inner.innerHTML = '';
  for (const char of characters) {
    const id = char.id;
    if (!dmMessages[id]) dmMessages[id] = [];
    const msgs = dmMessages[id];
    const last = msgs[msgs.length - 1];
    const colors = { bg: char.color, fg: '#fff' };
    const initial = (char.name || '?')[0].toUpperCase();
    const preview = last?.text || char.bio || '';
    const timeStr = last ? formatPhoneThreadTime(last.timestamp) : '';

    const item = document.createElement('div');
    item.className = 'dm-thread-item';
    item.dataset.charId = id;
    item.innerHTML = `
      <div class="dm-thread-item__avatar" style="background:${escapeHtml(colors.bg)};color:${escapeHtml(colors.fg)}">${escapeHtml(initial)}</div>
      <div class="dm-thread-item__body">
        <div class="dm-thread-item__top">
          <span class="dm-thread-item__name">${escapeHtml(char.name || id)}</span>
          <span class="dm-thread-item__time">${escapeHtml(timeStr)}</span>
        </div>
        <div class="dm-thread-item__preview">${escapeHtml(preview)}</div>
      </div>
    `;
    item.addEventListener('click', () => openDmThread(id, char));
    inner.appendChild(item);
  }
}

async function openDmThread(charId, charData) {
  let char = charData;
  if (!char) {
    try {
      const res = await fetch('/api/characters');
      const data = await res.json();
      char = (data.characters || []).find(c => c.id === charId);
    } catch { return; }
  }
  if (!char) return;

  dmActiveThread = charId;
  if (!dmMessages[charId]) dmMessages[charId] = [];

  const threadList = document.getElementById('dmThreadList');
  const thread = document.getElementById('dmThread');
  if (threadList) threadList.style.display = 'none';
  if (thread) thread.removeAttribute('hidden');

  const colors = DM_AVATAR_COLORS[charId] || { bg: char.color || '#6b7280', fg: '#fff' };
  const initial = (char.name || '?')[0].toUpperCase();
  const avatar = document.getElementById('dmThreadAvatar');
  const name = document.getElementById('dmThreadName');
  if (avatar) { avatar.textContent = initial; avatar.style.background = colors.bg; avatar.style.color = colors.fg; }
  if (name) name.textContent = char.name || charId;

  renderDmLog();
  document.getElementById('dmInput')?.focus();
}

function renderDmLog() {
  const log = document.getElementById('dmLog');
  if (!log || !dmActiveThread) return;
  const msgs = dmMessages[dmActiveThread] || [];
  log.innerHTML = '';
  for (const msg of msgs) {
    const row = document.createElement('div');
    row.className = `dm-msg-row dm-msg-row--${msg.me ? 'me' : 'them'}`;
    row.innerHTML = `
      <div class="dm-bubble dm-bubble--${msg.me ? 'me' : 'them'}">${escapeHtml(msg.text)}</div>
      <div class="dm-msg-time">${escapeHtml(formatPhoneThreadTime(msg.timestamp))}</div>
    `;
    log.appendChild(row);
  }
  log.scrollTop = log.scrollHeight;
}

document.getElementById('dmBackBtn')?.addEventListener('click', () => {
  dmActiveThread = null;
  const threadList = document.getElementById('dmThreadList');
  const thread = document.getElementById('dmThread');
  if (threadList) threadList.style.display = '';
  if (thread) thread.setAttribute('hidden', '');
  renderDmView();
});

document.getElementById('dmForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('dmInput');
  const text = input?.value.trim();
  if (!text || !dmActiveThread) return;
  input.value = '';

  dmMessages[dmActiveThread].push({ text, me: true, timestamp: new Date().toISOString() });
  renderDmLog();

  // Typing indicator
  const log = document.getElementById('dmLog');
  const typing = document.createElement('div');
  typing.className = 'dm-msg-row dm-msg-row--them';
  typing.id = 'dmTyping';
  typing.innerHTML = `<div class="dm-typing"><span></span><span></span><span></span></div>`;
  log?.appendChild(typing);
  log && (log.scrollTop = log.scrollHeight);

  try {
    const res = await fetch(`/api/characters/${dmActiveThread}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    document.getElementById('dmTyping')?.remove();
    if (data.ok && data.reply) {
      dmMessages[dmActiveThread].push({ text: data.reply, me: false, timestamp: new Date().toISOString() });
      renderDmLog();
    }
  } catch {
    document.getElementById('dmTyping')?.remove();
  }
});

// ─────────────────────────────────────────────────────────────────────────────

function syncTypingState() {
  const hasText = elements.chatInput.value.trim().length > 0;
  elements.composer.classList.toggle("is-typing", hasText);
}

function autoResizeTextarea() {
  const input = elements.chatInput;
  if (!input) return;
  input.style.height = "0px";
  input.style.height = `${Math.max(60, Math.min(input.scrollHeight, 180))}px`;
  syncTypingState();
  syncComposerClearance();
}

function syncComposerClearance() {
  if (!elements.composer) return;
  const rect = elements.composer.getBoundingClientRect();
  const clearance = Math.max(94, Math.ceil(rect.height + 12));
  document.documentElement.style.setProperty("--composer-clearance", `${clearance}px`);
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

// Wraps *action text* in styled <em> — safe, escapes content first
function formatWithActions(text) {
  return escapeHtml(text).replace(
    /\*([^*]+)\*/g,
    (_, inner) => `<em class="message__thought">${inner}</em>`
  );
}

function characterNameClass(nameOrId) {
  const char = CHARACTERS[nameOrId] || getCharacterByKey(nameOrId);
  if (char) return `message__name--${char.name}`;
  return "";
}

function createMessageClasses(message) {
  const classes = ["message"];
  if (message.anomalous) classes.push("is-anomalous");
  if (message.bubbleClass) classes.push(message.bubbleClass);
  return classes.join(" ");
}

function scrollMessagesToBottom() {
  requestAnimationFrame(() => {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  });
}

function renderQuickPrompts() {
  const host = elements.quickPromptBar;
  if (!host) return;

  host.innerHTML = QUICK_PROMPTS.map((prompt) => `
    <button
      class="quick-prompt-chip"
      type="button"
      data-quick-prompt="${escapeHtml(prompt)}"
      aria-label="Send quick prompt"
      title="${escapeHtml(prompt)}"
    >${escapeHtml(prompt)}</button>
  `).join("");

  host.querySelectorAll("[data-quick-prompt]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (state.isSending || state.booting) return;
      const prompt = String(button.getAttribute("data-quick-prompt") || "").trim();
      if (!prompt) return;

      if (elements.chatInput) {
        elements.chatInput.value = "";
      }
      autoResizeTextarea();
      await sendMessage(prompt);
    });
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
              <div class="message__bubble${message.bubbleClass ? ` ${escapeHtml(message.bubbleClass)}` : ""}">${formatWithActions(message.text)}</div>
              <div class="message__meta">${escapeHtml(message.time)}</div>
            </article>
          </div>
        `;
      }

      if (message.type === "system") {
        return `
          <div class="message-row message-row--system">
            <div class="system-note${message.whisper ? " system-note--whisper" : ""}">${escapeHtml(message.text)}</div>
          </div>
        `;
      }

      if (message.type === "story_beat") {
        return `
          <div class="message-row message-row--story-beat">
            <div class="story-beat">${escapeHtml(message.text)}</div>
          </div>
        `;
      }

      const thoughtText = message.thought
        ? message.thought.replace(/^\(|\)$/g, "").trim()
        : null;
      const bubbleContent = thoughtText
        ? `<em class="message__thought">*${escapeHtml(thoughtText)}*</em> ${escapeHtml(message.text)}`
        : escapeHtml(message.text);

      return `
        <div class="message-row${message.anomalyAware ? " is-anomaly-aware" : ""}">
          <article class="${createMessageClasses(message)}">
            <div class="message__name ${characterNameClass(message.agent)}">
              ${escapeHtml(message.agent)}
            </div>
            <div class="message__bubble${message.toneClass ? ` tone-${escapeHtml(message.toneClass)}` : ""}">${bubbleContent}</div>
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
  const manifestation = state.latestState?.aira?.manifestation || "none";
  document.body.dataset.manifestation = manifestation;
  renderWorldRoomBar();
}

function renderWorldRoomBar() {
  const timeBlock    = state.latestState?.continuity?.timeBlock || "evening";
  const tension      = Number(state.latestState?.tension || 0);
  const manifestation = state.latestState?.aira?.manifestation || "none";
  const mutedAgents  = state.latestState?.mutedAgents || [];

  // Active cast = registered characters minus muted ones
  const allNames = ['Lucy', 'Sam', 'Angie'];
  const mutedSet = new Set(mutedAgents.map(n => String(n).toLowerCase()));
  const activeNames = allNames.filter(n => !mutedSet.has(n.toLowerCase()));
  const castLine = activeNames.length ? activeNames.join(' · ') : 'Empty room';

  let vibe = "Calm";
  if (tension > 0.7) vibe = "Volatile";
  else if (tension > 0.45) vibe = "Charged";
  else if (tension > 0.2) vibe = "Warm";

  const scene = capitalizeWord(timeBlock) + (manifestation !== "none" ? " · Strange" : "");

  const bar = document.getElementById('worldRoomBar');
  const prevCast = elements.worldRoomCount?.textContent || '';

  if (elements.worldRoomCount) elements.worldRoomCount.textContent = castLine;
  if (elements.worldRoomVibe)  elements.worldRoomVibe.textContent  = vibe;
  if (elements.worldRoomScene) elements.worldRoomScene.textContent = scene;

  // Flash the bar if the cast changed
  if (bar && prevCast && prevCast !== castLine) {
    bar.classList.remove('is-updating');
    void bar.offsetWidth; // force reflow
    bar.classList.add('is-updating');
    setTimeout(() => bar.classList.remove('is-updating'), 600);
  }
}

function capitalizeWord(value) {
  const text = String(value || "").trim();
  if (!text) return "Evening";
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  const gmLine    = payload?.result?.gmLine    ?? null;
  const storyBeat = payload?.result?.storyBeat ?? null;
  const time = formatTime();

  const items = [];

  // Story beat appears before character responses — sets the scene
  if (storyBeat) {
    items.push({ type: "story_beat", text: storyBeat, time });
  }

  for (const entry of responses) {
    items.push({
      type: "character",
      agent: entry.agent || "AIRA",
      text: entry.spoken || "",
      thought: entry.showThought && entry.thought ? entry.thought : null,
      anomalous: Boolean(entry.anomalous),
      toneClass: entry.meta?.toneClass || "",
      anomalyAware: Boolean(entry.meta?.anomalyAware),
      time,
    });
  }

  if (gmLine && window.__AIRA_DEV_MODE__) {
    items.push({ type: "system", text: gmLine, time });
  }

  return items;
}

// ===============================
// AIRA AUTOSAVE
// ===============================

function saveLocalState() {
  try {
    const snapshot = {
      messages: state.messages,
      messagesApp: state.messagesApp,
      latestState: state.latestState,
    };
    localStorage.setItem("aira_state", JSON.stringify(snapshot));
  } catch (e) {
    console.warn("Autosave failed", e);
  }
}

function restoreLocalState() {
  try {
    const raw = localStorage.getItem("aira_state");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.messages) state.messages = data.messages;
    if (data.latestState) state.latestState = data.latestState;

    // Always keep canonical threads from buildDefaultMessagesApp.
    // Only restore message history and preview text per thread.
    if (data.messagesApp?.messages) {
      for (const thread of state.messagesApp.threads) {
        const saved = data.messagesApp.messages[thread.id];
        if (Array.isArray(saved) && saved.length) {
          const base = Date.now() - saved.length * 1000 * 60;
          const normalized = saved
            .map((message, index) => normalizePhoneMessage(
              message,
              new Date(base + index * 1000 * 60).toISOString(),
            ))
            .filter(Boolean);

          if (!normalized.length) continue;

          state.messagesApp.messages[thread.id] = normalized;
          thread.preview = normalized[normalized.length - 1]?.text || thread.preview;
        }
      }
    }
  } catch (e) {
    console.warn("Restore failed", e);
  }
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function typingDelay(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  const base = Math.min(4000, Math.max(1000, words * 130));
  const speedLevel = window.__AIRA_TUNING__?.typingSpeed ?? 3;
  const multipliers = [0, 0.4, 0.7, 1.0, 1.5, 2.2];
  return Math.round(base * (multipliers[speedLevel] ?? 1.0));
}

function showTyping(agentName) {
  hideTyping();
  const el = document.createElement("div");
  el.id = "typingBubble";
  el.className = "typing-bubble";
  el.innerHTML = `
    <div class="typing-bubble__name">${escapeHtml(agentName)}</div>
    <div class="typing-bubble__dots"><span></span><span></span><span></span></div>
  `;
  elements.chatMessages?.appendChild(el);
  scrollMessagesToBottom();
}

function hideTyping() {
  document.getElementById("typingBubble")?.remove();
}

async function appendMessagesSequentially(items) {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];

    if (item.type === "character") {
      showTyping(item.agent);
      await wait(typingDelay(item.text));
      hideTyping();
    }

    state.messages.push(item);
    renderMessages();
    saveLocalState();

    if (item.type === "character") {
      speakText(item.text, item.agent);
    }

    if (i < items.length - 1) {
      await wait(320);
    }
  }
}

async function sendMessage(text) {
  if (state.isSending) return;

  // A normal user message unlocks manual scene progression burst lock.
  state.sceneProgress.burstCount = 0;
  state.sceneProgress.burstStartsAt = Date.now();
  elements.sceneProgressBtn?.classList.remove('is-locked');

  state.isSending = true;
  elements.sendBtn.disabled = true;

  try {
    const response = await fetch("/api/ai/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text, context: { active_app: { type: 'world_chat' } } }),
    });

    const payload = await response.json();

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Request failed");
    }

    state.latestState = payload.state ?? null;
    updatePresenceHooks();

    const interference = payload?.result?.interference ?? null;
    const time = formatTime();

    const displayText = interference?.active
      ? (interference.perceivedInput || text)
      : text;

    state.messages.push({
      type: "user",
      text: displayText,
      anomalous: Boolean(interference?.active),
      bubbleClass: interference?.uiEffect?.bubbleClass || "",
      time,
    });

    if (interference?.whisper) {
      const whisperDelay = (interference.uiEffect?.delayMs ?? 120) + 200 + Math.random() * 500;
      setTimeout(() => {
        state.messages.push({
          type: "system",
          text: interference.whisper,
          whisper: true,
          time: formatTime(),
        });
        renderMessages();
      }, whisperDelay);
    }

    renderMessages();

    const responseItems = normalizeResponses(payload);
    await appendMessagesSequentially(responseItems);

    if (Array.isArray(payload.issues) && payload.issues.length && window.__AIRA_DEV_MODE__) {
      state.messages.push({
        type: "system",
        text: `Issues: ${payload.issues.map((issue) => issue.type || issue).join(", ")}`,
        time: formatTime(),
      });
      renderMessages();
    }
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
    saveLocalState();
  }
}

async function letSceneProgress() {
  if (state.isSending || state.booting) return;

  const now = Date.now();
  const COOLDOWN_MS = 3500;
  const BURST_WINDOW_MS = 30000;
  const BURST_MAX = 2; // Only allow 2 consecutive uses before requiring user input

  if (now - state.sceneProgress.lastAt < COOLDOWN_MS) {
    return; // silent cooldown
  }

  if (now - state.sceneProgress.burstStartsAt > BURST_WINDOW_MS) {
    state.sceneProgress.burstStartsAt = now;
    state.sceneProgress.burstCount = 0;
  }

  if (state.sceneProgress.burstCount >= BURST_MAX) {
    // Hand control back to the player — emit a pause/question moment
    const btn = elements.sceneProgressBtn;
    if (btn) btn.classList.add('is-locked');
    state.messages.push({
      type: "story_beat",
      text: "The room goes quiet. What do you do?",
      time: formatTime(),
    });
    renderMessages();
    return;
  }

  const btn = elements.sceneProgressBtn;
  if (btn) {
    btn.disabled = true;
    btn.classList.remove('is-locked');
  }

  const SCENE_ICON = `<svg class="scene-progress-btn__icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><polygon points="3,1 13,7 3,13" fill="currentColor"/></svg>`;

  try {
    const res = await fetch("/api/ai/tick", { method: "POST" });
    const payload = await res.json();

    if (!payload?.ok || !payload.response) {
      // The room is still — that's fine, no noise
      return;
    }

    const r = payload.response;
    state.sceneProgress.lastAt = now;
    state.sceneProgress.burstCount += 1;

    // Show story beat first if present (Patch 4)
    if (payload.storyBeat) {
      state.messages.push({
        type: "story_beat",
        text: payload.storyBeat,
        time: formatTime(),
      });
      renderMessages();
      await wait(600);
    }

    showTyping(r.agent);
    await wait(typingDelay(r.spoken || ""));
    hideTyping();

    state.messages.push({
      type: "character",
      agent: r.agent,
      text: r.spoken,
      thought: r.showThought ? r.thought : null,
      toneClass: r.meta?.toneClass || null,
      anomalyAware: r.meta?.anomalyAware || false,
      time: formatTime(),
    });

    speakText(r.spoken, r.agent);

    saveLocalState();
    renderMessages();
  } catch (error) {
    console.warn("Scene progress failed", error);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = SCENE_ICON;
    }
  }
}

async function resetChat() {
  try {
    const response = await fetch("/api/ai/reset", { method: "POST" });
    if (!response.ok) throw new Error("Reset failed");

    state.messages = [];
    state.latestState = null;
    state.messagesApp = buildDefaultMessagesApp();
    localStorage.removeItem("aira_state");
    updatePresenceHooks();
    renderMessages();
    renderPhoneThreads();
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
  const bindTap = (element, handler) => {
    if (!element) return;
    element.addEventListener("click", handler);
    element.addEventListener("touchend", (event) => {
      event.preventDefault();
      handler(event);
    }, { passive: false });
  };

  document.querySelectorAll("[data-phone-app]").forEach((button) => {
    button.addEventListener("click", () => {
      const appName = button.dataset.phoneApp;
      withTransitionLock(() => {
        openPhoneApp(appName);
      }, 220);
    });
  });

  elements.phoneMessagesList?.addEventListener("click", (event) => {
    const id = event.target.closest(".phone-thread")?.dataset.thread;
    if (!id) return;
    openPhoneThread(id);
  });

  const handlePhoneMessagesBack = () => {
    withTransitionLock(() => {
      closePhoneApp();
    }, 220);
  };
  bindTap(elements.phoneMessagesBackBtn, handlePhoneMessagesBack);

  const handlePhoneGalleryBack = () => {
    withTransitionLock(() => {
      closePhoneApp();
    }, 220);
  };
  bindTap(elements.phoneGalleryBackBtn, handlePhoneGalleryBack);

  // ─── Snap Back ────────────────────────────────────────────────────────
  bindTap(elements.phoneSnapBackBtn, () => {
    withTransitionLock(() => { closePhoneApp(); }, 220);
  });

  let snapCurrentPath = null;

  elements.phoneSnapShutterBtn?.addEventListener("click", async () => {
    const btn = elements.phoneSnapShutterBtn;
    if (btn.classList.contains("is-loading")) return;

    btn.classList.add("is-loading");
    elements.phoneSnapIdle?.classList.add("hidden");
    elements.phoneSnapResult?.classList.add("hidden");
    elements.phoneSnapSaveBtn?.classList.add("hidden");
    elements.phoneSnapRetakeBtn?.classList.add("hidden");
    elements.phoneSnapSpinner?.classList.remove("hidden");
    snapCurrentPath = null;

    try {
      const res = await fetch("/api/camera/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.ok && data.shot?.path) {
        snapCurrentPath = data.shot.path;
        elements.phoneSnapSpinner?.classList.add("hidden");
        if (elements.phoneSnapResult) {
          elements.phoneSnapResult.src = data.shot.path;
          elements.phoneSnapResult.classList.remove("hidden");
        }
        elements.phoneSnapSaveBtn?.classList.remove("hidden");
        elements.phoneSnapRetakeBtn?.classList.remove("hidden");
      } else {
        resetSnapApp();
      }
    } catch {
      resetSnapApp();
    } finally {
      btn.classList.remove("is-loading");
      elements.phoneSnapSpinner?.classList.add("hidden");
    }
  });

  elements.phoneSnapRetakeBtn?.addEventListener("click", () => {
    resetSnapApp();
  });

  elements.phoneSnapSaveBtn?.addEventListener("click", () => {
    if (!snapCurrentPath) return;
    // Photo is already saved on disk — just confirm with a flash
    const btn = elements.phoneSnapSaveBtn;
    btn.textContent = "Saved!";
    btn.style.color = "rgba(120,220,120,0.9)";
    setTimeout(() => {
      btn.textContent = "Save";
      btn.style.color = "";
    }, 1600);
  });

  elements.phoneGalleryLightboxClose?.addEventListener("click", () => {
    elements.phoneGalleryLightbox?.classList.add("hidden");
    if (elements.phoneGalleryLightboxImg) elements.phoneGalleryLightboxImg.src = "";
  });

  elements.phoneGalleryLightbox?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      elements.phoneGalleryLightbox.classList.add("hidden");
      if (elements.phoneGalleryLightboxImg) elements.phoneGalleryLightboxImg.src = "";
    }
  });

  elements.phoneGalleryLightboxDelete?.addEventListener("click", async () => {
    const src = elements.phoneGalleryLightboxImg?.src || "";
    const filename = src.split("/").pop();
    if (!filename) return;

    const confirmed = confirm("Delete this photo?");
    if (!confirmed) return;

    try {
      await fetch(`/api/camera/${encodeURIComponent(filename)}`, { method: "DELETE" });
    } catch {
      // ignore — file may already be gone
    }

    elements.phoneGalleryLightbox?.classList.add("hidden");
    if (elements.phoneGalleryLightboxImg) elements.phoneGalleryLightboxImg.src = "";
    renderPhoneGallery();
  });

  elements.phoneGalleryCaptureBtn?.addEventListener("click", async () => {
    const btn = elements.phoneGalleryCaptureBtn;
    const overlay = elements.phoneGalleryGenerating;
    if (!btn || btn.classList.contains("is-loading")) return;

    btn.classList.add("is-loading");
    overlay?.classList.remove("hidden");

    try {
      const res = await fetch("/api/camera/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.ok && data.shot?.path) {
        await renderPhoneGallery();
        // Flash the newest item briefly
        const firstItem = elements.phoneGalleryGrid?.querySelector(".phone-gallery__item");
        if (firstItem) {
          firstItem.classList.add("phone-gallery__item--new");
          setTimeout(() => firstItem.classList.remove("phone-gallery__item--new"), 1400);
        }
      }
    } catch {
      // silently fail — user can try again
    } finally {
      btn.classList.remove("is-loading");
      overlay?.classList.add("hidden");
    }
  });

  const handlePhoneThreadBack = () => {
    withTransitionLock(() => {
      closePhoneThread();
    }, 180);
  };
  bindTap(elements.phoneThreadBackBtn, handlePhoneThreadBack);

  elements.phoneMessagesForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendPhoneThreadMessage();
  });

  elements.phoneMessagesInput?.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await sendPhoneThreadMessage();
    }
  });

  elements.phoneHandle?.addEventListener("click", togglePhone);
  elements.phoneHandle?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePhone();
    }
  });

  const closePhoneFromInside = (event) => {
    if (event) event.preventDefault();
    if (!state.phone.open) return;
    withTransitionLock(() => {
      closePhone();
    }, 220);
  };

  elements.phoneGrabber?.addEventListener("click", closePhoneFromInside);
  elements.phoneGrabber?.addEventListener(
    "touchend",
    closePhoneFromInside,
    { passive: false }
  );

  elements.phoneScrim?.addEventListener("click", closePhone);

  bindTap(elements.backToHomeBtn, showHome);
  let ttsToggleLockUntil = 0;
  const toggleTts = (event) => {
    if (event) event.preventDefault();
    const now = Date.now();
    if (now < ttsToggleLockUntil) return;
    ttsToggleLockUntil = now + 450;

    const next = !state.tts.enabled;
    setTtsEnabled(next);

    const selectedVoice = next ? chooseSpeechVoice("nb-NO") : null;
    const voiceLabel = selectedVoice?.name ? ` (${selectedVoice.name})` : "";
    const voiceLang = String(selectedVoice?.lang || "").toLowerCase();
    const noLangHint = next && selectedVoice && !(voiceLang.startsWith("nb") || voiceLang.startsWith("nn") || voiceLang.startsWith("no"))
      ? " - mangler norsk stemmepakke"
      : "";
    const femaleHint = selectedVoice && !isLikelyFemaleVoice(selectedVoice.name)
      ? " - ingen tydelig kvinnestemme funnet lokalt"
      : "";

    state.messages.push({
      type: "system",
      text: next ? `TTS: paa${voiceLabel}${noLangHint}${femaleHint}` : "TTS: av",
      time: formatTime(),
    });
    renderMessages();

    if (next) {
      speakText("TTS er paa.", "Aira");
    }
  };
  elements.voiceToggleBtn?.addEventListener("click", toggleTts);
  elements.voiceToggleBtn?.addEventListener("touchend", toggleTts, { passive: false });

  // Photo button — open phone to Snap app
  document.getElementById('photoBtn')?.addEventListener('click', () => {
    if (!state.phone.open) openPhone();
    // Small delay so phone opens before navigating to snap
    setTimeout(() => openPhoneApp('snap'), state.phone.open ? 0 : 280);
  });

  elements.chatInput?.addEventListener("input", autoResizeTextarea);
  window.addEventListener("resize", syncComposerClearance, { passive: true });

  // 5 quick taps on send button opens dev panel (mobile shortcut)
  let _sendTapCount = 0;
  let _sendTapTimer = null;
  elements.sendBtn?.addEventListener("click", () => {
    _sendTapCount += 1;
    clearTimeout(_sendTapTimer);
    _sendTapTimer = setTimeout(() => { _sendTapCount = 0; }, 2000);
    if (_sendTapCount >= 5) {
      _sendTapCount = 0;
      clearTimeout(_sendTapTimer);
      window.__airaDevDrawer?.toggle();
    }
  });

  elements.chatForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = elements.chatInput.value.trim();
    if (!text) return;
    elements.chatInput.value = "";
    autoResizeTextarea();
    await sendMessage(text);
  });

  bindTap(elements.sceneProgressBtn, letSceneProgress);

  elements.chatInput?.addEventListener("keydown", async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const text = elements.chatInput.value.trim();
      if (!text) return;
      elements.chatInput.value = "";
      autoResizeTextarea();
      await sendMessage(text);
    }
  });

  elements.resetChatBtn?.addEventListener("click", resetChat);
}

function endBootPhase() {
  state.booting = false;
  window.removeEventListener("resize", handleBootResizeStability);
  document.body.classList.remove("is-booting");
  document.body.classList.add("is-ready");
  unlockBootScroll();
}

function lockBootScroll() {
  elements.chatMessages?.scrollTo({
    top: elements.chatMessages.scrollHeight,
    behavior: "instant",
  });
}

function unlockBootScroll() {
  scrollMessagesToBottom();
}

function handleBootResizeStability() {
  if (!state.booting) return;
  lockBootScroll();
}

async function init() {
  document.body.classList.remove("is-ready");
  document.body.classList.add("is-booting");
  window.addEventListener("resize", handleBootResizeStability);

  if (!document.getElementById("homeView") && elements.backToHomeBtn) {
    elements.backToHomeBtn.hidden = true;
    elements.backToHomeBtn.setAttribute("aria-hidden", "true");
  }

  await clearLegacyClientCaches();
  bindShellEvents();
  setPrimaryView("home");
  syncBodyMode();
  exposeAiraConsoleApi();
  bindEvents();
  startServerHeartbeatChecks();
  updateTtsButtonUI();
  const synth = getSpeechSynth();
  if (synth && typeof synth.onvoiceschanged !== "undefined") {
    synth.onvoiceschanged = () => {
      state.tts.voicesReady = true;
    };
  }
  autoResizeTextarea();
  syncComposerClearance();
  restoreLocalState();
  renderMessages();
  renderQuickPrompts();
  renderPhoneThreads();
  renderWorldRoomBar();
  await fetchState();



  startAutoTalk();
  lockBootScroll();

  requestAnimationFrame(() => {
    renderMessages();
    scrollMessagesToBottom();

    requestAnimationFrame(() => {
      closePhone();
      renderMessages();
      scrollMessagesToBottom();

      requestAnimationFrame(() => {
        endBootPhase();
      });
    });
  });
}

function startAutoTalk() {
  const IDLE_BY_LEVEL = [null, 120_000, 90_000, 60_000, 45_000, 25_000]; // level 0 = off
  const getIdleMs = () => IDLE_BY_LEVEL[window.__AIRA_TUNING__?.autoTalkFrequency ?? 0] ?? null;
  let lastActivity = Date.now();

  const resetTimer = () => { lastActivity = Date.now(); };
  document.addEventListener("keydown", resetTimer, { passive: true });
  document.addEventListener("pointerdown", resetTimer, { passive: true });

  window.setInterval(async () => {
    if (state.isSending || state.booting) return;
    const idleMs = getIdleMs();
    if (idleMs === null || Date.now() - lastActivity < idleMs) return;

    try {
      const res = await fetch("/api/ai/tick", { method: "POST" });
      const payload = await res.json();
      if (!payload.ok || !payload.response) return;

      const r = payload.response;
      showTyping(r.agent);
      await wait(typingDelay(r.spoken));
      hideTyping();

      state.messages.push({
        type: "character",
        agent: r.agent,
        text: r.spoken,
        thought: r.showThought ? r.thought : null,
        toneClass: r.meta?.toneClass || null,
        anomalyAware: r.meta?.anomalyAware || false,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      speakText(r.spoken, r.agent);

      saveLocalState();
      renderMessages();
      lastActivity = Date.now(); // reset so they don't pile up
    } catch {
      // silent fail
    }
  }, 15_000); // check every 15s, fires only after 45s idle
}

function summarizeMessageForConsole(message) {
  if (!message || typeof message !== "object") return null;
  return {
    type: message.type || "unknown",
    agent: message.agent || null,
    text: message.text || "",
    time: message.time || null,
    anomalous: Boolean(message.anomalous),
  };
}

function getAiraConsoleStatus() {
  const manifestation = state.latestState?.aira?.manifestation || "none";
  const availability = state.latestState?.continuity?.availability || null;
  const availabilityEntries = availability ? Object.values(availability) : [];
  const onlineCount = availabilityEntries.length
    ? availabilityEntries.filter((slot) => slot?.online !== false).length
    : null;

  return {
    ok: true,
    build: BUILD_ID,
    booting: state.booting,
    serverOnline: state.serverOnline,
    isSending: state.isSending,
    worldMessages: state.messages.length,
    manifestation,
    isInvisible: manifestation === "none",
    tension: Number(state.latestState?.tension || 0),
    onlineCount,
    activePhoneThread: state.messagesApp.activeThread,
    lastWorldMessage: summarizeMessageForConsole(state.messages[state.messages.length - 1] || null),
  };
}

function exposeAiraConsoleApi() {
  let watchTimer = null;
  let watchCursor = state.messages.length;

  function stopWatching() {
    if (watchTimer) {
      window.clearInterval(watchTimer);
      watchTimer = null;
    }
  }

  function selectAiraReply(items) {
    const characterItems = items.filter((item) => item.type === "character");
    if (!characterItems.length) return null;
    return characterItems.find((item) => /aira/i.test(item.agent || "")) || characterItems[0];
  }

  const api = {
    help() {
      return {
        ok: true,
        methods: [
          "AiraConsole.status()",
          "AiraConsole.history(limit = 12)",
          "AiraConsole.chat(text)",
          "AiraConsole.chatAira(text)",
          "AiraConsole.watch({ intervalMs, replayLast, onUpdate })",
          "AiraConsole.watchAiraOnly({ intervalMs, replayLast, onUpdate })",
          "AiraConsole.unwatch()",
          "AiraConsole.setInput(text)",
          "AiraConsole.reset()",
        ],
        tip: "Use await AiraConsole.chatAira('Hey Aira') then AiraConsole.watch().",
      };
    },
    status() {
      return getAiraConsoleStatus();
    },
    history(limit = 12) {
      const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 200));
      return state.messages.slice(-safeLimit).map(summarizeMessageForConsole).filter(Boolean);
    },
    setInput(text = "") {
      if (!elements.chatInput) {
        return { ok: false, error: "Chat input not found." };
      }
      elements.chatInput.value = String(text);
      autoResizeTextarea();
      return { ok: true, value: elements.chatInput.value };
    },
    async chat(text) {
      const prompt = String(text || "").trim();
      if (!prompt) {
        return { ok: false, error: "Provide text. Example: await AiraConsole.chat('Hey Aira')" };
      }

      const before = state.messages.length;
      await sendMessage(prompt);
      const delta = state.messages.slice(before).map(summarizeMessageForConsole).filter(Boolean);

      return {
        ok: true,
        sent: prompt,
        added: delta.length,
        messages: delta,
      };
    },
    async chatAira(text) {
      const prompt = String(text || "").trim();
      if (!prompt) {
        return { ok: false, error: "Provide text. Example: await AiraConsole.chatAira('Hey Aira')" };
      }

      const result = await api.chat(prompt);
      if (!result.ok) return result;

      const bestReply = selectAiraReply(result.messages || []);
      return {
        ok: true,
        sent: prompt,
        reply: bestReply,
        messages: result.messages || [],
        note: bestReply
          ? null
          : "No character reply found yet. Try AiraConsole.watch() to catch delayed messages.",
      };
    },
    watch(options = {}) {
      const intervalMs = Math.max(350, Math.min(Number(options?.intervalMs) || 900, 30_000));
      const replayLast = Math.max(0, Math.min(Number(options?.replayLast) || 0, 100));
      const onUpdate = typeof options?.onUpdate === "function" ? options.onUpdate : null;

      stopWatching();
      watchCursor = Math.max(0, state.messages.length - replayLast);

      watchTimer = window.setInterval(() => {
        if (watchCursor >= state.messages.length) return;
        const next = state.messages.slice(watchCursor).map(summarizeMessageForConsole).filter(Boolean);
        watchCursor = state.messages.length;

        if (onUpdate) {
          onUpdate(next);
          return;
        }

        for (const item of next) {
          const who = item.agent ? `${item.agent}: ` : "";
          console.log(`[AIRA] ${who}${item.text}`);
        }
      }, intervalMs);

      return {
        ok: true,
        watching: true,
        intervalMs,
        replayed: replayLast,
      };
    },
    watchAiraOnly(options = {}) {
      const userOnUpdate = typeof options?.onUpdate === "function" ? options.onUpdate : null;
      return api.watch({
        ...options,
        onUpdate(items) {
          const filtered = (items || []).filter((item) => /aira/i.test(item?.agent || ""));
          if (!filtered.length) return;

          if (userOnUpdate) {
            userOnUpdate(filtered);
            return;
          }

          for (const item of filtered) {
            console.log(`[AIRA:ONLY] ${item.agent || "Aira"}: ${item.text}`);
          }
        },
      });
    },
    unwatch() {
      const wasWatching = Boolean(watchTimer);
      stopWatching();
      return { ok: true, watching: false, wasWatching };
    },
    async reset() {
      await resetChat();
      return { ok: true, status: getAiraConsoleStatus() };
    },
  };

  window.AiraConsole = api;
  window.aira = api;
}

// Add dev drawer hotkey (F12 and §)
window.addEventListener("keydown", (e) => {
  // F12 (dev tools) or § (Norwegian/ISO keyboard)
  if ((e.key === "F12" || e.key === "§") && window.__airaDevDrawer) {
    e.preventDefault();
    window.__airaDevDrawer.toggle();
  }
});

// --- Reusable Global Moment Viewer ---
window.showMomentViewer = function showMomentViewer({ img, caption }) {
  const overlay = document.getElementById('moment-viewer-overlay');
  const viewerImg = document.getElementById('moment-viewer-img');
  const viewerCaption = document.getElementById('moment-viewer-caption');
  if (!overlay || !viewerImg || !viewerCaption) return;
  viewerImg.src = img || '';
  viewerCaption.textContent = caption || '';
  overlay.style.display = 'flex';
  setTimeout(() => { overlay.style.opacity = '1'; }, 10);
};
window.hideMomentViewer = function hideMomentViewer() {
  const overlay = document.getElementById('moment-viewer-overlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  setTimeout(() => { overlay.style.display = 'none'; }, 250);
};
// Example: To trigger from any message, call:
// showMomentViewer({ img: 'URL', caption: 'A cinematic moment' });

init();
