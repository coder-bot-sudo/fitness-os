# Fitness OS – UI/UX-Designregeln

Stand: 06.11.2026. Diese Regeln gelten für neue und überarbeitete Oberflächen.

1. **Mobile-first:** Die wichtigsten Handlungen sind auf dem iPhone mit einer Hand erreichbar. Touch-Ziele mindestens 44 × 44 px, iOS-Safe-Area berücksichtigen.
2. **Reduzierte Komplexität:** Standardansichten zeigen nur die nötigen Informationen. Erweiterte Einstellungen werden erst nach bewusster Auswahl eingeblendet (Progressive Disclosure).
3. **Navigation:** Unterseiten erhalten oben links in der App-Kopfzeile einen einfachen Zurück-Pfeil mit Accessible Name „Zurück“. Der primäre Abschluss („Fertig“, „Speichern“) befindet sich unten, ohne Inhalte oder Systemnavigation zu verdecken. Keine doppelten Navigationselemente.
4. **Übungslisten:** Kompakte Zeilen mit Namen und kurzer Zusammenfassung. Maximal eine Übung ist für die Bearbeitung aufgeklappt. Drag-Handle rechts, Long-Press + Ziehen, keine Scrollblockade außerhalb des Handles. Tastatur- und Screenreader-Alternative vorsehen.
5. **Konsistenz:** Abstände, Schriften, Farben, Interaktions- und Bestätigungszustände folgen dem bestehenden dunklen Design. Wichtige Aktionen primär, destruktive Aktionen klar getrennt.
6. **Fehlertoleranz:** Änderungen sofort lokal sichern, Cloud automatisch abgleichen, keine unbeabsichtigten Datenverluste. Status nur bei Bedarf sichtbar; irreversible Aktionen ggf. bestätigen.
7. **Barrierefreiheit:** Semantische Buttons, aria-expanded/aria-controls für Akkordeons, sichtbare Fokusmarkierung, verständliche Labels, Tastaturbedienung, prefers-reduced-motion und ausreichend Kontrast.
8. **Release-Qualität:** Für jede Änderung die sichtbare App-Version und Asset-Cache-Version aktualisieren. Automatisierte Desktop- und Mobile-Browsertests inkl. Regression, Reload und Layoutüberlauf ergänzen; echtes Safari-/Supabase-Verhalten separat abnehmen.
9. **UX-Review vor dem Merge:** Leere und lange Listen, lange Namen, Tastaturöffnung, Bildschirmskalierung, Drag/Scroll, Fehlerzustände und Navigation prüfen. Browser-Emulation nicht mit realen iPhone-/Mac-Tests gleichsetzen.
