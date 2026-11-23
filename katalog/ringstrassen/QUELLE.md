# Quelle · Ringstraßen

| | |
|---|---|
| Original | Grasshopper-Modul „Ring Roads“ (`RingRoads.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Ondřej Veselý, Martin Dennemark |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/RingRoads/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/RingRoads/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Übernommen

- **Zellen** wie *Divide Domain²* + *Isotrim* (Grid Resolution 50 [0..100]); Fläche je Zelle auf dem Gelände gemessen (*Area*), Mittelpunkt als *CellCenters*.
- **Neigung** auf der geglätteten Fläche (Notiz „Smoothing Terrain to reduce small bumps“): *Surface From Points* mit Interpolate = false ist eine kubische B-Spline-Fläche mit den Zellmitten als Kontrollpunkten; an den Knoten gelten die Gewichte [1, 4, 1]/6 und die Ableitung [−1, 0, 1]/2. Neigung = *Angle*(Unit Z, Normale).
- **Höhenunterschied** |z_Zelle − z_Zentrum| (*Deconstruct*, *Subtraction*, *Absolute*), **Abstand zum Zentrum** (*Distance*, 3D), **Abstand zur Straße** = kleinster *Curve Closest Point*-Abstand über alle Straßen (*Sort List*, *List Item* 0).
- **Score**: *Entwine* der vier Werte, *Remap Numbers* je Wert über seine *Bounds* auf 0…1, *Flip Matrix*, *Weighted Average* mit den Gewichten [WeightTerrain, WeightTerrain, WeightRoad, WeightCenter] (Voreinstellungen 0, 0,6, 0,86).
- **Auswahl**: *Sort List* aufsteigend nach Score, *Mass Addition* (Teilsummen der Zellflächen), *Smaller Than* „Needed Area“ (zwei Regler 386 665 m² und 1 175 109 m² [0..10 000 000] → zwei Ringe), *Cull Pattern*.
- **Umriss**: *Alpha Shape* der gewählten Zellmitten mit Radius = mittlere Zellbreite (*Dimensions* U, *Average*) × „Number Slider“ 2 [0..10]; *Smooth Polyline* mit Strength = „Number Slider“ 1 [0..1], Times 1; *Project* auf das Gelände.
- **Darstellung** wie im Katalogbild: Zellen des inneren Rings gelbgrün, des äußeren karminrot, die Ringstraßen als Linien darüber.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Draufsicht statt Isometrie**: Gelände von oben mit Schummerung und Höhenlinien (20 m); 2 km × 2 km groß, damit beide Flächen der Datei Platz finden.
- **Straßen und Zentrum**: Die Datei erwartet Straßenkurven und einen Zentrumspunkt aus Rhino. Die App erzeugt drei Straßen (eine quer über das Gelände am Zentrum vorbei, zwei vom Rand zum Zentrum) und wählt als Zentrum eine flache, eher tief gelegene Stelle im mittleren Bereich; Klick oder Ziehen versetzt das Zentrum.
- **Ablauf**: Grasshopper rechnet sofort. Hier fügt ein Schritt die nächste Zelle der Rangfolge hinzu (Wachstum sichtbar, gestrichelter Umriss der aktuellen Auswahl); sobald eine benötigte Fläche erreicht ist, erscheint ihre Ringstraße, nach der größeren hält der Lauf an. Klick und Regler rechnen wie in Grasshopper sofort zu Ende; „Wachstum abspielen“ zeigt es erneut.
- **Alpha-Hülle auf einem Raster**: Die Alpha-Shape-Komponente ist kompiliert. Die App bestimmt die Alpha-Hülle (Komplement aller leeren Kreise vom Radius r) auf einem Abtastraster mit zwei Punkten je Zellbreite und zieht den Umriss mit Marching Squares; geglättet wird deshalb mit zwei Durchgängen je „Times“. Der Umriss liegt wie bei der Alpha-Shape etwa auf den äußeren Zellmitten, die eingeschlossene Fläche ist daher etwas kleiner als die benötigte.
- **Gewichte**: Die Gewichte gehen in der Datei über einen zweiten *Entwine*-Baum in *Weighted Average*; die App rechnet das beabsichtigte gewichtete Mittel Σ wᵢ·vᵢ / Σ wᵢ. Sind alle Gewichte 0, nimmt sie das einfache Mittel (statt einer Division durch null).
- **Abstand zur Straße** wird zu den auf das Gelände gelegten Straßenpolylinien gemessen (3D), wie *Curve Closest Point* zu Kurven im Raum.
- **Rasterauflösung** beginnt bei 5 statt 0 (0 ergibt keine Zellen); die Färbung nach Ring (*Gradient*, gestapelt nach oben verschoben) ist durch zwei feste Farben ersetzt.
