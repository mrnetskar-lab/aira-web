# Claude Code — Tilganger og kontekst

## Tilgjengelige tokens

| Token | Variabel | Bruk |
|-------|----------|------|
| GitHub | `GITHUB_TOKEN` | Push, PR, branch-operasjoner |
| Codespace | `GITHUB_CODESPACE_TOKEN` | SSH inn i Codespaces, kjøre kommandoer |
| Copilot telemetri | `COPILOT_OTEL_*` | Copilot-integrasjon |

## Codespaces (mrnetskar-lab/aira-web)

| Navn | Branch | Status |
|------|--------|--------|
| bookish-giggle-4jx4v4r749vqcq9jj | master | Available |
| miniature-parakeet-7vgq5qx9q4pgfr97r | feature/billing | Shutdown |
| vigilant-robot-jjx676g56vjwh5wj6 | master | Shutdown |

SSH inn i et Codespace:
```bash
gh codespace ssh -c <navn> -- "git -C /workspaces/aira-web <kommando>"
```

## Google Drive (MCP)

Tilgang via `mcp__claude_ai_Google_Drive__*` verktøy.

Relevante filer:
- `.claude/` mappe — prosjektkontekst
- `aira_claud_copilot.txt` — aktiv arbeidskontekst / patchliste

## Railway

Token: `cb1337c6-f243-4cb4-a84e-57002f87713a` (scope: Mikael's Projects)

```bash
export RAILWAY_TOKEN=cb1337c6-f243-4cb4-a84e-57002f87713a
```

**Prosjekt:** `incredible-generosity` (`3bf972e1-fef7-4171-8162-b802d7d556cc`)

| Tjeneste | ID |
|----------|----|
| aira-web | `9f80b2e5-8887-47a3-a7eb-bdb8b267a354` |
| natural-recreation | `59746898-dc2e-4142-bcf1-64235e351534` |

Environment: `production` (`712b57ab-a863-4b3d-89c9-c9f8a8b675bd`)

GraphQL API: `https://backboard.railway.app/graphql/v2`

## Arbeidsrepo

`mrnetskar-lab/aira-web` — lokalt på `/workspaces/aira-web`
