# Quelle · Dichte Packungen I/II

| | |
|---|---|
| Originalprogramm | `06_minUeberschn` – „Dichte Packungen I“ (Delphi 2005: `main.pas` mit `Button_createRechtClick`, `ApplicationEvents1Idle`, `overlap`, `optimize`, `Selectionsort`, `schneideRecht`, `sumAreas`; `rechteck.pas`); Fassung `07_packingScale` – „Dichte Packungen II“ („Programm zur Berechnung dichter Packungen mittels evolutionärer Strategie, Version 1.01“) |
| Sprache | Delphi (Object Pascal, Borland Delphi 2005) |
| Autor | Reinhard König |
| Datum | 17.05.2005 – neueste Quelltextdatei im ZIP `06_minUeberschn/main.pas` (17.05.2005 13:18); die alte Seite nennt „050516“. Fassung II: alte Seite „050517“, das ZIP enthält den Stand 1.01 vom 17.11.2005 (`main.pas`, `main.dfm`). |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm (Anker `#overlap2`, `#Packung`) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/06_minUeberschn.zip`, `07_packingScale.zip`, Bilder `06_ueberschn.gif`, `07_packing.gif` (nur gelesen; keine .exe ausgeführt) |
| Idee | Tomor Elezkurtaj, Georg Franck: „Algorithmic Support of Creative Architectural Design“ (laut alter Seite) |

## Übernommen

- **Felder** (`ImagePaint`): Fassung I 409 × 393, Fassung II 580 × 400 Pixel. Rechtecke rot mit grünem Umriss, Überschneidungen blau, schwarzer Grund.
- **Schieberegler** (`main.dfm`) mit Bereichen und Voreinstellungen: Rechtecke („generate per Click“) 1–100, I: 20, II: 15; Rechteckgröße (halbe Kantenlänge, `Size`) I: 30, II: 61; Variationsweite 1–100, I: 10, II: 1; Mutationsrate 0–50 %, I: 1, II: 1. Beim Wechsel der Fassung gelten deren Voreinstellungen.
- **Varianten** `nrPop`: I 10, II 16. **Erzeugen** (`Button_createRechtClick`): jede Variante für sich, Mittelpunkt `Size + random(Width − 2·Size)`, `Size + random(Height − 2·Size)`, Quadrat mit halber Seite `Size`. Danach sofort `overlap`.
- **Fitness** (`schneideRecht`, `sumAreas`): Summe der Flächen aller paarweisen Schnitte (`IntersectRect`, Berührung zählt nicht, Mehrfachüberlagerungen mehrfach).
- **Auswahl** (`overlap`, `Selectionsort`): wörtlich übernommen. `Selectionsort` sortiert die Flächen und schreibt `listInd[I] := j; listInd[I+1] := i` bei jeder Verbesserung. `area_ind[0]` ist so stets die (erste) beste Variante. In Fassung II sind `area_ind[1..3]` dagegen keine verlässliche Rangfolge: Nachgerechnet über 10 000 Generationen mit den Voreinstellungen sind die vier Eltern in rund jeder sechsten Generation nicht die vier besten Varianten, in jeder zehnten kommt ein Elter doppelt vor (dann stammen acht Varianten vom selben Elter). Diese Eigenheit bleibt (Test „Selectionsort wörtlich“); die App zeigt die Eltern als Kennzahl.
- **Ende**: `If area[0] > 100 then optimize … else 'Programm bereit'`; das Idle-Ereignis ruft `overlap`, solange die Fläche über 100 liegt. Gezeigt wird die beste Variante mit ihren Überschneidungen.
- **optimize, Fassung I**: alle Varianten außer der besten werden zu Kopien der besten; je Rechteck mit `mutRat > random(100)` ein zufälliger Ort `random(Width)`, `random(Height)`, sonst `± (random(2·varSteps + 1) − varSteps)` in x und y; danach Mittelpunkt auf `Size … Width − Size` begrenzt. Reihenfolge der Zufallszahlen wie im Original.
- **optimize, Fassung II**: Kopie aller Varianten (`tempList`); Variante K bekommt den Elter `ind[counter]` mit `counter = Ceil(K/4 − 0.9)` (je vier Varianten eines Elters); Ort wie in I, dazu `cx := cx_Elter + random(2·scalStep + 1) − scalStep` (`scalStep = varSteps`), Grenzen 10 … `round(Width/2 − 5)`, `cy := round((IR / (2·cx)) / 2)` mit `IR = round((2·Size)²)`, Grenzen 10 … `round(Height/2 − 5)`; Mittelpunkt mit `cx`/`cy` im Feld gehalten. Zurückgeschrieben wird in alle Varianten außer `ind[0..3]`. `round` rundet wie Delphi .5 zur geraden Zahl.
- **Kennzahlen** des Originals: min. Überlagerungsfläche, Feldfläche ges., Rechteckfläche ges. (`numbers · (2·Size)²`), „Optimierung läuft …“ / „Programm bereit“.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt Delphis `random` ohne Saat. Ein Schritt = eine Generation (ein Aufruf von `overlap`). „Zurück“ entspricht „Rechtecke erstellen“; „Rechtecke löschen“ entfällt.
- **Zwei Programme, eine App**: `07_packingScale` ist laut alter Seite ein „Update des Überschneidungsflächen-Programms für Dichte Packungen I“ und teilt allen Code; es steht hier als Fassung II zur Auswahl (eigenes Feld, 16 Varianten, eigene Voreinstellungen).
- **Fläche an der Grenze (Fassung II)**: Erreicht die Höhe ihre Grenze (unter 10 oder über Feld/2 − 5), rechnet das Original die Breite als `round(IR / cy)` – das ist das Vierfache der richtigen Breite, das Rechteck wird viermal so groß und kann über das Feld hinausragen (mit den Voreinstellungen bei Breiten unter 19). Hier `round(IR / (4·cy))`, damit die Fläche wie beschrieben erhalten bleibt („Der Flächeninhalt bleibt dabei erhalten“). Solche Varianten wären im Original sofort ausgeschieden; am Verlauf ändert sich wenig.
- **Rechteckgröße 1–100** statt 0–100: Größe 0 ergäbe leere Rechtecke ohne Fläche. Rechtecke, Rechteckgröße und Fassung setzen die App zurück; Variationsweite und Mutationsrate wirken sofort, wie im Original, das sie in jeder Generation neu liest. (Im Original wirkte auch eine neue Rechteckgröße sofort auf die Nachkommen, nicht aber auf die beste Variante – das hätte Varianten verschiedener Größe verglichen.)
- **Verlauf** neu: Diagramm der kleinsten Überlagerungsfläche je Generation (logarithmisch, Linie bei 100), rechts neben dem Feld oder darunter, abschaltbar. Neu sind auch die Kennzahlen Generation, beste Variante, Eltern (Fassung II) und Belegung.
- **Farben**: Rot, Blau und Grün etwas gedämpft; Grund schwarz bzw. in heller Darstellung hell.
- **Nicht übernommen**: die eingebundene, aber unbenutzte Unit `SortThds.pas` (Sortier-Demo von Borland) und die auskommentierten Teile von `rechteck.pas`.
