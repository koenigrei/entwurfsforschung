# AGENTS.md · Wegenutzung und das Finden kürzester Pfade

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung der Delphi-Programme `342_kuerzestePfade` (= `15_Wegenutzung`) und `14_graphPath` von Reinhard König, 2005. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (Anlager Dist., RepelDist., Stärke der Weg-Markierung, Verfallsrate Markierungen, startNode/zielNode, Usage, „Pfad erstellt“ / „kein Pfad möglich!“) bleiben erhalten.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
wegenutzung/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Parameter, Werkzeuge, zeichne, legende, kennzahlen, klick; Loslassen der Maus
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
| `erzeuge(param, zufall)` | Zustand `z`: `n` Knoten mit `x`, `y` (Bildpunkte), Schritt `sx`, `sy`, alte Position `ox`, `oy`, Nachbarlisten `nb`, Nutzungsmatrix `nutzung` (n · n, Zeile = Vorgänger), `start`, `ziel`, `pfad` (vom Ziel zum Start), `gefunden`, `maus` |
| `schritt(z, param)` | ein Idle-Durchlauf (Nachbarn, Bewegung, Wegesuche, Markierung); erhöht `z.t` |
| `aendere(z, param, id)` | „anlDist“: alle Knoten wieder in Bewegung |
| `nachbarCheck`, `bewege`, `findePfad`, `markiere` | `NeigborCheck` + `Anlagern`, Maus/Torus/Bewegung, A*, Nutzung erhöhen |
| `erstelleKnoten`, `neuerKnoten`, `loesche10`, `naechster` | Knöpfe und Maus |
| `kanten(z)`, `auswertung(z)`, `rundeD(x)` | ungerichtete Kanten mit Nutzung, Kennzahlen (`ruhe`, `kanten`, `maxNutzung`, `mittelNutzung`, `mitte`), Delphi-Rundung |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(500)`, `SIM.zuruecksetzen(7)`, `SIM.setze("fassung", "14")`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&anlDist=70`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py wegenutzung` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Start- und Zielpunkte nach Gewichten (Einwohner, Arbeitsplätze) statt gleichverteilt – der Schritt zu `343_Verkehrsaufkommen`.
- Nutzung auf die Kantenlänge beziehen (Kosten steigen mit der Belastung → Umlegung mit Kapazitätsbeschränkung).
