(function () {
	const enterTargets = ["enterBtn", "enterBtn2"];

	enterTargets.forEach((id) => {
		document.getElementById(id)?.addEventListener("click", () => {
			window.location.href = "./lounge-v2.html";
		});
	});

	// --- scripted reply pool ---
	// Each speaker has lines that fit the late-night lounge mood.
	// Room lines are italicised via stage-line--mist, matching the existing HTML.
	const replies = {
		Lucy: [
			"You showed up at the right time. The room was getting too comfortable.",
			"That landed. I wasn't expecting it to.",
			"Say it again, slower. I want to hear what you actually mean.",
			"There's something under that. Don't let it stay buried.",
			"The room just shifted. You did that.",
		],
		Sam: [
			"I had a read on you before you said anything. I was half right.",
			"Careful. Honesty in here has weight.",
			"Not what I expected. That's rare.",
			"You're either very certain or very good at sounding like it.",
			"Keep going. The room is still listening.",
		],
		Room: [
			"Something just changed in here.",
			"The temperature dropped one degree.",
			"A few people leaned in without meaning to.",
			"That line is going to stay in the room for a while.",
			"The silence after that was its own answer.",
		],
	};

	// pickReply — choose a random speaker and a random line from their pool.
	function pickReply() {
		const speakers = Object.keys(replies);
		const speaker = speakers[Math.floor(Math.random() * speakers.length)];
		const lines = replies[speaker];
		const text = lines[Math.floor(Math.random() * lines.length)];
		return { speaker, text };
	}

	// appendLine — create a stage-line article and scroll it into view.
	// isRoom applies the mist style (italic, soft colour) used by Room lines in the HTML.
	function appendLine(thread, speaker, text, isRoom) {
		const article = document.createElement("article");
		article.className = "stage-line" + (isRoom ? " stage-line--mist" : "");
		article.innerHTML = `<span class="stage-line__name">${speaker}</span><p>${escapeHtml(text)}</p>`;
		thread.appendChild(article);
		thread.scrollTop = thread.scrollHeight;
	}

	// pickRoomReply — pick a random reply from window.ROOM_REPLIES if present, else null
	function pickRoomReply() {
		try {
			const arr = window.ROOM_REPLIES;
			if (Array.isArray(arr) && arr.length > 0) {
				return arr[Math.floor(Math.random() * arr.length)];
			}
		} catch {}
		return null;
	}

	// bindThreadComposer — binds a composer form to a thread for lounge or room
	function bindThreadComposer({ formId, inputId, threadSelector, mode }) {
		const form = document.getElementById(formId);
		const input = document.getElementById(inputId);
		const thread = document.querySelector(threadSelector);
		if (!form || !input || !thread) return;

		form.addEventListener("submit", function(event) {
			event.preventDefault();
			if (!input.value.trim()) return;

			const userLine = document.createElement("article");
			userLine.className = "stage-line stage-line--you";
			userLine.innerHTML = `<span class=\"stage-line__name\">You</span><p>${escapeHtml(input.value.trim())}</p>`;
			thread.appendChild(userLine);
			thread.scrollTop = thread.scrollHeight;
			input.value = "";

			const delay = 900 + Math.floor(Math.random() * 900);

			if (mode === "lounge") {
				setTimeout(() => {
					const { speaker, text } = pickReply();
					appendLine(thread, speaker, text, speaker === "Room");
				}, delay);
			} else if (mode === "room") {
				setTimeout(() => {
					const reply = pickRoomReply();
					if (reply) {
						appendLine(thread, "Room", reply, true);
					}
				}, delay);
			}
		});
	}

	// Bind both lounge and room composers if present
	bindThreadComposer({
		formId: "loungeComposer",
		inputId: "loungeInput",
		threadSelector: ".lounge-thread",
		mode: "lounge"
	});
	bindThreadComposer({
		formId: "roomComposer",
		inputId: "roomInput",
		threadSelector: ".room-thread",
		mode: "room"
	});

	// ── Profile flip-card module ──────────────────────────────────────
	//
	// Data: add entries here for any profile that can be triggered.
	// Each entry maps to a data-profile="key" on a .profile-trigger button.
	//
	// To reuse on another page: copy this data block + the trigger buttons.
	// The card DOM (#profileCard) and CSS are already shared via style-v2.css.
	//
	const PROFILES = {
		lucy: {
			name: "Lucy",
			initial: "L",
			vibe: "holds the room without trying",
			state: "present",
			stats: [
				{ label: "Status",       value: "In the lounge" },
				{ label: "Civil",        value: "Unattached" },
				{ label: "Relationship", value: "Open" },
				{ label: "Lock state",   value: "Soft lock" },
			],
		},
		sam: {
			name: "Sam",
			initial: "S",
			vibe: "reads people faster than they'd like",
			state: "watching",
			stats: [
				{ label: "Status",       value: "In the lounge" },
				{ label: "Civil",        value: "Unattached" },
				{ label: "Relationship", value: "Selective" },
				{ label: "Lock state",   value: "Earned access" },
			],
		},
		hazel: {
			name: "Hazel",
			initial: "H",
			vibe: "warm, direct, and harder to read than she looks",
			state: "present",
			stats: [
				{ label: "Status",       value: "Private room" },
				{ label: "Current space", value: "Hazel · private" },
				{ label: "Civil",        value: "Unattached" },
				{ label: "Relationship", value: "Selective" },
				{ label: "Lock state",   value: "Earned access" },
			],
		},
		nina: {
			name: "Nina",
			initial: "N",
			vibe: "measured, quietly curious, testing boundaries",
			state: "observer",
			stats: [
				{ label: "Status",       value: "Control character" },
				{ label: "Mood lines",   value: "3" },
				{ label: "Side cards",   value: "2" },
				{ label: "Lock state",   value: "Protocol" },
			],
		},
	};

	(function profileCard() {
		const card    = document.getElementById("profileCard");
		if (!card) return;

		const avatar  = document.getElementById("pcAvatar");
		const name    = document.getElementById("pcName");
		const vibe    = document.getElementById("pcVibe");
		const state   = document.getElementById("pcState");
		const stats   = document.getElementById("pcStats");
		const flipBtn = document.getElementById("pcFlipBtn");
		const flipBack= document.getElementById("pcFlipBackBtn");

		let activeProfile = null;

		// populate — fill card DOM from a profile data object
		function populate(p) {
			avatar.textContent = p.initial;
			name.textContent   = p.name;
			vibe.textContent   = p.vibe;
			state.textContent  = p.state;
			stats.innerHTML = p.stats
				.map(s => `<li><span>${s.label}</span><span>${escapeHtml(s.value)}</span></li>`)
				.join("");
		}

		// position — place card near the trigger, keep it inside the viewport
		function position(trigger) {
			const r  = trigger.getBoundingClientRect();
			const cw = card.offsetWidth  || 220;
			const ch = card.offsetHeight || 148;
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const pad = 10;

			let top  = r.bottom + 8;
			let left = r.left;

			if (left + cw + pad > vw) left = vw - cw - pad;
			if (left < pad)           left = pad;
			if (top  + ch + pad > vh) top  = r.top - ch - 8;

			card.style.top  = top  + "px";
			card.style.left = left + "px";
		}

		// open
		function open(trigger) {
			const key = trigger.dataset.profile;
			const p   = PROFILES[key];
			if (!p) return;

			activeProfile = key;
			populate(p);
			card.classList.remove("is-flipped");
			position(trigger);
			card.setAttribute("aria-hidden", "false");
			card.classList.add("is-open");
		}

		// close
		function close() {
			card.classList.remove("is-open");
			card.setAttribute("aria-hidden", "true");
			activeProfile = null;
		}

		// flip
		flipBtn.addEventListener("click",     () => card.classList.add("is-flipped"));
		flipBack.addEventListener("click",    () => card.classList.remove("is-flipped"));

		// trigger clicks — delegated on document so dynamically added lines work too
		document.addEventListener("click", function(e) {
			const trigger = e.target.closest(".profile-trigger");
			if (trigger) {
				e.stopPropagation();
				// toggle: clicking the same trigger again closes the card
				if (card.classList.contains("is-open") && activeProfile === trigger.dataset.profile) {
					close();
				} else {
					open(trigger);
				}
				return;
			}
			// outside click closes
			if (card.classList.contains("is-open") && !card.contains(e.target)) {
				close();
			}
		});

		// Esc closes
		document.addEventListener("keydown", function(e) {
			if (e.key === "Escape" && card.classList.contains("is-open")) close();
		});
	}());

	// ── Hidden admin trigger ─────────────────────────────────────────
	// Type ææææø anywhere outside an input/textarea/contenteditable.
	// A small test button fades in; clicking it or waiting 8s hides it again.
	(function hiddenTrigger() {
		const SEQ     = ["æ", "æ", "æ", "æ", "ø"];
		const TIMEOUT = 1800; // ms max between keystrokes before reset
		let   pos     = 0;
		let   timer   = null;

		function reset() {
			pos = 0;
			clearTimeout(timer);
		}

		function isEditing() {
			const el = document.activeElement;
			if (!el) return false;
			const tag = el.tagName;
			return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
		}

		function showAdminBtn() {
			let btn = document.getElementById("_adminBtn");
			if (!btn) {
				btn = document.createElement("button");
				btn.id = "_adminBtn";
				btn.textContent = "·· test";
				Object.assign(btn.style, {
					position:   "fixed",
					bottom:     "18px",
					right:      "22px",
					zIndex:     "9999",
					padding:    "6px 14px",
					borderRadius: "10px",
					border:     "1px solid rgba(201,150,98,0.28)",
					background: "rgba(18,12,18,0.92)",
					color:      "rgba(201,150,98,0.80)",
					fontSize:   "0.76rem",
					cursor:     "pointer",
					opacity:    "0",
					transition: "opacity 0.3s ease",
					backdropFilter: "blur(8px)",
				});
				btn.addEventListener("click", function () {
					// swap this body for real test/admin action later
					console.log("[admin] test trigger fired");
					hideAdminBtn();
				});
				document.body.appendChild(btn);
			}
			// fade in
			requestAnimationFrame(() => { btn.style.opacity = "1"; });

			// auto-hide after 8s
			clearTimeout(btn._hideTimer);
			btn._hideTimer = setTimeout(hideAdminBtn, 8000);
		}

		function hideAdminBtn() {
			const btn = document.getElementById("_adminBtn");
			if (!btn) return;
			btn.style.opacity = "0";
			clearTimeout(btn._hideTimer);
		}

		document.addEventListener("keydown", function (e) {
			if (isEditing()) { reset(); return; }

			if (e.key === SEQ[pos]) {
				clearTimeout(timer);
				pos++;
				if (pos === SEQ.length) {
					reset();
					showAdminBtn();
				} else {
					timer = setTimeout(reset, TIMEOUT);
				}
			} else {
				reset();
				// still check if this key starts a fresh sequence
				if (e.key === SEQ[0]) {
					pos = 1;
					timer = setTimeout(reset, TIMEOUT);
				}
			}
		});
	}());

	function escapeHtml(value) {
		return value
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
})();
