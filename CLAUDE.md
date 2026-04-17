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

---

### OPPGAVE A — Inbox layout redesign (3-kolonne, candy.ai-inspirert)
**Filer:** `client/the-grid/index.html`, `client/the-grid/styles.css`, `client/the-grid/app.js`

Mål: Inbox-seksjonen skal ha samme proporsjon som candy.ai: smal tråd-liste til venstre, bred chat i midten, karakter-profil-panel til høyre.

#### A1 — HTML-struktur i `#inbox`
Gjør om `.inbox-layout` til en 3-kolonne wrapper:
```html
<div class="inbox-layout">
  <!-- Kolonne 1: tråder -->
  <aside class="thread-list" aria-label="Message threads">
    <!-- eksisterende .thread-item knapper -->
  </aside>

  <!-- Kolonne 2: chat -->
  <div class="dm-panel">
    <div class="dm-head"> ... </div>
    <div class="dm-thread" id="dmThread"></div>
    <div class="chat-compose">
      <form id="dmForm">
        <input type="text" id="dmInput" placeholder="Write a message…" autocomplete="off" />
        <button type="button" id="cameraBtn" class="compose-action" title="Send image">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </button>
        <button type="submit" class="compose-send" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>
  </div>

  <!-- Kolonne 3: karakter-profil -->
  <aside class="character-profile-panel" id="characterProfilePanel">
    <div class="profile-gallery">
      <img id="profileImg" src="" alt="" />
    </div>
    <div class="profile-info">
      <h3 id="profileName">Nina</h3>
      <p id="profileBio" class="subtle"></p>
      <div class="profile-tags" id="profileTags"></div>
    </div>
  </aside>
</div>
```

#### A2 — CSS for 3-kolonne layout i `styles.css`
Erstatt eksisterende `.inbox-layout` grid med dette:
```css
.inbox-layout {
  display: grid;
  grid-template-columns: 260px 1fr 280px;
  height: calc(100vh - var(--topbar-h) - var(--footer-h, 48px) - 2rem);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
}

/* Kolonne 1 */
.thread-list {
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 0.5rem 0;
  background: var(--glass-bg);
}

.thread-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}
.thread-item:hover, .thread-item.active {
  background: rgba(255,255,255,0.06);
}

/* Kolonne 2 */
.dm-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.dm-head {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.dm-thread {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chat-compose {
  border-top: 1px solid var(--border);
  padding: 0.75rem 1rem;
  flex-shrink: 0;
}

.chat-compose form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 0.5rem 0.75rem;
}

.chat-compose input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 0.9rem;
}

.compose-action, .compose-send {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--subtle);
  padding: 0.25rem;
  border-radius: 50%;
  transition: color 0.15s, background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.compose-action:hover { color: var(--text); }
.compose-send {
  background: var(--accent);
  color: #fff;
  padding: 0.4rem;
}
.compose-send:hover { opacity: 0.85; }

/* Kolonne 3 — karakter-profil */
.character-profile-panel {
  border-left: 1px solid var(--border);
  overflow-y: auto;
  background: var(--glass-bg);
  display: flex;
  flex-direction: column;
}

.profile-gallery {
  width: 100%;
  aspect-ratio: 3/4;
  overflow: hidden;
  flex-shrink: 0;
}

.profile-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.profile-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-info h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.25rem;
}

.profile-tag {
  font-size: 0.72rem;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border);
  color: var(--subtle);
}

/* Responsivt: skjul profil-panel på smale skjermer */
@media (max-width: 900px) {
  .inbox-layout {
    grid-template-columns: 220px 1fr;
  }
  .character-profile-panel { display: none; }
}

@media (max-width: 600px) {
  .inbox-layout {
    grid-template-columns: 1fr;
  }
  .thread-list { display: none; }
}
```

#### A3 — Chat bobler
Oppdater `.chat-bubble` i CSS slik at outgoing-meldinger er lilla/accent og incoming er mørk grå:
```css
.chat-bubble {
  max-width: 70%;
  padding: 0.65rem 0.9rem;
  border-radius: 16px;
  font-size: 0.9rem;
  line-height: 1.5;
  position: relative;
}
.chat-bubble.outgoing {
  align-self: flex-end;
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.chat-bubble.incoming {
  align-self: flex-start;
  background: rgba(255,255,255,0.07);
  color: var(--text);
  border-bottom-left-radius: 4px;
}
/* Kursiv handling-tekst (f.eks. *hun ser på deg*) */
.chat-bubble p em,
.chat-bubble p i {
  opacity: 0.65;
  font-style: italic;
}
.chat-bubble .chat-author { display: none; } /* navn vises i dm-head, ikke i hver boble */
.chat-bubble time {
  display: block;
  font-size: 0.68rem;
  opacity: 0.45;
  margin-top: 0.25rem;
  text-align: right;
}
```

#### A4 — JS: last karakterprofil inn i høyre panel
I `app.js`, oppdater `focusThread(roomKey)` til å kalle en ny funksjon `loadProfilePanel(roomKey)`:
```js
function loadProfilePanel(roomKey) {
  const char = characterDirectory[roomKey];
  if (!char) return;

  const panel = document.getElementById('characterProfilePanel');
  if (!panel) return;

  const img = document.getElementById('profileImg');
  const name = document.getElementById('profileName');
  const bio = document.getElementById('profileBio');
  const tags = document.getElementById('profileTags');

  // Prøv å hente bilde fra /profile_pictures/{roomKey}.jpg
  if (img) {
    img.src = `/profile_pictures/${roomKey}.jpg`;
    img.onerror = () => { img.style.display = 'none'; };
    img.onload = () => { img.style.display = ''; };
  }
  if (name) name.textContent = char.name;
  if (bio) bio.textContent = char.preview || '';

  // Vis tags fra characterDirectory hvis de finnes
  if (tags) {
    tags.innerHTML = '';
    (char.tags || []).forEach(tag => {
      const span = document.createElement('span');
      span.className = 'profile-tag';
      span.textContent = tag;
      tags.appendChild(span);
    });
  }
}
```

Kall `loadProfilePanel(roomKey)` nederst i `focusThread(roomKey)`.

Legg også til `tags`-array for hver karakter i `characterDirectory` i app.js:
- Nina: `tags: ['online', 'holds the thread', 'private']`
- Hazel: `tags: ['away', 'observant', 'sharp']`
- Iris: `tags: ['listening', 'low signal', 'high clarity']`
- Vale: `tags: ['invite only', 'brief', 'direct']`

---

### OPPGAVE B — Chat boble: kursiv handling-rendering
**Fil:** `client/the-grid/app.js` → `renderDmThread()`

Karakterene sender noen ganger handling-tekst på formen `*hun gjør noe*`. Vis dette som kursiv og dempet:

I `renderDmThread()`, i stedet for `escapeHtml(message.text)`, kjør teksten gjennom en mini-renderer:
```js
function renderMessageText(raw) {
  // Escape HTML first
  const escaped = escapeHtml(raw);
  // Wrap *...* in <em>
  return escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
```

Bruk `renderMessageText(message.text)` der `escapeHtml(message.text)` brukes i boble-HTML.
Merk: `escapeHtml` må kjøres FØR regex-erstatningen så `<em>` ikke blir escaped.

---

### OPPGAVE C — Kamera-knapp i compose
**Filer:** `client/the-grid/app.js`

`#cameraBtn` er nå i HTML (fra oppgave A). Koble det til kamera-API:

```js
const cameraBtn = document.getElementById('cameraBtn');

cameraBtn?.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 480;
    canvas.getContext('2d').drawImage(video, 0, 0, 640, 480);
    stream.getTracks().forEach(t => t.stop());

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    const char = characterDirectory[activeThread];

    const res = await fetch('/api/camera/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `${char?.name || activeThread} reacts to what they see in the image`,
        imageBase64
      })
    });
    const data = await res.json();
    if (data.imageUrl) {
      const thread = threadState[activeThread];
      const imgMsg = {
        side: 'incoming',
        author: char?.name || activeThread,
        text: '',
        imageUrl: data.imageUrl,
        time: nowClock()
      };
      thread.messages.push(imgMsg);
      renderDmThread(activeThread);
    }
  } catch (err) {
    console.warn('Camera error:', err);
  }
});
```

Oppdater `renderDmThread()` til å støtte `message.imageUrl`:
```js
if (message.imageUrl) {
  bubble.innerHTML = `<img src="${escapeHtml(message.imageUrl)}" style="max-width:100%;border-radius:8px;" alt="generated image" />
    <time>${escapeHtml(message.time)}</time>`;
}
```

---

### OPPGAVE D — RelationshipEngine kontekst
**Fil:** `server/routes/characters.js` → `handleCharacterChat()`

`src/engine/RelationshipEngine.js` eksisterer. Importer og bruk det:
```js
import { RelationshipEngine } from '../../src/engine/RelationshipEngine.js';
const relationshipEngine = new RelationshipEngine();
```

I `handleCharacterChat()`, hent relasjoner og legg til i kontekst:
```js
const relationships = relationshipEngine.getRelationships(characterName);
// legg til i context-objektet:
context: {
  ...eksisterende context,
  relationships // array av { name, trust, attraction, tension }
}
```

Etter svar, oppdater relasjonen:
```js
relationshipEngine.update(characterName, 'user', { message: text, reply: spoken });
```

---

## Kodestil
- ESM modules (`import/export`)
- Ingen TypeScript
- Vanilla JS frontend — ingen frameworks
- Norsk i karakterdialoger, engelsk i kode/kommentarer
- Ikke bryt eksisterende API-kontrakter
