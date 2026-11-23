# Quelle · Vom Straßennetz zum Gebäude

| | |
|---|---|
| Original | Grasshopper-Modul „Building Generation“ (`BuildingGeneration.gh`, „v. 1.0 – Author: DeCodingSpaces“) |
| Option | Grasshopper-Modul „Placement on Parcel“ (`BuildingPlacementOnParcels.gh`, „v. 1.0 – Author: DeCodingSpaces – Martin Dennemark“) als „Gebäude aus Vorlagen“ |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces; Placement on Parcel: DeCodingSpaces – Martin Dennemark |
| Katalogeinträge | https://infar-buw.github.io/parametric-planning-catalogue/docs/BuildingGeneration/ · https://infar-buw.github.io/parametric-planning-catalogue/docs/BuildingPlacementOnParcels/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/BuildingGeneration/`, `docs/BuildingPlacementOnParcels/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Verdrahtung, Schieberegler (Wert, Bereich), feste Eingänge, Notizen und Vorschaubild gelesen; nichts ausgeführt |

## Abgleich mit dem Quelltext

Die DeCodingSpaces-Komponenten der .gh-Datei sind kompiliert. Abgleich mit dem Quelltext der DeCodingSpaces-Toolbox (Bauhaus-InfAU/decoding-spaces-toolbox, aus den alten Binärdateien rekonstruiert, Lizenz **GPL-3.0**); **Abgleich mit dem Quelltext; kein Code übernommen** – gelesen wurden Ablauf, Bedingungen, Voreinstellungen und Randfälle, umgesetzt in eigenem JavaScript:

- `docs/research/legacy-generation.md`, Abschnitte 1 (Street Network Generator), 2 (Customized Parameters), 5 (Blocks), 6 (Parcels), 7 (Buildable Area), 8 (Building Generation) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/research/legacy-generation.md
- `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacySynthesisComponents.cs` (Ein- und Ausgänge, Typen der Legacy-Komponenten) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacySynthesisComponents.cs
- zum Vergleich die Neufassung `docs/generation.md` und `src/DecodingSpaces.Core/Generation/` (`Buildings/*Typology.cs`, `Buildings/BuildableArea.cs`, `Buildings/MassingSolver.cs`) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/generation.md, https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/tree/main/src/DecodingSpaces.Core/Generation – die App bildet aber die Komponenten von 2020 nach, nicht die Neufassung.

Eigener Code aus anderen Apps dieses Katalogs (CC BY 4.0) mit Verweis im Quelltext: Instruktionsbaum und Wachstum aus `katalog/netzoptimierung/`, Flächen aus Linien aus `katalog/strassen-zu-parzellen/`, Versatz je Kante aus `katalog/parzellen-versatz/`, Drehung ins kleinste Rechteck und Straßenkanten aus `katalog/parzellen-slicing-tree/`.

## Übernommen

**Kette und Werte der .gh-Datei** (Regler: Wert [Bereich]; feste Eingänge):

| Stufe | Komponente | Werte |
|---|---|---|
| 1 | Street Network Generator | Boundary (Baufeld), IniStreets (fünf Segmente), **TreeDepth 9 [0..20]**; fest: MinLength 30, MaxLength 100, MinDist 20, RandomAngle 10, MaxArms 4, ProbabilityToAddArms 1, SeedForRandom −1 |
| 2 | Customized Parameters → Blocks | **minBlockArea 1920 [0..10000]**, **blockOffset = Negative(10 [0..10]) = −10**; übrige 16 Werte fest (scalingFactor 1, maxLength 100, minLength 20, angleRange 90, nChildren 3, treeDepth 7, minAngleD 10, minDistance 1, maxRank 4, rank 0, maxArea 20, parcelDepth 5, parcelWidth 5, splitRate 0.5, density 10, seed −1) – Blocks liest laut Quelltext nur minBlockArea und blockOffset |
| 3 | Parcels | **PlotWidthThreshold 40 [0..100]**; fest: StreetOffset 0 (Notiz: „Street Offset … the resulting tree structure does not work with the building generation. Therefore, better keep it at 0.“), ConnectionDistance 1 (wirkungslos), Precision 100 |
| 4 | Buildable Area | **RoadSetback 8, SideSetback 8, BackSetback 8 [0..10]**; fest: Tolerance 0.785 (π/4) |
| 5 | Building Generation | **BuildingDepth 14 [0..100]**, **BuildingType 2 [0..10]**, **Orientation 1 [0..1]**, **FAR 0.5 [0..1]**; fest: BuildingLength 20, FloorHeight 4, Location leer |
| 5 | Area → Larger Than → Cull Pattern → Extrude | **MinBuildingFootprintArea 50 [0..100]**; Extrude mit Unit Z × BuildingHeight |

**Verfahren** (nach dem Quelltext, siehe oben):

- *Street Network Generator*: Instruktionsbaum je Stützpunkt der Startstraßen (drei Arm-Plätze, TreeDepth Ebenen, breitenweise; Gene Länge `Next(MaxLength) + MinLength`, Winkel `Next(RandomAngle) − RandomAngle/2`, Grad `Next(MaxArms − 1) + 2`); Wachstum geradeaus bzw. in die Winkelhalbierende der größten freien Lücke (< 80° kein Arm, ≥ 260° Versatz 45°/90°/…), Fangen an Knoten und Straßen innerhalb MinDist, Schnitt an der ersten gekreuzten Straße, Ende am Rand (OuterBoundary fehlt → Rand + 1 m). ProbabilityToAddArms ist im Original wirkungslos und fehlt daher in der App.
- *Blocks*: geschlossene Flächen des Liniennetzes (Polygonize mit entfernten Sackgassen), Versatz `blockOffset` (< 0 verkleinert), Fläche des versetzten Blocks < minBlockArea → verworfen, Sortierung nach Fläche absteigend.
- *Parcels*: Block so gedreht, dass die lange Seite seines kleinsten umschließenden Rechtecks waagrecht liegt; Straßenkanten = quasi-kollinear (< 0,01 rad, < 1 m) mit einer Blockkante; ohne Straßenkante → Blatt; „Rücken an Rücken“ bei durchgehenden Streifen (zwei längste Innenkanten parallel und ≥ PWT auseinander, gegenüberliegende Straße, längste Innenkante > 2·PWT); längste Kante mit `0,5·|e| ≥ PlotWidthThreshold` entscheidet, Schnitt senkrecht zu ihr auf der Mittellinie des Hüllrechtecks. Front je Parzelle damit in [PWT, 2·PWT) bei Rechtecken. Kein Zufall (im Original nie benutzt).
- *Buildable Area*: Frontkante = Anfang, Ende und Mitte ≤ 0,5 m vom Block; übrige Kanten nach dem Winkel ihrer Normalen zur Frontnormalen: ≈ π gegenüber, ≈ π/2 bzw. 3π/2 seitlich (± Tolerance); „hinten“, wenn es keine Front gibt oder die Kante einer Front gegenüberliegt und zu keiner quer steht, sonst „seitlich“. Jede Kante wird um ihren Abstand nach innen versetzt, Nachbarn neu geschnitten.
- *Building Generation*: Frontkanten des Baufensters über parallele Tangenten zur Parzellenfront; `seg` = längste davon, Ort = ihre Mitte. Typ 0 (und alle anderen Werte): Rechteck BuildingLength × BuildingDepth um den Ort, an `seg` oder – weil Orientation verbunden ist – absolut um Orientation (rad, mod π) gedreht, mit der Fassade auf die Frontlinie geschoben, dann auf das Baufenster beschnitten. Typ 1: Streifen der Tiefe BuildingDepth längs `seg` durch das ganze Baufenster (Länge wirkungslos). Typ 2: Frontkanten um BuildingDepth versetzt = Hof; Gebäude = Baufenster − Hof; ohne Hof das ganze Baufenster. Geschosse `⌈FAR · A_Parzelle / A_Grundfläche⌉`, FAR = 0 → 1 Geschoss, ohne Obergrenze (das Original überschießt mit `ceil` und erlaubt Türme); GFA = Geschosse · Grundfläche, Höhe = Geschosse · FloorHeight. Parzellen ohne Frontkante bleiben leer.
- *Placement on Parcel* (Skript der .gh-Datei aus Standardkomponenten, nachgebaut): Vorlagen-Blöcke = rechteckige Grundfläche mit Baukörpern; je Baukörper Mittelpunkt des Hüllquaders (Evaluate Box 0.5/0.5/0.5) → nächste Kante der Grundfläche (Curve Closest Point, kleinster Abstand) → Längsposition (Length Parameter). Kante i der Parzelle nimmt die Baukörper der Vorlagenkante `i mod 4` („if our parcel has 5 edges and our block 4, we just continue counting: 0, 1, 2, 3, 0“); Orient vom Rahmen der Vorlagenkante (Horizontal Frame, Parameter 0) in den Rahmen der Parzellenkante; Längsposition ≥ Kantenlänge (Smaller Than) und Schnitt mit dem Parzellenrand (Collision One|Many) → entfernt. Vorlage je Parzelle `Round(Random(0 … Anzahl − 1))` mit fester Saat (Seed 2).
- **Darstellung** wie im Katalogbild: Straßen und Blöcke violett, Baufenster magenta, Baukörper türkis, Umgebung grau.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Baufeld, Startstraßen und Umgebung sind in der .gh-Datei Rhino-Geometrie (nicht mitgeliefert). Die App zeichnet ein Baufeld nach dem Katalogbild (≈ 950 × 650 m) mit fünf Startstraßen-Segmenten (eine Achse mit vier Segmenten quer durch das Baufeld und eine Zufahrt von Norden). Ecken und Stützpunkte lassen sich ziehen; die Kette rechnet sofort neu.
- **Saat statt Zeit**: SeedForRandom −1 heißt im Original „jedes Mal anders“; die App nimmt die Saat (gleiche Saat → gleiches Netz). Die Saat 2 der Placement-Komponente Random wird mit der Saat verknüpft.
- **Abspielen**: Grasshopper rechnet alles auf einmal. Hier ist ein Schritt ein Element der laufenden Stufe (ein Straßenarm in Setz-Reihenfolge, ein Block, die Parzellen/Baufenster/Gebäude eines Blocks); „Stufe ▸“ springt ans Ende der Stufe. Parameteränderungen rechnen die Kette neu, ohne das Straßennetz neu wachsen zu lassen, solange dessen Werte gleich bleiben.
- **Feste Werte als Regler**: MinLength, MaxLength, MinDist, RandomAngle, MaxArms, Tolerance (in Grad), BuildingLength und FloorHeight sind in der Datei feste Werte, in der App Regler mit den Voreinstellungen der Datei. BuildingType ist eine Auswahl 0/1/2 (der Regler der Datei reicht bis 10; Werte über 2 verhalten sich wie 0). Orientation-Schalter: aus = ausgerichtet an der Frontkante (wie bei unverbundenem Eingang). PlotWidthThreshold beginnt bei 10 (bei 0 würde endlos geteilt).
- **Fehler des Originals behoben** (legacy-generation.md nennt sie): Bei zwei oder mehr Frontkanten macht eine Ganzzahldivision im Original jede Nicht-Front-Kante zur Seite; die App wendet die gemeinte Regel an. Ist ein freistehendes Haus nach dem Beschneiden leer, gibt das Original das unbeschnittene Rechteck zurück (Gebäude außerhalb des Baufensters); die App setzt dann kein Gebäude. Ein fehlerhafter Block bricht im Original die Schleife ab; die App überspringt nur diesen. Polygone werden an allen Schnitten geteilt (nicht nur an den ersten beiden), die Drehung erfolgt um den Schwerpunkt, die Rekursion ist auf 30 Ebenen begrenzt (im Original Stapelüberlauf).
- **Geometrie ohne Clipper/NTS**: Versatz mit eigener Kantenverschiebung; zerfällt ein Block beim Versatz in mehrere Teile oder wird er ungültig, verwirft die App ihn (das Original behielte die Teile). Der Hof des Blockrands wird nicht boolesch abgezogen, sondern als Loch gezeichnet und extrudiert; die Grundfläche ist Baufenster − Hof (bei gegenüberliegenden Fronten zählt das Gebäude als ein Stück).
- **Parzellen**: Die Eckfolge jeder Parzelle beginnt an ihrer längsten Frontkante (Kante 0 liegt so an der Straße). Das Original gibt die Parzellen in beliebiger Eckfolge aus; für Placement on Parcel heißt das: die Vorlagenkante 0 landet bei der App immer an der Straße.
- **Placement**: Die Vorlagen der .gh-Datei sind gezeichnete Rhino-Geometrie; die App hat vier eigene (Riegel, Winkel, Punkthäuser, Reihenhäuser, je 48 × 40 m). Alle Parzellen haben dieselbe Umlaufrichtung wie die Vorlagen, damit die Baukörper innen landen; zusätzlich entfallen Baukörper, deren Mitte außerhalb der Parzelle läge. Baukörper verschiedener Kanten werden – wie im Original – nicht gegeneinander geprüft. Geschosse der Vorlagen = Höhe / FloorHeight (gerundet) für die Kennzahlen.
- **Axonometrie**: Statt der Rhino-Ansicht eine eigene Parallelprojektion (Drehung, Neigung), drehbar per Ziehen.
