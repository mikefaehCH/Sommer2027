# Familien-Login und gemeinsame Planung – Setup

Projekt: https://kgtowblwixgfdnbgcjeq.supabase.co

## 1. Datenbank anlegen
Im Supabase Dashboard **SQL Editor → New query** öffnen, den Inhalt von `supabase/schema.sql` einfügen und **Run** wählen. Das Skript ist für ein neues Projekt gedacht und sollte nicht unbesehen mehrfach ausgeführt werden.

## 2. Google-Anmeldung
Unter **Authentication → Providers → Google** den Google Provider aktivieren. Dafür sind OAuth Client ID und Secret aus der Google Cloud Console erforderlich. In Google Cloud die Supabase Callback-URL aus den Provider-Einstellungen als erlaubte Redirect-URI eintragen. Unter **Authentication → URL Configuration** die Site URL `https://mikefaehch.github.io/Sommer2027/` und als Redirect URL `https://mikefaehch.github.io/Sommer2027/**` konfigurieren.

## 3. Familienmitglieder freigeben
Nach der ersten erfolgreichen Google-Anmeldung steht die User-ID unter **Authentication → Users**. Der Projektadministrator trägt die freigegebenen Personen im SQL Editor ein, beispielsweise:

```sql
insert into public.family_members(user_id, display_name, role)
values ('HIER-ECHTE-AUTH-USER-UUID', 'Papa', 'admin');
```

Die IDs dürfen ausschliesslich aus **Authentication → Users** stammen. Nur vier festgelegte Accounts erhalten Schreibrechte. Kinderprofile unter einem Eltern-Login benötigen ein gesondertes, abgesichertes Delegationsmodell; diese Funktion ist noch nicht implementiert.

## 4. Leselink und Synchronisation
Noch **nicht aktiviert**: Ein geheimer Leselink benötigt eine Edge Function, die den Token serverseitig prüft und ausschliesslich freigegebene Lesedaten ausliefert. Der Token darf nicht als direkter Datenbankzugang wirken.

Die Website nutzt derzeit weiter den bisherigen lokalen Kalender. Eine Migration zu synchronisierter Planung muss bestehende Daten kontrolliert übernehmen, Schreibkonflikte behandeln und erst nach erfolgreichem Test aktiviert werden. Ein einzelnes JSON-Dokument kann bei paralleler Bearbeitung sonst Änderungen überschreiben.

## Sicherheit
- `supabase/public-config.js` enthält nur öffentliche Werte.
- Niemals Datenbankpasswort, `service_role` oder `sb_secret_` in GitHub Pages veröffentlichen.
- Row Level Security ist für alle neuen Tabellen aktiviert.
- Nicht eingeloggte Besucher erhalten keinen direkten Tabellenzugriff.
- Die aktuellen GitHub-Pages-Seiten bleiben **öffentlich sichtbar**; erst private Planungsdaten werden später geschützt.
