# Quelle · Isovist von einem Punkt

| | |
|---|---|
| Original | Grasshopper-Modul „Isovist Single Point“ (`IsovistSinglePoint.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/IsovistSinglePoint/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/IsovistSinglePoint/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Übernommen

- **Verfahren** der DeCodingSpaces-Komponente „Isovist“: Strahlen gleichmäßig über den Blickwinkel um die Blickrichtung, Ende am ersten Hindernis oder an der Reichweite; Isovist-Polygon aus den Endpunkten (bei Blickwinkel < 360° mit dem Standpunkt als Ecke).
- **Parameter und Voreinstellungen** aus den Schiebereglern der .gh-Datei: Viewing Angle 360 (0–360°), Angle Direction 0 (0–6,28 rad; Richtung wie in der Datei: Unit Y = Norden, mit Rotate gegen den Uhrzeigersinn gedreht), Viewing Range 100 (1–200), Isovist Rays 360 (1–720).
- **Kenngrößen**: die 17 Einträge der Werteliste „Isovist Properties“ in derselben Reihenfolge (Area … Drift Angle), Auswahl „Area“ wie in der Datei.
- **Darstellung** wie im Katalogbild: Gebäude grau, Strahlen und Polygon orange, Kreis der Reichweite; die Schalter für Strahlen und Polygon entsprechen den beiden Vorschau-Schaltern (Toggle) der Datei.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Kenngrößen nach den Definitionen der Toolbox v2**: Die 2020 benutzte Komponente ist nur noch als Binärdatei erhalten; der rekonstruierte Quelltext der DeCodingSpaces-Toolbox legt die Definitionen offen (siehe „Abgleich mit dem Quelltext“). Zwölf der 17 Werte rechnet die App nach diesen Definitionen (mit Strahlen statt exakt); fünf – abstandsgewichtete Fläche, Kreisähnlichkeit, Konvexitätsdefizit, Dispersion, Streckung – hat die Toolbox mangels prüfbarer Definition gestrichen, die App rechnet sie nach eigenen Definitionen in Anlehnung an Benedikt (1979) und Batty (2001): Kreisähnlichkeit `U²/(4πA)`, Konvexitätsdefizit `(A_Hülle − A)/A_Hülle`, Dispersion `σ/μ`, Streckung = Verhältnis der Hauptachsen der Endpunktverteilung, abstandsgewichtete Fläche = Summe der Strahlsektoren × mittlerer Abstand (in m³). Werte der alten Grasshopper-Komponente weichen ab, auch weil diese Fehler hatte.
- **Abspielen**: Grasshopper hat keinen Zeitablauf. „Start“ dreht die Blickrichtung um „Drehung je Schritt“ weiter (sichtbar bei Blickwinkel < 360°); Klick setzt den Standpunkt (statt ihn in Rhino zu verschieben), Rechtsklick die Blickrichtung.

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext; kein Code übernommen. Gelesen (23.11.2026) wurde die DeCodingSpaces-Toolbox, GitHub Bauhaus-InfAU/decoding-spaces-toolbox, Lizenz **GPL-3.0**. Aus dem Quelltext und der Doku wurden nur Definitionen, Formeln, Parameter und Randfälle abgelesen und in eigenem Code umgesetzt (diese App steht unter CC BY 4.0).

Wichtig zur Einordnung: Der Quelltext der Komponenten von 2020, die das Katalogmodul benutzt (Legacy „Isovist“ mit Strahlenzahl *Precision*, Legacy „Analysis Grid“), ist verloren. Die Toolbox ist eine Neufassung von 2026 („v2“), aus den alten Binärdateien rekonstruiert. Sie rechnet den Isovist exakt mit einem Winkel-Sweep statt mit Strahlen und gibt die alten Zahlen absichtlich nicht wieder. In `docs/migration.md` und `docs/review-2026-11.md` sind die Fehler der alten Fassung beschrieben: „StdDev“ war eine Summe absoluter Abweichungen, Varianz und Schiefe wurden nicht durch *n* geteilt, `AreaDistWeight` gab die Fläche aus. Die App behält das Verfahren des Moduls (Strahlen, Regler *Precision*) und rechnet die Kenngrößen nach den Definitionen der Toolbox v2; die Fehler der alten Fassung übernimmt sie nicht.

Gelesene Dateien:
- `src/DecodingSpaces.Core/Visibility/Isovist.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Visibility/Isovist.cs)
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

Auch Grafit (GitHub Bauhaus-InfAU/Grafit, MIT) wurde geprüft: `examples/rhino/Python F13 Isovist 3D.py` ruft nur die kompilierte Bibliothek auf (3D-Isovist, Strahlen je Hindernis) und enthält keine Formeln für die 2D-Kenngrößen.

## Literatur

- Benedikt, M. L. (1979): To take hold of space: isovists and isovist fields. *Environment and Planning B* 6(1), 47–65. https://doi.org/10.1068/b060047
- Batty, M. (2001): Exploring isovist fields: space and shape in architectural and urban morphology. *Environment and Planning B* 28(1), 123–150. https://doi.org/10.1068/b2725
- Turner, A., Doxa, M., O'Sullivan, D., Penn, A. (2001): From isovists to visibility graphs. *Environment and Planning B* 28(1), 103–121. https://doi.org/10.1068/b2684
