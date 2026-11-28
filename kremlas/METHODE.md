# Methode: KREMLAS · Dichte Packung

Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · Stand 28.11.2026 · Lizenz CC BY 4.0

**App:** https://entwurfsforschung.de/lab/kremlas/ · **Quellcode:** `kremlas/` im Repo entwurfsforschung, `quellcode.zip` neben der App · **Einstieg für Agenten:** `AGENTS.md`, Abweichungen vom Original: `QUELLE.md`

## Frage

Wie findet ein Computer einen Grundriss, wenn nur die Räume, ihre Flächen und ihre Nachbarschaften bekannt sind – und wann ist das Ergebnis ein Grundriss, der funktioniert (Türen, Mindestmaße)? Ausgangspunkt ist der Layoutsolver „Dichte Packung“ aus dem DFG-Projekt KREMLAS (2009–2011); er wird hier fachlich treu neu umgesetzt und ausgebaut.

## Vorbild und Quellen

- Ausgangspunkt der gesamten Entwicklung: T. Elezkurtaj, G. Franck (2002): *Algorithmic Support of Creative Architectural Design.* Umbau 19, S. 129–137, https://www.researchgate.net/publication/255606960_Algorithmic_Support_of_Creative_Architectural_Design.
- Originalprogramm: C#-Projektmappe `Einpassung_21.sln` (Reinhard König, Computational Planning Group), Repository cpg_all, `Source/Kremlas/` (https://bitbucket.org/koenigr/cpg_all).
- D. Donath, R. König, F. Petzold (Hrsg.): *KREMLAS. Entwicklung einer kreativen evolutionären Entwurfsmethode für Layoutprobleme in Architektur und Städtebau.* Weimar: Verlag der Bauhaus-Universität 2012, urn:nbn:de:gbv:wim2-20120509-16504 (Kap. 5, 9, 12).
- Raumprogramme mit 8 und 10 Räumen: Buch Tab. 8 und 9 (Szenarien nach Flemming et al. 1992); 6 Räume angenommen.
- Kollisionserkennung nach dem Separating Axis Theorem (Verfahren nach Cozic), für achsparallele Rechtecke eigenständig formuliert.
- Mindestbreite des Flurs: DIN 18040-2:2011-09, *Barrierefreies Bauen – Planungsgrundlagen – Teil 2: Wohnungen*; übrige Mindestbreiten sind Annahmen (DIN 18011 ist zurückgezogen).

## Darstellung

Ein Individuum ist eine Liste achsparalleler Rechtecke („Gene“) mit fester Fläche in einem Umgebungsrechteck (500 × 430 px, in den Grundriss-Fassungen 50 px = 1 m, Feld 10 × 8,6 m). Frei sind Lage und Seitenverhältnis. L-förmige Räume bestehen aus zwei Genen (Hauptteil und Schenkel, Verweis `r` auf den Raum). Geforderte Nachbarschaften sind Paare von Raumnummern, der Außenraum hat die Nummer −1. Aus der Packung wird ein Plan abgeleitet: Räume wachsen in die Restflächen, kleine Überlappungen werden geteilt, Türen sitzen mittig an gemeinsamen Wänden.

## Korpus

Kein Korpus echter Grundrisse. Maßstab ist das Originalprogramm (Quelltext, Voreinstellungen, Buch). Die Raumprogramme stammen aus dem Buch bzw. sind ausgewiesene Annahmen.

## Generator

Hybride Evolutionsstrategie (μ+λ) bzw. (μ,λ): Rekombination (Partially Mapped Crossover über die Raumnummern), Mutation (Verschiebung N(0, σ), Proportionsänderung, Inversion), danach „Entwicklung“ jedes Kindes durch Kollisionserkennung (Rand, Proportionsänderung, Abstoßen). Mit Topologie ziehen virtuelle Federn geforderte Nachbarn zusammen; Federn und Kollisionserkennung wechseln je Kind mehrmals ab (Federrunden). Selektion getrennt nach f1 (Überlappung Sg) und f2 (Distanzen) wie im Original; mit Mindestmaßen ersetzt f3 (Bewertung des abgeleiteten Plans: Türen gleitend gemessen, Breiten, Flächen, Überlappung, L-Form) das Kriterium f2. Die Lösungssuche startet viele kurze Läufe mit neuen Saaten, bessert Beinahe-Lösungen örtlich nach (memetisch) und wählt unter den Treffern möglichst verschiedene (Maximin).

## Vorbilder nachgenerieren (Palladio)

Tab `palladio/`: Raumprogramm, Türen und Spiegelachse von acht Villen aus der Palladio-Grammatik (G. Stiny, W. J. Mitchell 1978, doi:10.1068/b050005; G. Stiny, J. Gips 1978, doi:10.1068/b050199); Räume mit halben Wänden, Säle aus Teilen, Feld in Metern. Die Packung bekommt keine Lagen, nur das Programm. Neu: Spiegelsymmetrie, Raumtausch, Ähnlichkeit (Schnitt durch Vereinigung je Raum, gespiegelte Pläne gleich), Regler Nähe zum Vorbild (Rekonstruktion bis Varianten). Ergebnis: sechs von acht Villen mit 92–98 % Ähnlichkeit rekonstruiert, Malcontenta 82 %, Pisani (I-Saal) 48 %.

## Vorbilder nachgenerieren (Siza/Duarte)

Tab `siza/`: sechs Häuser der Malagueira-Grammatik (J. P. Duarte 2005, doi:10.1068/b31124; eigene Rekonstruktion, keine Korpusdaten), Erd- und Obergeschoss getrennt; im OG Treppe und Luftraum fest; Türen 0,80 m wie in der Grammatik. Einstellungen je Vorbild abgestimmt (`werkzeuge/abstimmen.cjs`). Erdgeschosse meist 96–100 % ähnlich, Obergeschosse mit Fluren aus Teilen 54–99 %.

## Reale Grundrisse nachgenerieren (Grundrisssammlung, Test)

Kein Tab, ein Test von außen (`Grundrisse/sammlung/kremlas_test/` im Repo Planungsgrundlagen, Bericht `BERICHT.md`): 100 möglichst verschiedene Wohnungen aus Swiss Dwellings (Standfest et al., doi:10.5281/zenodo.7788422, CC BY 4.0), gerade gedreht und als Programm im Format der Vorbilder übergeben. Erster Lauf (27.11.2026, modell.js unverändert): 60 gültig, Ähnlichkeit 0,54 bei den gültigen. Daraus neu (27.11.2026, alles nur wirksam, wenn das Programm es angibt): Feld als Vieleck mit Fassade und Innenkanten, auch mit schrägen Außenwänden (`feld.umriss`, `feld.kanten`), Vorraum vor der Wohnungstür als Nachbar −1 (`feld.eingang`), Wandstärke (`feld.wand`), Funktionsmaß „Räume mit `opt.fassade` an der Fassade“ (gemessen; mit Parameter `funktion` auch Kriterium; welche Räume, bestimmt das Programm – bei Wohnungen Wohnen, Zimmer, Essen), Ähnlichkeit auch um 90° gedreht (`dreh90`), Flächenausgleich bei knappen Fehlern (`knapp`), Ketten aus beliebig vielen Teilen über `opt.anker` (in der Sammlung: Flure bis acht Teile), Regler je Raumzahlgruppe abgestimmt (`abstimmen.py` im Testordner). Ergebnisse des zweiten Laufs im Bericht. Versuch 3 (27.11.2026): Genpool aus allen verschiedenen Wohnungen der Sammlung, die ähnlichsten Fälle (allgemein über Programm, Raumeigenschaften, Graph und Feld, ohne Raumnamen) impfen die Startpopulation (`impfung`, Fallinjektion nach S. J. Louis, J. McDonnell 2004, IEEE Transactions on Evolutionary Computation 8(4), 316–328); Ergebnis im Bericht. Versuch 4 (27.11.2026): Formgrammatik und dichte Packung in drei Arten (Modul `grammatik.js`, Regeln nur über Raumeigenschaften): hierarchisch (Zonierung mit Rückgrat der Erschließung, KREMLAS je Zone, Zusammensetzen), Regeln am fertigen Plan, Regeln als Mutation. Bei den Wohnungen der Sammlung keine Verbesserung gegenüber KREMLAS allein (Unterschiede im Rauschen zweier Saaten); bei Programmen außerhalb des Wohnens (Büro, Schule) findet die hierarchische Art in unter 1 s gültige Pläne, wo KREMLAS allein in 150 s keinen bzw. selten einen findet. Ergebnis im Bericht. Versuch 5 (28.11.2026): hierarchische Art an allen 20 Vorbildern der App, dazu allgemeine Optionen `sym` (symmetrische Zonierung mit Achsenspalte), `festMeiden`, `festEingang` (Band beginnt an der Treppe) in `grammatik.js`; verbessert weder Palladio (0,94 → 0,92, 3–6× langsamer) noch Duarte/Siza (mehr gültige Erdgeschosse, aber ohne Ähnlichkeit) – bleibt aus der App (`werkzeuge/hierarchisch_vorbilder.cjs`). Versuch 6 (28.11.2026): verschachtelte dichte Packung (Modul `verschachtelt.js`): Gruppen aus Graph, Eigenschaften oder Symmetrie, KREMLAS packt erst die Gruppen im Feld, dann die Räume je Gruppenfläche (Nachbarn über die Gruppengrenze als Anschlüsse `feld.anschluesse`), Rückkopplung und Verfeinerung des Gesamtplans; hilft bei den kleinteiligen Siza-Erdgeschossen (26 statt 6 von 30 Läufen gültig, Obergeschosse 14 statt 21), sonst nicht (Wohnungen 52 statt 60, Palladio gleich gültig, aber langsamer) – bleibt aus (`werkzeuge/verschachtelt_vorbilder.cjs`). Alle Zahlen und die Antworten auf naheliegende Ideen im Abschnitt „Schon erprobt“ unten und in Kapitel 10 der Dokumentation.

## Prüfer

- `node --test` im Ordner `kremlas/` (79 Tests, 28.11.2026; davon 7 für `grammatik.js` an allgemeinen Prüfprogrammen: Büro, symmetrisches Programm, Geschoss mit Treppe, und 6 für `verschachtelt.js`): Regeln des Originals nachgerechnet (Rundung wie C#, Kollision, Federn, Selektion), Verhalten über mehrere Saaten (Stern gelöst, Grundriss mit Türen), Plan-Prüfung an Hand-Beispielen, Suche wiederholbar.
- `py -3.14 simulationen/pruefe_apps.py kremlas`: Browser, hell/dunkel, 1440/390 px, `pruef_ausdruck` (gültiger Plan nach 400 Generationen).
- Plan gültig, wenn jede geforderte Nachbarschaft eine Tür hat (gemeinsame Wand ≥ 1,1 m), Überlappung < 0,05 m², jeder Raum seine Mindestbreite und ≥ 95 % seiner Fläche hat, L-Teile sich auf der Mindestbreite berühren und bündig liegen.

## Handschrift

Das Modell erfasst Anordnung und Topologie, nicht Stil. Gleiche Regeln ergeben je nach Saat verschiedene, gleichwertige Grundrisse. Dem Menschen bleiben Raumprogramm, Nachbarschaften, Mindestmaße, L-Form je Raum, das Ziehen einzelner Räume und die Wahl unter den gefundenen Lösungen.

## Was trägt

- Programmfehler beheben und benennen, Eigenheiten behalten: Federrichtung und tote Federn bei Berührung waren Fehler des Originals; erst danach zogen sich die Räume sichtbar zusammen.
- Bewerten, was am Ende geprüft wird: Erst f3 am abgeleiteten Plan machte gültige Grundrisse häufig (vorher kein gültiger Lauf).
- Gleitende statt stufige Fehlermaße (Türen als Abstand + fehlende Wandlänge), damit Selektion und Nachbesserung kleine Fortschritte sehen.
- Viele kurze Läufe statt eines langen: Treffer kommen fast immer früh oder gar nicht.
- Erschließung zuerst (Versuch 4): Wo viele Räume an einem Flur hängen (Büro, Schule), legt die Grammatik das Band mit genug Anschlusslänge fest und KREMLAS packt nur noch die Zonen – gültig in unter 1 s statt nie. Bei Wohnungen mit wenigen, verschränkten Räumen bringt die Zonierung nichts.
- Zonierung passt nur, wenn sie die Ordnung des Vorbilds trifft (Versuch 5, 28.11.2026): Bei Palladio (Raster mit zusammengesetzten Sälen auf der Achse) und den Siza-Obergeschossen (Flurketten um Treppe und Luftraum) verbessert die hierarchische Art die Rekonstruktion nicht; KREMLAS allein rekonstruiert sechs Villen in rund 3 s fast vollständig. Für Raster wäre eine eigene, allgemeine Zonierungsregel nötig.
- Vorentscheidungen nur, wo sie die Ordnung treffen (Versuche 3–6, 28.11.2026): Startlage aus ähnlichen Fällen, Zonen aus Regeln, Raumgruppen aus dem Graphen – alles, was die Lage von Räumen festlegt, bevor die Packung sie aushandelt, kostet Spielraum an den Grenzen. Es lohnt sich nur bei einem dominanten Erschließungsraum (Zonierung) bzw. bei kleinteiligen Programmen, die KREMLAS allein kaum löst (verschachtelt). Fast alle gültigen Pläne der hierarchischen und verschachtelten Art entstehen erst in der abschließenden dichten Packung des ganzen Programms.
- Messen an Programmen, die nicht zur Entwicklung benutzt wurden: Die Grammatik war an Büro und Schule stark, an Kita und Zweispänner-Geschoss (nicht benutzt) war KREMLAS allein am besten.

## Stolperfallen

- Sortierung mit Untergrenze 1 (`FitOverl` des Originals) macht alle fast gültigen Pläne gleich gut – f3 ohne diese Grenze sortieren.
- Feste Mindestbreiten bei 100 % Belegung verhaken die Packung; 96 % Belegung und das Teilen kleiner Überlappungen lösen das.
- Manche Programme sind geometrisch kaum lösbar (10 Räume im Stern: die Mindestbreiten der Nachbarn sind länger als die Wand des Flurs); das ehrlich melden statt die Suche endlos laufen zu lassen.
- Regeln am fertigen Plan, die nur f3-senkende Schritte annehmen, bleiben sofort in örtlichen Minima stecken (Versuch 4: 1 von 47 Plänen gültig gemacht, die zufällige örtliche Suche gleich lang 8); eine Zonierung, die nur Flächen bilanziert, übersieht die Anschlusslänge am Flur (Flur zu kurz für die Türen) – beides in der Grammatik ergänzen bzw. melden.
- Ein Zustand aus der Suche lässt sich nicht allein aus Saat und Generation nachrechnen, wenn er nachgebessert wurde; deshalb wird er direkt übergeben (`SIM.lade`).
- Vorbilder, die die eigene Prüfung nicht bestehen, begrenzen jede Rekonstruktion; erst prüfen (`vorbild_pruefen.cjs`), bei realen Wohnungen bestanden anfangs nur 35 von 100 (Türen an Raumresten, dicke Wände), nach dem Schließen der Wände 49.
- Ähnliche Programme heißen nicht ähnliche Anordnung: Die Lagen des ähnlichsten Falls aus 7.890 Wohnungen deckten sich mit dem Ziel nur zu 0,08 (Versuch 3); Doppelerkennung reicht für ein strenges leave-one-out nicht, fast gleiche Fälle (≥ 0,5) eigens ausschließen.
- Ein Lauf je Variante täuscht: Basis 60 und 57 gültige Wohnungen bei zwei Saatgruppen; Unterschiede unter etwa 4 von 100 nicht deuten.

## Schon erprobt: Antworten auf naheliegende Ideen

Wer KREMLAS verbessern will, kommt oft auf dieselben Ideen. Diese Tabelle sagt, was davon gemessen wurde und mit welchem Ergebnis, damit niemand von vorn anfängt. Gemessen an den 20 Vorbildern der App (Palladio, Duarte/Siza) und an 100 realen Wohnungen aus Swiss Dwellings (je 150 s), dazu an Büro, Schule, Praxis, Werkstatt, Kita und Zweispänner-Geschoss. Einzelheiten: Kapitel 9 und 10 der Dokumentation (https://entwurfsforschung.de/lab/doku/#kremlas), Bericht `Grundrisse/sammlung/kremlas_test/BERICHT.md` im Repo Planungsgrundlagen.

| Idee | Ergebnis | Stand |
|---|---|---|
| Raumformen als Gene (Rechteck, L, T, Kreuz, U) statt übernommener Form | gültige Pläne, aber zusammengesetzte Säle deutlich schlechter (Malcontenta 76 statt 93–99 %) | verworfen |
| Inselmodell, Populationen mit Austausch, auch mit gemischten Strategien | kein Gewinn, mit gleicher Strategie Verlust (Inseln laufen auf dieselben Pläne zu) | verworfen, unabhängige Läufe |
| Late Acceptance, Topologie zuerst (kraftbasiert), frische Zufallspläne je Generation | schaden | verworfen |
| Wände ausrichten, feste Räume unantastbar | neutral bzw. gemischt | aus |
| Raumgruppe spiegeln, Wände verschieben | einzelne Vorbilder gewinnen, andere verlieren; je Vorbild über zwei Saatgruppen abgestimmt | Regler in der App |
| Räume schrittweise in Teile aufspalten | schadet (58 bzw. 55 statt 62,5 %) | verworfen |
| Unterteilung statt Packung | in Schritten sinnvoll (Packung → Wandnetz → Wände verschieben), gemeinsames Chromosom verdoppelt den Suchraum | erster Baustein „Wände verschieben“ |
| Feld als Vieleck, schräge Außenwände, Wandstärke, Flurketten, knapper Flächenausgleich | Wohnungen gleich oft gültig (58 statt 60), ähnlicher (0,58 statt 0,54), schräge erstmals nachbaubar (10 von 17) | Optionen im Modell |
| Funktionsmaß „Räume mit Fassadenbedarf an der Fassade“ als Kriterium | 81 statt 62 % funktionierende Pläne, rund 7 gültige weniger | Option `funktion` |
| Genpool: ähnliche Grundrisse einer Sammlung impfen die Startpopulation (Fallinjektion) | kein messbarer Effekt (54–63 gegen 59); selbst das Original als Fall nur 65; Startlage ist nicht der Engpass | Option `impfung`, aus |
| Formgrammatik hierarchisch: Erschließung als Band, Zonen, KREMLAS je Zone | Büro und Schule in unter 1 s (allein 0–2 von 3); Wohnungen 57 statt 60; an nicht benutzten Programmen (Kita, Zweispänner) KREMLAS allein besser | `grammatik.js`, aus |
| Regeln am fertigen Plan (Tür herstellen, fluchten, Flurstück) | macht 1 von 47 ungültigen gültig, zufällige örtliche Suche 8 | aus |
| Regeln als Mutationsoperatoren | kein Effekt (56/57 gegen 60/57) | aus |
| Symmetrische Zonierung (Palladio), Band ab der Treppe (Siza-OG) | keine bessere Rekonstruktion (0,94 → 0,92), 3–6× langsamer | Optionen `sym`, `festMeiden`, `festEingang`, aus |
| Verschachtelte Packung: erst Raumgruppen im Feld, dann Räume je Gruppe | Siza-Erdgeschosse 26 statt 6 von 30 gültig, Obergeschosse 14 statt 21, Palladio gleich gültig, 0,91 statt 0,94 und langsamer, Wohnungen 52 statt 60 (ohne Verfeinerung 35), Bauaufgaben schlechter | `verschachtelt.js`, aus |

Noch nicht erprobt und aus den Befunden naheliegend: Zonierung „Raster“ (Spalten und Zeilen, Räume über mehrere Zellen) für Palladio und Bürobauten; Band aus mehreren Teilen nach der Kette des Erschließungsraums; Hallen mit eigenem Zugang (Werkstatt bleibt ungelöst); automatische Wahl, wann Zonierung oder Verschachtelung greift; Statistik aus einer Sammlung über Struktur (welche Eigenschaften an der Fassade, welche Räume um einen Flur) statt über Koordinaten; Graph-Vorprüfung für geometrisch unmögliche Programme.
