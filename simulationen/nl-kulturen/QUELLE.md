# Quelle · 11 Krieg der Kulturen

| | |
|---|---|
| Originalprogramm | `08_culturesFight09.nlogo` („11_Krieg der Kulturen“, 06.04.2005), nach „Krieg der Kulturen“ von Peter Jossen und Daniel Eyer (Wachstumssimulationen, fraktalwelt.de) |
| Sprache | NetLogo 2.1 (Applet auf der alten Website) |
| Autor | Reinhard König |
| Jahr | 2005; Entstehungsdatum 06.04.2005 laut Liste auf `netLogo.htm` („11_Krieg der Kulturen - 050406“), die Datei selbst trägt kein Datum |
| Seite der alten Website | Strukturexperimente › Experimente mit NetLogo – https://www.entwurfsforschung.de/alt/Strukturfor/netlogo/kulturenKrieg.html |
| Archivseite | [Strukturexperimente › Experimente mit NetLogo](../../../archiv/strukturexperimente/netlogo/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/netlogo/08_culturesFight09.nlogo` (nur gelesen) |

## Übernommen

- **setup**: `crt num-turtles` an zufälligen Stellen (`setxy random(screen-size-x) random(screen-size-y)`), jede setzt auf ihrem Patch `kult = random 6`, `state 1` und stirbt; `setup-kultures` gibt jeder der sechs Kulturen neun Gencodes aus je acht Zufallsbits.
- **enviro**: Zustände der Nachbarn in der Reihenfolge `patch-at` (1,1) (1,0) (1,−1) (0,−1) (−1,−1) (−1,0) (−1,1) (0,1) als 8-stellige Bitfolge (hier als Zahl, erstes Bit = höchstes).
- **check-state**: für jede Kultur `i` und jeden Code `j` – Patches mit einem Nachbarn der Kultur `i` und `enviro = Kgen[i][j] ≠ "00000000"` werden lebendig mit Kultur `i`; ist der Patch schon zugeordnet, übernimmt `i` mit 50 % (`random-float 100 < 50`). Reihenfolge der Schleifen wie im Original.
- **check-border**: Patches mit `|pxcor| = 30` oder `|pycor| = 30` bleiben tot.
- **weakest-die**: mit `death-rate > random 100` und `minPol > 0` werden alle Patches mit `kult = minKult` oder `sollKult = minKult` getötet.
- **count-culture**: Zustände übernehmen, `countKul` je Kultur und `allDead` (Zahl der Lebenden) zählen; Farbe `5 + kult · 20` (gray, orange, yellow, lime, cyan, blue), tot schwarz.
- **new-culture**: für jede Kultur mit `countKul = 0` ein Keim auf einem zufälligen Patch und neue Codes: je Durchgang mit `random 5 < 2` (und Lebenden) ein zufälliger Code der stärksten Kultur, mit `< 4` ein zufälliger Code einer zufälligen Kultur, sonst ein neuer Zufallscode. Wie im Original rückt der Zähler `counter` nur beim neuen Zufallscode weiter, kopierte Codes überschreiben dieselbe Stelle.
- **min-max** vor `weakest-die` (Stand des vorigen Schritts) und nach `new-culture`; bei Gleichstand gewinnt die erste Kultur.
- **mutate**: mit `mutate-rate > random 100` ein neuer Zufallscode für einen zufälligen Code einer zufälligen Kultur.
- **Welt** aus dem GRAPHICS-WINDOW: `screen-edge 30` → Patches −30 … 30 (61 × 61), Torus.
- **Schieberegler**: `num-turtles` 0–500, 344 · `mutate-rate` 0–100, 1 · `death-rate` 1–10, 3. **Plot** „population“ mit sechs Stiften.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt Zufall ohne Saat.
- **Zählung der Kulturen**: Im Original setzt jeder Patch in `count-culture` die globale Liste `countKul` zurück, bevor er zählt. In NetLogo 2.1 liefen die Patches eines `ask` abwechselnd Befehl für Befehl, sodass erst alle zurücksetzten und dann alle zählten – die Liste stimmte. Hier wird einmal zurückgesetzt und dann gezählt, mit demselben Ergebnis (in NetLogo ab Version 4 würde der Code nur den letzten Patch zählen).
- **Diagramm** wie der Plot „population“, aber mitlaufend über die letzten 500 Schritte und in den Farben der Kulturen (die Stifte des Originals hießen grays, reds, yellows, greens, cyans, blues und passten nicht ganz zu den Patchfarben).
- **Kennzahlen** neu: lebende Patches, Population je Kultur, stärkste Kultur mit ihren neun Gencodes (hexadezimal, damit sie auch schmal lesbar bleiben; `Modell.alsText` liefert die Bitfolge), Auslöschung oder Neugründung im letzten Schritt. Die Ausgabe „ich werde geboren“ im Command Center entfällt.
