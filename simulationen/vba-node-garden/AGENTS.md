# AGENTS.md · nodeGarden – Interaktion von Nodes

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung des AutoCAD-VBA-Makros „nodeGarden“ (`Sub traffic`, Reinhard König, spätestens 2004). Maßgeblich sind die Regeln und Konstanten des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten (node, amount, maxDist, bremse, loser, unimin/unimax, run, howmany). Der VBA-Text steht auf der alten Seite `05nodeGarden.htm`.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
vba-node-garden/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param)
  app.js             Sim.starte({...}): Parameter, zeichne (Draufsicht, AutoCAD-Farbindex aci), legende, kennzahlen, ende
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `n`, je Kugel `x`, `y` (Mitte), `vx`, `vy` (loser); Spur der letzten `SPUR` Schritte |
| `schritt(z, param)` | ein Durchlauf der äußeren Schleife: je Kugel u `vergleiche` mit allen j > u, dann `bewege`; erhöht `z.t` |
| `vergleiche(z, u, j, ax, ay, p)` | Anziehung und Bremse bei Abstand < maxDist (innere Schleife) |
| `bewege(z, u)` | Sub run: Schritt und Sprung an die Gegenseite des Rahmens |
| `random(zufall, bn, tn)` | Function random des Makros |
| `spurPunkt(z, i, a)`, `tempo(z)`, `gruppen(z, r)` | Bahnpunkte, mittlere Geschwindigkeit, Gruppen |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("maxDist", 50)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&amount=30`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py vba-node-garden` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Axonometrie mit drehbarer Ansicht wie in `vba-rekursion` und Bewegung auch in z.
- Abstoßung bei sehr kleinem Abstand, damit die Kugeln sich nicht durchdringen (Schritt zu Schwarmmodellen, vgl. `facs`).
- Rahmen als echter Torus (Überschuss mitnehmen, Abstände über den Rand).
