# AIRA Web

A social AI experience — not a chatbot. Three characters (Lucy, Sam, and Angie) share a room with evolving relationships, hidden tensions, and a silent fourth presence called AIRA that grows throughout the interaction.

Live: [aira-web.onrender.com](https://aira-web.onrender.com)

---

## What It Is

AIRA Web is a mobile-first web app where you talk to a room, not a single AI. Multiple characters respond, react to each other, and carry emotional state across the conversation. The longer you interact, the more the room shifts.

AIRA itself never speaks directly — it manifests through stages: **Hidden → Hint → Shadow → Figure → Watcher**.

---

## Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JavaScript SPA (no framework)
- **AI:** OpenAI `gpt-4.1-mini` with JSON response format
- **Deployment:** Render (auto-deploy from `master`)

---

## Architecture

```
src/engine/
├── SystemOrchestrator     — coordinates all subsystems per turn
├── EmotionSystem          — tracks tension (0–1) based on input
├── MemorySystem           — stores conversations with time-decay
├── RelationshipEngine     — trust, attraction, jealousy, hurt per character
├── AiraPresenceSystem     — manages AIRA's manifestation stages
└── BrainController        — selects primary + secondary responders
```

Characters respond in three modes:
- **Brief** — 4–18 words
- **Normal** — 1–3 sentences
- **Cinematic** — up to 5 sentences

Secondary responders are hard-capped at 16 words to keep balance.

---

## Local Setup

```bash
git clone https://github.com/mrnetskar-lab/aira-web.git
cd aira-web
cp .env.example .env
# Add your OpenAI API key to .env
npm install
npm run dev
```

App runs on `http://localhost:3000`.

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/run` | Send input, receive character responses |
| GET | `/api/ai/state` | Current engine state |
| POST | `/api/ai/reset` | Reset session |

---

## Dev Panel

Press `§` in the browser to toggle the dev panel for debugging engine state.

---

## Roadmap

- [ ] Visual presence system for AIRA
- [ ] Interference mechanics
- [ ] Investigation / storage unlocks
- [ ] Character images
- [ ] Private rooms per character
- [ ] Story routes with authored chapters
- [ ] Inbox system

---

## Version

`2.2.0` — See [DEVLOG.md](./DEVLOG.md) for full session history.
