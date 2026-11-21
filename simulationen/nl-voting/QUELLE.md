# Quelle · 05 voting with four colors

| | |
|---|---|
| Originalprogramm | `vote4col.nlogo` („05_voting with four colors“, 18.01.2005) |
| Sprache | NetLogo 2.1 (Applet auf der alten Website) |
| Autor | Reinhard König |
| Jahr | 2005; Entstehungsdatum 18.01.2005 laut Liste auf `netLogo.htm` („05_voting with four colors - 050118“), die Datei selbst trägt kein Datum |
| Seite der alten Website | Strukturexperimente › Experimente mit NetLogo – https://www.entwurfsforschung.de/alt/Strukturfor/netlogo/vote01.html |
| Archivseite | [Strukturexperimente › Experimente mit NetLogo](../../../archiv/strukturexperimente/netlogo/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/netlogo/vote4col.nlogo` (nur gelesen) |

## Übernommen

- **Zustände und Farben** (`cell-fill`, `cell-death`, `cell-birth`, `cell-free`): rot 0, blau 1, gelb 2, grün 3 in den NetLogo-Farben red, blue, yellow, green.
- **Regel „to go“**: erst `counter = sum values-from neighbors [state]` für alle Patches (acht Nachbarn, 0 … 24), dann je Patch die vier `if` in der Reihenfolge des Originals (gelb, blau, grün, rot) mit strengen Vergleichen; eine spätere Bedingung überschreibt eine frühere, sonst bleibt der Zustand. Damit ist die Aktualisierung synchron.
- **setup-random**: Patch gelb mit Wahrscheinlichkeit `initial-density`, sonst blau. **setup-blank**: alle blau, Patch 0 0 gelb.
- **Welt** aus dem GRAPHICS-WINDOW: `screen-edge 80` → Patches −80 … 80 (161 × 161), Rand als Torus (NetLogo 2.x).
- **Schieberegler** (Min, Max, Wert, Schritt aus den SLIDER-Blöcken): `initial-density` 0–1, 0,5, 0,01 · `genYellow` 0–24, 12 · `genBlue` 0–24, 12 · `genGreen` 0–24, 19 · `genRed` 0–24, 4. Die Regeln lesen die Regler in jedem Schritt (Änderung ohne Neustart).
- **Anleitung** aus dem Informationsteil des Modells und von der alten Seite (im Text der Seite übersetzt).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt Zufall ohne Saat. „Zurück“ führt das gewählte Setup aus (Auswahl `setup-random`/`setup-blank` statt zweier Knöpfe).
- **Ende bei Stabilität** (neu): Der Lauf hält an, wenn sich kein Patch mehr ändert oder das Feld wieder genau dem vorletzten Schritt gleicht (Blinker mit Periode 2). Das Original lief mit „go-forever“ weiter; die Anleitung fragt aber gerade nach dem stabilen Zustand. Nach einer Änderung an einem Regler läuft es mit Start weiter.
- **Verlauf** der Anteile der vier Farben (neu, abschaltbar) und **Kennzahlen**: Anteile, gewechselte Patches, Schritt der Stabilität.
