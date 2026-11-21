# AGENTS.md · Segregation durch Eigenschaftsanpassung

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `522_SegregationEigenschaft` „Segregation Model“ (Delphi, Reinhard König, 18.12.2005; Dissertation 2008, Kapitel 5.2.2), einem zellulären Automaten nach Batty: Zellen übernehmen die Eigenschaft der Mehrheit ihrer Moore-Nachbarschaft. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (Schwellenwert, Störung, Störwert, mit leeren Zellen) bleiben erhalten. Gleicher Quellcode wie `24_Segregation_01` im Laboratorium für räumliche Prozesse.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
segregation-eigenschaft/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Parameter, zeichne (Feld und Diagramm), Störung, klick, legende, kennzahlen, ende
  test/*.test.mjs    node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten. Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes. Alles liegt im Ordner oder in `_gemeinsam/`.
5. **Texte** auf Deutsch und Englisch: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über die Klassen und Variablen aus `_gemeinsam/sim.css` (`--paper`, `--ink`, `--line`, `--accent`, `--accent-text` …); Farben im Canvas über das Objekt `F` in `zeichne` (wechselt mit Hell/Dunkel).
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `feld` (Uint8Array, 0 schwarz, 1 weiß, 2 leer), `geaendert`, `verlauf` ([Anteil weiß, gleiche Nachbarn, geänderte Zellen] je Schritt), `fertig`, `stoerungen` |
| `schritt(z, param)` | ein Zeitschritt: alle zählen, dann alle gleichzeitig ändern (Timer1Timer); erhöht `z.t` |
| `regelSchwelle(weiss, schwelle, alt)` | Regel ohne leere Zellen |
| `regelMehrheit(weiss, schwarz, alt)` | Regel mit leeren Zellen |
| `zaehle(z, x, y, mitte)` | weiße und schwarze Zellen im 3 × 3-Block (Torus), mit oder ohne Mitte |
| `stoere(z, param)` | Störung (B_disturbClick) |
| `setze(z, x, y, wert, r)` | Zellen im Kreis setzen (Maus) |
| `anteilWeiss(z)`, `gleicheNachbarn(z)`, `zellen(z)` | Kennzahlen |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(30)`, `SIM.zuruecksetzen(7)`, `SIM.setze("schwelle", 5)`, `Modell.stoere(SIM.zustand, SIM.param)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&leer=1`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py segregation-eigenschaft` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Mehr als zwei Eigenschaften (wie die Gruppen in der erweiterten Fassung von 521) oder eine Wahrscheinlichkeit des Wechsels statt der festen Regel.
- Größere Nachbarschaften und ein Vergleich der Clustergrößen.
- Kopplung mit dem Umzugsmodell `segregation-standort`: wer nicht umziehen kann, passt sich an.
