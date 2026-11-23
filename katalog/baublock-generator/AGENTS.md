# AGENTS.md · Baublock-Generator (DigiWo)

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung der Grasshopper-Komponenten „DigiWo – Block Generation Components / Slabs Generation Components“ aus dem DeCodingSpaces Lab (Iuliia Osintseva (Autorin); Reinhard König, Sven Schneider, Martin Bielik (Betreuung); Andreas Berst; Egor Gavrilov, Martin Oravec; https://toolbox.decodingspaces.net/digiwo/; Paper SimAUD 2020, http://simaud.org/2020/proceedings/70.pdf). Die .gh-Dateien sind verloren (Google Drive, 404) – maßgeblich sind Tutorial, Paper und Abbildungen (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

Kurz: Grundstück (konvex) → um die Abstandsfläche `T = max(min, f·H)` je Kante nach innen versetzt (Straße: bis zur Mitte, Baulinie: 0) → Basisblock als Ring der Gebäudetiefe (Flügel je Kante, Ecken) oder Zeilen an vier charakteristischen Kanten → Aktionen in beliebiger Folge. Alle Baukörper sind konvexe Polygone auf dem Boden mit Geschosszahl `g` und optionalem Dachgeschoss (`dach`, `dg`); jede Aktion schneidet mit Halbebenen (`clip`, `ohne`). Zustand `t = 0` = Grundform, Schritt = eine Aktion, danach nächste Variante.

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Parametric Planning Catalogue
  geo.js                   Geo: Polygone (Fläche, Schwerpunkt, Halbebenen-Schnitt, Versatz), Strahlen, Netze
  karte.js                 Karte: Farbskalen, Polygone, Pfeile, Gelände mit Schummerung und Höhenlinien
katalog/baublock-generator/
  index.html               statische Seite; lädt die Rahmen-Skripte, modell.js, app.js
  modell.js                reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js                   Sim.starte({...}): Parameter, Lageplan, Axonometrie (eigene Parallelprojektion), Variantenreihe, Maus
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js`. Zufall nur aus der übergebenen Funktion `zufall`: sie liefert in `erzeuge` die Basissaat `z.basis`, daraus leitet `zufallAus(mische(…))` die Folge je Variante und Aktion ab (eigene Saat je Aktion). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über `sim.css` und die Farben im Objekt `F` (wechselt mit Hell/Dunkel); Farbskalen aus `Karte`.
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild DigiWo / DeCodingSpaces Lab und Paper nennen. Aus der DeCodingSpaces Toolbox (GPL-3.0) nur Definitionen ablesen, keinen Code übernehmen.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z` (enthält `t` = Schrittzahl) |
| `schritt(z, param)` | ein Schritt; erhöht `z.t` |
| `aendere(z, param, id)` | optional: Parameter ohne Neustart übernehmen |
| `baue(z, p)`, `aufbau(z, p, v, k)` | Zustand neu aufbauen (frühere Varianten nur als Kennzahlen in `z.varianten`) bzw. Variante `v` mit `k` Aktionen |
| `folge(p)`, `lage(z, p)`, `fertig(z, p)`, `zeigeVariante(z, p, v)` | Aktionsfolge aus `a1`…`a6`; Variante und Aktion zum Schritt `t`; Ende nach allen Varianten; Sprung zu einer Variante |
| `TUN.kanten`, `rsKante`, `rsEcke`, `eck`, `durch`, `hoehe`, `turm`, `hof`, `dach` | die neun Aktionen `(z, p, rnd, amAttraktor)` |
| `standort(p)`, `abstandsTiefe(H, p)`, `randAbstand(art, T, p)` | Faktor und Mindestmaß (`LAENDER`, Baugebiet), `T = max(min, f·H)`, Abstand je Kantenart |
| `versetzeGrundstueck(plot, abst)`, `ring(umriss, t)` | Umriss nach Abstand je Kante; Flügel, Ecken, Hof |
| `charakteristischeKanten(P)` | Kanten zu vier Gruppen zusammenfassen (kleinste Richtungsänderung zuerst); Richtung = längste Kante |
| `huellHoehe(z, p, poly)` | Höhengrenze aus den Abstandsflächen (Türme) |
| `dachFlaeche(z, p, st)` | Fläche des Dachgeschosses (bündig Hof oder Straße; Ecken mit zwei Kanten) |
| `messe(z, p)` | `z.kz`: A, GR, BGF, BGFvoll, GRZ, GFZ (Dachgeschoss als Vollgeschoss nur bei ≥ ⅔), Geschosse |
| `clip`, `ohne`, `schnitt`, `halbebenen`, `rahmen`, `uv`, `band`, `rechteck`, `bandIm`, `freieAbschnitte`, `teileAbschnitt` | Geometriehilfen (konvexe Polygone, Kantenrahmen mit u entlang, v nach innen) |
| `verschiebeEcke`, `wechsleKante`, `setzeAttraktor` | Bearbeiten mit der Maus (Grundstück bleibt konvex) |

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py baublock-generator` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Konkave Grundstücke: vorher in konvexe Teile zerlegen (wie „Subdivision of Complex Concave Sites“, Tutorial 2b) und je Teil Zeilen oder Block erzeugen.
- Solare Hüllkurven (Knowles) für die Türme statt der Abstandsflächen-Hüllkurve; Verschattung der Nachbarn.
- Mehrere Gebäudetiefen und Folgen parallel; Variantenreihe als Tabelle zum Filtern nach GFZ (wie Abb. 10 des Papers), Export als CSV/GeoJSON.
- Abstandsflächen genauer: Dachzuschläge, Schmalseitenprivileg, Überdeckung eigener Abstandsflächen prüfen und anzeigen.
- Typologie „Solitär“ (Punkthäuser) und Kombinationen mit dem Block (Paper, Ausblick).
