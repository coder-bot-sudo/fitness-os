# Fitness OS – Entwicklungsplan

## Vision
Persönliches Fitness OS für iPhone und Mac. Aktuelles Ziel: Body Recomposition (Muskelaufbau und Fettabbau). Ernährung und Training in einer App, mit automatisierter KI-Wochenplanung.

## Phase 1 – Nutzbares Fundament
1. Bestehende App-Dateien in Repository übernehmen und GitHub Pages aktivieren.
2. Supabase-Login, RLS und geräteübergreifende Datenablage einrichten.
3. iPhone- und Mac-Synchronisierung mit realen Tests absichern.
4. Trainingstagebuch und Ernährungslog über Open Food Facts alltagstauglich stabilisieren.

**Abnahme:** Auf iPhone erfasster Satz und Lebensmittel erscheinen am Mac; Daten bleiben nach Neustart erhalten, ohne Datenverlust.

## Phase 2 – Ernährungsplanung
1. Rezeptbibliothek mit überprüften Nährwerten pro Gramm und Portion.
2. Wochentage/Mahlzeiten ein- oder ausschließen; Büro- und Zuhause-Profile.
3. Meal Prep und Resteverwertung bei Rezeptauswahl berücksichtigen.
4. Einkaufslisten aus Zutaten und Mengen automatisch erzeugen.
5. Serverseitigen KI-Planer ergänzen, der sonntags einen überprüfbaren Entwurf generiert; der Nutzer gibt den Vorschlag frei.

## Phase 3 – Optimierung
Trainingsanalyse, Progressive Overload, Wochenreview, adaptive Empfehlungen und Garmin-Anbindung.

## Technik
- GitHub: Quellcode, Issues, GitHub Pages.
- Supabase: Benutzeranmeldung, Datenbank, Row Level Security.
- Open Food Facts: Lebensmittel- und Nährwertinformationen.
- KI: serverseitiger Dienst mit geschütztem API-Schlüssel; kein geheimer Schlüssel im GitHub-Pages-Frontend.

## Sicherheits- und Qualitätsregeln
Keine Fitnessdaten, Passwörter, Secret Keys oder Service-Role-Keys im öffentlichen Repository. RLS und Benutzertrennung vor Echtdatenbetrieb testen. Die App nur als einsatzbereit bezeichnen, wenn die Abläufe auf iPhone und Mac geprüft sind.

Stand: 26.10.2026.
