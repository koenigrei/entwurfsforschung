# AGENTS.md · Überlagerungsflächen

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `05_rechtClipping` (Delphi, Reinhard König, 2005) mit der Fassung `04_rechtClipping`. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten: Rechtecke, Überlagerungsflächen (`LapsList`), `numbers`, Clipcode, `lapKoord`, `lapped`.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
ueberlagerungsflaechen/
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `rechtecke` [{px, py, x1, y1, x2, y2}], `laps` [{a, b, x1, y1, x2, y2}], `summe`, `exakt`, Paarzeiger `i`/`k`, `offen`, `lap` (lapKoord), `letztes` |
| `schritt(z, param)` | ein Paar prüfen; sind alle geprüft, `numbers` neue Rechtecke; erhöht `z.t` |
| `aendere(z, param, id)` | `fassung`: dieselben Rechtecke von vorn mit dem anderen Verfahren |
| `neuesRechteck`, `intersectRect`, `clipCode`, `binaer`, `schnittpunkt`, `sortiere`, `cohenSutherland`, `flaeche` | Regeln aus `main.pas` beider Fassungen, einzeln getestet |
| `erstelle`, `rechneAlle`, `loesche`, `entferne` | Knöpfe „Rechtecke erstellen“, „Überlagerungsflächen“, „Rechtecke löschen“; Rechtsklick |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("fassung", "04")`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&fassung=04`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py ueberlagerungsflaechen` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Überlagerungsfläche ohne Mehrfachzählung (Vereinigung der Schnittflächen) als zweite Kennzahl.
- Beliebige Polygone statt Rechtecke: Sutherland-Hodgman, auf den der Kopf von `checkOverlap` schon verweist.
- Die Rechtecke verschieben, bis die Fläche verschwindet – das führt die App *Dichte Packungen* aus.
