# Fitness OS – Designregeln

**Status:** Verbindliche UX-/UI-Leitlinien für neue und überarbeitete Oberflächen.  
**Ausgangspunkt:** Freigegebener Entwurf des Trainingsplan-Editors, GitHub Issue #27.

## 1. Gestaltung und visuelle Sprache

- **Mobile-first:** Hauptanwendungsfall ist die Bedienung auf dem iPhone (Safari und Home-Screen-PWA), auch mit einer Hand. Desktop bleibt vollständig nutzbar.
- **Ruhiger Dark Mode:** tiefes Marineblau als Hintergrund, leicht abgesetzte Karten, sparsame blaue Akzente für Navigation und aktive Elemente, Grün für erfolgreich abgeschlossene Aktionen, Rot für destruktive Aktionen. Kein unnötiges Farbfeuerwerk.
- **Klare visuelle Hierarchie:** Titel, Kontext, primäre Aktion und sekundäre Details sind eindeutig erkennbar. Wenige, gut gruppierte Controls statt vieler gleichwertiger Buttons.
- **Konsistenz:** Abstände, Radien, Typografie, Icons, Feedback und Button-Zustände werden zwischen Planeditor, Katalog, Training, Dashboard und Konto wiederverwendet.
- **Lesbarkeit:** ausreichend große Schrift, Kontrast, aussagekräftige Labels und klare Einheiten (kg, Wdh., s).

## 2. Navigation

- **Unterseiten haben oben links einen schlichten Zurück-Pfeil** (Icon-Button mit Accessible Label „Zurück“). Keine doppelte große „Zurück“-Schaltfläche im Content.
- Der Bildschirmtitel steht im Kopfbereich; die eigentliche Aufgabe erhält den meisten Platz.
- **Primäre Abschlussaktion „Fertig“ unten**, möglichst am unteren sicheren Bildschirmrand (Safe Area); keine Überdeckung durch Tastatur, Bottom-Tabs oder PWA-Chrome.
- **Globale Bottom-Navigation nur ohne laufendes Training.** Bei aktiver Einheit werden kontextabhängige Trainings-Tabs genutzt.
- Änderungen an Planvorlagen und Training werden nicht durch unerwartete Navigationswechsel verloren.

## 3. Progressive Disclosure: nur Relevantes anzeigen

- In Listen zunächst **kompakte Zusammenfassungen** statt aller Detailfelder anzeigen.
- Nur die aktuell ausgewählte Übung ist aufgeklappt; das Öffnen einer anderen klappt die bisherige wieder zu.
- Übungszeile zeigt im eingeklappten Zustand Name, optional Thumbnail und Kurzinfo (z. B. „3 Sätze · 8–12 Wdh. · 90 s Pause“).
- Erst die aufgeklappte Übung zeigt Sätze, Wiederholungen, Pause und kontextuelle Aktionen.
- Leere Zustände haben eine klare Handlungsoption; optionales und Fortgeschrittenes bleibt bis zum Bedarf verborgen.

## 4. Trainingsplan bearbeiten: Interaktionsregeln

- Übungen per **Press-and-Hold auf dem rechten Drag-Handle** greifen und per Ziehen in der Liste umsortieren.
- Der Drag-Handle ist optisch eindeutig, hat ausreichend große Touch-Fläche und löst keine Übungsauswahl aus.
- Normales Scrollen außerhalb des Handles bleibt möglich; beim Drag visuelle Zielposition und eindeutiges Feedback.
- Für Tastatur und Screenreader existiert eine zugängliche alternative Sortiermöglichkeit (z. B. im Kontextmenü).
- Übungen ein-/ausklappen und Übungsdetails öffnen sind getrennte Interaktionen.
- Ein und derselbe durchsuchbare Übungskatalog wird im Editor und im aktiven Training verwendet.

## 5. Bedienbarkeit und Sicherheit

- Große Touch-Ziele (nach Möglichkeit mindestens 44 × 44 CSS-Pixel), ausreichend Abstand, keine versehentlichen Doppeltaps.
- **Primäre Aktion pro Bildschirm** eindeutig; gefährliche Aktionen sind optisch getrennt und benötigen ggf. Bestätigung.
- Sichtbares Feedback beim Speichern, bei Fehlern und für laufende Aktionen; keine irreführenden Erfolgsmeldungen.
- Input-Fokus und Tastatur berücksichtigen; Formulare nicht unnötig zurücksetzen.
- Barrierefreiheit: semantische Buttons, `aria-expanded` im Accordion, zugängliche Namen für Icons/Drag-Handles, Fokusmanagement, Tastaturbedienung, `prefers-reduced-motion`.

## 6. Engineering- und Review-Checkliste

Vor jeder UI/UX-Änderung:
1. Den konkreten Nutzerablauf und die wichtigste Aufgabe im jeweiligen Kontext identifizieren.
2. Bestehende UI-Muster prüfen und wiederverwenden, statt neue Navigation oder Spezialmodi zu erfinden.
3. **Mobile Entwurf zuerst:** Standardzustand, Auswahl-/Bearbeitungszustand, Lade-/Leer-/Fehlerzustand und destruktive Aktion durchdenken.
4. Progressive Disclosure nutzen; Optionen nur dann zeigen, wenn sie gebraucht werden.
5. iPhone Safari/PWA und Mac prüfen, einschließlich Scrollen, Tastatur, Safe Area und Touch-Interaktionen.
6. Bestehende Trainingsdaten, Supabase-Synchronisierung und Rückwärtskompatibilität prüfen.
7. Änderungen als nachvollziehbaren PR mit UX-Screens/Testhinweisen bereitstellen und vor Merge testen.

## Geltungsbereich

Diese Regeln gelten als **Standard**, nicht als starres Hindernis. Abweichungen sind möglich, wenn der konkrete Nutzerablauf dadurch nachweislich einfacher und zugänglicher wird. Designentscheidungen dann im PR kurz begründen.

**Referenzen im Projekt:** [Issue #27](https://github.com/coder-bot-sudo/fitness-os/issues/27), [Plan-Editor #18](https://github.com/coder-bot-sudo/fitness-os/issues/18).
