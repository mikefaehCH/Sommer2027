# Prüfstand 31.10.2026

Agent: Codex. Ausgangspunkt: Sommer2027 `c2ca7bbdcb9d13a2f3dfb5d32d403269a5eca9dc`.

## Ergebnis

- Eigenständige Vorlage und Generator für neue Projekte; zwei fiktive Beispielreisen.
- Keine Änderungen an der laufenden App, Reisedaten, Fotoentscheidungen, Backend oder Familiendaten.
- Keine automatische Migration bestehender Webseiten; gemeinsame Module werden zunächst in der Vorlage gepflegt.
- Lokal vendortes Leaflet 1.9.4 einschliesslich BSD-Lizenz aus dem bestehenden Zürich-Projekt.

## Lokal validiert

- `npm ci`: erfolgreich.
- `npm run format:check`: erfolgreich.
- `npm run check`: bestehende statische/Sicherheitsprüfungen sowie neun neue Vorlagenprüfungen erfolgreich.
- `npm run verify:sri`: drei bestehende CDN-Dateien erfolgreich verifiziert.
- `node tests/service-worker.cjs`: erfolgreich.
- Browser-QA im Sites-Preview: beide Reisen, drei Kartenmarker, Suchfilter, Favoriten,
  Einplanen, Persistenz nach Neuladen, getrennte Pläne, abgeschaltetes Favoritenmodul und Desktopdarstellung geprüft.
- `git diff --check`: erfolgreich.

## Noch nicht lokal bestätigt

`npx playwright install chromium webkit` scheitert beim Chromium-Download (ungültiges ZIP).
`npm test` sowie der neue Browser-Test können daher lokal keine Chromium-/WebKit-Instanz starten.
Die vorhandene sechs-Job-CI-Matrix führt den neuen Test über `npm test` mit aus.
Keine Freigabe zum Merge, solange die CI nicht am tatsächlichen PR-HEAD grün ist.

Die Vorschau läuft über HTTP auf `terminal.local`; dort unterstützt der Browser keinen Service Worker.
Offline wurde deshalb lokal im Worker-Verhalten und der Dateiliste geprüft, jedoch nicht als kompletter
Browserablauf. Der Chromium-CI-Test deckt diesen Ablauf zusätzlich ab.
Installation und OAuth/Push auf echten Mobilgeräten sind nicht Teil dieser Abnahme.

Nächster Schritt: unabhängige PR-Prüfung und vollständige CI; Merge und Deployment durch Mike.
