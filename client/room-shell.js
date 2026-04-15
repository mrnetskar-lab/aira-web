(function () {
  // room-shell.js — shared reply wiring for all generated rooms.
  // Each room page includes this file. Character replies are defined
  // in a window.ROOM_REPLIES object set before this script runs,
  // or fall back to the generic pool below.

  const FALLBACK_REPLIES = {
    Room: [
      "Something just shifted.",
      "The temperature dropped one degree.",
      "A few people leaned in without meaning to.",
      "The silence after that was its own answer.",
    ],
  };

  const pool = (typeof window.ROOM_REPLIES === "object" && window.ROOM_REPLIES)
    ? window.ROOM_REPLIES
    : FALLBACK_REPLIES;

  function pickReply() {
    const speakers = Object.keys(pool);
    const speaker = speakers[Math.floor(Math.random() * speakers.length)];
    const lines = pool[speaker];
    const text = lines[Math.floor(Math.random() * lines.length)];
    return { speaker, text };
  }

  function escapeHtml(v) {
    return String(v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function appendLine(thread, speaker, text, mist) {
    const el = document.createElement("article");
    el.className = "stage-line" + (mist ? " stage-line--mist" : "");
    el.innerHTML = `<span class="stage-line__name">${escapeHtml(speaker)}</span><p>${escapeHtml(text)}</p>`;
    thread.appendChild(el);
    thread.scrollTop = thread.scrollHeight;
  }

  const form   = document.getElementById("roomComposer");
  const input  = document.getElementById("roomInput");
  const thread = document.getElementById("roomThread");

  if (!form || !input || !thread) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) return;

    // user line
    const userEl = document.createElement("article");
    userEl.className = "stage-line stage-line--you";
    userEl.innerHTML = `<span class="stage-line__name">You</span><p>${escapeHtml(val)}</p>`;
    thread.appendChild(userEl);
    thread.scrollTop = thread.scrollHeight;
    input.value = "";

    // character reply after natural pause
    const delay = 900 + Math.floor(Math.random() * 900);
    setTimeout(function () {
      const { speaker, text } = pickReply();
      appendLine(thread, speaker, text, speaker === "Room");
    }, delay);
  });
})();
