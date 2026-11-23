# AGENTS.md · Isochronen im ÖPNV

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Neuumsetzung des Werkzeugs „Public Transport Isochronal Map“ aus dem DeCodingSpaces Lab (Ondřej Veselý, Reinhard König, AIT 2018; https://toolbox.decodingspaces.net/public-transport-isochronal-map/). Die Originaldateien sind passwortgeschützt; umgesetzt ist das beschriebene Verfahren: Fußwegnetz + Linien mit Takt, Tempo und Haltezeit, Einstieg und Umstieg kosten die mittlere Wartezeit (Takt/2), Dijkstra ab einem oder mehreren Startpunkten, Reisezeit auf Flächen, Straßen oder Gebäuden, Isochronen in vier Stufen, Szenarien A/B im Vergleich. Annahmen und Abweichungen stehen in `QUELLE.md`.

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Parametric Planning Catalogue
  geo.js                   Geo: Polygone, Strahlen, Isovist, Voronoi, Netze, Dijkstra, Floyd–Warshall, Betweenness
  szenen.js                Szenen: Stadt (Straßen, Blöcke, Gebäude, Platz) und Gelände (Höhenraster) mit fester Saat
  karte.js                 Karte: Farbskalen, Polygone, Pfeile, Gelände mit Schummerung und Höhenlinien
katalog/isochronen-oepnv/
  index.html               statische Seite; lädt die Rahmen-Skripte, modell.js, app.js
  modell.js                reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js                   Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js` und `szenen.js`. Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über `sim.css` und die Farben im Objekt `F` (wechselt mit Hell/Dunkel); Farbskalen aus `Karte`.
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild (Eintrag im DeCodingSpaces Lab, Ondřej Veselý, Reinhard König) nennen. Keinen Code aus der GPL-3-Toolbox übernehmen.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | Stadt (`Szenen.stadt`, 3 × 2 km), Fußwegnetz `z.N`, Linien `z.linien` (1, 2, 3, N), Startpunkt; Suchen angelegt, `t = 0` |
| `schritt(z, param)` | Front beider Szenarien wächst um `dt` min (`z.horizont = min(4·stufe, t·dt)`); erhöht `z.t` |
| `fertig(z, param)` | Horizont hat die letzte Isochrone erreicht (oder nichts mehr erreichbar) |
| `sofort(z, param)` / `baue(z, param)` | neu rechnen und zu Ende führen / nur neu anlegen (`t = 0`) |
| `aendere(z, param, id)` | Netzparameter → `sofort`; Darstellung (`ansicht`, `darstellung`, `maus`, `bearbeite`) → nichts |
| `standardLinien(szene, N, adj)`, `standardStart(szene)` | voreingestellte Linien (Rasterindex → Netzknoten) und Startpunkt |
| `route(N, adj, a, b)`, `verlege(N, adj, linie)` | Fahrweg zwischen Halten (Geo.dijkstra nach Länge), Abschnitte und Länge einer Linie |
| `wirksameLinien(linien, p, "a"\|"b")` | Linien eines Szenarios mit Takt und Tempo (B: `neu`, `takt`, `tempo`, `ohne1`) |
| `baueGraph(N, linien, p)` | multimodaler Graph: Fußweg Ebene 0/1, Fahrzustände je Halt und Richtung; Kanten `[ziel, min, art]` |
| `verankere(N, q)`, `startZeiten(N, anker, v)` | Startpunkt auf die nächste Straße loten; Anfangszeiten an deren Knoten |
| `neueSuche(G, start)`, `sucheBis(G, S, h)` | schrittweiser Dijkstra: alle Knoten mit Reisezeit ≤ h werden fest |
| `reisezeiten(G, start)` | dasselbe auf einmal mit `Geo.dijkstra` (Vergleich) |
| `knotenZeiten(G, S)`, `reiseweg(G, S, k)` | Reisezeit je Straßenknoten (min beider Ebenen); Weg mit Zahl der Fahrten und Umstiege |
| `zeitAufKante(N, k, s, tK, startKarte, v)` | Reisezeit an der Stelle s einer Straße |
| `reiseRaster(N, tK, anker, v, R, h, quer)` | Reisezeit-Raster (15-m-Zellen, Querwege ≤ `QUER` = 150 m) |
| `kontur(T, R, w, deckel)` | Isochrone zum Wert w (marching squares) |
| `stufeVon(t, stufe)` | Stufe 0…3, 4 = später, −1 = nicht erreicht |
| `gebaeudeDaten`, `erreicht`, `bilanz(z, w, min)` | Einwohnerschätzung je Gebäude; Fläche/Einwohner/Haltestellen innerhalb min |
| `ergebnis(z, "a"\|"b")` | Knotenzeiten und Raster eines Szenarios (zwischengespeichert je `z.version`) |
| `setzeStart`, `verschiebeStart` | Startpunkt setzen (ersetzen oder hinzufügen/entfernen), ziehen |
| `setzeHalt`, `verschiebeHalt`, `haltBei`, `entferneHalt`, `leereLinie` | Haltestellen bearbeiten (Einfügen an der Stelle des kleinsten Umwegs) |

Zustand: `z.sz.a` / `z.sz.b` = `{G, S}` je Szenario (nicht `z.a`/`z.b` – `z.b` ist die Breite). `app.js` merkt sich bearbeitete Linien und Startpunkte und spielt sie nach „Zurück“ wieder ein (gleiche Saat).

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py isochronen-oepnv` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Echter Fahrplan (Abfahrtszeiten statt Takt/2) und zeitabhängige Suche; Anschlüsse abgestimmt.
- Liniendaten im GTFS-Format laden (z. B. Wiener Linien), Straßennetz aus OpenStreetMap.
- Fußwege um Gebäude herum (Sichtgraph) statt Luftlinie in die Blöcke; Gehgeschwindigkeit nach Steigung.
- Mehr Linien und Verkehrsmittel frei anlegen; Tempo und Takt je Linie statt je Verkehrsmittel.
- Erreichbarkeitsmaße über viele Startpunkte (z. B. mittlere Reisezeit zu allen Einwohnern, Hansen-Potenzial) als Karte.
- Vorschlag für `_gemeinsam/`: `kontur` (marching squares auf beliebigem Raster) und eine Abstandstransformation mit Höchstabstand passen auch für andere Apps; `Geo.Heap` könnte ein `oben()` (kleinster Schlüssel ohne Entnehmen) bekommen.
