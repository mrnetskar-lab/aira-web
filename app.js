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
const threadItems = document.querySelectorAll(".thread-item");
const dmThread = document.getElementById("dmThread");
const dmName = document.getElementById("dmName");
const dmStatus = document.getElementById("dmStatus");
const dmAvatar = document.getElementById("dmAvatar");
const dmForm = document.getElementById("dmForm");
const dmInput = document.getElementById("dmInput");
const stats = {
  nodes: document.getElementById("statNodes"),
  rooms: document.getElementById("statRooms"),
  invites: document.getElementById("statInvites"),
};

const dmData = {
  nina: {
    name: "Nina", avatar: "N", status: "online now",
    messages: [
      { side: "incoming", author: "Nina", text: "I'm still here.", time: "20:38" },
      { side: "outgoing", author: "You", text: "I saw the room light up.", time: "20:39" },
      { side: "incoming", author: "Nina", text: "Then stop hovering and enter.", time: "20:40" },
    ],
  },
  hazel: {
    name: "Hazel", avatar: "H", status: "active 9m ago",
    messages: [
      { side: "incoming", author: "Hazel", text: "Ignore that if you want.", time: "20:21" },
      { side: "incoming", author: "Hazel", text: "I know you still read everything twice.", time: "20:22" },
    ],
  },
  vale: {
    name: "Vale", avatar: "V", status: "invite only",
    messages: [
      { side: "incoming", author: "Vale", text: "Room's open.", time: "now" },
      { side: "incoming", author: "Vale", text: "Not for long.", time: "now" },
    ],
  },
};

const invitePool = [
  { name: "Nina", copy: "Come back. I want to finish that conversation.", room: "nina" },
  { name: "Hazel", copy: "You disappeared too early.", room: "hazel" },
  { name: "Iris", copy: "There's something I only say in private.", room: "iris" },
];

let activeThread = "nina";
let inviteCountdown = 60;
let inviteInterval = null;
let inviteIndex = 0;

function setActivePage(pageName) {
  pages.forEach(page => page.classList.toggle("active", page.dataset.page === pageName));
  document.querySelectorAll(".nav-link").forEach(btn => btn.classList.toggle("active", btn.dataset.nav === pageName));
  if (nav.classList.contains("open")) { nav.classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false"); }
  window.location.hash = pageName;
}

navButtons.forEach(btn => btn.addEventListener("click", () => { if (btn.dataset.nav) setActivePage(btn.dataset.nav); }));
menuToggle?.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  nav.classList.toggle("open");
});

function appendMainMessage(author, text, side = "outgoing") {
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble " + side;
  bubble.innerHTML = "<span class=\"chat-author\">" + author + "</span><p>" + text + "</p><time>" + new Date().toLocaleTimeString("no-NO", {hour:"2-digit",minute:"2-digit"}) + "</time>";
  mainChat.appendChild(bubble);
  mainChat.scrollTop = mainChat.scrollHeight;
}

mainChatForm?.addEventListener("submit", e => {
  e.preventDefault();
  const text = mainChatInput.value.trim();
  if (!text) return;
  appendMainMessage("You", text, "outgoing");
  mainChatInput.value = "";
  setTimeout(() => appendMainMessage("System", "Signal received.", "incoming"), 900);
});

const feedEvents = [
  "<strong>Iris</strong> opened a private route",
  "<strong>Nina</strong> started typing in DMs",
  "<strong>Hazel</strong> went idle",
  "<strong>Vale</strong> marked a room invite-only",
  "A live invite entered the grid",
];

function appendFeedEvent() {
  if (!feedList) return;
  const item = document.createElement("article");
  item.className = "feed-item";
  item.innerHTML = "<span class=\"feed-dot\"></span><div>" + feedEvents[Math.floor(Math.random()*feedEvents.length)] + "<time>just now</time></div>";
  feedList.prepend(item);
  const items = feedList.querySelectorAll(".feed-item");
  if (items.length > 7) items[items.length-1].remove();
}

function renderDmThread(key) {
  const thread = dmData[key];
  if (!thread || !dmThread) return;
  dmName.textContent = thread.name;
  dmStatus.textContent = thread.status;
  dmAvatar.textContent = thread.avatar;
  dmAvatar.className = "avatar avatar-" + key;
  dmThread.innerHTML = "";
  thread.messages.forEach(msg => {
    const b = document.createElement("div");
    b.className = "chat-bubble " + msg.side;
    b.innerHTML = "<span class=\"chat-author\">" + msg.author + "</span><p>" + msg.text + "</p><time>" + msg.time + "</time>";
    dmThread.appendChild(b);
  });
  dmThread.scrollTop = dmThread.scrollHeight;
}

threadItems.forEach(item => {
  item.addEventListener("click", () => {
    threadItems.forEach(b => b.classList.remove("active"));
    item.classList.add("active");
    activeThread = item.dataset.thread;
    renderDmThread(activeThread);
  });
});

dmForm?.addEventListener("submit", e => {
  e.preventDefault();
  const text = dmInput.value.trim();
  if (!text) return;
  dmData[activeThread].messages.push({ side: "outgoing", author: "You", text, time: new Date().toLocaleTimeString("no-NO", {hour:"2-digit",minute:"2-digit"}) });
  renderDmThread(activeThread);
  dmInput.value = "";
  setTimeout(() => {
    dmData[activeThread].messages.push({ side: "incoming", author: dmData[activeThread].name, text: "Seen.", time: new Date().toLocaleTimeString("no-NO", {hour:"2-digit",minute:"2-digit"}) });
    renderDmThread(activeThread);
  }, 1100);
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
  clearInterval(inviteInterval);
  inviteCountdown = 60;
  updateInviteTimer();
  inviteInterval = setInterval(() => {
    inviteCountdown -= 1;
    updateInviteTimer();
    if (inviteCountdown <= 0) { clearInterval(inviteInterval); hideInvite(true); }
  }, 1000);
}

function updateInviteTimer() {
  inviteTimerText.textContent = "fades in " + inviteCountdown + "s";
  timerProgress.style.width = (inviteCountdown / 60 * 100) + "%";
}

function hideInvite(expired = false) {
  if (!inviteBanner) return;
  inviteBanner.classList.add("hidden");
  inviteStatusPill.textContent = expired ? "No live invites right now" : "Invite dismissed";
  stats.invites.textContent = "0";
}

dismissInviteBtn?.addEventListener("click", () => { clearInterval(inviteInterval); hideInvite(false); });
enterInviteBtn?.addEventListener("click", () => { clearInterval(inviteInterval); setActivePage("inbox"); hideInvite(false); });

function cycleStats() {
  stats.nodes.textContent = String(9 + Math.floor(Math.random() * 7));
  stats.rooms.textContent = String(2 + Math.floor(Math.random() * 5));
}

function bootFromHash() {
  const hash = window.location.hash.replace("#", "");
  const valid = ["home","hub","rooms","inbox","routes"];
  setActivePage(valid.includes(hash) ? hash : "home");
}

bootFromHash();
renderDmThread(activeThread);
showInvite(inviteIndex);
setInterval(appendFeedEvent, 7000);
setInterval(cycleStats, 9000);
setInterval(() => { inviteIndex += 1; showInvite(inviteIndex); }, 30000);