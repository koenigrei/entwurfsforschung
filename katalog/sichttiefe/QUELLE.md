# Quelle · Sichttiefe (Visibility Step Depth)

| | |
|---|---|
| Original | Grasshopper-Snippet „Visual Distance“ (`visual-distance.zip` → `stops_step_depth.gh`) |
| Eintrag | „Grasshopper snippets for Urban Design and Analysis“ im DeCodingSpaces Lab – https://toolbox.decodingspaces.net/grasshopper-snippets-for-urban-design-and-analysis/ |
| Art | Werkzeugsammlung (elf Lehr-Snippets, Kurs Computational Urban Analysis), 2018 |
| Autorinnen und Autoren | Professuren Informatik in der Architektur und Computational Architecture, Bauhaus-Universität Weimar; das Snippet benutzt das Plugin SpiderWeb 4.2 von Richard Schaffranek (Komponenten visualGraphGrid, recursiveShadowCasting, Breadth-first Search, Display visualGraph) |
| Download | http://decodingspaces-toolbox.org/wp-content/uploads/2018/05/visual-distance.zip |
| Lizenz des Originals | Die Seite nennt keine Lizenz. SpiderWeb ist ein kompiliertes Plugin (kein Quelltext gelesen). Die DeCodingSpaces Toolbox steht heute unter GPL-3.0 (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox); sie enthält dieses Verfahren nicht. Diese App ist eine Neuumsetzung, kein Code übernommen; sie steht unter CC BY 4.0. |
| Gelesen | `.gh` in XML gewandelt; Komponenten, Eingänge mit Beschreibungen, Verdrahtung, Schieberegler, Panel und Notizen gelesen; nichts ausgeführt |

## Übernommen

- **Ablauf der Datei**: „visualGraphGrid“ (Area, Obstacles, gridSize) → „recursiveShadowCasting“ (Sichtbarkeitsgraph) → „Closest Point“ (Startpunkt auf die nächste Zellmitte, „Polygon Center“ der gridCells) → „Breadth-first Search“ (Kosten = Zahl der Schritte vom Startpunkt, „Cost from the Starting Points (step)“) → bei mehreren Startpunkten „Flip Matrix“ + „Sort List“ + „List Item 0“ = kleinste Tiefe je Zelle → „Display visualGraph“.
- **Sichttiefe** im Sinn von Turner et al. (2001): Tiefe 0 Startzelle, Tiefe 1 direkt sichtbar, Tiefe *k* + 1 von einer Zelle der Tiefe *k* aus sichtbar; Richtungswechsel = Tiefe − 1 (Seitentext: „smallest number of turns neccesary to reach any area from a set of given start points“).
- **Nicht erreichbare Zellen** bleiben „+Infinity“ (Panel + „Repeat Data“ + „Replace Items“ der Datei); die App färbt sie grau und zählt sie.
- **Parameter**: gridSize 2 (Regler 0…10); für die Szene „Zufallsrechtecke“ die Gruppe „synthetize buildings“: „Populate 2D“ mit 100 Punkten (Regler 0…100) und „Rectangle“ mit zufälliger Breite und Tiefe.
- **Mehrere Startpunkte** (Notiz „Start points“): Schalter „Klick fügt Startpunkt hinzu“.

## Bewusst geändert

- **Sichtbarkeit selbst berechnet**: SpiderWeb ist kompiliert. Die App rechnet die Sichtbarkeit zwischen Zellen mit *symmetrischem Shadowcasting* (nach Albert Ford, „Symmetric Shadowcasting“, 2021, https://www.albertford.com/shadowcasting/; eigene Umsetzung mit exakten Brüchen): Eine freie Zelle ist sichtbar, wenn ihre Mitte von der Mitte der Startzelle aus frei zu sehen ist; gesperrte Zellen verdecken als volle Quadrate. Der Vorteil gegenüber dem klassischen rekursiven Shadowcasting: A sieht B genau dann, wenn B A sieht – wie im ungerichteten Sichtbarkeitsgraphen von Turner. Ob SpiderWeb symmetrisch rechnet, ist nicht nachzulesen; Werte können an einzelnen Zellen abweichen.
- **Gesperrte Zellen**: Zellen, deren Mitte in einem Gebäude liegt. Der zweite Eingang „overlapDistance“ (in der Datei an denselben Regler 2 angeschlossen, Beschreibung nur „Distance of overlap“) ist ohne Quelltext nicht eindeutig zu deuten und entfällt.
- **Breitensuche Stufe für Stufe**: Grasshopper liefert alle Tiefen auf einmal. In der App ist ein Schritt eine Tiefenstufe: Von jeder Zelle der letzten Stufe aus werden die sichtbaren, noch nicht erreichten Zellen gesucht. So entspricht das Ergebnis genau der Breitensuche über den ganzen Sichtbarkeitsgraphen, ohne ihn vorab mit allen Kanten zu speichern. Vorgänger ist die erste Zelle der letzten Stufe, die eine Zelle sieht („Directed Graph Pointing to the Previous Item“); daraus zeichnet die App einen Weg der wenigsten Richtungswechsel.
- **Szene**: statt der Kurven aus Rhino die Beispielstadt der Isovist-Apps (`../_gemeinsam/szenen.js`, Analysegebiet = ganze Szene, Startpunkt auf dem Platz) oder die Zufallsrechtecke der Datei (Größe 4–20 m auf 260 × 180 m – die Größen der Datei hängen von der Rhino-Geometrie ab und sind nicht bekannt). Andere Saat, andere Szene.
- **Reglerbereich**: gridSize ab 1 m statt 0 (0 ergibt kein Raster); bei 1 m dauert eine Stufe etwa eine Sekunde.
- **Darstellung**: feste Farben je Tiefe (1 blau … 5 rot, ab 6 dunkelrot) statt der Werteanzeige von „Display visualGraph“; Startzellen in der Akzentfarbe.

## Literatur

- Turner, A., Doxa, M., O’Sullivan, D., Penn, A. (2001): From isovists to visibility graphs: a methodology for the analysis of architectural space. *Environment and Planning B: Planning and Design* 28(1), 103–121. https://doi.org/10.1068/b2684
- Ford, A. (2021): Symmetric Shadowcasting. https://www.albertford.com/shadowcasting/
- Schaffranek, R.: SpiderWeb – Graph Tools für Grasshopper. https://www.food4rhino.com/app/spiderweb
