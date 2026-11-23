# AGENTS.md · Regenwasserabfluss (Vektor)

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Rainwater Rundown (Vector)“ aus dem Parametric Planning Catalogue (Djordje Spasić (Gismo), Parametric Planning Catalogue; https://infar-buw.github.io/parametric-planning-catalogue/docs/RainwaterRundownVector/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/regenwasser-vektor/
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
| `rasterTeilung(n, b, h)` | Spalten × Zeilen der Startpunkte wie die Gismo-Komponente (≈ √(Seitenverhältnis · n), je mindestens 2) |
| `startpunkte(G, n, zufaellig, zufall)` | Startpunkte im Raster (Ränder eingeschlossen) oder gleichverteilt zufällig, mindestens 2 |
| `gefaelle(G, x, y)` | Einheitsvektor des steilsten Gefälles in der Tangentialebene `[dx, dy, dz]` oder `null` (eben) |
| `fliessweg(G, x, y, eigen)` | neuer Fließweg (Polylinie mit einem Punkt) |
| `schreite(G, w, s)` | ein Schritt der Länge s entlang der Fläche; Abbruch „flach“, „stillstand“, „senke“, „max“ |
| `tropfen(z, x, y)` | zusätzlichen Regentropfen setzen (Klick) |
| `fertig(z)` | kein Fließweg läuft mehr |
| `auswertung(z)` | Zahl, mittlere und größte Länge, mittlerer Höhenverlust, Abbruchgründe |

Zustand: `G` Gelände, `start` Startpunkte, `wege` (`pkt` = [[x, y, h]], `aktiv`, `grund`, `laenge`, `eigen` = per Klick gesetzt), `aktiv` = Zahl laufender Wege.

**Lizenz beachten**: Das Vorbild ist die Gismo-Komponente „Flow Paths“ (Djordje Spasić, GPL-3.0-or-later). Diese App enthält keinen Gismo-Code und soll auch keinen aufnehmen – sonst müsste sie unter GPL stehen. Verfahren nur in eigenen Worten nachbauen.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py regenwasser-vektor` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Kurven statt Polylinien (Eingang `flowPathsType_` = 1 der Komponente: interpolierte Kurve durch die Punkte).
- Startpunkte wie Grasshoppers „Populate Geometry“ (gleichmäßiger verteilt als reiner Zufall).
- Linien nach Höhenverlust oder Länge einfärben; Linien, die nahe beieinander enden, zu Rinnen zusammenfassen.
- Eigenes Gelände laden (Höhenraster) – dasselbe Gelände wie in „Regenwasserabfluss (Raster)“ nutzen, um beide Verfahren nebeneinander zu zeigen.
