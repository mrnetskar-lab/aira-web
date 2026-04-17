# AIRA Web — Prosjektkontekst

## Prosjekt
AIRA Web er en dark social hub med fire AI-karakterer (Nina, Hazel, Iris, Vale) som brukeren kan chatte med privat. Frontenden er en SPA kalt "The Grid" med rooms, inbox og story routes.

**Live:** https://aira-web-production.up.railway.app
**Repo:** https://github.com/mrnetskar-lab/aira-web
**Lokal dev:** `npm run dev` → localhost:3000

## Stack
- **Backend:** Node.js + Express (ESM modules)
- **Frontend:** Vanilla JS SPA (`client/the-grid/`)
- **AI:** OpenRouter (primær) → OpenAI (fallback) via `server/services/openaiClient.js`
- **Hosting:** Railway

## Filstruktur
```
client/the-grid/
  index.html      — SPA shell med alle sider
  app.js          — all frontend-logikk
  styles.css      — dark theme, glass-effekter

server/
  index.js        — Express app, ruter, static serving
  routes/
    characters.js — GET/POST /api/characters, POST /api/characters/:id/chat, handleCharacterChat()
    camera.js     — kamera/bildegenerering via FAL.ai
    ai.js         — world chat engine
  services/
    openaiClient.js — AI-klient som velger provider

characters/
  nina.json, hazel.json, iris.json, vale.json — karakterprofiler
  *.history.json  — samtalehistorikk per karakter

src/engine/
  services/CharacterAIService.js  — genererer AI-svar
  memory/MemorySystem.js          — korttids- og langtidsminne
  RelationshipEngine.js           — tillit/tiltrekning mellom karakterpar
  EmotionSystem.js                — emosjonell tilstand per karakter
  brain/characterProfiles.js      — CHARACTER_PROFILES og CHARACTER_NAME_BY_ID
```

## API-endepunkter
- `GET  /api/characters` — liste alle karakterer
- `GET  /api/characters/:id` — hent karakter + meldings-historikk
- `POST /api/characters/:id/chat` — send melding `{ text }`, få `{ ok, reply, character }`
- `POST /api/chat` — unified endpoint, body: `{ character, message }`
- `POST /api/camera/generate` — generer bilde via FAL.ai

## Status — hva som fungerer
- ✅ Alle 4 karakterer svarer med ekte AI
- ✅ Historikk lagres per karakter i `*.history.json`
- ✅ Tidsstempler på meldinger
- ✅ nodemon for auto-restart
- ✅ `/api/chat` kaller handler direkte uten self-fetch

---

## Neste oppgaver — PRIORITERT

### 1. Koble MemorySystem til DM-chat
**Fil:** `server/routes/characters.js` → `handleCharacterChat()`

`src/engine/memory/MemorySystem.js` eksisterer allerede. Koble det til DM-chatten slik at:
- Karakteren husker tidligere samtaler med brukeren (ikke bare siste 10 meldinger)
- Minnet er persistent mellom sessioner (lagres til disk)
- `handleCharacterChat()` henter relevant minne og sender det som kontekst til AI

Slik gjøres det:
```js
import { MemorySystem } from '../../src/engine/memory/MemorySystem.js';
const memory = new MemorySystem();

// I handleCharacterChat():
const relevantMemory = memory.retrieve(id, text, { limit: 5 });
// Send relevantMemory som kontekst til aiService.generate()
// Etter svar: memory.store(id, { role: 'user', text, time })
//             memory.store(id, { role: 'assistant', text: reply, time })
```

### 2. Koble EmotionSystem — karakterene endrer tone basert på samtalen
**Fil:** `server/routes/characters.js` → `handleCharacterChat()`

`src/engine/EmotionSystem.js` tracker emosjonell tilstand. Koble det slik at:
- Karakterens nåværende emosjonelle tilstand sendes som kontekst til AI
- Tilstanden oppdateres etter hvert svar
- Dette gir karakterene mer naturlig variasjon over tid

```js
import { EmotionSystem } from '../../src/engine/EmotionSystem.js';
const emotions = new EmotionSystem();

// I handleCharacterChat():
const emotionState = emotions.getState(characterName);
// Legg til i context: { emotion: emotionState }
// Etter svar: emotions.update(characterName, reply)
```

### 3. Kamera-integrasjon i The Grid frontend
**Filer:** `client/the-grid/index.html`, `client/the-grid/app.js`

Legg til en kamera-knapp i DM-compose-feltet (`#dmForm`):
```html
<button type="button" id="cameraBtn" class="btn btn-secondary btn-small">📷</button>
```

Når knappen trykkes:
1. Åpne `getUserMedia({ video: true })` — vis live preview
2. Ta et bilde (canvas snapshot)
3. Send til `POST /api/camera/generate` med `{ prompt, imageBase64 }`
4. Vis generert bilde som en melding i DM-tråden

Styling: bruk eksisterende `.chat-bubble` klasser. Bildet vises som `<img>` inni boblen.

API-kall:
```js
const res = await fetch('/api/camera/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: `${characterName} reacts to what they see`, imageBase64 })
});
const { imageUrl } = await res.json();
```

### 4. RelationshipEngine — karakterene kjenner til hverandre
**Fil:** `server/routes/characters.js`

`src/engine/RelationshipEngine.js` tracker relasjoner mellom karakterpar. Koble det slik at:
- Når du chatter med Nina, kan hun referere til Hazel eller Vale
- Relasjonstilstanden påvirker hva karakteren sier om de andre
- Sendes som del av kontekst til AI

---

## Kodestil
- ESM modules (`import/export`)
- Ingen TypeScript
- Vanilla JS frontend — ingen frameworks
- Norsk i karakterdialoger, engelsk i kode/kommentarer
- Ikke bryt eksisterende API-kontrakter
