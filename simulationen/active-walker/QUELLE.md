# Quelle · Active Walker

| | |
|---|---|
| Originalprogramm | `40_activeWalker` „Active Walker“ Version 1.0 vom 03.06.2006 (Projekt `activeWalker_01.dpr`, Units `CellForm.pas`/`.dfm`, `agenten.pas`, `cell_P.pas`); als Fassung `41_multiWalker` „Active Walker“ Version 1.1 vom 04.06.2006 (`activeWalker_02.dpr`, dazu `Calcer.pas`: „multi-agents, interface improvements“) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2006 (Datum: neueste Quelldatei im ZIP 03.06.2006; alte Seite „Source - 060604“, Multi Walker „060605“) |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm (#activeW1, #activeW2) |
| Literatur | M. Batty (2005): *Cities and Complexity*, Kapitel 5 (Active Walker Model) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/40_activeWalker.zip`, `41_multiWalker.zip` (nur gelesen; keine .exe ausgeführt), Bild `41_multiWalker.gif` |

## Übernommen

- **Feld** (`settings`): Zeichenfläche 404 × 404 px, `cellScal` aus „cell size“ (1–10, Voreinstellung 4), `spalt = reih = round(404 / cellScal)` mit Delphis Rundung (4 → 101 × 101, 8 → 50); Rand als Torus (`torus`).
- **Landscape Rule** (`calcCellDist`, `landschaft`): für jede Zelle `mark += √(dScale · Dist)`, `Dist = Round(Abstand der Zellmitten in Pixeln)`, mit dem kürzeren Weg über den Torusrand („distance-torus measure“). In 1.0 ist `dScale` fest 0,01 und gerechnet wird nur mit dem ersten Walker (`AgentList.Items[0]`; die Anzahl war dort auf 1 festgelegt); in 1.1 „distance scaling“ 0,1 und alle Walker nacheinander. Die Zelle unter dem Walker wird als begangen markiert (`walked`, grün).
- **Diffusion** (1.1, `Calcer.diffuse`/`checkNei`): erst für alle Zellen die Summe der acht Moore-Nachbarn (`limboWorld`), dann `mark += limbo / 8 · diffusion strength` (0,04). Sie läuft vor der Landscape Rule.
- **Normierung** (1.1, `TCell.Paint`): nach `findMaxMin` wird von jeder Zelle `minM` abgezogen, das Minimum ist danach 0. 1.0 kennt das nicht; dort wachsen die Werte unbegrenzt.
- **Sichtfeld** (`checkArea`): Winkel `heading − angle threshold − 22,5` und `heading + angle threshold − 22,5`, je einmal um ±360 korrigiert (`angelBorder`), mit Delphis `Round` (bei ,5 zur geraden Zahl) einem der acht 45°-Sektoren zugeordnet; betrachtet werden die Nachbarzellen vom ersten bis zum letzten Sektor im Uhrzeigersinn (1 = (1, 1) … 8 = (1, 0)). Voreinstellung 157° → alle acht Nachbarn. Eigenheit: Bei 180° fallen Anfang und Ende in denselben Sektor, dann bleibt nur eine Zelle – bleibt erhalten.
- **Stepping Rule** (`TAgent.ChangeHeading`): Gewichte `mark (+ noise)` der betrachteten Zellen, `noise = noise strength · (random − 0,5)` je Zelle (1.1, Voreinstellung 4). Ist ihre Summe `sumChem > 3`, geht der Walker per **hill climbing** zur ersten Zelle mit dem größten Gewicht; `heading = Round(arcTan2(dY, dX))` plus `random(wiggle + 1) · (±1)` („wiggle threshold“, 0–180, Voreinstellung 0). Sonst **random walk**: `heading ± random(angle threshold + 1)`, Schritt `Round(cos)`, `Round(sin)`. Danach `heading` einmal um ±360 korrigiert, Schritt um eine Zelle (Torus). Die Konstanten `DegToRad`/`RadToDeg` mit Pi = 3,141592654 wie im Original.
- **Setup**: 1.0 Walker auf Zelle (50, 50), 1.1 auf zufälligen Zellen; `Heading := random(360)`; alle Zellen `mark = 0`. Anzahl („number of agents for setup“) 1.0: 1, 1.1: 10.
- **Ablauf** (`calculate`, `Timer1`): 1.0 Landscape Rule → Zeichnen → Walker bewegen; 1.1 Diffusion → Landscape Rule → `findMaxMin` → Zeichnen (mit Normierung) → Walker bewegen. Ein „Schritt“ = ein `calculate` („one step“); „timesteps“ als Kennzahl.
- **Darstellung** (`TCell.Paint`, `TAgent.Paint`): Grauwert `255 − (mark − minM) · 255 / (maxM − minM)` (1.0 `Round`, 1.1 `Ceil`, `maxM` beginnt bei 0,1), weiß = gut erreichbar, schwarz = schlecht erreichbar; begangene Zellen grün (1.0 `clGreen`, 1.1 `clLime`); Walker als roter Kreis mit Radius 2 px und grauem Rand, grüner Richtungsstrich 6 px in Richtung `(Round(cos), Round(sin))`.
- **Wahl der Nachbarzelle** („sniff chemicals with“): hill climbing voreingestellt; roulette wheel (`method = 1`: `rnd = random(100)`, kumulierte Gewichte in Prozent bis `≥ rnd`) ist im Original vorhanden, aber abgeschaltet (`Enabled = False`) – hier wählbar.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ entspricht „new Setup“.
- **Fassung statt zweier Apps**: `41_multiWalker` (Active Walker 1.1) ist ein Ausbau desselben Programms und steht als Fassung „41 Multi Walker (1.1)“ zur Wahl; sie setzt deren Voreinstellungen (10 Walker, diffusion strength 0,04, noise strength 4, distance scaling 0,1) und schaltet die 1.1-Mechanik (Start auf Zufallszellen, alle Walker formen die Landscape, Normierung, Farben) ein. Diffusion, Noise und distance scaling sind auch in 1.0 einstellbar (dort voreingestellt 0, 0, 0,01 wie der feste Wert im Code).
- **Überlauf**: Mit Diffusion wachsen die Werte exponentiell (Faktor ≈ 1 + diffusion strength je Schritt). Delphis `Extended` liefe bei 0,04 erst nach rund 290 000 Schritten über, eine JavaScript-Zahl schon nach rund 18 000. Übersteigt `maxM` 2^900, werden deshalb alle Werte mit 2^−600 multipliziert (exakt, Zweierpotenz). Hill climbing vergleicht nur Werte untereinander und bleibt unberührt; Noise und Distanz-Summand sind bei solchen Größen ohnehin verschwindend klein. Die Kennzahl „Spanne mark“ zeigt den gestauchten Wert.
- **Absturz bei großen Zellen behoben**: Mit Zellgröße 9 oder 10 hat das Feld weniger als 51 Zellen; 1.0 setzte den Walker trotzdem auf Zelle (50, 50) (Bereichsfehler). Hier steht er dann in der Mitte.
- **Roulette wheel** endet spätestens bei der letzten betrachteten Zelle (im Original lief die Schleife über das Feld hinaus, wenn negative Gewichte durch Noise die Summe unter `rnd` hielten).
- **Farben in 1.0**: Das Original zeichnete jede Zelle mit `maxM`/`minM` des vorigen Schritts (erst nach dem Zeichnen gesetzt); hier wie in 1.1 mit den Werten des aktuellen Schritts.
- **Dunkle Darstellung**: Grauwerte umgekehrt (schlecht erreichbar hell auf dunkel); hell wie im Original. Walker mindestens 3 Bildschirmpixel groß.
- **„Spur zeigen“** (neu): die grünen begangenen Zellen lassen sich ausblenden, um die Landscape darunter zu sehen.
- **Kennzahlen** (neu): Anteil begangener Zellen; Abstand von Walker 1 zur Zelle mit dem höchsten Wert (seinem „Ziel“, in Zellen, Torus) – in 1.0 wird er nie null; mittlerer Abstand jedes Walkers zum nächsten anderen (Cluster); Spanne max − min. Tests und `pruef_ausdruck` nutzen sie.
- **Nicht übernommen**: Mausmarkierung (`markCell`, im Original ohne Ereignis verbunden), `State`/`Stopped` der Agenten (ohne Wirkung).
