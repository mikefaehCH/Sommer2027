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
- Interaktive OpenStreetMap-Karte über Leaflet (online)
- Responsive Navigation und grundlegende Offline-Nutzung

## Grenzen / offene Punkte
- **Keine automatische Synchronisation** zwischen Geräten.
- Die anderen Etappen haben noch keine bestätigten Daten, deshalb noch keinen Kalender.
- Alle Informationen, Preise und Öffnungszeiten für Juli 2027 müssen vor der Reise geprüft werden.
- Bilder sind atmosphärische Platzhalter und nicht als echte Aufnahmen der Orte verifiziert.
- Externe Dienste (Karte, Schriften, Fotos) benötigen Internet.
- Keine vertraulichen Buchungsdaten eingeben.
- Keine GitHub-Veröffentlichung vorgenommen.

## Bilder
Sechs konkrete Unsplash-Fotos sind jetzt dokumentiert in `PHOTOS.json` und `CREDITS.md`. Die Bilder werden online geladen. Das Le-PAL-Bild bleibt ein Symbolbild.

## Bildwelt V4
11 weitere ortsverifizierte Bildquellen in `PHOTO_RESEARCH.json`, Unsplash und Pexels. Die Bildquellen sind in der Website unter «Fotos» direkt verlinkt; neue Originalbilder sind noch nicht lokal heruntergeladen. Einheitliche dezente Bildfarbkorrektur und Ausschnitte per CSS.

## V5 – Bildredaktion
- Ruhigere Farbbehandlung.
- Sechs recherchierte Ortsfotos von Unsplash/Pexels sind direkt bei den jeweiligen Erlebnissen als Originalseiten verlinkt; Originaldateien sind noch nicht lokal eingebunden.
- Le PAL verwendet eine grafische Farbfläche statt eines irreführenden Symbolfotos.
- Bildquellen und Lizenzen vor Veröffentlichung nochmals prüfen.
