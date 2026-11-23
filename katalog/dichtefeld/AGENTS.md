# AGENTS.md · Dichtefeld

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Skripts „Building coverage Density“ (`GSI Density Grid_2018-12-05.gh`) aus dem Eintrag „Discovering Cities Workshop | Amman“ im DeCodingSpaces Lab (DeCodingSpaces / Bauhaus-Universität Weimar, 2018; https://toolbox.decodingspaces.net/discovering-cities-workshop-amman/). Je Rasterzelle: `GSI = Σ Grundflächen der Gebäude mit Schwerpunkt im Suchradius / (π · R²)`. Maßgeblich sind Verfahren, Parameter und Begriffe des Skripts (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Katalogs
  geo.js                   Geo: Polygone (Fläche, Schwerpunkt) u. a.
  szenen.js                Szenen: Stadt (Straßen, Blöcke, Blockrand) mit fester Saat
  karte.js                 Karte: Polygone, Text
katalog/dichtefeld/
  index.html               statische Seite; lädt die Rahmen-Skripte, modell.js, app.js
  modell.js                reine Logik, kein DOM
  app.js                   Sim.starte({...}): zwei Karten, Parameter, Legende, Kennzahlen, Klick
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js` und `szenen.js`. Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über `sim.css` und die Farben im Objekt `F` (wechselt mit Hell/Dunkel).
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild (DeCodingSpaces Lab, Workshop Amman) nennen.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z`: Stadt, Gebäudedaten `z.D`, Raster `z.R`, Werte `z.werte[0]` (Radius) und `z.werte[1]` (zweiter Radius), `t = 0` |
| `schritt(z, param)` | eine Rasterzeile (von Norden nach Süden) für beide Radien; erhöht `z.t` |
| `aendere(z, param, id)` | Zellmaß → neues Raster, `t = 0`; Radius → fertige Zeilen sofort neu |
| `stadt(zufall)` | Beispielstadt mit Dichtegefälle (Blockrand je Block unterschiedlich tief und lückenhaft, Grünflächen) |
| `teilung(laenge, mass)`, `raster(b, h, zx, zy)` | Zellzahl wie „Divide Domain²“ (gerundet, ≥ 1) und Raster |
| `zellMitte(R, k)`, `zelleBei(R, q)` | Mittelpunkt der Zelle k, Zelle unter dem Punkt q |
| `gebaeudeDaten(gebaeude)` | Schwerpunkte und Grundflächen (Komponente „Area“) |
| `summeImRadius(D, q, R)`, `gsi(D, q, R)` | Summe der Grundflächen mit Schwerpunkt streng innerhalb R; GSI = Summe / (π R²) |
| `rechneZeile(z, p, j)`, `fertig(z)` | Zeile j rechnen; alle Zeilen fertig? |
| `statistik(z, m)` | Zahl, Mittel, Streuung, Minimum, Maximum der gerechneten Zellen der Karte m |
| `waehle(z, k)`, `gezaehlte(z, k, R)` | Zelle wählen; Indizes der gezählten Gebäude |
| `verlauf(t)` | Farbe des „Gradient“ der .gh-Datei |

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("radius", 300)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&radius=300`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py dichtefeld` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Exakter Flächenanteil (Gebäudefläche ∩ Kreis) statt Schwerpunktregel als Schalter – zeigt, wie stark die Schwerpunktregel bei kleinen Radien springt.
- Histogramm der GSI-Werte beider Radien; Geschossflächenzahl (FSI) mit Gebäudehöhen (Spacematrix).
- Randkorrektur: nur den Teil des Kreises im Gebiet als Bezugsfläche nehmen.
- Zweite Ebene aus dem Workshop: Zählungen gegen Straßenzentralität mit linearer Regression und Residuenkarte.
- Gebäudeumrisse als GeoJSON laden (z. B. aus OpenStreetMap), um echte Viertel zu vergleichen.
