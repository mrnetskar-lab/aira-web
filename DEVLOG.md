# AIRA Web — Development Log

Running log of everything built, decided, fixed, and planned.
Updated by Claude after each session.

---

## SESSION 1 — Project Start
**Date:** Early April 2026
**Status:** Foundation laid

### What existed
The project had been partially set up from a ChatGPT overhaul pack. Backend engine files were in place but the frontend (`client/`) and `package.json` were completely missing. The project could not run.

There was also a nested folder `Aira_web_V3/` inside the project root — a leftover from the previous version. Kept it in `.gitignore` to exclude from deployments.

### What was built
- Created `package.json` (v2.1.0 → bumped to 2.2.0 later)
- Created all `client/` files from scratch: `index.html`, `app.js`, `style.css`
- Created `setup_and_run.bat` and `reset_project.bat`
- Verified all engine files were present at root (not just inside `Aira_web_V3/`)
- Fixed `EmotionSystem.js` — file was truncated at line 13, rewrote it in full

### Stack confirmed
- Node.js + Express (ESM modules, `"type": "module"`)
- Port via `process.env.PORT || 3000`
- OpenAI API: `gpt-4.1-mini`, JSON `response_format`, server-only via `dotenv`
- Three characters: Sam, Lucy, Angie
- Vanilla JS client, no framework

---

## SESSION 2 — Context System
**Context file:** `AIRA_Context_V1.txt`
**Status:** Implemented

### What was built
- Created `src/engine/core/buildContext.js`
- Returns a rich context object every turn:
  - `session` — turn count, randomness
  - `conversation` — topic, emotionalBeat, responseMode
  - `world` — tension, location, time
  - `characters` — profiles for all three
  - `relationships` — per-character trust/attraction/jealousy/hurt
  - `memory` — recent + recalled weighted entries
  - `gameplay` — aira state, investigation state
- `getResponseMode(state, input)`:
  - `brief` — default (4–18 words)
  - `normal` — emotional keywords or tension > 0.75
  - `cinematic` — special lastEvent triggers
- `getEmotionalBeat(tension, input)`:
  - `high_tension`, `rising`, `neutral`

---

## SESSION 3 — Relationship Engine
**Context file:** `AIRA_Relationship_Engine_V1.txt`
**Status:** Implemented

### What was built
- Created `src/engine/systems/RelationshipEngine.js`
- Tracks per-character: `trust`, `attraction`, `jealousy`, `hurt`, `comfort`, `attachment`
- Also tracks hidden state in `state.cast[name].hidden`
- Flirt keywords → `attraction +0.05`, `trust +0.03`
- Negative keywords → `trust -0.06`, `hurt +0.08`
- Not naming a character → `jealousy +0.02` (ignored heuristic)
- All values clamped 0–1
- Wired into `SystemOrchestrator.run()` before brain processes responses

---

## SESSION 4 — Mobile MVP UI
**Context file:** `AIRA_Web_MVP_Mobile_V1.txt`
**Status:** Implemented

### What was built
- Replaced `client/index.html` with two-view SPA:
  - `#landingView` — eyebrow, h1, 3 character cards, Enter Room button
  - `#roomView` — room-header, hero-panel with dynamic title/subtitle, chip-row (4 preset prompts), chat-log, sticky chat-bar, aside with debug panels
- Replaced `client/style.css`:
  - CSS variables: `--bg`, `--panel`, `--accent` (#8b5cf6), `--accent-2` (#22c55e)
  - Background: radial purple gradient + dark navy
  - Mobile-first: card-grid `1fr` → `repeat(3,1fr)` at 760px
  - Side-column hidden on mobile, shown at 1024px
  - Safe-area insets for notched phones
  - Character card gradients: Lucy (pink), Sam (blue), Angie (yellow)
- Updated `client/app.js`:
  - `showLanding()` / `showRoom()` view switching
  - `renderState()` updates hero title/subtitle based on tension level
  - Chip buttons fire preset prompts

---

## SESSION 5 — OpenAI API Integration
**Context file:** `AIRA_AI_API_Integration_V1.txt`
**Status:** Implemented + deployed

### What was built
- Created `server/services/openaiClient.js`
  - `import 'dotenv/config'` at top
  - Exports `openai` instance and `ensureOpenAI()` guard
- Created `src/engine/brain/characterProfiles.js`
  - Lucy: warm, intuitive, directness 0.45, warmth 0.85
  - Sam: guarded, defensive, directness 0.75, warmth 0.35
  - Angie: playful, grounded, directness 0.55, warmth 0.70
- Created `src/engine/services/CharacterAIService.js`
  - Model: `gpt-4.1-mini`, temperature 0.9, `response_format: json_object`
  - System prompt includes personality, responseMode, topic, world, relationship
  - `normalizeSpoken()`: enforces word/sentence limits per mode
  - Returns `{ spoken, thought }`
- Replaced `src/engine/brain/AiraBrainController.js`
  - Now calls `CharacterAIService` instead of returning mock responses
  - `_selectResponders()`: name-targeting, emotional beat → 2 responders, tension > 0.65 → 2, default → 1

### Deployment
- Git repo: `github.com/mrnetskar-lab/aira-web`
- Deployed to Render (auto-deploy from `master`)
- `OPENAI_API_KEY` set manually in Render Environment panel — never committed to git

### Issues fixed
- `AIRA_.env` accidentally staged in git — added to `.gitignore`, ran `git rm --cached`
- Stray file `console.log(process.env.OPENAI_API_KEY` created in root (terminal mishap) — removed
- 401 errors on Render — root cause: user was regenerating keys. Fixed by setting one stable key in Render Environment panel and triggering Manual Deploy

---

## SESSION 6 — Dev Panel
**Context file:** `AIRA_Dev_Panel_Lite_V1.txt`
**Status:** Implemented

### What was built
- Created `client/devPanel.js`
  - `AiraDevPanel` class, toggled with `§` key
  - Sets `window.__AIRA_DEV_MODE__ = true/false`
  - Fetches `/api/ai/state` every 1000ms when visible
  - Tabs: `overview` (tension/turnCount/focus/memoryCount), `relationships`, `aira` (presence state), `memory`, `logs`
  - Note: uses `fetch()` because orchestrator lives on the server — not browser-accessible
- Updated `client/app.js`:
  - Imports and initializes `AiraDevPanel`
  - GM line wrapped in `if (window.__AIRA_DEV_MODE__)` — only visible in dev mode

---

## SESSION 7 — AIRA Presence System
**Context file:** `AIRA_Presence_System_V1.txt`
**Status:** Implemented

### What was built
- Created `src/engine/systems/AiraPresenceSystem.js`
  - Silent backend presence — never shown in UI yet
  - Passive presence gain per turn: +0.003 base, +0.008 at tension > 0.4, +0.015 at tension > 0.7
  - Keywords `aira/weird/shadow/watching/voice/strange` → `awarenessLevel +0.08`, `suspicion +0.06`, `anomaly +0.05`
  - Emotional keywords `love/need you/hate/leave/sorry/miss you` → `presenceLevel +0.03`, `anomaly +0.02`
  - High tension (> 0.6) → `presenceLevel +0.02` extra per turn

- **Manifestation stages:**
  | Stage | presenceLevel |
  |-------|--------------|
  | `none` | < 0.12 |
  | `hint` | 0.12 – 0.28 |
  | `shadow` | 0.28 – 0.45 |
  | `figure` | 0.45 – 0.65 |
  | `watcher` | > 0.65 |

- **Milestones:**
  - `presenceLevel > 0.18` → `imagePresenceUnlocked = true`, `imageStage = 1`
  - `presenceLevel > 0.35` → `whisperStage = 1`
  - `presenceLevel > 0.55` → `voiceUnlocked = true`, `whisperStage = 2`

- **Investigation tracking:**
  - `cluesFound[]` — populates with clue IDs at presence thresholds
  - `awarenessLevel`, `suspicion`
  - `storageUnlocked` — triggers when awarenessLevel > 0.3
  - `currentLead` — set to `'background_presence'` when presenceLevel > 0.2

- Updated `SystemOrchestrator.js`:
  - Added `aira: null, investigation: null` to initial state
  - `airaPresenceSystem.update()` called after `buildContext()` and before `brain.process()`

### Live test confirmed
- `presenceLevel` building correctly (0.006 after 2 neutral turns)
- `awarenessLevel` responded to Norwegian input `"aira er du her"` → 0.080
- Commit: `c3cd0ad`

---

## SESSION 8 — Scene Conversation Flow
**Context file:** `AIRA_Scene_Conversation_Flow_V1.txt`
**Status:** Implemented

### Problem solved
The room was feeling like 3 separate private chats — every character answering as if in their own thread.

### What was built
- Replaced `AiraBrainController.js` with scene-plan system:
  - `_buildScenePlan()` — picks primary + optional secondary
  - `_selectPrimary()` — name-targeting first, then focus, then random
  - `_selectSecondary()` — probability-based:
    - 18% base chance
    - 42% on `intimacy` or `rupture` emotional beats
    - 36% at tension > 0.65
    - 28% if any character name mentioned
  - `_getPrimaryMode()` — `normal` on intimacy/repair/rupture, `brief` otherwise
  - `shortenSecondary()` — hard trim to 1 sentence / 16 words

- Each AI call now receives `sceneFlow` in context:
  - Primary: `{ role: 'primary', mainSpeaker, followUpSpeaker, instruction }`
  - Secondary: `{ role: 'secondary', primarySpoken, instruction: 'React briefly...' }`

- Updated `CharacterAIService.js`:
  - `sceneFlow` extracted and included in system prompt
  - 7 new scene-role rules added to Core rules section
  - `normalizeSpoken()` — secondary role exits early: 1 sentence / 16 words enforced

### Example output (goal achieved)
```
YOU: sam, what do you really think
Sam: Depends on what you mean.
Lucy: Come on, you know what they meant.
```

- Commit: `e5b7b5c`

---

## FILES CREATED — FULL LIST

```
package.json
.env.example
.gitignore
setup_and_run.bat
reset_project.bat
README.md
DEVLOG.md
server/index.js
server/routes/ai.js
server/services/engineInstance.js
server/services/openaiClient.js
src/engine/createEngine.js
src/engine/core/SystemOrchestrator.js
src/engine/core/buildContext.js
src/engine/brain/AiraBrainController.js          ← replaced in session 8
src/engine/brain/characterProfiles.js
src/engine/services/CharacterAIService.js         ← updated in session 8
src/engine/systems/EmotionSystem.js               ← fixed (truncated) in session 1
src/engine/systems/MemorySystem.js
src/engine/systems/RelationshipEngine.js
src/engine/systems/AiraPresenceSystem.js
src/engine/systems/FocusSystem.js
src/engine/dev/AiraObserver.js
src/engine/dev/AiraPatchWriter.js
src/engine/bridges/NullAvatarBridge.js
src/engine/systems/DualLayerSystem.js
src/engine/systems/ExplicitMode.js
src/engine/systems/SimpleGM.js
client/index.html
client/app.js
client/style.css
client/devPanel.js
context/AIRA_Context_V1.txt
context/AIRA_Relationship_Engine_V1.txt
context/AIRA_Web_MVP_Mobile_V1.txt
context/AIRA_AI_API_Integration_V1.txt
context/AIRA_Dev_Panel_Lite_V1.txt
context/AIRA_Presence_System_V1.txt
context/AIRA_Scene_Conversation_Flow_V1.txt
```

---

## WHAT'S NEXT

Ready to implement when context files arrive:

| Feature | Key state fields | Notes |
|---------|-----------------|-------|
| Visual Presence System | `aira.manifestation`, `aira.imagePresenceUnlocked` | Change hero image based on stage |
| Interference System | `aira.interferenceChance`, `aira.preferredTarget`, `aira.voiceUnlocked` | AIRA subtly affects character messages |
| Investigation / Storage | `investigation.storageUnlocked`, `investigation.unlockedTools` | Unlock tools: presence_detector, old_photo, broken_radio |
| Character Images | `characterProfiles.js` + UI | Real images for Lucy, Sam, Angie |
| Sound / Ambient | — | Atmosphere layer, whisper sounds |

---

## KNOWN DECISIONS

| Decision | Reason |
|----------|--------|
| `devPanel.js` uses `fetch()` instead of direct orchestrator access | Orchestrator lives on the server (Node.js), not the browser |
| `OPENAI_API_KEY` never committed to git | Security — set manually in Render Environment panel |
| `Aira_web_V3/` kept in `.gitignore` | Old version nested inside project — excluded from deployment |
| Secondary responders hard-capped at 16 words | Prevents secondary from becoming a full parallel conversation |
| `brief` is the default response mode | Keeps the room feeling natural and real, not verbose |
| Scene plan replaces loop-all approach | Fixes "3 separate chats" problem — one shared moment |

---

*Log maintained by Claude. Updated after each implementation session.*
