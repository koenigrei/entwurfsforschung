# Quelle · Multiplikatoreffekt

| | |
|---|---|
| Original | Grasshopper-Skripte „Evolution of configurational properties_simple.gh“ und „…_full.gh“ zum Paper „Evolving Configurational Properties“ |
| Eintrag | „Evolving Configurational Properties – Simulating multiplier effects between land use and movement patterns“ im DeCodingSpaces Lab – https://toolbox.decodingspaces.net/evolving-configurational-properties/ |
| Art | Forschungsprojekt (Konferenzbeitrag mit Grasshopper-Skripten), 2019 |
| Autorinnen und Autoren | Martin Bielik, Reinhard König, Ekaterina Fuchkina, Sven Schneider, Abdulmalik Abdulmawla (Bauhaus-Universität Weimar; König auch AIT Wien) |
| Paper | Bielik, M., König, R., Fuchkina, E., Schneider, S., Abdulmawla, A. (2019): Evolving Configurational Properties – Simulating multiplier effects between street network centrality, land use and movement patterns. Proceedings of the 12th International Space Syntax Symposium, Beijing, Paper #279 (keine DOI). PDF: http://decodingspaces-toolbox.org/wp-content/uploads/2019/07/12SSS/Evolving_configurational_properties/Bielik%20et%20al.%20-%202019%20-%20Evolving%20configurational%20properties.pdf |
| Downloads | http://decodingspaces-toolbox.org/wp-content/uploads/2019/07/12SSS/Evolving_configurational_properties/Evolution%20of%20configurational%20properties_simple.gh und …_full.gh (gelesen); DecodingSpaces 2019.05.zip, anemone1.gha, human.gha (Plugins, nicht geladen) |
| Lizenz des Originals | Die Seite nennt keine Lizenz; die Skripte stehen frei zum Download. Die DeCodingSpaces-Komponenten der Skripte sind kompiliert; die DeCodingSpaces Toolbox steht heute unter GPL-3.0 (https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox). Für das Paper ist keine Lizenz angegeben. Diese App ist eine Neuumsetzung, kein Code übernommen; sie steht unter CC BY 4.0. |
| Gelesen | `.gh` mit GH_IO in XML gewandelt; Komponenten, Verdrahtung, Schieberegler (Wert, Bereich), Wertelisten, Notizen, die vier Cluster („Custom OD weights“ mit C#-Skript, „Normalize (temp disruption)“, „Normalize (permanent disruption)“, Log-Darstellung) und die Skripte der Vollversion (R.NET-Regression, CSV, Ladybug-Bildaufnahme) gelesen; Paper ganz gelesen; nichts ausgeführt |

## Übernommen

- **Netz und Graph** (Gruppe „simulated network“): 1. ProcessGeometry mit Segmentlänge 10000 (keine Teilung), 2. BuildGraph mit Length Coefficient 0 und Angular Coefficient 1 (winkelbasierte Segmentanalyse nach Turner), kürzeste Wege (3. ShortestFloydWarshal, 4. FWGetPaths). Umgesetzt mit dem gerichteten Segmentgraphen `Geo.richtungsGraph` (`kL = 0, kW = 1`) und einer eigenen Suche mit Radius (`suche` in `modell.js`).
- **Bewegungspotenzial MPC** (Paper Gl. 4 und 5): gewichtete Closeness `Σ w_k / Σ d_ik · w_k` (Ausgang CW) bzw. gewichtete Betweenness `Σ n_jk[i] / n_jk · w_j · w_k` (Ausgang BW), Auswahl über die Werteliste „Betweenness | Closennes“ (Stream Filter). Radius aus der Werteliste „Global radius N | Pedestrian radius R600m“ (Werte 0 = global und 600).
- **Nutzungsverteilung LPC** (Gl. 7 und Cluster „Normalize (temp disruption)“): `w_neu = MPC · Σw / ΣMPC` – die Summe der Nutzungen bleibt über die ganze Simulation gleich (Notiz der Datei: „Weightings are normalized in such way that the sum of weightings in the network remains equal through out the simulation“).
- **Dauerhafte Störung** (Cluster „Normalize (permanent disruption)“): Cull Index der Disruptorsegmente → Mass Addition → `(Σw − d · n) / ΣMPC_rest` → Multiplication → Replace Items mit d.
- **Anfangsgewichte** (Cluster „Custom OD weights“, C#-Skript): jedes Segment `k (konstant weight)`, die Segmente, die einem Disruptorpunkt am nächsten liegen (Curve Closest Point → Sort List → Item 0), `d (disruptor force)`.
- **Szenarien** (Notiz der Datei): „update destinations“ – nur die Ziele folgen der Zentralität, die Ursprünge bleiben 1 (Duplicate Data mit 1); „update origins & destinations“ – beide folgen.
- **Ablauf**: Loop Start/Loop End (Anemone) mit Repeat = Iterationen; je Iteration MPC, dann LPC. Ein Schritt der App ist eine solche Runde.
- **Parameter und Voreinstellungen**: k 1 [0..10], d 300 [0..1000000] (Vollversion 171), Iterationen 29 [0..100] (Paper: N = 28 bis zum Gleichgewicht), Closeness, R600 m, update origins & destinations, Temporal disruption, display log values, value preview Off, zwei Disruptoren (Parameter „2d Closeness R600“ mit zwei Punkten).
- **Darstellung** (Gruppe „visualize centrality values“): Bounds → Remap → Gradient, hoch = rot, niedrig = blau (wie in den Abbildungen des Papers); wahlweise Logwerte mit `ln(x + 3) − ln 3` (Cluster mit Regler 3) oder Originalwerte; Wertbeschriftung (Text Tag mit Round) über „value preview“; Browse History als Regler „Iteration zeigen“.
- **Maße der Vollversion und des Papers** (Gl. 14–16): Multiplikatoreffekt `Me = R²(lm(MPC_N ~ MPC_1))`, Systemänderung `Ch = 1 − R²(lm(MPC_{i−1} ~ MPC_i))`, natürliche Bewegung `Ne = R²(lm(MPC(disrupted)_N ~ MPC(equal)_1))`; Streudiagramm MPC₁ gegen MPC_N und Verlauf über die Iterationen (Abb. 6, 7, 9–11).

## Bewusst geändert

- **Beispielnetz statt Weimar**: Die Skripte enthalten das Straßennetz der Weimarer Innenstadt (1327 Segmente, als Linien in der Datei). Die App übernimmt es nicht, sondern erzeugt eine Stadt von 1500 × 1050 m mit fester Saat: verzogenes Raster mit zusammengelegten Blöcken (`Szenen.stadt`), drei Diagonalen vom Zentrum nach außen und nach innen gerückte Randknoten (≈ 360 Segmente). Der Rand ist nicht schnurgerade, weil ein gerader Rahmen im Winkelgraphen eine Ringstraße ohne Abbiegekosten wäre, auf der sich jede globale Betweenness sammelt. Andere Saat, andere Stadt.
- **Disruptorstärke d**: Reglerbereich 0…5000 statt 0…1000000 (ein Schieberegler bis eine Million lässt 300 nicht einstellen). Voreinstellung bleibt 300. Weil das Beispielnetz kleiner ist als Weimar, tragen die zwei Disruptoren am Anfang 63 % aller Nutzungen (in Weimar 31 %).
- **Closeness nach Gl. 4 des Papers**: Die kompilierte Komponente „4. FWGetPaths“ (Ausgang CW) ist nicht im Quelltext erhalten. Laut Durchsicht der Toolbox (`docs/review-2026-11.md`, `docs/migration.md`) war ihre Closeness `n/Σd` und wurde mit gesetztem Radius stillschweigend zu `n^2.5/Σd`; wie die gewichtete Fassung CW Ursprungsgewichte einbezog, ist nicht dokumentiert. Die App rechnet die Definition des Papers (Gl. 4), die nur Zielgewichte kennt. Darum wirkt „update destinations“ hier nur auf die Betweenness, und die Closeness R600 ändert sich in der Rückkopplung weniger als im Paper (dort Me = 0,19, hier nahe 1 im gleich belasteten Netz). Ist kein gewichtetes Segment in messbarem Abstand erreichbar (Σ d·w = 0), ist die Closeness 0 statt unendlich.
- **Radius**: Die Legacy-Komponente wandte den Radius laut `review-2026-11.md` nach der Rechnung an und maß über die ganzen Endsegmente. Die App beschneidet die Suche (Toolbox v2, `docs/measures.md` §3): kein Schritt, der die metrische Weglänge von Mitte zu Mitte über r brächte. Das Ursprungssegment zählt nie zu seinem eigenen Einzugsbereich.
- **Betweenness**: Gleich kurze Wege teilen sich den Durchgang (Brandes); die Legacy-Komponente teilte laut Review nicht. Wie dort zählen in der Voreinstellung „DeCodingSpaces 2019“ Start- und Zielsegment eines Paares mit („both endpoints count“), unter „Standard (Toolbox v2)“ nicht. Die Definition „Standard“ nutzt außerdem Winkelkosten θ/90° statt θ/180° (für die Rückkopplung ohne Belang, weil LPC normiert).
- **Doppelte Disruptoren**: Liegen zwei Disruptoren am selben Segment, zählt es einmal (wie `index.Contains` im C#-Skript). Im Cluster der dauerhaften Störung würde d sonst zweimal von Σw abgezogen.
- **Maße in der App statt in R**: Die Vollversion rechnet R² über R.NET (`lm`) und schreibt CSV-Dateien und Bildschirmfotos (Ladybug Capture View). Die App rechnet R² selbst (quadrierte Korrelation, gleichwertig zu `summary(lm)$r.squared` bei einer Einflussgröße) auf den Originalwerten. Den p-Wert, die CSV-Ausgabe und die Bildaufnahme gibt es nicht. Ne bezieht sich auf das gleich belastete Netz mit Gewicht 1 an allen Segmenten (Paper: E.1), gerechnet mit demselben Maß und Radius.
- **Kein Abbruchkriterium A**: Wie die Skripte rechnet die App eine feste Zahl von Iterationen; Gl. 8 (Abbruch bei gleichem MPC) ersetzt der Verlauf von Ch.
- **Sofort wirksame Parameter**: Ändern von Maß, Radius, Modus, Störung, k oder d startet die Rückkopplung bei Iteration 0 neu, die Disruptoren bleiben (in Grasshopper „simulation restart“).

## Abgleich mit dem Quelltext der Toolbox

- `docs/measures.md` (Segmentgraph mit Fahrtrichtung, Winkelkosten, Rangfolge Kosten/Schritte, Radius) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/measures.md, GPL-3.0
- `docs/review-2026-11.md` (Eigenheiten der Legacy-Komponenten: Kosten, Betweenness mit Enden, Closeness `n/Σd` bzw. `n^2.5/Σd`, Radius) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/review-2026-11.md, GPL-3.0
- `docs/migration.md`, `docs/inventory.md` (Ausgänge von 4. FWGetPaths: BC, CC, GW, BW, CW) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/docs/inventory.md, GPL-3.0
- `src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyNetworkComponents.cs` (Eingänge und Ausgänge von „4. FWGetPaths“; nur Hüllen, keine Rechnung) – https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox/blob/main/src/DecodingSpaces.Grasshopper/Components/Legacy/LegacyNetworkComponents.cs, GPL-3.0

Abgleich mit dem Quelltext; kein Code übernommen.

## Literatur

- Bielik, M., König, R., Fuchkina, E., Schneider, S., Abdulmawla, A. (2019): Evolving Configurational Properties – Simulating multiplier effects between street network centrality, land use and movement patterns. Proceedings of the 12th International Space Syntax Symposium, Beijing, Paper #279 (keine DOI).
- Hillier, B., Penn, A., Hanson, J., Grajewski, T., Xu, J. (1993): Natural movement: or, configuration and attraction in urban pedestrian movement. Environment and Planning B 20(1), 29–66. https://doi.org/10.1068/b200029
- Hillier, B. (1996): Cities as movement economies. Urban Design International 1, 41–60. https://doi.org/10.1057/udi.1996.5
- Hillier, B. (1996): Space is the Machine. Cambridge University Press.
- Turner, A. (2007): From axial to road-centre lines: a new representation for space syntax and a new model of route choice for transport network analysis. Environment and Planning B 34(3), 539–555. https://doi.org/10.1068/b32067
