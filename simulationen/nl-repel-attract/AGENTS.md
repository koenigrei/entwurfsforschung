# AGENTS.md · 01 repel attract

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `repel_attract.nlogo` (NetLogo 2.1, Reinhard König, 01.01.2005). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten (turtle, patch, setup, attract, repel, density, radius, repel-strength, closest-turtle). Die Parameter-IDs sind die NetLogo-Namen, in `p` also `p["repel-strength"]`.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
nl-repel-attract/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param)
  app.js             Sim.starte({...}): Parameter, zeichne, legende, kennzahlen
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
| `erzeuge(param, zufall)` | neuer Zustand `z` (setup): `t`, `n`, je turtle `x`, `y` (stetig, Ursprung in der Mitte, y nach oben), `h` (heading in Grad) |
| `schritt(z, param)` | ein Durchlauf der eingeschalteten Dauerknöpfe: erst `attract` für alle, dann `repel` für alle (je in zufälliger Reihenfolge); erhöht `z.t` |
| `attract(z, p, i)`, `repel(z, p, i)`, `naechste(z, i)` | die Prozeduren des Originals für eine turtle |
| `falte(v)`, `diff(a, b)`, `abstand(z, i, k)`, `richtung(…)`, `gehe(z, i, d)`, `patch(v)` | Torus, `distance`, `towards`, `fd`/`bk`, Patch einer Koordinate |
| `auswertung(z)` | Kennzahlen: Abstand zum Ursprung (Mittel, Streuung), zur nächsten turtle (Mittel, Streuung, kleinster) |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("repel", false)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&radius=60&repel=0`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py nl-repel-attract` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Mehrere Anziehungspunkte (Klick setzt einen Ursprung) – Kreise, die sich berühren und verdrängen.
- repel mit den k nächsten Nachbarn statt nur dem nächsten; Vergleich mit Voronoi-/Lloyd-Relaxation.
- Spuren der turtles (pen-down) zeigen, um das Pendeln auf dem Kreis sichtbar zu machen.
