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

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext der DeCodingSpaces-Toolbox (Bauhaus-InfAU/decoding-spaces-toolbox, aus den alten Binärdateien rekonstruiert, Lizenz **GPL-3.0**); **kein Code übernommen** – gelesen wurden Ablauf, Bedingungen und Parameter, umgesetzt in eigenem JavaScript:

- `docs/research/legacy-generation.md`, Abschnitte 2 (Synthesis Settings `C_CustomizedParameters`) und 6 (Parcels and Slicing Tree: `C_RsTree` → `STreeExtended`) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/research/legacy-generation.md
- `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacySynthesisComponents.cs` (Ein- und Ausgänge von „Slicing Tree Structure for Parcels“ und „Customized Parameters“) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacySynthesisComponents.cs
- `docs/inventory.md`, `docs/migration.md` (Nachfolger: Parcels, Methode `recursive`) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/inventory.md, https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/migration.md
- zum Vergleich die Neufassung `src/DecodingSpaces.Core/Generation/Parcels/RecursiveSubdivision.cs`, `Parceller.cs`, `ParcelOptions.cs` und `docs/generation.md` – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Generation/Parcels/RecursiveSubdivision.cs

**Jetzt übereinstimmend** (Runde 1 hatte ein eigenes Verfahren mit Längsteilung, Baumtiefe und Zufallsstreuung):

- Drehung jedes Blocks, sodass die lange Seite seines kleinsten umschließenden Rechtecks achsparallel liegt; Schnitte achsparallel in diesem Rahmen.
- Straßenkanten eines Teils = Kanten, die quasi-kollinear mit einer Kante des Blocks sind (Winkel < 0,01 rad, Abstand < 1 · scalingFactor); beim Slicing Tree zählt jede Blockkante als Straße. Teil ohne Straßenkante → Blatt.
- Schnittwahl: Straßenkanten nach Länge, die erste mit `splitRate · |e| > parcelWidth` entscheidet; liegt sie „senkrecht“ (45° < |Winkel| < 135°), wird waagrecht geschnitten („H“), sonst senkrecht („V“). Schnittlage `bbox.min + splitRate · bbox.größe` des Teils. Keine passende Kante → Blatt. Straßenfront der Parzellen im Rechteck damit in [parcelWidth, 2 · parcelWidth).
- Rücken an Rücken: Bei mindestens zwei Straßen- und zwei Innenkanten, parallelen längsten Innenkanten im Abstand ≥ minDistance · splitRate, einer Straßenkante, die die längste nicht berührt, und längster Innenkante > 2 · parcelWidth wird die längste Innenkante als weitere Kandidatin aufgenommen.
- Kein Zufall (im Original ist `rand` deklariert, aber nie benutzt); `seed` wird nicht gelesen.
- Bedeutung aller 18 Customized Parameters (Voreinstellungen der .gh-Datei: scalingFactor 1, maxLength 100, minLength 20, angleRange 90, nChildren 3, treeDepth 7, minAngleD 10, minDistance 1, minBlockArea 800, blockOffset 0, maxRank 4, rank 0, maxArea 20, parcelDepth 5, parcelWidth 31 per Regler, splitRate 0,5, density 10, seed −1): Der Slicing Tree liest nur **scalingFactor** (Kollinearitätstoleranz), **minDistance** (Gegenseiten-Test), **parcelWidth** und **splitRate** – diese vier sind Regler der App. maxLength, minLength, angleRange, nChildren, treeDepth und minAngleD steuern Synthesis Tree/Forest (Straßenerzeugung), minBlockArea und blockOffset die Komponente Blocks; maxRank, rank, maxArea, parcelDepth und density dienen nur dem PISA-Chromosom, seed liest keine Komponente. In `Modell.CUSTOMIZED` und `Modell.BEDEUTUNG` festgehalten.

**Bewusst abweichend vom Quelltext:**

- **Polygon richtig teilen**: Das Original nimmt nur die ersten beiden Schnittpunkte der Schnittgeraden mit dem Teil (konkave Blöcke werden falsch geteilt); die App schneidet das Polygon an der Geraden in zwei Halbebenen.
- **Drehung um den Schwerpunkt** statt um den Ursprung (im Original Genauigkeitsverlust bei großen Koordinaten); geometrisch gleich.
- **Rücken an Rücken**: Das Original hängt aus einer Liste voller Dubletten nur deren letzten Eintrag an; die App nimmt die längste Innenkante.
- **Schutz gegen endlose Rekursion** (Schnitt der Länge 0 führt im Original zum Stapelüberlauf): höchstens 40 Ebenen, Schnitte ohne echte Zweiteilung ergeben ein Blatt.
- **Nachfolger nicht verwendet**: Die neue Toolbox ersetzt die Komponente durch „Parcels“ mit der Methode `recursive` (Schnitt an der Flächenmitte ± Unregelmäßigkeit bis zur Ziel-Fläche). Die App bildet das Modul von 2020 nach, also das alte Verfahren.

## Übernommen

- **Idee und Eigenschaft**: „uses the Slicing Tree algorithm of DeCodingSpaces toolbox to generate parcels inside a polygon“, Notiz „Slicing Tree – Keeps each parcel connected to the street.“ – jede Parzelle der Beispielszene hat eine Straßenkante (getestet; Teile ohne Straße sind im Verfahren möglich und werden als „mit Straßenanschluss“ gezählt).
- **Blöcke** wie in der .gh-Datei aus „Polygons from lines“ (Straßennetz → geschlossene Flächen, MinBlockSize 0): hier die Blöcke der Beispielszene.
- **Darstellung** wie im Katalogbild: Parzellengrenzen violett, Blockränder schwarz (im Dunkeln weiß), Straßen grau nur zur Orientierung.

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Abspielen**: Grasshopper rechnet alles auf einmal. Hier ist ein Schritt ein Schnitt, Ebene für Ebene des Baums durch alle Blöcke. Das Baumdiagramm unter dem Plan zeigt den Baum des gewählten Blocks (Voreinstellung: größter Block, Klick wählt einen anderen) mit der Schnittreihenfolge.
- **Regler für feste Werte**: splitRate, scalingFactor und minDistance sind in der .gh-Datei feste Werte, in der App Regler (Voreinstellung wie in der Datei).
