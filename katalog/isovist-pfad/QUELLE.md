# Quelle · Isovist entlang eines Weges

| | |
|---|---|
| Original | Grasshopper-Modul „Isovist On Path“ (`IsovistOnPath.gh`), v. 1.0 |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/IsovistOnPath/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/IsovistOnPath/`, dazu das Bild `IsovistStats.png`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Verdrahtung, Schieberegler (Wert, Bereich), Werteliste und Notizen gelesen, Katalog-GIF und „Isovist Statistics“ angesehen; nichts ausgeführt |

## Übernommen

- **Verfahren** der Verdrahtung: Kurve „Walking Path“ → **Evaluate Curve** beim Parameter „Point On Curve“ → Punkt als Vantage Point, Tangente (Vector) als Viewing Direction der Komponente **Isovist** (Hindernisse: Gebäudekanten) → **List Item** wählt die Kenngröße.
- **Parameter und Voreinstellungen**: Point On Curve 0,274 (0–1), Viewing Angle 360 (0–360°), Viewing Range 100 (1–200), Precision/Rays 360 (1–720); Werteliste der 17 Kenngrößen „Isovist Properties“ mit Auswahl „Area“. Der Regler arbeitet wie bei Evaluate Curve mit normiertem Parameter (Anteil der Weglänge).
- **Verlauf entlang des Weges** wie im Katalogbild „Isovist Statistics“ (Fläche und Kompaktheit über „Point on Path“): Diagramm der gewählten Kenngröße unter dem Plan.
- **Darstellung** wie im Katalog-GIF: Weg rot, Isovist orange, Gebäude grau; Schalter für Strahlen und Polygon wie die Vorschau-Schalter (Show Polygon, Show Radials).
- **Isovist und Kenngrößen** wie in der App „Isovist von einem Punkt“ (`Geo.isovist`, `Geo.isovistMasse`).

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie und einem gezeichneten Weg aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Stadt mit fester Saat (`../_gemeinsam/szenen.js`).
- **Eigener Weg statt `Szenen.stadt().pfad`**: Der Weg der gemeinsamen Szene schneidet bei vielen Saaten Gebäude (zusammengelegte Blöcke) und die Kirche (Glättung zum Platzpunkt). `wegDurchStadt` führt deshalb auf den Straßenmitten (kürzester Weg im Straßennetz ohne die Randstraßen) zum Platz, quer über den Platz unterhalb der Kirche und weiter nach Osten; Ecken sind mit 4 m abgerundet. Der Weg beginnt und endet an der ersten bzw. letzten inneren Kreuzung, damit der Isovist am Rand der Szene nicht ins Leere blickt (das gäbe Flächen, die das Diagramm beherrschen, in einer echten Stadt aber nicht vorkommen). Getestet für viele Saaten: kein Wegpunkt in einem Gebäude.
- **Zeitablauf**: Grasshopper hat keinen Zeitablauf; man zieht den Regler. In der App rückt ein Schritt den Standpunkt um „Weg je Schritt“ weiter (Voreinstellung 0,004 der Weglänge); am Ende anhalten (Voreinstellung) oder von vorn. Der Regler „Punkt auf dem Weg“ zeigt die aktuelle Lage und bleibt Startwert für „Zurück“.
- **Diagramm aus 201 Stellen**: Das Katalogbild ist offenbar aus vielen Reglerstellungen aufgezeichnet. Die App rechnet das Profil auf einmal an 201 gleichmäßig verteilten Stellen; dafür nimmt sie `isovistRaster` (gleiche Strahlen und Treffer wie `Geo.isovist`, aber nur die Segmente der Rasterzellen entlang des Strahls) – rund 60 ms für das ganze Profil bei 360 Strahlen.
- **Weg zeichnen**: Die Katalogbeschreibung lädt ein, einen eigenen Weg zu konstruieren (in Rhino). In der App zeichnet man ihn mit Rechtsklick/Umschalt und Ziehen (Punkte mindestens 3 m auseinander, nicht in Gebäuden).

## Literatur

- Benedikt, M. L. (1979): To take hold of space: isovists and isovist fields. *Environment and Planning B* 6(1), 47–65. https://doi.org/10.1068/b060047
- Batty, M. (2001): Exploring isovist fields: space and shape in architectural and urban morphology. *Environment and Planning B* 28(1), 123–150. https://doi.org/10.1068/b2725
- Turner, A., Doxa, M., O'Sullivan, D., Penn, A. (2001): From isovists to visibility graphs. *Environment and Planning B* 28(1), 103–121. https://doi.org/10.1068/b2684
- Amanatides, J., Woo, A. (1987): A fast voxel traversal algorithm for ray tracing. *Eurographics '87*, 3–10. https://doi.org/10.2312/egtp.19871000
