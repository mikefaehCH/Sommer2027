# Sommer 2027 – Anleitung für Claude

Familien-Reisewebsite Frankreich Juli 2027 (Amboise · Île de Ré · Le PAL). Statisch auf GitHub Pages
(`https://mikefaehch.github.io/Sommer2027/`), ohne Build. Privater Teil über Supabase (Login, gemeinsamer Plan,
Abstimmungen, KI-Assistent als Edge Function). Sprache: Deutsch, Schweizer Schreibweise (kein ß).

## Arbeitsweise
- Nie direkt auf `main`: Branch, kleine Commits, Pull Request. Kein Force-Push, kein Merge ohne Mike.
- SQL in `supabase/` wird **nicht** automatisch ausgeführt. Keine Secrets im Repo (siehe README «Sicherheit»).

## Dateien
| Datei | Inhalt |
|---|---|
| `index.html` + `index-inline-*.js`, `index-page.css` | Startseite (Reise, Kalender, Route, Entdecken, Karte, Galerie, Infos) |
| `data.js` | Aktivitäten (59), Regionen, Tage |
| `app.js` | Logik Startseite: Kalender, Entdecken (`renderDiscover`, zuerst 12 Ideen), Karte, Supabase-Sync |
| `style.css` | Gestaltung; Abschnitt «v24» am Ende = mobile Regeln (Touch-Ziele, kompakte Karten, Galerie) |
| `ACTIVITY_PHOTOS.json` | Fotokatalog; angezeigt wird nur `status: approved` mit `checkedAt` und `reviewer` |
| `sw.js` | Service Worker: `CACHE` (App-Dateien), `sommer2027-fotos` (externe Fotos). Bei Änderung `CACHE` hochzählen |
| `CSP.json` | Content-Security-Policy; jede neue externe Quelle dort und in allen HTML-Metas eintragen |
| `assets/icons/` | App-Symbole (SVG, 180/192/512 px) |
| `tests/` | `static`, `security`, `service-worker`, `regression`, `mobile-quality` |

## Prüfen
`npm ci`, dann `npm run format:check && npm run check && npm test`
(Browser-Tests brauchen Playwright; `npm run verify:sri` lädt die gepinnten Bibliotheken nach `.qa-cache/`).
`tests/mobile-quality.cjs` verlangt: kein Überlauf bei 390 px, Bedienelemente ≥ 44 px (Bildnachweise ≥ 24 px),
keine Emojis, App-Symbole vorhanden, Startseite ≤ 20 000 px hoch.

## Regeln
- Keine Emojis als Gestaltung; Symbole mit `aria-hidden="true"`.
- Kontrast mindestens 4,5:1 (Farben `--rust` `#965a3e`, `--muted` `#5c6965`).
- Bilder nur mit geprüfter Lizenz und Ortsbezug; Ungeprüftes bleibt ausgeblendet, keine leeren Platzhalter.
- Keine Buchungsnummern, Preise der eigenen Buchungen oder privaten Daten in öffentliche Dateien.
