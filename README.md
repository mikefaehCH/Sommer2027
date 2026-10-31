# Sommer 2027 – Unser Frankreich-Abenteuer

## Wiederverwendbare Startvorlage

Unter [`starter/`](starter/README.md) liegt eine eigenständige Reisevorlage mit zentraler
Konfiguration, Orten, Karte, Favoriten, lokaler Planung, JSON-Backup und Offline-Grundlage.
Zwei fiktive Beispielreisen prüfen die Wiederverwendung. Die bestehende Sommer-Webseite
und ihre Daten bleiben unverändert. Neue Projekte entstehen über
`node starter/scripts/create.mjs city /neuer/ordner eindeutige-projekt-id`.

Statische Reisewebsite für Amboise, Île de Ré und Le PAL mit 59 kuratierten Aktivitäten.

## Lokal starten

`python3 -m http.server 8000` im Repository starten und http://localhost:8000 öffnen.
Für Service Worker ist localhost oder HTTPS erforderlich. Eine direkt geöffnete HTML-Datei
unterstützt weder den Bildkatalog noch alle App-Funktionen.

## Bestehende Funktionen

- Suche, Regionen, Kategorien und Favoriten; Quellenlinks je Reiseidee. «Entdecken» zeigt
  zuerst 12 Ideen, weitere auf Wunsch; Ideen ohne geprüftes Foto erscheinen als kompakte Karte.
- Ferienkalender vom 7.–20. Juli 2027: Einplanen, Verschieben, Entfernen, eigene Ideen,
  Rückgängig sowie JSON-Import und -Export.
- Ohne Anmeldung: lokale Speicherung auf dem jeweiligen Gerät.
- Für freigeschaltete Familienmitglieder: gemeinsamer Supabase-Kalender,
  personenbezogene Abstimmungen und Änderungsverlauf. Optimistische Sperren über
  `updated_at` verhindern stilles Überschreiben konkurrierender Planänderungen.
- OpenStreetMap mit Leaflet, drei regionale Ausschnitte und Aktivitätsmarker.
- Inselguide, Restaurantkandidaten, Galerie und KI-Reiseassistent mit acht Modi.

## Bilder und Quellen

Die sechs bestehenden Unsplash-Galeriebilder und Hero-Motive bleiben erhalten.
Nachweise: `PHOTOS.json`, `PHOTO_RESEARCH.json` und `CREDITS.md`.
Das Le-PAL-Tiermotiv ist ein Symbolbild, keine Parkaufnahme.

`ACTIVITY_PHOTOS.json` enthält für jede der 59 Aktivitäten einen redaktionellen Prüfstatus.
Die Website zeigt ausschliesslich Einträge mit `status: approved`, `checkedAt` und `reviewer`.
Ungeprüfte, ungeeignete oder fehlende Bilder ergeben weiterhin Platzhalter mit Recherchelink.
Autor, Titel, Lizenz und Originalseite stehen im Katalog; Autor und Lizenz am Bild.
Die Angabe einer freien Lizenz belegt allein noch keinen passenden Ortsbezug.

Einmalige Recherche: `node scripts/research-photos.cjs`. Das Werkzeug verwendet die
Wikimedia-API und akzeptiert nur CC BY, CC BY-SA, CC0 oder Public Domain mit Autor.
HTTP-Fehler werden dokumentiert; es gibt keine automatische Bildsuche zur Laufzeit.
Die lokale Reviewseite `http://localhost:8000/scripts/photo-review.html` zeigt alle Einträge.
Vor einer Freigabe Motiv, Ortsbezug und Angaben auf der Originalseite manuell prüfen.
Freigaben bleiben bei einer erneuten Recherche erhalten. Ein Kandidat ist keine Freigabe.

## Sicherheit

- Browserkonfiguration in `supabase/public-config.js` enthält nur öffentliche Werte.
  Service-Role-Schlüssel, OAuth-Secrets und `OPENAI_API_KEY` gehören niemals ins Repository.
- Supabase RLS beschränkt private Tabellen auf freigeschaltete `family_members`.
  Die Website und deren Quellcode sind öffentlich; der Login schützt Datenbankzugriff,
  nicht die öffentlichen HTML-Seiten. Die RLS-Konfiguration der produktiven Datenbank
  muss separat geprüft werden; lokale Tests beweisen ihre Installation nicht.
- Die KI-Anfragen gehen über eine geschützte Supabase Edge Function.
  Der OpenAI-Key bleibt serverseitig. Deployment und Konfiguration siehe `AI_SETUP.md`.
  Die KI schreibt keine Kalenderänderungen. Eingaben werden an den KI-Anbieter übertragen.
- Supabase JS 2.57.0 und Leaflet 1.9.4 sind exakt gepinnt, mit SHA-384-SRI und
  `crossorigin="anonymous"`. URLs und verifizierte Hashes stehen in `DEPENDENCIES.json`.
- Alle Seiten verwenden eine CSP vor den Ressourcen. Inline-Skripte und HTML-Styles
  sind ausgelagert; Inline-Handler und `eval` sind nicht erlaubt. Ressourceninventar und
  Policy: `CSP.json`. Keine Wildcard-Freigabe für Supabase oder Script-CDNs.
- Die CSP wird auf GitHub Pages als HTML-Meta ausgeliefert. `frame-ancestors` kann dort
  nicht per Meta erzwungen werden und benötigt einen konfigurierbaren HTTP-Header.
- SQL-Schema und Migrationen werden durch diese Konsolidierung nicht ausgeführt.
  `supabase/schema.sql` ist nicht vollständig idempotent; vor Ausführung prüfen.

**iPhone-Hinweis:** Google OAuth aus einer installierten Home-Bildschirm-Web-App kann
im Safari-Browser statt in der App enden. Für den Login vorerst Safari verwenden.

## Offline und Grenzen

Der Service Worker hält öffentliche App-Dateien und App-Symbole lokal bereit. Fotos von
Unsplash und Wikimedia werden beim ersten Ansehen in einem eigenen Cache (`sommer2027-fotos`,
max. 120 Bilder) gespeichert und erscheinen danach auch offline. Externe Bibliotheken,
Schriften und Kartenkacheln sind nicht Teil des Caches. Login, gemeinsamer Plan
und KI benötigen Internet. Private Supabase-Antworten und authentifizierte Requests
werden nicht im Service-Worker-Cache gespeichert. Es gibt keine vollständige
Offline-Synchronisation, keinen Gäste-Leselink und keine automatischen Live-Updates.

Restaurantangaben sind Kandidaten, keine Buchungen. Google-Bewertungen Stand Oktober
2026 – vor dem Besuch nochmals prüfen. Preise, Öffnungszeiten und Angebote für Juli 2027
vor der Reise erneut prüfen. Keine vertraulichen Buchungsdaten in öffentliche Inhalte schreiben.

## Qualitätssicherung

`npm ci`, danach `npx playwright install chromium webkit` (gegebenenfalls mit den
benötigten Systembibliotheken). `npm run format:check`, `npm run check`,
`npm run verify:sri` und `npm test`. Die Browserprüfung nutzt isolierten lokalen Speicher
und deterministische externe Ressourcen; produktive Familiendaten werden nicht beschrieben.
Offene Live-Prüfungen und tatsächlich ausgeführte Tests stehen in `HARDENING_REPORT.md`.

Live: https://mikefaehch.github.io/Sommer2027/
