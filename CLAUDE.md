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
    characters.js — GET/POST /api/characters, POST /api/characters/:id/chat
    ai.js         — world chat engine
    claude.js     — Claude API route
  services/
    openaiClient.js — AI-klient som velger provider

characters/
  nina.json, hazel.json, etc. — karakterprofiler

src/engine/        — AI-motor (CharacterAIService, memory, emotions)
```

## API-endepunkter (lokalt)
- `GET  /api/characters` — liste alle karakterer
- `GET  /api/characters/:id` — hent karakter + meldings-historikk
- `POST /api/characters/:id/chat` — send melding, få AI-svar `{ ok, reply, character }`
- `POST /api/chat` — unified endpoint (proxyer til `/api/characters/:id/chat`)

## Kjente problemer som MÅ fikses

### 1. Iris og Vale mangler karakterfiler
`characters/iris.json` og `characters/vale.json` eksisterer ikke.
Opprett dem basert på samme format som `characters/nina.json`:
```json
{
  "name": "Iris",
  "identity": "...",
  "anchors": { "contradiction": "...", "weakness": "...", "rule": "..." },
  "system_prompt": "..."
}
```
- **Iris:** mystisk, lyttende, sier ting andre ikke sier høyt. Stille men presis.
- **Vale:** utilgjengelig, invite-only vibes, knapp og direkte. Åpner seg sakte.

### 2. `hydrateThread` kjøres for alle 4 karakterer ved oppstart
I `app.js` linje ~860: `hydrateThread` kalles for alle karakterer når siden lastes. Dette sender 4 × 7 API-kall ved oppstart og overbelaster serveren. Fiks: hydrer kun den aktive tråden ved oppstart, resten lazy når brukeren klikker.

### 3. Hub-siden er tom
`index.html` har to `<form id="mainChatForm">` og to `<input id="mainChatInput">` — duplikat IDs. `app.js` finner feil element. Fiks: fjern den første (placeholder) formen i hub-seksjonen, behold bare den ekte.

### 4. Story Routes "Continue"-knapper navigerer ikke riktig
Knappene i routes-seksjonen har `data-room="nina" data-nav="inbox"` men `app.js` håndterer ikke `data-room` på nav-knapper. Fiks: legg til event listener som setter aktiv tråd basert på `data-room` før navigasjon.

### 5. Meldingshistorikk vises med feil rekkefølge
`GET /api/characters/:id` returnerer historikk med `role: "user"/"assistant"` og `text`. Frontend `normalizeMessages()` håndterer dette, men `time`-feltet er alltid `null` fra serveren. Fiks i `server/routes/characters.js`: lagre tidsstempel i historikk ved `saveHistory()` og inkluder det ved `loadHistory()`.

### 6. Serveren bruker `node --watch` som er ustabil i Codespaces
Bytt `package.json` dev-script til `nodemon`:
```json
"dev": "nodemon server/index.js"
```
Installer: `npm install --save-dev nodemon`

### 7. `/api/chat` gjør en intern HTTP-fetch til seg selv
`server/index.js` `/api/chat`-routen gjør `fetch('http://localhost:3000/api/characters/...')` — dette er unødvendig og skaper race conditions ved oppstart. Fiks: importer og kall chat-handler-funksjonen direkte fra `characters.js` i stedet for HTTP round-trip.

## Karakterpersonligheter (for json-filene)

**Nina** — varm, kjent fra før, holder tilbake det ekte til det er fortjent
**Hazel** — observant, husker pauser like mye som ord, sier ikke det åpenbare
**Iris** — lyttende, presis, sier det andre ikke tør si høyt
**Vale** — knapp, invite-only, åpner seg bare hvis du beviser at du er verdt det

## Kodestil
- ESM modules (`import/export`)
- Ingen TypeScript
- Vanilla JS frontend — ingen frameworks
- Norsk i karakterdialoger, engelsk i kode/kommentarer
