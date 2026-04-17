const AIRA_API_BASE = "https://aira-web-production.up.railway.app";

const AIRA_OPEN_ROOM_CANDIDATES = [
  { method: "GET", path: room => `/api/characters/${room}` },
  { method: "GET", path: room => `/api/characters/${room}/messages` },
  { method: "GET", path: room => `/api/characters/${room}/chat` },
  { method: "GET", path: room => `/api/rooms/${room}` },
  { method: "GET", path: room => `/api/rooms/${room}/messages` },
  {
    method: "POST",
    path: () => `/api/chat/open`,
    body: room => ({ character: room, room, mode: "dm", open: true }),
  },
  {
    method: "POST",
    path: () => `/api/chat`,
    body: room => ({ character: room, room, mode: "dm", open: true }),
  },
];

const AIRA_SEND_MESSAGE_CANDIDATES = [
  {
    method: "POST",
    path: () => `/api/chat`,
    body: (room, text, thread) => ({
      character: room,
      room,
      mode: "dm",
      sessionId: thread.sessionId || null,
      message: text,
      messages: thread.messages.map(message => ({
        role: message.side === "outgoing" ? "user" : "assistant",
        author: message.author,
        text: message.text,
        time: message.time,
      })),
    }),
  },
  {
    method: "POST",
    path: () => `/api/chat/message`,
    body: (room, text, thread) => ({
      character: room,
      room,
      sessionId: thread.sessionId || null,
      text,
    }),
  },
  {
    method: "POST",
    path: () => `/api/messages`,
    body: (room, text, thread) => ({
      character: room,
      room,
      sessionId: thread.sessionId || null,
      message: text,
    }),
  },
  {
    method: "POST",
    path: room => `/api/rooms/${room}/messages`,
    body: (room, text, thread) => ({
      sessionId: thread.sessionId || null,
      message: text,
    }),
  },
  {
    method: "POST",
    path: room => `/api/characters/${room}/messages`,
    body: (room, text, thread) => ({
      sessionId: thread.sessionId || null,
      message: text,
    }),
  },
];

// ── DOM refs ──────────────────────────────────────────────
const navButtons   = document.querySelectorAll("[data-nav]");
const pages        = document.querySelectorAll(".page");
const menuToggle   = document.getElementById("menuToggle");
const nav          = document.getElementById("primaryNav");

const inviteToastStack  = document.getElementById("inviteToastStack");
const inviteStatusPill  = document.getElementById("inviteStatusPill");

const roomCards    = document.querySelectorAll(".room-card");
// support both old and new inbox markup variants
const threadList   = document.querySelector(".thread-list") || document.getElementById('nodeRailList') || document.querySelector('.node-rail-list');
const dmThread     = document.getElementById("dmThread");
const dmName       = document.getElementById("dmName");
const dmStatus     = document.getElementById("dmStatus");
const dmAvatar     = document.getElementById("dmAvatar");
const dmForm       = document.getElementById("dmForm");
const dmInput      = document.getElementById("dmInput");
const cameraBtn    = document.getElementById("cameraBtn");

const stats = {
  nodes:   document.getElementById("statNodes"),
  rooms:   document.getElementById("statRooms"),
  invites: document.getElementById("statInvites"),
};

// ── Character data ────────────────────────────────────────
const characterDirectory = {
  nina: {
    key: "nina",
    name: "Nina",
    avatar: "N",
    status: "ONLINE",
    preview: "Still holding the thread.",
    scene: "She makes the room feel like you were expected.",
    sceneState: "The room is open, warm, and slightly dangerous to linger in.",
    tags: ["warm signal", "private", "pulls you back"],
    cta: "ACCESS NODE",
    accent: "nina",
    route: {
      title: "THE RETURN",
      copy: "She kept the thread open longer than she should have. You never answered why.",
      state: "STABLE",
      progress: "62% open",
      id: "return-thread",
    },
    fallbackOpeners: [
      { side: "incoming", author: "Nina", text: "You came back slower this time.", time: "20:38" },
      { side: "incoming", author: "Nina", text: "Still — you came back.", time: "20:39" },
    ],
    fallbackReplies: [
      "Then stay with me for a second.",
      "You always arrive at the edge of saying something real.",
      "Good. Don't flatten it now.",
    ],
  },
  hazel: {
    key: "hazel",
    name: "Hazel",
    avatar: "H",
    status: "OBSERVANT",
    preview: "You disappeared too early.",
    scene: "Hazel notices what you avoid before you do.",
    sceneState: "The room is cool, precise, and gives nothing away for free.",
    tags: ["sharp", "watching", "never forgets pauses"],
    cta: "FACE HAZEL",
    accent: "hazel",
    route: {
      title: "AFTER THE PAUSE",
      copy: "She remembers the gap more clearly than the words around it.",
      state: "WATCHING",
      progress: "41% open",
      id: "after-image",
    },
    fallbackOpeners: [
      { side: "incoming", author: "Hazel", text: "There you are.", time: "20:21" },
      { side: "incoming", author: "Hazel", text: "You always return like you weren't going to.", time: "20:22" },
    ],
    fallbackReplies: [
      "That's not the part I was listening for.",
      "Closer. But you're still protecting the sentence.",
      "You keep circling. Pick a point and land.",
    ],
  },
  iris: {
    key: "iris",
    name: "Iris",
    avatar: "I",
    status: "LISTENING",
    preview: "Only clear in private.",
    scene: "Iris never raises her voice. She just narrows the room.",
    sceneState: "The room is quiet enough to hear the part you usually edit out.",
    tags: ["quiet", "low signal", "intimate"],
    cta: "LISTEN IN",
    accent: "iris",
    route: {
      title: "LOW SIGNAL",
      copy: "Meaning appears here only when you stop forcing it.",
      state: "WARMING",
      progress: "28% open",
      id: "low-signal",
    },
    fallbackOpeners: [
      { side: "incoming", author: "Iris", text: "You don't have to speak quickly here.", time: "20:31" },
      { side: "incoming", author: "Iris", text: "Let the thought finish forming first.", time: "20:32" },
    ],
    fallbackReplies: [
      "Yes. Stay near that feeling.",
      "Don't explain it yet. Just hold it in words.",
      "That sounded more honest than you meant it to.",
    ],
  },
  vale: {
    key: "vale",
    name: "Vale",
    avatar: "V",
    status: "UNSTABLE",
    preview: "Open briefly. Then gone.",
    scene: "Vale never makes a room comfortable. Only open.",
    sceneState: "The room is unstable. It could close between one message and the next.",
    tags: ["brief", "locked", "time pressure"],
    cta: "CATCH BEFORE CLOSE",
    accent: "vale",
    route: {
      title: "BRIEF WINDOW",
      copy: "You only get access when the signal slips and the lock fails.",
      state: "UNSTABLE",
      progress: "open briefly",
      id: "brief-window",
    },
    fallbackOpeners: [
      { side: "incoming", author: "Vale", text: "You're late.", time: "now" },
      { side: "incoming", author: "Vale", text: "Come in or lose it.", time: "now" },
    ],
    fallbackReplies: [
      "Good. Move.",
      "Less hesitation.",
      "You have a window. Use it.",
    ],
  },
};

// ── App state ─────────────────────────────────────────────
const appState = {
  selectedRoom: "nina",
  activeThread: "nina",
  liveFeed: [],
  inviteCount: 1,
  nodesOnline: 12,
  roomsActive: 4,
};

const threadState = Object.fromEntries(
  Object.values(characterDirectory).map(character => [
    character.key,
    {
      name:          character.name,
      avatar:        character.avatar,
      status:        character.status,
      preview:       character.preview,
      messages:      [...character.fallbackOpeners],
      loadedFromApi: false,
      isLoading:     false,
      sessionId:     null,
    },
  ]),
);

const invitePool = [
  { name: "Nina",  copy: "Come back. I want to finish that conversation.", room: "nina" },
  { name: "Hazel", copy: "You disappeared too early.",                     room: "hazel" },
  { name: "Iris",  copy: "There's something I only say in private.",       room: "iris" },
  { name: "Vale",  copy: "Room's open. Don't let it cool.",                room: "vale" },
];

const feedEvents = [
  "<strong>Iris</strong> opened a private route",
  "<strong>Nina</strong> started typing in DMs",
  "<strong>Hazel</strong> went idle",
  "<strong>Vale</strong> marked a room invite-only",
  "A live invite entered the grid",
];

let activeThread = appState.activeThread;
let inviteIndex  = 0;
const inviteFired = new Set();

// ── Utilities ─────────────────────────────────────────────
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nowClock() {
  return new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
}

function getLastMessage(messages) {
  return Array.isArray(messages) && messages.length ? messages[messages.length - 1] : null;
}

function toDisplayTime(value) {
  if (!value) return nowClock();
  if (typeof value === "string") return value.trim() || nowClock();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowClock();
  return date.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
}

function renderMessageText(raw) {
  const escaped = escapeHtml(raw);
  return escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

// ── Navigation ────────────────────────────────────────────
function setActivePage(pageName) {
  pages.forEach(page => {
    page.classList.toggle("active", page.dataset.page === pageName);
  });
  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.nav === pageName);
  });
  if (nav.classList.contains("open")) {
    nav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }
  window.location.hash = pageName;
}

function bootFromHash() {
  const hash  = window.location.hash.replace("#", "");
  const valid = ["home", "hub", "rooms", "inbox", "routes"];
  setActivePage(valid.includes(hash) ? hash : "home");
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    const navTarget = button.dataset.nav;
    const room      = button.dataset.room;
    if (!navTarget) return;
    if (room && threadState[room]) {
      focusThread(room);
      hydrateThread(room, false);
    }
    setActivePage(navTarget);
  });
});

menuToggle?.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  nav.classList.toggle("open");
});

// ── Thread list helpers ───────────────────────────────────
function ensureThreadButton(roomKey) {
  let button = threadList?.querySelector(`[data-thread="${roomKey}"]`);
  if (button) return button;

  const character = characterDirectory[roomKey];
  if (!character || !threadList) return null;

  button = document.createElement("button");
  button.type = "button";
  button.className = "thread-item";
  button.dataset.thread = roomKey;
  button.innerHTML = `
    <div class="avatar avatar-${escapeHtml(roomKey)}">${escapeHtml(character.avatar)}</div>
    <div class="thread-copy">
      <strong>${escapeHtml(character.name)}</strong>
      <p>${escapeHtml(character.preview)}</p>
    </div>
    <div class="thread-meta"><span>now</span></div>
  `;
  threadList.appendChild(button);
  // keep index attributes in sync for keyboard navigation
  reindexThreadList();
  return button;
}

function reindexThreadList() {
  const items = Array.from(document.querySelectorAll('.thread-item, .node-strip'));
  items.forEach((it, idx) => it.dataset.index = String(idx + 1));
}

function setThreadActive(roomKey) {
  document.querySelectorAll('.thread-item, .node-strip').forEach(item => {
    item.classList.toggle('active', item.dataset.thread === roomKey);
  });
}

function setThreadUnread(roomKey, unread) {
  const button = ensureThreadButton(roomKey);
  if (!button) return;
  const meta = button.querySelector(".thread-meta");
  const dot  = button.querySelector(".unread-dot");
  if (unread && !dot) {
    const unreadDot = document.createElement("span");
    unreadDot.className = "unread-dot";
    meta?.appendChild(unreadDot);
  }
  if (!unread && dot) dot.remove();
}

function updateThreadPreview(roomKey, previewText, timeText = "now") {
  const button = ensureThreadButton(roomKey);
  if (!button) return;
  const preview = button.querySelector(".thread-copy p");
  const time    = button.querySelector(".thread-meta span");
  if (preview) preview.textContent = previewText;
  if (time)    time.textContent    = timeText;
}

// ── Thread rail helpers: visibility, selection, mobile drawers
function ensureThreadVisible(roomKey) {
  const btn = threadList?.querySelector(`[data-thread="${roomKey}"]`);
  if (!btn || !threadList) return;
  const rect = btn.getBoundingClientRect();
  const parentRect = threadList.getBoundingClientRect();
  if (rect.top < parentRect.top || rect.bottom > parentRect.bottom) {
    const offset = btn.offsetTop - threadList.clientHeight / 2 + btn.offsetHeight / 2;
    threadList.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
  }
}

function selectThreadByIndex(index) {
  const item = document.querySelector(`[data-index="${index}"]`);
  if (item && item.dataset.thread) {
    const roomKey = item.dataset.thread;
    setActivePage('inbox');
    focusThread(roomKey);
    hydrateThread(roomKey, false);
  }
}

function closeInboxDrawers() {
  const layout = document.querySelector('.inbox-layout');
  if (!layout) return;
  layout.classList.remove('rail-open');
  layout.classList.remove('dossier-open');
}

function toggleRailDrawer() {
  const layout = document.querySelector('.inbox-layout');
  if (!layout) return;
  layout.classList.toggle('rail-open');
}

function toggleDossierDrawer() {
  const layout = document.querySelector('.inbox-layout');
  if (!layout) return;
  layout.classList.toggle('dossier-open');
}

// ── Render DM thread ──────────────────────────────────────
function renderDmThread(roomKey) {
  const thread = threadState[roomKey];
  if (!thread || !dmThread) return;

  if (dmName)   dmName.textContent   = thread.name;
  if (dmStatus) dmStatus.textContent = thread.isLoading ? "CONNECTING…" : thread.status;
  if (dmAvatar) {
    dmAvatar.textContent = thread.avatar;
    dmAvatar.className   = `avatar avatar-${roomKey}`;
  }

  // preserve scroll position behaviour: only auto-scroll if user is near bottom
  const wasNearBottom = dmThread.scrollHeight - (dmThread.scrollTop + dmThread.clientHeight) < 96;

  dmThread.innerHTML = "";
  thread.messages.forEach(message => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${message.side}`;
    if (message.imageUrl) {
      bubble.innerHTML = `<img src="${escapeHtml(message.imageUrl)}" style="max-width:100%;border-radius:8px;display:block;" alt="image" /><time>${escapeHtml(message.time)}</time>`;
    } else {
      bubble.innerHTML = `<p>${renderMessageText(message.text)}</p><time>${escapeHtml(message.time)}</time>`;
    }
    dmThread.appendChild(bubble);
  });
  // Auto-scroll only when user was near bottom or we just sent a message
  const shouldScroll = wasNearBottom || thread._justSent;
  if (shouldScroll) {
    dmThread.scrollTop = dmThread.scrollHeight;
  }
  // reset justSent after render
  if (thread._justSent) thread._justSent = false;
}

// ── Profile panel ─────────────────────────────────────────
function loadProfilePanel(roomKey) {
  const char = characterDirectory[roomKey];
  if (!char) return;

  const img         = document.getElementById("profileImg");
  const placeholder = document.getElementById("profilePlaceholder");
  const name        = document.getElementById("profileName");
  const bio         = document.getElementById("profileBio");
  const tags        = document.getElementById("profileTags");
  const sig         = document.getElementById("profileSig");

  if (img) {
    img.style.display = "";
    img.src = `/profile_pictures/${roomKey}.jpg`;
    img.onerror = () => {
      img.style.display = "none";
      if (placeholder) { placeholder.textContent = char.avatar; placeholder.style.display = ""; }
    };
    img.onload = () => { if (placeholder) placeholder.style.display = "none"; };
  }
  if (placeholder) placeholder.textContent = char.avatar;
  if (name) name.textContent = char.name;
  if (bio)  bio.textContent  = char.preview || "";
  if (sig) {
    const sigMap = { nina: "sig-online", hazel: "sig-away", iris: "sig-online", vale: "sig-unstable" };
    sig.className = `node-sig ${sigMap[roomKey] || "sig-online"}`;
    sig.textContent = char.status;
  }
  if (tags) {
    tags.innerHTML = "";
    (char.tags || []).forEach(tag => {
      const span = document.createElement("span");
      span.className = "profile-tag";
      span.textContent = tag;
      tags.appendChild(span);
    });
  }
}

// ── Focus thread (cross-section sync) ────────────────────
function focusThread(roomKey) {
  activeThread = roomKey;
  appState.activeThread = roomKey;
  appState.selectedRoom = roomKey;
  setThreadActive(roomKey);
  setThreadUnread(roomKey, false);
  renderDmThread(roomKey);
  loadProfilePanel(roomKey);
  renderSpotlight(roomKey);
  renderRouteDetail(roomKey);
  renderActivityStrip();

  // Update profile open button
  const profileOpenBtn = document.getElementById("profileOpenBtn");
  if (profileOpenBtn) {
    profileOpenBtn.onclick = () => openRoom(roomKey);
  }
}

// ── Message normalization ─────────────────────────────────
function normalizeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map(part => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        if (part && typeof part.content === "string") return part.content;
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  if (value && typeof value.text === "string") return value.text.trim();
  if (value && typeof value.content === "string") return value.content.trim();
  return "";
}

function inferMessageSide(roomKey, message) {
  const role = normalizeString(message?.role || message?.sender || message?.type || "").toLowerCase();
  const author = normalizeString(message?.author || message?.speaker || message?.name || "").toLowerCase();

  if (["user", "human", "visitor", "client"].includes(role)) return "outgoing";
  if (["assistant", "ai", "character", "npc", "bot"].includes(role)) return "incoming";
  if (author === "you" || author === "user") return "outgoing";
  if (roomKey && characterDirectory[roomKey] && (author === roomKey || author === characterDirectory[roomKey].name.toLowerCase())) return "incoming";
  return "incoming";
}

function normalizeMessages(roomKey, payload) {
  const candidates = [
    payload?.messages,
    payload?.data?.messages,
    payload?.thread?.messages,
    payload?.conversation?.messages,
    payload?.chat?.messages,
    payload?.items,
    Array.isArray(payload) ? payload : null,
  ];
  const list = candidates.find(Array.isArray) || [];

  return list.map(item => {
    const text = normalizeText(item?.text ?? item?.content ?? item?.message ?? item?.body ?? item);
    if (!text) return null;
    const side = inferMessageSide(roomKey, item);
    const author = normalizeString(
      item?.author || item?.speaker || item?.name || (side === "incoming" ? characterDirectory[roomKey].name : "You"),
      side === "incoming" ? characterDirectory[roomKey].name : "You"
    );
    return {
      side,
      author,
      text,
      time: toDisplayTime(item?.time ?? item?.createdAt ?? item?.timestamp ?? item?.sentAt),
    };
  }).filter(Boolean);
}

function normalizeOpenRoomPayload(roomKey, payload) {
  const base     = characterDirectory[roomKey];
  const messages = normalizeMessages(roomKey, payload);

  const singleReply = normalizeText(
    payload?.reply ?? payload?.message ?? payload?.response ?? payload?.content ?? payload?.assistant
  );

  const finalMessages = messages.length
    ? messages
    : singleReply
      ? [{ side: "incoming", author: base.name, text: singleReply, time: nowClock() }]
      : [...base.fallbackOpeners];

  return {
    name:          normalizeString(payload?.name || payload?.character?.name, base.name),
    avatar:        normalizeString(payload?.avatar || payload?.character?.avatar, base.avatar),
    status:        normalizeString(payload?.status || payload?.presence || payload?.character?.status, base.status),
    preview:       normalizeString(payload?.preview || payload?.subtitle, base.preview),
    messages:      finalMessages,
    sessionId:     payload?.sessionId ?? payload?.threadId ?? payload?.conversationId ?? null,
    loadedFromApi: messages.length > 0 || Boolean(singleReply),
    isLoading:     false,
  };
}

function normalizeReplyPayload(roomKey, payload) {
  const messages = normalizeMessages(roomKey, payload);
  if (messages.length) {
    return {
      mode:      "thread",
      messages,
      sessionId: payload?.sessionId ?? payload?.threadId ?? payload?.conversationId ?? null,
    };
  }
  const text = normalizeText(
    payload?.reply ?? payload?.message ?? payload?.response ?? payload?.content ?? payload?.assistant
  );
  if (!text) return null;
  return {
    mode: "reply",
    reply: { side: "incoming", author: characterDirectory[roomKey].name, text, time: nowClock() },
    sessionId: payload?.sessionId ?? payload?.threadId ?? payload?.conversationId ?? null,
  };
}

// ── API helpers ───────────────────────────────────────────
async function requestJson(url, options = {}, timeout = 9000) {
  const controller = new AbortController();
  const timeoutId  = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(options.headers || {}) },
    });
    const raw = await response.text();
    let json = null;
    try { json = raw ? JSON.parse(raw) : null; } catch { json = null; }
    if (!response.ok) return null;
    return json;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function bootstrapRoomFromApi(roomKey) {
  for (const candidate of AIRA_OPEN_ROOM_CANDIDATES) {
    const url  = `${AIRA_API_BASE}${candidate.path(roomKey)}`;
    const json = await requestJson(url, {
      method: candidate.method,
      headers: candidate.method === "POST" ? { "Content-Type": "application/json" } : {},
      body: candidate.body ? JSON.stringify(candidate.body(roomKey)) : undefined,
    });
    if (!json) continue;
    const normalized = normalizeOpenRoomPayload(roomKey, json?.data ?? json);
    if (normalized) return normalized;
  }
  return null;
}

async function sendMessageToApi(roomKey, text) {
  const thread = threadState[roomKey];
  for (const candidate of AIRA_SEND_MESSAGE_CANDIDATES) {
    const url  = `${AIRA_API_BASE}${candidate.path(roomKey)}`;
    const json = await requestJson(url, {
      method: candidate.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidate.body(roomKey, text, thread)),
    });
    if (!json) continue;
    const normalized = normalizeReplyPayload(roomKey, json?.data ?? json);
    if (normalized) return normalized;
  }
  return null;
}

function getFallbackReply(roomKey) {
  const character = characterDirectory[roomKey];
  const replies   = character?.fallbackReplies || [];
  if (!replies.length) return "...";
  return replies[Math.floor(Math.random() * replies.length)];
}

async function hydrateThread(roomKey, forceRefresh = false) {
  const thread = threadState[roomKey];
  if (thread.loadedFromApi && !forceRefresh) return;

  thread.isLoading = true;
  renderDmThread(roomKey);

  const apiThread = await bootstrapRoomFromApi(roomKey);

  if (apiThread) {
    threadState[roomKey] = { ...threadState[roomKey], ...apiThread };
    const latest = getLastMessage(threadState[roomKey].messages);
    updateThreadPreview(roomKey, latest?.text || threadState[roomKey].preview, latest?.time || "now");
  } else {
    threadState[roomKey].isLoading = false;
    const latest = getLastMessage(threadState[roomKey].messages);
    updateThreadPreview(roomKey, latest?.text || threadState[roomKey].preview, latest?.time || "now");
  }
  renderDmThread(roomKey);
}

async function openRoom(roomKey, triggerButton = null) {
  if (!roomKey || !threadState[roomKey]) return;
  const originalLabel = triggerButton?.textContent || "ACCESS NODE";

  if (triggerButton) {
    triggerButton.disabled    = true;
    triggerButton.textContent = "CONNECTING…";
  }

  ensureThreadButton(roomKey);
  setActivePage("inbox");
  focusThread(roomKey);
  await hydrateThread(roomKey, true);

  if (triggerButton) {
    triggerButton.disabled    = false;
    triggerButton.textContent = originalLabel;
  }
}

// ── Thread list click ─────────────────────────────────────
threadList?.addEventListener("click", event => {
  const button = event.target.closest('.thread-item, .node-strip');
  if (!button) return;
  const roomKey = button.dataset.thread;
  if (!roomKey || !threadState[roomKey]) return;
  setActivePage("inbox");
  focusThread(roomKey);
  ensureThreadVisible(roomKey);
  hydrateThread(roomKey, false);

  // close mobile drawers when selecting a thread
  if (window.innerWidth <= 760) closeInboxDrawers();
});

// ── DM form submit ────────────────────────────────────────
dmForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const text = dmInput.value.trim();
  if (!text || !threadState[activeThread]) return;

  const thread   = threadState[activeThread];
  const outgoing = { side: "outgoing", author: "You", text, time: nowClock() };

  thread.messages.push(outgoing);
  // mark that we just sent a message so renderDmThread can decide to auto-scroll
  thread._justSent = true;
  updateThreadPreview(activeThread, text, outgoing.time);
  renderDmThread(activeThread);
  dmInput.value = "";

  const apiReply = await sendMessageToApi(activeThread, text);

  if (apiReply?.mode === "thread") {
    thread.messages = apiReply.messages;
    thread.loadedFromApi = true;
    if (apiReply.sessionId) thread.sessionId = apiReply.sessionId;
    const latest = getLastMessage(thread.messages);
    updateThreadPreview(activeThread, latest?.text || thread.preview, latest?.time || "now");
    setThreadUnread(activeThread, false);
    renderDmThread(activeThread);
    return;
  }

  if (apiReply?.mode === "reply") {
    if (apiReply.sessionId) thread.sessionId = apiReply.sessionId;
    thread.messages.push(apiReply.reply);
    thread.loadedFromApi = true;
    updateThreadPreview(activeThread, apiReply.reply.text, apiReply.reply.time);
    setThreadUnread(activeThread, false);
    renderDmThread(activeThread);
    return;
  }

  const fallbackReply = {
    side:   "incoming",
    author: characterDirectory[activeThread].name,
    text:   getFallbackReply(activeThread),
    time:   nowClock(),
  };

  const delay = 600 + Math.floor(Math.random() * 600);
  setTimeout(() => {
    thread.messages.push(fallbackReply);
    updateThreadPreview(activeThread, fallbackReply.text, fallbackReply.time);
    setThreadUnread(activeThread, false);
    renderDmThread(activeThread);
    checkChemistry(activeThread);
  }, delay);
});

// ── Chemistry / invite gate ───────────────────────────────
function checkChemistry(roomKey) {
  if (inviteFired.has(roomKey)) return;
  const thread        = threadState[roomKey];
  const outgoingCount = thread.messages.filter(m => m.side === "outgoing").length;
  if (outgoingCount >= 5) {
    inviteFired.add(roomKey);
    const poolIndex = invitePool.findIndex(i => i.room === roomKey);
    if (poolIndex !== -1) window.setTimeout(() => showInvite(poolIndex), 1200);
  }
}

// ── Camera ────────────────────────────────────────────────
cameraBtn?.addEventListener("click", async () => {
  // Capture an image and show a local preview with Send / Cancel controls
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video  = document.createElement("video");
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement("canvas");
    canvas.width  = 640;
    canvas.height = 480;
    canvas.getContext("2d").drawImage(video, 0, 0, 640, 480);
    stream.getTracks().forEach(t => t.stop());

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const imageBase64 = dataUrl.split(",")[1];

    // create inline preview UI in the compose area
    const compose = document.querySelector('.chat-compose');
    if (!compose) return;

    // remove any existing preview
    const existing = document.getElementById('mediaPreview');
    if (existing) existing.remove();

    const preview = document.createElement('div');
    preview.id = 'mediaPreview';
    preview.className = 'media-preview';
    preview.innerHTML = `
      <img src="${escapeHtml(dataUrl)}" alt="preview" class="media-preview-img" />
      <div class="media-preview-actions">
        <button class="btn btn-small" id="mediaSendBtn">Send</button>
        <button class="btn btn-small" id="mediaCancelBtn">Cancel</button>
      </div>
    `;
    compose.insertBefore(preview, compose.firstChild);

    const cancelBtn = preview.querySelector('#mediaCancelBtn');
    const sendBtn = preview.querySelector('#mediaSendBtn');

    cancelBtn?.addEventListener('click', () => {
      preview.remove();
    });

    sendBtn?.addEventListener('click', async () => {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending…';
      const char = characterDirectory[activeThread];
      const thread = threadState[activeThread];

      // optimistic outgoing preview
      const outgoing = { side: 'outgoing', author: 'You', text: '📷 image', time: nowClock() };
      thread.messages.push(outgoing);
      thread._justSent = true;
      updateThreadPreview(activeThread, '📷 image', outgoing.time);
      renderDmThread(activeThread);

      try {
        const res = await fetch('/api/camera/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: `${char?.name || activeThread} reacts to what they see in the image`, imageBase64, character: activeThread }),
        });
        const data = await res.json();
        const imageUrl = data?.imageUrl || (data?.shot && data.shot.path) || null;
        if (imageUrl) {
          // push incoming reaction image
          thread.messages.push({ side: 'incoming', author: char?.name || activeThread, text: '', imageUrl, time: nowClock() });
          updateThreadPreview(activeThread, '📷 image', nowClock());
          setThreadUnread(activeThread, false);
          renderDmThread(activeThread);
        } else {
          // fallback: show text reply
          thread.messages.push({ side: 'incoming', author: char?.name || activeThread, text: getFallbackReply(activeThread), time: nowClock() });
          updateThreadPreview(activeThread, getFallbackReply(activeThread), nowClock());
          renderDmThread(activeThread);
        }
      } catch (err) {
        console.warn('Camera send error:', err);
        thread.messages.push({ side: 'incoming', author: char?.name || activeThread, text: getFallbackReply(activeThread), time: nowClock() });
        updateThreadPreview(activeThread, getFallbackReply(activeThread), nowClock());
        renderDmThread(activeThread);
      } finally {
        preview.remove();
      }
    });

  } catch (err) {
    console.warn('Camera error:', err);
  }
});

// ── Signal feed ───────────────────────────────────────────
function createSignalEvent(html, time = "just now") { return { html, time }; }

function seedSignalFeed() {
  appState.liveFeed = [
    createSignalEvent("<strong>Nina</strong> reopened a private thread"),
    createSignalEvent("<strong>Hazel</strong> went quiet, but stayed present"),
    createSignalEvent("<strong>Iris</strong> warmed a low-signal route"),
    createSignalEvent("<strong>Vale</strong> opened a brief window"),
  ];
}

function renderSignalFeed() {
  const feed = document.getElementById("signalFeed");
  if (!feed) return;
  feed.innerHTML = "";
  appState.liveFeed.slice(0, 8).forEach(item => {
    const el = document.createElement("article");
    el.className  = "signal-item";
    el.innerHTML  = `${item.html}<time>${escapeHtml(item.time)}</time>`;
    feed.appendChild(el);
  });
}

function pushSignalEvent(html) {
  appState.liveFeed.unshift(createSignalEvent(html));
  appState.liveFeed = appState.liveFeed.slice(0, 8);
  renderSignalFeed();
}

// ── Activity strip ────────────────────────────────────────
function renderActivityStrip() {
  const strip = document.getElementById("mainActivityStrip");
  if (!strip) return;
  const items = [
    `${appState.nodesOnline} NODES ONLINE`,
    `${appState.roomsActive} ROOMS ACTIVE`,
    `${appState.inviteCount} LIVE INVITE`,
    `${characterDirectory[appState.selectedRoom].name.toUpperCase()} SELECTED`,
  ];
  strip.innerHTML = "";
  items.forEach(text => {
    const chip = document.createElement("span");
    chip.className   = "activity-chip";
    chip.textContent = text;
    strip.appendChild(chip);
  });
}

// ── Hub counters ──────────────────────────────────────────
function renderHubCounters() {
  const nodesPill = document.getElementById("hubNodesPill");
  const roomsPill = document.getElementById("hubRoomsPill");
  const topbar    = document.getElementById("topbarNodes");
  const footer    = document.getElementById("footerNodes");
  if (nodesPill) nodesPill.textContent = `${appState.nodesOnline} nodes`;
  if (roomsPill) roomsPill.textContent = `${appState.roomsActive} rooms active`;
  if (topbar)    topbar.textContent    = String(appState.nodesOnline);
  if (footer)    footer.textContent    = String(appState.nodesOnline);
  if (stats.nodes)   stats.nodes.textContent   = String(appState.nodesOnline);
  if (stats.rooms)   stats.rooms.textContent   = String(appState.roomsActive);
  if (stats.invites) stats.invites.textContent = String(appState.inviteCount);
}

// ── Spotlight ─────────────────────────────────────────────
function renderSpotlight(roomKey = appState.selectedRoom) {
  const char = characterDirectory[roomKey];
  if (!char) return;

  const spotlightAvatar  = document.getElementById("spotlightAvatar");
  const spotlightName    = document.getElementById("spotlightName");
  const spotlightStatus  = document.getElementById("spotlightStatus");
  const spotlightCopy    = document.getElementById("spotlightCopy");
  const spotlightTags    = document.getElementById("spotlightTags");
  const spotlightOpenBtn = document.getElementById("spotlightOpenBtn");
  const sceneFocusAvatar = document.getElementById("sceneFocusAvatar");
  const sceneFocusName   = document.getElementById("sceneFocusName");
  const sceneFocusPreview = document.getElementById("sceneFocusPreview");
  const hubSceneTitle    = document.getElementById("hubSceneTitle");
  const hubSceneCopy     = document.getElementById("hubSceneCopy");
  const dmSceneState     = document.getElementById("dmSceneState");

  if (spotlightAvatar)  { spotlightAvatar.textContent = char.avatar; spotlightAvatar.className = `avatar avatar-${roomKey}`; }
  if (spotlightName)    spotlightName.textContent    = char.name;
  if (spotlightStatus)  spotlightStatus.textContent  = char.status;
  if (spotlightCopy)    spotlightCopy.textContent    = char.scene;
  if (spotlightOpenBtn) spotlightOpenBtn.textContent = char.cta;

  if (spotlightTags) {
    spotlightTags.innerHTML = "";
    (char.tags || []).forEach(tag => {
      const span = document.createElement("span");
      span.className   = "profile-tag";
      span.textContent = tag;
      spotlightTags.appendChild(span);
    });
  }

  if (sceneFocusAvatar)  { sceneFocusAvatar.textContent = char.avatar; sceneFocusAvatar.className = `avatar avatar-${roomKey}`; }
  if (sceneFocusName)    sceneFocusName.textContent    = char.name;
  if (sceneFocusPreview) sceneFocusPreview.textContent = char.preview;
  if (hubSceneTitle)     hubSceneTitle.textContent     = `${char.name} is closest right now.`;
  if (hubSceneCopy)      hubSceneCopy.textContent      = char.scene;
  if (dmSceneState)      dmSceneState.textContent      = char.sceneState;

  document.querySelectorAll(".presence-card").forEach(card => {
    card.classList.toggle("active", card.dataset.room === roomKey);
    card.dataset.accent = characterDirectory[card.dataset.room]?.accent || "";
  });

  document.querySelectorAll(".room-card").forEach(card => {
    card.dataset.accent = characterDirectory[card.dataset.room]?.accent || "";
  });
}

// ── Route rail & detail ───────────────────────────────────
function renderRouteRail() {
  const rail = document.getElementById("routeRail");
  if (!rail) return;
  rail.innerHTML = "";
  Object.values(characterDirectory).forEach(char => {
    const item = document.createElement("button");
    item.type         = "button";
    item.className    = "route-rail-item";
    item.dataset.room = char.key;
    item.innerHTML    = `<strong>${char.route.title}</strong><small>${char.route.state} / ${char.route.progress}</small>`;
    item.addEventListener("click", () => {
      appState.selectedRoom = char.key;
      renderSpotlight(char.key);
      renderRouteDetail(char.key);
      renderActivityStrip();
    });
    rail.appendChild(item);
  });
}

function renderRouteDetail(roomKey = appState.selectedRoom) {
  const char = characterDirectory[roomKey];
  if (!char) return;

  const title  = document.getElementById("routeDetailTitle");
  const copy   = document.getElementById("routeDetailCopy");
  const meta   = document.getElementById("routeDetailMeta");
  const cNode  = document.getElementById("consoleNode");
  const cState = document.getElementById("consoleState");
  const cAccess= document.getElementById("consoleAccess");

  if (title)  title.textContent  = char.route.title;
  if (copy)   copy.textContent   = char.route.copy;
  if (cNode)  cNode.textContent  = char.name.toUpperCase();
  if (cState) cState.textContent = char.route.state;
  if (cAccess) cAccess.textContent = char.route.progress.toUpperCase();

  if (meta) {
    meta.innerHTML = "";
    [char.route.state, char.route.progress].forEach(text => {
      const span = document.createElement("span");
      span.className   = "pill";
      span.textContent = text;
      meta.appendChild(span);
    });
  }

  document.querySelectorAll(".route-node").forEach(node => {
    node.classList.toggle("active", node.dataset.room === roomKey);
  });
}

// ── Ambient system events ─────────────────────────────────
function randomCharacterKey() {
  const keys = Object.keys(characterDirectory);
  return keys[Math.floor(Math.random() * keys.length)];
}

function pushAmbientSystemEvent() {
  const roomKey = randomCharacterKey();
  const char    = characterDirectory[roomKey];
  const variants = {
    nina:  ["<strong>Nina</strong> reopened an intimate thread", "<strong>Nina</strong> kept a room warm longer than expected"],
    hazel: ["<strong>Hazel</strong> stayed present without replying", "<strong>Hazel</strong> marked a pause instead of a message"],
    iris:  ["<strong>Iris</strong> warmed a quiet route", "<strong>Iris</strong> shifted a private thread into focus"],
    vale:  ["<strong>Vale</strong> opened a brief window", "<strong>Vale</strong> turned a room unstable"],
  };
  const pool = variants[roomKey] || [`<strong>${char.name}</strong> moved inside the grid`];
  pushSignalEvent(pool[Math.floor(Math.random() * pool.length)]);
}

// ── Live state cycle ──────────────────────────────────────
function cycleLiveState() {
  appState.nodesOnline  = 9 + Math.floor(Math.random() * 7);
  appState.roomsActive  = 2 + Math.floor(Math.random() * 4);
  appState.inviteCount  = Math.max(1, Math.min(3, appState.inviteCount + (Math.random() > 0.6 ? 1 : 0) - (Math.random() > 0.7 ? 1 : 0)));
  renderHubCounters();
  renderActivityStrip();
}

// ── Invite toasts ─────────────────────────────────────────
const activeToasts = new Map();

function dismissToast(roomKey, el) {
  if (!el) return;
  el.classList.add("exiting");
  window.setTimeout(() => el.remove(), 220);
  const entry = activeToasts.get(roomKey);
  if (entry) { window.clearInterval(entry.interval); activeToasts.delete(roomKey); }
  if (activeToasts.size === 0) {
    if (inviteStatusPill) inviteStatusPill.textContent = "GRID ACTIVE";
    if (stats.invites)    stats.invites.textContent    = "0";
  }
}

function showInvite(index = 0) {
  if (!inviteToastStack) return;
  const invite = invitePool[index % invitePool.length];
  const char   = characterDirectory[invite.room];

  const existing = activeToasts.get(invite.room);
  if (existing) dismissToast(invite.room, existing.el);

  const toast = document.createElement("div");
  toast.className = "invite-toast";
  toast.innerHTML = `
    <div class="invite-toast-avatar">
      <div class="avatar avatar-${escapeHtml(invite.room)}">${escapeHtml(char?.avatar || invite.name[0])}</div>
    </div>
    <div class="invite-toast-body">
      <p class="invite-toast-name">${escapeHtml(invite.name)}</p>
      <p class="invite-toast-copy">${escapeHtml(invite.copy)}</p>
    </div>
    <div class="invite-toast-actions">
      <button class="invite-toast-enter">ENTER</button>
      <button class="invite-toast-dismiss">✕</button>
    </div>
    <div class="invite-toast-timer-bar"></div>
  `;

  inviteToastStack.appendChild(toast);
  window.requestAnimationFrame(() => { window.requestAnimationFrame(() => toast.classList.add("visible")); });

  if (inviteStatusPill) inviteStatusPill.textContent = "INVITE WAITING";
  if (stats.invites)    stats.invites.textContent    = String(activeToasts.size + 1);

  let countdown   = 60;
  const timerBar  = toast.querySelector(".invite-toast-timer-bar");
  if (timerBar) timerBar.style.width = "100%";

  const interval = window.setInterval(() => {
    countdown -= 1;
    if (timerBar) timerBar.style.width = `${(countdown / 60) * 100}%`;
    if (countdown <= 0) { window.clearInterval(interval); dismissToast(invite.room, toast); }
  }, 1000);

  activeToasts.set(invite.room, { el: toast, interval });

  toast.querySelector(".invite-toast-dismiss").addEventListener("click", () => dismissToast(invite.room, toast));
  toast.querySelector(".invite-toast-enter").addEventListener("click", async () => {
    dismissToast(invite.room, toast);
    await openRoom(invite.room);
  });
}

// ── Room card buttons ─────────────────────────────────────
roomCards.forEach(card => {
  const roomKey = card.dataset.room;
  const button  = card.querySelector(".btn");
  if (!button || !roomKey) return;
  button.addEventListener("click", () => openRoom(roomKey, button));
});

// ── Presence cards ────────────────────────────────────────
document.querySelectorAll(".presence-card[data-room]").forEach(card => {
  card.addEventListener("click", () => {
    const roomKey = card.dataset.room;
    if (!roomKey || !characterDirectory[roomKey]) return;
    appState.selectedRoom = roomKey;
    renderSpotlight(roomKey);
    renderRouteDetail(roomKey);
    renderActivityStrip();
  });
});

// ── Hub/route action buttons ──────────────────────────────
document.getElementById("hubEnterFocusedBtn")?.addEventListener("click", () => openRoom(appState.selectedRoom));
document.getElementById("spotlightOpenBtn")?.addEventListener("click",   () => openRoom(appState.selectedRoom));
document.getElementById("routeOpenBtn")?.addEventListener("click",       () => openRoom(appState.selectedRoom));

document.querySelectorAll("[data-room][data-nav]").forEach(button => {
  button.addEventListener("click", () => {
    const roomKey = button.dataset.room;
    if (roomKey && threadState[roomKey]) { focusThread(roomKey); hydrateThread(roomKey, false); }
  });
});

document.querySelectorAll(".route-node").forEach(node => {
  node.addEventListener("click", () => {
    const roomKey = node.dataset.room;
    if (!roomKey || !characterDirectory[roomKey]) return;
    appState.selectedRoom = roomKey;
    renderSpotlight(roomKey);
    renderRouteDetail(roomKey);
    renderActivityStrip();
  });
});

// ── Boot ──────────────────────────────────────────────────
bootFromHash();

Object.keys(characterDirectory).forEach(roomKey => ensureThreadButton(roomKey));

seedSignalFeed();
renderSignalFeed();
renderHubCounters();
renderActivityStrip();
renderSpotlight(appState.selectedRoom);
renderRouteRail();
renderRouteDetail(appState.selectedRoom);
focusThread(activeThread);

if (window.location.hash.replace("#", "") === "inbox") {
  hydrateThread(activeThread, false);
}

window.setInterval(pushAmbientSystemEvent, 7000);
window.setInterval(cycleLiveState, 9000);
