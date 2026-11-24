# Methode: Parametric Planning Catalogue

Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · Stand 23.11.2026 · Lizenz CC BY 4.0

**App:** https://entwurfsforschung.de/lab/parametric-planning-catalogue/ · **Quellcode:** `katalog/` im Repo entwurfsforschung, je App `quellcode.zip` (enthält `katalog/<app>/`, `katalog/_gemeinsam/`, `simulationen/_gemeinsam/`) · **Einstieg für Agenten:** `katalog/REZEPT.md`, `katalog/bestand.json`, dann je App `AGENTS.md` und `QUELLE.md`

## Frage

Die Grasshopper-Module des Parametric Planning Catalogue (2020) werden einzeln als Web-Apps neu umgesetzt: fachlich treu zu Verfahren, Parametern und Begriffen der .gh-Dateien, lauffähig im Browser ohne Rhino, offen weiterentwickelbar. Dazu kommen die tragfähigen Modelle aus dem DeCodingSpaces Lab (Forschungsprojekte, Workshops, Werkzeuge 2018–2020) als eigener Abschnitt. Die Sammlung zeigt die Bausteine integrierter Planung – Sichtbarkeit, Parzellierung, Straßennetze, Wasser, Gelände, Nutzung, Optimierung – so, dass man jedes Verfahren Schritt für Schritt ablaufen sehen und mit den Reglern des Originals untersuchen kann.

## Vorbild und Quellen

- **Katalog:** Parametric Planning Catalogue, DecodingSpaces · ECL-AA · InfAR (Professur Informatik in der Architektur und Urbanistik), Bauhaus-Universität Weimar, 2020; https://infar-buw.github.io/parametric-planning-catalogue/, Quellen https://github.com/infar-buw/parametric-planning-catalogue, **MIT-Lizenz** (Copyright (c) 2020 infar-buw). Autorinnen und Autoren je Modul (Martin Bielik, Ekaterina Fuchkina, Martin Dennemark, Ondřej Veselý, Reinhard König) in `bestand.json` und QUELLE.md.
- **Komponenten:** DeCodingSpaces Toolbox, https://github.com/Bauhaus-InfAU/decoding-spaces-toolbox (**GPL-3.0**; 2026 aus den Binärdateien 2021/2023 neu aufgebaut, mit Doku `docs/measures.md`, `docs/visibility.md`, `docs/migration.md`, `docs/review-2026-11.md`, `docs/research/legacy-generation.md`), Grafit, https://github.com/Bauhaus-InfAU/Grafit (**MIT**). Die Apps lesen dort Definitionen, Formeln, Voreinstellungen und Randfälle ab und setzen sie in eigenem Code um – **kein Code aus der GPL-Toolbox übernommen**; jede QUELLE.md nennt die genauen Dateien unter „Abgleich mit dem Quelltext“.
- **DeCodingSpaces Lab:** https://toolbox.decodingspaces.net/#lab (Computational Planning Group, Bauhaus-Universität Weimar). Die Lab-Seiten nennen keine Lizenz; Grasshopper-Dateien, Seitentexte und Paper werden nur gelesen. Vorbilder u. a. Bielik et al. 2019 (SSS12, Multiplikatoreffekt), König, Bielik, Schneider 2018 (SimAUD, Stadtdynamik), Miao, König et al. 2018 (IJAC, https://doi.org/10.1177/1478077118798395), Gavrilov et al. 2020 (Procedia Manufacturing 44, https://doi.org/10.1016/j.promfg.2020.02.214, Magnetizing Floor Plan Generator; Quellcode ohne Lizenz, nur gelesen), Osintseva et al. 2020 (SimAUD, DigiWo), Morschek, König, Schneider 2019 (SimAUD, Hochwasser), Veselý, König 2018 (ÖPNV-Isochronen).
- **Weitere Vorbilder** je App, z. B. polysplit (G. Rimša, MIT) für die Parzellierung nach Fläche, Gismo (Dj. Spasić, GPL-3, nur Verfahren) für den Regenwasserabfluss als Vektor, SpiderWeb (R. Schaffranek) für den Gittergraphen der Serpentinen, EPANET (L. Rossman, US EPA, MIT) und das Gradientenverfahren von Todini & Pilati (1988) für die Rohrnetze; Isovist-Literatur: Benedikt (1979, https://doi.org/10.1068/b060047), Batty (2001, https://doi.org/10.1068/b2725), Turner et al. (2001, https://doi.org/10.1068/b2684).
- **Bewusst anders:** Beispielszenen statt Rhino-Geometrie, feste Saat, ein „Schritt“ als Rechenschritt, behobene Programmfehler des Originals (je App unter „Bewusst geändert“), wo die Toolbox 2026 alte Fehler dokumentiert (z. B. Standardabweichung des Isovists als Summe absoluter Abweichungen), rechnen die Apps nach der korrigierten Definition und sagen das.

## Darstellung

Ebene Geometrie in Metern (y nach unten), von oben gesehen: Polygone (Gebäude, Blöcke, Parzellen), Straßennetze als Segmente mit dualem Segmentgraph in zwei Fahrtrichtungen (`Geo.richtungsGraph`, Kosten nach DeCodingSpaces 2020 `kL·d/l_max + kW·θ/180°` oder Toolbox v2), Strahlen für 2D-Isovisten, Höhenraster für Gelände (bilinear, Schummerung und Höhenlinien), Rohrnetze als Knoten-Kanten-Graph mit Hydraulik in SI-Einheiten. Modell (`modell.js`, ohne DOM) und Oberfläche (`app.js` mit dem Rahmen `simulationen/_gemeinsam/sim.js`) sind getrennt; gemeinsame Bausteine in `katalog/_gemeinsam/` (`geo.js`, `szenen.js`, `karte.js`).

## Korpus

Kein Korpus echter Städte. Maßstab sind die Module selbst: die .gh-Dateien (mit der GH_IO.dll von Rhino 8 ohne Rhino in XML gewandelt; Schieberegler mit Wert und Bereich, Wertelisten, Notizen, Verdrahtung, Cluster, C#-/Python-Skripte), Beschreibungen und GIFs des Katalogs, der Quelltext der Toolbox und Grafit. Beispieldaten des Katalogs, die als Prüfstein dienen, liegen bei den Tests (EPANET-Netze `Testnet.inp`, `hydroanalysis1.inp`, MIT). Die Szenen (Stadt mit Straßenraster, Blöcken, Gebäuden, Platz und Kirche; Gelände mit Berg und Tälern) erzeugt `szenen.js` mit fester Saat – vergleichbar mit den Rhino-Dateien, aber nicht gleich. Bestand (`bestand.json`, 23.11.2026): Katalog 27 Module – 24 als Web-App umgesetzt, 1 als Teil einer App (Placement on Parcel in „Vom Straßennetz zum Gebäude“), 2 nicht umgesetzt (mit Begründung); DeCodingSpaces Lab 23 Einträge – 9 umgesetzt, 7 durch vorhandene Apps abgedeckt, 7 ohne eigenes Modell (mit Begründung).

## Generator

Je Modul das Verfahren der .gh-Datei, als Schritte abspielbar:

- **Sichtbarkeit:** Isovist von einem Punkt, als Feld auf einem Analysegitter (Flutfüllung vom Füllpunkt), entlang eines Weges mit Verlaufsdiagramm, Sichtbarkeit von Objekten (Strahltreffer je Kante/Gebäude); 17 Kenngrößen nach den Definitionen der Toolbox v2.
- **Parzellierung:** Slicing Tree nach `STreeExtended` (Straßenkante, Teilungsverhältnis, Rücken an Rücken), Voronoi aus Randpunkten mit Network Smooth (Ketten, Anker), Teilung nach Fläche mit kürzestem Schnitt (polysplit), Kantenversatz nach Betweenness, Grundstücke aus dem Straßennetz (kleinste Zyklen) mit Neigungsfilter.
- **Netze:** kürzester Weg (einfach, Dijkstra, Floyd–Warshall) im gerichteten Segmentgraphen, Straßenhierarchie aus gewichteter Betweenness (Brandes, Gewichte für Stadteingänge und Points of Interest), genetische Optimierung von Straßennetzen (Instruktionsbaum als Chromosom, zwei Ziele Länge und Closeness, SPEA2-artige Auswahl).
- **Gelände und Wasser:** Serpentinen als kürzester Weg mit Steilheitskosten auf einem 8er-Gittergraphen, Ringstraßen aus bewerteten Zellen bis zur Sollfläche, Regenwasserabfluss als D8-Raster mit Einzugsgebieten und als Fließlinien, Betroffenheit von Straßen bei Starkregen, Wasserleitung und Wassernetz mit Rohrnetzberechnung (Hazen–Williams, Gradientenverfahren) und automatischer Rohrdimensionierung.
- **3D und Bebauung:** Isovist 3D (Strahlen in Winkelraster gegen Prismen, Kategorien Himmel/Hindernis/Boden), Kette Straßennetz → Blöcke → Parzellen → Baufenster → Gebäude mit Vorlagen auf Parzellen, Windrichtung und Belastung je Parzelle aus einer Windrose, Straßenwachstum nach dem Wasserabfluss (Verfahren nach Procedural Cities mit Geländehöhe als Grauwert).
- **DeCodingSpaces Lab:** Multiplikatoreffekt (Rückkopplung Bewegungspotenzial ↔ Nutzung), Stadtdynamik (Raster- und Netzstadt, Systemdynamik), Stadtsynthese (Workshop-Kette mit Space-Syntax-Kennzahlen), magnetischer Grundrissgenerator (Raster, Flure, quasi-evolutionär), Baublock-Generator (Abstandsflächen, Aktionen), Hochwasser (steigender Pegel, Priority-Flood), Dichtefeld (GSI je Radius), Sichttiefe (Sichtbarkeitsgraph, Breitensuche), ÖPNV-Isochronen (Fuß- und Liniennetz mit Takt).
- **Nutzung:** iterative Verteilung von Wohnen, Gewerbe, Industrie nach Profilen aus Zentralität, Erreichbarkeit, wahrgenommener Entfernung und gegenseitiger Anziehung (Roulette-Rad, Dichtegrenze).

Zufall nur mit Saat (`simulationen/_gemeinsam/zufall.js`); Regler und Klick rechnen wie in Grasshopper sofort zu Ende, „Zurück“ und „Start“ zeigen den Ablauf ab Schritt 0.

## Prüfer

Treue zum Modul und erwartetes Verhalten, nicht Echtheit gegen reale Städte:

- **`node --test`** je App und für `_gemeinsam/`: nachgerechnete Beispiele (Isovist im leeren Raum = Kreis, Raum 20 × 20 m, Verdeckung hinter einer Wand; T-Kreuzung mit beiden Kostenformeln; Rohr, parallele Rohre und Masche gegen Handrechnung bzw. Hardy-Cross), Grenzfälle, gleiche Saat → gleicher Lauf, ein Verhalten aus der Katalogbeschreibung (z. B. jede Parzelle behält eine Straßenkante, Eingangssegmente werden Hauptstraßen, steile Straßen quer zum Hang sind stark betroffen). Stand 23.11.2026 (Runde 3): 33 Apps und 81 gemeinsame Tests, alle grün.
- **Gegenprobe an Originaldaten:** Die Rohrdurchmesser aus der Dimensionierungsschleife des Originals (`hydroanalysis1.inp`, 708 Knoten) ergeben im eigenen Löser höchstens 1,49 m/s bei der Grenze 1,5 m/s und Drücke von 2,5 bis 15,9 bar – genau der Bereich, den das Modul anstrebt.
- **`pruef_ausdruck`** in `app.json` (fachliche Kennzahl nach den Vorschauschritten) und **`katalog/pruefe_apps.py`** (Browser, hell/dunkel, 1440/390 px, Start/Pause/Schritt/Zurück, Pflichtlinks, kein waagerechtes Scrollen, Kachelbilder); **`pruefe.py`** prüft den Bau (Pflichtdateien, Link zum Katalogeintrag, Quellcode-Paket, Begründung jedes nicht umgesetzten Moduls). Bildschirmfotos werden angesehen.

## Handschrift

Gar nicht im Sinne eines Stils: Die Module sind Analyse- und Planungswerkzeuge. Was sie an Haltung tragen, steckt in den Voreinstellungen der Autorinnen und Autoren (Gewichte, Schwellen, Profile) und bleibt sichtbar und veränderbar. Die Entscheidung, welche Variante taugt, bleibt beim Menschen.

## Was trägt

- **.gh ohne Rhino lesen:** GH_IO.dll → `GH_Archive.Serialize_Xml()`, dann kleine Auszugsskripte für Regler, Verdrahtung, Cluster und Skripte (`katalog/REZEPT.md`).
- **Gemeinsame Bausteine** in `katalog/_gemeinsam/` (Runde 3 aufgeräumt, 23.11.2026): `geo.js` (Isovist, gerichteter Segmentgraph mit Radius, Voronoi, Polylinien), `szenen.js` (Stadt, Quartier, Gelände), `karte.js` (Farbskalen, Verlauf, Gelände mit Zwischenspeicher), `axonometrie.js`, `flaechen.js`, `generierung.js` (Instruktionsbaum, Slicing Tree), `hierarchie.js`, `hydraulik.js`, `raster.js` (Priority-Flood, Shadowcasting, Marching Squares) – 81 Tests in `_gemeinsam/test/`. Beim Umzug blieb das Verhalten jeder App gleich: Fingerabdruck des Zustands nach den Vorschauschritten (fester Saat, 6 Stellen, SHA-1) vorher = nachher für alle 33 Apps, Zeichnungen der Axonometrie-Apps pixelgleich.
- **Quelltext als Schiedsrichter:** Vermutungen aus Runde 1 (ungerichteter Graph, eigene Kostenformel, Isovist-Momente, Slicing-Tree-Regeln, Network Smooth) wurden am Toolbox-Quelltext geprüft und korrigiert; die Apps nennen beide Definitionen, wo das Original von der heutigen abweicht.
- **Ein Schritt = ein Rechenschritt** macht Verfahren sichtbar (Suchfront, wachsende Betweenness, Schnitt für Schnitt, Iteration des Gradientenverfahrens).

## Stolperfallen

- **Lizenzen:** Katalog MIT, Toolbox GPL-3, Gismo GPL-3, Procedural Cities (phiresky) AGPL-3, Magnetizing Floor Plan Generator ohne Lizenz, Lab-Seiten ohne Angabe, einzelne Paper CC BY-NC-ND → nur Verfahren übernehmen, keinen Code; Quellen mit Lizenz nennen.
- **Verlorene Fassungen:** Der Code der Komponenten von 2020 ist zum Teil verloren; die Toolbox 2026 rechnet absichtlich anders. Lösung: nach Doku der alten Fassung (Migrations- und Review-Notizen) rechnen, Abweichungen benennen.
- **Fehler in den .gh-Dateien** (vertauschte Regler, Teilen durch null, nicht laufendes Maximum in Flow Paths) werden behoben und benannt.
- **Gemeinsamer Weg durch Gebäude:** Der erste gemeinsame Szenen-Pfad lief durch Gebäude; Wege bilden die Apps jetzt aus dem Straßennetz.
- **Parallele Agenten im selben Worktree:** gemeinsame Dateien nur mit Edit an der eigenen Stelle ändern, danach alle betroffenen Tests.

## Offen

- Noch nicht vereinheitlicht (leicht abweichende Fassungen): `remap` 0…1 (serpentinen, ringstrassen, nutzungsverteilung, wasserbasiertes-wachstum), Polylinien-Glättung offen/geschlossen (serpentinen, ringstrassen), `imGebaeude` (Isovist-Apps).
- Lab: „Dynamic Urban Development Model“ als Kopplung von Stadtdynamik und Stadtsynthese; echte Windrose für Weimar aus dem Global Wind Atlas (CC BY 4.0, Zitiersatz und Davis et al. 2023) – die Daten liegen nur hinter einer internen API und müssen einmal im Browser („Plot data“) geholt werden.
- Ungeklärt ohne den alten Quelltext: Bedeutung von „d“ in der Legacy-Kostenformel, Glättung in Flow Paths, PISA-Selektor der Netzoptimierung, Faktor 0.00005787 im Wassernetz (jetzt als Spitzenfaktor 5 ausgewiesen, Annahme).
