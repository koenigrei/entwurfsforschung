# Quelle · Parzellen mit eigenem Kantenversatz

| | |
|---|---|
| Original | Grasshopper-Modul „Parcel Custom Offset“ (`ParcelCustomOffset.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Bielik |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/ParcelCustomOffset/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/ParcelCustomOffset/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Übernommen

- **Ablauf der Schaltung** (Verdrahtung aus der .gh-Datei gelesen): Paths (Kurven) → Network to Segments (ConvertCurves ← Toggle, ConversionAngle ← Regler, Split = true) → Network Smooth (Snap threshold ← Regler, keine Anker) → CityGraph (Length Coefficient 1, Angular Coefficient 0, ohne Ursprünge, Ziele und Gewichte, Radius 0) → Betweenness Centrality → Polygons from lines (Lines = Wegesegmente, Line values = Betweenness, MinBlockSize 0) → Remap Numbers (Value = Synchronized values, Source = Bounds der Betweenness aller Segmente, Target = Construct Domain(Offset Min × Negative, Offset Max × Negative)) → Custom offset (Polygons, OffsetValues) → Boundary Surfaces (graue Plots).
- **Farbe der Wege** wie im zweiten Zweig: Betweenness → Logarithm → Bounds → Remap Numbers auf 0…1 → Gradient → Custom Preview Lineweights; der Versatz dagegen folgt der Betweenness linear (die Remap-Komponente für den Versatz hängt vor dem Logarithmus).
- **Parameter und Voreinstellungen** der Schieberegler und Schalter: ConversionAngle 0.517 [0..1], ConvertCurves (Toggle) an, Snap threshold 19 [0..100], Offset Min 7 [0..100], Offset Max 18 [0..100], Negative Offset an, Thickness 2 [0..10] (Linienstärke der Wege).
- **Begriffe** der Beschreibung („Offset individual polygon edges by custom values … The values of the analysis are used to define the offset of street segments … The Negative Offset toggle button is used to switch direction of the offset“).
- **Darstellung** wie im Katalogbild: Plots grau gefüllt, Wege farbig nach log(Betweenness) von blaugrün bis rot, Gebäude und übrige Straßen hell im Hintergrund („only Visualisation“).

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Szene**: ein Gebiet von etwa 560 × 380 m mit geschwungenen Wegen (verzogenes Raster aus 6 × 5 Knoten, einzelne Diagonalen, einzelne Wege entfallen, Stichwege nach außen) in einer Beispielstadt. Die Wege sind quadratische Bézierkurven, damit ConvertCurves und ConversionAngle etwas zu tun haben.
- **Kompilierte Komponenten nachgebildet**: Network to Segments, Network Smooth, CityGraph, Polygons from lines und Custom offset liegen nur als Binärdateien vor. Nachgebildet nach Beschreibung, Ein- und Ausgängen (Toolbox-Doku `docs/inventory.md`) und Katalogbild:
  - *ConversionAngle*: Ein Knick bleibt, wo sich die Richtung seit dem letzten Knick um mehr als den Winkel (Bogenmaß) gedreht hat. *ConvertCurves aus* ersetzt eine Kurve durch ihre Sehne – wie die alte Komponente Kurven ohne Umwandlung behandelt hat, ist nicht bekannt.
  - *Network Smooth* legt wie die alte Komponente jeden Knoten mit allen Knoten im Fangabstand zusammen (nicht nur Kreuzungen; laut `docs/migration.md` war das bei der alten Fassung so); ein Fangabstand 0 wirkt nicht. Neu: Kreuzungen, die durch das Verschieben entstehen, werden geteilt, damit „Polygons from lines“ ein ebenes Netz bekommt.
  - *CityGraph*: Betweenness über den Segmentgraphen (`Geo.segmentGraph` mit Längenkoeffizient 1, Winkelkoeffizient 0) nach Brandes (`Geo.betweennessVon`), geordnete Paare, Start- und Zielsegment zählen nicht (Definition „Choice“ in `docs/measures.md`).
  - *Polygons from lines*: kleinste Zyklen des ebenen Netzes über Halbkanten; Sackgassen und Brücken gehören zu keinem Plot, Inseln in einem Plot bilden kein Loch.
  - *Custom offset*: eigene Umsetzung. Vorzeichen wie in der Toolbox (positiv vergrößert, negativ verkleinert; `Polygons.Offset`); Ecken, deren Schnittpunkt weiter als 4 × Versatz entfernt läge, werden abgeschrägt (Gehrungsgrenze 4 wie dort); eine Kante, die sich beim Versatz umkehrt, fällt heraus, und ihre Nachbarn werden neu geschnitten; gerade Kanten aus zwei Plotkanten mit verschiedenen Werten bekommen eine Stufe. Sehr großer Versatz an stark nichtkonvexen Plots kann Selbstschnitte ergeben (kein vollständiges Straight Skeleton).
- **Negative Offset aus**: In der Datei geht der Schalter durch „Negative“ (wahr → −1, falsch → 0) in die Multiplikation; ausgeschaltet wäre der Versatz also 0. Die Beschreibung sagt, der Schalter wechsle die Richtung – so setzt die App ihn um (aus: Plots wachsen um Offset Min … Max nach außen).
- **Ablauf**: Grasshopper rechnet alles auf einmal. Hier ist ein Schritt ein Plot, der seinen Versatz erhält; Netz, Betweenness und Plots stehen schon nach dem Zurücksetzen fest. Ändert man Umwandlung oder Fangabstand, nachdem der Lauf begonnen hat, werden alle Plots sofort neu versetzt; Offset Min/Max und Negative Offset wirken auf die schon versetzten Plots. „Bake“ und die zweite Linienstärke (übrige Straßen) entfallen.

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext; kein Code übernommen. Gelesen (23.11.2026) wurde die DeCodingSpaces-Toolbox, GitHub Bauhaus-InfAU/decoding-spaces-toolbox, Lizenz **GPL-3.0**. Aus Quelltext und Doku wurden nur Definitionen, Vorzeichen, Parameter und Randfälle abgelesen und in eigenem Code umgesetzt (diese App steht unter CC BY 4.0). Die alten Komponenten „Custom offset“ und „Polygons from lines“ haben dort noch keinen Nachfolger (`docs/migration.md`); ihr Quelltext liegt nicht vor. Die neue Blockbildung der Toolbox (`BlockExtractor`: Gebiet minus gepufferter Straßenraum) ist ein anderes Verfahren und wurde nicht nachgebaut.

Gelesene Dateien:
- `docs/inventory.md` – Ein- und Ausgänge von Custom offset, Polygons from lines, Network Smooth, Network to Segments (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/inventory.md)
- `docs/migration.md` – Verhalten der alten Network-Komponenten (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/migration.md)
- `docs/measures.md` – Definition der Betweenness („Choice“) (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/measures.md)
- `docs/generation.md` – Blöcke aus dem Straßennetz (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/generation.md)
- `src/DecodingSpaces.Core/Geometry/Polygons.cs` – Vorzeichen und Gehrungsgrenze des Versatzes (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Geometry/Polygons.cs)
- `src/DecodingSpaces.Core/Generation/BlockExtractor.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Generation/BlockExtractor.cs)
- `src/DecodingSpaces.Core/Clean/NetworkCleaner.cs`, `src/DecodingSpaces.Core/Clean/JunctionMerger.cs` – Teilen an Kreuzungen und T-Stößen, Zusammenlegen von Knoten (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Clean/NetworkCleaner.cs, https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Clean/JunctionMerger.cs)
- `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyUtilityComponents.cs` – Platzhalter der alten Network-Komponenten mit ihren Eingängen (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyUtilityComponents.cs)

## Literatur

- Freeman, L. C. (1977): A set of measures of centrality based on betweenness. *Sociometry* 40(1), 35–41. https://doi.org/10.2307/3033543
- Brandes, U. (2001): A faster algorithm for betweenness centrality. *Journal of Mathematical Sociology* 25(2), 163–177. https://doi.org/10.1080/0022250X.2001.9990249
