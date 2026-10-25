# KI-Reiseassistent – Einrichtung

Die Website bietet acht Modi: Tagesplan, Wetter, Konsens, Chat, Route, Restaurants, Kinder-Erklärungen und Reisetagebuch. Die Oberfläche ist auf `ai.html` erreichbar.

## Aktivieren (erforderlich)
1. Supabase CLI installieren und mit dem bestehenden Projekt verknüpfen.
2. In Supabase ein **geheimes** `OPENAI_API_KEY` hinterlegen (Supabase Dashboard → Edge Functions → Secrets oder `supabase secrets set OPENAI_API_KEY=...`). Niemals in GitHub oder `public-config.js` speichern.
3. `supabase functions deploy travel-assistant` ausführen.
4. Im Browser über `familien-login.html` mit einem freigeschalteten Familienkonto anmelden. Der Assistent ist danach über `ai.html` nutzbar.

Die Edge Function validiert den Supabase-JWT und prüft `family_members` über RLS. Ohne freigeschaltetes Konto oder Server-Secret verweigert sie die Anfrage. Das Modell kann über `OPENAI_MODEL` konfiguriert werden; Standard ist `gpt-4.1-mini`.

## Grenzen und Datenschutz
- Wetter wird nur für Daten innerhalb des verfügbaren Open-Meteo-Vorhersagehorizonts abgefragt; für Juli 2027 ist derzeit keine belastbare Prognose möglich.
- Restaurants, Öffnungszeiten, Buchungen und Fahrzeiten sind ohne zusätzliche Live-Quellen nicht verifiziert.
- Routen sind Vorschläge auf Basis der Aktivitätskoordinaten, keine Turn-by-Turn-Navigation.
- Fotos für das Tagebuch werden **nur lokal als Vorschau** angezeigt und nicht an die KI übertragen; der Bericht entsteht aus Stichworten. Keine Cloud-Fotogalerie.
- Die KI liest, sofern zugänglich, den gemeinsamen Plan und die Abstimmungen. Sie schreibt keine Kalenderänderungen.
- Prompts, Aktivitätsdaten, Kalender und Abstimmungen werden an den konfigurierten KI-Anbieter gesendet. Keine sensiblen Angaben eingeben. Datenschutz und API-Kosten vor Aktivierung prüfen.
- Es gibt derzeit kein serverseitiges Rate-Limit je Nutzer. Vor breiter Nutzung ergänzen.
- Deployment und Browser-End-to-End-Test sind noch nicht durchgeführt.

## Verbindliche Restaurantregel
- Alle Restaurantempfehlungen in sämtlichen KI-Modi müssen eine **nachweislich aktuelle Google-Maps-Bewertung von mindestens 4,2/5** haben.
- Die aktuelle Implementierung hat **keine Google-Maps-Places-Anbindung**. Deshalb gibt der Assistent keine konkreten, unbestätigten Restaurantempfehlungen aus. Eine Places-API-Integration mit serverseitigem Rating-Filter ist vor der Ausgabe konkreter Empfehlungen nötig; Bewertungen niemals erfinden.
