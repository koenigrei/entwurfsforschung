# Quelle · Isovist 3D

| | |
|---|---|
| Original | Grasshopper-Modul „Isovist 3D“ (`Isovist3D.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/Isovist3D/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/Isovist3D/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Verdrahtung, Schieberegler (Wert, Bereich), Farbverlauf, Colour Swatches und Notizen gelesen, Katalog-GIF angesehen; nichts ausgeführt (die Komponente Isovist3D ist kompiliert und brauchte eine NVIDIA-Grafikkarte) |

## Übernommen

- **Komponente Isovist3D** (Eingänge laut Datei): Vantage Point(s), Obstacle Surfaces (die Gebäude), Ground Surfaces (leer), Viewing Direction, Viewing Range, Horizontal/Vertical Viewing Angle, Horizontal/Vertical Precision, Vertical Angle Offset, Calculate Isovist Geometry, Ground at zero for CPU. Ausgänge: Rays Geometry, Surfaces to Rays, Rays Length, Rays to Vantage points (Strahlen nach Kategorie), Volume, Mesh, Object Visibility („hit numbers for each mesh“).
- **Parameter und Voreinstellungen**: Viewing Range 100 (0–360), Precision 90 – derselbe Regler speist Horizontal *und* Vertical Precision, also 90 × 90 = 8100 Strahlen –, Horizontal Viewing Angle 120 (0–360), Vertical Viwing Angle 60 (0–180), Vertical Angle Offset 0 (−100–100), Calculate Isovist Geometry aus, Ground at zero for CPU an.
- **Blickrichtung** wie in der Datei: Unit X, gedreht (Rotate) um Unit Z um den Regler 58° (0–360, Radians) – 0 = Osten, gegen den Uhrzeigersinn.
- **Kategorien** wie im Panel „Filter rays by type of obstacle colision (what do you see in given direction)“: 0 = no obstacle (sky), 1 = obstacle, 2 = floor; der Regler 0–2 (Construct Path → Tree Branch) zeigt eine Kategorie – in der App die Auswahl „Strahlen zeigen“.
- **Gruppe „ground to obstacle to sky visibility“**: List Length je Zweig ÷ Mass Addition = Anteil je Kategorie.
- **Gruppe „ray length statistics“**: Sort List → kleinster Wert, Reverse List → größter Wert, Average, Mass Addition (Summe), Expression `(x-y)²` mit dem Mittel, Mass Addition ÷ Ray count, Square Root = Standardabweichung √(Σ(x − Mittel)² ÷ n).
- **Gruppe „mapping results on building breps (building visibility)“**: Object Visibility → Bounds → Gradient (dunkelblau (0, 0, 139) – blau (50, 178, 206) – grün (87, 166, 31) – gelb (255, 215, 0) – rot (255, 0, 0) an 0 / 0,034 / 0,098 / 0,198 / 0,561); Cull Pattern mit Equality: Gebäude mit Treffer = 0 im Swatch grau (173, 173, 173), Treffer ≠ 0 im Verlauf oder im gelben Swatch (255, 204, 0) – in der App die Auswahl „Färbung“.
- **Darstellung** wie im GIF: Stadt als Volumenmodell, das Strahlenbündel vom Standpunkt, gesehene Gebäude farbig, die übrigen grau.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Gebäudehöhen**: Die Datei hat Gebäude-Meshes aus Rhino; die App stellt Prismen über die Grundrisse der Beispielstadt, 3–7 Geschosse à 3,2 m (aus der Saat), die Kirche als ein Objekt aus Schiff (18 m) und Turm (42 m).
- **Komponente nachgebildet**: Isovist3D ist kompiliert (GPU, OptiX) und ihr Quelltext verloren. Nachgebildet nach Ein- und Ausgängen, Beschreibungen und Notizen: je Strahl der erste Schnittpunkt mit den Prismen (Wand oder Dach), mit der Ebene z = 0 (Ground at zero) oder die Reichweite. Annahmen: Die Strahlen stehen in den Mitten eines gleichmäßigen Winkelrasters – Precision Strahlen über den horizontalen und ebenso viele über den vertikalen Blickwinkel; Neigungen jenseits von ±90° (großer Versatz) werden auf ±90° begrenzt; ein Himmelsstrahl hat die Länge der Reichweite.
- **Augenhöhe ergänzt** (Voreinstellung 1,6 m, 0–60 m): In der Datei liegt der Standpunkt bei z = 0; dann treffen alle nach unten geneigten Strahlen sofort den Boden (Länge 0). Mit Augenhöhe 0 rechnet die App wie die Datei. Höhere Werte erlauben den Blick vom Turm.
- **Precision 1–400 statt 0–1000**: 1000 ergäbe eine Million Strahlen je Bild; 0 Strahlen ergibt nichts. Gezeichnet wird höchstens ein Raster von etwa 50 × 50 Strahlen (jede k-te Spalte und Zeile), gerechnet wird mit allen.
- **Ground Surfaces** bleibt wie in der Datei leer; „Boden bei z = 0“ aus heißt: kein Boden, nach unten geneigte Strahlen laufen bis zur Reichweite (Kategorie 0).
- **Calculate Isovist Geometry** zeigt statt des Isovist-Meshes die Endpunkte aller Strahlen und das Volumen (genähert aus den Strahlen: Σ Länge³ ÷ 3 · Raumwinkel der Zelle).
- **Statistik**: Die Datei greift mit List Item am Index „List Length“ (Wrap) noch einmal den kleinsten Wert ab – das sieht nach einem gemeinten Median aus; die App zeigt den Median.
- **Zusätzlich**: Himmelsanteil nach Raumwinkel (das Winkelraster drängt Strahlen am Zenit zusammen, die Zählung der Datei überschätzt dort) und wahlweise Treffer je 100 m² Hüllfläche statt reiner Treffer.
- **Zeitablauf**: Grasshopper hat keinen; im GIF wird der Standpunkt verschoben und die Richtung gedreht. Ein Schritt dreht die Blickrichtung um 2° oder lässt den Standpunkt den Rundweg um den Platz entlanggehen (Blick in Gehrichtung). Der Regler Blickrichtung setzt die Richtung; die aktuelle steht in den Kennzahlen.
- **Darstellung**: eigene Parallelprojektion (drehbar und neigbar per Ziehen), Gebäude von hinten nach vorn gezeichnet, Strahlen nach Kategorie gefärbt darüber (nicht tiefenrichtig); Standpunkt per Klick in der Draufsicht unten rechts. In der dunklen Darstellung ist das Grau der nicht gesehenen Gebäude etwas dunkler und das Dunkelblau des Verlaufs heller.

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext; kein Code übernommen. Gelesen (23.11.2026) wurde die DeCodingSpaces-Toolbox, GitHub Bauhaus-InfAU/decoding-spaces-toolbox, Lizenz **GPL-3.0**. Für Isovist3D enthält sie keinen Rechenkern: Die Komponente lief nur auf der GPU (OptiX) und ist in der Neufassung von 2026 entfallen; erhalten ist nur ein Platzhalter mit den Typen der Ein- und Ausgänge.

- `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyVisibilityComponents.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyVisibilityComponents.cs): `LegacyIsovist3D` – „Removed with the OptiX GPU code … A 3D isovist on Rhino meshes is planned.“ Eingangstypen Punkt, Mesh, Mesh, Vektor, drei Zahlen, zwei ganze Zahlen (die beiden Precision-Eingänge), Zahl, zwei Schalter – passend zu den Namen in der .gh-Datei.
- `docs/visibility.md`, `docs/inventory.md`, `docs/migration.md`, `docs/decompiling.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/visibility.md, …/docs/inventory.md, …/docs/migration.md, …/docs/decompiling.md): Isovist3D nur im Build von 2021, GPU-Kernel `CalculateIsovist3D`, „not rebuilt yet (it needed OptiX)“.
- `src/DecodingSpaces.Core/Visibility/Isovist.cs`, `src/DecodingSpaces.Grasshopper/Components/Visibility/VisibilityComponents.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Visibility/Isovist.cs, …/Components/Visibility/VisibilityComponents.cs): nur der 2D-Isovist; nichts daraus für den 3D-Fall übernommen.
- **Grafit** (GitHub Bauhaus-InfAU/Grafit, **MIT**), `examples/rhino/Python F13 Isovist 3D.py` (https://github.com/Bauhaus-InfAU/Grafit/blob/main/examples/rhino/Python%20F13%20Isovist%203D.py): ruft `CIsovist(VP, OS, GS, VD, VR, HVA, VVA, HPr, VPr, VAO)` auf und liest `SumRaysPerObstacle`, `SumRaysPerGround`, `NumberOfRaysPerPoint`, `MeshIdsPerRay` – bestätigt Reihenfolge und Bedeutung der Eingänge und dass die Sichtbarkeit je Objekt eine Strahlenzahl ist. Die Bibliothek selbst liegt nur als .dll vor.

## Literatur

- Benedikt, M. L. (1979): To take hold of space: isovists and isovist fields. *Environment and Planning B* 6(1), 47–65. https://doi.org/10.1068/b060047
- Fisher-Gewirtzman, D., Wagner, I. A. (2003): Spatial openness as a practical metric for evaluating built-up environments. *Environment and Planning B* 30(1), 37–49. https://doi.org/10.1068/b12861
- Morello, E., Ratti, C. (2009): A digital image of the city: 3D isovists in Lynch's urban analysis. *Environment and Planning B* 36(5), 837–853. https://doi.org/10.1068/b34144t
