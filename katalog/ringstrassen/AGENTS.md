# AGENTS.md · Ringstraßen

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Ring Roads“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Ondřej Veselý, Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/RingRoads/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/ringstrassen/
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
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild Parametric Planning Catalogue (MIT) nennen.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z` (enthält `t` = Schrittzahl) |
| `schritt(z, param)` | ein Schritt; erhöht `z.t` |
| `aendere(z, param, id)` | optional: Parameter ohne Neustart übernehmen |
| `zellen(G, R)`, `neigungen(Z)` | Zellen (Mitte, Fläche auf dem Gelände, Breite), Neigung der geglätteten B-Spline-Fläche |
| `abstandStrassen(q, S)`, `werte(Z, zentrum, S)` | kleinster 3D-Abstand zu Polylinien, die vier Werte je Zelle |
| `remap(v)`, `bewerte(W, p)`, `rangfolge(score)` | Remap auf 0…1, gewichtetes Mittel, Sort List |
| `anzahlBis(reihe, flaeche, ziel)`, `flaecheBis(z, n)` | Mass Addition + Smaller Than, Fläche der ersten n Zellen |
| `alphaMaske(Z, gewaehlt, r, f)`, `umrisse(maske)`, `glaetteZu(P, s, t)`, `ring(z, p, n)` | Alpha-Hülle auf dem Raster, Marching Squares, Smooth Polyline (geschlossen), Ringstraße mit Länge |
| `strassen(zufall, G, c)`, `flachsteMitte(G)` | Beispielstraßen und Zentrum |
| `setzeZentrum(z, p, q)`, `abspielen(z)`, `aktuellerUmriss(z, p)`, `fertig(z)` | Zentrum setzen, Wachstum neu zeigen, Umriss der aktuellen Auswahl |

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py ringstrassen` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Straßen selbst zeichnen (Polylinie per Maus) statt der Beispielstraßen.
- Echte Alpha-Shape über eine Delaunay-Triangulation (dann als `Geo.alphaShape` in `_gemeinsam/`).
- Mehr als zwei Ringe (Liste der Flächen) und Zeitschritte als Wachstumsphasen einer Stadt.
- Ringstraße an die bestehenden Straßen anschließen (Kreuzungen markieren) und ihre Steigung auswerten.
