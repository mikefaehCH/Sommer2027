# Prüfung der Entwicklungsabhängigkeiten, 31.10.2026

Refs: Sommer2027 #28.

## Entscheidung

- Prettier 3.9.10 übernehmen; eine Link-Zeilenaufteilung in `index.html` anpassen.
  Vergleich ohne Leerraum ergibt identischen Inhalt.
- Playwright von 1.55.1 auf **1.63.0** aktualisieren und exakt pinnen.
  1.64.0/1.64.1 vorläufig ausschliessen; neue Patch-Versionen bleiben für Dependabot offen.
- CSP und die vorhandenen negativen Sicherheitstests unverändert streng lassen.
  Keine Verstösse ausfiltern, keine Ausnahme für Inline-Styles einführen.

## Nachweis zur verworfenen Version 1.64.1

CI am Commit `cb7edabc1c85752241f8f47f79c4b1a23b678e91`, Lauf
[41176349632](https://github.com/mikefaehCH/Sommer2027/actions/runs/41176349632):
Chromium erfolgreich, WebKit 27.2 meldet unerwartete `style-src-attr`-Verstösse.
Lokal mit exakt diesem WebKit nachvollzogen: Ereignisziele sind die fünf nativen
Auswahllisten der Startseite. Bereits eine isolierte Seite mit `<select>` ohne
Style-Attribut löst den Verstoss aus. `element.style.display` alleine löst ihn nicht aus.

Primärquellen: [Playwright #43497](https://github.com/microsoft/playwright/issues/43497),
[kanonischer Fehler #43416](https://github.com/microsoft/playwright/issues/43416),
[WebKit #327212](https://bugs.webkit.org/show_bug.cgi?id=327212).
Playwright bestätigt die WebKit-Regression; #43497 ist als Duplikat geschlossen,
nicht als behoben. 1.63.0 verwendet WebKit 26.6.

## Erneute Aktualisierung

Bei einer neuen Playwright-Version prüfen, ob sie den WebKit-Fix enthält.
Danach das minimale Select-Beispiel und die vollständige sechsfach-Matrix ausführen.
Erst bei Erfolg Paket/Lockfile aktualisieren und den passenden Dependabot-Ausschluss
entfernen. Ein geändertes Testergebnis darf nicht durch gelockerte CSP oder ausgeblendete
Verstösse hergestellt werden. Merge und Deployment bleiben Mike vorbehalten.
