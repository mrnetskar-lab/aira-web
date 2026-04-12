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

  return {
    activeThread: null,
    threads: [
      { id: "c1", name: "Lucy", displayName: "Lucy", preview: previews.c1, unread: false },
      { id: "c2", name: "Sam", displayName: "Sam", preview: previews.c2, unread: false },
      { id: "c3", name: "Angie", displayName: "Angie", preview: previews.c3, unread: false },
    ],
    messages: {
      c1: [{ text: previews.c1, me: false }],
      c2: [{ text: previews.c2, me: false }],
      c3: [{ text: previews.c3, me: false }],
    },
  };
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
  phoneGalleryLightbox: document.getElementById("phoneGalleryLightbox"),
  phoneGalleryLightboxImg: document.getElementById("phoneGalleryLightboxImg"),
  phoneGalleryLightboxClose: document.getElementById("phoneGalleryLightboxClose"),
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

  syncPresenceModes();
}

function closePhoneApp() {
  state.phoneApp = null;

  elements.phoneAppLayer?.setAttribute("hidden", "");
  elements.phoneMessagesApp?.setAttribute("hidden", "");
  elements.phoneGalleryApp?.setAttribute("hidden", "");
  elements.phoneHome?.removeAttribute("hidden");
  syncPresenceModes();
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
      grid.innerHTML = `<div class="phone-gallery__empty">No photos yet.<br>Use the dev panel to capture a scene.</div>`;
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
    .map((thread) => `
      <button
        class="phone-thread ${thread.unread ? "is-unread" : ""}"
        type="button"
        data-thread="${thread.id}"
      >
        <div class="phone-thread__name">${escapeHtml(thread.displayName || thread.name)}</div>
        <div class="phone-thread__preview">${escapeHtml(thread.preview)}</div>
        ${thread.unread ? '<div class="phone-thread__dot"></div>' : ""}
      </button>
    `)
    .join("");
}

function renderPhoneThreadMessages() {
  const id = state.messagesApp.activeThread;
  const msgs = state.messagesApp.messages[id] || [];

  if (!elements.phoneMessagesLog) return;

  elements.phoneMessagesLog.innerHTML = msgs
    .map((message, index) => {
      const previous = msgs[index - 1];
      const sameSide = previous && previous.me === message.me;

      return `
        <div class="phone-msg-row ${message.me ? "phone-msg-row--me" : "phone-msg-row--them"} ${sameSide ? "is-stacked" : ""}">
          <div class="phone-msg-bubble ${message.me ? "phone-msg-me" : "phone-msg-them"}">
            ${escapeHtml(message.text)}
          </div>
        </div>
      `;
    })
    .join("");

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
  await wait(typingDelay(text));
  hidePhoneTyping();

  try {
    const response = await fetch("/api/ai/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: text,
        context: {
          active_app: {
            type: "messages",
            mode: "dm",
            visibility: "private",
            threadId: id,
          },
        },
      }),
    });

    const payload = await response.json();
    if (!payload?.ok) return;

    const result = payload.result || {};
    const responses = result.responses || [];

    if (responses.length) {
      const threadChar = CHARACTERS[id];
      const reply = responses.find((r) => r.agent === threadChar?.name) || responses[0];

      state.messagesApp.messages[id].push({
        text: reply.spoken || "...",
        me: false,
      });

      updateThreadPreview(id, reply.spoken || "...");
    }

    const events = result.continuity?.events || [];
    if (events.length) {
      const event = events[0];
      setTimeout(() => {
        state.messagesApp.messages[id].push({
          text: event.text,
          me: false,
        });
        updateThreadPreview(id, event.text);
        renderPhoneThreadMessages();
        renderPhoneThreads();
        saveLocalState();
      }, 1200 + Math.random() * 2000);
    }

    renderPhoneThreadMessages();
    renderPhoneThreads();
    saveLocalState();
  } catch (err) {
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
  input.style.height = "0px";
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  syncTypingState();
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function updatePhoneClock() {
  const clock = document.querySelector(".phone-home__time");
  if (!clock) return;

  const now = new Date();
  const formatted = new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  clock.textContent = formatted;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
              <div class="message__bubble${message.bubbleClass ? ` ${escapeHtml(message.bubbleClass)}` : ""}">${escapeHtml(message.text)}</div>
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
          state.messagesApp.messages[thread.id] = saved;
          thread.preview = saved[saved.length - 1]?.text || thread.preview;
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
  document.querySelectorAll("[data-phone-app]").forEach((button) => {
    button.addEventListener("click", () => {
      const appName = button.dataset.phoneApp;

      if (appName === "messages") {
        withTransitionLock(() => {
          openPhoneApp("messages");
        }, 220);
        return;
      }
    });
  });

  elements.phoneMessagesList?.addEventListener("click", (event) => {
    const id = event.target.closest(".phone-thread")?.dataset.thread;
    if (!id) return;
    openPhoneThread(id);
  });

  elements.phoneMessagesBackBtn?.addEventListener("click", () => {
    withTransitionLock(() => {
      closePhoneApp();
    }, 220);
  });

  elements.phoneGalleryBackBtn?.addEventListener("click", () => {
    withTransitionLock(() => {
      closePhoneApp();
    }, 220);
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

  elements.phoneThreadBackBtn?.addEventListener("click", () => {
    withTransitionLock(() => {
      closePhoneThread();
    }, 180);
  });

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

  elements.phoneScrim?.addEventListener("click", closePhone);

  const dragStartTargets = [elements.phoneHandle, elements.phoneGrabber].filter(Boolean);

  dragStartTargets.forEach((target) => {
    target.addEventListener("mousedown", beginPhoneDrag);
    target.addEventListener("touchstart", beginPhoneDrag, { passive: true });
  });

  window.addEventListener("mousemove", updatePhoneDrag);
  window.addEventListener("touchmove", updatePhoneDrag, { passive: true });

  window.addEventListener("mouseup", endPhoneDrag);
  window.addEventListener("touchend", endPhoneDrag);
  window.addEventListener("touchcancel", endPhoneDrag);

  elements.backToHomeBtn?.addEventListener("click", showHome);
  elements.chatInput?.addEventListener("input", autoResizeTextarea);

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

  await clearLegacyClientCaches();
  syncBodyMode();
  bindEvents();
  if (elements.chatInput) {
    elements.chatInput.style.height = "52px";
  }
  restoreLocalState();
  renderMessages();
  renderPhoneThreads();
  await fetchState();

  const devDrawer = new AiraDevDrawer({
    getState: () => state.latestState,
    onReset: resetChat,
  });

  devDrawer.mount();
  window.__airaDevDrawer = devDrawer;

  updatePhoneClock();
  window.setInterval(updatePhoneClock, 60_000);
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

init();
