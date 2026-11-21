# Quelle · Agentenbasiertes Interaktionsmodell (Interaction Pattern)

| | |
|---|---|
| Originalprogramm | `320_AgInteraktModell` „Interaction Patterns“ Version 1.0 (Projekt `InteractionPatterns_01.dpr`, Units `CellForm.pas`/`.dfm`, `agenten.pas`, `cell_P.pas`, `Calcer.pas`); gleicher Quellcode wie `42_interactionPatterns` im Laboratorium für räumliche Prozesse |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2006 (Datum: neueste Quelldatei im ZIP 11.06.2006; Kopf „Last Update: Jun-11, 2006“; alte Seite „42_InteractionPattern / Source - 060611“) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 3.2; Beschreibung „Interaction Pattern 01“ (#interactP_01) auf https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm; Liste der Programme auf https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm |
| Literatur | M. Batty (2005): *Cities and Complexity*, Kapitel 5 |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 3.2](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/320_AgInteraktModell.zip` (nur gelesen; keine .exe ausgeführt), Bilder `320_AgInteraktModell.gif`, `archiv_medien/strukturexperimente/42_interactionPat.gif` |

## Übernommen

- **Feld** (`settings`): 404 × 404 px, „cell size“ 1–10 (Voreinstellung 2) → `round(404 / 2)` = 202 × 202 Zellen; Rand als Torus für Schritte und Sichtfeld.
- **Ursprung** (`setOrigins`): 3 × 3 Zellen um `(round(spalt/2), round(reih/2))`, blau (`state 1`). Alle Agenten (`Edit_anzAg` 800) starten dort, `Heading = random(360)`, Modus 0 (Erkunden).
- **Zielorte** (`setDestinations`, Auswahl „Choose SetupMode“; voreingestellt Random): *Random Destinations* – zehn 3 × 3-Zielorte an `(random(spalt), random(reih))`; *Circle Destinations* – jede Zelle mit `Dist > 180 px` von der Mitte ist ein eigener Zielort (Rand außerhalb eines Kreises); *Raster Destinations* – 5 × 5 Zielorte bei `round(K · spalt/5 + 0,5 · spalt/5)`. Grün (`state 2`). Der Ursprung wird danach gesetzt und überdeckt einen Zielort an gleicher Stelle (im Raster der mittlere). Die Auswahl setzt `return noise` wie das Original (`E_noise.Text`): 30, 50, 30.
- **Ablauf** (`calculate`): `findMaxMin` → Zeichnen → `calcAgents` → `decayMarks` (nur mit „decay rate“, Faktor 0,95) → Schritt + 1 → Anhalten bei `stop at time` (10 000, `steps = stopTime`) → `calcGraph`.
- **Sichtfeld** (`checkArea`): 45°-Sektoren von `heading − angle threshold − 22,5` bis `heading + angle threshold − 22,5` (Delphis `Round`, bei ,5 zur geraden Zahl), Voreinstellung 30°. Gewicht je Zelle: Erkunden `markB + noise`, Rückweg `markH + noise` mit `noise = (minM + 1) · (random − 0,5)` – `minM` ist das Minimum der gezeigten Markierung (`findMaxMin`).
- **ChangeHeading**: *Rückweg* (Modus 1): `heading = Round(arcTan2(Ursprung − Zelle)) + random(return noise + 1) · (±1)`, Schritt `(Round(cos), Round(sin))`. *Erkunden* (Modus 0): ist `sumChem > 0`, wählt der Agent per **hill climbing** (erste Zelle mit dem größten Gewicht) oder **roulette wheel**, dann `heading = Richtung + random(wiggle + 1) · (±1)` (wiggle threshold 20°); sonst **random walk** `heading ± random(angle threshold + 1)`.
- **Markieren und Moduswechsel** (`calcAgents`): die verlassene Zelle erhält `markA + 10`, auf dem Rückweg auch `markB + 10`. Betritt ein Rückkehrer den Ursprung, erkundet er wieder und zählt als erfolgreich (`succeed`, `destiList[DestiNr].numbers + 1`); betritt ein Erkundender einen Zielort, kehrt er um und merkt sich dessen Nummer.
- **Darstellung** (`TCell.rePaint`, `TAgent.Paint`, `drawConns`): Grauwert `255 − ((mark − minM) · 235 / (maxM − minM) + 20)` (die 20 nur für mark > 0), „show only return tracks“ (markB, voreingestellt) oder alle Wege (markA), „no tracks“ (hier „Spuren zeigen“ aus); Agenten rot (erkundend) und lime (Rückweg) mit Radius 2 px; „show gravity lines“: kastanienbraune Linie von jedem Zielort mit mehr als einer Rückkehr zum Ursprung, Stärke `round(numbers / steps · gravLine scale)` (5).
- **Diagramm** (`calcGraph`, `Chart1` „average values“): erfolgreiche Agenten in Prozent (rot), Agenten auf dem Rückweg in Prozent (grün), max mark (eigene Achse, hier gestrichelt auf eigener Skala).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ entspricht „new Setup“; die Zielanordnung wirkt sofort (im Original erst beim nächsten Setup).
- **Home-Gradient `markH`** wird nur für die Kreis-Anordnung berechnet (`calcCellDist`) und geht im Original zwar in die Gewichte der Rückkehrer ein, die Gewichte werden auf dem Rückweg aber nie benutzt. Hier ist er deshalb 0; das Rauschen wird wie im Original gezogen.
- **Roulette wheel** endet spätestens bei der letzten betrachteten Zelle (im Original konnte die Schleife über die Liste hinauslaufen, wenn negative Gewichte durch das Rauschen die Summe unter den Zufallswert hielten).
- **Bildaufbau**: Das Original zeichnete eine Zelle nur neu, wenn sich `markA` um mehr als 1 geändert hatte; hier jedes Bild vollständig. Agenten ohne grauen Rand und ohne Richtungsstrich (bei 800 Agenten auf 202 × 202 Zellen sonst unlesbar), mindestens 1,5 Bildschirmpixel.
- **Diagramm** rechts neben dem Feld oder darunter, abschaltbar; max mark auf eigener Skala gestrichelt statt auf der linken Achse.
- **Dunkle Darstellung**: Grauwerte umgekehrt; Gravitationslinien heller rot. Hell wie im Original.
- **Kennzahlen** (neu): erfolgreiche Agenten, Agenten auf dem Rückweg, Rückkehrer gesamt, gefundene Zielorte, max mark. Mit den Voreinstellungen steigt die Zahl der Rückkehrer je 1000 Schritte deutlich, nachdem die Pfade entstanden sind („die Agenten lernen“); Tests und `pruef_ausdruck` prüfen das.
- **Nicht übernommen**: Knopf „repaint all“ (zeichnet hier ohnehin jedes Bild), die auskommentierte Diffusion; das „Update 1.1 Probabilistic Interaction & Manhattan Landscape“ liegt nur als .exe vor (`42_update_Probabilistic_Interaction.exe`) und wurde nicht nachgebaut.
