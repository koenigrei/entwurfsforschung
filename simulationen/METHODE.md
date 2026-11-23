# Methode: Frühe Simulationen

Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · Stand 23.11.2026 · Lizenz CC BY 4.0

**App:** https://entwurfsforschung.de/lab/simulationen/ · **Quellcode:** `simulationen/` im Repo entwurfsforschung, je App `quellcode.zip` · **Einstieg für Agenten:** `REZEPT.md`, `BESTAND.md`, dann je App `AGENTS.md` und `QUELLE.md`

## Frage

Die Simulationsprogramme der alten Website (Delphi, NetLogo, AutoCAD-VBA, Flash, dazu C#) werden einzeln als Web-Apps neu umgesetzt: fachlich treu, nicht pixelgleich, lauffähig im Browser und offen weiterentwickelbar. Die Sammlung zeigt, wie sich räumliche Strukturen aus lokalen Regeln, Agenten und Optimierung erzeugen lassen.

## Vorbild und Quellen

Vorbild sind die eigenen Programme von Reinhard König: 80 Programme (47 Delphi, 12 NetLogo, 11 AutoCAD-VBA, 9 Flash, 1 C#), entstanden laut `bestand.json` von spätestens 2004 (VBA, Grundlage von Bauriedel/König 2004, „Computergenerierte Stadtstrukturen“) bis 2011 (KREMLAS). Fachlicher Rahmen vieler Delphi-Programme: R. König (2008), *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Dissertation. Die Programme berufen sich ihrerseits auf Batty (*Cities and Complexity*, 2005), Portugali (2000), Schweitzer (2003), Resnick (1994), Alonso (1964), Krugman (1996), Christaller, Schelling, Elezkurtaj & Franck, Reiter; KREMLAS auf Donath, König, Petzold (Hrsg.) 2012. Genaue Angaben je App in `QUELLE.md`. Bewusste Abweichungen (feste Saat, behobene Programmfehler, engere Reglerbereiche, neue Kennzahlen) stehen dort unter „Bewusst geändert“.

## Darstellung

Je nach Modell: Zellraster (Typed Arrays), Agenten mit stetigen Koordinaten, Graphen aus Knoten und Kanten, achsparallele Rechtecke (Packung), Würfel in eigener Axonometrie (VBA). Einheiten sind meist die des Originals (Zellen, Pixel); nur die Grundriss-Fassungen von KREMLAS rechnen in Metern (50 px = 1 m, Feld 10 × 8,6 m). Modell (`modell.js`, ohne DOM) und Oberfläche (`app.js` mit dem Rahmen `_gemeinsam/sim.js`) sind getrennt.

## Korpus

Kein Korpus echter Städte oder Pläne. Maßstab ist das Originalprogramm: Quelltext (`.pas`, `.dfm`, `.nlogo`, VBA-Text, C#), Beschreibung der alten Website, Dissertation 2008, KREMLAS-Buch. Ausnahme: Die Grundriss-Fassungen von KREMLAS nutzen die Raumprogramme aus Buch Tab. 8 und 9 (Szenarien nach Flemming et al. 1992). Bestand (`bestand.json`, 21.11.2026): 50 umgesetzt, 18 als Fassung in eine App aufgenommen, 9 zurückgestellt, 2 nur Beschreibung, 1 nur Bilder.

## Generator

Methodenfamilien, nach den Gruppen in `bestand.json`:

- **Packung und Layout (Evolutionsstrategie):** `dichte-packungen-1` minimiert die Überschneidung zufälliger Rechtecke (Idee Elezkurtaj und Franck); `kremlas-dichte-packung` packt Räume fester Fläche mit Kollisionserkennung (Separating Axis Theorem) und virtuellen Federn für geforderte Nachbarschaften, bis zum abgeleiteten Grundriss mit Türen; neu (23.11.2026) eine Suche nach gültigen Grundrissen (Türen, Mindestbreiten, Flächen): Bewertung f3 am abgeleiteten Plan in der Selektion, viele kurze Läufe statt eines langen, örtliche Nachbesserung (memetisch), Maximin-Auswahl; `ueberlagerungsflaechen`.
- **Zelluläre Automaten und Wachstum:** `einfaches-wachstum` (Wahrscheinlichkeit p), `diffusionsfeld-wachstum` (Potentialfeld, Batty Kap. 3), `schneeflocke` (Reiter); als großes Modell `wachstumssimulation` (Erschließungsgraph, Potentialfeld, Parzellen; Dissertation Kap. 3.4.1 und 6).
- **Agenten und selbstorganisierte Wegesysteme:** `wegesystem-selbstorganisation` (Markierungen, Hill Climbing oder Roulette Wheel; Schweitzer), `active-walker` (Batty Kap. 5), `optimiertes-wegesystem` (Agentenparameter per genetischem Algorithmus); dazu `facs` und Schwärme.
- **Wegesuche und Graphen:** `a-stern` (A* im Raster), `wegenutzung` (Nutzungshäufigkeit auf A*-Routen), `gravitation` (Ströme nach `F_ij = P_i · P_j / d_ij²`).
- **Standortmodelle und Bodenmarkt:** `thuenen-ringe` (höchste Lagerente), `alonso` (Standort und Betriebsgröße), `krugman` (zentripetale und zentrifugale Potentiale), `zentrale-orte` (nach Christaller).
- **Segregation:** `segregation-standort` (nach Schelling), `mietpreisdynamik` (mit Mietpreislandschaft).
- **Formen und Rekursion (VBA):** `vba-rekursion` (Verzweigung Geschoss für Geschoss), `vba-2dwachstum-1` (Zufallsausbreitung von Würfeln).

Gemeinsam: Zufall nur mit Saat (`_gemeinsam/zufall.js`, mulberry32), ein Schritt = ein Zeitschritt bzw. eine Generation, Parameter mit Bereichen und Voreinstellungen des Originals, Fassungen eines Programms als Auswahl in einer App.

## Prüfer

Treue zum Original und erwartetes Verhalten, nicht Echtheit gegen reale Beispiele:

- **`node --test` je App** (`test/*.test.mjs`): je Regel ein nachgerechnetes Beispiel, Grenzfälle, gleiche Saat → gleicher Lauf, ein Verhalten aus der Beschreibung (z. B. „Segregationsgrad steigt“, „Ringfolge A–C–B“). Stand 23.11.2026: 50 Apps, 582 Tests, alle grün.
- **`pruef_ausdruck`** in `app.json`: Kennzahl im erwarteten Bereich nach n Schritten; **`pruefe_apps.py`**: Browser, hell/dunkel, 1440/390 px, Bildschirmfotos zur Durchsicht; **`pruefe.py`**: Pflichtdateien, Pflichtlinks, kein DOM in `modell.js`.
- **Messung über viele Saaten** bei Änderungen am Modell (KREMLAS: Anteil vollständig gelöster Läufe nach 100 … 2000 Generationen; Treffer der Grundrisssuche je Lauf und Fassung, `kremlas-dichte-packung/QUELLE.md`).

## Handschrift

Die Modelle erfassen Prozess und Struktur, nicht Stil. Form entsteht aus lokalen Regeln, Agentenverhalten oder Optimierung gegen eine Zielfunktion (Überlappung, Nachbarschaften, Lagerente, Toleranz); gleiche Regeln ergeben je nach Saat verschiedene, aber gleichartige Muster. Eine Handschrift von Büros oder Architekten bildet keine App nach. Was bewahrt wird, ist die Handschrift der Originalprogramme: Regeln, Reihenfolgen, Rundungen und Voreinstellungen, belegt Stelle für Stelle in `QUELLE.md`. Dem Menschen bleiben Vorgaben und Eingriffe: Parameter, Raumprogramm und Topologie (KREMLAS), Märkte, Wände, Wege und Ziele per Maus setzen, Räume festhalten und verschieben, Fassung wählen, Ergebnisse auswählen und bewerten.

## Was trägt

- **Rezept mit Vorlage** (`REZEPT.md`, `_vorlage/`, `neue_app.py`): eine App = ein Ordner, zentrale Datei nur `bestand.json`; so arbeiten mehrere Agenten parallel in Paketen (`_pakete.json`).
- **Modell ohne DOM, Zufall übergeben, Regeln als einzelne Funktionen** (`_vorlage/modell.js`): dadurch mit `node --test` prüfbar und reproduzierbar.
- **Gemeinsamer Rahmen** `_gemeinsam/sim.js` (Bedienfeld, Saat und Parameter in der Adresse, DE/EN, hell/dunkel, `window.SIM` für Prüfungen).
- **`QUELLE.md` mit „Übernommen“ und „Bewusst geändert“,** jede Regel mit Verweis auf die Originalprozedur: Treue wird nachprüfbar.
- **Fassungen statt Beinahe-Kopien** (`REZEPT.md`, „Parallel arbeiten“): 18 Programme leben als Option in einer anderen App.
- **Wer nur den Link hat, kann weiterarbeiten:** Pflichtlinks auf `quellcode.zip` und `AGENTS.md` in jeder App (`_vorlage/index.html`).

## Stolperfallen

- **Zufall mit Uhrzeit** (`Randomize`, `new Random(...)` je Objekt): durch feste Saat ersetzt; das Original hatte z. B. höchstens 1000 verschiedene Startindividuen (`kremlas-dichte-packung/QUELLE.md`).
- **Zahlen wie im Original:** Delphis Rundung (12,5 → 12), Single statt Double (`Math.fround`, `Float32Array`), Gleichstände, die im Original die letzte x87-Stelle entschied (`wachstumssimulation/QUELLE.md`); nicht stabile Sortierung in C# (`kremlas-dichte-packung/QUELLE.md`).
- **Eigenheiten wörtlich übernehmen kann das Modell lähmen:** In KREMLAS zog im Stern rund die Hälfte der Federn in die falsche Richtung, und zwischen Räumen, die sich berührten, wirkte gar keine Feder; die erste Fassung hatte beides wörtlich übernommen. Behoben 22./23.11.2026, dazu mehrere Federrunden je Kind (Regler, Original 2), Wirkung über viele Saaten gemessen (`kremlas-dichte-packung/QUELLE.md`). Programmfehler beheben und benennen, Eigenheiten behalten (`REZEPT.md`, „Grundsätze“).
- **Quellen lückenhaft** (`bestand.json`, Feld `hinweis`): fehlende ZIPs von der alten Website nachgeladen; Beschreibung nur in der Dissertation oder knapp → Regeln aus dem Quellcode erschließen; nur SWF ohne Beschreibung oder nur Bilder → zurückstellen statt Regeln erraten.
- **Delphi-Quellen in cp1252** (`iconv -f cp1252 -t utf-8`); keine .exe ausführen (`REZEPT.md`).
- **`bauen.py` parallel** stört sich, weil es `site/` löscht: nur der Koordinator baut; `pruefe_apps.py` braucht keinen Bau (`REZEPT.md`).

## Offen

Die übrigen Programme (zurückgestellt, nur Beschreibung, nur Bilder), darunter die Flash-Skizzen Fibonacci 01/02. Öffentliches Repo je App (`repo: null` in `app.json`). Ein Vergleich der Ergebnisse mit realen Städten oder Plänen (Korpus) fehlt; ob sich die Modelle für die Nachbildung einer Handschrift eignen, ist noch offen.
