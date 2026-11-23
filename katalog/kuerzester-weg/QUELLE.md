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
- **Segmentgraph**: Knoten sind die Straßensegmente (Panel: „all street have to be splited at intersection and represented as lines“), Ursprung und Ziel sind Punkte, die dem nächsten Segment zugeordnet werden.
- **Parameter und Voreinstellungen**: Length Coefficient 0 und Angular Coefficient 1 [0..1] (BuildGraph und CityGraph); die Auswahl „Kostenart“ setzt die Paare 0/1 (winkelbasiert), 1/0 (metrisch) oder 0,5/0,5. Toggle „Run Calculation (takes a while..)“ = aus.
- **Wertelisten** „shortest path segment IDs / custom costs / metric costs“ der PInfo-Decompose-Komponenten erscheinen als Kennzahlen.
- **Darstellung** wie im Katalogbild: graues Netz, Gebäude hellgrau als Hintergrund („Buildings (only Visualisation)“), Weg mit Farbverlauf von Cyan nach Lila; Ursprung und Ziel lassen sich ziehen („Select Origin or Destination and move them around“).

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext; kein Code übernommen. Gelesen (Definitionen, Formeln, Randfälle):

| Datei | Link | Lizenz |
|---|---|---|
| `docs/measures.md` (Segmentgraph mit Fahrtrichtung, Schrittkosten, Gleichstand, Abfragen von einem Punkt) | https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/measures.md | GPL-3.0 |
| `docs/review-2026-11.md`, `docs/migration.md` (Kostenformel und Betweenness der Legacy-Komponenten 2020/21) | https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/review-2026-11.md · https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/migration.md | GPL-3.0 |
| `src/DecodingSpaces.Core/Network/SegmentNetwork.cs` (zwei Zustände je Segment, keine Wende, Winkel zwischen Aus- und Eingangsrichtung, Meter Mitte zu Mitte) | https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Network/SegmentNetwork.cs | GPL-3.0 |
| `src/DecodingSpaces.Core/Network/NetworkAnalysis.cs`, `NetworkQueries.cs` (Kostenrundung, kürzester Weg zwischen Segmenten) | https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Network/NetworkQueries.cs | GPL-3.0 |
| `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyNetworkComponents.cs`, `docs/inventory.md` (Ein- und Ausgänge von CityGraph, 2. BuildGraph, 3. ShortestDijkstra, 3. ShortestFloydWarshal, 4. FWGetPaths) | https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyNetworkComponents.cs | GPL-3.0 |
| Grafit, `examples/rhino/Python F1 Dual Graph.py`, `Python F3 Get Shortest Paths.py` (dualer gerichteter Graph aus dem gerichteten Primärgraphen, Winkel in Grad, Abstand je Gewichtsmatrix) | https://github.com/Bauhaus-InfAU/Grafit | MIT |

**Jetzt übereinstimmend** (umgesetzt in `Geo.richtungsGraph`, `../_gemeinsam/geo.js`):
- **Gerichteter Segmentgraph**: zwei Zustände (Fahrtrichtungen) je Segment, Schritte nur vom Ende eines Segments in ein anderes Segment, keine Wende auf demselben Segment; die Suche startet in beiden Richtungen des Ursprungssegments und endet, sobald eine Richtung des Zielsegments erreicht ist. In Runde 1 war der Graph ungerichtet; dort konnte ein Weg an einem Knoten „über“ ein Nachbarsegment abbiegen, ohne es zu durchfahren (billiger, als es ist).
- **Kosten wie die Legacy-Komponente BuildGraph** (Voreinstellung „DeCodingSpaces 2020“): `Length Coefficient · m / l_max + Angular Coefficient · θ / 180°`, m = (l_i + l_j) / 2, l_max = längstes Segment (review-2026-11.md, migration.md). Früher vermutet: Normierung mit der mittleren Länge und θ / 90°.
- **„metric costs“** = Länge von Segmentmitte zu Segmentmitte (wie „half-end dual“ in Grafit und measures.md §2).
- **Betweenness (Run Calculation)** wie CityGraph 2020: Start- und Zielsegment zählen mit (review-2026-11.md: „both endpoints count“).
- **Wahlweise „Standard (Toolbox v2)“**: `kL · m + kW · θ / 90°` in echten Einheiten, Betweenness ohne Start und Ziel (Choice nach Brandes).

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Verfahren nachgebildet**: „Simple“ ist hier Dijkstra mit linearer Suche des nächsten Zustands (O(n²), ohne Vorrangwarteschlange), „Dijkstra“ benutzt einen binären Heap und hört am Ziel auf, „Floyd Warshal“ rechnet die volle Matrix aller Zustandspaare (`Geo.floydSchritt`, ohne GPU; der Legacy-Code hat dafür ebenfalls einen CPU-Pfad, decompiling.md). Die Zentralitäten von CityGraph rechnet die App getrennt über den Schalter „Betweenness rechnen“.
- **Gleichstand**: Zu den Kosten kommt ein sehr kleiner Längenanteil (10⁻⁶ · m / mittlere Länge), damit gleich teure Wege (häufig bei winkelbasierten Kosten, Geradeaus kostet 0) eindeutig werden und alle drei Verfahren denselben Weg finden; die angezeigten Kosten enthalten ihn nicht. Die Toolbox v2 ordnet stattdessen nach (Kosten, Schrittzahl); bei exakt gleich langen und gleich teuren Wegen (symmetrische Geometrie) können die Verfahren verschiedene, gleich teure Wege wählen.
- **„Distanz“ d der Legacy-Formel**: Die Doku nennt `LngCf·d/maxSegLen`; d wird als Länge Mitte zu Mitte genommen. Der Legacy-Quelltext selbst liegt nicht im Repository (nur lokal dekompiliert).
- **Ursprung und Ziel**: Wie im Original zählt das nächste Segment (Weg von Mitte zu Mitte). Die Toolbox v2 misst bei Abfragen von einem Punkt ab der Lage des Punkts auf dem Segment (measures.md §4); das ist hier nicht übernommen.
- **Ein Ursprung, ein Ziel, ein Verfahren zur Zeit** statt drei Gruppen nebeneinander; die Rechenzeiten der drei Verfahren vergleicht „Messen“ (je Verfahren wiederholt gemessen, Floyd–Warshall getrennt nach Vorbereitung und Abfrage). Zeiten misst nur `app.js`.
- **Ablauf**: Grasshopper rechnet auf einmal. Hier rechnet Ziehen den Weg sofort (wie in Grasshopper), „Suchen“ und Start zeigen die Suche Schritt für Schritt: ein Schritt ist bei Dijkstra und Simple ein Zustand (Segment in einer Richtung), der fest wird, bei Floyd–Warshall eine Runde k über alle Zustände. Die Floyd–Warshall-Matrix bleibt beim Versetzen von Ursprung und Ziel erhalten und wird nur bei geänderten Kosten neu gerechnet.
- **Beispielnetz** statt Rhino-Geometrie: verzogenes Raster (11 × 8 Knoten, einzelne Blöcke zusammengelegt) aus `Szenen.stadt`; Network Smooth (Snap 0.5) ist dafür nicht nötig.

## Literatur

- Dijkstra, E. W. (1959): A note on two problems in connexion with graphs. *Numerische Mathematik* 1, 269–271. https://doi.org/10.1007/BF01386390
- Floyd, R. W. (1962): Algorithm 97: Shortest path. *Communications of the ACM* 5(6), 345. https://doi.org/10.1145/367766.368168
- Brandes, U. (2001): A faster algorithm for betweenness centrality. *Journal of Mathematical Sociology* 25(2), 163–177. https://doi.org/10.1080/0022250X.2001.9990249
- Turner, A. (2007): From axial to road-centre lines: a new representation for space syntax and a new model of route choice for transport network analysis. *Environment and Planning B* 34(3), 539–555. https://doi.org/10.1068/b32067
