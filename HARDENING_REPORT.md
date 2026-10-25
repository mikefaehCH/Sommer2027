# Sommer2027 – Konsolidierung und Sicherheits-Härtung

Stand: 25. Oktober 2026. Ausgangspunkt von `main` und Arbeitsbranch:
`cba8785a7e48acb55202ba4a67e5a72a9ed43d0d`.
Alle Änderungen ausschliesslich auf `chore/sommer2027-hardening`.
Keine SQL-Ausführung, keine produktiven Datenbankänderungen, kein Redesign und keine neuen
Reisefunktionen. Die 59 Aktivitätsdatensätze sind inhaltlich unverändert; der statische Test
prüft ihren SHA-256 gegen den Ausgangsstand.

## Aufgaben und Commits

| Reihenfolge | Aufgabe | Commit | Tatsächlich nach der Aufgabe geprüft |
| --- | --- | --- | --- |
| 1 | Prettier, 100 Zeichen, einfache Anführungszeichen | `c95da62` | Formatprüfung; semantischer AST-Vergleich der fünf JS-Dateien (normalisierte Property-Keys); Chromium-Grundregression |
| 2 | Exaktes Pinning und SHA-384-SRI | `0f6a02e` | Je zwei identische HTTPS-Downloads; SHA-384; erneute Chromium-Grundregression |
| 3 | Bildkatalog, einmalige Recherche, Reviewseite, keine Laufzeitsuche | `bf2e8d3` | 59 Katalogeinträge; vier Einzelbilder visuell geprüft; drei Originalseiten/Lizenzlinks geprüft; erweiterte Chromium-Regression |
| 4 | Ressourceninventar, CSP, ausgelagerte Scripts und Styles, reproduzierbare QA | `18de576` | Statische Prüfung; Chromium Desktop/Mobil; Karte, Galerie, Import/Export, eigene Idee, Login/AI ohne Session; CSP-Positiv- und Negativtests |
| 5 | Exakter Restaurant-Hinweis | `3ac6601` | Statische Prüfung und erneute erweiterte Chromium-Regression |
| 6 | README konsolidiert | `e539bb0` | Statische Prüfung und erneute erweiterte Chromium-Regression |
| 7 | Service Worker v18, Cacheinventar und Abschlussbericht | letzter Commit dieses Branches | Formatprüfung, statische Prüfung, SW-Guard-Test; Chromium Desktop, 390×844 und 375×667; SW-Upgrade und Offline-Nutzung |

Die Grundregression prüft 59 Aktivitäten, Suche, Favoriten, Hinzufügen, Verschieben,
Entfernen, Rückgängig, lokale Persistenz und fünf Unterseiten. Die erweiterte Regression
prüft zusätzlich 36 Inselmarker, Popup/Details, Galerie, Restaurantfilter, JSON-Roundtrip,
ungültigen Import, eigene Ideen sowie Login-/KI-Sperren ohne Session.
Der Marker-Popup-Test löst das DOM-Klickereignis gezielt aus: sich überlagernde Marker
werden damit nicht als physische Trefferflächen validiert. Es werden keine erfolgreichen
Google-OAuth-Anmeldungen oder produktiven Supabase-Schreibvorgänge behauptet.

## CSP

Vollständige Policy und Inventar: `CSP.json`. Die sechs öffentlichen HTML-Seiten liefern sie
als Meta-Element vor den Ressourcen aus. Inline-Scripts, Inline-Handler und HTML-Styleattribute
sind entfernt; `unsafe-inline`, `unsafe-eval` und Wildcards sind nicht enthalten.

- Default, Objekte, Frames und Base-URL: `none`.
- Scripts: eigene Dateien, exakte Supabase- und Leaflet-URLs; externe Libraries zusätzlich SRI.
- Styles: eigene Dateien, exakte Leaflet-CSS-URL und Google Fonts CSS.
- Schriften: `fonts.gstatic.com`.
- Bilder: eigene Dateien, Unsplash, Wikimedia-Thumbnail-Host, drei konkrete OSM-Tile-Hosts,
  `data:` und lokale `blob:`-Vorschau für das Reisetagebuch.
- Verbindungen: eigener Origin und genau `kgtowblwixgfdnbgcjeq.supabase.co`.
- Worker und Manifest: eigener Origin; Formulare: eigener Origin.

Die erste CSP-Prüfung blockierte den tatsächlich verwendeten Host `thumb.wikimedia.org`.
Dieser konkrete Host wurde statt einer pauschalen Wikimedia-Freigabe aufgenommen.
Die abschliessenden regulären Chromium-Abläufe erzeugen keine CSP-Verletzungen.
Gezielt injizierte Inline-Scripts und Bilder von `blocked.invalid` werden erwartungsgemäss
blockiert. Diese erwarteten Negativtest-Verletzungen zählen nicht als normale Seitenfehler.
`frame-ancestors` ist per Meta wirkungslos und wird nicht als implementiert behauptet;
dafür wären konfigurierbare HTTP-Header erforderlich.

## Verifizierte Bibliotheken und Hashes

Quelle, Bytezahl und Prüfmethode: `DEPENDENCIES.json`. Alle Einbindungen verwenden
`crossorigin="anonymous"`. Die Browserprüfung lädt die verifizierten Originalbytes als
kontrollierte CDN-Fixtures und prüft, dass beide Bibliotheken tatsächlich verfügbar sind.
`npm run verify:sri` lädt die echten CDN-Dateien erneut und vergleicht Hash und Bytezahl.

| Datei | Version | SHA-384-SRI |
| --- | --- | --- |
| Supabase UMD | 2.57.0 | `sha384-/E7xfJz9bbCsrwJAbrt9CO5JB1REPVQjuSrQT4Cpz2BQBocDVsGLB2/VMAEzYaf+` |
| Leaflet JS | 1.9.4 | `sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH` |
| Leaflet CSS | 1.9.4 | `sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H` |

## Bildabdeckung

| Status | Anzahl |
| --- | ---: |
| Katalogabdeckung | 59/59 |
| Visuell geprüft und freigegeben | 3/59 (5,1 %) |
| Visuell geprüft und abgelehnt | 1 |
| Ungeprüfte Kandidaten | 26 |
| Kein geeigneter Suchtreffer | 15 |
| Recherchefehler (HTTP 429) | 14 |

Freigegeben: Clos Lucé (Thesupermat, CC BY-SA 4.0), Château d’Amboise (Ввласенко,
CC BY-SA 3.0), Château de Chaumont-sur-Loire (Carcajou, CC BY-SA 3.0).
Die drei Bilder wurden einzeln visuell betrachtet und ihre Wikimedia-Dateiseiten mit
Lizenzverweis geladen. Der Chenonceau-Kandidat zeigt nur den Glockenturm und wurde als
nicht ausreichend repräsentativ abgelehnt. Die übrigen 56 Aktivitäten zeigen Platzhalter.
Kein ungeprüfter Treffer wird automatisch produktiv. Die sechs bestehenden Galerie-Fotos
und bisherigen Hero-Motive bleiben erhalten. Vollständige Titel, Autoren, Lizenz- und
Quelllinks sowie die Prüfnotizen stehen in `ACTIVITY_PHOTOS.json`.

Die einmalige Recherche ist gelaufen. HTTP-429-Fälle sind keine erfolgreichen Bildnachweise.
Weitere Bildfreigaben oder eine vollständige fotografische Abdeckung sind ausdrücklich offen.

## Service Worker und Daten

v18 precacht die öffentlichen App-Dateien einschliesslich Bildkatalog und ausgelagerter
Scripts/Styles. Beim Installieren wird der HTTP-Cache erneut validiert; der Hauptscript-URL
hat eine neue Versionskennung. Private Antworten, externe Dienste und Schreibrequests
werden nicht gecacht. Geprüft: Wechsel v17→v18, Erhalt eines fremden Testcaches, Offline-
Aktivitätsdaten und offline funktionierender Restaurantfilter. Ein separater Guard-Test
prüft den Bypass für Supabase-Pfade, Authorization-Header, fremde Origins und Nicht-GET.

Die Tests nutzen neue Browserkontexte und lokalen Testspeicher. CDN-Bytes sind echt,
Bilder/Kacheln werden deterministisch ersetzt; Google-Fonts-CSS ist im Browsertest leer.
Daraus folgt kein Nachweis einer voll geladenen externen Live-Bildwelt oder identischer
Schriftdarstellung. Unerwartete JavaScript-Seitenfehler werden erfasst; ein vollständiges
Live-Netzwerk-/Konsolenaudit wird damit nicht behauptet.

## Reproduzieren und offene Prüfungen

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run format:check
npm run check
npm run verify:sri
npm test
TEST_VIEWPORT=mobile npm test
TEST_VIEWPORT=se npm test
TEST_BROWSER=webkit npm test
```

Lokal bestanden: Format, statische Validierung, echte CDN-Hashprüfung, Chromium in den
oben genannten drei Viewports einschliesslich SW-Upgrade/Offline.
Lokal blockiert: WebKit fehlen Systembibliotheken; deren Installation scheiterte an den
Berechtigungen der Ausführungsumgebung. Der Startversuch ist fehlgeschlagen und zählt
nicht als bestandener Test. `.github/workflows/quality.yml` prüft beide Engines in allen drei
Viewports auf einem GitHub-Runner. Dessen Ergebnis ist vor einem Merge separat zu prüfen.

Offen: echte iPhones/Safari-OAuth, produktive RLS-/Cloud-Konfiguration und eingeloggte
Mehrgeräte-Konflikte, produktives Edge-Function-Deployment/OpenAI-Antworten, vollständige
externe Link-/Bildprüfung, axe und Lighthouse. Produktive Daten wurden dafür nicht verändert.
Keine automatische Freigabe für `main` aus den lokalen Ergebnissen ableiten.


## CI-Nachprüfung

Der erste GitHub-Lauf `40214123781` bestand in allen drei Chromium-Viewports.
WebKit bestand die Online-Regression und Cache-Vorbedingungen, scheiterte aber in allen drei
Viewports an `setOffline(true)` mit „WebKit encountered an internal error“ bei der Navigation.
Dieses Symptom entspricht dem im Playwright-Projekt dokumentierten Problem
https://github.com/microsoft/playwright/issues/42775; eine genaue interne Ursache wird hier
nicht behauptet. Die fehlgeschlagene Emulation wird nicht als bestandener Test umgedeutet.

Für WebKit prüft der abschliessende Test deshalb die Nichterreichbarkeit des Origins:
der lokale Testserver wird wirklich geschlossen, eine frische Seite ohne Service Worker muss
beim Laden scheitern, und die kontrollierte App-Seite muss ihre Antwort nachweislich aus dem
Service Worker erhalten. Der Restaurantfilter muss dabei weiter funktionieren. Dieser Test
belegt den Cache-Fallback bei Serverausfall; er ersetzt keinen echten Safari-Flugmodus-Test.
Chromium prüft weiterhin `setOffline(true)`. Diese Anpassung ändert keine Sicherheitsregel
und keine Produktionsdatei; sie wird mit dem letzten Aufgabencommit nachgeprüft.
