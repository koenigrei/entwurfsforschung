# AGENTS.md · KREMLAS · Dichte Packung

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `simulationen/_gemeinsam/` (gleiche relative Lage wie auf der Website).

## Worum es geht

Fachlich treue Neuumsetzung des Layoutsolvers „Dichte Packung“ (Einpassung, C#, Reinhard König, DFG-Projekt KREMLAS 2009–2011; Quelle `Source/Kremlas/` im Repository cpg_all). Sieben Fassungen (`p.fassung`): `einpassung` (Stand des Programms, `REvo.RunAdjust`), `kollision` (nur Kollisionserkennung), `topologie` (Stern, `REvo.RunTopo`), `gang` (Testszenario mit Gang und drei Wohnungen) sowie `grundriss6` (Voreinstellung der App, Programm angenommen), `grundriss8` und `grundriss10` (Grundriss-Generator: Raumprogramme aus `GrowPolys`, Nachbarschaften angenommen, Eingang als Nachbar −1, Grundriss mit Wänden und Türen über `grundriss()`/`tueren()`). Regler `belegung`: Anteil des Umgebungsrechtecks (im Original fest 0,75), `minSeite`: kürzeste Seite · √Fläche (Original 0,75, Grundriss 0,4), `grundrissTopo`: "stern" (Buch) oder "wohnung" (angenommen, nur mit Raumprogramm wirksam, die Auswahl erscheint nur in den Grundriss-Fassungen), `federRunden`: wie oft je Kind Federn und Kollisionserkennung abwechseln (Original 2; Topologie und Gang 10, Grundriss 5), `mindest` (neu, nur mit Raumprogramm): Mindestbreiten je Raum im Erbgut (`PROGRAMME[…].raeume[i][3]` in m, Annahmen außer Flur nach DIN 18040-2), Plan-Bewertung f3 (`planPruefung`) statt f2 in der Selektion, kleine Überlappungen teilt der Plan (`TEILE_PX`), Belegung 96 %; aus = Stand wie im Buch. Lösungssuche (`sucheNeu`/`sucheWeiter`, Bereich „Lösungen“ unter der Zeichenfläche): viele kurze Läufe, Nachbessern (`nachbessern`), Maximin-Auswahl (`waehleVerschiedene`), Laden in die Einzelansicht (`zustandAusTreffer` + `SIM.lade`). Tab Palladio (`palladio/index.html`, `window.KREMLAS_SEITE = "palladio"`, lädt `../vorbilder_palladio.js` vor `../modell.js`): Fassungen `pal_<villa>` aus `registriere(D)`, Feld je Programm (`setzeFeld`, Getter `BREITE`/`HOEHE`/`PX_M`), Symmetrie (`z.sym`, `symmetrisiere`), Raumtausch, Ähnlichkeit zum Vorbild (`aehnlichkeit`, Spiegelungen gelten als gleich), Regler `naehe`. Vorbilder neu erzeugen: `node werkzeuge/vorbilder_palladio.cjs [Pfad zu kern.js der Konzeptstudie Palladio]`, `node werkzeuge/vorbilder_siza.cjs [Pfad zu kern.js des Experiments Malagueira]`. Tab Siza (`siza/`, `KREMLAS_SEITE = "siza"`, Fassungen `sz_<haus>_<eg|og>`): feste Räume (`z.fest`, `fixiere`), Anker der Teile (`g.an`), Türbreite je Programm (`feld.tuer`, `feld.tuerRand`). Starre Raumform: Regler `starr` (`z.starr`, `formen`). Vorbild unter dem Plan: `zeichneVorbildPlan` in `app.js`. Voreinstellungen je Vorbild: `node werkzeuge/abstimmen.cjs [Fassungen] [roh.jsonl]`, dann `--zusammenfassen` → `werkzeuge/abstimmung.json`, danach die Übersetzer neu laufen lassen. `lform` (Bitmaske, verborgener Regler, Kästchen je Raum in `app.js`): L-förmige Räume aus Hauptteil (Gen id = Raum) und Schenkel (Gen id ≥ Räume, `g.r` = Raum); `lMoeglich`, `lRaeume`, `variiereAnteil`; Pläne, Türen und Prüfung gruppieren nach `r`. Ausgangspunkt der gesamten Entwicklung: Elezkurtaj, Franck (2002), Algorithmic Support of Creative Architectural Design, Umbau 19, 129–137, https://www.researchgate.net/publication/255606960_Algorithmic_Support_of_Creative_Architectural_Design. Buch: Donath, König, Petzold (Hrsg.), KREMLAS, Weimar 2012, urn:nbn:de:gbv:wim2-20120509-16504 (Kap. 5, 9, 12). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten (Rooms, Pressure, Rooms Overlap, spring Damp, repel/proport. Force und Rate, Elite, (μ+λ)-ES). Bewusst übernommene Eigenheiten: Sg < 1 gilt als gleich gut, Berühren zählt als Kollision mit Vektor 0, die Schwellen 1,25 und 1,5 · Räume aus dem Code. Behoben: Der Federzuschlag für die Durchgangsbreite war im Original immer positiv (zog die Hälfte der Federn falsch herum), und sich berührende oder leicht überlappende Räume bekamen keinen Zug (Feder tot, obwohl die gemeinsame Kante zu kurz war).

## Aufbau

```
simulationen/_gemeinsam/  gemeinsamer Rahmen der Frühen Simulationen (nicht kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
kremlas/                eigenes Lab-Projekt (seit 23.11.2026; bis dahin simulationen/kremlas-dichte-packung/), nutzt ../simulationen/_gemeinsam/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  grammatik.js       Regeln über Raumeigenschaften (Versuch 4): Zonierung, Regeln am Plan, Regeln als Mutation; über setzeGrammatik eingehängt
  verschachtelt.js   verschachtelte dichte Packung (Versuch 6): erst Raumgruppen, dann die Räume je Gruppe; nutzt grammatik.js (klippe, zusammensetzen)
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
| `grundriss(ind, durchgaenge, teile)`, `tueren(R, paare, breite)` | Grundriss ableiten (Räume wachsen in die Restflächen; `teile` > 0: Überlappungen bis zu dieser Tiefe teilen) und Türen an gemeinsamen Kanten |
| `planPruefung(ind, paare, programm)` | Plan prüfen: `{f3, fehlt, tuer, breite, flaeche, ue, raeume, gueltig}` (Türen, Mindestbreite, Fläche ≥ 95 %, Überlappung < 0,05 m²) |
| `sucheNeu(param, neueZufall, o)`, `sucheWeiter(S, budget)` | Suche gültiger Grundrisse in Zeitscheiben: `o.anzahl`, `o.saat` (erste Saat), `o.ziel`, `o.generationen` (200 je Lauf), `o.laeufe`; Treffer `{saat, t, ind, eltern, wert, plan, nachgebessert}` |
| `nachbessern`, `planAbstand`, `waehleVerschiedene`, `zustandAusTreffer` | örtliche Suche auf f3, Abstand zweier Pläne (m), Maximin-Auswahl, Zustand aus einem Treffer |
| `feld.umriss`, `feld.kanten`, `feld.eingang`, `feld.wand` (Programm) | neu 27.11.2026: Feld als Vieleck (m, auch schräge Kanten) mit Kantenart "fassade"/"innen", Vorraum vor der Wohnungstür (Nachbar −1), Wandstärke; Getter `UMRISS`, `HINDERNIS`, `FASSADE`, `EINGANG`, `WAND` (px) |
| `klippe(P, x1, y1, x2, y2)`, `vielFlaeche(P)`, `streckeIn(s, …)` | Vieleck auf Rechteck beschneiden, Fläche, Länge einer Strecke im Rechteck |
| `funktionsmass(R, P)` | Räume mit `opt.fassade` an der Fassade (≥ 1,1 m) oder an einem Außenraum (`opt.aussen`): `{n, ok, fehlt, je, fehl}`; in `planPruefung` als `funktion`, `funk` |
| Parameter `funktion`, `dreh90`, `knapp` | nicht in `REGLER` (keine Bedienelemente): Funktionsmaß in f3 und Gültigkeit; Ähnlichkeit auch um 90° gedreht; Flächenausgleich bei knappen Fehlern auch für Wohnungen |
| `grammatik.js` (eigenes Modul, `Grammatik`) | neu 27.11.2026 (Versuch 4): `eigenschaften(prog)`, `zonierungen(prog, {anzahl, saaten, saat, sym, festMeiden, festEingang})` (Versuch 5, 28.11.2026, alle aus: `sym` symmetrische Zonierung an der senkrechten Achse mit Achsenspalte, rechte Zone über `spiegleTeile(prog, zon, teile)` gespiegelt; `festMeiden` Band ohne feste Räume; `festEingang` ohne Eingang −1 beginnt das Band am festen Raum an der Erschließung, `festEingang(prog, E)`), `teilprogramm(prog, zon, i)` → `{prog, abbild, ursprung}`, `zusammensetzen(M, prog, zon, teile)`, `aufraeumen(M, ind, paare, programm, zufall, ms)` → `{ind, wert, angewandt}`, `mutiere(c, z, P, rate, zufall, M)`; nur Raumeigenschaften (`opt.fassade`, `opt.aussen`, `opt.fest`, `opt.erschliessung`), keine Namen; Tests `test/grammatik.test.mjs` (Prüfprogramm Büro) |
| `setzeGrammatik(G)`, Parameter `grammatik` | Modul einhängen; mit `grammatik` > 0 wendet `mutiere` je Kind mit dieser Wahrscheinlichkeit eine Regel an; nicht in `REGLER`, ohne Parameter unverändert. Dazu `kanteSchieben`, `planAlsInd`, `rechteck(g)`, Getter `FEST` für das Modul |
| `verschachtelt.js` (eigenes Modul, `Verschachtelt`) | neu 28.11.2026 (Versuch 6, Idee Reinhard: erst Raumgruppen in der umgebenden Form packen, dann die Räume je Gruppe): `gruppierungen(prog, {verfahren: ["graph", "eigenschaft"], groessen: [4, 3, 5], erschliessung: ["mit", "eigen"]})` (gierige Zusammenfassung des Nachbarschaftsgraphen bzw. nach Eigenschaften; mit Symmetrie gespiegelte Gruppen und Achsgruppen; feste Räume einzeln und fest), `gruppenprogramm(prog, grp)` (Gruppen als Räume, Fläche mit Wand), `zonen(prog, grp, rects)`, `teilprogramm(prog, zon, j, {geloest})` (Teilfeld mit Fassadenkanten; Nachbarschaften über die Grenze als Anschlüsse), `loese(M, f, {budget, param, zufall, saat, naehe, verfeinern, verfeinernAuchGueltig, ziel, verfahren})` → `{treffer, bestInd, tErster, tErsterDirekt, stat}` (Gruppen der Reihe nach gepackt, Anschluss dort, wo der Nachbarraum schon liegt; Rückkopplung zur oberen Ebene; ohne zwei Gruppen eine Ebene); nur Raumeigenschaften, keine Namen; Tests `test/verschachtelt.test.mjs`; Versuchsskript `werkzeuge/verschachtelt_vorbilder.cjs`; nicht in der App |
| `feld.anschluesse` | neu 28.11.2026 (Versuch 6): weitere Vorräume außerhalb des Umrisses (Rechtecke in m) = Nachbarn −2, −3, … (Anschluss j ist −2 − j), wie `feld.eingang`; Getter `ANSCHLUSS`; ohne Angabe unverändert |
| Parameter `impfung` | neu 27.11.2026 (Versuch 3, Fallinjektion): `{faelle: [[[x0, y0, x1, y1] …] je Raum oder null], anteil: 0.3, streuung: 0.3}`; `impfe(G, fall, zufall, streuung)` setzt Mittelpunkt und Seitenverhältnis der ersten round(anteil · μ) Eltern; nicht in `REGLER`, ohne den Parameter unverändert |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.lade(z, saat)`, `SIM.setze("fassung", "topologie")`, `SIM.zustand`, dazu `Modell.beste(SIM.zustand)`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&fassung=gang&mu=12`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py kremlas` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Frei eingegebene Raumprogramme und Nachbarschaften (Nachbarschaft per Klick auf zwei Räume), nicht rechteckige Umrisse (L-Form, wie im AIEDAM-Artikel 2014).
- Belegung 100 % zuverlässiger erreichen, z. B. mit einer Proportionsänderung, die auch auf den Rand reagiert.
- Suche mit acht und zehn Räumen beschleunigen (Plan-Prüfung ist der teuerste Teil; Web Worker, Prüfung nur für vielversprechende Kinder), Mindestmaße im Bedienfeld einstellbar.
- Mehrere Populationen nebeneinander: eine konservative (μ+λ) und innovative (μ,λ), die ihre Besten regelmäßig abgeben (`Migration`, Buch Kapitel 9).
- Zweites Diagramm f1 gegen f2 aller Eltern (`chart2`), um die Pareto-Front zu sehen.
