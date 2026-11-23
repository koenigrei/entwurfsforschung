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

- **Ablauf der Schaltung**: Network Smooth (Snap threshold) → Network to Segments → 1. ProcessGeometry → 2. BuildGraph (gerichteter Segmentgraph) → 3. ShortestFloydWarshal → 4. FWGetPaths (Origins = Destinations = alle Segmente, Weights Origin = Weights Destination) → „Betweenness Centrality weighted“ → Logarithm → Bounds/Remap Numbers auf 0…1 → Merge(0, Weight Tertiary, Weight Secondary, Weight Primary) / Mass Addition × 1.001 → Consecutive Domains (additiv) → Find Domain (nicht strikt) → Tertiary/Secondary/Primary Street (Ebenennamen „PrimaryStreet, SecondaryStreet, TertiaryStreet“ in umgekehrter Reihenfolge den Indizes 0, 1, 2 zugeordnet).
- **Gewichte wie der Cluster „Custom edge weights“** (Inhalt aus dem `ClusterDocument` der .gh-Datei gelesen): Curve Closest Point und Sort List bestimmen das Segment, das einem Punkt am nächsten liegt; ein C#-Skript legt für jedes Segment das Grundgewicht (`general_weight`, Regler 1 [0..1] ganzzahlig) an – zweimal, für beide Fahrtrichtungen – und **ersetzt** es an diesen Segmenten durch `Weight × Anzahl Segmente` (Multiplication mit List Length). Die beiden Cluster (Stadteingänge mit Weight City Entrance, PoI mit Weight Point Of Interest) werden addiert; „Cull Nth“ mit Frequenz 2 kürzt die doppelte Liste wieder auf einen Wert je Segment. Ein Segment ohne Punkt hat also das Gewicht 2 × Grundgewicht, ein Eingangssegment `Weight City Entrance × n + Grundgewicht`.
- **Parameter und Voreinstellungen** der Schieberegler: Snap threshold 2 [0..10], Length Coefficient 0.5 und Angular Coefficient 0.5 [0..1] (in der Datei ein gemeinsamer Regler), Grundgewicht 1 [0..1] ganzzahlig, Weight City Entrance 1 [0..1], Weight Point Of Interest 0.5 [0..1], Weight Primary/Secondary/Tertiary Road je 1 [0..1], Faktor 1.001 [0..10].
- **Bedienung** wie in der Beschreibung des Panels: 1. PoI setzen (etwa das Stadtzentrum), 2. Stadteingänge setzen (nahe dem Segment, das als Eingang dient), 4. Gewichte für PoI, Stadteingang sowie Primary, Secondary und Tertiary einstellen.
- **Darstellung** wie im Katalogbild: drei Farben (Tertiary blaugrün, Secondary gelbgrün, Primary rot), PoI als roter Punkt; zusätzlich drei Linienstärken (wie Custom Preview Lineweights) und wahlweise die Betweenness als Farbskala.

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext; kein Code übernommen. Gelesen (Definitionen, Formeln, Randfälle):

| Datei | Link | Lizenz |
|---|---|---|
| `docs/measures.md` (Segmentgraph mit Fahrtrichtung, Schrittkosten, Gleichstand, Choice) | https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/measures.md | GPL-3.0 |
| `docs/review-2026-11.md`, `docs/migration.md` (was die Legacy-Komponenten 2020/21 rechneten) | https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/review-2026-11.md · https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/migration.md | GPL-3.0 |
| `src/DecodingSpaces.Core/Network/SegmentNetwork.cs` (Zustände je Richtung, keine Wende, Winkel zwischen Aus- und Eingangsrichtung) | https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Network/SegmentNetwork.cs | GPL-3.0 |
| `src/DecodingSpaces.Core/Network/NetworkAnalysis.cs`, `SegmentSearch.cs` (Kostenrundung 1e-7, Rangfolge Kosten/Schritte, Gewichte W_o·W_d) | https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Network/NetworkAnalysis.cs | GPL-3.0 |
| `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyNetworkComponents.cs`, `docs/inventory.md` (Ein- und Ausgänge von 1. ProcessGeometry, 2. BuildGraph, 3. ShortestFloydWarshal, 4. FWGetPaths) | https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyNetworkComponents.cs | GPL-3.0 |
| Grafit, `examples/rhino/Python F1 Dual Graph.py`, `Python F7 Calculate BC and CC.py` (dualer gerichteter Graph, Winkel in Grad) | https://github.com/Bauhaus-InfAU/Grafit | MIT |

**Jetzt übereinstimmend** (umgesetzt in `Geo.richtungsGraph` und `Geo.segmentBetweennessVon`, `../_gemeinsam/geo.js`):
- **Gerichteter Segmentgraph**: jedes Segment hat zwei Zustände (Fahrtrichtungen); ein Schritt führt vom Ende eines Segments in ein anderes Segment am selben Knoten, Wenden auf demselben Segment gibt es nicht. Früher (Runde 1) war der Graph ungerichtet – ein Weg konnte an einem Knoten „über“ ein Nachbarsegment abbiegen, ohne es zu durchfahren.
- **Kosten wie die Legacy-Komponente BuildGraph** (Voreinstellung „DeCodingSpaces 2020“): `Length Coefficient · m / l_max + Angular Coefficient · θ / 180°` mit m = (l_i + l_j) / 2 (Mitte zu Mitte) und l_max = längstes Segment des Netzes. Früher vermutet: Normierung mit der mittleren Länge und θ / 90°.
- **Start- und Zielsegment zählen mit**: Die Toolbox-Doku bestätigt, dass die alte Betweenness „both endpoints“ zählt. Früher war das eine Vermutung aus dem Katalogbild (Zufahrten rot); sie trifft zu.
- **Gewichte** ersetzen am nächsten Segment das Grundgewicht (statt es zu ergänzen); „Cull Nth“ ist geklärt (siehe oben).
- **Choice gewichtet** mit W_o · W_d je geordnetem Paar.

**Wahlweise „Standard (Toolbox v2)“** (Auswahl „Definition“): Kosten `kL · m + kW · θ / 90°` in echten Einheiten (measures.md §2), Start- und Zielsegment zählen nicht (Choice nach Brandes). Damit werden die Zufahrten an den Eingängen zu Anliegerstraßen – das Katalogbild zeigt die Legacy-Definition.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Beispielnetz mit Zufahrten**: verzogenes Raster (11 × 8 Knoten, einzelne Blöcke zusammengelegt) mit vier Zufahrten vom Bildrand; die Stadteingänge stehen voreingestellt an der linken und rechten Zufahrt, der PoI auf dem Platz in der Mitte. Gebäude sind nur Hintergrund.
- **Brandes statt Floyd–Warshall**: Die App sucht die kürzesten Wege je Ursprungssegment mit Dijkstra über beide Richtungen (Brandes 2001); das ergibt dieselben kürzesten Wege wie Floyd–Warshall und ist Grundlage der Toolbox v2.
- **Gleichstand wird geteilt**: Laut review-2026-11.md teilte die alte Betweenness gleich teure Wege nicht (ein Weg aus der Floyd–Warshall-Matrix bekam alles). Die App teilt sie wie die Toolbox v2 (σ nach Brandes; Rangfolge Kosten, dann Schrittzahl; Kosten je Schritt auf 1e-7 gerundet). Bei verzogenem Netz sind exakt gleich teure Wege selten; welcher Weg im Original gewonnen hätte, hängt von der Reihenfolge in der Matrix ab und ist nicht nachbildbar.
- **„Distanz“ d der Legacy-Formel**: Die Doku nennt `LngCf·d/maxSegLen`; d wird hier als Länge Mitte zu Mitte genommen (wie in der Toolbox v2 und Grafit „half-end dual“). Der Legacy-Quelltext selbst liegt nicht im Repository (nur lokal dekompiliert).
- **Logarithmus von 0**: Segmente ohne Durchgang (möglich bei Grundgewicht 0) haben keinen Logarithmus; sie bekommen den kleinsten Wert (Tertiary), statt wie in Grasshopper ohne Wert zu bleiben.
- **Mehrere Punkte**: Der Cluster verknüpft Punkte und Segmente über Grasshopper-Listenabgleich; die App nimmt für jeden Punkt das nächste Segment. Liegen zwei Punkte am selben Segment, gilt das Gewicht einmal (wie das Ersetzen im C#-Skript).
- **Längen- und Winkelkoeffizient** als zwei Regler (in der Datei ein gemeinsamer Regler für beide Eingänge), damit sich ihre Wirkung trennen lässt.
- **Radius** (FWGetPaths „Radius“ = 0) und Distance decay function sind im Original nicht belegt und fehlen.
- **Ablauf**: Grasshopper rechnet alles auf einmal. Hier ist ein Schritt ein Ursprungssegment; die Betweenness wächst sichtbar, die Einteilung wird nach jedem Schritt neu gerechnet. Ändert man Punkte oder Gewichte, nachdem die Analyse begonnen hat, wird sofort ganz gerechnet; „Neu“ leert die Analyse und behält die Punkte. „Bake“ (Ebenen in Rhino) entfällt.

## Literatur

- Freeman, L. C. (1977): A set of measures of centrality based on betweenness. *Sociometry* 40(1), 35–41. https://doi.org/10.2307/3033543
- Brandes, U. (2001): A faster algorithm for betweenness centrality. *Journal of Mathematical Sociology* 25(2), 163–177. https://doi.org/10.1080/0022250X.2001.9990249
- Turner, A. (2007): From axial to road-centre lines: a new representation for space syntax and a new model of route choice for transport network analysis. *Environment and Planning B* 34(3), 539–555. https://doi.org/10.1068/b32067
- Hillier, B., Yang, T., Turner, A. (2012): Normalising least angle choice in Depthmap – and how it opens up new perspectives on the global and local analysis of city space. *Journal of Space Syntax* 3(2), 155–193.
