# Quelle · 01 repel attract

| | |
|---|---|
| Originalprogramm | `repel_attract.nlogo` („01_repel attract“, 01.01.2005) |
| Sprache | NetLogo 2.1 (Applet auf der alten Website) |
| Autor | Reinhard König |
| Jahr | 2005 |
| Seite der alten Website | Strukturexperimente › Experimente mit NetLogo – https://www.entwurfsforschung.de/alt/Strukturfor/netlogo/repel_attract.html (Liste: …/netlogo/netLogo.htm, „01_repel attract - 050101“) |
| Archivseite | [Strukturexperimente › Experimente mit NetLogo](../../../archiv/strukturexperimente/netlogo/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/netlogo/repel_attract.nlogo` (nur gelesen) |

## Übernommen

- **setup**: `ca`, Patches weiß, `crt density` (zufällige ganzzahlige Richtung), `setxy random-int-or-float screen-size-x random-int-or-float screen-size-y` – ganze Zahlen 0 … 200, in der Welt gefaltet, also gleichverteilt über alle Patches –, turtles schwarz, Form `circle`; dann nacheinander `while [any? other-turtles-here] [fd 1]`: jede turtle geht in ihrer Richtung vor, bis sie allein auf ihrem Patch steht.
- **attract** (Dauerknopf): `set heading towardsxy 0 0`, `ifelse (distancexy 0 0) < radius [bk 1] [fd 1]`.
- **repel** (Dauerknopf): `set closest-turtle min-one-of turtles with [self != myself] [distance myself]`, `set heading towards closest-turtle`, `bk repel-strength`. Die auskommentierte Zeile `;if (distance closest-turtle > 0)` des Originals zeigt, dass der Fall „gleicher Punkt“ bekannt war (siehe unten).
- **Welt** aus dem GRAPHICS-WINDOW: `screen-edge-x/y 100` → Patches −100 … 100, 201 × 201; Rand als Torus (in NetLogo 2.x immer), `distance` und `towards` über den kürzesten Weg.
- **Schieberegler** (SLIDER-Blöcke): `density` 0–500, 105 · `radius` 0–130, 33 · `repel-strength` 0–5, 1,0, Schritt 0,2.
- **NetLogo-Übersetzung**: stetige Koordinaten (`Float64Array`), Patch = gerundete Koordinate; heading in Grad, 0 = Norden, im Uhrzeigersinn; `ask turtles` nacheinander in zufälliger Reihenfolge je Durchlauf (Fisher-Yates mit der Saat), jede turtle sieht die neuen Orte der vorigen.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt NetLogos Zufall ohne Saat. „Zurück“ = `setup`.
- **Dauerknöpfe als Schalter** „attract“ und „repel“, zu Beginn beide **an** (im Original musste man sie erst drücken). Ein Schritt = ein Durchlauf jedes eingeschalteten Knopfs, erst attract, dann repel; in NetLogo liefen zwei gedrückte Dauerknöpfe abwechselnd.
- **Gleicher Punkt**: Steht die nächste turtle (oder bei attract der Ursprung) genau auf dem eigenen Punkt, behält die turtle ihre Richtung; NetLogo bricht dort mit einem Laufzeitfehler ab.
- **setup**: höchstens 804 Schritte vor (4 × 201), falls eine turtle keinen freien Patch findet (nur bei density nahe 40 401 denkbar).
- **Darstellung**: turtles mindestens etwa 4 Bildpunkte groß (bei patch-size 2 waren sie im Original 1,6 px); dunkel weiße turtles auf Schwarz; neu ein gestrichelter Kreis mit dem Radius um den Ursprung (abschaltbar).
- **Kennzahlen neu** (nicht im Original): mittlerer Abstand zum Ursprung mit Streuung, mittlerer Abstand zur nächsten turtle mit Streuung, kleinster Abstand. Tests prüfen damit: attract allein → Kreis mit Radius `radius` (Streuung < 1), repel allein → nahezu gleiche Abstände (≈ √(201² / density)), beide → Kreis mit größeren Abständen.
