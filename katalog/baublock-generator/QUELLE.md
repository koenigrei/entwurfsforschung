# Quelle · Baublock-Generator (DigiWo)

| | |
|---|---|
| Original | „DigiWo – Block Generation Components / Slabs Generation Components“: Grasshopper-Komponenten (User Objects und .gha) mit Tutorial |
| Art | Forschungsprojekt DigiWo (2018–2020, ZukunftBau): Bauhaus-Universität Weimar, Decoding Spaces GbR, DIPLAN (heute REHUB digitale Planer) |
| Autorinnen und Autoren | Iuliia Osintseva (Autorin); Reinhard König, Sven Schneider, Martin Bielik (Betreuung); Andreas Berst (Mitarbeit); Egor Gavrilov, Martin Oravec (studentische Hilfskräfte) |
| Eintrag im DeCodingSpaces Lab | https://toolbox.decodingspaces.net/digiwo/ (Tutorial vom 30.12.2020) |
| Paper | Osintseva, I., Koenig, R., Berst, A., Bielik, M., Schneider, S. (2020): Automated Parametric Building Volume Generation: A Case Study for Urban Blocks. *SimAUD 2020*, online, S. 211–218. http://simaud.org/2020/proceedings/70.pdf (© 2020 Society for Modeling & Simulation International) |
| Lizenz des Originals | Auf der Seite keine Lizenzangabe; die Grasshopper-Dateien lagen auf Google Drive. Diese Neuumsetzung: CC BY 4.0 – Neuumsetzung, kein Code übernommen. |
| Gelesen | Seitentext des Tutorials, das Paper vollständig (Text und Abbildungen 2–4, Tabelle 1), Liste der GIFs und Videos auf der Seite |

## Grasshopper-Dateien nicht erreichbar

Alle fünf Download-Links der Seite (Komponenten und User Objects, Setup-Dateien, Envelopes, Beispiel-Folge, Zeilen) führen am 23.11.2026 auf Google Drive ins Leere (404). Es gab also keine .gh-Datei, keine Schieberegler und keine Skripte zum Ablesen. Die App ist eine **Neuumsetzung nach Tutorialtext, Paper und Abbildungen**. Bereiche und Voreinstellungen der Regler sind deshalb gewählt, nicht übernommen – außer dort, wo Abbildung 2 des Papers Werte zeigt (Random Breaks: *Nr of options* 10; Yard Buildings: *yards floor cnt* „3 to 5“, *cut the yard slabs?* True).

## Übernommen

- **Ablauf** (Tutorial 1a/1b, Paper Abschnitt 3, Abb. 2): Eingaben (Grundstück als geschlossenes Polygon, Straßen, Nachbarn, Lage für die Abstandsflächen, „Baulinie“ für Kanten ohne Abstand) → **Basic Block** → **Actions** in beliebiger Folge über gemeinsame Ein- und Ausgaben (Grundstück nach Abstand, Grundflächen, Außen- und Innenkonturen, Tiefe, Geschosszahl, hier je Baukörper gespeichert).
- **Basic Block**: das Grundstück um die Abstandsfläche nach innen versetzt (aus der Gebäudehöhe berechnet, „Building depth“ und „floor cnt“ als Eingaben, Geschosszahl aus einem Bereich), dann der Umriss um die Gebäudetiefe – ein geschlossener Block. An einer Baulinie entfällt der Abstand.
- **Acht Aktionen** mit den Bedienelementen, die Tutorial und Paper nennen: *Delete Edges / Open Block* (Startkante, Anzahl), *Setbacks Edges* (Kante, Maßbereich, Saat; nur bei ausreichender Kantenlänge), *Setbacks Corners* (Maßbereich, Saat; nur bei ausreichend langen anschließenden Kanten), *Cornerbreaks* (Breite, Schnittrichtung), *Random Breaks* (abzuziehende Fläche oder Gesamtbreite, Saat), *Reduce Height* (Block an den Ecken in Fragmente teilen, abzuziehende Fläche, mehrere Höhenprofile), *Towers* (ein oder zwei Türme, Fläche je Turm, höchstens Zusatzgeschosse, Höhe begrenzt durch die Hüllkurve, Attraktorpunkt), *Yard Buildings* (Achse, Tiefe, Geschosse, „cut the yard slabs?“), *Rooftops* (Ausrichtung Straße/Hof, Tiefe, Anteil).
- **Attraktor** (Tabelle 1, Abb. 3): jede Aktion wirkt zufällig oder am Attraktorpunkt; Hofgebäude laufen entlang einer Achse durch diesen Punkt.
- **Zeilen** (Tutorial 2a): die Grundstückskanten werden nach ihren Winkeln zu vier charakteristischen Kanten zusammengefasst; Zeilen entstehen entlang jeder Kante, solange Platz ist; die Reihenfolge der Kanten ändert das Muster; je Kante eine eigene Zahl von Zeilen.
- **Kennzahlen** (Tutorial 1a): FAR (GFZ), Site Occupancy (GRZ), Total Built Area (BGF).
- **Varianten** (Paper Abschnitt 4): Folgen aus dem Wettbewerb MK6 Theresienhöhe als Vorlagen (Vorschlag 1: Random breaks → Towers; Vorschlag 2: breitere Durchgänge → Towers; Vorschlag 3: Random breaks → Yard buildings), Variantenreihe mit Filterblick auf die GFZ.
- **Darstellung**: Baukörper blau wie in den Abbildungen des Papers, dazu ein Lageplan.

## Bewusst geändert

- **Keine Rhino-Geometrie**: vier Beispielgrundstücke (Rechteck, Trapez, Keil ähnlich Abb. 4, Fünfeck) mit Kantenarten Straße/Nachbar/Baulinie. Ecken lassen sich ziehen, die Kantenart per Rechtsklick wechseln. Nur **konvexe** Grundstücke: das Original teilt große konkave Grundstücke für die Zeilen vorher (Tutorial 2b); diese Teilung fehlt hier.
- **Abstandsflächen vereinfacht**: `T = max(Mindestmaß, Faktor · H)` je Wand, H bis zur Traufe (Flachdach, keine Dachzuschläge, keine Vorsprünge, keine Gebäudeklassen-Regel „3 m genügen“). Faktor und Mindestmaß je Land und Baugebiet (Auswahl, siehe unten). Zur Straße darf die Fläche bis zur Mitte reichen: Abstand vom Rand `max(0, T − Straßenbreite/2)`. Zwischen Gebäuden auf dem Grundstück (Zeilen, Hofgebäude) gilt die Summe beider Abstandsflächen, bei Zeilen konservativ `2 T` der höchsten Zeile.
- **Hüllkurven der Türme**: Die solaren Hüllkurven (Ladybug, Knowles) fehlen. Die Höhe eines Turms begrenzt eine vereinfachte Abstandsflächen-Hüllkurve: je Grundstückskante `H ≤ (freier Abstand + ggf. halbe Straße) / Faktor`, an einer Baulinie keine Grenze, unter dem Mindestmaß kein Turm (wie der „Inverse mode“ der Toolbox).
- **Gleichmäßige Geometrie statt GH-Kurven**: Der Block ist in konvexe Teile zerlegt (Flügel je Kante, Ecken als Schnitt zweier Streifen); jede Aktion schneidet mit Halbebenen. Durchgänge und Rücksprünge stehen senkrecht zur Kante, Eckdurchgänge parallel zur anderen Kante (so bleibt die Breite genau w).
- **Rücksprünge an Kanten** verschieben das Stück um die Rücksprungtiefe in den Hof (Grundfläche bleibt gleich, wie Abb. 4 (2) zeigt); **Rücksprünge an Ecken** schneiden ein Stück a × b aus der Außenecke ohne Ausgleich.
- **Höhe reduzieren** senkt Fragmente um je ein Geschoss, bis die Fläche erreicht ist (nie unter „Mindestgeschosse“); welche Fragmente, entscheidet die Saat oder die Nähe zum Attraktor.
- **Dachgeschosse** sind ein Geschoss hoch, bündig zum Hof oder zur Straße. In der GFZ zählen sie nur, wenn sie mindestens ⅔ des Geschosses darunter decken (übliche Vollgeschossregel, wie `FullStoreyAreaRatio` der Toolbox); in der BGF zählen sie immer.
- **Zeilen** mit gemeinsamen Parametern (Tiefe, Geschosse, Höchstlänge, Abstand 2 T) statt neun Parametern je Kante; je Kante nur die Zahl der Zeilen. Lange Zeilen werden mit demselben Abstand geteilt. Die Aktionen Rücksprünge, Eckdurchgänge und Hofgebäude gelten nur für den Blockrand (im Original gehören sie zu den Block-Komponenten); „Kanten löschen“ entfernt bei Zeilen die Zeilen einer charakteristischen Kante.
- **Saat je Aktion** statt fester Zufallsfolge: jede Aktion zieht ihre Zufallszahlen aus Saat des Laufs, Platz in der Folge und eigener Saat. Ändert man eine Saat, ändert sich nur diese Aktion und was ihr folgt.
- **Schritt und Varianten**: Grasshopper rechnet alle Varianten auf einmal (das Paper: 200 je Folge, 10 000 in vier Stunden). Hier ist der Zustand „Zurück“ die Grundform, jeder Schritt wendet eine Aktion an; danach beginnt die nächste Variante (eigene Saaten). „Varianten“ übernimmt die Rolle von *Nr of options*; die GFZ jeder Variante steht in einer Reihe, ein Klick zeigt die Variante wieder.
- **Mehrere Gebäudetiefen auf einmal** (Tutorial: „multiple values for the building depth to try out“) gibt es nicht; die Tiefe ist ein Regler, die Geschosszahl kommt aus dem Bereich „von … bis“ je Variante.

## Abgleich mit dem Quelltext

Abgleich mit dem Quelltext; kein Code übernommen. Gelesen (23.11.2026) wurde die DeCodingSpaces-Toolbox, GitHub Bauhaus-InfAU/decoding-spaces-toolbox, Lizenz **GPL-3.0**. Sie enthält keine DigiWo-Komponenten; abgelesen wurden nur Definitionen und Werte für Abstandsflächen, Dichte und Zeilen, umgesetzt in eigenem Code (diese App steht unter CC BY 4.0):

- `docs/zoning.md` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/zoning.md): GRZ = überbaute Fläche / Grundstück (§ 19 BauNVO), GFZ = Fläche der Vollgeschosse / Grundstück (§ 20), ⅔-Regel für Vollgeschosse, Orientierungswerte nach § 17 BauNVO (WA 0,4/1,2; MI 0,6/1,2; MU 0,8/3,0; MK 1,0/3,0; GE 0,8/2,4), Abstandsfläche `T = max(Mindestmaß, Faktor · H)` mit Faktor je Baugebiet, Umkehrung „größte zulässige Höhe = freier Abstand / Faktor, 0 unter dem Mindestmaß“.
- `data/abstandsflaechen/*.json` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/tree/main/data/abstandsflaechen): Faktoren und Mindestmaße der Länder (MBO und meisten Länder 0,4 H / 3 m, GE 0,2 H; BW, HE, HH Mindestmaß 2,5 m; BW MK/MU 0,2 H, GE 0,125 H; NW MK 0,25 H; RP GE 0,25 H; BayBO Art. 6 Abs. 5a: 1 H in Gemeinden über 250 000 Einwohnern außerhalb von GE, MK, MU). Die Profile sind laut `REVIEW.md` noch nicht geprüft.
- `src/DecodingSpaces.Core/Zoning/Setbacks.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Zoning/Setbacks.cs) und `src/DecodingSpaces.Core/Zoning/Density.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Zoning/Density.cs): Aufbau der Profile, Vollgeschoss-Schwellen (1,40 m, ⅔).
- `src/DecodingSpaces.Core/Generation/Buildings/PerimeterTypology.cs` und `SlabTypology.cs` (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Core/Generation/Buildings/): Blockrandtiefe 12 m (Wohnen), Zeilenabstand zweimal die Abstandsfläche bei der höchsten Geschosszahl, lange Zeilen mit demselben Abstand teilen, kürzeste Zeile.

Grafit (MIT) enthält nur Netz- und Graphwerkzeuge (`examples/rhino/`) und wurde nicht benutzt.

## Literatur

- Osintseva, I., Koenig, R., Berst, A., Bielik, M., Schneider, S. (2020): Automated Parametric Building Volume Generation: A Case Study for Urban Blocks. In: *Proceedings of SimAUD 2020*, online, 25.–27. Mai 2020, S. 211–218. http://simaud.org/2020/proceedings/70.pdf
- Knowles, R. L., Berry, R. D. (1980): *Solar Envelope Concepts: Moderate Density Building Applications*. Solar Energy Research Institute, Golden, Colorado (Hüllkurven, im Original für die Türme).
- Berghauser Pont, M., Haupt, P. (2010): *Spacematrix: Space, Density and Urban Form*. NAi Publishers, Rotterdam (Dichtemaße, wie in der Toolbox).
- Baunutzungsverordnung (BauNVO) §§ 17, 19, 20; Musterbauordnung § 6 und Landesbauordnungen (Abstandsflächen).
