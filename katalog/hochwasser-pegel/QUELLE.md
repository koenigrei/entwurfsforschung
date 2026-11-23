# Quelle · Hochwasser: steigender Pegel

| | |
|---|---|
| Original | „Spatial Resilience Toolbox – Flooding“ (SRTF) für Rhino/Grasshopper |
| Eintrag | „Spatial Resilience Towards Flooding Hazards“ im DeCodingSpaces Lab – https://toolbox.decodingspaces.net/spatial-resilience-towards-flooding-hazards/ |
| Art | Forschungsprojekt, Konferenzbeitrag SimAUD 2019 (Georgia Tech, Atlanta) |
| Autorinnen und Autoren | Julius Morschek, Reinhard König, Sven Schneider (Bauhaus-Universität Weimar; AIT Austrian Institute of Technology, Wien) |
| Paper | Morschek, J., König, R., Schneider, S. (2019): An integrated urban planning and simulation method to enforce spatial resilience towards flooding hazards. In: *Proceedings of SimAUD 2019*, Atlanta, Society for Modeling & Simulation International (SCS). PDF: https://toolbox.decodingspaces.net/wp-content/uploads/2019/02/SimAUD-2019-Paper33-SRTF-web.pdf (eine DOI ist im PDF nicht angegeben) |
| Lizenz des Originals | Die Seite nennt keine Lizenz; die Grasshopper-Dateien sind passwortgeschützt und wurden nicht benutzt. Das Paper trägt den Vermerk „© 2019 Society for Modeling & Simulation International (SCS)“. Die DeCodingSpaces Toolbox steht heute unter GPL-3.0 (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox); sie enthält die SRTF nicht. Diese App ist eine Neuumsetzung nach der Beschreibung im Paper und auf der Seite, kein Code übernommen; sie steht unter CC BY 4.0. |
| Gelesen | Paper (Text vollständig), Seitentext des Eintrags; keine Videos, keine Grasshopper-Dateien |

## Übernommen

- **Gezeiten- und Flusshochwasser (Paper 3.3)**: Eine Wasserebene steigt von einer Ausgangshöhe bis zu einem Höchstwert („a plane is moved from a given altitude up to a predetermined value“); überflutet ist, was unter der Ebene liegt und mit der ursprünglichen Wasserfläche verbunden ist („culls areas that are not directly connected to the original surface“ – etwa hinter einem Damm). Bereich 0 bis 8 m wie in der Fallstudie.
- **Bewertung (Paper 3.4)**: Ein Gebäude ist überflutet, sobald der Pegel die Oberkante seines Sockels („top of a platform“) erreicht; je Schritt (Frame) 8 cm; die Tiefe zählt die Schritte seit der Überflutung, Wassertiefen über 24 cm gelten gleich; Färbung rot, mit der Tiefe dunkler. Straßensegmente nach ihrem tiefsten Punkt, ebenso. Die Legende zählt überflutete Gebäude und Segmente (Paper: 32 bzw. 25 Gebäude bei 8 m).
- **Mittleres Risiko (Paper 3.4, letzter Absatz)**: Jedes Gebäude ist ein Punkt auf seinem Sockel; gezählt werden die Pegelstände, in denen der Punkt überflutet ist, geteilt durch die Zahl aller Stände. Ebenso für Straßen und für das Gelände (im Paper ein Raster von etwa 3 × 3 m, hier das 2-m-Gitter). Farbverlauf grau (niedrig) bis rot (hoch) wie Abb. 7.
- **Regenabfluss (Paper 3.1, 3.2)**: Partikel mit Masse laufen unter der Schwerkraft über das Gelände, werden schneller, wo sie frei laufen, und sammeln sich in Engstellen und Mulden. Überflutungsrisiko je Gebäude = Zahl der Partikel im Umkreis (Voreinstellung 2 m, „range is set to two meters by default“) / Grundfläche; je Straßensegment (an Kreuzungen und Knicken geteilt) = Partikel im Umkreis / Fläche des Umkreises. Erosion: Positionen alle 10 Schritte zu Fließwegen verbunden; Abschnitte, die schneller als eine Schwelle zurückgelegt werden, sind erosionsgefährdet; die betroffene Fläche wird gemessen.
- **Maßnahmen („Working with the SRTF“)**: Gräben, Aufforstung (bremst den Abfluss) und Anheben der Wohnbereiche betroffener Gebäude.

## Bewusst geändert

- **Beispieltal statt Fallstudie**: Statt des Entwurfs „Tropical Town“ (Future Cities Lab Singapur) rechnet die App mit einem eigenen Gelände (400 × 400 m, Gitter 2 m): Fluss im Süden mit 1,5 m tiefer Rinne, Uferwall, flacher Nordhang mit der Beispielstadt aus `../_gemeinsam/szenen.js`, Rauschen ±0,7 m. Ein eigenes Tal statt `Szenen.gelaende`, weil dieses einen Berg ohne Fluss erzeugt. Andere Saat, anderes Tal.
- **Verbundenheit über die Überlaufhöhe**: Statt in jedem Frame die Ebene mit dem Gelände zu schneiden und abgetrennte Flächen zu entfernen, rechnet die App einmal je Gitterpunkt die Überlaufhöhe W (kleinste Wasserhöhe, bei der Wasser vom Fluss dorthin gelangt; Priority-Flood mit Vierer-Nachbarschaft). Bei Pegel L steht Wasser genau dort, wo W < L. Das ist dasselbe Ergebnis wie Schnitt + „mit dem Fluss verbunden“, aber für alle Pegel auf einmal.
- **Sockelhöhe**: Das Paper nennt keine Sockelhöhe; Voreinstellung 0,5 m über dem Gelände am Schwerpunkt des Gebäudes (Regler 0–2 m). Ein Gebäude gilt als überflutet, wenn der Pegel die Sockeloberkante erreicht und das Wasser seinen Fußpunkt erreicht (W am Fußpunkt).
- **Partikel ohne Kangaroo**: Statt der Physik von Kangaroo (10 000 Partikel à 30 cm, 3000 Iterationen) bewegt die App 1500 Punktpartikel mit einem einfachen Modell: Beschleunigung = −2 · Gefälle je Schritt, Dämpfung 0,2 je Schritt (im Wald 0,6), höchstens 4 m je Schritt; Gebäude sind Hindernisse (die Partikel gleiten an der Kante entlang), im Fluss gelten sie als abgeflossen. Partikel stoßen sich nicht gegenseitig ab und stauen sich daher nicht auf. Voreinstellung 600 Schritte.
- **Erosionsschwelle**: Im Paper 1,5 m je 10 Kangaroo-Iterationen; weil ein Schritt der App viel größer ist, ist die Voreinstellung 6 m je 10 Schritte (Regler 1–20 m). Die Fläche ist die Zahl der 2-m-Gitterpunkte entlang schneller Abschnitte × 4 m² (statt Gruppieren benachbarter Fließwege zu Flächen mit 1,5 m Dichteschwelle).
- **„Betroffen“ beim Regen**: Das Paper färbt ohne festgelegte Schwelle; die App zählt Gebäude mit mindestens einem Partikel im Umkreis und solche mit mindestens 0,05 Partikeln je m².
- **Maßnahmen als Klickwerkzeuge**: Anheben +0,5 m je Klick (höchstens 3 m, Rechtsklick nimmt zurück), Graben 1,5 m tief und 5 m breit entlang der gezogenen Linie (auch durch den Uferwall – dann läuft dahinter Wasser ein), Aufforstung als Kreis von 12 m. Keine Brücken, keine Dämme.
- **Ablauf**: ein Schritt = ein Pegelschritt (8 cm) bzw. ein Partikelschritt. Die Kurve „überflutete Gebäude je Pegel“ und das mittlere Risiko gelten immer für alle Pegelstände zwischen Start- und Höchstpegel. Bildschirmfotos und Videos der Toolbox entfallen.

## Literatur

- Morschek, J., König, R., Schneider, S. (2019): An integrated urban planning and simulation method to enforce spatial resilience towards flooding hazards. *SimAUD 2019*, Atlanta. https://toolbox.decodingspaces.net/wp-content/uploads/2019/02/SimAUD-2019-Paper33-SRTF-web.pdf
- Barnes, R., Lehman, C., Mulla, D. (2014): Priority-flood: An optimal depression-filling and watershed-labeling algorithm for digital elevation models. *Computers & Geosciences* 62, 117–127. https://doi.org/10.1016/j.cageo.2013.04.024 (Verfahren der Überlaufhöhe)
