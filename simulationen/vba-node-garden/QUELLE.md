# Quelle · nodeGarden – Interaktion von Nodes

| | |
|---|---|
| Originalprogramm | AutoCAD-VBA-Makro „nodeGarden“ (`Sub traffic`, `Sub run`, `Sub ball`, `Function random`, `Function distance`, `Function howmany`), Quelltext auf der Seite `05nodeGarden.htm` |
| Sprache | AutoCAD VBA (Visual Basic for Applications) |
| Autor | Reinhard König |
| Jahr | spätestens 2004 (kein Datum auf der Seite; die VBA-Experimente waren Grundlage von „Computergenerierte Stadtstrukturen“, Bauriedel/König 2004) |
| Seite der alten Website | Strukturexperimente › AutoCAD-VBA-Experimente, Nr. 06 – https://www.entwurfsforschung.de/alt/Strukturfor/vba/05nodeGarden.htm |
| Archivseite | [Strukturexperimente › AutoCAD-VBA-Experimente](../../../archiv/strukturexperimente/autocad-vba/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/vba/05nodeGarden.htm` (nur gelesen), Bild `alt_inhalte/cache/alt/Strukturfor/bilder/08nodeGarden.jpg` |

## Übernommen

- **Konstanten**: `unimin = 10`, `unimax = 100`, `maxDist = 30`, `bremse = 0.98`, Faktor `0.01`, `amount = 10` (die Eingabe `howmany()` „How many balls“, Vorgabe 10, ist im Original auskommentiert), Kugelradius 1, z = 0.
- **Start** (`Sub traffic`, erste Schleife): je Kugel erst der Vektor `((Rnd · 10 − 5) / 2, (Rnd · 10 − 5) / 2)`, dann die Mitte `random(unimin, unimax)` mit `random(bn, tn) = (tn − bn + 1) · Rnd + bn` – also 10 bis unter 101 (Kugeln können knapp außerhalb des Rahmens beginnen).
- **Durchlauf** (`For i = 1 To 10`): für jede Kugel u in der Reihenfolge der Auswahl (= Reihenfolge der Erzeugung) wird `nodeA = dude.Centroid` einmal gelesen, dann für alle `j > u` (`ohne Doppelvergleich`): `dx = nodeA(0) − nodeB(0)`, `dy` entsprechend; bei `distance < maxDist` `loser(u) = (loser(u) − d · 0.01) · bremse` und `loser(j) = (loser(j) + d · 0.01) · bremse`. Danach `run dude, loser(u), u`. Spätere Kugeln sehen also die schon bewegten früheren. Weil d von u nach j zeigt und abgezogen wird, ist die Wirkung eine **Anziehung** mit Bremse (die Seite sagt: „verändern ihre Bewegungsbahn und werden langsamer“).
- **Sub run**: `cen + change`; `cen > unimax → unimin`, `cen < unimin → unimax` (Sprung an die Gegenseite, ohne den Überschuss mitzunehmen); `duder.color = col` – die Farbe ist die Nummer der Kugel im AutoCAD-Farbindex (0 VonBlock, 1 Rot, 2 Gelb, 3 Grün, 4 Cyan, 5 Blau, 6 Magenta, 7 Weiß/Schwarz, 8/9 Grau …).
- **Darstellung**: schattierte Kugeln (`shade`) in der Draufsicht auf die Ebene z = 0.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat** statt `Rnd` ohne `Randomize` (in VBA lieferte jeder Lauf dieselben Zahlen).
- **Laufzeit**: Das Original rechnete genau zehn Durchläufe; hier ist ein Schritt ein Durchlauf, und der Lauf geht weiter, bis alle Kugeln stehen (mittlere Geschwindigkeit < 0,0001), damit die beschriebene Gruppenbildung „nach einiger Zeit“ sichtbar wird.
- **Regler** für die Konstanten des Makros: amount 2–60 (Kugeln ab Nummer 10 bekommen die weiteren Farben des Farbindex), maxDist 0–90, bremse 0,9–1, Anziehung 0–0,05.
- **Bewegungsbahnen** (neu, abschaltbar): die letzten 160 Schritte jeder Kugel als Linie in ihrer Farbe; im Original wurden die Kugeln nur verschoben. **Paare unter maxDist verbinden** (neu, aus): zeigt, welche Kugeln gerade wechselwirken.
- **Farben**: 0 (VonBlock) und 7 erscheinen dunkel auf Weiß und hell auf Schwarz; Rahmen 10 … 100 gestrichelt eingezeichnet.
- **Kennzahlen neu**: mittlere Geschwindigkeit, Zahl der Gruppen (Kugeln mit Abstand < 5 verbunden), größte Gruppe, einzelne Kugeln.
