README: Bruk av .env og hvordan legge inn nøkler i eksternt UI

Kort: Kopier .env.example, fyll inn dine egne nøkler, og legg de sensitive verdiene i tjenestens "Secrets"/"Environment"-seksjon.

1) Kopier eksempel til `.env`:

Linux / macOS:
```bash
cp .env.example .env
```

PowerShell:
```powershell
Copy-Item .env.example .env
```

2) Fyll inn reelle verdier i `.env`. DEL ALDRI nøkler i åpen chat eller i git.

3) Start dev-server:
```bash
npm run dev
```

4) Hvordan Lime inn nøkler i et eksternt web‑UI (manuelt steg-for-steg):
- Logg inn på tjenesten og åpne siden for "Environment", "Secrets" eller "Variables" (lenken du sendte burde gå direkte dit).
- Klikk "Add" / "Edit" / "New Variable".
- Navn (key): bruk for eksempel `OPENAI_API_KEY`.
- Verdi (value): lim inn din hemmelige nøkkel (sk-...); vær sikker på at den ikke eksponeres i beskrivelser eller logger.
- Lagre/oppdater. Restart applikasjonen om nødvendig.

Sikkerhetstips:
- Legg `.env` i `.gitignore` (repoet ditt har allerede dette).
- Bruk leverandørens secrets manager for produksjon (GitHub/GitLab secrets, Azure Key Vault, osv.).

Hvis du vil, kan jeg:
- hjelpe deg med å generere sikre `SESSION_SECRET`-verdier;
- gi nøyaktig tekst for feltene du skal lime inn i det eksterne UI (maskert hvis ønskelig);
- gå steg-for-steg mens du selv limer inn verdiene i nettleseren.
