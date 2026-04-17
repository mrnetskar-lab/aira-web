# AIRA Web — Claude Code Context

## Prosjekt
AIRA Web er en mobil-first sosial AI-opplevelse med tre karakterer (Lucy, Sam, Angie) i et felles rom med dynamiske relasjoner og en mystisk tilstedeværelse kalt AIRA.

**Live:** https://aira-web-production.up.railway.app
**Repo:** https://github.com/mrnetskar-lab/aira-web
**Versjon:** 2.2.0

## Stack
- **Backend:** Node.js + Express (ESM modules)
- **Frontend:** Vanilla JavaScript SPA
- **AI:** OpenAI GPT-4.1-mini med JSON-formatering
- **Hosting:** Railway (auto-deploy fra master branch)

## Arkitektur

src/engine/
  SystemOrchestrator   — koordinerer alle systemer
  EmotionSystem        — karakterenes emosjonelle tilstand
  MemorySystem         — korttids- og langtidsminne
  RelationshipEngine   — tillit, tiltrekning, sjalusi mellom karakterpar
  AiraPresenceSystem   — AIRA manifestasjonsstadier: Hidden→Hint→Shadow→Figure→Watcher
  BrainController      — bestemmer responsmodus

server/                — Express API
client/                — Frontend SPA
characters/            — Karakterprofiler

## Karakterer
- **Lucy**, **Sam**, **Angie** — tre AI-karakterer med distinkte personligheter

## Responsmodi
- Brief: 4–18 ord | Normal: 1–3 setninger | Cinematic: opptil 5 setninger

## Utvikling
```bash
npm install && npm run dev   # localhost:3000
```
Dev-panel: trykk § i nettleseren

## Deploy
Railway auto-deployer fra master branch.
Nødvendig env: OPENAI_API_KEY (settes i Railway dashboard)

## Tokens og tillatelser
- GitHub token: env.GITHUB_TOKEN i ~/.claude/settings.json
- Railway CLI er tillatt uten prompt (railway *)
- Google Drive MCP er konfigurert

## Nyttige kommandoer
```bash
railway status / logs / redeploy
curl https://aira-web-production.up.railway.app/api/characters
```

## Neste steg
- Visuell AIRA-rendering
- Interference-mekanikk
- Karakterbilder og ambient lyd
