import { AiraDevDrawer } from "./devPanel.js";

const BUILD_ID = "20260412c";

console.log(`[AIRA] build active: ${BUILD_ID}`);

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
  composer: document.getElementById("chatForm"),
  placeholderTitle: document.getElementById("placeholderTitle"),
  placeholderHeading: document.getElementById("placeholderHeading"),
  placeholderText: document.getElementById("placeholderText"),
  appPlaceholderBody: document.getElementById("appPlaceholderBody"),
  messagesApp: document.getElementById("messagesApp"),
  messagesList: document.getElementById("messagesList"),
  messagesThread: document.getElementById("messagesThread"),
  messagesLog: document.getElementById("messagesLog"),
  messagesTitle: document.getElementById("messagesTitle"),
  messagesInput: document.getElementById("messagesInput"),
  messagesForm: document.getElementById("messagesForm"),
  messagesBackBtn: document.getElementById("messagesBackBtn"),
  appTopbar: document.getElementById("appTopbar"),
};

const state = {
  currentView: "home",
  activeApp: null,
  messages: [],
  latestState: null,
  isSending: false,
  messagesApp: {
    threads: [
      { id: "lucy", name: "Lucy", preview: "You disappeared.", unread: true },
      { id: "sam", name: "Sam", preview: "You there?", unread: false },
      { id: "angie", name: "Angie", preview: "Call me later", unread: true },
    ],
    activeThread: null,
    messages: {
      lucy: [{ text: "You disappeared.", me: false }],
      sam: [{ text: "You there?", me: false }],
      angie: [{ text: "Call me later", me: false }],
    },
  },
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

function clearViewTransitionClasses(node) {
  node.classList.remove(
    "is-entering-forward",
    "is-entering-back",
    "is-leaving-forward",
    "is-leaving-back"
  );
}

function syncBodyMode() {
  document.body.classList.toggle("is-chat-active", state.currentView === "chat");
}

function setActiveView(name, direction = "forward") {
  const previous = views[state.currentView];
  const next = views[name];

  if (!next) return;
  if (state.currentView === name) return;

  if (previous) {
    clearViewTransitionClasses(previous);
    previous.classList.remove("view--active");
    previous.classList.add(
      direction === "forward" ? "is-leaving-forward" : "is-leaving-back"
    );

    window.setTimeout(() => {
      clearViewTransitionClasses(previous);
      if (state.currentView !== previous.id?.replace("View", "").toLowerCase()) {
        previous.classList.remove("view--active");
      }
    }, 380);
  }

  clearViewTransitionClasses(next);
  next.classList.add("view--active");
  next.classList.add(
    direction === "forward" ? "is-entering-forward" : "is-entering-back"
  );

  window.setTimeout(() => {
    clearViewTransitionClasses(next);
    next.classList.add("view--active");
  }, 380);

  state.currentView = name;
  syncBodyMode();
}

function showHome() {
  state.activeApp = null;
  setActiveView("home", "back");
}

function showChat() {
  state.activeApp = "chat";
  setActiveView("chat", "forward");
  requestAnimationFrame(() => {
    elements.chatInput.focus();
    scrollMessagesToBottom();
  });
}

function showPlaceholder(appName) {
  state.activeApp = appName;

  if (appName === "messages") {
    state.messagesApp.activeThread = null;
    elements.messagesThread.classList.add("hidden");
    elements.messagesList.style.display = "";
    elements.messagesInput.value = "";
    elements.appPlaceholderBody.hidden = true;
    elements.messagesApp.hidden = false;
    elements.placeholderTitle.textContent = "Messages";
    elements.appTopbar.hidden = false;
    setActiveView("app", "forward");
    renderThreads();
    return;
  }

  elements.appTopbar.hidden = false;
  const copy = placeholderCopy[appName] ?? {
    title: appName,
    text: "This space is waiting quietly.",
  };
  elements.placeholderTitle.textContent = copy.title;
  elements.placeholderHeading.textContent = copy.title;
  elements.placeholderText.textContent = copy.text;
  elements.appPlaceholderBody.hidden = false;
  elements.messagesApp.hidden = true;
  setActiveView("app", "forward");
}

function renderThreads() {
  if (!elements.messagesList) return;

  elements.messagesList.innerHTML = state.messagesApp.threads
    .map((thread) => `
      <button class="thread ${thread.unread ? "is-unread" : ""}" type="button" data-thread="${thread.id}">
        <div class="thread-name">${escapeHtml(thread.name)}</div>
        <div class="thread-preview">${escapeHtml(thread.preview)}</div>
        ${thread.unread ? '<div class="thread-dot"></div>' : ""}
      </button>
    `)
    .join("");
}

function renderThreadMessages() {
  const id = state.messagesApp.activeThread;
  const msgs = state.messagesApp.messages[id] || [];

  elements.messagesLog.innerHTML = msgs
    .map((message) => `
      <div class="msg-bubble ${message.me ? "msg-me" : "msg-them"}">
        ${escapeHtml(message.text)}
      </div>
    `)
    .join("");

  requestAnimationFrame(() => {
    elements.messagesLog.scrollTop = elements.messagesLog.scrollHeight;
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

async function sendThreadMessage() {
  const text = elements.messagesInput.value.trim();
  if (!text) return;

  const id = state.messagesApp.activeThread;
  if (!id) return;

  state.messagesApp.messages[id].push({
    text,
    me: true,
  });

  updateThreadPreview(id, `You: ${text}`);
  elements.messagesInput.value = "";
  renderThreadMessages();
  renderThreads();
  saveLocalState();
  await simulateThreadResponse(id, text);
}

async function simulateThreadResponse(id, text) {
  const samples = {
    lucy: ["You vanished again.", "I was waiting.", "Don't ghost me."],
    sam: ["Yeah, I'm here.", "What's the move?", "You good?"],
    angie: ["Call me when free.", "I'm outside.", "Don't keep me waiting."],
  };

  await wait(700 + Math.random() * 900);

  const options = samples[id] || ["...", "hmm", "ok"];
  const last = text.toLowerCase();
  const quick = last.includes("?") ? "Let me think." : options[Math.floor(Math.random() * options.length)];

  state.messagesApp.messages[id].push({
    text: quick,
    me: false,
  });

  updateThreadPreview(id, quick);
  renderThreadMessages();
  renderThreads();
  saveLocalState();
}

function openThread(id) {
  const thread = getThreadById(id);
  if (!thread) return;

  state.messagesApp.activeThread = id;
  elements.messagesList.style.display = "none";
  elements.messagesThread.classList.remove("hidden");
  elements.appTopbar.hidden = true;
  thread.unread = false;
  elements.messagesTitle.textContent = thread.name;

  renderThreadMessages();
}

function closeThread() {
  state.messagesApp.activeThread = null;

  elements.messagesThread.classList.add("hidden");
  elements.messagesList.style.display = "";
  elements.appTopbar.hidden = false;

  renderThreads();
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

      const thoughtHtml = message.thought
        ? `<div class="message__thought">${escapeHtml(message.thought)}</div>`
        : "";

      return `
        <div class="message-row${message.anomalyAware ? " is-anomaly-aware" : ""}">
          <article class="${createMessageClasses(message)}">
            <div class="message__name ${characterNameClass(message.agent)}">
              ${escapeHtml(message.agent)}
            </div>
            <div class="message__bubble${message.toneClass ? ` tone-${escapeHtml(message.toneClass)}` : ""}">${escapeHtml(message.text)}</div>
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
  const isReactive = reactiveStages.has(manifestation);

  ring.classList.toggle("is-reactive", isReactive);
  document.body.dataset.manifestation = manifestation;
}

async function fetchState() {
  state.latestState = null;
  updatePresenceHooks();
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
    if (data.messagesApp) state.messagesApp = data.messagesApp;
    if (data.latestState) state.latestState = data.latestState;
  } catch (e) {
    console.warn("Restore failed", e);
  }
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function appendMessagesSequentially(items) {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    state.messages.push(item);
    renderMessages();
    saveLocalState();

    const isLast = i === items.length - 1;
    if (!isLast) {
      await wait(320);
    }
  }
}

async function sendMessage(text) {
  if (state.isSending) return;

  state.isSending = true;
  elements.sendBtn.disabled = true;

  try {
    const time = formatTime();
    state.messages.push({
      type: "user",
      text,
      anomalous: false,
      bubbleClass: "",
      time,
    });
    renderMessages();

    await wait(700 + Math.random() * 900);

    const fakeReplies = [
      { type: "character", agent: "Lucy", text: "You came back.", thought: "", anomalous: false, toneClass: "", anomalyAware: false, time: formatTime() },
      { type: "character", agent: "Sam", text: "Heard you.", thought: "", anomalous: false, toneClass: "", anomalyAware: false, time: formatTime() },
      { type: "character", agent: "Angie", text: "Say that again.", thought: "", anomalous: false, toneClass: "", anomalyAware: false, time: formatTime() },
    ];

    const item = fakeReplies[Math.floor(Math.random() * fakeReplies.length)];
    state.messages.push(item);
    renderMessages();
  } catch (error) {
    console.error("sendMessage local error", error);
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
    state.messages = [];
    state.latestState = null;
    state.messagesApp = {
      threads: [
        { id: "lucy", name: "Lucy", preview: "You disappeared.", unread: true },
        { id: "sam", name: "Sam", preview: "You there?", unread: false },
        { id: "angie", name: "Angie", preview: "Call me later", unread: true },
      ],
      activeThread: null,
      messages: {
        lucy: [{ text: "You disappeared.", me: false }],
        sam: [{ text: "You there?", me: false }],
        angie: [{ text: "Call me later", me: false }],
      },
    };
    localStorage.removeItem("aira_state");
    updatePresenceHooks();
    renderMessages();
    renderThreads();
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
    if (!action) return;

    if (action === "chat") {
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

  elements.messagesList.addEventListener("click", (event) => {
    const id = event.target.closest(".thread")?.dataset.thread;
    if (!id) return;
    openThread(id);
  });

  elements.messagesBackBtn.addEventListener("click", closeThread);

  elements.messagesForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendThreadMessage();
  });

  elements.messagesInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await sendThreadMessage();
    }
  });
}

async function init() {
  await clearLegacyClientCaches();
  syncBodyMode();
  bindEvents();
  autoResizeTextarea();
  restoreLocalState();
  renderMessages();
  renderThreads();
  await fetchState();

  const devDrawer = new AiraDevDrawer({
    getState: () => state.latestState,
    onReset: resetChat,
  });

  devDrawer.mount();
}

init();
