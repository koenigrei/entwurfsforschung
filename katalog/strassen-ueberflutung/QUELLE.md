# Quelle · Straßen und Starkregen

| | |
|---|---|
| Original | Grasshopper-Modul „Street Flood Risk“ (`StreetFloodRisk.gh`) |
| Katalog | Parametric Planning Catalogue – DeCodingSpaces, ECL-AA, InfAR, Bauhaus-Universität Weimar, 2020 |
| Autorinnen und Autoren | DeCodingSpaces – Martin Dennemark |
| Katalogeintrag | https://infar-buw.github.io/parametric-planning-catalogue/docs/StreetFloodRisk/ |
| Quellen | https://github.com/infar-buw/parametric-planning-catalogue (Ordner `docs/StreetFloodRisk/`) |
| Lizenz des Originals | MIT (Copyright (c) 2020 infar-buw); diese Neuumsetzung: CC BY 4.0 |
| Gelesen | `.gh` mit GH_IO in XML gewandelt, Komponenten, Schieberegler (Wert, Bereich), Notizen und Skripte gelesen; nichts ausgeführt |

## Übernommen

- **Datenvorbereitung** wie in der Datei: Straßen auf das Gelände gelegt und in Segmente zerlegt; je Segment an der Stelle „Number Slider“ 0,5 [0..1] (*Evaluate Curve*) Punkt und Tangente, dort die Geländenormale (*Surface Closest Point*, *Evaluate Surface*); StreetDirection und WaterFlowDirection = Tangente bzw. Normale, waagerecht projiziert (*Project*).
- **Abweichung**: *Angle*(StreetDirection, WaterFlowDirection), *Evaluate* `if(x>0.5*PI,PI-x,x)` („Inverts Street Direction if necessary“), *Remap Numbers* mit Source 0…*Pi*·0,5 („Number Slider“ 0,5) auf 0…1 (NormalisedDeviationStreetToWaterflow).
- **Neigung**: *Angle*(Normale, Unit Z), *Remap Numbers* mit Source 0…*Radians*(„Max Degrees“ 15 [0..90]) – nicht gekappt (NormalisedSteepness).
- **Risiko** = Produkt beider Werte (*Multiplication*) als Parameter eines *Gradient* von 0 bis „Number Slider“ 1 [0..1]; rot = steil und quer zum Fluss, blau = flach oder in Fließrichtung (Panel der Datei).
- **Graue Pfeile**: WaterFlowDirection × „Number Slider“ 50 [0..100] am Segmentpunkt (*Vector Display Ex*) – die Länge wächst mit sin(Neigung); **Höhenlinien** im Abstand „Number Slider“ 20 [0..100] (*Contour*).

## Bewusst geändert

- **Beispielszene statt Rhino-Geometrie**: Die .gh-Datei arbeitet mit Geometrie aus einer Rhino-Datei. Die App erzeugt eine vergleichbare Szene mit fester Saat (`../_gemeinsam/szenen.js`); eine andere Saat ergibt eine andere Szene.
- **Draufsicht statt Isometrie**: Gelände von oben mit Schummerung; die Höhenlinien sind grau statt nach Höhe abgestuft.
- **Beispielnetz statt Rhino-Geometrie**: Die Datei liest Gelände und Straßen aus `StreetFloodRisk.3dm`. Die App legt ein Straßennetz aus `Szenen.stadt` (ohne Gebäude) auf einen Ausschnitt eines Geländes aus `Szenen.gelaende` und beschneidet es auf einen unregelmäßigen Umriss.
- **Segmente**: In der Datei entstehen sie durch *Explode* der auf das Gelände projizierten Kurven (Zahl hängt von der Rhino-Geometrie ab). Die App teilt jede Straße in gleich lange Segmente von höchstens „Segmentlänge“ (Voreinstellung 25 m) und misst die Normale am Messpunkt im Segment.
- **Ablauf**: Grasshopper rechnet sofort. Hier färbt ein Schritt die nächste Straße ein – in der Reihenfolge ihrer Höhe von oben nach unten, wie das Wasser läuft; nach der letzten hält der Lauf an. Regler rechnen sofort zu Ende; „Bewertung abspielen“ zeigt es erneut. Klick auf eine Straße zeigt Abweichung, Neigung und Risiko des Segments.
- **Max Degrees** beginnt bei 1° statt 0° (0 ergäbe eine Division durch null); die Farbskala ist `Karte.farbe(…, "spektral")` (blau – grün – gelb – rot) statt des Grasshopper-Gradienten der Datei.
- **Kennzahlen** (Anteil stark betroffener Straßenlänge = obere Hälfte der Farbskala, kaum betroffen = unter 0,2, mittleres Risiko, Neigungen) sind hinzugefügt.
