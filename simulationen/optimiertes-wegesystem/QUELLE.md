# Quelle · Optimiertes Wegesystem (Evolutionary Network)

| | |
|---|---|
| Originalprogramm | `333_OptiWege` „Network 01“ Version 1.1 („genetic algorithm to find the best values for angleThresh and wiggle Thresh“; Projekt `network_02_evolve.dpr`, Units `CellForm.pas`/`.dfm`, `agenten.pas`, `cell_P.pas`, `Calcer.pas`); gleicher Quellcode wie `39_evoNet` im Laboratorium für räumliche Prozesse; Grundlage ist „Path System 02“ (`332_Quellen_Ziele`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2006 (Datum: neueste Quelldatei im ZIP 24.04.2006; Kopf „Last Update: Apr-24, 2006“; alte Seite „39_evoNet / Source - 060425“) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 3.3.3; Beschreibung „Evolutionary Network“ (#evoNet01) auf https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm; Liste der Programme auf https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm |
| Literatur | F. Schweitzer (2003): *Brownian Agents and Active Particles*, Springer |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 3.3.3](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/333_OptiWege.zip` (nur gelesen; keine .exe ausgeführt), Bilder `333_OptiWege.gif`, `archiv_medien/strukturexperimente/39_evaNet.gif` |

## Übernommen

- **Alles aus Path System 02** (siehe `../quellen-ziele/QUELLE.md`): Feld 67 × 67 (cell size 6), zehn Home Cells, Center Cell 5 × 5, alle Zellen `mark = 10`, Agenten auf Home Cell `I mod 10`, Sichtfeld in 45°-Sektoren mit Delphis `Round`, hill climbing / roulette wheel / random walk, Ausrichtung auf die Home Cell auf dem Rückweg, „agents know the center position“, Verdunstung `round(evaporate rate · 10)` (`decline`), Diffusion, Maus (links 255, rechts 1), Farben.
- **Je Agent** (`SetupAgents`): `angleTh = random(180)`, `wiggleTh = random(180)`, Chromosom `setChroma = IntToBin(angleTh) + IntToBin(wiggleTh)` (je 8 Bit), `energy = 100000`, `success = 0`, Familie = Home Cell (`FamilyList`). Sichtfeld (`checkArea`) und Schritt (`ChangeHeading`) benutzen die eigenen Werte des Agenten statt der Regler.
- **Erfolg**: `inc(success)`, wenn ein Heimkehrer seine Home Cell erreicht („at home again!“).
- **Energie** (`markCells`, nach der Zielzelle des Schritts): Heimkehrer markieren die verlassene Zelle mit `mark strenght` und zahlen `mark strenght` (freies Feld) bzw. `round(mark strenght / 2)` (Zielzelle `mark ≥ visibility threshold`); Suchende zahlen `3 · mark strenght` bzw. `round(mark strenght / 2)`.
- **rebirth** (zu Beginn des Zugs, wenn `energy < 1`): Gewichte der Familie `success / Σ success · 100` (ohne Erfolge je 5), zwei Eltern mit `Calcer.rouletteWheel` (`random(100)`, kumuliert bis `≥ rnd` oder letzte Stelle), `crossover` an `crossP = random(16) + 1` (Stellen 1…crossP vom ersten, der Rest vom zweiten Elternteil), neue Werte `BinToInt` der beiden Hälften (also 0–255), `success = 0`, `Seeking = true`, volle Energie; dann `mutate`: mit Wahrscheinlichkeit `mutation rate` wird eine Stelle `random(15) + 1` des Chromosoms umgedreht (Stelle 16 nie).
- **Eigenheiten, die bleiben**: Die Mutation ändert nur das Chromosom, nicht die schon gesetzten Werte des Agenten – sie wirkt erst bei seinen Nachkommen. Nach der Kreuzung können die Werte bis 255° reichen, obwohl sie anfangs unter 180° liegen.
- **Ablauf** (`calculate`): `decline` → Zeichnen (alle 100 Schritte Mittelwerte und Diagrammpunkt, bis Schritt 49 800) → `calcAgents` → `diffuse`.
- **Regler und Voreinstellungen** (`CellForm.dfm`): mutation rate 0–1 (Position 1 → 0,01) · mark strenght 50 · evaporate rate 0,5 · sniff threshold 15 · visibility threshold 0–500, 100 · 200 Agenten · cell size 6 · hill climbing · Diffusion und „agents know the center position“ aus.
- **Diagramm** (`RChart1` „average angle: red | average wiggle: green“): Mittelwerte alle 100 Schritte, x bis 50 000 Schritte, y ab −5 bis 180 (hier bis zum größten Wert, falls darüber).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize` (das Original rief `Randomize` sogar in jeder Wiedergeburt auf).
- **Lage der Home Cells**: Im Original war `Randomize` für die Home Cells abgeschaltet („activate for new configurations at every start“), so dass sie beim Programmstart immer gleich lagen – die Bildreihe der alten Seite zeigt sechs Läufe mit gleichen Home Cells. Hier zieht eine eigene Saat („Lage der Home Cells“, voreingestellt 1) die Home Cells; die Saat des Laufs bestimmt den Rest. Mit 0 folgen auch die Home Cells der Saat des Laufs.
- **Ort der Wiedergeburt**: Das Original setzte bei der Wiedergeburt nur die Zeichenposition auf die Koordinaten der Home Cell (in Zellen statt Pixeln, also an falscher Stelle); die Zelle des Agenten blieb unverändert. Hier bleibt er ebenso, wo er ist, und sucht von dort neu.
- **mutation rate** wird als Prozent angezeigt (1 %); das Original schrieb „0,01 %“, rechnete aber mit der Wahrscheinlichkeit 0,01.
- **Bildaufbau**: jede Zelle in jedem Bild (im Original nur bei Änderung ≥ 5; „deactivate cell update“ entfällt). „hide agents“ heißt hier „Agenten zeigen“.
- **Maus**: Markierung lückenlos entlang der Mausbewegung, im Feld begrenzt (im Original Bereichsfehler am Rand möglich).
- **Roulette wheel** beim Folgen der Markierung endet spätestens bei der letzten betrachteten Zelle.
- **Dunkle Darstellung**: Grauwerte umgekehrt; hell wie im Original.
- **Kennzahlen** (neu): Mittelwerte von angle und wiggle threshold mit Streuung, Heimkehrer in den letzten 1000 Schritten, Wiedergeburten, Straßenzellen (mark ≥ visibility threshold). Mit den Voreinstellungen sinkt der mittlere angle threshold in einigen tausend Schritten von rund 90° auf etwa 40–50°, die Streuung nimmt ab, und jeder Lauf endet bei anderen Werten; Tests und `pruef_ausdruck` prüfen das.
