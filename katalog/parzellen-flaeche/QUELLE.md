# Quelle · Parzellierung nach Fläche

| | |
|---|---|
| Original | Grasshopper-Modul „Parcellation By Area“ (`ParcellationByArea.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Dennemark |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/ParcellationByArea/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/ParcellationByArea/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext der DeCodingSpaces-Toolbox (Bauhaus-InfAU/decoding-spaces-toolbox, aus den alten Binärdateien rekonstruiert, Lizenz **GPL-3.0**); **kein Code übernommen**:

- Die Toolbox enthält **kein** Verfahren „Parcellation by Area“ und nichts aus polysplit (durchsucht: `src/DecodingSpaces.Core/Generation/Parcels/*`, `docs/generation.md`, `docs/research/legacy-generation.md`, `docs/inventory.md`). Ihre Parzellierungen – die alten Komponenten „Parcels“ und „Slicing Tree“ sowie die neue „Parcels“ mit den Methoden strips, recursive und Baufelder (`src/DecodingSpaces.Core/Generation/Parcels/Parceller.cs`, https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Generation/Parcels/Parceller.cs) – teilen nach Straßenfront bzw. Zielfläche durch Halbierung, nicht durch das Abtrennen genauer Flächen mit dem kürzesten Schnitt. Maßgeblich bleiben die C#-Skripte der .gh-Datei.
- **Polygons from lines** (DeCodingSpaces-Komponente, `docs/inventory.md`: „Takes line segments as input and identifies closed polygons“, Eingänge Lines, Line values, MinBlockSize – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/inventory.md; Polygonisierung wie bei „Blocks“ in `docs/research/legacy-generation.md`, Abschnitt 5 – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/research/legacy-generation.md): In der .gh-Datei bildet sie aus den internalisierten Straßensegmenten die geschlossenen Flächen (MinBlockSize 0, also ohne Mindestgröße), aus denen die Blöcke gewählt werden. Die App erzeugt diese Blöcke mit der Beispielszene (Straßenraster → Flächen zwischen den Straßen, um die halbe Straßenbreite eingerückt); eine eigene Polygonisierung ist nicht nötig. Es gibt dazu keine Abweichung im Verfahren der Parzellierung.

## Übernommen

- **Verfahren** der drei C#-Skripte `EqualAreaGreedy`, `EqualAreaVector` und `AreaListGreedy` (ScriptSource und AdditionalSource gelesen): Schleife über die Zielflächen, je Schritt `split(remainingPoly, …)`; darin alle Paare nicht benachbarter Kanten (`for i … for j = i + 2 …`, Abbruch bei `segmentsCovered == Count`), je Paar beide Richtungen (abgetrennt wird die Seite zwischen den Kanten oder die andere), Gültigkeit „höchstens zwei Schnittpunkte mit dem Polygon“, Auswahl der kürzesten Linie (`Aggregate … getLength()`) bzw. der Linie mit dem kleinsten Winkel zu `dir` (`Vector3d.VectorAngle`). Gibt es keinen gültigen Schnitt, bleibt der Rest ungeteilt (wie `return polyline`).
- **Zielflächen**: gleich `Fläche / n` mit `n − 1` Schnitten; `n < 2` teilt nicht („Number of parts should be greater than 1!“). Flächenliste aus der Verdrahtung `Range (0..1, Steps) → Consecutive Domains (Additive = true) → Remap Numbers (Quelle 0..Mass Addition, Ziel 0..1)`: Anteile `k / (1 + … + s)`, Summe 1; der letzte Anteil ist der Rest.
- **Richtung** `dir` wie in der Datei: Explode → Length → Sort List (umgekehrt) → List Item 0 = längste Kante, Cross Product mit Unit Z („Simplified approach to get the vector of a polygon pointing away from longest line“). Sie wird einmal je Block bestimmt, nicht je Restpolygon.
- **Parameter**: Werteliste „Parcellation Option“ mit den drei Einträgen (Auswahl „Equal Area – cut by minimal distance“), n = 5 [0..10], Range Steps = 7 [0..10].
- **Darstellung** wie im Katalogbild: Parzellengrenzen violett, Blockränder schwarz (im Dunkeln weiß), Straßen grau nur zur Orientierung.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **polysplit vereinfacht nachgebaut**: polysplit bestimmt je Kantenpaar die Schnittlinie über Projektionen in zwei Dreiecke und ein Trapez (`EdgePairSubpolylines`, `splitFractionTrapezoid`). Die App betrachtet je Kantenpaar die ganze Schar der Linien von Kante A nach Kante B: Bei festem Punkt auf A ist die abgetrennte Fläche linear im Punkt auf B, er folgt geschlossen; der Punkt auf A wird an 49 Stellen abgetastet und um die beste Stelle mit dem Goldenen Schnitt verfeinert. Das Kriterium bleibt dasselbe – genau die Zielfläche, kürzester gültiger Schnitt –, die Schar enthält die Linien von polysplit; Schnitte können daher gleich lang oder kürzer, in Einzelfällen anders gelegen sein.
- **Winkel ohne Vorzeichen**: Das Skript vergleicht `VectorAngle(Schnittrichtung, dir)` mit gerichteten Linien, deren Richtung vom Fall im Code abhängt (0° und 180° gelten dort als verschieden). Die App wertet den Winkel zwischen Geraden (0…90°), damit eine Linie parallel zu `dir` nicht wegen ihrer Zeichenrichtung verworfen wird.
- **Rebuild Curve weggelassen**: Vor Explode wird die Blockkurve in der Datei mit Rebuild Curve (Count = Regler 2) neu aufgebaut; die App nimmt die längste Kante des Blockpolygons direkt.
- **Ein Regler n**: Die Datei hat je einen Regler n für EqualAreaGreedy und EqualAreaVector (beide 5 [0..10]); die App führt sie zu einem zusammen, Stream Gate wird zur Auswahl „Verfahren“.
- **Summe der Liste**: Das Skript bricht bei `area.Sum() > 1` ab; wegen Rundung kann die Summe 1,0000000000000002 sein. Die App prüft mit einer Toleranz von 1e-9.
- **Abspielen**: Grasshopper rechnet alles auf einmal. Hier ist ein Schritt ein Schnitt; die Blöcke kommen reihum dran (erst der erste Schnitt in allen Blöcken, dann der zweite …). Klick auf einen Block zeigt dessen Ziel- und Parzellenflächen.

## Lizenzhinweis polysplit

Die Skripte der .gh-Datei („Polygon Splitting by Area developed by Martin Dennemark at Bauhaus University Weimar, DecodingSpaces & Form Follows You. Greatly based on Gediminas Rimša polyline split algorithm https://github.com/grimsa/polysplit, which is derived from Sumit Khetarpal http://www.khetarpal.org/polygon-splitting/. Licensed under the MIT license.“) stehen unter der MIT-Lizenz. Diese App übernimmt das Verfahren, nicht den Code (Neuumsetzung in JavaScript).
