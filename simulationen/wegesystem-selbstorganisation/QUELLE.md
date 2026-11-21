# Quelle · Selbstorganisation bei Wegesystemen und Slime Mold

| | |
|---|---|
| Originalprogramm | `331_SelbstorgaWegeSys` „PathSystem“ Version 1.0 (Projekt `pathSystem_01.dpr`, Units `CellForm.pas`/`.dfm`, `agenten.pas`, `cell_P.pas`) – gleicher Quellcode wie `36_pathSystem_01` im Laboratorium. Als Fassung enthalten: `37_slimeMold` „PathSystem and SlimeMold“ Version 1.1 vom 15.04.2006 (`pathSystem_02_slime.dpr`, „mainly the diffusion procedure was added“) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2006 (Quelltexte im ZIP vom 14.04.2006, alte Seite „Source - 060414“; Programmkopf „first release … Apr-02, 2006“; 37_slimeMold: 15.04.2006) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 3.3.1 „Selbstorganisation bei Wegesystemen“ (Programmliste https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm); Beschreibungen „Path System 01“ (#path01) und „Slime Mold“ (#SlimeMold) auf https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm; dort verwiesen: F. Schweitzer (2003), *Brownian Agents and Active Particles*; M. Resnick (1994), *Turtles, Termites and Traffic Jams* |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 3.3.1](../../../archiv/raumprozesse/simulationsprogramme/), außerdem [Strukturexperimente › Delphi](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/raumprozesse/331_SelbstorgaWegeSys.zip`, `archiv_medien/strukturexperimente/36_pathSystem_01.zip` (identisch), `archiv_medien/strukturexperimente/37_slimeMold.zip` (nur gelesen; keine .exe ausgeführt); Bilder und Formeln `36_pathSystem.gif`, `36_path_formel_0*.gif`, `37_slimeMold*.gif` |

## Übernommen

- **Feld**: `ZeichenPanel` 404 × 404 px, Zellgröße „cell size“ 1–10 (36: 4, 37: 7) → `round(404 / cellScal)` Zellen je Richtung (101 bzw. 58); Rand als Torus (`torus`). Zu Beginn haben alle Zellen `mark = 1`.
- **setupAgents**: „number of agents“ (36: 100, 37: 175) auf zufälligen Zellen, `Heading := random(360)`.
- **Ablauf** (`calculate`): erst Verfall und Zählung (`repaintAll`), dann die Agenten in Listenreihenfolge (`calcAgents`), in 37 danach die Diffusion; ein Schritt = ein Timer-Takt.
- **Verfall** (`repaintAll`): 36 – Zellen mit `mark > 1` verlieren 1, `mark` höchstens 255 (in `TCell.Paint`). 37 – Zellen mit `mark > e + 2`, `e = round(evaporate rate · 10)`, verlieren `e`, wenn nicht diffundiert wird. Diese Zellen zählen als „marked cells“ (Diagramm `RChart1`).
- **Sichtbereich** (`checkArea`): Winkel `heading − angle threshold − 22,5` und `heading + angle threshold − 22,5` (je einmal auf 0…360 gebracht, `angelBorder`), Sektor `case round(Winkel) of 0..45: 1 … 316..360: 8`, dazwischen alle Nachbarzellen 1 … 8 im Gegenuhrzeigersinn der Tabelle (1 = (1, 1) … 8 = (1, 0)). Eigenheiten bleiben: wegen der Rundung kommt die linke Seite ein Grad früher dazu (66° → 3 Zellen, 67° → 4), und bei 180° fallen Anfang und Ende zusammen, sodass der Agent nur die Zelle hinter sich sieht.
- **ChangeHeading**: Summe der Markierungen im Sichtbereich `> sniff threshold` (36: fest 3, 37: Regler 0–100, 10) → Roulette Wheel (`rnd := random(100)`, Gewichte in Prozent aufsummieren bis `sum >= rnd`) oder Hill Climbing (erste Zelle mit dem größten Gewicht); `heading = round(arcTan2(dY, dX))` in Grad plus `random(wiggle + 1) · (±1)`, Schritt auf die gewählte Zelle. Sonst Random Walk: `heading ± random(angle threshold + 1)`, Schritt `(round(cos), round(sin))` – mit Delphis Rundung (,5 zur geraden Zahl) und `Pi = 3,141592654`, sodass Diagonalen nur zwischen etwa 30° und 60° vorkommen. Danach `heading` auf 0…360.
- **Markieren** (`calcAgents`): die verlassene Zelle erhält `+ mark strenght` (36: fest 20; 37: Regler 0–100, 20). Mehrere Agenten dürfen auf einer Zelle stehen.
- **Diffusion** (`diffuse`, `checkNei`, 37): Summe der acht Nachbarn (ohne die Zelle selbst), `mark := round(Summe / 8)`, dann `round(mark · (1 − evaporate rate))`, mindestens 1.
- **Regler** aus `CellForm.dfm`: angle threshold 0–180 (36: 25, 37: 45), wiggle threshold 0–180 (36: 0, 37: 40), „sniff chemicals with“ rulette wheel (36) / hill climbing (37), evaporate rate 0–1 (0,13), visibility threshold 0–100 (3), diffuse chemicals (37: an). Begriffe und Schreibweisen des Originals („mark strenght“, „rulette wheel“) bleiben.
- **Maus** (`markCell`): linke Taste setzt `mark = 255`, rechte `mark = 1`.
- **Farben**: 36 Grauwert `255 − mark` (weiß → schwarz), 37 `RGB(3v, 8v, 3v)` mit `v = mark`, wenn `mark > visibility threshold`, sonst 0 (grün auf schwarz); Agenten rote Kreise (`AgSize 2`) mit grünem Richtungsstrich (6 bzw. 4 Bildpunkte).

## Bewusst geändert

- **Fassungen zusammengelegt**: `37_slimeMold` ist `36_pathSystem_01` mit Diffusion und zusätzlichen Reglern; hier eine Auswahl „Fassung“, die die Voreinstellungen beider Programme setzt. In der Fassung 36 gelten der Verfall von 36 (− 1, ab `mark > 1`) und die Obergrenze 255; „sniff threshold“ und „mark strenght“ sind auch dort einstellbar (Voreinstellung = die festen Werte 3 und 20), „evaporate rate“ und „visibility threshold“ wirken nur in 37. „diffuse chemicals“ lässt sich in beiden Fassungen schalten.
- **Diagramm**: Die x-Achse wächst mit dem Lauf (mindestens 1000 Schritte), statt alle 999 Schritte neu zu beginnen; auf breiten Bildschirmen rechts neben dem Feld, sonst darunter; abschaltbar.
- **Nicht übernommen**: „setup with ten spred centers“ und die grüne Zentrumszelle – die Entfernungen zu den Zentren werden im Original berechnet, aber nicht verwendet; die Agenten-Eigenschaft `State` (ohne Wirkung).
- **Darstellung**: In der dunklen Darstellung ist 36 umgekehrt (helle Wege auf dunkler Fläche), in der hellen 37 dunkelgrün auf hell. Richtungsstriche erst ab Zellgröße 3.
- **Kennzahlen neu**: Anteil der Agenten auf Spuren (Summe im Sichtbereich über dem sniff threshold), Wegenetze bzw. Cluster (zusammenhängende Gebiete mit `mark > 30` bzw. über dem visibility threshold, mindestens 4 Zellen) mit der größten Ausdehnung. Mit den Voreinstellungen fallen in 36 rund 30 kleine Spuren nach 100 Schritten zu 2–5 großen Wegenetzen nach 2000 Schritten zusammen; in 37 sammeln wenige Cluster fast alle Agenten. Tests und `pruef_ausdruck` prüfen das.
- **Start/Pause/Schritt/Zurücksetzen und feste Saat** statt `Randomize`; „Zurück“ entspricht „new Setup“.
