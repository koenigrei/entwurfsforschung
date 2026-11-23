# AGENTS.md · Straßenhierarchie

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Street Hierarchy“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/StreetHierarchy/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/strassenhierarchie/
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
| `strassennetz(zufall, opt)` | Beispielnetz: verzogenes Raster aus `Szenen.stadt` mit Rand und vier Zufahrten vom Bildrand |
| `baueNetz(z, p)` | `Geo.netz` (Fangabstand = Snap threshold) → `Geo.segmentGraph` (Length/Angular Coefficient) → Gewichte; Analyse leer |
| `naechstesSegment(N, q)` | Segment, das dem Punkt am nächsten liegt |
| `gewichte(N, poi, eingang, p)` | Ursprungs- = Zielgewichte je Segment (2 × Grundgewicht + Zusatzgewichte × Anzahl Segmente) |
| `betweennessVon(G, s, gQ, gZ, bc)` | Beitrag eines Ursprungssegments (Brandes über `Geo.betweennessVon`, Start- und Zielsegment zählen mit) |
| `bereiche(p)`, `findeBereich(B, x)` | Consecutive Domains aus den Klassengewichten × Faktor; Find Domain (nicht strikt) |
| `klassifiziere(bc, p)` | Logarithmus → Remap 0…1 → Klasse 0 Tertiary, 1 Secondary, 2 Primary (−1 keine) |
| `rechneAlles(z, p)`, `leere(z, p)`, `fertig(z)` | ganze Analyse auf einmal; Analyse leeren (t = 0, Punkte bleiben); alle Ursprünge gerechnet? |
| `punkteGeaendert(z, p)`, `punktBei(z, q, r)` | nach Ändern von PoI/Eingängen neu gewichten (und ggf. rechnen); Punkt im Fangradius |
| `bilanz(z)` | Anzahl und Länge je Klasse |

Zustand `z`: `N` (Netz), `G` (dualer Graph), `poi`, `eingang` (Punkte), `poiSeg`, `eingangSeg`, `gQ` (Gewichte), `bc` (Betweenness), `fertig` (gerechnete Ursprünge), `K = {wert, klasse}`.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py strassenhierarchie` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Echtes Straßennetz laden (GeoJSON-Linien) statt der Beispielstadt; Gelände wie im Katalogbild als Hintergrund.
- Radius der Analyse (FWGetPaths „Radius“) und Abstandsabnahme (Distance decay function) als Parameter.
- Ergebnis als GeoJSON mit Klasse je Segment ausgeben (entspricht „Bake“ auf drei Ebenen in Rhino).
