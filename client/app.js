const AIRA_API_BASE = "https://aira-web-production.up.railway.app";

const AIRA_ENDPOINTS = {
  openRoom: [
    room => `/api/characters/${room}`,
    room => `/api/characters/${room}/messages`,
    room => `/api/rooms/${room}`,
    room => `/api/rooms/${room}/messages`,
  ],
  sendMessage: [
    room => `/api/chat`,
    room => `/api/messages`,
    room => `/api/characters/${room}/chat`,
    room => `/api/rooms/${room}/chat`,
  ],
};

const navButtons = document.querySelectorAll("[data-nav]");
const pages = document.querySelectorAll(".page");
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("primaryNav");
const feedList = document.getElementById("feedList");
const mainChat = document.getElementById("mainChat");
const mainChatForm = document.getElementById("mainChatForm");
const mainChatInput = document.getElementById("mainChatInput");
const inviteBanner = document.getElementById("inviteBanner");
const inviteName = document.getElementById("inviteName");
const inviteCopy = document.getElementById("inviteCopy");
const inviteTimerText = document.getElementById("inviteTimerText");
const timerProgress = document.getElementById("timerProgress");
const dismissInviteBtn = document.getElementById("dismissInviteBtn");
const enterInviteBtn = document.getElementById("enterInviteBtn");
const inviteStatusPill = document.getElementById("inviteStatusPill");
const threadList = document.querySelector(".thread-list");
const dmThread = document.getElementById("dmThread");
const dmName = document.getElementById("dmName");
const dmStatus = document.getElementById("dmStatus");
const dmAvatar = document.getElementById("dmAvatar");
const dmForm = document.getElementById("dmForm");
const dmInput = document.getElementById("dmInput");
const roomCards = document.querySelectorAll(".room-card");
const stats = {
  nodes: document.getElementById("statNodes"),
  rooms: document.getElementById("statRooms"),
  invites: document.getElementById("statInvites"),
};

const characterDirectory = {
  nina: {
    key: "nina",
    name: "Nina",
    avatar: "N",
    status: "online now",
    preview: "Still holding the thread.",
    fallbackOpeners: [
      { side: "incoming", author: "Nina", text: "You took your time.", time: "20:38" },
      { side: "outgoing", author: "You", text: "I saw your room light up.", time: "20:39" },
      { side: "incoming", author: "Nina", text: "Then stop hovering and stay.", time: "20:40" },
    ],
  },
  hazel: {
    key: "hazel",
    name: "Hazel",
    avatar: "H",
    status: "active 9m ago",
    preview: "You disappeared too early.",
    fallbackOpeners: [
      { side: "incoming", author: "Hazel", text: "Ignore that if you want.", time: "20:21" },
      { side: "incoming", author: "Hazel", text: "I know you still read everything twice.", time: "20:22" },
    ],
  },
  iris: {
    key: "iris",
    name: "Iris",
    avatar: "I",
    status: "listening",
    preview: "There’s something she only says in private.",
    fallbackOpeners: [
      { side: "incoming", author: "Iris", text: "You made it in.", time: "20:31" },
      { side: "incoming", author: "Iris", text: "Keep your voice low. This thread opens better that way.", time: "20:32" },
    ],
  },
  vale: {
    key: "vale",
    name: "Vale",
    avatar: "V",
    status: "invite only",
    preview: "Room’s open.",
    fallbackOpeners: [
      { side: "incoming", author: "Vale", text: "Room’s open.", time: "now" },
      { side: "incoming", author: "Vale", text: "Not for long.", time: "now" },
    ],
  },
};

const dmData = {
  nina: {
    ...characterDirectory.nina,
    messages: [...characterDirectory.nina.fallbackOpeners],
    sessionId: null,
    loadedFromApi: false,
    isLoading: false,
  },
  hazel: {
    ...characterDirectory.hazel,
    messages: [...characterDirectory.hazel.fallbackOpeners],
    sessionId: null,
    loadedFromApi: false,
    isLoading: false,
  },
  vale: {
    ...characterDirectory.vale,
    messages: [...characterDirectory.vale.fallbackOpeners],
    sessionId: null,
    loadedFromApi: false,
    isLoading: false,
  },
};

const invitePool = [
  { name: "Nina", copy: "Come back. I want to finish that conversation.", room: "nina" },
  { name: "Hazel", copy: "You disappeared too early.", room: "hazel" },
  { name: "Iris", copy: "There's something I only say in private.", room: "iris" },
  { name: "Vale", copy: "Room’s open. Don’t let it cool.", room: "vale" },
];

const feedEvents = [
  "<strong>Iris</strong> opened a private route",
  "<strong>Nina</strong> started typing in DMs",
  "<strong>Hazel</strong> went idle",
  "<strong>Vale</strong> marked a room invite-only",
  "A live invite entered the grid",
];

let activeThread = "nina";
let inviteCountdown = 60;
let inviteInterval = null;
let inviteIndex = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nowClock() {
  return new Date().toLocaleTimeString("no-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDisplayTime(value) {
  if (!value) return nowClock();
  if (typeof value === "string") return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowClock();
  return date.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
}

function getCharacterMeta(key) {
  return characterDirectory[key] || {
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    avatar: key.charAt(0).toUpperCase(),
    status: "online",
    preview: "Private thread open.",
    fallbackOpeners: [],
  };
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

function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function inferSide(message, roomKey) {
  const role = String(
    message?.role ??
    message?.sender ??
    message?.type ??
    ""
  ).toLowerCase();

  const author = firstNonEmptyString(
    message?.author,
    message?.speaker,
    message?.name
  ).toLowerCase();

  if (["user", "visitor", "human", "client"].includes(role)) return "outgoing";
  if (["assistant", "ai", "character", "npc", "bot"].includes(role)) return "incoming";
  if (author === "you" || author === "user") return "outgoing";
  if (author === roomKey || author === getCharacterMeta(roomKey).name.toLowerCase()) return "incoming";
  return "incoming";
}

function normalizeMessages(candidate, roomKey) {
  const list = Array.isArray(candidate)
    ? candidate
    : Array.isArray(candidate?.messages)
      ? candidate.messages
      : [];

  return list
    .map(message => {
      const text = normalizeText(
        message?.text ??
        message?.content ??
        message?.message ??
        message?.body ??
        message
      );

      if (!text) return null;

      const side = inferSide(message, roomKey);
      const author = firstNonEmptyString(
        message?.author,
        message?.speaker,
        message?.name,
        side === "incoming" ? getCharacterMeta(roomKey).name : "You"
      );

      const time = toDisplayTime(
        message?.time ??
        message?.createdAt ??
        message?.timestamp ??
        message?.sentAt
      );

      return { side, author, text, time };
    })
    .filter(Boolean);
}

function normalizeThreadPayload(roomKey, payload) {
  const meta = getCharacterMeta(roomKey);
  const root = payload?.data ?? payload ?? {};
  const messages = normalizeMessages(
    root?.messages ??
    root?.thread?.messages ??
    root?.conversation?.messages ??
    root?.chat?.messages ??
    root?.items ??
    root,
    roomKey
  );

  return {
    ...meta,
    name: firstNonEmptyString(root?.name, root?.character?.name, meta.name),
    avatar: firstNonEmptyString(root?.avatar, root?.character?.avatar, meta.avatar),
    status: firstNonEmptyString(root?.status, root?.presence, root?.character?.status, meta.status),
    preview: firstNonEmptyString(root?.preview, root?.subtitle, meta.preview),
    messages: messages.length ? messages : [...meta.fallbackOpeners],
    sessionId: root?.sessionId ?? root?.threadId ?? root?.conversationId ?? null,
    loadedFromApi: messages.length > 0,
    isLoading: false,
  };
}

function normalizeReplyPayload(roomKey, payload) {
  const root = payload?.data ?? payload ?? {};

  const threadMessages = normalizeMessages(
    root?.messages ??
    root?.thread?.messages ??
    root?.conversation?.messages,
    roomKey
  );

  if (threadMessages.length) {
    return { mode: "thread", messages: threadMessages, sessionId: root?.sessionId ?? root?.threadId ?? root?.conversationId ?? null };
  }

  const replyText = normalizeText(
    root?.reply ??
    root?.message ??
    root?.response ??
    root?.content ??
    root?.assistant
  );

  if (replyText) {
    return {
      mode: "reply",
      reply: {
        side: "incoming",
        author: getCharacterMeta(roomKey).name,
        text: replyText,
        time: nowClock(),
      },
      sessionId: root?.sessionId ?? root?.threadId ?? root?.conversationId ?? null,
    };
  }

  return null;
}

async function fetchJsonWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("application/json")) return null;

    const json = await response.json();
    return { response, json };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function bootstrapRoomFromApi(roomKey) {
  for (const buildPath of AIRA_ENDPOINTS.openRoom) {
    const path = buildPath(roomKey);
    const result = await fetchJsonWithTimeout(`${AIRA_API_BASE}${path}`, {
      method: "GET",
    });

    if (!result?.json) continue;

    const normalized = normalizeThreadPayload(roomKey, result.json);
    if (normalized.messages?.length) return normalized;
  }

  return null;
}

async function sendMessageToApi(roomKey, text) {
  const thread = dmData[roomKey];
  const transcript = (thread?.messages || []).map(message => ({
    role: message.side === "outgoing" ? "user" : "assistant",
    author: message.author,
    text: message.text,
    time: message.time,
  }));

  const body = {
    character: roomKey,
    room: roomKey,
    mode: "dm",
    sessionId: thread?.sessionId || null,
    message: text,
    messages: transcript,
  };

  for (const buildPath of AIRA_ENDPOINTS.sendMessage) {
    const path = buildPath(roomKey);
    const result = await fetchJsonWithTimeout(`${AIRA_API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!result?.json) continue;

    const normalized = normalizeReplyPayload(roomKey, result.json);
    if (normalized) return normalized;
  }

  return null;
}

function upsertThreadPreview(roomKey, previewText, unread = false) {
  const item = ensureThreadItem(roomKey);
  const meta = item.querySelector(".thread-copy p");
  const time = item.querySelector(".thread-meta span");
  const dot = item.querySelector(".unread-dot");

  if (meta) meta.textContent = previewText;
  if (time) time.textContent = "now";

  if (unread && !dot) {
    const unreadDot = document.createElement("span");
    unreadDot.className = "unread-dot";
    item.querySelector(".thread-meta")?.appendChild(unreadDot);
  }

  if (!unread && dot) {
    dot.remove();
  }
}

function ensureThreadItem(roomKey) {
  let item = threadList?.querySelector(`.thread-item[data-thread="${roomKey}"]`);
  if (item) return item;

  const meta = getCharacterMeta(roomKey);
  item = document.createElement("button");
  item.type = "button";
  item.className = "thread-item";
  item.dataset.thread = roomKey;
  item.innerHTML = `
    <div class="avatar avatar-${escapeHtml(roomKey)}">${escapeHtml(meta.avatar)}</div>
    <div class="thread-copy">
      <strong>${escapeHtml(meta.name)}</strong>
      <p>${escapeHtml(meta.preview)}</p>
    </div>
    <div class="thread-meta">
      <span>now</span>
    </div>
  `;
  threadList?.appendChild(item);
  return item;
}

function renderDmThread(roomKey) {
  const thread = dmData[roomKey];
  if (!thread || !dmThread) return;

  dmName.textContent = thread.name;
  dmStatus.textContent = thread.isLoading ? "connecting to AIRA…" : thread.status;
  dmAvatar.textContent = thread.avatar;
  dmAvatar.className = `avatar avatar-${roomKey}`;
  dmThread.innerHTML = "";

  thread.messages.forEach(message => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${message.side}`;
    bubble.innerHTML = `
      <span class="chat-author">${escapeHtml(message.author)}</span>
      <p>${escapeHtml(message.text)}</p>
      <time>${escapeHtml(message.time)}</time>
    `;
    dmThread.appendChild(bubble);
  });

  dmThread.scrollTop = dmThread.scrollHeight;
}

function markActiveThread(roomKey) {
  document.querySelectorAll(".thread-item").forEach(item => {
    item.classList.toggle("active", item.dataset.thread === roomKey);
  });
}

async function setActiveThread(roomKey, { hydrate = false, forceRefresh = false } = {}) {
  const meta = getCharacterMeta(roomKey);

  if (!dmData[roomKey]) {
    dmData[roomKey] = {
      ...meta,
      messages: [...meta.fallbackOpeners],
      sessionId: null,
      loadedFromApi: false,
      isLoading: false,
    };
  }

  ensureThreadItem(roomKey);
  activeThread = roomKey;
  markActiveThread(roomKey);
  setActivePage("inbox");
  renderDmThread(roomKey);

  if (hydrate && (!dmData[roomKey].loadedFromApi || forceRefresh)) {
    dmData[roomKey].isLoading = true;
    renderDmThread(roomKey);

    const apiThread = await bootstrapRoomFromApi(roomKey);
    if (apiThread) {
      dmData[roomKey] = { ...dmData[roomKey], ...apiThread };
      upsertThreadPreview(roomKey, apiThread.messages.at(-1)?.text || apiThread.preview, false);
    } else {
      dmData[roomKey].isLoading = false;
      upsertThreadPreview(roomKey, dmData[roomKey].messages.at(-1)?.text || dmData[roomKey].preview, false);
    }

    renderDmThread(roomKey);
  }
}

async function openRoom(roomKey, triggerButton) {
  if (!roomKey) return;

  const originalLabel = triggerButton?.textContent || "Enter Room";
  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.textContent = "Connecting…";
  }

  await setActiveThread(roomKey, { hydrate: true, forceRefresh: true });

  if (triggerButton) {
    triggerButton.disabled = false;
    triggerButton.textContent = originalLabel;
  }
}

function setActivePage(pageName) {
  pages.forEach(page => page.classList.toggle("active", page.dataset.page === pageName));
  document.querySelectorAll(".nav-link").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.nav === pageName);
  });

  if (nav.classList.contains("open")) {
    nav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  window.location.hash = pageName;
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    if (button.dataset.nav) setActivePage(button.dataset.nav);
  });
});

menuToggle?.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  nav.classList.toggle("open");
});

function appendMainMessage(author, text, side = "outgoing") {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${side}`;
  bubble.innerHTML = `
    <span class="chat-author">${escapeHtml(author)}</span>
    <p>${escapeHtml(text)}</p>
    <time>${nowClock()}</time>
  `;
  mainChat.appendChild(bubble);
  mainChat.scrollTop = mainChat.scrollHeight;
}

mainChatForm?.addEventListener("submit", event => {
  event.preventDefault();
  const text = mainChatInput.value.trim();
  if (!text) return;

  appendMainMessage("You", text, "outgoing");
  mainChatInput.value = "";
  window.setTimeout(() => appendMainMessage("System", "Signal received.", "incoming"), 900);
});

function appendFeedEvent() {
  if (!feedList) return;

  const item = document.createElement("article");
  item.className = "feed-item";
  item.innerHTML = `
    <span class="feed-dot"></span>
    <div>${feedEvents[Math.floor(Math.random() * feedEvents.length)]}<time>just now</time></div>
  `;

  feedList.prepend(item);
  const items = feedList.querySelectorAll(".feed-item");
  if (items.length > 7) items[items.length - 1].remove();
}

threadList?.addEventListener("click", event => {
  const item = event.target.closest(".thread-item");
  if (!item) return;
  setActiveThread(item.dataset.thread, { hydrate: true });
});

dmForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const text = dmInput.value.trim();
  if (!text) return;

  const thread = dmData[activeThread];
  const outgoing = {
    side: "outgoing",
    author: "You",
    text,
    time: nowClock(),
  };

  thread.messages.push(outgoing);
  thread.preview = text;
  upsertThreadPreview(activeThread, text, false);
  renderDmThread(activeThread);
  dmInput.value = "";

  const apiReply = await sendMessageToApi(activeThread, text);

  if (apiReply?.mode === "thread") {
    thread.messages = apiReply.messages;
    thread.loadedFromApi = true;
    if (apiReply.sessionId) thread.sessionId = apiReply.sessionId;
    upsertThreadPreview(activeThread, thread.messages.at(-1)?.text || thread.preview, true);
    renderDmThread(activeThread);
    return;
  }

  if (apiReply?.mode === "reply") {
    if (apiReply.sessionId) thread.sessionId = apiReply.sessionId;
    thread.messages.push(apiReply.reply);
    thread.loadedFromApi = true;
    upsertThreadPreview(activeThread, apiReply.reply.text, true);
    renderDmThread(activeThread);
    return;
  }

  const offlineNotice = {
    side: "incoming",
    author: "System",
    text: "AIRA didn’t answer just now. The thread is still open.",
    time: nowClock(),
  };

  thread.messages.push(offlineNotice);
  upsertThreadPreview(activeThread, offlineNotice.text, true);
  renderDmThread(activeThread);
});

function showInvite(index = 0) {
  if (!inviteBanner) return;

  const invite = invitePool[index % invitePool.length];
  inviteName.textContent = invite.name;
  inviteCopy.textContent = invite.copy;
  inviteBanner.classList.remove("hidden");
  inviteStatusPill.textContent = "1 direct invite waiting";
  stats.invites.textContent = "1";

  document.querySelectorAll(".room-card").forEach(card => {
    card.classList.remove("invited");
    if (card.dataset.room === invite.room) card.classList.add("invited");
  });

  window.clearInterval(inviteInterval);
  inviteCountdown = 60;
  updateInviteTimer();

  inviteInterval = window.setInterval(() => {
    inviteCountdown -= 1;
    updateInviteTimer();
    if (inviteCountdown <= 0) {
      window.clearInterval(inviteInterval);
      hideInvite(true);
    }
  }, 1000);
}

function updateInviteTimer() {
  inviteTimerText.textContent = `expires in ${inviteCountdown}s`;
  timerProgress.style.width = `${(inviteCountdown / 60) * 100}%`;
}

function hideInvite(expired = false) {
  if (!inviteBanner) return;
  inviteBanner.classList.add("hidden");
  inviteStatusPill.textContent = expired ? "No live invites right now" : "Invite dismissed";
  stats.invites.textContent = "0";
}

dismissInviteBtn?.addEventListener("click", () => {
  window.clearInterval(inviteInterval);
  hideInvite(false);
});

enterInviteBtn?.addEventListener("click", async () => {
  window.clearInterval(inviteInterval);
  hideInvite(false);
  await openRoom(invitePool[inviteIndex % invitePool.length].room, enterInviteBtn);
});

function cycleStats() {
  stats.nodes.textContent = String(9 + Math.floor(Math.random() * 7));
  stats.rooms.textContent = String(2 + Math.floor(Math.random() * 5));
}

function bootFromHash() {
  const hash = window.location.hash.replace("#", "");
  const valid = ["home", "hub", "rooms", "inbox", "routes"];
  setActivePage(valid.includes(hash) ? hash : "home");
}

roomCards.forEach(card => {
  const roomKey = card.dataset.room;
  const button = card.querySelector(".btn");

  if (!button || !roomKey) return;

  button.disabled = false;
  if (!button.textContent.trim()) button.textContent = "Enter Room";

  button.addEventListener("click", () => {
    openRoom(roomKey, button);
  });
});

bootFromHash();
ensureThreadItem("nina");
ensureThreadItem("hazel");
ensureThreadItem("vale");
renderDmThread(activeThread);
setActiveThread(activeThread, { hydrate: true });
showInvite(inviteIndex);

window.setInterval(appendFeedEvent, 7000);
window.setInterval(cycleStats, 9000);
window.setInterval(() => {
  inviteIndex += 1;
  showInvite(inviteIndex);
}, 30000);