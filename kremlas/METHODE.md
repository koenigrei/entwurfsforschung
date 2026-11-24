# Methode: KREMLAS · Dichte Packung

Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · Stand 23.11.2026 · Lizenz CC BY 4.0

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

## Prüfer

- `node --test` im Ordner `kremlas/` (50 Tests, 24.11.2026): Regeln des Originals nachgerechnet (Rundung wie C#, Kollision, Federn, Selektion), Verhalten über mehrere Saaten (Stern gelöst, Grundriss mit Türen), Plan-Prüfung an Hand-Beispielen, Suche wiederholbar.
- `py -3.14 simulationen/pruefe_apps.py kremlas`: Browser, hell/dunkel, 1440/390 px, `pruef_ausdruck` (gültiger Plan nach 400 Generationen).
- Plan gültig, wenn jede geforderte Nachbarschaft eine Tür hat (gemeinsame Wand ≥ 1,1 m), Überlappung < 0,05 m², jeder Raum seine Mindestbreite und ≥ 95 % seiner Fläche hat, L-Teile sich auf der Mindestbreite berühren und bündig liegen.

## Handschrift

Das Modell erfasst Anordnung und Topologie, nicht Stil. Gleiche Regeln ergeben je nach Saat verschiedene, gleichwertige Grundrisse. Dem Menschen bleiben Raumprogramm, Nachbarschaften, Mindestmaße, L-Form je Raum, das Ziehen einzelner Räume und die Wahl unter den gefundenen Lösungen.

## Was trägt

- Programmfehler beheben und benennen, Eigenheiten behalten: Federrichtung und tote Federn bei Berührung waren Fehler des Originals; erst danach zogen sich die Räume sichtbar zusammen.
- Bewerten, was am Ende geprüft wird: Erst f3 am abgeleiteten Plan machte gültige Grundrisse häufig (vorher kein gültiger Lauf).
- Gleitende statt stufige Fehlermaße (Türen als Abstand + fehlende Wandlänge), damit Selektion und Nachbesserung kleine Fortschritte sehen.
- Viele kurze Läufe statt eines langen: Treffer kommen fast immer früh oder gar nicht.

## Stolperfallen

- Sortierung mit Untergrenze 1 (`FitOverl` des Originals) macht alle fast gültigen Pläne gleich gut – f3 ohne diese Grenze sortieren.
- Feste Mindestbreiten bei 100 % Belegung verhaken die Packung; 96 % Belegung und das Teilen kleiner Überlappungen lösen das.
- Manche Programme sind geometrisch kaum lösbar (10 Räume im Stern: die Mindestbreiten der Nachbarn sind länger als die Wand des Flurs); das ehrlich melden statt die Suche endlos laufen zu lassen.
- Ein Zustand aus der Suche lässt sich nicht allein aus Saat und Generation nachrechnen, wenn er nachgebessert wurde; deshalb wird er direkt übergeben (`SIM.lade`).
