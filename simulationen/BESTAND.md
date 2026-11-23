# Bestand · Frühe Simulationen

Stand 2026-11-21 · erzeugt aus `bestand.json` mit `python simulationen/bestand_md.py` – nicht von Hand bearbeiten.

**80 Programme**: 47 Delphi, 12 NetLogo, 11 AutoCAD-VBA, 9 Flash, 1 C#. Status: 49 umgesetzt, 18 aufgenommen, 9 zurueckgestellt, 2 nur_beschreibung, 1 nur_bilder, 1 verschoben.

Wellen (Vorschlag für die Reihenfolge): **1** klein, Regeln klar, Quellcode oder genaue Beschreibung vorhanden · **2** Varianten und mittlere Modelle · **3** groß, nur Dissertation, nur Bilder oder ohne Beschreibung.

## Agenten und Schwärme

| Nr. | id | Titel | Herkunft | Jahr | Quelle | Umfang | Welle | Status | Kurzbeschreibung |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `facs` | FACS – Free Agents in Cellular Space | Delphi | 2005 | `01_FACS.zip` | klein | 2 | umgesetzt | Grundmodell freier Agenten in einem Zellenraster; die Agenten verändern die Zellen, das Raster dient ihnen als Speicher (nach Portugali). |
| 2 | `schwarm-einfach` | Einfaches Schwarmverhalten | Delphi | 2005 | `02_Swarming.zip` | klein | 2 | aufgenommen → `facs` | Die Bewegungsvektoren der Agenten innerhalb eines Radius werden aneinander angepasst. |
| 3 | `schwarmverhalten` | Schwarmverhalten | Delphi | 2005 | `03_Swarming.zip` | klein | 2 | aufgenommen → `facs` | Schwarm mit Interaktionsradius, Blickwinkel und Mindestabstand; die Zellen zeichnen die Häufigkeit der Begehung auf. |
| 4 | `diffusion-connect` | Diffusion Connect Model | Delphi | 2005 | `23_diffusion-contract.zip` | klein | 2 | umgesetzt | Zufällig wandernde Agenten entwickeln Zellen, sobald genug Agenten in der Moore-Nachbarschaft sind; es entstehen Cluster wie Siedlungen und Verbindungen (nach Batty). |
| 5 | `nl-repel-attract` | 01 repel attract | NetLogo | 2005 | `repel_attract.nlogo` | klein | 2 | umgesetzt | Turtles ziehen sich an oder stoßen sich vom jeweils nächsten Nachbarn ab. |
| 6 | `vba-node-garden` | nodeGarden – Interaktion von Nodes | AutoCAD-VBA | 2004 | `05nodeGarden.htm` | klein | 1 | umgesetzt | Kugeln ziehen einander an und bremsen ab, bis sie zur Ruhe kommen (AutoCAD-VBA-Makro). |

## Zelluläre Automaten und Wachstum

| Nr. | id | Titel | Herkunft | Jahr | Quelle | Umfang | Welle | Status | Kurzbeschreibung |
|---|---|---|---|---|---|---|---|---|---|
| 7 | `wachstum-skalenertraege` | Wachstum und räumliche Umverteilung durch Skalenerträge | Delphi | 2005 | `19_Growth_01.zip` | klein | 1 | umgesetzt | Zufallswerte je Zelle werden mit einem Exponenten α > 0 umverteilt: hohe Werte wachsen auf Kosten der Umgebung (Batty, Kap. 1). |
| 8 | `wachstum-moore` | Growth and Moore Neighborhood | Delphi | 2005 | `20_Growth_02.zip` | klein | 1 | aufgenommen → `wachstum-skalenertraege` | Wie 19_Growth_01, die Umverteilung erfolgt über den Mittelwert der Moore-Nachbarschaft einschließlich der Zelle. |
| 9 | `spatial-averaging` | Spatial Averaging | Delphi | 2005 | `21_Spatial_Averaging.zip` | klein | 1 | umgesetzt | Eine Zufallsverteilung von −1 und 1 wird über die von-Neumann-Nachbarschaft Schritt für Schritt ausgemittelt; Variante mit weißem Rauschen. |
| 10 | `vicsek-szalay` | Vicsek-Szalay-Modell | Delphi | 2005 | `22_Vicsek-Szalay.zip` | klein | 1 | aufgenommen → `spatial-averaging` | Räumliche Mittelung mit weißem Rauschen (±1); Zellen über dem Schwellenwert 4,5 gelten dauerhaft als entwickelt – Muster ähnlich urbaner Ausbreitung. |
| 11 | `entropie` | Entropiemessung | Delphi | 2006 | `27_entropyMeasure.zip` | mittel | 2 | umgesetzt | Eindimensionaler zellulärer Automat (K = 3, N = 202) mit Messung der metrischen und topologischen Shannon-Entropie seiner Muster. |
| 12 | `einfaches-wachstum` | Einfaches Wachstum | Delphi | 2006 | `28_probabCA.zip` | klein | 1 | umgesetzt | Eine Zelle wird mit Wahrscheinlichkeit p entwickelt, wenn eine Nachbarzelle (Moore) entwickelt ist; Alter als Grauwert, die Lebensdauer erzeugt Entwicklungswellen. |
| 13 | `wachstum-umorganisation` | Wachstum mit räumlicher Umorganisation | Delphi | 2006 | `29_groupGrow.zip` | klein | 2 | umgesetzt | Einfaches Wachstum kombiniert mit Segregation durch Eigenschaftsanpassung: zwei Zelltypen innerhalb und außerhalb eines Radius, Inseln und „Umstülpung“. |
| 14 | `potentialfeld-wachstum` | Growth in a Potential-Field | Delphi | 2006 | `30_potDevProb.zip` | klein | 1 | umgesetzt | Zellen entwickeln sich, wenn ihr Potential einen Schwellenwert übersteigt (mit Wahrscheinlichkeit p); das Potential mittelt sich um entwickelte Zellen – korallenartige Verästelung. |
| 15 | `diffusionsfeld-wachstum` | Growth in a Diffusion-Field | Delphi | 2006 | `31_diffusionGrowth.zip` | klein | 1 | umgesetzt | Je Schritt wird die Randzelle mit dem höchsten Potential (plus Rauschen) entwickelt; das Feld wird ausgemittelt und im Abstand R auf 1 gesetzt (Batty, Kap. 3). |
| 16 | `schneeflocke` | Snow Flake Growth | Delphi | 2006 | `32_snowFlake.zip` | klein | 1 | umgesetzt | Gewichteter Automat nach Reiter: rezeptive Zellen erhalten konstanten Zuwachs, die übrigen mitteln; ab Potential 1 entwickelt – symmetrische Schneekristalle. |
| 17 | `kristallwachstum` | Crystal Growth | Delphi | 2006 | `33_crystalGrowth.zip` | mittel | 2 | umgesetzt | Erweiterung von Snow Flake: Diffusion mit gewichteter Nachbarschaft, Kristallisation unter einem Unterkühlungswert U mit Rauschen und Interface-Effekt. |
| 18 | `nl-zellulaerer-automat` | 02 cellular Automata | NetLogo | 2005 | `celluAutomata03.nlogo` | klein | 1 | umgesetzt | Zellulärer Automat mit vier Reglern: Mindest- und Höchstzahl der Nachbarn zum Überleben und zur Geburt. |
| 19 | `nl-reakt-diffuse-1` | 03 reakt diffuse | NetLogo | 2005 | `reaktDiffuse02.nlogo` | klein | 2 | umgesetzt | Zwei Substanzen diffundieren und begrenzen sich an Grenzen zu Flächenteilungen; Code nach einem Skript von Paul Coates (CECA). |
| 20 | `nl-reakt-diffuse-2` | 04 repel and reakt diffuse | NetLogo | 2005 | `reaktDiffuse03.nlogo` | klein | 2 | aufgenommen → `nl-reakt-diffuse-1` | Sich abstoßende Turtles prägen Keime in ein Reaktions-Diffusions-Feld; die Flächenteilung folgt ihrer Verteilung. |
| 21 | `nl-gebaeudestruktur` | 12 Buildings Structure | NetLogo | 2007 | `CA_buildingStructure.nlogo` | klein | 1 | aufgenommen → `nl-zellulaerer-automat` | Zellulärer Automat, dessen Ergebnis eine Fläche mit Gebäuden füllt; misst das Verhältnis bebauter Zellen. |

## Wege, Graphen und Verkehr

| Nr. | id | Titel | Herkunft | Jahr | Quelle | Umfang | Welle | Status | Kurzbeschreibung |
|---|---|---|---|---|---|---|---|---|---|
| 22 | `erreichbarkeit` | Erreichbarkeitsanalyse | Delphi | 2005 | `17_Erreichbarkeit.zip` | klein | 1 | aufgenommen → `gravitation` | Gezeichneter Graph aus Knoten und Kanten; Zeilensummen der Distanzmatrix als Maß der Verknüpftheit, Streuwert und mittlere Verbindungslänge. |
| 23 | `gravitation` | Gravitationsmodell | Delphi | 2005 | `310_Gravitation.zip` | klein | 1 | umgesetzt | Ströme zwischen Orten nach F_ij = P_i · P_j / d_ij²; die Größe der Orte ist veränderbar, die Linienstärke zeigt die Intensität. |
| 24 | `a-stern` | Shortest Path with A* | Delphi | 2005 | `13_Pathfinding.zip` | klein | 1 | umgesetzt | Kürzester Weg vom Start zum Ziel im Raster mit A*; Hindernisse dürfen nicht diagonal geschnitten werden. |
| 25 | `graph-pfad` | Pathfinding in unregelmäßigem Graph | Delphi | 2005 | `14_graphPath.zip` | klein | 2 | aufgenommen → `wegenutzung` | A* in einem beliebigen zusammenhängenden Graphen, der wie bei 09_christaller erzeugt wird. |
| 26 | `wegenutzung` | Wegenutzung und das Finden kürzester Pfade | Delphi | 2005 | `342_kuerzestePfade.zip` | mittel | 2 | umgesetzt | Zufällige Start- und Zielpunkte werden mit A* verbunden; die Nutzungshäufigkeit der Wegabschnitte erscheint als Linienstärke, Markierungen verfallen. |
| 27 | `verkehrsaufkommen` | Verkehrsaufkommen | Delphi | 2007 | `343_Verkehrsaufkommen.zip` | groß | 3 | umgesetzt | Agenten bewegen sich auf A*-Routen durch ein Raster; das entstehende Verkehrsaufkommen wird über die Zeit aufgezeichnet. |
| 28 | `wegesystem-selbstorganisation` | Selbstorganisation bei Wegesystemen (Path System 01) | Delphi | 2006 | `331_SelbstorgaWegeSys.zip` | mittel | 1 | umgesetzt | Agenten im Random Walk hinterlassen Markierungen und folgen ihnen im Sichtbereich (angle threshold) per Hill Climbing oder Roulette Wheel; ein Wegesystem organisiert sich selbst (Schweitzer). |
| 29 | `schleimpilz` | Slime Mold | Delphi | 2006 | `37_slimeMold.zip` | mittel | 2 | aufgenommen → `wegesystem-selbstorganisation` | Path System 01 mit Diffusion und Verfall der Markierungen: wandernde, verschmelzende Cluster wie beim Schleimpilz (Resnick). |
| 30 | `quellen-ziele` | Quellen und Ziele der Bewegungen (Path System 02) | Delphi | 2006 | `332_Quellen_Ziele_Kopie.zip` | mittel | 2 | umgesetzt | Zehn Home Cells und eine Center Cell: Agenten suchen das Zentrum und kehren markierend heim; es entsteht ein stabiles Netz zwischen Quellen und Ziel. |
| 31 | `optimiertes-wegesystem` | Optimiertes Wegesystem (Evolutionary Network) | Delphi | 2006 | `333_OptiWege.zip` | groß | 3 | umgesetzt | Path System 02 mit Energiehaushalt: angle und wiggle threshold der Agenten werden per genetischem Algorithmus optimiert, Fitness = gefundene Wege. |
| 32 | `active-walker` | Active Walker | Delphi | 2006 | `40_activeWalker.zip` | klein | 1 | umgesetzt | Ein Walker verändert eine Erreichbarkeitsfläche (Landscape Rule) und läuft stets zur schlechtest erreichbaren Nachbarzelle (Stepping Rule) – er erreicht sein Ziel nie (Batty, Kap. 5). |
| 33 | `multi-walker` | Multi Walker | Delphi | 2006 | `41_multiWalker.zip` | klein | 2 | aufgenommen → `active-walker` | Active Walker mit Diffusion, Rauschen und mehreren Walkern; bei starker Diffusion finden sich die Walker zu Clustern. |
| 34 | `interaktionsmodell` | Agentenbasiertes Interaktionsmodell (Interaction Pattern) | Delphi | 2006 | `320_AgInteraktModell.zip` | mittel | 2 | umgesetzt | Agenten erkunden vom Ursprungsort aus ein Zellenfeld und markieren den Rückweg von Zielorten; stark markierte Pfade entstehen, Zufallsfehler halten die Suche offen (Batty, Kap. 5). |
| 35 | `nl-wegesystem-a` | 06 wegesystem A | NetLogo | 2005 | `wegesystem01.nlogo` | klein | 1 | aufgenommen → `nl-wegesystem-b` | Turtles prüfen die acht Nachbarzellen und laufen bevorzugt Markierungen nach (path-attract); Markierungen verfallen (decrease-per-tick). |
| 36 | `nl-wegesystem-b` | 07 wegesystem B | NetLogo | 2005 | `wegesystem02direction.nlogo` | klein | 1 | umgesetzt | Wie Wegesystem A, aber nur die drei Zellen vor dem Turtle zählen (geradeaus, schräg links, schräg rechts); ein zusammenhängendes, oft orthogonales Wegesystem entsteht. |
| 37 | `nl-flusssystem` | 08 flusssystem | NetLogo | 2005 | `05_wegesys_attrakt.nlogo` | klein | 2 | umgesetzt | Viele Quellen streben einem per Mausklick gesetzten Ziel zu; die Spuren bündeln sich wie ein Flusslauf (nach Tomor Elezkurtaj, TU Wien). |
| 38 | `nl-wegesystem-b-update` | 09 wegesystem B update 1 | NetLogo | 2005 | `wegesystem04.nlogo` | klein | 2 | aufgenommen → `nl-wegesystem-b` | Wegesystem B mit per Maus eingezeichneten Wegen und Anzeige starker Markierungen (show-mark-over); das Raster als gemeinsamer Speicher. |

## Bodenmarkt und Standortwahl

| Nr. | id | Titel | Herkunft | Jahr | Quelle | Umfang | Welle | Status | Kurzbeschreibung |
|---|---|---|---|---|---|---|---|---|---|
| 39 | `thuenen-ringe` | Die Thünenschen Ringe | Delphi | 2008 | `412_ThuenenRinge.zip` | klein | 1 | umgesetzt | Jede Zelle baut das Produkt mit der höchsten Lagerente an (Ertrag, Preis, Kosten, Transportkosten × Distanz zum nächsten Markt); um die Märkte entstehen Ringe. |
| 40 | `thuenen-verhandlung` | Verhandlungsmodell für die Landnutzung nach v. Thünen | Delphi | 2008 | `413_ThuenenVerhandel.zip` | mittel | 1 | umgesetzt | Landwirte mit gegebenem Produkt tauschen Parzellen im Tauschradius, wenn sie dort mehr Gewinn erzielen; bei Konkurrenz gewinnt der höhere Gewinn. |
| 41 | `alonso` | Alonsos Modell der Standortwahl der Betriebe | Delphi | 2008 | `414_Alonso.zip` | mittel | 2 | umgesetzt | Gewinnmaximaler Standort und Betriebsgröße städtischer Unternehmen aus Umsatz, Produktions- und Bodenkosten in Abhängigkeit von Entfernung und Fläche (Alonso 1960). |
| 42 | `skalenertraege` | Skalenerträge | Delphi | 2005 | `415_Skalenertraege.zip` | mittel | 1 | umgesetzt | Märkte mit sinkenden Stückkosten bei mehr Absatz konkurrieren um Einzugsgebiete; Fahrtkosten und Preis gleichen sich an den Grenzen aus, lokale Monopole entstehen. |
| 43 | `krugman` | Krugmans Modell | Delphi | 2005 | `26_Krugman_Model.zip` | klein | 2 | umgesetzt | Zentripetale und zentrifugale Potentiale (K1, K2, α, β) bestimmen das Bevölkerungswachstum je Ort; aus einer Zufallsverteilung entstehen mehrere zentrale Orte (Krugman 1996). |
| 44 | `zentrale-orte` | Zentralität und zentrale Orte | Delphi | 2005 | `09_christaller.zip` | mittel | 2 | umgesetzt | Zentren dreier Ränge (rot, blau, gelb) lagern sich hierarchisch aneinander an, gesteuert über Anlagerungsdistanzen (nach Christaller). |
| 45 | `separation` | Separation durch Standortpräferenzen | Delphi | 2005 | `421_Separation.zip` | mittel | 2 | umgesetzt | Agenten zweier Nutzungen (z. B. Gewerbe mit Emissionen, Wohnen) markieren ihre Umgebung und meiden die Flächen der anderen; Cluster um Anlagerungspunkte. |
| 46 | `flaechenverteilung` | Verteilung verschiedener Flächennutzungen | Delphi | 2007 | `422_Flaechenverteilung.zip` | groß | 3 | umgesetzt | Siedlungs- und Landnutzungsmuster kombiniert mit Interaktionsmustern; mit Rang-Größe-Analyse. |

## Residentielle Segregation

| Nr. | id | Titel | Herkunft | Jahr | Quelle | Umfang | Welle | Status | Kurzbeschreibung |
|---|---|---|---|---|---|---|---|---|---|
| 47 | `segregation-eigenschaft` | Segregation durch Eigenschaftsanpassung | Delphi | 2005 | `522_SegregationEigenschaft.zip` | klein | 1 | umgesetzt | Jede Zelle übernimmt die Eigenschaft (Bier- oder Weintrinker) der Mehrheit ihrer Moore-Nachbarschaft; das Muster ist stabil gegen Störungen. |
| 48 | `segregation-standort` | Segregation durch Standortwahl | Delphi | 2005 | `521_SegragationStandort.zip` | klein | 1 | umgesetzt | Agenten zweier Typen ziehen um, wenn in ihrer Moore-Nachbarschaft zu wenige Gleiche wohnen (nach Schelling); Grundmodell einfach und erweitert (Toleranz, Parameterraum). |
| 49 | `zentrale-orte-konkurrenz` | Konkurrenz um zentrale Orte | Delphi | 2006 | `560_KonkurrenzZentrOrte.zip` | klein | 2 | umgesetzt | Segregation durch Ortsveränderung mit Märkten, denen die Agenten nahe kommen wollen; Verdichtung um Zentren und Segregation nach Zentren. |
| 50 | `standort-skalenertraege` | Interaktionsmodell Standortwahl und Skalenerträge | Delphi | 2006 | `570_Interakt_Standort_Skalenertr.zip` | mittel | 2 | umgesetzt | Segregation und Skalenerträge kombiniert: Kunden wählen ihren Standort nach Marktnähe und Nachbarschaft; die Mobilität verstärkt die Monopolbildung. |
| 51 | `mietpreisdynamik` | Einbeziehung der Mietpreisdynamik | Delphi | 2007 | `550_Mietpreisdynamik.zip` | groß | 3 | umgesetzt | Segregationsmodell mit Mietpreislandschaft (rentScape): Toleranz, Zahlungsbereitschaft und Mieten wirken zusammen; mit Stabilitäts- und 3D-Analysen. |
| 52 | `strassen-segregation` | Wirkung von Straßen auf die Segregation | Delphi | 2008 | `580_Wirkung_StrassenSegregat.zip` | groß | 3 | aufgenommen → `mietpreisdynamik` | Segregationsmodell mit Straßen, die Nachbarschaften trennen oder verbinden; Analyse von Wachstum und Straßen. |
| 53 | `circle-city` | Modell „Circle City“ | Delphi | 2008 | `590_Circle_City.zip` | groß | 3 | umgesetzt | Hierarchisches Netz (HieNet) mit Agenten sowie Phasenübergangs- und Raumanalysen. |
| 54 | `nl-voting` | 05 voting with four colors | NetLogo | 2005 | `vote4col.nlogo` | klein | 2 | umgesetzt | Wahlmodell mit vier Farben: Zellen übernehmen Farben nach Nachbarschaftsregeln mit Reglern je Farbe; stabile Wertebereiche suchen. |
| 55 | `nl-territorien` | 10 territory fight 01 | NetLogo | 2005 | `07_territoryFight_3.nlogo` | klein | 2 | umgesetzt | Grundmodell zur Flächenteilung: Gruppen kämpfen um Territorien (Fortsetzung von reakt diffuse 01). |
| 56 | `nl-kulturen` | 11 Krieg der Kulturen | NetLogo | 2005 | `08_culturesFight09.nlogo` | mittel | 2 | umgesetzt | Kulturen mit 8-Bit-Gencodes breiten sich aus, mutieren und verdrängen schwächere (nach Jossen und Eyer, fraktalwelt.de). |

## Formen, Packungen und Rekursion

| Nr. | id | Titel | Herkunft | Jahr | Quelle | Umfang | Welle | Status | Kurzbeschreibung |
|---|---|---|---|---|---|---|---|---|---|
| 57 | `ueberlagerungsflaechen` | Überlagerungsflächen | Delphi | 2005 | `05_rechtClipping.zip` | klein | 2 | umgesetzt | Berechnung der Überlagerungsflächen von Rechtecken; Variante mit Cohen-Sutherland-Algorithmus. |
| 58 | `dichte-packungen-1` | Dichte Packungen I | Delphi | 2005 | `06_minUeberschn.zip` | klein | 1 | umgesetzt | Eine evolutionäre Strategie minimiert die Summe der Überschneidungsflächen zufälliger Rechtecke (nach Elezkurtaj und Franck), bis sie unter 100 Pixel liegt. |
| 59 | `dichte-packungen-2` | Dichte Packungen II | Delphi | 2005 | `07_packingScale.zip` | klein | 2 | aufgenommen → `dichte-packungen-1` | Wie Dichte Packungen I, zusätzlich variieren die Rechtecke Höhe und Breite bei gleicher Fläche. |
| 60 | `vba-2dwachstum-1` | 2Dwachstum01 | AutoCAD-VBA | 2004 | `experiment01.htm` | klein | 2 | umgesetzt | Würfel breiten sich per Zufallsgenerator in der x-y-Ebene aus; einige überschneiden sich. |
| 61 | `vba-2dwachstum-2` | 2Dwachstum02 – weiterbearbeitete Struktur | AutoCAD-VBA | 2004 | `experiment02.htm` | klein | 2 | aufgenommen → `vba-2dwachstum-1` | Die Struktur wandert zufällig in der Ebene; ist ein Feld besetzt, weicht sie nach oben oder unten aus. |
| 62 | `vba-wanderwuerfel` | 2Dwachstum03 – Wanderwürfel | AutoCAD-VBA | 2004 | `experiment03.htm` | klein | 2 | aufgenommen → `vba-2dwachstum-1` | Ohne Mehrfachbelegung wächst die Würfelstruktur frei im Raum; die Variable num verschiebt die dreidimensionale Rasterung. |
| 63 | `vba-skalieren` | 2Dwachstum04 – Skalieren und Drehen | AutoCAD-VBA | 2004 | `experiment04.htm` | klein | 3 | nur_bilder | Spielereien mit Skalieren und Drehen der Würfelstrukturen; nur Bilder, kein Text. |
| 64 | `vba-rekursion` | Rekursive Strukturen 01 – Verzweigungsstrukturen | AutoCAD-VBA | 2004 | `iteration01.htm` | klein | 1 | umgesetzt | Jeder Würfel verzweigt sich rekursiv in eine Anzahl weiterer Würfel, Geschoss für Geschoss wie eine Baumstruktur. |
| 65 | `vba-rekursion-3d` | Rekursive Strukturen 02 – dreidimensionale Wachstumsstrukturen | AutoCAD-VBA | 2004 | `iteration02.htm` | klein | 2 | aufgenommen → `vba-rekursion` | Weitere rekursive Wachstumsstrukturen im Raum. |
| 66 | `vba-hoehenstaffelung` | Rekursive Strukturen 03 – Höhenstaffelung | AutoCAD-VBA | 2004 | `iteration03.htm` | klein | 2 | aufgenommen → `vba-rekursion` | Die Struktur entwickelt sich auf bereits gesetzten Feldern in die Höhe, mit vorgeschriebener Zahl der Geschosse. |
| 67 | `vba-objektkoordinaten` | objectCoordinates – Manipulation der Object-Vertices | AutoCAD-VBA | 2004 | `03objCoordinates.htm` | klein | 3 | zurueckgestellt | Erzeugt Polyeder und verschiebt einzelne Eckpunkte (Würfel mit verzogener Ecke). |
| 68 | `vba-konvexe-huelle` | convexHull – Hülle um beliebig verteilte Punkte | AutoCAD-VBA | 2004 | `04convexHull.htm` | klein | 2 | umgesetzt | Konvexe Polylinie um eine zufällige Punktmenge. |
| 69 | `vba-eingabefeld` | eingabefeld – Parameter über Eingabefeld steuern | AutoCAD-VBA | 2004 | `eingabefeld.htm` | klein | 3 | zurueckgestellt | Technikdemo: Parameter über ein Eingabefeld an das Modul zur Platzierung der Würfel übergeben. |
| 80 | `kremlas-dichte-packung` | KREMLAS · Dichte Packung | C# | 2011 | `` | groß | 3 | verschoben | Eine hybride Evolutionsstrategie mit Kollisionserkennung (Abstoßen und Proportionsänderung nach dem Separating Axis Theorem) packt Räume fester Fläche überlappungsfrei in einen Umriss; virtuelle Federn erzeugen geforderte Nachbarschaften (Stern, Gang mit drei Wohnungen); als Grundriss-Generator entstehen daraus Wände und Türen (Raumprogramm mit 6, 8 oder 10 Räumen, Topologie Stern oder Wohnung); eine Suche sammelt Grundrisse, die Türen und Mindestmaße einhalten. |

## Wachstumsmodell urbaner Strukturen

| Nr. | id | Titel | Herkunft | Jahr | Quelle | Umfang | Welle | Status | Kurzbeschreibung |
|---|---|---|---|---|---|---|---|---|---|
| 70 | `wachstumssimulation` | Wachstumssimulation urbaner Strukturen | Delphi | 2008 | `600_Wachstumssimulation.zip` | groß | 3 | umgesetzt | Wachsende Stadt aus Erschließungsgraph, Potentialfeld und Parzellen (growingCity); enthält auch „Generieren eines Erschließungsgraphen“ (3.4.1). |

## Flash-Skizzen

| Nr. | id | Titel | Herkunft | Jahr | Quelle | Umfang | Welle | Status | Kurzbeschreibung |
|---|---|---|---|---|---|---|---|---|---|
| 71 | `flash-fibonacci-1` | Fibonacci 01 – Sonnenblume | Flash | – | – | klein | 1 | nur_beschreibung | Blätter im goldenen Winkel mit wachsendem Abstand (growth); andere Verteilungen erzeugen Wirbel statt Sonnenblumensymmetrie. |
| 72 | `flash-fibonacci-2` | Fibonacci 02 – erweitert | Flash | – | – | klein | 2 | nur_beschreibung | Phyllotaxis mit growX/Y, x-/yScale, degenerate (Veränderung des goldenen Schnitts), startRad und maxLeaves; Bezug Zvi Heckers Schule in Berlin. |
| 73 | `flash-zeit-1` | Zeit 01 | Flash | – | – | klein | 3 | zurueckgestellt | Animation zum Thema Zeit mit Zitaten aus Ulrich Winko, Zeitspur (2000); keine Beschreibung des Ablaufs. |
| 74 | `flash-zeit-2` | Zeit 02 | Flash | – | – | klein | 3 | zurueckgestellt | Animation zum Thema Zeit mit Zitaten aus Ulrich Winko, Zeitspur (2000); keine Beschreibung des Ablaufs. |
| 75 | `flash-zeit-2-maus` | Zeit 02-2 (mit Maus) | Flash | – | – | klein | 3 | zurueckgestellt | Animation zum Thema Zeit mit Zitaten aus Ulrich Winko, Zeitspur (2000); keine Beschreibung des Ablaufs. |
| 76 | `flash-zentrum-peripherie-1` | zentrPeriph 01 | Flash | – | – | klein | 3 | zurueckgestellt | Skizze aus dem „Labor“ („Im Labor brodelt es …“); nur SWF ohne Beschreibung. |
| 77 | `flash-zentrum-peripherie-2` | zentrPeriph 02 | Flash | – | – | klein | 3 | zurueckgestellt | Skizze aus dem „Labor“ („Im Labor brodelt es …“); nur SWF ohne Beschreibung. |
| 78 | `flash-eisenman-skalierung` | eisenman scaling | Flash | – | – | klein | 3 | zurueckgestellt | Skizze aus dem „Labor“ („Im Labor brodelt es …“); nur SWF ohne Beschreibung. |
| 79 | `flash-tanz-rechtecke` | tanzRecht | Flash | – | – | klein | 3 | zurueckgestellt | Skizze aus dem „Labor“ („Im Labor brodelt es …“); nur SWF ohne Beschreibung. |
