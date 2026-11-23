# Quelle · Serpentinen

| | |
|---|---|
| Original | Grasshopper-Modul „Serpentine Roads“ (`SerpentineRoads.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Dennemark |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/SerpentineRoads/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/SerpentineRoads/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Übernommen

- **Gitter** wie *Divide Surface* (U = V = „Number Slider“ 50 [0..100]) und das C#-Skript der Datei: jeder Gitterpunkt wird mit rechtem und unterem Nachbarn und mit beiden Diagonalen der Masche verbunden (8er-Nachbarschaft, SpiderWeb *graphFromLines*).
- **Steilheit** je Kante: Winkel zwischen Kante und ihrer waagerechten Projektion (*Angle*, *Vector XYZ* mit z = 0); *Evaluate* `if(x>y, PI*0.5, x)` mit y = *Radians* von „Degree Steepness“ [0..100], über *Integer* ganzzahlig (Startwert siehe unten).
- **Kosten** (aus der Verdrahtung nachgeprüft): `Remap(Steilheit)·(1 − w) + Remap(Länge)·w`, w = „Weight Steepness“ 0 [0..1]; *Subtraction* `1 − w` (Panel „1“) geht an die Steilheit, w an die Länge – passend zum Panel „0 : Only Steepness, 1: Only Shortest Path“. *Remap Numbers* mit Source = *Bounds* der Liste und Target 0…1.
- **Kürzester Weg** (*ShortestPathBetweenPoints*, Dijkstra) zwischen den Gitterpunkten nächst Start und Ziel (*Closest Point*); Start und Ziel werden mit Linien angehängt (*Line*, *Join Curves*), danach *Smooth Polyline* mit Strength 1 und Times = „Smooth“ 2 [1..10].
- **Begriffe** der Datei in den Reglernamen (Degree Steepness, Weight Steepness, Smooth, Divide Surface).

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene. Das Gelände ist 2 km × 2 km groß mit einem rund 160 m hohen Berg (Hänge bis etwa 20°), damit Kehren mit straßenüblicher Steigung überhaupt möglich sind: Im Gitter mit acht Richtungen hat die flachste Kante auf einem Hang der Neigung s noch etwa 0,71 · s Steigung (45° zur Höhenlinie); auf steileren Hängen bleiben Kanten über der Schwelle unvermeidlich.
- **Startwert „Degree Steepness“ 5° statt 1°** (auf Wunsch des Nutzers, 23.11.2026): Mit 1° ist fast jede Kante „zu steil“ und der Weg verläuft gerade – das zeigt das Verfahren nicht. 5° entspricht tan 5° ≈ 8,7 % und ist die ganze Gradzahl, die der Höchstlängsneigung von 8 % am nächsten liegt, die die *Richtlinien für die Anlage von Landstraßen* für die niedrigste Entwurfsklasse zulassen (RAL, FGSV 2012, FGSV-Nr. 201, Entwurfsklasse EKL 4; höhere Klassen weniger). Steilere Gebirgsstraßen lassen sich mit dem Regler einstellen; 1° (Wert der Datei) bleibt wählbar. Die Färbung der Kanten über der Schwelle ist beim Start an und lässt sich ausschalten.
- **Draufsicht statt Isometrie**: Das Gelände erscheint von oben mit Schummerung und Höhenlinien (10 m); die Rhino-Ansicht der GIF-Vorschau ist isometrisch.
- **Ablauf**: Grasshopper rechnet sofort. Hier zeigt ein Schritt „Knoten je Schritt“ (Voreinstellung 25) Dijkstra-Expansionen mit sichtbarer Suchfront; wenn das Ziel erreicht ist, steht der Weg und der Lauf hält an. Ziehen von Start/Ziel und Regleränderungen rechnen wie in Grasshopper sofort zu Ende; „Suche abspielen“ zeigt die Suche erneut.
- **Start und Ziel** werden per Maus gezogen (statt in Rhino verschoben); das Hinunterprojizieren auf das Gelände (*Mesh | Ray*) entfällt, die Höhe kommt direkt aus dem Höhenraster.
- **Gitterteilung** beginnt bei 2 statt 0 (0 und 1 ergeben keinen Graphen).
- **Kennzahlen** (Länge, Höhenunterschied, größte und mittlere Steigung, Kanten über der Schwelle) sind hinzugefügt; die größte Steigung wird auf den Gitterkanten gemessen, weil die Glättung Ecken abschneidet und dort kurze, steilere Stücke erzeugt (geglätteter Wert steht daneben).
- **Eigenheit des Originals bleibt**: Weil *Remap* die kürzeste Kante auf 0 abbildet, ist mit w = 1 nicht die metrisch kürzeste Strecke am günstigsten, sondern ein Weg über flache, achsparallele Kanten. Das ist so in der Datei verdrahtet und wird nicht korrigiert.
- **SpiderWeb** (Richard Schaffranek) ist kompiliert; Graph und Dijkstra sind nach der Beschreibung nachgebildet (`Geo.Heap`). Bei gleich teuren Wegen kann die Wahl von SpiderWeb abweichen.

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext der DeCodingSpaces-Toolbox (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox, GPL-3.0; `docs/inventory.md`, `docs/status.md`, `docs/review-2026-11.md`, `docs/decompiling.md`, `src/`) und von Grafit (https://github.com/Bauhaus-InfAU/Grafit, MIT); kein Code übernommen.

- **Keine DeCodingSpaces-Komponente im Modul.** Die Bibliotheken der .gh-Datei sind *SpiderWeb :: Graph Tools* 0.0.4.2 (Richard Schaffranek: *graphFromLines*, *GraphToDataTree*, *DataTreeToGraph*, *Display Graph*, *ShortestPathBetweenPoints*), *Human* (nur *Custom Preview Lineweights*) und *MetaHopper* (nur *Document Info*); alles andere sind Grasshopper-Standardkomponenten (*Divide Surface*, *Angle*, *Evaluate*, *Remap Numbers*, *Bounds*, *Closest Point*, *Mesh | Ray*, *Join Curves*, *Smooth Polyline*) und das C#-Skript der Datei. Nichts davon steht in der Toolbox.
- Die Toolbox hat einen eigenen kürzesten Weg (`src/DecodingSpaces.Core/Graph/ShortestPathSearch.cs`, https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Graph/ShortestPathSearch.cs, und die Komponente *Shortest Path* in `src/DecodingSpaces.Grasshopper/Components/CityGraph/ShortestPathComponent.cs`); er arbeitet auf dem Segmentgraphen eines Straßennetzes, nicht auf einem Geländegitter, und wird von diesem Modul nicht benutzt. Keine Abweichung zu korrigieren.
