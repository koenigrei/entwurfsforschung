# AGENTS.md · Dichte Packungen I/II

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `06_minUeberschn` (Delphi, Reinhard König, 2005) mit der Fassung `07_packingScale`. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten: Variante (`ShapesList[K]`), `nrPop`, Überlagerungsfläche, Mutationsrate (`mutRat`), Variationsweite (`varSteps`), Rechteckgröße (`Size`), `area_ind`, `IR`.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
dichte-packungen-1/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs    node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten. Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes. Alles liegt im Ordner oder in `_gemeinsam/`.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über die Klassen und Variablen aus `_gemeinsam/sim.css` (`--paper`, `--ink`, `--line`, `--accent`, `--accent-text` …); Farben im Canvas über das Objekt `F` in `zeichne` (wechselt mit Hell/Dunkel).
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `fassung`, `F` (Feld, nrPop), `pop` [Varianten {px, py, cx, cy} als Int32Array], `best`, `eltern`, `flaeche`, `laps`, `verlauf`, `fertig` – mit erster Bewertung |
| `schritt(z, param)` | eine Generation (`overlap`: bewerten, auswählen, `optimize`); erhöht `z.t`; nichts mehr, wenn `fertig` |
| `aendere(z, param, id)` | leer: Mutationsrate und Variationsweite werden in jeder Generation gelesen |
| `round`, `schnitt`, `ueberschneidung`, `laps`, `selectionsort`, `gruppe`, `seiten`, `klemme`, `verschiebe` | Regeln aus `main.pas`, einzeln getestet |
| `overlap`, `optimize` | Generation wie im Original |
| `feldFlaeche`, `sollFlaeche`, `istFlaeche` | Kennzahlen |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("fassung", "II")`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&fassung=II`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py dichte-packungen-1` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Topologische Vorgaben wie im Kopf von `07_packingScale/main.pas` geplant: Rechtecke, die nebeneinander liegen sollen (Grundrissanforderung), dazu ein genetischer Algorithmus.
- Feste Raumabmessungen und Ausgabe der Lösung als Vektordaten für CAD (ebenfalls dort als nächster Schritt genannt).
- `area_ind[1..3]` korrekt bestimmen und vergleichen, ob vier echte Lösungspfade schneller zum Ziel führen.
