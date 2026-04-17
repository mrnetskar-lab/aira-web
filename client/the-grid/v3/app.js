const AIRA_API_BASE = "";

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

const roomCards = document.querySelectorAll(".room-card");
const threadList = document.querySelector(".thread-list");
const dmThread = document.getElementById("dmThread");
const dmName = document.getElementById("dmName");
const dmStatus = document.getElementById("dmStatus");
const dmAvatar = document.getElementById("dmAvatar");
const dmForm = document.getElementById("dmForm");
const dmInput = document.getElementById("dmInput");
const cameraBtn = document.getElementById('cameraBtn');

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
      { side: "incoming", author: "Nina", text: "I'm still here.", time: "20:38" },
      { side: "outgoing", author: "You", text: "I saw the room light up.", time: "20:39" },
      { side: "incoming", author: "Nina", text: "Then stop hovering and enter.", time: "20:40" },
    ],
    fallbackReplies: [
      "You always arrive right when the signal dips.",
      "Stay this time. Don't just glance in and leave.",
      "Good. Now say what pulled you back.",
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
    fallbackReplies: [
      "Noted. You never say the obvious part first.",
      "That's close, but not the real point.",
      "I figured you'd circle back to that.",
    ],
  },
  iris: {
    key: "iris",
    name: "Iris",
    avatar: "I",
    status: "listening",
    preview: "There's something she only says in private.",
    fallbackOpeners: [
      { side: "incoming", author: "Iris", text: "You made it in.", time: "20:31" },
      { side: "incoming", author: "Iris", text: "Keep your voice low. This thread opens better that way.", time: "20:32" },
    ],
    fallbackReplies: [
      "Stay with that thought. It opens something.",
      "You're closer than you think. Keep going.",
      "Say it plainly once. Then we'll know where this goes.",
    ],
  },
  vale: {
    key: "vale",
    name: "Vale",
    avatar: "V",
    status: "invite only",
    preview: "Room's open.",
    fallbackOpeners: [
      { side: "incoming", author: "Vale", text: "Room's open.", time: "now" },
      { side: "incoming", author: "Vale", text: "Not for long.", time: "now" },
    ],
    fallbackReplies: [
      "Good. Keep pace or the room closes.",
      "You're in. Don't waste the opening.",
      "Move quickly. This thread doesn't stay unlocked.",
    ],
  },
};

const threadState = Object.fromEntries(
  Object.values(characterDirectory).map(character => [
    character.key,
    {
      name: character.name,
      avatar: character.avatar,
      status: character.status,
      preview: character.preview,
      messages: [...character.fallbackOpeners],
      loadedFromApi: false,
      isLoading: false,
      sessionId: null,
    },
  ]),
);

const invitePool = [
  { name: "Nina", copy: "Come back. I want to finish that conversation.", room: "nina" },
  { name: "Hazel", copy: "You disappeared too early.", room: "hazel" },
  { name: "Iris", copy: "There's something I only say in private.", room: "iris" },
  { name: "Vale", copy: "Room's open. Don't let it cool.", room: "vale" },
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

function getLastMessage(messages) {
  return Array.isArray(messages) && messages.length ? messages[messages.length - 1] : null;
}

function toDisplayTime(value) {
  if (!value) return nowClock();
  if (typeof value === "string") return value.trim() || nowClock();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowClock();

  return date.toLocaleTimeString("no-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const hash = window.location.hash.replace("#", "");
  const valid = ["home", "hub", "rooms", "inbox", "routes"];
  setActivePage(valid.includes(hash) ? hash : "home");
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    const navTarget = button.dataset.nav;
    const room = button.dataset.room;
    if (!navTarget) return;

    if (room) {
      if (threadState[room]) {
        focusThread(room);
        hydrateThread(room, false);
      }
      setActivePage(navTarget);
      return;
    }

    setActivePage(navTarget);
  });
});

menuToggle?.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  nav.classList.toggle("open");
});

function appendMainMessage(author, text, side = "outgoing") {
  if (!mainChat) return;

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${side}`;
  bubble.innerHTML = `
    <span class="chat-author">${escapeHtml(author)}</span>
    <p>${renderMessageText(text)}</p>
    <time>${escapeHtml(nowClock())}</time>
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

  window.setTimeout(() => {
    appendMainMessage("System", "Signal received.", "incoming");
  }, 900);
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
  if (items.length > 7) {
    items[items.length - 1].remove();
  }
}

function ensureThreadButton(roomKey) {
  let button = threadList?.querySelector(`.thread-item[data-thread="${roomKey}"]`);
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
  return button;
}

function setThreadActive(roomKey) {
  document.querySelectorAll(".thread-item").forEach(item => {
    item.classList.toggle("active", item.dataset.thread === roomKey);
  });
}

function setThreadUnread(roomKey, unread) {
  const button = ensureThreadButton(roomKey);
  if (!button) return;

  const meta = button.querySelector(".thread-meta");
  const dot = button.querySelector(".unread-dot");

  if (unread && !dot) {
    const unreadDot = document.createElement("span");
    unreadDot.className = "unread-dot";
    meta?.appendChild(unreadDot);
  }

  if (!unread && dot) {
    dot.remove();
  }
}

function updateThreadPreview(roomKey, previewText, timeText = "now") {
  const button = ensureThreadButton(roomKey);
  if (!button) return;

  const preview = button.querySelector(".thread-copy p");
  const time = button.querySelector(".thread-meta span");

  if (preview) preview.textContent = previewText;
  if (time) time.textContent = timeText;
}

function renderDmThread(roomKey) {
  const thread = threadState[roomKey];
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

function focusThread(roomKey) {
  activeThread = roomKey;
  setThreadActive(roomKey);
  setThreadUnread(roomKey, false);
  renderDmThread(roomKey);
}

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
  const role = normalizeString(
    message?.role ||
    message?.sender ||
    message?.type ||
    ""
  ).toLowerCase();

  const author = normalizeString(
    message?.author ||
    message?.speaker ||
    message?.name ||
    ""
  ).toLowerCase();

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

  return list
    .map(item => {
      const text = normalizeText(
        item?.text ??
        item?.content ??
        item?.message ??
        item?.body ??
        item
      );

      if (!text) return null;

      const side = inferMessageSide(roomKey, item);
      const author = normalizeString(
        item?.author ||
        item?.speaker ||
        item?.name ||
        (side === "incoming" ? characterDirectory[roomKey].name : "You"),
        side === "incoming" ? characterDirectory[roomKey].name : "You"
      );

      return {
        side,
        author,
        text,
        time: toDisplayTime(
          item?.time ??
          item?.createdAt ??
          item?.timestamp ??
          item?.sentAt
        ),
      };
    })
    .filter(Boolean);
}

function normalizeOpenRoomPayload(roomKey, payload) {
  const base = characterDirectory[roomKey];
  const messages = normalizeMessages(roomKey, payload);

  const singleReply = normalizeText(
    payload?.reply ??
    payload?.message ??
    payload?.response ??
    payload?.content ??
    payload?.assistant
  );

  const finalMessages = messages.length
    ? messages
    : singleReply
      ? [{
          side: "incoming",
          author: base.name,
          text: singleReply,
          time: nowClock(),
        }]
      : [...base.fallbackOpeners];

  return {
    name: normalizeString(payload?.name || payload?.character?.name, base.name),
    avatar: normalizeString(payload?.avatar || payload?.character?.avatar, base.avatar),
    status: normalizeString(payload?.status || payload?.presence || payload?.character?.status, base.status),
    preview: normalizeString(payload?.preview || payload?.subtitle, base.preview),
    messages: finalMessages,
    sessionId: payload?.sessionId ?? payload?.threadId ?? payload?.conversationId ?? null,
    loadedFromApi: messages.length > 0 || Boolean(singleReply),
    isLoading: false,
  };
}

function normalizeReplyPayload(roomKey, payload) {
  const messages = normalizeMessages(roomKey, payload);

  if (messages.length) {
    return {
      mode: "thread",
      messages,
      sessionId: payload?.sessionId ?? payload?.threadId ?? payload?.conversationId ?? null,
    };
  }

  const text = normalizeText(
    payload?.reply ??
    payload?.message ??
    payload?.response ??
    payload?.content ??
    payload?.assistant
  );

  if (!text) return null;

  return {
    mode: "reply",
    reply: {
      side: "incoming",
      author: characterDirectory[roomKey].name,
      text,
      time: nowClock(),
    },
    sessionId: payload?.sessionId ?? payload?.threadId ?? payload?.conversationId ?? null,
  };
}

async function requestJson(url, options = {}, timeout = 9000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    const raw = await response.text();
    let json = null;

    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = null;
    }

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
    const url = `${AIRA_API_BASE}${candidate.path(roomKey)}`;
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
    const url = `${AIRA_API_BASE}${candidate.path(roomKey)}`;
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
  const replies = character?.fallbackReplies || ["Seen."];
  return replies[Math.floor(Math.random() * replies.length)];
}

async function hydrateThread(roomKey, forceRefresh = false) {
  const thread = threadState[roomKey];

  if (thread.loadedFromApi && !forceRefresh) return;

  thread.isLoading = true;
  renderDmThread(roomKey);

  const apiThread = await bootstrapRoomFromApi(roomKey);

  if (apiThread) {
    threadState[roomKey] = {
      ...threadState[roomKey],
      ...apiThread,
    };

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

  const originalLabel = triggerButton?.textContent || "Enter Room";

  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.textContent = "Connecting…";
  }

  ensureThreadButton(roomKey);
  setActivePage("inbox");
  focusThread(roomKey);
  await hydrateThread(roomKey, true);

  if (triggerButton) {
    triggerButton.disabled = false;
    triggerButton.textContent = originalLabel;
  }
}

threadList?.addEventListener("click", event => {
  const button = event.target.closest(".thread-item");
  if (!button) return;

  const roomKey = button.dataset.thread;
  if (!roomKey || !threadState[roomKey]) return;

  setActivePage("inbox");
  focusThread(roomKey);
  hydrateThread(roomKey, false);
});

dmForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const text = dmInput.value.trim();
  if (!text || !threadState[activeThread]) return;

  const thread = threadState[activeThread];

  const outgoing = {
    side: "outgoing",
    author: "You",
    text,
    time: nowClock(),
  };

  thread.messages.push(outgoing);
  updateThreadPreview(activeThread, text, outgoing.time);
  renderDmThread(activeThread);
  dmInput.value = "";

  const apiReply = await sendMessageToApi(activeThread, text);

  if (apiReply?.mode === "thread") {
    thread.messages = apiReply.messages;
    thread.loadedFromApi = true;

    if (apiReply.sessionId) {
      thread.sessionId = apiReply.sessionId;
    }

    const latest = getLastMessage(thread.messages);
    updateThreadPreview(activeThread, latest?.text || thread.preview, latest?.time || "now");
    setThreadUnread(activeThread, false);
    renderDmThread(activeThread);
    return;
  }

  if (apiReply?.mode === "reply") {
    if (apiReply.sessionId) {
      thread.sessionId = apiReply.sessionId;
    }

    thread.messages.push(apiReply.reply);
    thread.loadedFromApi = true;
    updateThreadPreview(activeThread, apiReply.reply.text, apiReply.reply.time);
    setThreadUnread(activeThread, false);
    renderDmThread(activeThread);
    return;
  }

  const fallbackReply = {
    side: "incoming",
    author: characterDirectory[activeThread].name,
    text: getFallbackReply(activeThread),
    time: nowClock(),
  };

  thread.messages.push(fallbackReply);
  updateThreadPreview(activeThread, fallbackReply.text, fallbackReply.time);
  setThreadUnread(activeThread, false);
  renderDmThread(activeThread);
});

// Camera button: capture image, send to server, show returned image in thread
cameraBtn?.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    stream.getTracks().forEach(t => t.stop());

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    const char = characterDirectory[activeThread];

    const res = await fetch('/api/camera/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `${char?.name || activeThread} reacts to what they see in the image`,
        imageBase64,
        character: activeThread
      })
    });
    const data = await res.json();
    const imageUrl = data?.imageUrl || (data?.shot && data.shot.path) || null;
    if (imageUrl) {
      const thread = threadState[activeThread];
      const imgMsg = {
        side: 'incoming',
        author: char?.name || activeThread,
        text: '',
        imageUrl,
        time: nowClock()
      };
      thread.messages.push(imgMsg);
      renderDmThread(activeThread);
    }
  } catch (err) {
    console.warn('Camera error:', err);
  }
});

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
    if (card.dataset.room === invite.room) {
      card.classList.add("invited");
    }
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

dismissInviteBtn?.addEventListener("click", () => {
  window.clearInterval(inviteInterval);
  hideInvite(false);
});

enterInviteBtn?.addEventListener("click", async () => {
  window.clearInterval(inviteInterval);
  hideInvite(false);

  const invite = invitePool[inviteIndex % invitePool.length];
  await openRoom(invite.room, enterInviteBtn);
});

function cycleStats() {
  stats.nodes.textContent = String(9 + Math.floor(Math.random() * 7));
  stats.rooms.textContent = String(2 + Math.floor(Math.random() * 5));
}

roomCards.forEach(card => {
  const roomKey = card.dataset.room;
  const button = card.querySelector(".btn");

  if (!button || !roomKey) return;

  button.disabled = false;
  button.textContent = "Enter Room";

  button.addEventListener("click", () => {
    openRoom(roomKey, button);
  });
});

bootFromHash();

Object.keys(characterDirectory).forEach(roomKey => {
  ensureThreadButton(roomKey);
});

focusThread(activeThread);
hydrateThread(activeThread, false);
showInvite(inviteIndex);

window.setInterval(appendFeedEvent, 7000);
window.setInterval(cycleStats, 9000);
window.setInterval(() => {
  inviteIndex += 1;
  showInvite(inviteIndex);
}, 30000);
