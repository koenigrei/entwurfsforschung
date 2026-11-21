# Quelle · Verkehrsaufkommen

| | |
|---|---|
| Originalprogramm | `343_Verkehrsaufkommen` „Verkersmodell“ / Fenster „traffic rhythms“, Version 1.0 („first operational release“, 07.01.2007; Projekt `Verkehr_01.dpr`, Units `Main.pas`/`.dfm`, `agent.pas`, `calc_AStern.pas`, `cell.pas`, `timeGraph.pas`/`.dfm`; Daten `pictures/arbeiter.bmp`, `arbeitsstaetten.bmp`, `verkaufsflaechen.bmp`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2007 (neueste Quelltexte im ZIP vom 10.01.2007; `bestand.json` nennt 2008, das Jahr der Dissertation) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 3.4.3 „Verkehrsaufkommen“; auf der alten Website nur als Bild (`343_Verkehrsaufkommen.jpg`) in der Programmliste https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm – die Regeln sind aus dem Quellcode erschlossen |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 3.4.3](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/343_Verkehrsaufkommen.zip` (Quellcode), `343_Verkehrsaufkommen_Prog.zip` (nur die Bilder; keine .exe ausgeführt) |

## Übernommen

- **Zellen** (`Setup`, `CellsCreate`): `Image_Cells` 640 × 666 px, cell scale 30 → `floor` 21 × 22 Zellen; Zellränder clSilver.
- **load data** (`BmpInfoRead`): je Zelle `255 − Rot` von `arbeiter.bmp` (Arbeitsbevölkerung), `255 − Grün` von `arbeitsstaetten.bmp` (Arbeitsplätze), `255 − Blau` von `verkaufsflaechen.bmp` (Einzelhandel) am Pixel der Zellmitte. Die 3 × 462 Werte sind mit genau dieser Regel aus den Bildern des Originals abgelesen und stehen in `modell.js` (`DATEN`); Summen 52.664 · 49.203 · 52.575 wie im Bildschirmfoto des Originals.
- **Zellfarbe** (`CellsPaint`): `RGB(Arbeiter, Arbeitsplätze, Einzelhandel)`, Auswahl „show“ all / red / green / blue.
- **AssignWorkers**: solange Arbeiter und freie Arbeitsplätze übrig sind, zufällige Wohnzelle und zufällige Arbeitsplatzzelle (`RandomRange`), vergeben wird jeweils der letzte noch suchende Arbeiter der Zelle.
- **lines to work** (`LineToWork`): Linien von der Wohn- zur Arbeitsplatzzelle in der Farbe der Wohnzelle.
- **agents create** (`AgentsCreate`, `Agents_Organise`): `E_nodeNumber + 1` = 42 Knoten an zufälligen Orten, Schritt `random(3) − 1`; `Count · 5` Durchläufe, in denen jeder Knoten nacheinander Nachbarn prüft (`NeigborCheck`, `Anlagern`: Halt unter connect distance 130, Ausweichen `random(3) − 1 + (eigene − dessen Position) / 20` unter connect − repel distance 40), sich sofort bewegt (`round`, Delphi-Rundung) und am Rand festgehalten wird (die Prozedur heißt `torus`, klemmt aber auf 0 … 630 bzw. 0 … 660). Kanten = Nachbarn des letzten Durchlaufs, gezeichnet an den alten Positionen, rot, Stärke 2; Knoten rot mit grünem Rand.
- **CellsNearNode**: jede Zelle gehört zum nächsten Knoten (gerundete Entfernung, der erste gewinnt).
- **workers path** (`WorkDeparture`, `CellsPathToWork`): je Arbeiter `departM = RoundTo(RandG(morning dep. 8, STD 1,0), −1)` und `departE = RoundTo(RandG(evening dep. 17, STD 1,0), −1)`; Diagramm der Abfahrten über die Uhrzeit (Form2, `PSerTime`); Arbeitsweg = A* (`calc_AStern.findPath`: `G + gerundete Strecke`, `H = gerundete Luftlinie`, offene Liste absteigend nach F, Ziel beim Aufnehmen gefunden) vom Knoten der Wohnzelle zum Knoten der Arbeitsplatzzelle.
- **execute**: `steps + 1`, `time = SimpleRoundTo((steps mod (24 · timeScale)) / timeScale, −2)`; Arbeiter, deren Abendzeit (zuerst geprüft) bzw. Morgenzeit in `[rTime + 0,01; time]` liegt und deren Weg mindestens zwei Knoten hat, werden Reisende – abends auf dem Weg nach Hause, morgens zur Arbeit; „traffic“ = Zahl der Reisenden vor dem Weiterrücken.
- **travel**: jeder Reisende rückt einen Knoten weiter; die befahrene Kante bekommt `+ 1`, die vorige `− 1`; wer den letzten Knoten erreicht, wird entfernt und gibt die letzte Kante sofort wieder frei (Eigenheit: Kanten zeigen nur Reisende, die noch nicht ankommen).
- **drawTraffic**: Kanten gelb mit `Pen.Width = 2 + ceil(Usage / scale)`, scale = 10; darüber der rote Graph.
- **Eingabefelder** aus `Main.dfm`: number 41, connect distance 130, repel distance 40, STD 1,0, morning dep. 8, evening dep. 17, time scale: hour / 6 (= 10 min), scale: no. / 10.

## Bewusst geändert

- **Ablauf in einem Zug**: „new setup“, „load data“, „agents create“ und „workers path“ des Originals führt „Zurück“ nacheinander aus; Start/Pause/Schritt entsprechen „startTimer“/„oneStep“. Änderungen an Graph und Abfahrten starten neu; „time scale“ ordnet die Abfahrten ohne Neustart neu zu.
- **Arbeitsweg mit Wohnknoten**: `findPath` legt den Pfad vom Ziel bis *ausschließlich* des Starts ab; so begann jede Fahrt einen Knoten nach dem Wohnknoten (und Pendler mit benachbarten Knoten fuhren nie). Hier enthält der Weg Start und Ziel.
- **Ohne Arbeitsplatz keine Fahrt**: 3.461 Arbeiter bekommen keinen Arbeitsplatz (52.664 Arbeitende, 49.203 Plätze); im Original behielten sie die Arbeitsplatzzelle (0, 0) und pendelten dorthin.
- **Zellgröße fest 30**: Die Bilder des Originals sind nicht Teil der App, nur ihre Werte an den Zellmitten bei cell scale 30; andere Zellgrößen entfallen. Nicht übernommen: „find path“ (ein zufälliger Einzelpfad), „agents delete“, „delete all“, Timer-Intervall.
- **Wege werden je Knotenpaar einmal gesucht** (gleiches Ergebnis wie je Arbeiter, schneller); Sortierung der offenen Liste stabil statt Quicksort; `RandG` als Box-Muller mit fester Saat.
- **Diagramm** neu gestaltet: Abfahrten (grau) und neu die Reisenden unterwegs über den Tag (gelb), aktuelle Uhrzeit als Linie; auf breiten Bildschirmen rechts, sonst unter dem Plan; abschaltbar. „lines to work“ fasst gleiche Paare von Zellen zu einer Linie zusammen (Deckkraft nach Anzahl).
- **Kennzahlen**: Uhrzeit (zusätzlich als hh:mm), steps, traffic, Summen wie im Original; neu die größte Kantenbelastung und die Zahl der Pendler mit Weg im Graphen.
