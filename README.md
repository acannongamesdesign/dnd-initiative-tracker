# D&D Initiative Atelier

DM-focused initiative tracker + monster builder built with Vite, React, TypeScript, Tailwind, Dexie, Zod, and React Hook Form. Runs fully in the browser and stores data in IndexedDB.

## Features
- Combat tracker with drag-and-drop ordering, turn flow, rounds, conditions, and undo.
- Monster builder with autosave, templates, and quick list editors.
- Encounter builder to seed combats with numbered copies.
- Export/Import to a single JSON file.
- Offline-friendly (IndexedDB storage).

## Local development
```bash
npm install
npm run dev
```

## Tests
```bash
npm run test
```

## Build
```bash
npm run build
```

## Deploy to GitHub Pages
1. Update `vite.config.ts` `base` to `https://<username>.github.io/<repo>/`.
2. Build the project and publish the `dist` folder with your GitHub Pages workflow or a manual upload.

## Extending the app
- Add new condition options in `src/components/CombatantRow.tsx`.
- Add new monster fields in `src/models/schemas.ts` and wire them into `src/pages/MonstersPage.tsx`.
- Extend encounter composition in `src/pages/EncountersPage.tsx`.
