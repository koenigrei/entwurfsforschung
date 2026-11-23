# Quelle · Vom Straßennetz zu Grundstücken

| | |
|---|---|
| Original | Grasshopper-Modul „Streets to Plots“ (`StreetsToPlots.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Dennemark |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/StreetsToPlots/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/StreetsToPlots/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Übernommen

- **Ablauf der Schaltung** (Verdrahtung aus der .gh-Datei gelesen): street segments (Kurven) → Network to Segments (ConvertCurves an, ConversionAngle 0.2, Split an) → Stream Gate (Wertliste „Plot Division“) → Zweig 0: Polygons from lines (MinBlockSize 0) → Boundary Surfaces; Zweig 1: Project (XY) → Boundary Surfaces → Surface Split mit den Straßen → Stream Filter → Plots → Polygon Center (Center(V)) → Move (Unit Z × −500) → Mesh | Ray (Unit Z) auf das Gelände → Brep Closest Point (Normale) → Angle(Unit Z, Normale) = CellSlope → Bounds → Remap Numbers (Ziel 0…1) → Smaller Than (WeightSlope) → Cull Pattern → Bake Geometry auf die Ebene „Plots“.
- **Beschreibung im Panel** als Bedienung: „1. Assign Terrain, 2. Assign Streets, 3. Check if plot division works properly. If some street segments are not separating plots, try the alternative method. 4. Set threshold for slope, to define if a plot is too steep and should not be included. 5. When you are satisfied, bake to layer.“ – die Gruppen der App sind danach benannt.
- **Parameter und Voreinstellungen**: Plot Division „DeCodingSpaces (fast)“ (zweite Wahl „GH Split Surface (slow, maybe more accurate)“), WeightSlope 1 [0..1], zwei Nachkommastellen. Smaller Than ist streng: Auch bei WeightSlope 1 fällt der steilste Plot heraus (sein Wert ist genau 1).
- **Neigung** als Winkel zwischen Geländenormale und Senkrechter im Mittelpunkt der Ecken (nicht im Flächenschwerpunkt), wie Polygon Center → Mesh | Ray → Brep Closest Point → Angle.
- **Bake** als Knopf „5. Bake (GeoJSON)“: speichert die behaltenen Plots mit Ebenenname „Plots“, Neigung und Fläche.
- **Darstellung**: Gelände hell schattiert mit dunklem Straßennetz wie im Katalogbild; Färbung wahlweise nach Reihenfolge (Gradient über Series, wie im Original) oder nach Neigung.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Szene**: Gelände mit einem Berg (`Szenen.gelaende`, 1 × 1 km) und darauf ein verzogenes Straßenraster (`Szenen.stadt` ohne Gebäude, 18 × 18 Knoten) mit unregelmäßig rundem Umriss; Straßen, die über den Umriss ragen, bleiben als Stiche wie im Katalogbild. Ein Anteil der Straßen (Regler „Anteil ungenauer Anschlüsse“, 5 %) endet 0,3…1,2 m vor der Kreuzung – so wie ungenau gezeichnete Rhino-Linien, an denen das schnelle Verfahren scheitert. Dieser Regler ist eine Ergänzung der App.
- **Polygons from lines nachgebildet**: Die Komponente ist kompiliert, ihr Quelltext liegt auch in der Toolbox nicht vor (`docs/migration.md`: noch ohne Nachfolger). Eigene Umsetzung: Sackgassen abschneiden, über Halbkanten die kleinsten Zyklen suchen, Außenrand verwerfen; Endpunkte gelten bis 1 cm als gleich (Toleranz wie `NetworkCleaner`).
- **GH Split Surface nachgebildet**: Statt eine Rhino-Fläche mit Kurven zu teilen, werden die offenen Straßenenden um die Toleranz verlängert, alle Schnitte gesucht und die Flächen der Anordnung gebildet. Das ergibt dieselben Plots wie das schnelle Verfahren, schließt aber Lücken bis zur Toleranz – das „maybe more accurate“ der Wertliste. Die Toleranz (1,5 m) ist eine Ergänzung der App (in Rhino die Dokumenttoleranz). Langsam ist die Nachbildung nicht.
- **Network to Segments**: Die Straßen der Szene sind gerade; ConvertCurves und ConversionAngle haben nichts zu tun und fehlen als Regler. Geteilt wird an Kreuzungen und T-Stößen.
- **Neigung**: Statt Mesh | Ray und Brep Closest Point auf einem Rhino-Netz die Neigung des Höhenrasters (bilinear, zentrale Differenzen; `Szenen.neigung`) – derselbe Winkel atan |∇h|. Angezeigt in Grad (Grasshopper: Bogenmaß; für Remap und Schwelle gleich).
- **Ablauf**: Grasshopper rechnet alles auf einmal. Hier ist ein Schritt ein Plot, dessen Neigung bestimmt wird; Remap und Schwelle gelten jeweils für die schon bestimmten Plots, nach dem letzten Schritt für alle wie im Original. Ändert man Verfahren oder Toleranz nach dem Start, wird sofort ganz gerechnet.

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext; kein Code übernommen. Gelesen (23.11.2026) wurde die DeCodingSpaces-Toolbox, GitHub Bauhaus-InfAU/decoding-spaces-toolbox, Lizenz **GPL-3.0**. Aus Quelltext und Doku wurden nur Definitionen, Toleranzen und Randfälle abgelesen und in eigenem Code umgesetzt (diese App steht unter CC BY 4.0). Die alte Komponente „Polygons from lines“ hat in der Toolbox noch keinen Nachfolger. Die neue Blockbildung (`BlockExtractor`: Gebiet minus gepufferter Straßenraum, Mindestfläche und Mindestbreite) ist ein anderes Verfahren und wurde nicht nachgebaut.

Gelesene Dateien:
- `docs/inventory.md` – Ein- und Ausgänge von Polygons from lines und Network to Segments (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/inventory.md)
- `docs/migration.md` – Verhalten der alten Network-Komponenten, fehlender Nachfolger (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/migration.md)
- `docs/generation.md` – Blöcke aus dem Straßennetz (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/generation.md)
- `src/DecodingSpaces.Core/Generation/BlockExtractor.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Generation/BlockExtractor.cs)
- `src/DecodingSpaces.Core/Geometry/Polygons.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Geometry/Polygons.cs)
- `src/DecodingSpaces.Core/Clean/NetworkCleaner.cs` – Teilen an Kreuzungen und T-Stößen, Endpunkt-Toleranz 0,01 (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Clean/NetworkCleaner.cs)
- `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyUtilityComponents.cs` – Platzhalter der alten Network-Komponenten (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyUtilityComponents.cs)
