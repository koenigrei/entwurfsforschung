# AGENTS.md · Mietpreisdynamik und Straßen

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `550_Mietpreisdynamik` (segregation_rentScape, Delphi, Reinhard König, Juni 2007; Dissertation 2008, Kapitel 5.5) mit der Vorfassung `580_Wirkung_StrassenSegregat` (segregation_streets, November 2006; Kapitel 5.8) als Auswahl „Fassung“. Das Programm 550 enthält den Code von 580 vollständig und ergänzt Mietlandschaft, individuelle Toleranzen und Analysen. Maßgeblich sind die Regeln und Parameter der Originale (siehe `QUELLE.md`), nicht ihre Oberfläche. Begriffe der Originale (Schwellenwert, Toleranz, Budget, Mietlandschaft, Straßentyp, Barriere) bleiben erhalten.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
mietpreisdynamik/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Fassung und Parameter, Aktionen für Straßen, klick (Straßen zeichnen), zeichne (Feld, Diagramm), legende, kennzahlen, ende
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `zelle`, `zelltyp`, `strasse`, `gewicht`, `barriere`, `linien`, `miete`, je Agent `x`, `y`, `typ`, `budget`, `halt`, `sati`; `n`, `umzugswillig`, `umzuege`, `verlauf`, `fertig`. Straßen kommen aus `param.linien` |
| `schritt(z, param)` | ein Zeitschritt (actions): Wachstum, `ziehe`, `diffundiere`; erhöht `z.t` |
| `zufriedenheit(z, p, x, y, typ, ohne)` | testLocation/checkNei: Zufriedenheit 0–100 mit gleicher oder individueller Toleranz |
| `bleibt(sati, miete, budget, p)` | Zufrieden-Bedingung der Fassung |
| `toleranzen(p)` | Toleranztabelle der Gruppen (ToleranZ) |
| `setzeStrassen(z, linien, p)` | Straßenzellen, Gewichte (checkStreets) und Barrieren (testLines) |
| `strassenZellen(a, b, S, Z)`, `schneidet(…)` | transLine, Intersect |
| `ziehe(z, p)`, `diffundiere(z)` | calcAgents, diffuseField |
| `gruppenMiete(typ, p)`, `budget(typ, p)` | Miete und Budget einer Gruppe |
| `segregationsindex(z)`, `zufriedenJeGruppe(z)`, `mieteJeGruppe(z)` | Kennzahlen |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("fassung", "strassen")`, `SIM.setze("abneigungUnten", 40)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&fassung=strassen&radius=3` – die Straßen selbst werden nicht in der Adresse gespeichert).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py mietpreisdynamik` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Analysen der Originale: Stabilität über den Schwellenwert (AnaStability), Parameterraum, Clustergrößen, Wachstum, Wirkung der Straßen (AnaStreets), 3D-Stabilitätsfläche.
- Gruppengrößen einzeln einstellen (GroupSizes) und die Toleranztabelle als Matrix bearbeiten (ToleranZ).
- Straßen im Adressfeld speichern, damit sich ein Straßenplan teilen lässt.
