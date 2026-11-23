# Quelle · Isovistenfeld

| | |
|---|---|
| Original | Grasshopper-Modul „Isovist Field“ (`IsovistField.gh`), v. 1.0 |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/IsovistField/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/IsovistField/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Verdrahtung, Schieberegler (Wert, Bereich), Werteliste, Farbverlauf und Notizen gelesen, Katalog-GIF angesehen; nichts ausgeführt |

## Übernommen

- **Verfahren** der Verdrahtung: Rechteck „Analysis boundary“ → Explode → zusammen mit den Gebäudekanten (Obstacle Lines) in die Komponente **Analysis Grid** (Cell Size, Fill Point) → deren Analysis Points in die Komponente **Isovist** (Hindernisse: Gebäudekanten *und* Rahmenkanten, Viewing Direction = Unit Y) → **List Item** wählt die Kenngröße → **Bounds** / **Deconstruct Domain** liefern kleinsten und größten Wert → **Gradient** färbt die Grid Cells (Custom Preview).
- **Analysis Grid** nach der Definition der Toolbox (docs/visibility.md §3, siehe „Abgleich mit dem Quelltext“): quadratisches Gitter durch den Füllpunkt, Flutung in vier Richtungen, ein Schritt zwischen zwei Zellmitten ist gesperrt, wenn er ein Hindernis berührt; Grenze ist das umschreibende Rechteck der Hindernisse. Gebäudeinneres und abgeschlossene Höfe bleiben so leer.
- **Parameter und Voreinstellungen** aus den Schiebereglern: Cell Size 2 (1–10), Viewing Angle 360 (0–360°), Viewing Range 100 (1–200), Precision/Rays 360 (1–720); Werteliste der 17 Kenngrößen „Isovist Properties“ mit Auswahl „Area“.
- **Farbverlauf** der Gradient-Komponente: dunkelblau (0, 0, 139) – blau (50, 178, 206) – grün (87, 166, 31) – gelb (255, 215, 0) – rot (255, 0, 0) an den Griffen 0 / 0,254 / 0,501 / 0,748 / 1, gespannt zwischen kleinstem und größtem Wert.
- **Isovist und Kenngrößen** wie in der App „Isovist von einem Punkt“ (`Geo.isovist`, `Geo.isovistMasse`).

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene. Der Analyserahmen ist die ganze Szene (im Original ein frei gezeichnetes Rechteck).
- **Analysis Grid**: In Runde 1 nach GIF und Eingängen nachgebildet (Zelle entfällt, wenn eine Kante ihr Quadrat schneidet; Raster am Rahmen ausgerichtet; Startzellen-Suche). Seit dem Abgleich mit dem Quelltext folgt die App der Definition der Toolbox; dabei ist auch das frühere Schrumpfen des Felds bei Zellen über 6 m verschwunden.
- **Strahlen bei 360 belassen**: Die Voreinstellung des Originals (360 Strahlen) bleibt. Damit das Feld trotzdem flüssig entsteht, rechnet `isovistRaster` (in `modell.js`) dieselben Strahlen wie `Geo.isovist`, prüft aber nur die Hindernissegmente der Rasterzellen, die ein Strahl durchläuft, und hört beim ersten Treffer auf – Ergebnis gleich (Test), etwa 40-mal schneller: rund 0,2 ms je Zelle samt Kenngrößen, bei 2 m Zellgröße etwa 1 s für das ganze Feld.
- **Zeitablauf**: Grasshopper rechnet alle Zellen auf einmal. In der App rechnet ein Schritt eine Gitterzeile (von Süden nach Norden, in der Ausgabereihenfolge der Komponente), damit man das Feld entstehen sieht; die Kenngröße umzuschalten färbt ohne Neuberechnung um (alle 17 Werte je Zelle werden gespeichert).
- **Zelle anklicken** zeigt ihren Isovist und ihre Werte (im Original: Isovist-Komponente mit einem einzelnen Punkt); Rechtsklick versetzt den Füllpunkt (im Original ein Punkt in Rhino).
- **Blickrichtung Norden**: Unit Y der .gh-Datei; in Bildschirmkoordinaten (y nach unten) −90°. Sie wirkt nur bei Blickwinkel < 360°; das Original hat dafür keinen Regler, die App auch nicht.

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext; kein Code übernommen. Gelesen (23.11.2026) wurde die DeCodingSpaces-Toolbox, GitHub Bauhaus-InfAU/decoding-spaces-toolbox, Lizenz **GPL-3.0**. Aus dem Quelltext und der Doku wurden nur Definitionen, Formeln, Parameter und Randfälle abgelesen und in eigenem Code umgesetzt (diese App steht unter CC BY 4.0).

Wichtig zur Einordnung: Der Quelltext der Komponenten von 2020, die das Katalogmodul benutzt (Legacy „Isovist“ mit Strahlenzahl *Precision*, Legacy „Analysis Grid“), ist verloren. Die Toolbox ist eine Neufassung von 2026 („v2“), aus den alten Binärdateien rekonstruiert. Sie rechnet den Isovist exakt mit einem Winkel-Sweep statt mit Strahlen und gibt die alten Zahlen absichtlich nicht wieder. In `docs/migration.md` und `docs/review-2026-11.md` sind die Fehler der alten Fassung beschrieben: „StdDev“ war eine Summe absoluter Abweichungen, Varianz und Schiefe wurden nicht durch *n* geteilt, `AreaDistWeight` gab die Fläche aus. Die App behält das Verfahren des Moduls (Strahlen, Regler *Precision*) und rechnet die Kenngrößen nach den Definitionen der Toolbox v2; die Fehler der alten Fassung übernimmt sie nicht.

Gelesene Dateien:
- `src/DecodingSpaces.Core/Visibility/Isovist.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Visibility/Isovist.cs)
- `src/DecodingSpaces.Core/Visibility/AnalysisGrid.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Visibility/AnalysisGrid.cs)
- `src/DecodingSpaces.Core/Visibility/ObstacleField.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Visibility/ObstacleField.cs)
- `src/DecodingSpaces.Core/Visibility/VisibilityGraph.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Visibility/VisibilityGraph.cs)
- `src/DecodingSpaces.Grasshopper/Components/Visibility/VisibilityComponents.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Visibility/VisibilityComponents.cs)
- `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyVisibilityComponents.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyVisibilityComponents.cs)
- `docs/visibility.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/visibility.md)
- `docs/migration.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/migration.md)
- `docs/review-2026-11.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/review-2026-11.md)

Kenngrößen (Isovist.cs, docs/visibility.md §2) – alt → jetzt:

| Kenngröße | Toolbox v2 | App bisher | App jetzt |
|---|---|---|---|
| Area | ½∫r² dθ exakt | Fläche des Strahlpolygons | unverändert (nähert ½∫r² dθ mit der Strahlenzahl an) |
| Area (Dist Weighted) | entfallen; alt: gab die Fläche aus (Fehler) | eigene Definition (Sektorfläche × mittlerer Abstand, m³) | unverändert, als eigene Definition gekennzeichnet |
| Perimeter | Hinderniskanten + Bögen + verdeckende Kanten + zwei Seitenkanten bei Blickwinkel < 360° | Umfang des Strahlpolygons | unverändert – das Polygon enthält genau diese Teile (Bögen als Sehnen) |
| Compactness | 4πA/P² | 4πA/U² | unverändert, stimmt überein |
| Circularity | entfallen (alt: „zwei Varianten der Kompaktheit“) | U²/(4πA) | unverändert, eigene Definition |
| ConvexDeficiency | entfallen | (A_Hülle − A)/A_Hülle | unverändert, eigene Definition |
| Occlusivity | Summe der Sprünge in r(θ), wo etwas endet und dahinter mehr sichtbar ist; Seitenränder zählen nicht; Schwelle 1e-7 m | Summe der Sprünge zwischen Nachbarstrahlen größer als max(1 m, 10 %) | **geändert**: Sprung zwischen Nachbarstrahlen, die verschiedene, nicht zusammenhängende Hindernisse treffen oder von denen einer frei bis zur Reichweite geht (Schwelle 1e-7 m); dazu die Zahl der Sprünge (`occlusions`, wie „Occlusions“ der Toolbox) |
| Min / Max Radial | kleinstes / größtes r(θ), exakt | kürzester / längster Strahl | unverändert (Strahlnäherung) |
| Mean Radial | (1/Θ)∫r dθ | Mittel der Strahllängen | **angepasst**: Mittel über die Richtungen, bei Blickwinkel < 360° die beiden Randstrahlen halb gewichtet (Trapezregel) |
| Variance | (1/Θ)∫r² dθ − μ² | Mittel der Quadrate − μ² | wie Mean Radial gewichtet; stimmt überein |
| Standard Deviation | √σ² | √σ² | unverändert, stimmt überein |
| Skewness | (1/Θ)∫(r − μ)³ dθ / σ³, 0 bei σ = 0 | dritter Moment / σ³, 0 bei σ ≈ 0 | **angepasst**: konstant, wenn σ² ≤ 1e-12 · (1/Θ)∫r² dθ – dann Varianz, Abweichung und Schiefe 0, wie in der Toolbox |
| Dispersion | entfallen | σ/μ | unverändert, eigene Definition |
| Elongation | entfallen | Verhältnis der Hauptachsen der Endpunkte | unverändert, eigene Definition |
| Drift Magnitude | Abstand Standpunkt → Schwerpunkt | ebenso | unverändert |
| Drift Angle | Grad ab +x, gegen den Uhrzeigersinn (Rhino, y nach oben), 0…360, 0 bei Drift < 1e-9 | Winkel in den Koordinaten der Szene (y nach unten), also im Uhrzeigersinn | **korrigiert**: wie in Rhino gegen den Uhrzeigersinn (Norden = 90°), 0 ohne Drift |

Strahlen und Richtung: Bei Blickwinkel < 360° reicht das Blickfeld wie im Sweep der Toolbox von *Richtung − Winkel/2* bis *Richtung + Winkel/2*; die App legt die Strahlen gleichmäßig über dieses Feld, beide Ränder eingeschlossen (wie die alte Komponente die Strahlen verteilte, ist nicht mehr nachzulesen). Die Blickrichtung ist Unit Y (Norden) wie in der .gh-Datei und wie die Voreinstellung „+Y“ der Toolbox.

Bewusst noch abweichend: die App rechnet weiter mit Strahlen statt exakt, weil das Modul die Strahlenzahl als Regler hat und die Strahlen zeigt; einen Standpunkt *auf* einer Wand (Toolbox: „OnObstacle“, die Wand verdeckt dann nichts) lässt die App nicht zu (Standpunkte in Gebäuden sind gesperrt); der Blickwinkel 0° ist wie im Regler der .gh-Datei möglich, die Toolbox verlangt mehr als 0°.

Analysis Grid (AnalysisGrid.cs, ObstacleField.cs, docs/visibility.md §3) – alt → jetzt:

- **Gitter**: bisher ein Raster, das am Analyserahmen ausgerichtet war; jetzt ein Gitter durch den Füllpunkt (der Füllpunkt ist eine Zellmitte), wie in der Toolbox.
- **Sperre**: bisher entfiel jede Zelle, deren Quadrat eine Kante schneidet; jetzt ist ein Schritt zwischen zwei Nachbarmitten gesperrt, wenn die Strecke ein Hindernis berührt (Schnitt oder Abstand ≤ 1e-6 m). Zellmitten dürfen also näher an Wänden liegen, die Zellquadrate dürfen in Gebäude ragen.
- **Grenze**: bisher der Rahmen; jetzt das umschreibende Rechteck der Hindernisse (hier gleich dem Analyserahmen, der wie in der .gh-Datei zu den Hindernissen gehört).
- **Reihenfolge**: Die Zellen kommen jetzt zeilenweise von unten (Süden) nach oben, wie die Komponente sie ausgibt.
- **Startzellen-Suche entfällt**: Den Notbehelf (nächste freie Zelle, wenn die Zelle des Füllpunkts gesperrt war) gibt es nicht mehr, weil der Füllpunkt selbst Zellmitte ist.
- **Folge für grobe Zellen**: Auch 8-m-Zellen kommen jetzt durch die 10 m breiten Straßen; das bisherige Schrumpfen ab 6 m war ein Artefakt der eigenen Regel.
- **Nicht übernommen**: die Obergrenze von 60.000 Zellen (bei 1 m Zellgröße hat die Szene rund 28.000), die Voreinstellung „längere Seite / 30“ (die .gh-Datei setzt die Zellgröße mit dem Regler) und das sechseckige Gitter der Toolbox v2.

`VisibilityGraph.cs` (Sichtbarkeitsgraph) wurde mitgelesen, betrifft dieses Modul aber nicht.

Auch Grafit (GitHub Bauhaus-InfAU/Grafit, MIT) wurde geprüft: `examples/rhino/Python F13 Isovist 3D.py` ruft nur die kompilierte Bibliothek auf (3D-Isovist, Strahlen je Hindernis) und enthält keine Formeln für die 2D-Kenngrößen.

## Literatur

- Benedikt, M. L. (1979): To take hold of space: isovists and isovist fields. *Environment and Planning B* 6(1), 47–65. https://doi.org/10.1068/b060047
- Batty, M. (2001): Exploring isovist fields: space and shape in architectural and urban morphology. *Environment and Planning B* 28(1), 123–150. https://doi.org/10.1068/b2725
- Turner, A., Doxa, M., O'Sullivan, D., Penn, A. (2001): From isovists to visibility graphs. *Environment and Planning B* 28(1), 103–121. https://doi.org/10.1068/b2684
- Amanatides, J., Woo, A. (1987): A fast voxel traversal algorithm for ray tracing. *Eurographics '87*, 3–10. https://doi.org/10.2312/egtp.19871000
