# Quelle · Straßenhierarchie

| | |
|---|---|
| Original | Grasshopper-Modul „Street Hierarchy“ (`StreetHierarchy.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Dennemark |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/StreetHierarchy/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/StreetHierarchy/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Übernommen

- **Ablauf der Schaltung**: Network Smooth (Snap threshold) → Network to Segments → 1. ProcessGeometry → 2. BuildGraph (dualer Graph: Knoten = Segmente) → 3. ShortestFloydWarshal → 4. FWGetPaths (Origins = Destinations = alle Segmente, Weights Origin = Weights Destination) → „Betweenness Centrality weighted“ → Logarithm → Bounds/Remap Numbers auf 0…1 → Merge(0, Weight Tertiary, Weight Secondary, Weight Primary) / Mass Addition × 1.001 → Consecutive Domains (additiv) → Find Domain (nicht strikt) → Tertiary/Secondary/Primary Street (Ebenennamen „PrimaryStreet, SecondaryStreet, TertiaryStreet“ in umgekehrter Reihenfolge den Indizes 0, 1, 2 zugeordnet).
- **Zusatzgewichte** wie die beiden Cluster „Custom edge weights“: das Segment, das einem Stadteingang bzw. einem Point of Interest am nächsten liegt („street segments closest to city entrance or points of interest get an additional weight to simulate ingoing and outgoing traffic“), bekommt `Weight City Entrance × Anzahl Segmente` bzw. `Weight Point Of Interest × Anzahl Segmente` (Multiplication mit List Length); beide Listen werden addiert (Addition), jede trägt das Grundgewicht bei.
- **Parameter und Voreinstellungen** der Schieberegler: Snap threshold 2 [0..10], Length Coefficient 0.5 und Angular Coefficient 0.5 [0..1] (in der Datei ein gemeinsamer Regler), Grundgewicht 1 [0..1] ganzzahlig, Weight City Entrance 1 [0..1], Weight Point Of Interest 0.5 [0..1], Weight Primary/Secondary/Tertiary Road je 1 [0..1], Faktor 1.001 [0..10].
- **Bedienung** wie in der Beschreibung des Panels: 1. PoI setzen (etwa das Stadtzentrum), 2. Stadteingänge setzen (nahe dem Segment, das als Eingang dient), 4. Gewichte für PoI, Stadteingang sowie Primary, Secondary und Tertiary einstellen.
- **Darstellung** wie im Katalogbild: drei Farben (Tertiary blaugrün, Secondary gelbgrün, Primary rot), PoI als roter Punkt; zusätzlich drei Linienstärken (wie Custom Preview Lineweights) und wahlweise die Betweenness als Farbskala.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Beispielnetz mit Zufahrten**: verzogenes Raster (11 × 8 Knoten, einzelne Blöcke zusammengelegt) mit vier Zufahrten vom Bildrand; die Stadteingänge stehen voreingestellt an der linken und rechten Zufahrt, der PoI auf dem Platz in der Mitte. Gebäude sind nur Hintergrund.
- **Betweenness nach Brandes statt Floyd–Warshall**: Die DeCodingSpaces-Komponenten sind kompiliert. Die App sucht die kürzesten Wege je Ursprungssegment mit Dijkstra (Brandes 2001, `Geo.betweennessVon`); das ergibt dieselben kürzesten Wege wie Floyd–Warshall. Gleich teure Wege teilen sich den Durchgang (σ-Gewichtung) – ob FWGetPaths das genauso hält, ist nicht bekannt.
- **Start- und Zielsegment zählen mit**: Ein Weg zählt auch für das Segment, auf dem er beginnt und endet. Nur so werden die Zufahrten an den Stadteingängen zu Hauptstraßen, wie es das Katalogbild zeigt (die Zufahrten links und rechts sind rot). Ohne diese Annahme hätte ein Sackgassen-Segment am Eingang die Betweenness 0.
- **Logarithmus von 0**: Segmente ohne Durchgang (möglich bei Grundgewicht 0) haben keinen Logarithmus; sie bekommen den kleinsten Wert (Tertiary), statt wie in Grasshopper ohne Wert zu bleiben.
- **Cull Nth**: Zwischen „Addition“ und den Gewichtseingängen von FWGetPaths liegt in der Datei ein „Cull Nth“ (jedes zweite Element entfernen), vermutlich wegen einer doppelten Liste aus den Clustern. Ohne die Cluster-Innereien ist das nicht nachvollziehbar; die App gibt jedem Segment genau ein Gewicht.
- **Längen- und Winkelkoeffizient** als zwei Regler (in der Datei ein gemeinsamer Regler für beide Eingänge), damit sich ihre Wirkung trennen lässt. Kostenformel wie `Geo.segmentGraph`: `kL · (l_i + l_j) / 2 / l̄ + kW · Winkel / 90°` – die genaue Normierung der kompilierten Komponente ist nicht bekannt.
- **Ablauf**: Grasshopper rechnet alles auf einmal. Hier ist ein Schritt ein Ursprungssegment; die Betweenness wächst sichtbar, die Einteilung wird nach jedem Schritt neu gerechnet. Ändert man Punkte oder Gewichte, nachdem die Analyse begonnen hat, wird sofort ganz gerechnet; „Neu“ leert die Analyse und behält die Punkte. „Bake“ (Ebenen in Rhino) entfällt.

## Literatur

- Freeman, L. C. (1977): A set of measures of centrality based on betweenness. *Sociometry* 40(1), 35–41. https://doi.org/10.2307/3033543
- Brandes, U. (2001): A faster algorithm for betweenness centrality. *Journal of Mathematical Sociology* 25(2), 163–177. https://doi.org/10.1080/0022250X.2001.9990249
- Turner, A. (2007): From axial to road-centre lines: a new representation for space syntax and a new model of route choice for transport network analysis. *Environment and Planning B* 34(3), 539–555. https://doi.org/10.1068/b32067
