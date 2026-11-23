# AGENTS.md · Wasserleitung: Druck und Durchfluss

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Water Network Analysis“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/WaterNetworkAnalysis/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
  hydraulik.js             Hydraulik: Rohrnetzlöser ohne DOM (neu, iteration, loese, ergebnisse) – auch von ../wassernetz/ benutzt;
                           Tests in _gemeinsam/test/hydraulik.test.mjs mit den Prüfnetzen Testnet.inp, hydroanalysis1.inp
katalog/wasserleitung/
  index.html               statische Seite; lädt die Rahmen-Skripte, die gemeinsamen Dateien, modell.js, app.js
  modell.js                reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js                   Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/hydraulik.js` (gemeinsam mit `wassernetz`; Änderungen am Löser dort mit eigenem Test in `_gemeinsam/test/hydraulik.test.mjs`, danach `node --test` in `_gemeinsam`, `wasserleitung` und `wassernetz`). Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
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
| `graphMapper(K, x)`, `bezier`, `ordneKurve(K)` | Graph Mapper: Bezier mit vier Stützpunkten, y zu x; Stützpunkte gültig halten |
| `profil(p, K)` | Höhenprofil: Punkte i = 0…N, Behälter auf 0, Höhenspanne = NetworkHeight |
| `pumpenLinie(p)` | Floor(NetworkSegments · Pump Index) |
| `netzAus(P, p, versorgt, bis)` | EPANET-Netz wie Write Hydrology Network (Behälter, Verbraucher, Rohre, Pumpe) |
| `tankDurchmesser(V, h)` | Durchmesser des zylindrischen Behälters |
| `schritt`, `rechneAlles`, `fertig` | eine Iteration des Gradientenverfahrens; ganz rechnen; fertig? |
| `pruefeVersorgung(z, p)` | Erweiterung „iterativ“: Verbraucher ohne Druck abhängen, Leitung hinter negativem Druck abschneiden |
| `setzeKurve(z, p, k, x, y)` | Stützpunkt des Graph Mappers setzen und neu rechnen |
| `rohrWert`, `knotenWert`, `zuWenigDruck`, `bilanz` | Werte nach Werteliste, pinke Verbraucher, Kennzahlen |
| `Hydraulik.neu/iteration/loese/ergebnisse/bilanzfehler` | Löser (`../_gemeinsam/hydraulik.js`): Zustand, eine Iteration (A H = F mit Cholesky), ganz lösen, Ausgaben wie EPANET, Probe Massenbilanz |

Zustand `z`: `kurve` (Graph Mapper), `P` (Profil), `netz` (Knoten, Leitungen), `S` (Löser: `Q`, `Hk`, `iter`, `fehler`), `erg` (Ergebnisse), `verlauf` (relative Änderung je Iteration), `versorgt`, `bis`, `durchgang`, `fertig`.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py wasserleitung` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Druckabhängige Entnahme (pressure-driven analysis wie EPANET 2.2) statt der einfachen Erweiterung „iterativ“.
- Zeitreihe: Behälter leert sich über den Tag (Tankvolumen, Verbrauchsmuster), Pumpe mit Kennlinie statt konstanter Leistung.
- Export als EPANET-.inp-Datei, damit das Netz in EPANET geprüft werden kann.
