# Gemeinsame Agentenregeln – Sommer2027

Gilt für ChatGPT/Codex, Claude und weitere Agenten. Technische und Datenschutzregeln in [CLAUDE.md](CLAUDE.md), [ENGINEERING.md](ENGINEERING.md) und [RELEASE_POLICY.md](RELEASE_POLICY.md) haben weiterhin Gültigkeit.

- Vor Arbeitsbeginn `main`-SHA, offene PRs/Issues, Reviews, CI und laufende Agentenarbeit kontrollieren; keine parallele Bearbeitung derselben Aufgabe.
- Kleine Aufgabenbranches und Pull Requests; keine direkten Änderungen an `main`, kein Force-Push.
- Der Product Owner genehmigt den **Umfang**, nicht jede technische Zwischenaktion. Implementierung, Tests, Bugfixes, Review, Merge, Deployment und Live-Prüfung sind für freigegebene Aufgaben eigenständig vorzunehmen, soweit die Repository-Schutzregeln erfüllt sind.
- Alte PRs mit eigenem Freigabevorbehalt (z. B. Bildauswahl, Datenschutz, unabhängige externe Review-Entscheide) werden dadurch **nicht** pauschal freigegeben.
- Autonomes Merge erfordert explizites PR-Opt-in, Routine-Pfadumfang, sechs erfolgreiche Qualitätsjobs und alle übrigen Checks am aktuellen HEAD sowie regulären GitHub-Branchschutz (siehe RELEASE_POLICY.md). Claude-Reviews sind zusätzlich und nicht blockierend. Keine erzwungenen Merges.
- Reale Reise-, Buchungs-, Familien-, Foto-Freigabe- und Finanzdaten nicht ohne spezielle Zustimmung verändern; keine produktiven SQL-Migrationen ausführen; Secrets bleiben ausserhalb des Repositorys.
- UI bleibt mobil nutzbar, sicher und barrierearm. Supabase-RLS nicht aufgrund statischer Tests als produktiv verifiziert ausgeben.
- PR-Kommentare enthalten Agent, Ausgangs-/HEAD-SHA, Änderungen, Testresultate, Risiken und nächsten Schritt.
