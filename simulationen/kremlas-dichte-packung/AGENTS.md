# AGENTS.md · KREMLAS · Dichte Packung

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung des Layoutsolvers „Dichte Packung“ (Einpassung, C#, Reinhard König, DFG-Projekt KREMLAS 2009–2011; Quelle `Source/Kremlas/` im Repository cpg_all). Sechs Fassungen (`p.fassung`): `einpassung` (Stand des Programms, `REvo.RunAdjust`), `kollision` (nur Kollisionserkennung), `topologie` (Stern, `REvo.RunTopo`), `gang` (Testszenario mit Gang und drei Wohnungen) sowie `grundriss8` und `grundriss10` (Grundriss-Generator: Raumprogramme aus `GrowPolys`, Nachbarschaften angenommen, Eingang als Nachbar −1, Grundriss mit Wänden und Türen über `grundriss()`/`tueren()`). Regler `belegung`: Anteil des Umgebungsrechtecks (im Original fest 0,75), `minSeite`: kürzeste Seite · √Fläche (Original 0,75, Grundriss 0,4), `grundrissTopo`: "stern" (Buch) oder "wohnung" (angenommen, nur mit Raumprogramm wirksam, die Auswahl erscheint nur in den Grundriss-Fassungen), `federRunden`: wie oft je Kind Federn und Kollisionserkennung abwechseln (Original 2; Topologie und Gang 10, Grundriss 5). Buch: Donath, König, Petzold (Hrsg.), KREMLAS, Weimar 2012, urn:nbn:de:gbv:wim2-20120509-16504 (Kap. 5, 9, 12). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten (Rooms, Pressure, Rooms Overlap, spring Damp, repel/proport. Force und Rate, Elite, (μ+λ)-ES). Bewusst übernommene Eigenheiten: Sg < 1 gilt als gleich gut, Berühren zählt als Kollision mit Vektor 0, die Schwellen 1,25 und 1,5 · Räume aus dem Code. Behoben: Der Federzuschlag für die Durchgangsbreite war im Original immer positiv (zog die Hälfte der Federn falsch herum), und sich berührende oder leicht überlappende Räume bekamen keinen Zug (Feder tot, obwohl die gemeinsame Kante zu kurz war).

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
kremlas-dichte-packung/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Parameter (Fassung mit „folgen“), zeichne, Verlauf, legende, kennzahlen, Ziehen (klick + pointerup)
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `n` (Räume), `mu`, `ablauf`, `programm`, `belegung`, `paare` (geforderte Nachbarschaften, Nachbar −1 = Außenraum), `eltern` (Individuen `{g: [Gene], fo: Sg, fd: f2}`, Gen `{id, x, y, w, h, a}` mit Mittelpunkt), `kinder`, `aufteilung` (nach f1 · f2), `gesperrt` (gezogener Raum), `verlauf`, `verlaufD`, `dichte` |
| `schritt(z, param)` | eine Generation: `RunAdjust` bzw. `RunTopo` mit Auswahl; erhöht `z.t` |
| `aendere(z, param, id)` | `rlap` ohne Neustart (f2 neu) |
| `FASSUNGEN`, `REGLER`, `STANDARD` | Ablauf, Topologie und Voreinstellungen je Fassung |
| `kollision(A, B)` | SAT für achsparallele Rechtecke: `null` oder Verschiebungsvektor für A |
| `pruefeRand`, `proportion`, `abstossen`, `entwickle` | Kollisionserkennung (`CheckBorder`, `ChangeProportion`, `RepelPolys`, `DevelopIndividual`) |
| `verschiebe`, `variiereGroesse`, `variiereGroesseVoll`, `inversion`, `kreuzung` | Mutation und Rekombination (`MoveRandon`, `VarySize`, `VarySizeFull`, `Inversion`, `CrossoverTopo`) |
| `ueberlappung`, `distanzen`, `paarDistanz`, `ringAbstand`, `zusatzAbstand`, `zusatzUeberlappung`, `erfuellt` | Fitness f1 (Sg) und f2 und ihre Teile |
| `nachbarn(n, art)`, `federVektor`, `federn` | Topologien (`SetNeighbours`, `SetSzenario`) und virtuelle Federn (`RSpring`) |
| `beste(z)`, `ziehe(z, x, y, phase)`, `loslassen(z)` | beste Lösung (mit Topologie: Sg < 1 %, dann meiste Nachbarschaften); Raum mit der Maus ziehen und sperren |
| `PROGRAMME`, `PX_M`, `flaechen(n, belegung, programm)`, `aussen(A)` | Raumprogramme (Name DE/EN, m²) mit Nachbarschaften, Maßstab 50 px = 1 m, Flächen, Außenraum als virtueller Nachbar |
| `grundriss(ind)`, `tueren(R, paare, breite)` | Grundriss ableiten (Räume wachsen in die Restflächen) und Türen an gemeinsamen Kanten |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("fassung", "topologie")`, `SIM.zustand`, dazu `Modell.beste(SIM.zustand)`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&fassung=gang&mu=12`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py kremlas-dichte-packung` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Frei eingegebene Raumprogramme und Nachbarschaften (Nachbarschaft per Klick auf zwei Räume), nicht rechteckige Umrisse (L-Form, wie im AIEDAM-Artikel 2014).
- Belegung 100 % zuverlässiger erreichen, z. B. mit einer Proportionsänderung, die auch auf den Rand reagiert.
- Mehrere Populationen nebeneinander: eine konservative (μ+λ) und innovative (μ,λ), die ihre Besten regelmäßig abgeben (`Migration`, Buch Kapitel 9).
- Zweites Diagramm f1 gegen f2 aller Eltern (`chart2`), um die Pareto-Front zu sehen.
