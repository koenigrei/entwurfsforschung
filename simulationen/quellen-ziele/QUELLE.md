# Quelle · Quellen und Ziele der Bewegungen (Path System 02)

| | |
|---|---|
| Originalprogramm | `332_Quellen_Ziele` „Path System 02“ Version 1.0 (Projekt `path_system_02.dpr`, Units `CellForm.pas`/`.dfm`, `agenten.pas`, `cell_P.pas`); gleicher Quellcode wie `38_pathSystem_02` im Laboratorium für räumliche Prozesse |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2006 (Datum: neueste Quelldateien im ZIP 19.04.2006; Kopf „Last Update: Apr-16, 2006“; alte Seite „38_path_system_02 / Source - 060419“) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 3.3.2; Beschreibung „Path System 02“ (#path02) auf https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm; Liste der Programme auf https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm |
| Literatur | F. Schweitzer (2003): *Brownian Agents and Active Particles*, Springer |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 3.3.2](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/332_Quellen_Ziele_Kopie.zip` (nur gelesen; keine .exe ausgeführt), Bilder `332_Quellen_Ziele.gif`, `archiv_medien/strukturexperimente/38_pathSystem_2.gif` |

## Übernommen

- **Feld** (`settings`): 404 × 404 px, „cell size“ 1–10 (Voreinstellung 6) → `round(404 / 6)` = 67 × 67 Zellen; Rand als Torus für Schritte und Sichtfeld.
- **Setup**: zehn Home Cells `market[I] = (random(spalt), random(reih))` (rot, `cent`); `multiCentre` setzt jede Zelle auf `mark = 10`; Center Cell = 5 × 5 Zellen um `(round(spalt/2), round(reih/2))` (grün, `source`, `SetupSource`). Agent I startet auf Home Cell `I mod 10` und merkt sie sich (`Home`), sucht (`Seeking = true`), `Heading = random(360)`. Anzahl („number of agents for setup“) 200.
- **Ablauf** (`calculate`): `repaintAll` (Verdunstung, Zählung, Diagramm) → `calcAgents` → `diffuse` (nur mit „diffuse chemicals“).
- **Verdunstung** (`repaintAll`): `evapo = round(evaporate rate · 10)`; jede Zelle mit `mark > evapo + 2` verliert `evapo` (ohne Diffusion) und zählt, wenn danach `mark > visibility threshold`. Voreinstellung 0,5 → 5.
- **Diffusion** (`diffuse`, `checkNei`): `mark = round(Σ acht Moore-Nachbarn / 8)`, dann `round(mark · (1 − evaporate rate))`, mindestens 1; die eigene Zelle zählt nicht mit.
- **Sichtfeld** (`checkArea`): Winkel `heading − angle threshold − 22,5` und `heading + angle threshold − 22,5`, 45°-Sektoren mit Delphis `Round` (bei ,5 zur geraden Zahl), Zellen vom ersten bis zum letzten Sektor im Uhrzeigersinn; Gewichte `mark / Σ · 100`. Das Sichtfeld folgt dem heading vom Ende des vorigen Schritts (`checkArea` vor `ChangeHeading`, wie im Original).
- **ChangeHeading**: Auf dem Rückweg `heading = Round(arcTan2(Home − Zelle))`; steht der Agent auf seiner Home Cell, sucht er wieder (`Seeking = true`, `heading + 180`). Mit „agents know the center position“ richten sich Suchende auf die Mitte aus. Dann: `sumChem > sniff threshold` → **hill climbing** (erste Zelle mit dem größten Gewicht) oder **roulette wheel** (`random(100)`, kumulierte Gewichte), danach `heading = Richtung + random(wiggle + 1) · (±1)`; sonst **random walk** `heading ± random(angle threshold + 1)`, Schritt `(Round(cos), Round(sin))`. heading einmal um ±360 korrigiert.
- **Markieren** (`calcAgents`): Wer auf dem Rückweg ist, erhöht die Markierung der Zelle, die er gerade verlässt, um `mark strenght`; betritt ein Agent die Center Cell, wechselt er auf den Rückweg.
- **Maus** (`markCell`): linke Taste setzt `mark = 255`, rechte `mark = 1`.
- **Regler und Voreinstellungen** (`CellForm.dfm`): angle threshold 0–180°, 45 · wiggle threshold 0–180°, 25 · mark strenght 0–100, 50 · evaporate rate 0–1, 0,5 · sniff threshold 0–100, 15 · visibility threshold 0–255, 50 · hill climbing · „diffuse chemicals“ und „agents know the center position“ aus.
- **Darstellung** (`TCell.Paint`, `TAgent.Paint`): Grauwert `255 − mark`, wenn `mark > visibility threshold`, sonst weiß; Home Cells rot, Center Cell grün; Agenten roter Kreis (Radius 2 px) mit grauem Rand und grünem Richtungsstrich (4 px).
- **Diagramm** (`plot`, `RChart1`): „sum of marked cells [mark-value > visibility threshold]“ in Rot, Fenster von 1000 Schritten, neu bei `steps mod 999 = 0`; y-Achse 0–100, wächst auf Wert + 100, sobald Wert + 50 darüber liegt.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ entspricht „new Setup“.
- **Bildaufbau**: Das Original zeichnete eine Zelle nur neu, wenn sich ihr Wert seit dem letzten Zeichnen um mindestens 5 geändert hatte (Beschleunigung); hier wird jedes Bild vollständig gezeichnet.
- **Maus**: Die Markierung folgt der Maus lückenlos (Linie seit dem letzten Punkt) und bleibt im Feld; im Original wurde nur die Zelle unter jedem Mausereignis gesetzt, am Rand drohte ein Bereichsfehler (`round(X / cellScal)` = 67). Rechte Maustaste oder Umschalt löscht.
- **Roulette wheel** endet spätestens bei der letzten betrachteten Zelle (Schutz gegen Rundungsfehler; im Original konnte die Schleife über die Liste hinauslaufen).
- **Diagramm** rechts neben dem Feld (breite Bildschirme) oder darunter, abschaltbar („Verlauf zeigen“).
- **Dunkle Darstellung**: Grauwerte umgekehrt (Markierungen hell auf dunkel); hell wie im Original. Agenten mindestens 2,5 Bildschirmpixel groß.
- **Kennzahlen** (neu): markierte Zellen über dem visibility threshold (der Wert des Diagramms), Agenten auf dem Heimweg, Heimkehrer gesamt und in den letzten 1000 Schritten. Mit den Voreinstellungen pendelt sich das Wegesystem nach wenigen tausend Schritten bei rund 350–480 Zellen ein („ca. 400 Zellen“ der Beschreibung); Tests und `pruef_ausdruck` prüfen das.
- **Nicht übernommen**: `oneCentre` (im Original auskommentiert), `distM`/`indM`/`AgNr`/`State` der Zellen (ohne Wirkung).
