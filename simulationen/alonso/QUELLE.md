# Quelle · Alonsos Modell der Standortwahl der Betriebe

| | |
|---|---|
| Originalprogramm | `414_Alonso` (Projekt `alonsoBoden.dpr`, Units `facsSteer.pas`, `cell.pas`, `agenten.pas`; Hintergrundbilder der Diagramme `Graph.bmp`, `Graph2.bmp`, `Graph3.bmp`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (Kopf: „Version 1.0, August 2005, Last Update: Aug-15, 2005“; neueste Quelltextdatei `facsSteer.dfm` vom 17.11.2005); Programmsammlung zur Dissertation 2008. Gleicher Quellcode: `16_urbaneNutzungen` „Verteilung städtischer Flächennutzungen“ im „Laboratorium für räumliche Prozesse“ („Source - 050815“) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 4.1.4, Gleichungen 31–35, Abb. 30; nach W. Alonso (1964): *Location and Land Use*, und Breßler & Harsche (2004) |
| Seite der alten Website | https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm (Beschreibung: https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm#Nutzungen) |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008)](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/414_Alonso.zip`, Programmordner `414_Alonso_Prog.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Formeln** aus `cell.pas`, ganzzahlig mit Delphis `Round` (bei genau ,5 zur geraden Zahl – wichtig, weil der Vergleich B = P exakt ist): `CalcUmsatz` V = round(q − d · vkund/100 + G); `CalcProdKost` C = round(V/10 + q/10 + d · vtrans/100); `CalcBidPr` B = V − C − G; `CalcBodenPreis` P = round(mp / (0,01 + d · vpt/10)).
- **Mögliche Nutzungsstandorte**: Zellen mit `BidPrice = BodenPreis` werden gelb (`cb_nutzSto`, voreingestellt an).
- **Entfernung**: gerundete Entfernung der Zellmitte zum nächsten Markt (`NextMarkt`), 1000 ohne Markt.
- **Feld**: 138 × 88 Zellen zu 6 px (`ImagePaint` 825 × 530, `cellScal = 6`).
- **Parameter und Voreinstellungen** aus `facsSteer.dfm`: Betriebsgröße q 60 (1–100), Transportkosten-Abhängigkeit vtrans 50 (1–300, angezeigt /10 = 5,0), Kundensensibilität vkund 20 (1–300, angezeigt 2,0), Gewinn G 10 (1–200), Maximalpreis mp 500 (1–2000), Preisabnahme vpt 6 (1–20, angezeigt 0,6). Alle wirken sofort.
- **Anzeigen** aus `RectanglPaint`: Bid-Price (grün, ×3, voreingestellt), Umsatz (gelb, ×2), Produktionskosten (rot, 255 − C), Distanzen (255 − d/2); Märkte als rote Punkte, „Märkte löschen“, Markt per Klick, „Märkte bewegen“ (`SetRndDir(1.0001)`, Torus).
- **Diagramme** (`GraphUmsatz`): Umsatzkurve V (blau), Produktionskosten C (rot), Bid-Preis-Kurve (grün) mit Boden-Marktpreis (oliv, dicker) über 21 Zellen = 0–126 px; Wertebereiche wie in den Bildern (V/2 bzw. Wert in Bildpunkten, Höhe ≈ 104–108).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: Das Original rechnet im Leerlauf mit `Randomize`; ein Schritt = eine Bewegung der Märkte und Neuberechnung.
- **Startzustand**: ein Markt in der Mitte (Regler „Märkte zu Beginn“, 0–12, weitere zufällig nach Saat); das Original beginnt ohne Markt. **„Märkte bewegen“ ist voreingestellt**, damit Start einen sichtbaren Ablauf zeigt.
- **Diagramme ohne Hintergrundbilder**: Das Original lädt `Graph*.bmp` aus dem Programmordner (deshalb musste man es entpacken). Hier werden die Achsen gezeichnet; die Kurven werden direkt aus den Formeln über die Entfernung 0–126 px berechnet statt aus 21 Zellen der Zeile des ersten Marktes (gleiche Werte, solange kein anderer Markt näher liegt, und ohne Lesefehler am Feldrand). Die Treffpunkte B = P sind im dritten Diagramm gelb markiert. Auf breiten Bildschirmen stehen die Diagramme rechts, sonst darunter; die „helle Linie“ für den Datenbereich entfällt.
- **Höchstgeschwindigkeit der Märkte** 4 px je Schritt (im Original unbegrenzt); Mausinteraktion (Abstoßen/Anziehen) entfällt, dafür entfernt ein Rechtsklick den nächsten Markt; „Delete 100 Pts“ entfällt.
- **Farben** der Flächen über die Flächenfarbe gemischt, damit sie in heller und dunkler Darstellung lesbar sind. **Kennzahlen** neu.
