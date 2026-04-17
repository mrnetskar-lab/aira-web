# Aira Web — Client

## Active files

| File | Purpose |
|---|---|
| `index.html` | Homepage — open directly in browser |
| `lounge-v2.html` | Live lounge room |
| `style-v2.css` | All shared styles — homepage, lounge, room shell |
| `app-v2.js` | Lounge JS — enter buttons, composer, scripted replies |
| `room-shell.js` | Shared JS wiring for all generated private rooms |
| `templates/room-template.html` | Source template — do not edit directly, copy via bat |
| `new-room.bat` | Room scaffolder — run this to create a new room file |

## Legacy files — do not use as defaults

| File | Notes |
|---|---|
| `style.css` / `app.js` | Replaced by v2 versions |
| `hazel-room.html` / `nina-room.html` | Custom standalones, not on room-shell standard |
| `inbox.html`, `routes.html`, `discover.html` | Standalone experiments, not in active path |
| `archive/` | Old experiments and backups — not active |

---

## File structure

```
client/
  index.html
  lounge-v2.html
  style-v2.css
  app-v2.js
  room-shell.js
  new-room.bat
  README.md
  templates/
    room-template.html      source — do not edit
  archive/
    experiments-v2/
    legacy-shell/
    generated-backups/      .bak files written by new-room.bat
```

---

## Creating a new room

**Manual steps:**

1. Run `new-room.bat` from `d:\V3\Aira_web\client`
2. Enter a room id — lowercase, hyphenated (e.g. `maya-room`)
3. Enter a display title (e.g. `Maya · Late Night`)
4. Open the generated `maya-room.html`
5. Edit the content blocks marked with comments (see below)
6. Add a theme block to `style-v2.css` (see below)

**What the bat does:**
- Copies `templates/room-template.html` to `{room-id}.html`
- Replaces `__ROOM_ID__`, `__ROOM_TITLE__`, `__ROOM_CLASS__` in the copy
- Writes a `.bak` to `archive/generated-backups/`

---

## Safe editing rules

### Safe to change per room

| Element | Where |
|---|---|
| Room display title | `room-header__title` — already set by generator |
| Presence / mood lines | 3 `<span>` tags inside `room-presence` |
| Opening exchange | `stage-line` articles inside `room-thread` |
| Speaker name in thread | `stage-line__name` text and `ROOM_REPLIES` keys |
| Side panel card titles + body | `room-card__title` and `room-card__text` |
| Reply lines | `window.ROOM_REPLIES` object in the inline script |
| Theme colors | `--room-*` token block in `style-v2.css` |
| Room background atmosphere | `body.room` background gradient (optional) |

### Do not change without good reason

| Element | Why it must stay stable |
|---|---|
| All `room-*` class names | CSS and room-shell.js depend on them |
| Shell structure order | `room-stage` → `room-header` → `room-presence` → `room-thread` → `room-composer` → `room-side` |
| `id="roomComposer"` | room-shell.js hooks the form by this id |
| `id="roomInput"` | room-shell.js reads input by this id |
| `id="roomThread"` | room-shell.js appends lines by this id |
| `<script src="../room-shell.js">` | Must be last, after `window.ROOM_REPLIES` |
| Placeholder tokens `__ROOM_ID__` / `__ROOM_TITLE__` / `__ROOM_CLASS__` | Bat automation replaces these exactly |
| `[ROOM_THEMES_START]` / `[ROOM_THEMES_END]` markers in CSS | Automation anchor for inserting new theme blocks |

---

## Adding character replies

In the generated file, edit the `window.ROOM_REPLIES` block before `room-shell.js`:

```html
<script>
  window.ROOM_REPLIES = {
    Maya: [
      "You say that like you mean it.",
      "I noticed you paused before answering.",
      "Keep going. I'm still here.",
      "That's an honest answer.",
    ],
    Room: [
      "Something shifted just now.",
      "The air got a little heavier.",
    ],
  };
</script>
<script src="../room-shell.js"></script>
```

- "Room" lines render in mist style (italic, soft colour) automatically.
- If `window.ROOM_REPLIES` is absent, `room-shell.js` uses a generic Room fallback.

---

## Adding a color theme

In `style-v2.css`, between `[ROOM_THEMES_START]` and `[ROOM_THEMES_END]`, add:

```css
.room--maya-room {
  --room-bg:          #0c0b0f;
  --room-panel:       #16141a;
  --room-text:        #f1edf6;
  --room-text-soft:   rgba(241,237,246,0.65);
  --room-accent:      #a98ecf;
  --room-accent-2:    #8a6fb0;
  --room-accent-soft: rgba(169,142,207,0.14);
}
```

The class name must be `room--{room-id}` — matching what the generator set on `<body>`.

Required tokens: `--room-bg`, `--room-text`, `--room-text-soft`, `--room-accent`, `--room-accent-2`, `--room-accent-soft`.
Optional: `--room-panel` (used by future card improvements).

---

## Future automation notes

The structure is designed to be easy to automate later, but it is intentionally manual-first.

When `master_v1.bat` is built, it will do what you'd otherwise do by hand:
1. Run the same copy + token-replace that `new-room.bat` already does
2. Find the `[ROOM_THEMES_START]` / `[ROOM_THEMES_END]` markers in `style-v2.css` and insert a new theme block between them
3. Find `window.ROOM_REPLIES` in the generated file and let you fill in reply lines

Until then, do those three steps manually. The markers are just there so the bat has reliable anchors when it's written — they don't affect anything by hand.

---

## Mindset

```
fixed shell  +  replaceable content block  +  replaceable theme block
```

The shell never changes. The content (presence lines, starter messages, reply lines, card text) is swapped per room. The theme (CSS token block) is added per room. That's the whole system.
