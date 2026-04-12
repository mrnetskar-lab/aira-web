import { AiraDevDrawer } from "./devPanel.js";

const BUILD_ID = "20260412d";

// ------------------------------------
// CHARACTER REGISTRY — IDs are permanent.
// Rename displayName freely without breaking state/threads/memory.
// ------------------------------------
const CHARACTERS = {
  c1: { id: "c1", name: "Lucy",  displayName: "Lucy",  key: "lucy"  },
  c2: { id: "c2", name: "Sam",   displayName: "Sam",   key: "sam"   },
  c3: { id: "c3", name: "Angie", displayName: "Angie", key: "angie" },
};

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
    c1: "You disappeared.",
    c2: "Still here.",
    c3: "Hey, where'd you go?",
  };
  const now = Date.now();
  const seedBase = now - 1000 * 60 * 12;

  return {
    activeThread: null,
    threads: [
      { id: "c1", name: "Lucy", displayName: "Lucy", preview: previews.c1, unread: false },
      { id: "c2", name: "Sam", displayName: "Sam", preview: previews.c2, unread: false },
      { id: "c3", name: "Angie", displayName: "Angie", preview: previews.c3, unread: false },
    ],
    messages: {
      c1: [{ text: previews.c1, me: false, timestamp: new Date(seedBase).toISOString() }],
      c2: [{ text: previews.c2, me: false, timestamp: new Date(seedBase + 1000 * 60 * 3).toISOString() }],
      c3: [{ text: previews.c3, me: false, timestamp: new Date(seedBase + 1000 * 60 * 6).toISOString() }],
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

const elements = {
  backToHomeBtn: document.getElementById("backToHomeBtn"),
  resetChatBtn: document.getElementById("resetChatBtn"),
  chatMessages: document.getElementById("chatMessages"),
  worldRoomBar: document.getElementById("worldRoomBar"),
  worldRoomCount: document.getElementById("worldRoomCount"),
  worldRoomVibe: document.getElementById("worldRoomVibe"),
  worldRoomScene: document.getElementById("worldRoomScene"),
  serverHeartbeat: document.getElementById("serverHeartbeat"),
  worldPresenceState: document.getElementById("worldPresenceState"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  sendBtn: document.getElementById("sendBtn"),
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
};

const state = {
  currentView: "chat",
  messages: [],
  latestState: null,
  serverOnline: null,
  isSending: false,
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

function syncBodyMode() {
  document.body.classList.toggle("is-chat-active", state.currentView === "chat");
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

  if (!elements.serverHeartbeat) return;

  elements.serverHeartbeat.classList.remove("is-online", "is-offline", "is-unknown");

  if (isOnline === true) {
    elements.serverHeartbeat.classList.add("is-online");
    elements.serverHeartbeat.setAttribute("aria-label", "Server online");
    elements.serverHeartbeat.title = detail || "Server status: online";
    return;
  }

  if (isOnline === false) {
    elements.serverHeartbeat.classList.add("is-offline");
    elements.serverHeartbeat.setAttribute("aria-label", "Server offline");
    elements.serverHeartbeat.title = detail || "Server status: offline";
    return;
  }

  elements.serverHeartbeat.classList.add("is-unknown");
  elements.serverHeartbeat.setAttribute("aria-label", "Server status unknown");
  elements.serverHeartbeat.title = detail || "Server status: checking";
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

  syncPresenceModes();
}

function closePhoneApp() {
  state.phoneApp = null;

  elements.phoneAppLayer?.setAttribute("hidden", "");
  elements.phoneMessagesApp?.setAttribute("hidden", "");
  elements.phoneGalleryApp?.setAttribute("hidden", "");
  elements.phoneSnapApp?.setAttribute("hidden", "");
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

function renderPhoneThreads() {
  if (!elements.phoneMessagesList) return;

  elements.phoneMessagesList.innerHTML = state.messagesApp.threads
    .map((thread) => {
      const threadMessages = state.messagesApp.messages[thread.id] || [];
      const lastMessage = threadMessages[threadMessages.length - 1] || null;
      const previewText = lastMessage?.text || thread.preview || "";
      const timeLabel = lastMessage?.timestamp ? formatPhoneThreadTime(lastMessage.timestamp) : "--:--";
      const dateLabel = lastMessage?.timestamp ? formatPhoneThreadListDate(lastMessage.timestamp) : "";

      return `
      <button
        class="phone-thread ${thread.unread ? "is-unread" : ""}"
        type="button"
        data-thread="${thread.id}"
      >
        <div class="phone-thread__name">${escapeHtml(thread.displayName || thread.name)}</div>
        <div class="phone-thread__time">${escapeHtml(timeLabel)}</div>
        <div class="phone-thread__preview">${escapeHtml(previewText)}</div>
        <div class="phone-thread__date">${escapeHtml(dateLabel)}</div>
        ${thread.unread ? '<div class="phone-thread__dot"></div>' : ""}
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
    if (!char) return;

    const response = await fetch(`/api/characters/${char.key}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const payload = await response.json();
    hidePhoneTyping();

    if (!payload?.ok) return;

    state.messagesApp.messages[id].push({
      text: payload.reply || "...",
      me: false,
      timestamp: new Date().toISOString(),
      animate: true,
    });

    updateThreadPreview(id, payload.reply || "...");
    playMessageTone("incoming");
    renderPhoneThreadMessages();
    renderPhoneThreads();
    saveLocalState();
  } catch (err) {
    hidePhoneTyping();
    console.warn("Phone thread response failed", err);
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
  const availability = state.latestState?.continuity?.availability || null;
  const timeBlock = state.latestState?.continuity?.timeBlock || "evening";
  const tension = Number(state.latestState?.tension || 0);
  const manifestation = state.latestState?.aira?.manifestation || "none";

  const availabilityEntries = availability ? Object.values(availability) : [];
  const onlineCount = availabilityEntries.length
    ? availabilityEntries.filter((slot) => slot?.online !== false).length
    : 3;

  const activeCount = availabilityEntries.length
    ? availabilityEntries.filter((slot) => slot?.replying || slot?.seen).length
    : 0;

  let vibe = "Calm";
  if (tension > 0.7) vibe = "Volatile";
  else if (tension > 0.45) vibe = "Charged";
  else if (tension > 0.2) vibe = "Warm";

  const beat = `${capitalizeWord(timeBlock)}${manifestation !== "none" ? " · Strange" : ""}`;

  if (elements.worldRoomCount) {
    elements.worldRoomCount.textContent = `${onlineCount} online${activeCount ? ` · ${activeCount} active` : ""}`;
  }
  if (elements.worldRoomVibe) {
    elements.worldRoomVibe.textContent = vibe;
  }
  if (elements.worldRoomScene) {
    elements.worldRoomScene.textContent = beat;
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
  const gmLine = payload?.result?.gmLine ?? null;
  const time = formatTime();

  const items = responses.map((entry) => ({
    type: "character",
    agent: entry.agent || "AIRA",
    text: entry.spoken || "",
    thought: entry.showThought && entry.thought ? entry.thought : null,
    anomalous: Boolean(entry.anomalous),
    toneClass: entry.meta?.toneClass || "",
    anomalyAware: Boolean(entry.meta?.anomalyAware),
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

    if (i < items.length - 1) {
      await wait(320);
    }
  }
}

async function sendMessage(text) {
  if (state.isSending) return;

  state.isSending = true;
  elements.sendBtn.disabled = true;

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
  syncBodyMode();
  exposeAiraConsoleApi();
  bindEvents();
  startServerHeartbeatChecks();
  autoResizeTextarea();
  syncComposerClearance();
  restoreLocalState();
  renderMessages();
  renderPhoneThreads();
  renderWorldRoomBar();
  await fetchState();

  const devDrawer = new AiraDevDrawer({
    getState: () => state.latestState,
    onStateUpdate: (freshState) => { state.latestState = freshState; },
    onReset: resetChat,
  });

  devDrawer.mount();
  window.__airaDevDrawer = devDrawer;

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
  const IDLE_BY_LEVEL = [0, 120_000, 90_000, 60_000, 45_000, 25_000];
  const getIdleMs = () => IDLE_BY_LEVEL[window.__AIRA_TUNING__?.autoTalkFrequency ?? 3] ?? 60_000;
  let lastActivity = Date.now();

  const resetTimer = () => { lastActivity = Date.now(); };
  document.addEventListener("keydown", resetTimer, { passive: true });
  document.addEventListener("pointerdown", resetTimer, { passive: true });

  window.setInterval(async () => {
    if (state.isSending || state.booting) return;
    if (Date.now() - lastActivity < getIdleMs()) return;

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

init();
