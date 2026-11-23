# AGENTS.md · Windrichtung und Luftbelastung

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Wind Direction“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/WindDirection/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Parametric Planning Catalogue
  geo.js                   Geo: Polygone, Strahlen, Isovist, Voronoi, Netze, Dijkstra, Floyd–Warshall, Betweenness
  szenen.js                Szenen: Stadt (Straßen, Blöcke, Gebäude, Platz) und Gelände (Höhenraster) mit fester Saat
  karte.js                 Karte: Farbskalen, Polygone, Pfeile, Gelände mit Schummerung und Höhenlinien; Gelände-Zwischenspeicher gelaendeGespeichert (genutzt in app.js)
katalog/windrichtung/
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
| `ROSEN`, `roseAusJSON(text)`, `rose(p)` | Beispiel-Windrosen im Aufbau von windFrequencyRose.json; Datei lesen wie das GhPython-Skript (values, angles = center − 180, kleinste center_degrees) |
| `normiere(werte)` | Remap Numbers: Häufigkeit / größte Häufigkeit |
| `peilungZuVektor(g)`, `vektorZuPeilung(v)` | Peilung (0 = Nord, im Uhrzeigersinn) ↔ Vektor in Bildschirmkoordinaten (y nach unten) |
| `winkelGrad(a, b)` | Angle + Degrees: 0…180°, NaN beim Nullvektor |
| `wirkrichtungen(R, drehung)` | Richtung, in die der Wind je Sektor weht: center_degrees + Drehung |
| `sektorTreffer(v, richtungen, grenze, aktiv)` | Smaller Than … or Equal to: getroffene Sektoren (Grenze = Sektorbreite · Faktor / 2) |
| `gewichtetesMittel(x, g)`, `abfall(x, k)`, `obergrenze(p)`, `parzellenWert(p, f, T, d)` | Weighted Average, Exp(−k·x), Max der Farbskala, Wert einer Parzelle (Windrichtung oder Belastung) |
| `szene(zufall)` | Parzellen (Blöcke aus `Szenen.stadt`) auf einem Gelände (`Szenen.gelaende`) |
| `rechne(z, p)` | alle Parzellenwerte mit den ersten `z.aktiv` Sektoren |
| `fertig(z, p)`, `laufend(z, p)` | alle Sektoren geprüft? laufender Sektor und Anteil (für den Suchkegel) |
| `parzelleAn(z, q)`, `waehle(z, p, i)` | Parzelle am Punkt, Parzelle wählen (Wind From) |
| `leeLuv(z)` | Mittelwerte im Lee und Luv (±45° um die Hauptwindrichtung) – für Tests und `pruef_ausdruck` |

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py windrichtung` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Mehrere Quellen gleichzeitig (Summe der Belastungen über alle Parzellen einer Nutzung, z. B. Industrie – die .gh-Datei hat schon eine Gruppe „Industry Pollution“).
- Windgeschwindigkeit je Sektor (windSpeedRose aus dem Global Wind Atlas) als zweites Gewicht.
- Gelände berücksichtigen: Abschattung durch Hügel (Sichtlinie zwischen den Schwerpunkten über das Höhenraster).
- Abfallfunktion frei eingeben (Ausdruck wie im Panel „Distance Falloff“) statt nur k in Exp(−k·x).
