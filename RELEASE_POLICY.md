# Sommer2027 – autonomer Releaseprozess

1. **Freigabe:** Umfang und Produktentscheidung sind vom Product Owner genehmigt. Diese Freigabe beinhaltet Implementierung bis zur Live-Kontrolle, jedoch **nicht** bestehende ältere PRs ausserhalb des Auftrags.
2. **Branch:** Nur Aufgabenbranch + Pull Request; nie direkter Main-Push oder Force-Push. Persönliche Reise-/Familien- und Bildfreigabedaten bleiben unverändert, falls nicht separat freigegeben. Keine SQL-Migrationen auf produktiven Supabase-Projekten.
3. **CI:** `Hardening quality checks` mit sechs Kombinationen aus Chromium/WebKit und desktop/mobile/SE; Format, statische Sicherheit, SRI, Browser und Offline-Prüfungen müssen auf dem aktuellen SHA bestanden sein.
4. **Review:** Unabhängige GitHub-Approval auf **dem exakten PR-HEAD**; keine offenen Änderungswünsche. Schutzregeln können strengere Anforderungen festlegen.
5. **Opt-in:** Nur PRs mit eigener Textzeile `Autonomy-Release: true` werden von der Merge-Automatik berücksichtigt. Das Opt-in setzt der zuständige Agent nur nach einer nachweisbaren Auftragsfreigabe. Alte PRs bleiben unberührt.
6. **Merge:** GitHub Actions `Autonomous merge` prüft PR-HEAD, freigegebene Aufgabe, CI-Erfolg und unabhängiges Review, dann GitHub-Merge-API mit SHA-Sperre. Vorhandene Branchschutzregeln bleiben wirksam.
7. **Deployment:** Der existierende `Deploy static content to Pages`-Workflow behält das sechsfache `quality-gate` unverändert. **Nach einem Merge durch `GITHUB_TOKEN` wird er mit `workflow_dispatch` explizit gestartet**, da der Merge keinen Push-Workflow auslöst. Nur nach erfolgreichem sechsfachem Gate erfolgt das GitHub-Pages-Deployment.
8. **Produktion:** Danach verifiziert `production-smoke` die über GitHub Pages ausgelieferten Byte-Inhalte von HTML, JS und Service Worker mit dem ausgecheckten Main-Commit. Dies belegt keine produktive Supabase-RLS oder physische iPhone-Tests.
9. **Fehler:** Keine Umgehung fehlgeschlagener Checks. Korrekturbranch/PR; bei Regression Revert-PR, erneut volle QA. Keine automatischen destruktiven Rollbacks.
10. **Eskalation:** Nur grössere Produktentscheidungen, neue kostenpflichtige Dienste, echte Reise-/Buchungs-/Finanzdaten, destruktive Operationen, Datenschutz-/Sicherheitsrisiken und Plattform-Berechtigungsblockaden.

Für eine unabhängige Approval muss ein echter, separat eingerichteter Reviewer arbeiten. GitHub-Auto-Merge auf Repository-Ebene ist derzeit nicht aktivierbar durch den vorhandenen Connector; dieser SHA-gesperrte, überprüfende Workflow ist der alternative Merge-Runner.
