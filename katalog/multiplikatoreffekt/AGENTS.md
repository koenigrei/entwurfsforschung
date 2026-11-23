# AGENTS.md · Multiplikatoreffekt

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Forschungsprojekts „Evolving Configurational Properties – Simulating multiplier effects between land use and movement patterns“ aus dem DeCodingSpaces Lab (Martin Bielik, Reinhard König, Ekaterina Fuchkina, Sven Schneider, Abdulmalik Abdulmawla, 2019; Paper #279 des 12. Space Syntax Symposium; https://toolbox.decodingspaces.net/evolving-configurational-properties/). Simuliert wird die Rückkopplung zwischen Bewegungspotenzial (gewichtete winkelbasierte Closeness oder Betweenness, R600 oder Rn) und Nutzungsverteilung im Straßennetz und gemessen, ob die erste Runde das Ergebnis vorhersagt (Multiplikatoreffekt Me) und ob sich Störungen ausgleichen (natürliche Bewegung Ne). Maßgeblich sind Verfahren, Parameter und Begriffe des Papers und der Skripte (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/multiplikatoreffekt/
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
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild (Eintrag im DeCodingSpaces Lab, Autorinnen und Autoren, Paper) nennen. Aus der DeCodingSpaces Toolbox (GPL-3.0) keinen Code übernehmen, nur Definitionen.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z` (enthält `t` = Schrittzahl) |
| `schritt(z, param)` | ein Schritt; erhöht `z.t` |
| `aendere(z, param, id)` | Parameter ohne Neustart: Definition → neuer Graph; Maß/Radius → neue Referenz (gleich belastet); Modus, Störung, k, d → Rückkopplung ab Iteration 0; Disruptoren bleiben |
| `strassennetz(zufall, opt)` | Beispielnetz: `Szenen.stadt` + Diagonalen vom Zentrum + nach innen gerückte Randknoten → `{segmente, b, h, szene}` |
| `suche(G, s, r)` | kürzeste Wege im gerichteten Segmentgraphen mit Radius r in m (Suche wird beschnitten), Rangfolge Kosten, dann Schritte |
| `closenessVon(G, R, w)` | gewichtete Closeness Gl. 4: Σ w_k / Σ d_sk · w_k (0, wenn Σ d·w = 0) |
| `betweennessVon(G, R, gQ, gZ, bc, enden)` | Beitrag eines Ursprungs zur gewichteten Betweenness Gl. 5 (Brandes, gleich kurze Wege geteilt; `enden` = Legacy) |
| `bewegungspotenzial(G, gQ, gZ, p)` | MPC aller Segmente (4. FWGetPaths, Ausgang CW oder BW) |
| `anfangsGewichte(n, dSeg, k, d)` | Cluster „Custom OD weights“ |
| `normiereTemporaer(M, w)` | Cluster „Normalize (temp disruption)“: MPC · Σw / ΣMPC |
| `normiereDauerhaft(M, w, dSeg, d)` | Cluster „Normalize (permanent disruption)“ |
| `logWert(x)` | ln(x + 3) − ln 3 (Darstellung) |
| `r2(x, y)` | R² der linearen Regression (Me, Ch, Ne) |
| `leere(z, p)` | Rückkopplung von vorn (t = 0), Anfangsgewichte aus den Disruptoren |
| `fertig(z, p)` | alle Iterationen gerechnet |
| `schalteDisruptor(z, p, q, r)`, `disruptorBei(z, q, r)` | Disruptor setzen/entfernen (Klick) |
| `gezeigt(z, p)` | gezeigte Iteration (Browse History) |
| `kennwerte(z, i)`, `konzentration(w, q)` | Σw, Me, Ch, Ne, Anteil der Nutzungen auf den stärksten 10 % und an den Disruptoren |

Zustand `z`: `N` (Netz), `G` (Graph), `disruptoren` (Punkte), `dSeg` (deren Segmente), `gew[i]` (Nutzungen vor Iteration i + 1, `gew[0]` = Anfang), `mpc[i]` (MPC der Iteration i + 1), `me`, `ch`, `ne` (je Iteration), `gleich` (MPC des gleich belasteten Netzes), `iter`, `t`.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py multiplikatoreffekt` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Das Weimarer Netz der Skripte (1327 Linien) als Datei laden und die Experimente E.1/E.2 des Papers nachrechnen; mit Web Worker, weil Rn dann deutlich länger dauert.
- Disruptoren mit eigener Stärke je Punkt (das Paper nutzt zwei unterschiedlich große), Ziehen der Punkte.
- Die Legacy-Closeness mit Radius (`n^2.5/Σd`, siehe `QUELLE.md`) als dritte Definition, um die Abweichung bei Closeness R600 zu prüfen.
- Kapazitätsgrenze je Segment (Ausblick des Papers), weitere Zentralitäten (Gravity mit Distanzabfall, NAIN/NACH), Sensitivitätsanalyse über k, d und Lage der Disruptoren.
- Streudiagramm Ne (MPC₁ gleich belastet gegen MPC_N gestört) als zweite Ansicht, CSV-Ausgabe wie die Vollversion.
