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

## Übernommen

- **Verfahren** nach der Verdrahtung der .gh-Datei: `Divide Distance` (Blockkurve, Distance = Cell Distance) → `Voronoi` (ohne eigenen Rahmen) → `Trim with Region` (Region = Block, Ausgang Inside) → `Network to Segments` zusammen mit der Blockkurve → `Network Smooth` (Anchor Snap Points = Blockecken aus `Explode` und Schnittpunkte `Curve | Curve` der Zellen mit der Blockkurve, `Remove Duplicate Points` 0,001; Snap threshold = `Multiplication` Cell Distance × Snapping; „Snap to anchor points only“ = false) → `Polygons from lines`.
- **Parameter**: Cell Distance 59 [10..100] (Regler in der Gruppe „Cell Distance“, geht an Divide Distance und Multiplication A), Snapping 0,3 [0,1..0,5] (Gruppe „Snapping“, Multiplication B). Der Schalter „Run (takes a while)“ der Datei entfällt, die App rechnet schnell genug.
- **Eigenschaft** aus der Notiz „Voronois-based Parcellation – Keeps each parcel connected to the street“: Alle Erzeugerpunkte liegen auf dem Rand, also hat jede Zelle eine Kante am Blockrand; die Tests prüfen das.
- **Darstellung** wie im Katalogbild: Parzellengrenzen violett, Blockränder schwarz (im Dunkeln weiß), Straßen grau nur zur Orientierung.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Network Smooth nachgebildet**: Die Komponente ist kompiliert. Die App deutet ihre Eingänge so: Innere Voronoi-Ecken (nicht auf dem Blockrand), die näher als die Schwelle beieinanderliegen, werden zu ihrem Mittelpunkt zusammengezogen (verkettet: A nahe B, B nahe C → eine Ecke); liegt eine Ecke einer solchen Gruppe näher als die Schwelle an einem Anker, springt die ganze Gruppe auf den nächstgelegenen Anker. Randecken bleiben fest. Die Zellen werden mit den neuen Ecken neu gebildet, doppelte Punkte und gerade Zwischenpunkte entfallen. Dabei bleibt die Teilung lückenlos (Summe der Parzellenflächen = Blockfläche, getestet).
- **Voronoi je Block**: Grasshopper rechnet die Zellen je Datenzweig (ein Block je Zweig) im Rahmen der Punktwolke und beschneidet sie danach; die App beschneidet die Zellen gleich mit dem Block (`Geo.voronoi(punkte, block)`, Schnitt von Halbebenen) – bei den konvexen und schwach konkaven Blöcken der Beispielszene gleichwertig.
- **Abspielen**: Grasshopper rechnet alles auf einmal. Hier ist ein Schritt eine Phase eines Blocks (Punkte → Zellen → Glätten), Block für Block. Snapping und Glätten wirken ohne Neustart auf die schon geglätteten Blöcke. Klick auf einen Block zeigt dessen Parzellenflächen.
