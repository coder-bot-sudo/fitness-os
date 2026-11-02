# Fitness OS – Testumgebung

## Ausführen
Voraussetzungen: Node.js 22+, Python 3, Playwright Chromium.

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

Der Testserver startet lokal auf Port 4173. Es werden **keine Produktions-Credentials** gebraucht. Supabase-CDN wird in diesen Smoke-Tests blockiert, Cloud-Synchronisierung ist daher **nicht** getestet.

## Automatische PR-Gates
GitHub Actions führt Browser-Smoke-Tests in Desktop Chrome (1440 × 900) und emuliertem iPhone 13 (Chromium) aus. Fehlgeschlagene Tests speichern Trace und Screenshot als GitHub-Artefakte.

## UI/UX-Review bei jedem PR
- Navigation im normalen und im aktiven Trainingsmodus
- Bedienbarkeit auf 390px und Desktop; keine horizontale Überläufe
- Lesbarkeit, Feedback, Bestätigungsdialoge und Fehlermeldungen
- Formulare und Touch-Ziele, leere Zustände und datenreiche Zustände
- Datenverlust, Speichern/Verwerfen, Reload, Offline-Persistenz
- Reale iPhone-Safari-, PWA-, VoiceOver- und Supabase-Tests bleiben zusätzliche manuelle Freigabeschritte

## Merge-Regel
PR erst freigeben, wenn CI grün, kritische Datenpfade geprüft und UX-Blocker behoben sind. Layoutbilder aus einem emulierten Browser ersetzen keinen Test am echten Gerät.
