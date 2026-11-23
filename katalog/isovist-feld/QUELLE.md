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
- **Analysis Grid** nach Katalog-GIF und Eingängen: Raster über dem Rahmen; Zellen, die eine Hinderniskante schneiden, entfallen (im GIF enden die Zellen vor den Gebäuden); vom Füllpunkt aus werden die zusammenhängenden Zellen gesammelt (Flutfüllung über die vier Nachbarn), sodass Gebäudeinneres und abgeschlossene Höfe leer bleiben.
- **Parameter und Voreinstellungen** aus den Schiebereglern: Cell Size 2 (1–10), Viewing Angle 360 (0–360°), Viewing Range 100 (1–200), Precision/Rays 360 (1–720); Werteliste der 17 Kenngrößen „Isovist Properties“ mit Auswahl „Area“.
- **Farbverlauf** der Gradient-Komponente: dunkelblau (0, 0, 139) – blau (50, 178, 206) – grün (87, 166, 31) – gelb (255, 215, 0) – rot (255, 0, 0) an den Griffen 0 / 0,254 / 0,501 / 0,748 / 1, gespannt zwischen kleinstem und größtem Wert.
- **Isovist und Kenngrößen** wie in der App „Isovist von einem Punkt“ (`Geo.isovist`, `Geo.isovistMasse`).

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene. Der Analyserahmen ist die ganze Szene (im Original ein frei gezeichnetes Rechteck).
- **Analysis Grid nachgebildet**: Die DeCodingSpaces-Komponente ist kompiliert. Regeln (Kante schneidet Zelle → Zelle entfällt; Rahmenkanten, die eine Zelle nur berühren, sperren nicht; Flutfüllung über vier Nachbarn) folgen dem GIF und den Eingängen. Liegt der Füllpunkt bei grobem Raster auf einer gesperrten Zelle, beginnt die Füllung bei der nächsten freien Zelle (bis vier Ringe), damit das Feld beim Verstellen der Zellgröße nicht plötzlich leer ist. Ab etwa 6 m Zellgröße passen die Zellen nicht mehr durch die 10 m breiten Straßen der Beispielstadt – das folgt aus der Regel und ist so gewollt.
- **Strahlen bei 360 belassen**: Die Voreinstellung des Originals (360 Strahlen) bleibt. Damit das Feld trotzdem flüssig entsteht, rechnet `isovistRaster` (in `modell.js`) dieselben Strahlen wie `Geo.isovist`, prüft aber nur die Hindernissegmente der Rasterzellen, die ein Strahl durchläuft, und hört beim ersten Treffer auf – Ergebnis gleich (Test), etwa 40-mal schneller: rund 0,2 ms je Zelle samt Kenngrößen, bei 2 m Zellgröße etwa 1 s für das ganze Feld.
- **Zeitablauf**: Grasshopper rechnet alle Zellen auf einmal. In der App rechnet ein Schritt eine Rasterzeile (von oben nach unten), damit man das Feld entstehen sieht; die Kenngröße umzuschalten färbt ohne Neuberechnung um (alle 17 Werte je Zelle werden gespeichert).
- **Zelle anklicken** zeigt ihren Isovist und ihre Werte (im Original: Isovist-Komponente mit einem einzelnen Punkt); Rechtsklick versetzt den Füllpunkt (im Original ein Punkt in Rhino).
- **Blickrichtung Norden**: Unit Y der .gh-Datei; in Bildschirmkoordinaten (y nach unten) −90°. Sie wirkt nur bei Blickwinkel < 360°; das Original hat dafür keinen Regler, die App auch nicht.

## Literatur

- Benedikt, M. L. (1979): To take hold of space: isovists and isovist fields. *Environment and Planning B* 6(1), 47–65. https://doi.org/10.1068/b060047
- Batty, M. (2001): Exploring isovist fields: space and shape in architectural and urban morphology. *Environment and Planning B* 28(1), 123–150. https://doi.org/10.1068/b2725
- Turner, A., Doxa, M., O'Sullivan, D., Penn, A. (2001): From isovists to visibility graphs. *Environment and Planning B* 28(1), 103–121. https://doi.org/10.1068/b2684
- Amanatides, J., Woo, A. (1987): A fast voxel traversal algorithm for ray tracing. *Eurographics '87*, 3–10. https://doi.org/10.2312/egtp.19871000
