# Quelle · Kürzester Weg im Straßennetz

| | |
|---|---|
| Original | Grasshopper-Modul „Street Network Shortest Path“ (`NetworkShortestPath.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Reinhard König, Martin Bielik, Ekaterina Fuchkina |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/NetworkShortestPath/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/NetworkShortestPath/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Übernommen

- **Drei Verfahren** wie die drei Gruppen der Datei: „1. Shortest Path Simple – SLOW“ (CityGraph: berechnet Wege und Zentralitäten, einfach zu benutzen, langsam), „2. Shortest Path Dijkstra – FAST“ (2. BuildGraph → 3. ShortestDijkstra: schnell für wenige Wege, langsam für viele) und „3. Floyd Warshal – SLOW in preparation, then FAST“ (2. BuildGraph → 3. ShortestFloydWarshal → 4. FWGetPaths: schnell, wenn viele oder alle Wege gebraucht werden). Die Beschreibungen der drei Panels stehen sinngemäß in der App.
- **Dualer Graph**: Knoten sind die Straßensegmente (Panel: „all street have to be splited at intersection and represented as lines“), Ursprung und Ziel sind Punkte, die dem nächsten Segment zugeordnet werden.
- **Parameter und Voreinstellungen**: Length Coefficient 0 und Angular Coefficient 1 [0..1] (BuildGraph und CityGraph); die Auswahl „Kostenart“ setzt die Paare 0/1 (winkelbasiert), 1/0 (metrisch) oder 0,5/0,5. Toggle „Run Calculation (takes a while..)“ = aus.
- **Wertelisten** „shortest path segment IDs / custom costs / metric costs“ der PInfo-Decompose-Komponenten erscheinen als Kennzahlen.
- **Darstellung** wie im Katalogbild: graues Netz, Gebäude hellgrau als Hintergrund („Buildings (only Visualisation)“), Weg mit Farbverlauf von Cyan nach Lila; Ursprung und Ziel lassen sich ziehen („Select Origin or Destination and move them around“).

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Verfahren nachgebildet**: Die DeCodingSpaces-Komponenten sind kompiliert. „Simple“ ist hier Dijkstra mit linearer Suche des nächsten Knotens (O(n²), ohne Vorrangwarteschlange), „Dijkstra“ benutzt einen binären Heap und hört am Ziel auf, „Floyd Warshal“ rechnet die volle Matrix aller Paare (`Geo.floydSchritt`, ohne GPU). Die Zentralitäten von CityGraph rechnet die App getrennt über den Schalter „Betweenness rechnen“ (Brandes).
- **Kosten**: Formel wie `Geo.segmentGraph`: `kL · (l_i + l_j) / 2 / l̄ + kW · Winkel / 90°`; die genaue Normierung der kompilierten Komponente ist nicht bekannt. „metric costs“ = Länge von Segmentmitte zu Segmentmitte in Metern. Zu den Kosten kommt ein sehr kleiner Längenanteil (10⁻⁶), damit gleich teure Wege (häufig bei winkelbasierten Kosten) eindeutig werden und alle Verfahren denselben Weg finden; bei exakt gleich langen und gleich teuren Wegen (symmetrische Geometrie) können die Verfahren verschiedene, gleich teure Wege wählen.
- **Ein Ursprung, ein Ziel, ein Verfahren zur Zeit** statt drei Gruppen nebeneinander; die Rechenzeiten der drei Verfahren vergleicht „Messen“ (je Verfahren wiederholt gemessen, Floyd–Warshall getrennt nach Vorbereitung und Abfrage). Zeiten misst nur `app.js`.
- **Ablauf**: Grasshopper rechnet auf einmal. Hier rechnet Ziehen den Weg sofort (wie in Grasshopper), „Suchen“ und Start zeigen die Suche Schritt für Schritt: ein Schritt ist bei Dijkstra und Simple ein Knoten, der fest wird, bei Floyd–Warshall eine Runde k. Die Floyd–Warshall-Matrix bleibt beim Versetzen von Ursprung und Ziel erhalten und wird nur bei geänderten Kosten neu gerechnet.
- **Beispielnetz** statt Rhino-Geometrie: verzogenes Raster (11 × 8 Knoten, einzelne Blöcke zusammengelegt) aus `Szenen.stadt`; Network Smooth (Snap 0.5) ist dafür nicht nötig.

## Literatur

- Dijkstra, E. W. (1959): A note on two problems in connexion with graphs. *Numerische Mathematik* 1, 269–271. https://doi.org/10.1007/BF01386390
- Floyd, R. W. (1962): Algorithm 97: Shortest path. *Communications of the ACM* 5(6), 345. https://doi.org/10.1145/367766.368168
- Brandes, U. (2001): A faster algorithm for betweenness centrality. *Journal of Mathematical Sociology* 25(2), 163–177. https://doi.org/10.1080/0022250X.2001.9990249
- Turner, A. (2007): From axial to road-centre lines: a new representation for space syntax and a new model of route choice for transport network analysis. *Environment and Planning B* 34(3), 539–555. https://doi.org/10.1068/b32067
