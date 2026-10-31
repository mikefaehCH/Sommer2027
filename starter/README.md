# Wiederverwendbare Reisevorlage

Eigenständige, statische Vorlage ohne Build und ohne Laufzeit-Abhängigkeit von der Sommer-Webseite.
Die beiden Reisen sind **fiktive Testdaten**, keine Reiseempfehlungen oder Buchungen.

## Neue Webseite starten

Vom übergeordneten Repository aus:

```sh
node starter/scripts/create.mjs city /absoluter/neuer/ordner meine-reise-2028
```

Alternativ `walking` verwenden. Das Ziel darf nicht existieren. Die Projekt-ID muss eindeutig sein.
Der Generator übernimmt ausschliesslich Dateien aus der Vorlage, keine Familien-, Buchungs-,
Finanzdaten, Backend-Konfiguration oder Git-Metadaten. Er aktiviert genau eine Beispielreise.
Danach `trips/city.js` beziehungsweise `trips/walking.js` bearbeiten und alle Beispieldaten ersetzen.
Im erzeugten Projekt: `npm test` (Node 22+, keine Installation nötig).
Lokal über einen statischen HTTP-Server starten, zur Veröffentlichung HTTPS verwenden.

## Konfiguration

`config.js` wählt die Reise. In der mitgelieferten Demo wechselt `?trip=city` oder `?trip=walking`
zwischen zwei Konfigurationen. Eine neue Reise enthält:

| Feld | Bedeutung |
| --- | --- |
| `id` | Stabile, eindeutige Projektkennung; kleine Buchstaben, Ziffern und Bindestriche |
| `title`, `description` | Titel und Einleitung; sicher als Text dargestellt |
| `locale` | Datumsformat (`de-CH`, `en`, `es`); Bedienoberfläche vorerst auf Deutsch |
| `start`, `end` | ISO-Kalendertage, maximal 367 Tage inklusive Start/Ende |
| `color` | Akzentfarbe als Hexwert; bei Änderung Kontrast prüfen |
| `modules` | `places`, `map`, `favorites`, `planning`, `offline`: jeweils `true`/`false` |
| `places` | Orte/Aktivitäten mit `id`, `name`, `category`, `description`, `coordinates: [lat, lon]` |

`manifest.webmanifest` (Name/Farben), `index.html` (Metadaten) und Symbole vor Veröffentlichung anpassen.
Die generischen PNG-Symbole erlauben eine Installation; echte iPhone-/Android-Installation separat testen.

## Herkunft und Modulgrenzen

| Modul | Übernommenes Muster | Umsetzung |
| --- | --- | --- |
| Orte | Sommer2027: Aktivitäts-IDs; Zürich: Filter | Einheitliches Datenformat und reine Filterfunktion in `modules/places.js` |
| Favoriten/Plan | Sommer2027: ID-Referenzen, Normalisierung, JSON-Backup | `modules/state.js`; keine Kopie reisespezifischer Daten oder Cloud-Tabellen |
| Karte | Zürich: lokal vendortes Leaflet 1.9.4, Marker und Text-Popups | `modules/map.js`, eigenes Markerdesign ohne Bildabhängigkeit |
| Offline | Camino/Zürich/Sommer2027: eigener Cache-Namensraum | `sw.js`: Cache pro Installationspfad; nur explizite öffentliche Dateien |
| Oberfläche | Bestehende Such-/Planungsabläufe | `app.js` verbindet Module mit der mitgelieferten HTML-Struktur |

HTML und `app.js` bilden zusammen eine Oberfläche; die reinen Daten-/Zustandsmodule sind unabhängig davon.
Die bestehenden Webseiten werden durch diese Vorlage nicht umgestellt. Verbesserungen werden nicht
automatisch in bestehende Kopien verteilt; dafür ist später eine versionierte Paketpflege nötig.
Leaflet-Lizenz und unveränderte Bibliotheksdateien liegen unter `vendor/leaflet/` (BSD-2-Clause).

## Speicherung und Offline-Grenzen

- Favoriten und Plan liegen nur auf diesem Gerät. Schlüssel trennen Seitenpfad und Projekt-ID.
- Import prüft Format, Reise-ID, Orte, Tage und Duplikate. Übernahme erst nach explizitem Ersetzen.
- Bei gesperrtem/vollen Speicher bleibt die Sitzung nutzbar, mit Hinweis zum Export.
- Nach erfolgreicher Service-Worker-Installation stehen App-Dateien, Orte und lokaler Plan offline bereit.
- Kartenkacheln werden nicht gespeichert. Keine Offline-Routenberechnung oder Cloud-Synchronisation.
- Cache-Löschung betrifft nur den eigenen Scope. Keine Auth-APIs oder beliebigen Same-Origin-Antworten cachen.
- Bei Änderung von App-Dateien `CACHE`-Version in `sw.js` erhöhen und `ASSETS` vollständig halten.
- Modulschalter blenden Funktionen aus; sie sind keine Sicherheits- oder Zugriffskontrollen.
- `offline: false` registriert keinen neuen Worker. Einen zuvor installierten Worker beim Umstellen separat entfernen.

Login und gemeinsame Planung sind als getestete Adapter vorbereitet; Integration und Backend-Vertrag
stehen in [`CLOUD_MODULES.md`](CLOUD_MODULES.md). Sie werden noch nicht in der Oberfläche geladen.
Push, Reisekasse, GPX und Briefings sind weiterhin keine aktivierbaren Module.
Es wird kein Supabase-Projekt eingerichtet und kein gemeinsamer Datenzugriff verändert.

## Prüfung

`npm test` prüft beide Reisen, Schemafehler, Speicherfehler, Datenisolation, Import/Export,
Offline-Dateiliste und Generator. Im übergeordneten Repository ergänzt `tests/starter-browser.cjs`
die bestehende Chromium-/WebKit-Matrix um Suche, Planung, Modulschalter, Persistenz und Überlauf.
Chromium prüft zusätzlich tatsächliches Offline-Laden und die Cache-Isolation.
Browseremulation ersetzt keine Abnahme auf einem echten iPhone oder Android-Gerät.
