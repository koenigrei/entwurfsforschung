# Quelle · Magnetischer Grundrissgenerator

| | |
|---|---|
| Original | „Magnetizing Floor Plan Generator“ (MFG), Grasshopper-Plugin `Magnetizing_FPG.gha` mit Beispieldatei `Magnetizing_FPG_Preview.gh` |
| Art | Werkzeug – studentisches Forschungsprojekt, Bauhaus-Universität Weimar, 2019 |
| Autorinnen und Autoren | Egor Gavrilov (Autor); Reinhard König, Sven Schneider, Martin Dennemark (Betreuung) |
| Eintrag im DeCodingSpaces Lab | https://toolbox.decodingspaces.net/magnetizing-floor-plan-generator/ (23. 3. 2019) |
| Quellcode des Plugins | https://github.com/hellguz/Magnetizing_FloorPlanGenerator (C#, Komponente `MagnetizingRooms_ES`) |
| Literatur | Gavrilov, E., Schneider, S., Dennemark, M., König, R. (2020): Computer-aided approach to public buildings floor plan generation. Magnetizing Floor Plan Generator. *Procedia Manufacturing* 44, 132–139 (1st International Conference on Optimization-Driven Architectural Design, OPTARCH 2019). https://doi.org/10.1016/j.promfg.2020.02.214 – Lizenz des Artikels: CC BY-NC-ND 4.0 |
| Lizenzlage des Originals | Seite im DeCodingSpaces Lab ohne Lizenzangabe; das GitHub-Repository hat **keine Lizenz** (README-Abschnitt „License“ leer) – daher nur gelesen, kein Code übernommen. Die DeCodingSpaces Toolbox (GPL-3.0) wird hier nicht benutzt. |
| Diese App | Neuumsetzung, kein Code übernommen · CC BY 4.0 · Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic |
| Gelesen | Seitentext und Pseudocode des Lab-Eintrags; `Magnetizing_FPG_Preview.gh` als XML (Komponenten, Schieberegler, 60 `RoomInstance` mit Name, Fläche und Verbindungen, 4 `HouseInstance`); `MagnetizingRooms_ES.cs` zum Verständnis des Ablaufs gelesen, nicht kopiert und nicht übersetzt; nichts ausgeführt |

## Übernommen

- **Raster und Zellzustände**: Zellen von 1 m (CellSize 1 m), Zustand frei / Flur / Raum n / außerhalb des Umrisses (im Plugin 0 / −1 / n / 9999).
- **Raumprogramm**: je Raum Name, Fläche, Verbindungen zu anderen Räumen, Typ Raum oder Halle, ein Eingangsraum; Umriss mit Eingangspunkt (`HouseInstance`: Boundary, Entrance Point). Die vier Programme der Beispieldatei mit ihren Flächen und Verbindungen: Haus am Horn (14 Räume, 153 m²), Villa Savoye (14 Räume, 359 m²), Miller House (11 Räume, 677 m²) und ein Hallenbad mit Sauna (21 Räume, 2 994 m²).
- **Reihenfolge**: Eingangsraum zuerst am Eingangspunkt (dort liegt anfangs eine Flurzelle, die nach dem ersten Raum wieder frei wird); danach der unplatzierte Raum mit den meisten Verbindungen zu platzierten Räumen, je Verbindung 1 + 0,1 · Zufall; gibt es keinen solchen, der insgesamt am stärksten vernetzte.
- **Raumform**: Seitenverhältnis zufällig zwischen 1 und MaxRatio = 1,9, Seiten `round(√(A/r))` und `round(r·√(A/r))`, mindestens 1, mit Wahrscheinlichkeit ½ gedreht.
- **Flurstreifen**: an einer Seite (Spalte oder Zeile zufällig), an zwei Seiten (Voreinstellung, L-förmig) oder an allen Seiten; Hallen immer ringsum. „Corridors as additional spaces“ (Voreinstellung an): Flur zusätzlich zur Raumfläche, sonst davon abgezogen.
- **Andocken**: Die Ecke (0, 0) der Schablone ist Flur und liegt auf einer freien Zelle, die seitlich an eine Flurzelle grenzt; alle Zellen der Schablone müssen frei sein; vier Ausrichtungen. Jeder schon platzierte geforderte Nachbar muss von dieser Zelle über Flurzellen (8er-Nachbarschaft, diagonal √2) höchstens MaxAdjDistance entfernt sein.
- **„Magnet“-Bewertung einer Lage**: Zahl der Raum- und Flurzellen auf den vier Linien neben dem Kasten, vom Andockpunkt bis zum Rasterrand; die Lage mit dem höchsten Wert gewinnt (kompakte Anordnung).
- **Ende einer Lösung**: Passt der nächste Raum nicht, endet die Lösung.
- **Quasi-evolutionäre Suche**: je Iteration fünf Lösungen (gridSolutionCapacity 5); jede dritte Iteration (außer der ersten) werden stattdessen die besten genommen, ihre letzten 1–5 Räume entfernt (mindestens einer bleibt) und neu gesetzt; mehr platzierte Räume ersetzen die alte Fassung. Nach jeder Iteration wird nach der Bewertung sortiert.
- **Bewertung**: Zahl der platzierten Räume (wie im Code) oder ihre Fläche (beides auf der Seite genannt).
- **Nachbearbeitung**: Sackgassen im Flur entfernen (Voreinstellung) oder alle Flure den Räumen zuschlagen, deren Kasten sie gehören („Remove Dead Ends“, „Remove All Corridors“).
- **Parameter**: Iterations 250 [1..10000] und MaxAdjDistance 3 [1..5] wie die Schieberegler der Beispieldatei (die Komponente empfiehlt 300–900 bzw. 2–3); MaxRatio 1,9; Flurmodus und Schalter wie im Kontextmenü der Komponente.
- **Darstellung**: farbiger Rasterplan, Flure grau, rote Punkte an Räumen mit fehlender Nachbarschaft (MissingAdjacences: geforderter Nachbar nicht platziert), Nachbarschaftsgraph, Meldung „n of N placed“ als Kennzahl.

## Bewusst geändert

- **Neuumsetzung, kein Code übernommen**: Das Repository hat keine Lizenz; der C#-Code wurde nur gelesen, um den Ablauf zu verstehen. Alle Funktionen sind eigenständig in JavaScript geschrieben (andere Datenstrukturen, Summentabellen statt Zellschleifen, Abstandsfeld von der Zielseite her).
- **Umriss als Rechteck aus Zellen** (Breite, Tiefe, wahlweise L-Form oder Innenhof) statt einer beliebigen Rhino-Kurve; dafür lassen sich Zellen mit der Maus sperren. Das Drehen des Umrisses auf das kleinste umschließende Rechteck entfällt (achsparallel). Die Umrisse der Beispiele stammen aus der nicht geladenen .3dm-Datei; angenommen sind Grundfläche plus 2,3 m Rand wie `boundaryOffset` im Plugin (Haus am Horn 12,7 m → 17 m, Villa Savoye ≈ 21,5 × 19 m → 26 × 24 m, Miller House 38 × 34 m, Hallenbad 78 × 66 m).
- **Typ Halle und Eingangsraum** sind in der .gh-Datei nicht lesbar gespeichert (nur Raum-IDs). Gesetzt nach Sinn: Halle = Flur (Haus am Horn), Hall (Villa Savoye), Living Room (Miller House), Wartebereich, Eingangshalle, Aufenthaltsbereich (Hallenbad); Eingang = Windfang, Ramp, Entrance, Haupteingang. Die Flächen sind die der Datei (auch „Kinder 50 m²“ im Haus am Horn, das daher oft nicht mehr passt).
- **Gleichstand der Lagen**: Das Plugin nimmt bei gleichem Wert die erste Lage in Zellreihenfolge; hier entscheidet der Zufall (feste Saat), damit die Lösungen nicht zur linken unteren Ecke driften.
- **Bewertungslinien**: Im Plugin liegen zwei der vier Linien eine Zelle zu weit vom Raum entfernt und die Grenzprüfung lässt die letzte Rasterspalte bzw. -zeile aus; hier liegen alle vier Linien direkt am Kasten, und das ganze Raster ist nutzbar.
- **Bestenliste**: Das Plugin ersetzt nur in Iterationen mit `Iteration % 5 == 0` und fügt sonst auch verbesserte Fassungen hinzu (bis zu sieben bleiben); hier gilt die Regel der Seite: Eine Verbesserung ersetzt die alte Fassung, wenn sie besser ist (Bewertung, bei Gleichstand die andere Größe), neue Lösungen kommen in die Liste, nach jeder Iteration bleiben die fünf besten.
- **Sackgassen entfernen**: eigenes, wiederholtes Verfahren: Eine Flurzelle mit höchstens einer Flur- oder Hallen-Nachbarzelle geht an den Raum, dessen Flurstreifen sie ist – nur wenn danach jeder angrenzende Raum weiter an Flur oder Halle grenzt. Das Plugin läuft einmal geradeaus vom Sackgassenende bis zur Abzweigung.
- **Rote Punkte** erscheinen nur an abgeschlossenen Lösungen (während des Aufbaus fehlen Nachbarn naturgemäß); im Graphen sind fehlende Räume hohl. Der Graph ist fest angeordnet (Stress-Majorisierung) statt mit dem Federsystem `SpringSystem_ES` der Beispieldatei, das den Grundriss als Blasendiagramm nachbewegt (nicht umgesetzt).
- **Schritt**: ein platzierter Raum (zeigt das Andocken) oder wahlweise eine ganze Iteration mit fünf Lösungen; „Zum Ende“ rechnet alle Iterationen.
- **CellSize** ist fest 1 m (Raster 1 m wie in der Voreinstellung).

## Literatur

- Gavrilov, E., Schneider, S., Dennemark, M., König, R. (2020): Computer-aided approach to public buildings floor plan generation. Magnetizing Floor Plan Generator. Procedia Manufacturing 44, 132–139. https://doi.org/10.1016/j.promfg.2020.02.214
- Gansner, E. R., Koren, Y., North, S. (2004): Graph Drawing by Stress Majorization. In: Graph Drawing (GD 2004), LNCS 3383, 239–250. https://doi.org/10.1007/978-3-540-31843-9_25 (Anordnung des Nachbarschaftsgraphen)
