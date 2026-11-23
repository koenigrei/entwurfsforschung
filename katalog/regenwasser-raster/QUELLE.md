# Quelle · Regenwasserabfluss (Raster)

| | |
|---|---|
| Original | Grasshopper-Modul „Rainwater Rundown (Raster)“ (`RainwaterRundownRaster.gh`), v. 1.0 |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Dennemark |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/RainwaterRundownRaster/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/RainwaterRundownRaster/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Verdrahtung, Schieberegler (Wert, Bereich) und Notizen gelesen, Vorschau-GIF Bild für Bild angesehen; nichts ausgeführt |

## Übernommen

- **Aufbau der .gh-Datei**: DeCodingSpaces-Komponente „Flow Paths“ (Eingänge Terrain, Smooth, U Count = V Count = Resolution; Ausgänge „Flow Paths (Short)“, „Flow Paths (Long)“, Terrain) → „Clean Tree“ → „End Points“ → „Point Groups“ (Distance 0,1) → „List Item“ → Watershed Curves, eingefärbt mit „Gradient“ über „Series“ und gemischt mit „Jitter“ (Seed 2). Dazu die „Local Analysis of Rainwater Rundown Direction“: Punkt auf das Gelände legen (Mesh | Ray, Surface Closest Point), „Evaluate Surface“ → Normale, „Project“ auf die XY-Ebene, „Vector“ (unitize) × 300 → „Vector Display Ex“.
- **Verfahren**: Raster aus Resolution × Resolution Feldern auf dem Gelände; jeder Rasterpunkt fließt zum Nachbarn mit dem steilsten Gefälle unter den acht Nachbarn. Das Katalogbild zeigt genau diese Linien (waagerecht, senkrecht, diagonal im Raster, baumartig verzweigt). Kurzer Fließweg = ein Abschnitt Punkt → Nachbar, langer Fließweg = Kette bis zur Senke oder zum Rand. Lange Fließwege werden nach ihrem Endpunkt gruppiert; Notiz der Datei: „Group long Flow Paths by their end point. If they share the same point, they belong to the same water shed.“
- **Parameter und Voreinstellungen**: Resolution 50 (0–100), Smooth 0,5 (0–1, Notiz „0 = Smooth, 1 = Precise“), Point Groups Distance 0,1, Länge des Richtungspfeils 300 (Schieberegler 0–1000 an „Multiplication“).
- **Lokale Fließrichtung**: Die waagerechte Komponente der Flächennormale zeigt bergab; als Pfeil fester Länge = Richtung des negativen Gradienten.
- **Darstellung** wie im Katalogbild: Fließwege in den Farben ihres Einzugsgebiets (Gradient blau – grün – gelb – rot, Reihenfolge gemischt), roter Analysepunkt mit Pfeil.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit einer Geländefläche aus einer Rhino-Datei. Die App erzeugt ein vergleichbares Gelände (2 km × 2 km, ein Berg mit Rücken und Tälern) mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt ein anderes Gelände. Darstellung von oben mit Schummerung und Höhenlinien statt Isometrie.
- **Kompilierte Komponente nachgebildet**: „Flow Paths“ ist Teil der kompilierten DeCodingSpaces-Bibliothek; ihr Quelltext liegt auch in der neuen Toolbox nicht vor (siehe „Abgleich mit dem Quelltext“). Das D8-Verfahren folgt aus Katalogbild, Ein- und Ausgängen, den Notizen und dem Hinweis auf `highestIdx` in der Durchsicht der Toolbox. Offen ist, wie die Komponente „Smooth“ umsetzt; die App glättet das Höhenraster mit `round((1 − Smooth) · 8)` Durchgängen eines 3 × 3-Mittels (Smooth 1 = ungeglättet). Analysiert und gezeigt wird das geglättete Gelände.
- **Rasterpunkte**: Resolution zählt die Felder, es gibt also (Resolution + 1)² Rasterpunkte (wie „Divide Surface“ mit U/V Count); Resolution 0 ergibt das kleinste Raster mit 2 × 2 Punkten. Die Startpunkte liegen genau im Raster – der „Jitter“ der Datei mischt nur die Farben der Einzugsgebiete, nicht die Punkte.
- **Gruppierungsabstand in Metern**: Der Regler der Datei reicht von 0 bis 0,1 Rhino-Einheiten, fasst also praktisch nur gleiche Endpunkte zusammen. Die App übernimmt 0,1 m als Voreinstellung und erweitert den Bereich bis 200 m, damit sich benachbarte Senken zusammenlegen lassen. Der Abstand wird wie bei „Point Groups“ im Raum gemessen.
- **Abspielen**: Grasshopper rechnet in einem Zug. In der App lässt „Start“ aus jedem Rasterpunkt einen Tropfen loslaufen; alle Fließwege wachsen gleichzeitig, ein Abschnitt in vier Schritten (`TEILE`), und die Linien werden breiter, je mehr Tropfen einen Abschnitt durchflossen haben (Abflussmenge). Stehen alle Tropfen, gruppiert ein letzter Schritt die Wege nach ihrem Endpunkt und färbt die Einzugsgebiete; dazu sind die Rasterzellen leicht in der Farbe ihres Gebiets hinterlegt. Klick oder Ziehen setzt den Analysepunkt (statt ihn in Rhino zu verschieben).

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext der DeCodingSpaces-Toolbox (Bauhaus-InfAU/decoding-spaces-toolbox, GPL-3.0); kein Code übernommen.

- **Herkunft geklärt**: „Flow Paths“ ist eine Komponente von DeCodingSpaces selbst – Kategorie *Hydrology*, Klasse `FlowPaths.FlowPathsComponent`, GUID `33b3970f-1597-4709-bab0-0e80fcfd540b`, Beschreibung „Analyse Flow Paths of Terrain“ –, keine Grasshopper-Standardkomponente und nicht aus Bison oder Ladybug. Eingänge und Ausgänge stimmen mit der .gh-Datei überein: Terrain (Surface), Smooth (Number), U Count, V Count (Integer) → Flow Paths (Short), Flow Paths (Long) (Curve-Listen), Terrain (Surface). Quelle: `docs/inventory.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/inventory.md, Tabellenzeile „Flow Paths“ und Abschnitt „Flow Paths (Hydrology)“).
- **Kein Quelltext in der Toolbox**: Die Komponente ist als „keep“ eingestuft, aber noch nicht neu gebaut; „Terrain/Flow Paths“ steht als nächster Punkt in `docs/status.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/status.md, Abschnitt „Next“). Unter `src/` gibt es keine Datei dazu. Die übrigen Hydrology-Komponenten (Analyse/Read/Write Hydrology Network) rechnen Rohrnetze mit EPANET (`docs/decompiling.md`, https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/decompiling.md) und haben mit dem Oberflächenabfluss nichts zu tun. Auch „Point Groups“ ist keine DeCodingSpaces-Komponente (Grasshopper-Standard).
- **Fehler der alten Komponente**: Die Durchsicht `docs/review-2026-11.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/review-2026-11.md, Abschnitt „Correctness bugs found in passing“) nennt: „`highestIdx` never updates its running max, and it mutates the input surface.“ Daraus folgt: Die Komponente sucht unter den Nachbarn eines Rasterpunkts den mit dem größten Wert (bestätigt die Wahl des Nachbarn im Raster, wie D8), merkt sich dabei aber den bisher größten Wert nicht – sie nimmt also nicht sicher den steilsten Nachbarn, sondern den letzten, der die Schwelle überschreitet. Die App behebt das (Rezept: offensichtliche Programmfehler werden behoben) und nimmt den steilsten Nachbarn (`abfluss` in `modell.js`). Dass die Komponente die Eingangsfläche verändert, betrifft die App nicht; sie glättet eine Kopie des Höhenrasters (`Szenen.glaette`).
- **Unverändert offen**: Wie „Smooth“ genau wirkt und ob U/V Count Felder oder Punkte zählen, steht weder in der Doku noch in einer Quelldatei. Die Annahmen der App bleiben: Smooth → `round((1 − Smooth) · 8)` Glättungsdurchgänge, (Resolution + 1)² Rasterpunkte.

## Literatur

- O'Callaghan, J. F., Mark, D. M. (1984): The extraction of drainage networks from digital elevation data. *Computer Vision, Graphics, and Image Processing* 28(3), 323–344. https://doi.org/10.1016/S0734-189X(84)80011-0
- Jenson, S. K., Domingue, J. O. (1988): Extracting topographic structure from digital elevation data for geographic information system analysis. *Photogrammetric Engineering and Remote Sensing* 54(11), 1593–1600.
