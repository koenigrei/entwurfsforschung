# AGENTS.md · 2Dwachstum 01–03 – Wanderwürfel

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `experiment01.htm` mit den Folgeskripten `experiment02.htm` und `experiment03.htm` (AutoCAD-VBA, Reinhard König, 2004). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten: Würfel, `mitte`, `etage`, `checkList`, `loops`, `num`, `setzeQuad`.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
vba-2dwachstum-1/
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `fassung`, `wuerfel` [{x, y, z, farbe, doppelt}], `belegt` (Map), `xW`/`yW`/`etage`/`mitte`, `checkList`, `u`/`i`, `fertig` |
| `schritt(z, param)` | ein Durchgang der Schleife `For i` der gewählten Fassung; erhöht `z.t`; nichts mehr, wenn `fertig` |
| `aendere(z, param, id)` | leer: Farben und Ansicht wirken nur in `app.js` |
| `vbaRound`, `random`, `sprung` | Regeln aus `Sub main`, einzeln getestet |
| `geschosse`, `plaetze`, `durchgaenge` | Kennzahlen |

Die Projektion (Drehung, Neigung, Tiefensortierung) und der AutoCAD-Farbindex stehen in `app.js` – gleich gebaut wie in der App `vba-rekursion`.

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("fassung", "03")`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&fassung=03`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py vba-2dwachstum-1` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Die Fassungen weiterführen wie auf der Übersicht `vbaIndex.htm`: 2Dwachstum04 (Skalieren und Drehen), dann die Verzweigungen der *Rekursiven Strukturen*.
- Ausweichen nicht nur nach oben und unten, sondern in freie Nachbarplätze (Belegung der Nachbarschaft wie bei zellulären Automaten).
- Export als OBJ/DXF, damit die Würfel wieder in ein CAD-Programm gelangen.
