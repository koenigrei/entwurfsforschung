# Quelle · Regenwasserabfluss (Vektor)

| | |
|---|---|
| Original | Grasshopper-Modul „Rainwater Rundown (Vector)“ (`RainwaterRundownVector.gh`), v. 1.0 – Notiz der Datei: „Credit goes to Djorde Spasic as the developer of Gismo!“ |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | Djordje Spasić (Gismo), Parametric Planning Catalogue |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/RainwaterRundownVector/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/RainwaterRundownVector/`) |
| Lizenz des Originals | Modul: MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Verwendete Komponente | „Gismo_Flow Paths“ (FlowPaths), VER 0.0.3, 29.01.2019, aus **Gismo** – Plugin for GIS Environmental Analysis von **Djordje Spasić**, https://github.com/stgeorges/gismo, Lizenz **GPL-3.0-or-later** |
| Gelesen | `.gh` mit GH_IO in XML gewandelt; Komponenten, Verdrahtung, Schieberegler, Schalter und Notizen gelesen; den Python-Quelltext der Gismo-Komponente gelesen, um das Verfahren zu verstehen; Vorschau-GIF Bild für Bild angesehen; nichts ausgeführt |

**Kein Gismo-Code übernommen.** Gismo steht unter der GPL-3.0. Die App übernimmt keine Zeile davon; das Verfahren ist nach der Beschreibung und dem Ablauf der Komponente in eigenen Worten neu geschrieben (Gleichungen in `modell.js` hergeleitet). Die Komponente selbst stützt sich auf die Stack-Overflow-Frage „Finding the downhill direction vector when given a plane defined by a normal and a point“ (Zach Helms, 2016, https://stackoverflow.com/q/14369233).

## Übernommen

- **Aufbau der .gh-Datei**: Geländefläche (terrain) → Gismo „Flow Paths“ mit `numOfInitialPts_` = Schieberegler „Number of Points“ 300 (0–1000), `initialPtsSpread_` = Schalter „Grid:False Random:True“ (false = Rechteckraster), `stepSize_` = 1 (Voreinstellung der Komponente, Rhino-Einheiten), `flowPathsType_` = 0 (Polylinien), `_runIt` über einen Schalter.
- **Startpunkte**: Rechteckraster auf der Oberseite des Begrenzungsrahmens, Ränder eingeschlossen; Spalten ≈ √(Seitenverhältnis · Zahl), Zeilen = Zahl / Spalten, Spalten neu = Zahl / Zeilen (je gerundet) – bei 300 Punkten 17 × 18 = 306. Oder zufällig verteilt. Weniger als 2 Punkte werden auf 2 gesetzt (wie die Komponente).
- **Fließweg**: wiederholt ein Schritt der Länge `stepSize` entlang der Fläche in Richtung des steilsten Gefälles in der Tangentialebene (Senkrechte nach unten in die Ebene der Normale projiziert), neuer Punkt zurück auf die Fläche; Abbruch, wenn der neue Punkt mit dem alten zusammenfällt (Abstand < 0,0001), oder nach 5000 Schritten. Ergebnis je Startpunkt eine Polylinie; keine Gruppierung, kein Raster.
- **Darstellung** wie im Katalogbild: dunkle dünne Linien auf dem hellen Gelände (im Dunkeln helle Linien).

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit einer Geländefläche aus einer Rhino-Datei. Die App erzeugt ein vergleichbares Gelände (2 km × 2 km, dasselbe wie in „Regenwasserabfluss (Raster)“) mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt ein anderes Gelände. Darstellung von oben mit Schummerung und Höhenlinien statt Isometrie.
- **Glatte Fläche statt Netz**: Gismo vernetzt die Fläche und nimmt die Normale des Netzes und den nächsten Netzpunkt. Die App rechnet auf dem Höhenraster mit bilinearer Höhe und dem Gradienten aus zentralen Differenzen und legt den neuen Punkt senkrecht auf das Gelände.
- **Mulden**: In einer Mulde pendelt der Weg bei Gismo hin und her, ohne dass zwei Punkte genau zusammenfallen, und läuft bis 5000 Schritte weiter (sichtbar bleibt ein Punkt). Die App beendet einen Weg, wenn er nach 25 Schritten waagerecht weniger als zwei Schrittweiten vom Punkt 25 Schritte zuvor entfernt ist, und schneidet ihn an seinem tiefsten Punkt ab (Abbruchgrund „senke“). Kurze Anstiege beim Zickzack quer über eine Rinne bleiben erlaubt.
- **Zufällige Startpunkte** gleichverteilt mit der Saat der App statt mit Grasshoppers „Populate Geometry“ (Saat 0). Das Raster gilt bei 2 oder 3 Punkten mit mindestens 2 × 2 (die Komponente teilt dort durch null).
- **Schrittweite als Regler** (0,1–20 m), weil die Komponente sie als Eingang hat, die .gh-Datei aber nur die Voreinstellung 1 nutzt.
- **Abspielen**: Gismo rechnet alle Wege auf einmal. „Start“ lässt alle Linien gleichzeitig wachsen, ein Schritt der App = ein Schritt jedes laufenden Wegs; ein Klick setzt weitere Regentropfen (statt Punkte in Rhino zu ändern). Der Schalter `_runIt` entfällt.

## Literatur

- Spasić, D. (2019): Gismo – Plugin for GIS Environmental Analysis, Komponente „Flow Paths“, VER 0.0.3. https://github.com/stgeorges/gismo (GPL-3.0-or-later)
