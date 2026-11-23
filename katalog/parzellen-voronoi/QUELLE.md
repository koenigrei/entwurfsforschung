# Quelle · Parzellierung mit Voronoi

| | |
|---|---|
| Original | Grasshopper-Modul „Parcellation via Voronoi“ (`ParcellationVoronoi.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Dennemark |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/ParcellationVoronoi/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/ParcellationVoronoi/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext der DeCodingSpaces-Toolbox (Bauhaus-InfAU/decoding-spaces-toolbox, aus den alten Binärdateien rekonstruiert, Lizenz **GPL-3.0**); **kein Code übernommen** – gelesen wurden Ein- und Ausgänge, Verhalten und Randfälle, umgesetzt in eigenem JavaScript:

- `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyUtilityComponents.cs` (Network Smooth: Network, Anchor Snap Points, Snap threshold, Snap to anchor points only) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyUtilityComponents.cs
- `docs/migration.md`, Abschnitt „Network utilities“ (Network Smooth → Merge Junctions und was sich dabei ändert: „Network Smooth merged every vertex closer than the threshold“, winzige Schleifen blieben, Schwelle 0 wirkte nicht) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/migration.md
- `src/DecodingSpaces.Core/Clean/JunctionMerger.cs` (Nachfolger „Merge Junctions“: Gruppen in Ketten innerhalb des Abstands, Gruppe auf den Anker nächst einem Mitglied oder auf ihren Mittelpunkt, „Anchors Only“) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Clean/JunctionMerger.cs
- `docs/inventory.md` (Network Smooth: „Smooths network of lines by merging near by vertices“; Polygons from lines: „Takes line segments as input and identifies closed polygons“, Eingänge Lines, Line values, MinBlockSize) und `docs/research/legacy-generation.md` Abschnitt 5 (Polygonisierung) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/inventory.md

**Jetzt übereinstimmend** (Runde 1 hatte nur innere Ecken zusammengelegt und Randpunkte festgehalten):

- Gruppenbildung über **alle** Ecken des Netzes (wie das alte Network Smooth, das jede Ecke näher als die Schwelle zusammenlegte – nicht nur Kreuzungen wie der Nachfolger), auch in Ketten.
- Eine Gruppe springt auf den Anker, der einem ihrer Mitglieder am nächsten liegt, wenn er innerhalb der Schwelle liegt, sonst bei mehreren Mitgliedern auf ihren Mittelpunkt; einzelne Ecken ohne Anker bleiben (wie im Nachfolger beschrieben).
- „Snap to anchor points only“ (in der Datei false) als Schalter: keine Gruppen, nur einzelnes Fangen an Ankern.
- Folge wie im Original: Randpunkte knapp neben einer Blockecke laufen in die Ecke; sehr kleine Zellen fallen weg; in sehr kleinen Blöcken kann eine Gruppe auch eine Blockecke verschieben (dann deckt die Teilung den Block nicht mehr ganz).

**Bewusst abweichend:**

- **Ausgabe als Flächen**: Network Smooth gibt in der Datei Linien aus (danach folgt kein „Polygons from lines“); die App bildet die Zellen mit den verschobenen Ecken neu als Polygone, damit Flächen und Straßenanschluss angezeigt werden können. Doppelte Punkte und Zellen ohne Fläche entfallen, so bleiben auch keine winzigen Schleifen wie im Original.
- **Gleichstand**: Liegen mehrere Anker gleich nah (z. B. ein Anker, der selbst Mitglied der Gruppe ist), gilt der erste in der Ankerliste – Blockecken (Explode) vor Randpunkten (Curve | Curve), wie die Reihenfolge im Merge der Datei.


## Übernommen

- **Verfahren** nach der Verdrahtung der .gh-Datei: `Divide Distance` (Blockkurve, Distance = Cell Distance) → `Voronoi` (ohne eigenen Rahmen) → `Trim with Region` (Region = Block, Ausgang Inside) → `Shift Paths` → `Network to Segments` zusammen mit der Blockkurve → `Network Smooth` (Anchor Snap Points = Blockecken aus `Explode` und Schnittpunkte `Curve | Curve` der Zellen mit der Blockkurve, `Remove Duplicate Points` 0,001; Snap threshold = `Multiplication` Cell Distance × Snapping; „Snap to anchor points only“ = false); das geglättete Netz ist die Ausgabe. Die Blöcke liefert vorher `Polygons from lines` aus den Straßensegmenten (MinBlockSize 0), hinter dem Schalter „Run“.
- **Parameter**: Cell Distance 59 [10..100] (Regler in der Gruppe „Cell Distance“, geht an Divide Distance und Multiplication A), Snapping 0,3 [0,1..0,5] (Gruppe „Snapping“, Multiplication B), „Snap to anchor points only“ = false. Der Schalter „Run (takes a while)“ der Datei entfällt, die App rechnet schnell genug.
- **Eigenschaft** aus der Notiz „Voronois-based Parcellation – Keeps each parcel connected to the street“: Alle Erzeugerpunkte liegen auf dem Rand, also hat jede ungeglättete Zelle eine Kante am Blockrand (getestet); nach dem Glätten gilt das bei der Voreinstellung für über 99 % der Parzellen (siehe Abgleich).
- **Darstellung** wie im Katalogbild: Parzellengrenzen violett, Blockränder schwarz (im Dunkeln weiß), Straßen grau nur zur Orientierung.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Blöcke**: In der .gh-Datei entstehen die Blöcke mit „Polygons from lines“ aus internalisierten Straßensegmenten; die App nimmt die Blöcke der Beispielszene (Straßenraster, um die halbe Straßenbreite eingerückt).
- **Voronoi je Block**: Grasshopper rechnet die Zellen je Datenzweig (ein Block je Zweig) im Rahmen der Punktwolke und beschneidet sie danach; die App beschneidet die Zellen gleich mit dem Block (`Geo.voronoi(punkte, block)`, Schnitt von Halbebenen) – bei den konvexen und schwach konkaven Blöcken der Beispielszene gleichwertig.
- **Abspielen**: Grasshopper rechnet alles auf einmal. Hier ist ein Schritt eine Phase eines Blocks (Punkte → Zellen → Glätten), Block für Block. Snapping, Glätten und „Nur an Ankern fangen“ wirken ohne Neustart auf die schon geglätteten Blöcke. Klick auf einen Block zeigt dessen Parzellenflächen.
