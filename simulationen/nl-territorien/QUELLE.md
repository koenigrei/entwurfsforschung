# Quelle · 10 territory fight 01

| | |
|---|---|
| Originalprogramm | `07_territoryFight_3.nlogo` („10_territory fight 01“, 11.03.2005) |
| Sprache | NetLogo 2.1 (Applet auf der alten Website) |
| Autor | Reinhard König |
| Jahr | 2005; Entstehungsdatum 11.03.2005 laut Liste auf `netLogo.htm` („10_territory fight 01 - 050311“), die Datei selbst trägt kein Datum |
| Seite der alten Website | Strukturexperimente › Experimente mit NetLogo – https://www.entwurfsforschung.de/alt/Strukturfor/netlogo/territoryFight01.html |
| Archivseite | [Strukturexperimente › Experimente mit NetLogo](../../../archiv/strukturexperimente/netlogo/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/netlogo/07_territoryFight_3.nlogo` (nur gelesen) |

## Übernommen

- **setup**: alle Patches mit `mark 150` (keine Farbe); `cct num-turtles` mit `heading random 360`, Heimat `setxy random(screen-size-x) random(screen-size-y)` (ganzzahlig, über den Torus in das Feld gefaltet), `tMark = wrap-color (start-with-color + (random num-turtles) · (140 / number-of-colors))`; turtles schwarz (`color 0`).
- **Regel „to go“, je turtle**: `ifelse mark-of patch-here = tMark [forward 1] [mark-of patch-here := tMark; pcolor := mark; zurück nach (homeX, homeY); rt random-float 360]`; danach `ticks + 1` (Kennzahl „Clock“).
- **Welt** aus dem GRAPHICS-WINDOW: `screen-edge 100` → Patches −100 … 100 (201 × 201), Rand als Torus; Patch eines Punkts = gerundete Koordinate.
- **Schieberegler**: `num-turtles` 0–500, 132 · `number-of-colors` 0–100, 14 · `start-with-color` 0–14, 5.
- **Farben**: NetLogo-Farbzahlen; x5 ist die Grundfarbe (gray, red, orange, brown, yellow, green, lime, turquoise, cyan, sky, blue, violet, magenta, pink), Zwischenwerte dunkler oder heller.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt Zufall ohne Saat.
- **Reihenfolge**: Die turtles kommen in jedem Schritt in neuer zufälliger Reihenfolge nacheinander dran (wie `ask` ab NetLogo 4). In NetLogo 2.1 liefen sie quasi gleichzeitig im Wechsel; bei diesem kurzen Rumpf ist der Unterschied gering.
- **number-of-colors** mindestens 1 (bei 0 bricht das Original mit einer Division durch null ab).
- **Ungefärbte Patches** in der Flächenfarbe der Seite statt weiß, damit das Feld in der dunklen Darstellung nicht blendet; die Heimat jeder turtle ist als Ring markiert, die turtles als Punkte statt Pfeilen.
- **Tempo**: 20 Schritte je Bild voreingestellt (das Territorium wächst nur um eine Zelle je turtle und Rückkehr).
- **Verlauf** der Fläche je Farbe (neu, abschaltbar) und **Kennzahlen**: gefärbter Anteil, Zahl der Farben mit Fläche, größtes Territorium.
