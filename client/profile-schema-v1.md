# Profile Schema v1

This is a minimal human-readable schema for character profiles used by the client UI and to guide future engine integration.

## Public fields (safe to edit)
- `name` (string): Display name, e.g. "Hazel".
- `initial` (string): One-letter initial shown in avatar.
- `vibe` (string): Short phrase describing tone and style.
- `state` (string): Presence/state label, e.g. `present`, `observer`, `private`.
- `stats` (array of { label, value }): Key/value pairs rendered in the profile card.

## Hidden / dynamic fields (engine-managed)
- `trust` (number 0–1): Relationship trust toward player.
- `attraction` (number 0–1)
- `jealousy` (number 0–1)
- `hurt` (number 0–1)
- `lastSeen` (timestamp): Last time character spoke.
- `focusScore` (number): Engine-internal measure of conversation focus.

## Factions / tags
- `faction` (string): Optional tag used to group characters (e.g. `staff`, `player-allies`).
- `roles` (array of string): e.g. `["primary", "secondary", "control"]`.

## Compatibility hooks
These are optional hooks the engine or client may consult when rendering or selecting responders.
- `clientHints` (object): UI hints such as `{ avatarColor, preferredTone }`.
- `responseConstraints` (object): e.g. `{ maxWords: 20, mode: "brief" }` for secondary responders.
- `testReplies` (array): Local reply pool used for offline testing (same shape as `ROOM_REPLIES`).

## Notes
- Keep public fields compact and human-editable; dynamic fields are managed at runtime by the engine.
- This file is a living reference for future JSON schema generation and validation.
