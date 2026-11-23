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
- **Kompilierte Komponente nachgebildet**: „Flow Paths“ ist Teil der kompilierten DeCodingSpaces-Bibliothek; ihr Quelltext liegt nicht vor. Das D8-Verfahren folgt aus Katalogbild, Ein- und Ausgängen und den Notizen. Offen ist, wie die Komponente „Smooth“ umsetzt; die App glättet das Höhenraster mit `round((1 − Smooth) · 8)` Durchgängen eines 3 × 3-Mittels (Smooth 1 = ungeglättet). Analysiert und gezeigt wird das geglättete Gelände.
- **Rasterpunkte**: Resolution zählt die Felder, es gibt also (Resolution + 1)² Rasterpunkte (wie „Divide Surface“ mit U/V Count); Resolution 0 ergibt das kleinste Raster mit 2 × 2 Punkten. Die Startpunkte liegen genau im Raster – der „Jitter“ der Datei mischt nur die Farben der Einzugsgebiete, nicht die Punkte.
- **Gruppierungsabstand in Metern**: Der Regler der Datei reicht von 0 bis 0,1 Rhino-Einheiten, fasst also praktisch nur gleiche Endpunkte zusammen. Die App übernimmt 0,1 m als Voreinstellung und erweitert den Bereich bis 200 m, damit sich benachbarte Senken zusammenlegen lassen. Der Abstand wird wie bei „Point Groups“ im Raum gemessen.
- **Abspielen**: Grasshopper rechnet in einem Zug. In der App lässt „Start“ aus jedem Rasterpunkt einen Tropfen loslaufen; alle Fließwege wachsen gleichzeitig, ein Abschnitt in vier Schritten (`TEILE`), und die Linien werden breiter, je mehr Tropfen einen Abschnitt durchflossen haben (Abflussmenge). Stehen alle Tropfen, gruppiert ein letzter Schritt die Wege nach ihrem Endpunkt und färbt die Einzugsgebiete; dazu sind die Rasterzellen leicht in der Farbe ihres Gebiets hinterlegt. Klick oder Ziehen setzt den Analysepunkt (statt ihn in Rhino zu verschieben).

## Literatur

- O'Callaghan, J. F., Mark, D. M. (1984): The extraction of drainage networks from digital elevation data. *Computer Vision, Graphics, and Image Processing* 28(3), 323–344. https://doi.org/10.1016/S0734-189X(84)80011-0
- Jenson, S. K., Domingue, J. O. (1988): Extracting topographic structure from digital elevation data for geographic information system analysis. *Photogrammetric Engineering and Remote Sensing* 54(11), 1593–1600.
