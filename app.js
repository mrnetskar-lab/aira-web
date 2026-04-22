const threadList = document.getElementById("threadList");
const chatMessages = document.getElementById("chatMessages");
const galleryGrid = document.getElementById("galleryGrid");
const detailView = document.getElementById("detailView");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

const threads = [
  "Nina", "Hazel", "Iris", "Vale", "Selene", "Mara", "Echo", "Rin", "Oriel", "Lux", "Nova", "Kora",
];

for (let i = 0; i < 30; i += 1) {
  const thread = document.createElement("article");
  const name = threads[i % threads.length];
  thread.className = "card";
  thread.innerHTML = `<strong>${name}</strong><div>Last signal ${i + 1}m ago</div>`;
  threadList.appendChild(thread);
}

for (let i = 0; i < 35; i += 1) {
  const message = document.createElement("article");
  message.className = "message";
  message.innerHTML = `<strong>${i % 2 === 0 ? "Nina" : "You"}</strong><p>Message packet #${i + 1}</p>`;
  chatMessages.appendChild(message);
}

for (let i = 0; i < 48; i += 1) {
  const tile = document.createElement("article");
  tile.className = "tile";
  tile.textContent = `Capture ${String(i + 1).padStart(2, "0")}`;
  galleryGrid.appendChild(tile);
}

for (let i = 0; i < 28; i += 1) {
  const detail = document.createElement("article");
  detail.className = "card";
  detail.innerHTML = `<strong>Live node ${i + 1}</strong><div>Status pulse nominal.</div>`;
  detailView.appendChild(detail);
}

chatForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  const message = document.createElement("article");
  message.className = "message";
  message.innerHTML = `<strong>You</strong><p>${text}</p>`;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatInput.value = "";
});

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((node) => node.classList.remove("is-active"));
    button.classList.add("is-active");
  });
});
