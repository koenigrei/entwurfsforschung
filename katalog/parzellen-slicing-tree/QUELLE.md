# Quelle · Parzellierung mit Slicing Tree

| | |
|---|---|
| Original | Grasshopper-Modul „Parcellation Slicing Tree“ (`ParcellationSlicingTree.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Dennemark |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/ParcellationSlicingTree/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/ParcellationSlicingTree/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Übernommen

- **Idee und Eigenschaft**: Slicing-Tree-Verfahren der DeCodingSpaces-Toolbox („uses the Slicing Tree algorithm of DeCodingSpaces toolbox to generate parcels inside a polygon“), Notiz „Slicing Tree – Keeps each parcel connected to the street.“: rekursive Zweiteilung mit geraden Schnitten, jede Parzelle behält eine Kante am Blockrand (getestet).
- **Parameter** aus „Customized Parameters“: parcelWidth = Regler 31 [10..100]; treeDepth 7 (Baumtiefe), splitRate 0,5 (Teilungsverhältnis), minBlockArea 800 m² (kleinere Blöcke bleiben ungeteilt); Saat über das Bedienfeld (seed −1 = zufällig in der Datei).
- **Darstellung** wie im Katalogbild: Parzellengrenzen violett, Blockränder schwarz (im Dunkeln weiß), Straßen grau nur zur Orientierung; tiefe Blöcke Rücken an Rücken in zwei Reihen, quer dazu Parzellen der Parzellenbreite.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Kompilierte Komponente nachgebildet**: „Slicing Tree Structure for Parcels“ liegt nur als kompilierte Komponente vor. Die App bildet ein Slicing-Tree-Verfahren nach, das zu Beschreibung, Notiz, Parametern und Katalogbild passt; die Regeln sind eigene: (1) Ist ein Teil quer zu seiner längsten Straßenkante tiefer als „Längsteilung ab Blocktiefe“ (eigener Parameter, 60 m) und behält jede Hälfte eine Straßenkante von mindestens der halben Länge dieser Kante, wird es parallel zu ihr halbiert (zwei Reihen Rücken an Rücken; ein innerer Streifen ohne Langseite an der Straße entsteht so nicht). (2) Sonst wird es senkrecht zur längsten Straßenkante geteilt: Bei `k = round(L / parcelWidth)` Parzellen bekommt die eine Seite `round(k · r)`, `r = splitRate ± Streuung/2` (eigener Parameter, 0,3). (3) Blatt, wenn `k < 2` oder die Baumtiefe erreicht ist.
- **Nicht übernommene feste Werte**: scalingFactor 1, maxLength 100, minLength 20, angleRange 90, nChildren 3, minAngleD 10, minDistance 1, blockOffset 0, maxRank 4, rank 0, maxArea 20, parcelDepth 5, density 10 – ihre Bedeutung in der kompilierten Komponente ist nicht dokumentiert (teils wohl für die Straßen-/Blockerzeugung derselben Toolbox). Sie stehen zur Dokumentation in `Modell.CUSTOMIZED`.
- **Abspielen**: Grasshopper rechnet alles auf einmal. Hier ist ein Schritt ein Schnitt, Ebene für Ebene des Baums durch alle Blöcke. Das Baumdiagramm unter dem Plan zeigt den Baum des gewählten Blocks (Voreinstellung: größter Block, Klick wählt einen anderen) mit der Schnittreihenfolge.
