# Sommer 2027 – Unser Frankreich-Abenteuer

Eigenständige statische Website (HTML, CSS, JavaScript) für Amboise, Île de Ré und Le PAL.

## Lokal testen
Im Ordner `python3 -m http.server 8000` starten und `http://localhost:8000` öffnen. Auf dem iPhone kann die HTML-Datei auch lokal angezeigt werden, für die Karte braucht es aber eine Internetverbindung.

## Funktionen
- 59 kuratierte Reiseideen (36 Île de Ré, 15 Amboise, 8 Le PAL), jeweils mit Quellenlink
- Suche, Region- und Kategoriefilter, Favoriten
- Ferienkalender für die bestätigte Inselwoche 10.–17. Juli 2027
- Aktivitäten eintragen, verschieben, entfernen, eigene Ideen, Rückgängig
- Browser-Speicherung, JSON-Export und -Import
- Interaktive OpenStreetMap-Karte über Leaflet mit drei regionalen Kartenausschnitten und kontrastreichen Markern (online)
- Responsive Navigation und grundlegende Offline-Nutzung

## Grenzen / offene Punkte
- **Keine automatische Synchronisation** zwischen Geräten.
- Die anderen Etappen haben noch keine bestätigten Daten, deshalb noch keinen Kalender.
- Alle Informationen, Preise und Öffnungszeiten für Juli 2027 müssen vor der Reise geprüft werden.
- Die Galerie zeigt sechs ausgewählte Unsplash-Fotos mit Quellen. Zusätzliche recherchierte Bildquellen stehen in PHOTO_RESEARCH.json; das Le-PAL-Tiermotiv ist ein Symbolbild, keine Parkaufnahme.
- Externe Dienste (Karte, Schriften, Fotos) benötigen Internet.
- Keine vertraulichen Buchungsdaten eingeben.
- Live auf GitHub Pages: https://mikefaehch.github.io/Sommer2027/

## Bilder
Sechs konkrete Unsplash-Fotos sind jetzt dokumentiert in `PHOTOS.json` und `CREDITS.md`. Die Bilder werden online geladen. Das Le-PAL-Bild ist ein atmosphärisches Tiermotiv und keine Parkaufnahme.

## Bildwelt V4
11 weitere ortsverifizierte Bildquellen in `PHOTO_RESEARCH.json`, Unsplash und Pexels. Die recherchierten zusätzlichen Quellen bleiben in PHOTO_RESEARCH.json; die Website zeigt eine echte Galerie aus den sechs bestehenden CDN-Fotos. Einheitliche dezente Bildfarbkorrektur und Ausschnitte per CSS.

## V5 – Bildredaktion
- Ruhigere Farbbehandlung.
- Sechs recherchierte Ortsfotos von Unsplash/Pexels sind direkt bei den jeweiligen Erlebnissen als Originalseiten verlinkt; Originaldateien sind noch nicht lokal eingebunden.
- Le PAL verwendet ein atmosphärisches Tiermotiv, keine dokumentarische Aufnahme des Parks.
- Bildquellen und Lizenzen vor Veröffentlichung nochmals prüfen.

## V7 – Redaktion und Offline-Cache
- Technische Bildrecherche-Texte entfernt; echte Fotogalerie mit sechs Bildern und Quellen.
- Hero-Nachweis dezent; Le PAL mit Symbolmotiv.
- Beide Guide-Unterseiten im Service-Worker-Cache (sommer2027-v4).
- Countdown bis zur Inselwoche. Externe Bilder, Schriften und Karte benötigen online Zugriff.
- Restauranttipps sind Kandidaten, keine Buchungen.

## Familien-Login und Supabase (Pilot)
- `familien-login.html`: Google OAuth über Supabase; Zugriff auf private Daten nur für freigeschaltete Einträge in `family_members` (RLS).
- `gemeinsamer-plan.html`: geschützte Vorschau des Supabase-Plans und optionaler einmaliger Import. Für diese Reise ist kein Import erforderlich, da noch keine Planung besteht.
- `supabase/schema.sql`: Datenbankschema und Zugriffsregeln; `supabase/SETUP.md`: Einrichtungsanleitung. Das SQL-Schema ist nicht vollständig idempotent und darf nicht ohne Prüfung erneut ausgeführt werden.
- **Aktueller Stand:** Angemeldete Familienmitglieder synchronisieren den Hauptkalender über Supabase, inklusive Abstimmungen und Änderungsverlauf. Ohne Anmeldung wird weiterhin lokal geplant. Ein geheimer Gäste-Leselink ist noch nicht umgesetzt.
- **iPhone-Hinweis:** Google OAuth aus einer installierten Home-Bildschirm-Web-App kann im Safari-Browser statt in der App enden. Für den Login vorerst Safari verwenden.
- `supabase/public-config.js` enthält nur öffentliche Konfigurationswerte; niemals Service-Role-Schlüssel oder OAuth-Secrets ins Repository übernehmen.
- Supabase JS wird derzeit über einen nicht exakt gepinnten `@2`-CDN-Pfad geladen. Feste Version und Content-Security-Policy sind vor dem produktiven Einsatz noch zu ergänzen.

## Familienkalender – erste Integration (Oktober 2026)
- Hauptkalender umfasst 7.–20. Juli 2027; freigeschaltete Google-Nutzer laden und speichern den gemeinsamen Plan in Supabase.
- Die Stimmen werden je Person in `activity_votes` gespeichert, mit Änderungsübersicht aus `change_log`.
- Optimistische Sperre über `updated_at` verhindert stilles Überschreiben konkurrierender Kalenderänderungen; bei Konflikten wird der aktuelle Plan neu geladen.
- Nicht angemeldete Nutzer können weiterhin nur lokal planen; dies ist **nicht** der gemeinsame Familienplan.
- Noch offen: Browser-übergreifende End-to-End-Tests, automatische Live-Updates, detaillierte Kalender-Diffs, Gast-Leselink und vollständige Offline-Synchronisation.
- Für bestehende Supabase-Installationen vor dem Testen des Entfernens einer Stimme die additive Migration `supabase/migrations/20261025_fix_vote_audit.sql` im SQL Editor ausführen.
