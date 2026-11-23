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
- **Kenngrößen nach veröffentlichten Definitionen**: Die Komponente ist kompiliert; ihre Formeln liegen nicht offen. Die App rechnet nach Benedikt (1979), Batty (2001) und Turner et al. (2001): Kompaktheit `4πA/U²`, Kreisähnlichkeit `U²/(4πA)`, Konvexitätsdefizit `(A_Hülle − A)/A_Hülle`, Dispersion `σ/μ` der Strahllängen, Verdeckung = Summe der radialen Sprünge zwischen Nachbarstrahlen (Sprung > max(1 m, 10 %)), Drift = Vektor Standpunkt → Schwerpunkt, Streckung = Verhältnis der Hauptachsen der Endpunktverteilung, abstandsgewichtete Fläche = Summe der Strahlsektoren × mittlerer Abstand (in m³). Einzelne Werte können daher von Grasshopper abweichen.
- **Abspielen**: Grasshopper hat keinen Zeitablauf. „Start“ dreht die Blickrichtung um „Drehung je Schritt“ weiter (sichtbar bei Blickwinkel < 360°); Klick setzt den Standpunkt (statt ihn in Rhino zu verschieben), Rechtsklick die Blickrichtung.

## Literatur

- Benedikt, M. L. (1979): To take hold of space: isovists and isovist fields. *Environment and Planning B* 6(1), 47–65. https://doi.org/10.1068/b060047
- Batty, M. (2001): Exploring isovist fields: space and shape in architectural and urban morphology. *Environment and Planning B* 28(1), 123–150. https://doi.org/10.1068/b2725
- Turner, A., Doxa, M., O'Sullivan, D., Penn, A. (2001): From isovists to visibility graphs. *Environment and Planning B* 28(1), 103–121. https://doi.org/10.1068/b2684
