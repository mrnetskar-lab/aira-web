# AIRA Web

A living AI room. Multiple characters, one shared scene, hidden tensions that grow over time.

---

## Vision

AIRA Web is not a chatbot. It is a social AI experience.

You enter a room with three characters — Lucy, Sam, and Angie. Each has their own personality, hidden emotions, and relationship with you. The room has tension that builds and decays. Something else is watching from the background — a presence that grows the longer you stay.

The goal is to make conversations feel like a real social moment, not a Q&A session.

**Core pillars:**
- One shared scene — not three separate chats
- Relationships that change over time
- A hidden presence (AIRA) that grows silently
- Mobile-first, minimal UI that stays out of the way

---

## The Team

| Role | Who | Responsibility |
|------|-----|----------------|
| Vision | Human | Final say on everything |
| Ideas + Design | ChatGPT | Context files, feature specs, UI direction |
| Builder | Claude | Implementation, code, deployment |

ChatGPT drops context files into `context/`. Claude implements them exactly.

---

## Characters

| Name | Tone | Personality |
|------|------|-------------|
| **Lucy** | Warm | Soft, emotionally aware, slightly mysterious |
| **Sam** | Guarded | Sharp, restrained, observant, skeptical |
| **Angie** | Playful | Light, charming, social, subtly insecure |

---

## Architecture

```
Request
  └── POST /api/ai/run
        └── SystemOrchestrator.run(input)
              ├── EmotionSystem        — updates tension from keywords
              ├── MemorySystem         — stores user message
              ├── buildContext()       — builds full context object for AI
              ├── RelationshipEngine   — updates trust/attraction/jealousy/hurt
              ├── AiraPresenceSystem   — grows silent background presence
              ├── AiraBrainController  — picks 1 primary + optional secondary responder
              │     └── CharacterAIService × 1-2  — calls gpt-4.1-mini
              ├── DualLayerSystem      — post-processes responses
              ├── MemorySystem         — stores AI responses
              ├── FocusSystem          — tracks last speaker
              ├── SimpleGM             — optional GM narration line
              └── AiraObserver         — flags issues, generates patch suggestions
```

---

## Key Files

### Server
| File | Job |
|------|-----|
| `server/index.js` | Express app, serves client, health endpoint |
| `server/routes/ai.js` | `/run`, `/state`, `/reset` endpoints |
| `server/services/openaiClient.js` | OpenAI client, reads `OPENAI_API_KEY` from `.env` |

### Engine Core
| File | Job |
|------|-----|
| `src/engine/createEngine.js` | Wires all systems together |
| `src/engine/core/SystemOrchestrator.js` | Main run loop — coordinates all systems |
| `src/engine/core/buildContext.js` | Builds session/world/relationship/memory context object |

### Brain
| File | Job |
|------|-----|
| `src/engine/brain/AiraBrainController.js` | Scene plan: selects primary + optional secondary responder |
| `src/engine/brain/characterProfiles.js` | Lucy, Sam, Angie personality definitions |
| `src/engine/services/CharacterAIService.js` | Calls OpenAI, enforces response length per mode |

### Systems
| File | Job |
|------|-----|
| `src/engine/systems/EmotionSystem.js` | Tension tracking (0–1) from input keywords |
| `src/engine/systems/MemorySystem.js` | Weighted time-decay conversation memory |
| `src/engine/systems/RelationshipEngine.js` | trust / attraction / jealousy / hurt per character |
| `src/engine/systems/AiraPresenceSystem.js` | Silent background presence — grows each turn |
| `src/engine/systems/FocusSystem.js` | Tracks which character last spoke |

### Client
| File | Job |
|------|-----|
| `client/index.html` | Two-view SPA — landing + room |
| `client/app.js` | Chat form, state rendering, chip buttons |
| `client/devPanel.js` | § key dev panel — shows live state, relationships, presence |
| `client/style.css` | Mobile-first dark theme, safe-area insets |

---

## Response Modes

| Mode | When | Length |
|------|------|--------|
| `brief` | Default | 4–18 words |
| `normal` | Emotional keywords or tension > 0.75 | 1–3 sentences |
| `cinematic` | Special narrative beats | Up to 5 sentences |

Secondary responders are always forced to `brief` — max 1 sentence, 16 words.

---

## AIRA Presence System

AIRA is a silent fourth presence. She is never announced. She just grows.

| Stage | Presence Level | Manifestation |
|-------|---------------|---------------|
| Hidden | 0.00 – 0.12 | `none` |
| Hint | 0.12 – 0.28 | `hint` |
| Shadow | 0.28 – 0.45 | `shadow` |
| Figure | 0.45 – 0.65 | `figure` |
| Watcher | 0.65+ | `watcher` |

Presence grows passively every turn. Keywords like `aira`, `shadow`, `watching`, `strange` accelerate it. High tension accelerates it. Emotional keywords open the room up further.

**Milestones unlocked automatically:**
- `presenceLevel > 0.18` → `imagePresenceUnlocked = true`
- `presenceLevel > 0.35` → `whisperStage = 1`
- `presenceLevel > 0.55` → `voiceUnlocked = true`

---

## Scene Conversation Flow

The room is **one shared scene**, not three isolated chats.

- One **primary** responder answers directly (selected by name, focus, or random)
- One **secondary** responder reacts briefly — interjection, aside, challenge
- Secondary fires at 18% base chance (up to 42% on emotional/rupture beats)
- Secondary is always capped at 1 sentence / 16 words

```
YOU: sam, what do you really think

Sam: Depends on what you mean.
Lucy: Come on, you know what they meant.
```

---

## State Shape (essential fields)

```json
{
  "tension": 0.0,
  "turnCount": 0,
  "relationships": {
    "Lucy":  { "trust": 0.5, "attraction": 0.3, "jealousy": 0.1, "hurt": 0.0 },
    "Sam":   { "trust": 0.5, "attraction": 0.3, "jealousy": 0.1, "hurt": 0.0 },
    "Angie": { "trust": 0.5, "attraction": 0.3, "jealousy": 0.1, "hurt": 0.0 }
  },
  "aira": {
    "presenceLevel": 0.0,
    "manifestation": "none",
    "anomalyLevel": 0.0,
    "voiceUnlocked": false,
    "imagePresenceUnlocked": false,
    "whisperStage": 0
  },
  "investigation": {
    "cluesFound": [],
    "awarenessLevel": 0.0,
    "suspicion": 0.0,
    "storageUnlocked": false
  }
}
```

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/run` | Send input, get character responses + updated state |
| GET | `/api/ai/state` | Get current engine state |
| POST | `/api/ai/reset` | Reset memory, focus, and orchestrator state |

---

## Setup

**Active path:** `client/`

### How to add a new room (minimal)
1. Create `client/<room-name>.html` by copying an existing `room-*.html` (for example `hazel-room.html`).
2. Ensure the chat area uses the shared room contract:
  - thread container: class `room-thread`
  - composer form: id `roomComposer`
  - input: id `roomInput`
  - include a camera button `type="button"` and a send button inside the form
  - optionally include `window.ROOM_REPLIES` for local reply testing
3. Load `app-v2.js` at the end of the page so the shared UI logic binds automatically.

### Safe to edit / Do not touch
- Safe to edit: `client/*.html` (room pages), `client/style-v2.css`, and `client/characters/*.md` for character guidance.
- Do not edit: `server/*` runtime glue unless you know Node and the backend contract. Avoid editing files in `archive/` or other legacy folders.
- If you're unsure: branch and test locally — don't push directly to `master`.

```bash
# Install
npm install

# Run locally
npm run dev
# → http://localhost:3000

# Environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env
```

---

## Deployment

Hosted on **Render** (auto-deploys from GitHub on push to `master`).

`OPENAI_API_KEY` must be set manually in Render's Environment panel — it is never committed to git.

---

## What's Next

Features designed and ready to implement (context files incoming):

| Feature | Depends on |
|---------|-----------|
| Visual Presence System | `aira.manifestation`, `aira.imagePresenceUnlocked` |
| Interference System | `aira.interferenceChance`, `aira.preferredTarget`, `aira.voiceUnlocked` |
| Investigation / Storage | `investigation.storageUnlocked`, `investigation.unlockedTools` |
| Character Images | `characterProfiles.js` + UI update |
