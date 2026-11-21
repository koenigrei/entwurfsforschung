# Quelle · Thünen-Ringe

| | |
|---|---|
| Originalprogramm | `412_ThuenenRinge` (Projekt `thuenen2.dpr`, Units `cell.pas`, `agenten.pas`, `facsSteer.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2008 (Programmsammlung zur Dissertation); Vorläufer `10_thuenen` vom 27.06.2005 im „Laboratorium für räumliche Prozesse“ |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 4.1.2 „Die Thünenschen Ringe“; als Buch im VS Verlag erschienen |
| Archivseite | [Räumliche Prozesse › Dynamische Simulation und Visualisierung räumlicher Prozesse](../../../archiv/raumprozesse/simulationsprogramme/) · Vorläufer: [Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quellcode im Repo | `archiv_medien/raumprozesse/412_ThuenenRinge.zip` (nur gelesen; die .exe wurde nicht ausgeführt) |

## Übernommen

- **Regel** aus `TBaseCell.CalcLagerR`: `Lagerente_j = Ertrag_j · (Marktpreis_j − Erzeugungskosten_j) − Ertrag_j · Distanz · Transportkosten_j`; die Zelle nimmt das Produkt mit der höchsten Lagerente, wenn sie größer als 1 ist, sonst bleibt sie ungenutzt (`State = 99`).
- **Distanz** aus `TBaseCell.NextMarkt`: gerundete euklidische Entfernung in Bildpunkten zum nächsten Markt, 1000 ohne Markt.
- **Feld**: 129 × 76 Zellen zu 6 Bildpunkten (Zeichenfläche 775 × 455 px, `cellScal = 6`).
- **Parameter und Voreinstellungen** aus `facsSteer.dfm`: je Produkt Anbauertrag (1–10000), Erzeugungskosten (1–1000), Marktpreis (1–1000), Transportkosten (1–50); A 2500/10/400/5, B 500/1/900/6, C 2000/6/400/3.
- **Bedienung**: Markt per Klick setzen, „Märkte löschen“, „Märkte bewegen“ (Zufallsbewegung nach `SetRndDir(1.0001)`: Geschwindigkeit + Zufall aus {−1, 0, 1}, Rand als Torus), Anzeigen „Thünensche Ringe“, „Lagerente“, „Distanzen“.
- **Farben** der Produkte: A Gelb, B Grün, C Weiß; ungenutzte Fläche dunkel; Märkte als rote Punkte.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: Das Original rechnet im Leerlauf ohne Schrittzähler und mit `Randomize`. Hier ist jeder Lauf mit derselben Saat wiederholbar; ein Schritt = eine Bewegung aller Märkte und Neuberechnung.
- **Startzustand**: Das Original beginnt ohne Markt. Hier steht zu Beginn ein Markt in der Mitte (Regler „Märkte zu Beginn“, 0–12; weitere Märkte zufällig nach Saat), damit die Ringe sofort sichtbar sind.
- **„Märkte bewegen“ ist voreingestellt**, damit Start einen sichtbaren Ablauf zeigt; ausgeschaltet bleiben die Märkte stehen.
- **Höchstgeschwindigkeit der Märkte** 4 px je Schritt. Im Original wächst die Geschwindigkeit als Zufallsweg unbegrenzt.
- **Mausinteraktion**: Das Abstoßen/Anziehen der Märkte durch den Mauszeiger (Radius-Regler, Schalter „Attract/Repel“) entfällt, weil es auf Touch-Geräten nicht funktioniert. Dafür entfernt ein Rechtsklick (oder Umschalt-Klick) den nächsten Markt.
- **Anzeige „Lagerente“**: Graustufen relativ zur höchsten Lagerente im Feld. Das Original begrenzte die Rente auf 255 und zog die Distanz ab, wodurch fast nur die Entfernung sichtbar war.
- **Helle Darstellung**: Produkt C („Weiß“) erscheint als helles Grau, ungenutzte Fläche in der Flächenfarbe.
- **Kennzahlen** neu: Flächenanteile und Ringgrenzen für einen einzelnen Markt.
