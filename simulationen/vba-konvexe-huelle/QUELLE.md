# Quelle · convexHull – Hülle um beliebig verteilte Punkte

| | |
|---|---|
| Originalprogramm | `04convexHull.htm` (AutoCAD-VBA-Skript: `Sub main`, `kugel`, `draw_line`, `arkusKos`, `random`, `pi`, `funQsort`, `SwapElements`) |
| Sprache | AutoCAD-VBA (Visual Basic for Applications in AutoCAD) |
| Autor | Reinhard König |
| Datum | April 2004 – die Seite ist undatiert; das EXIF-Datum (Photoshop 7.0) des Bildes `04convexHull.jpg` ist der 11.04.2004 19:52. Die Übersicht `vbaIndex.htm` nennt die VBA-Experimente „Grundlage zu der Arbeit ‚Computergenerierte Stadtstrukturen‘“. |
| Seite der alten Website | Strukturexperimente › AutoCAD-VBA-Experimente – https://www.entwurfsforschung.de/alt/Strukturfor/vba/04convexHull.htm (Übersicht `vbaIndex.htm`) |
| Archivseite | [Strukturexperimente › AutoCAD-VBA-Experimente](../../../archiv/strukturexperimente/autocad-vba/) |
| Quelle im Repo | `alt_inhalte/cache/alt/Strukturfor/vba/04convexHull.htm`; Bild `alt_inhalte/cache/alt/Strukturfor/bilder/04convexHull.jpg` (nur gelesen) |

## Übernommen

- **Punkte**: `anzahl = 200`, `For v = 0 To anzahl` – also 201 Punkte; `koord(0) = random(0, 1000)`, `koord(1) = random(0, 800)` mit `random = Int((upper − lower + 1) · Rnd + lower)`, ganzzahlig, die Grenzen eingeschlossen. Kugeln mit Radius 2 in Farbe 2 (Gelb).
- **Sortieren**: `funQsort` sortiert die x-Werte, danach wird `koordList` mit der Schleife `While u <= anzahl · For f = u To anzahl · If koordList(f)(0) = xKoord(u) Then tauschen, u + 1` umgeordnet – wörtlich übernommen, auch die Reihenfolge von Punkten mit gleichem x, die daraus folgt.
- **Hüllkette**: `startP = koordList(0)` (kleinstes x), `richtung = True`. In jedem Durchgang der `Do`-Schleife werden alle Punkte geprüft (`For i = 0 To anzahl`, außer `startP` selbst); `deltaWinkA = vektorA(0) / |vektorA|`. Ist `startP(0) >= koordList(anzahl)(0)` (größtes x erreicht), gilt `richtung = False`. Hinweg: nur Punkte mit `x ≥ startP.x`, `ergebnis = 360 − arkusKos · 180/π − 270` (unterhalb) bzw. `arkusKos · 180/π + 90` (oberhalb), gewählt mit `refWi < ergebnis`. Rückweg: nur `x ≤ startP.x`, `ergebnis = 360 − arkusKos · 180/π − 90` bzw. `arkusKos · 180/π − 90`, gewählt mit `refWi <= ergebnis`. `refWi` beginnt je Durchgang bei 0, `highP` wird mit `ReDim` geleert.
- **Kanten** (`draw_line startP, endP, z`): Farbe `z` = Nummer der Kante (0, 1, 2 …, AutoCAD-Farbindex). Ende: `Loop While Not (startP = koordList(0))`.
- **arkusKos** über `Atn(−wert / Sqr(−wert · wert + 1)) + 2 · Atn(1)`, für `wert = 1` die 0.
- **Ergebnis der Prüfung**: In 5000 Läufen mit 201 Punkten ist die Kette die konvexe Hülle (Vergleich mit dem Verfahren von Andrew, Test „Die Kette ist die konvexe Hülle“); kollineare Punkte auf dem Rand können als zusätzliche Ecken auftreten.

## Bewusst geändert

- **arkusKos(−1)**: Das Original gibt für `wert = −1` den Wert 180 zurück – in Grad, während alle anderen Werte im Bogenmaß stehen. Nach der Umrechnung `· 180/π` werden daraus 10 313°. Das trifft genau den Fall, dass auf dem Rückweg ein Punkt waagerecht links von `startP` liegt (gleiches y, etwa zwei Punkte mit dem kleinsten y): Er bekommt einen stark negativen Winkelwert und wird übersprungen, die Kette schneidet nach innen, und der Punkt liegt außerhalb der Hülle. Nachgerechnet geschah das in rund 13 % der Läufe mit 201 Punkten. Hier liefert `arkusKos(−1)` π.
- **Pendeln am Ende des Rückwegs**: Liegen mehrere Punkte senkrecht übereinander auf dem kleinsten x, entscheidet im Original die Sortierreihenfolge, welcher gewählt wird – die Kette kann dann endlos zwischen zwei dieser Punkte hin- und herspringen (rund 1 von 250 Läufen mit 201 Punkten; AutoCAD zeichnet ohne Ende Linien). Hier schließt die Kette, sobald der Rückweg die Spalte des ersten Punkts erreicht, direkt zum ersten Punkt. Kommt keine Kante zustande (alle Punkte an einem Ort), endet das Skript im Original mit einem Laufzeitfehler, hier mit dem Zustand „keine Hülle“.
- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize` (Systemuhr). Ein Schritt prüft einen Punkt der Schleife `For i`; der Strahl zeigt den geprüften Punkt, die gestrichelte Linie den bisher besten Kandidaten (`highP`), der Ring `startP` (abschaltbar). Nach dem letzten Punkt entsteht die Kante. Das Original läuft in einem Stück. „Hülle fertig“ rechnet den Rest auf einmal.
- **Mausklick und Rechtsklick** sind neu: Klick setzt einen Punkt (ganzzahlig, ins Feld geholt), Rechtsklick oder Umschalt-Klick entfernt den nächsten Punkt; danach beginnt die Hülle von vorn.
- **anzahl** als Regler 1–1000 (im Code 200).
- **Farben**: Grund schwarz bzw. hell statt AutoCAD-Grau; Farbe 0 (VONBLOCK) und 7 weiß bzw. schwarz; helle AutoCAD-Farben (Gelb, Cyan) werden in der hellen Darstellung abgedunkelt, dunkle (Blau) im Dunkeln aufgehellt.
- **Kennzahlen** neu: Punkte, Hüllkanten, Fortschritt der Suche, Kette (Hinweg/Rückweg), Fläche der Hülle (Anteil am Feld), Punkte außerhalb (Kontrolle, immer 0).
- **Nicht übernommen**: `ZoomAll` nach jeder Kugel; die unbenutzten Variablen `zaehler`, `deltaWinkA`/`winkB`, `vektorB`, `Const vbdMissing` außerhalb von `funQsort`.
