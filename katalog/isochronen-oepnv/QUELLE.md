# Quelle · Isochronen im ÖPNV

| | |
|---|---|
| Original | Werkzeug „Public Transport Isochronal Map“ – Grasshopper-Definition mit vereinfachter Oberfläche in Rhino3D, Erweiterung SpiderWeb 4.2 (Richard Schaffranek) |
| Art, Jahr | Werkzeug (technische Demonstration), 2018 – Gruppe Smart Spatial Planning Systems, AIT Austrian Institute of Technology |
| Autoren | Ondřej Veselý, Reinhard König |
| Eintrag im DeCodingSpaces Lab | https://toolbox.decodingspaces.net/public-transport-isochronal-map/ (30. Mai 2018) |
| Daten des Originals | Linien der Wiener Linien, offene Daten: https://www.data.gv.at/katalog/dataset/stadt-wien_wienerlinienechtzeitdaten |
| Video | https://player.vimeo.com/video/272375493 (nicht ausgewertet) |
| Lizenz des Originals | Auf der Seite keine Lizenzangabe; die Dateien liegen in einem passwortgeschützten Archiv für Forschungspartner und wurden **nicht** verwendet. DeCodingSpaces Toolbox: GPL-3.0 (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox). Diese Neuumsetzung: CC BY 4.0 |
| Gelesen | nur der Seitentext des Eintrags |

**Neuumsetzung nach Beschreibung, kein Code übernommen.** Weil die Originaldateien nicht zugänglich sind, gibt es keine Schieberegler, Bereiche oder Voreinstellungen des Originals; Verfahren und Werte stammen aus der Beschreibung des Eintrags und aus üblichen Planungsannahmen und sind unten offen benannt.

## Übernommen (aus der Beschreibung)

- **Reisezeiten im öffentlichen Verkehr als Isochronenkarte**: „an isochrone of time t is the surface at equal time distance from the starting points“ – mehrere Startpunkte sind möglich.
- **Abbildung der Reisezeit** auf Gebäude, auf Straßen oder als Isochronen (Auswahl „Reisezeit auf“: Flächen mit Isochronen, Straßen, Gebäude).
- **Szenarien wie in CAD bearbeiten**: zusätzliche Linien, dichterer Takt, schnellere Verbindungen. Hier: Haltestellen per Maus setzen, ziehen, entfernen; Takt und Tempo je Linie bzw. Verkehrsmittel als Regler; Szenario B (neue Linie N, Takt halbiert, Tempo × 1,5, ohne Linie 1) im Vergleich zu A.

## Verfahren dieser Umsetzung (nach der Modellbeschreibung im Auftrag)

- **Multimodaler Graph** (`baueGraph`): Fußwegnetz der Straßen (Kante = Länge / Gehgeschwindigkeit, Voreinstellung 4,8 km/h) und je Linie Fahrzustände „an Halt i, Richtung vor/zurück“ (Fahrt = Abschnittslänge / Tempo + Haltezeit). Die Fahrwege zwischen den Halten folgen dem Straßennetz (kürzester Weg nach Länge, `Geo.dijkstra`).
- **Ein- und Umstieg** (eigene Zustandsmodellierung): Einsteigen kostet die mittlere Wartezeit `Anteil × Takt` (Voreinstellung 0,5 = Takt/2). Das Fußwegnetz hat zwei Ebenen – „noch nicht gefahren“ und „schon gefahren“; Aussteigen führt immer auf die zweite. Wer von dort wieder einsteigt, steigt um: erneut `Anteil × Takt` plus wählbarer Zuschlag (Voreinstellung 0). Fußwege zwischen zwei Haltestellen beim Umsteigen sind damit eingeschlossen.
- **Dijkstra ab einem oder mehreren Startpunkten** (`neueSuche`, `sucheBis`): Jeder Startpunkt wird auf die nächste Straße gelotet; von dort zählen Fußweg quer und entlang der Straße zu beiden Knoten. Die Suche läuft schrittweise: **ein Schritt = die Front wächst um Δt** (Voreinstellung 1 min) – alle Knoten mit Reisezeit ≤ Horizont werden fest. Zum Vergleich rechnet `reisezeiten` dasselbe auf einmal mit `Geo.dijkstra` (virtueller Quellknoten); die Tests prüfen Gleichheit.
- **Raster und Isochronen** (`reiseRaster`, `kontur`): Proben alle 7,5 m entlang jeder Straße (Zeit über die beiden Knoten bzw. direkt vom Startpunkt), dann quer in die Blöcke (Abstandstransformation über 15-m-Zellen, gerade und diagonale Nachbarn, höchstens 150 m Luftlinie von der Straße). Isochronen in vier Stufen (Voreinstellung 5/10/15/20 min) als Flächen und als Linien (marching squares).
- **Kennzahlen**: Fläche und geschätzte Einwohner innerhalb 15 bzw. 20 min für A und B, erreichte Haltestellen, feste Knoten.

## Bewusst geändert

- **Beispielstadt statt Wien**: Stadt 3 × 2 km aus `Szenen.stadt` (verzogenes Raster 21 × 14 Knoten, Blöcke rund 150 m, Blockrandbebauung) mit fester Saat; vier ausgedachte Linien: 1 Stadtbahn (30 km/h, Takt 5), 2 Straßenbahn (20 km/h, Takt 10), 3 Bus (15 km/h, Takt 15), N neue Straßenbahn (20 km/h, Takt 5, nur in Szenario B). Takt, Tempo, Haltezeit 0,5 min und Gehgeschwindigkeit sind Annahmen, nicht Werte des Originals. Die Tempi sind Reisegeschwindigkeiten zwischen den Halten.
- **Einwohner geschätzt**: Grundfläche × 4 Geschosse × 0,8 / 40 m² je Person (Kennzahl zum Vergleich der Szenarien, keine Statistik).
- **Takt als mittlere Wartezeit** statt Fahrplan: Ankunftszeiten und Anschlüsse eines echten Fahrplans (wie in den Echtzeitdaten der Wiener Linien) sind nicht modelliert; der Regler „Anteil × Takt“ deckt den Bereich von „Fahrplan bekannt“ (0) bis „gerade verpasst“ (1) ab.
- **Szenarienvergleich nebeneinander und als Differenz** ist eine Ergänzung nach der Modellbeschreibung; die Beschreibung des Originals nennt nur das Bearbeiten von Szenarien.
- **Schritt**: Grasshopper hat keinen Zeitablauf. Nach jeder Änderung (Regler, Startpunkt, Haltestelle) rechnet die App wie Grasshopper sofort zu Ende; „Zurück“ und „Start“ zeigen danach, wie die Front Minute um Minute wächst. Bearbeitete Linien und Startpunkte bleiben bei „Zurück“ erhalten („Standard“ stellt sie wieder her).
- **Querwege in die Blöcke**: Luftlinie, höchstens 150 m – Gebäude sind dabei keine Hindernisse; die Abstandstransformation liegt höchstens rund 8 % über der Luftlinie.

## Bezug

- Workshop-Datei „03_CityGraph_shortest-path_Bus“ der DeCodingSpaces-Workshops (Buskanten = Länge × Buskoeffizient) als Idee der Gewichtung von Linienkanten; dort ohne Takt und Umstieg.
- Verwandte App: `../kuerzester-weg/` (kürzester Weg im Straßennetz, Dijkstra Schritt für Schritt).
- Dijkstra, E. W. (1959): A note on two problems in connexion with graphs. Numerische Mathematik 1, 269–271. https://doi.org/10.1007/BF01386390
