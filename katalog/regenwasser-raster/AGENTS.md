# AGENTS.md · Regenwasserabfluss (Raster)

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Rainwater Rundown (Raster)“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/RainwaterRundownRaster/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/regenwasser-raster/
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
| `durchgaenge(smooth)` | Smooth 0…1 → Zahl der Glättungsdurchgänge (0 = glatt → 8, 1 = genau → 0) |
| `abtasten(G, R)` | (R + 1)² Rasterpunkte auf dem Gelände → `{m, d, H}` |
| `abfluss(H, m, d)` | D8: Index des Nachbarn mit dem steilsten Gefälle (Höhenunterschied / Abstand) oder −1 (Senke) – kurze Fließwege |
| `endpunkte(nach)` | lange Fließwege: Endpunkt (Senke) und Länge in Abschnitten je Rasterpunkt |
| `gruppiere(P, dist)` | Point Groups: 3D-Punkte im Abstand ≤ dist transitiv zusammenfassen (Union-Find) |
| `farbfolge(G, saat)` | gemischte Farbstufen der Einzugsgebiete (wie Jitter, Seed 2) |
| `analysiere(z, p)`, `gruppen(z, p)` | ganze Analyse für die Parameter; nur Gruppierung neu |
| `neuerLauf(z)` | Tropfen zurück auf die Rasterpunkte, `t = 0` |
| `fertig(z)` | alle Tropfen stehen und die Einzugsgebiete sind gebildet |
| `lokal(z, q)` | lokale Analyse: Fließrichtung (−Gradient, Einheitsvektor), Neigung °, Höhe |
| `setzePunkt(z, q)` | Analysepunkt setzen (auf das Gelände begrenzt) |

Zustand: `G0` Gelände, `G` geglättet, `m`, `d`, `H` Raster, `nach` (D8), `ende`, `laenge`, `senken`, `gebiet`, `anzahlGebiete`, `groesseGebiet`,
Ablauf `pos` (Rasterpunkt je Tropfen), `teil` (0 … TEILE − 1), `abschnitte`, `durch` (Tropfen je Abschnitt = Abflussmenge), `aktiv`, `gruppiert`, `punkt`.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py regenwasser-raster` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Eigenes Gelände laden (Höhenraster als CSV oder GeoTIFF) statt des Beispielgeländes.
- Senken füllen (Planchon–Darboux), damit Wasser aus Mulden weiterläuft, und Abflussmenge als Gewässernetz ab einer Schwelle zeigen.
- Mehrfachabfluss (D∞ nach Tarboton 1997 oder MFD) zum Vergleich mit D8.
- Gemeinsames Gelände und Zeichenteile mit „Regenwasserabfluss (Vektor)“ nach `../_gemeinsam/` verschieben, falls weitere Wasser-Apps folgen.
