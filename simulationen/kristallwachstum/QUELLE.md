# Quelle · Kristallwachstum

| | |
|---|---|
| Originalprogramm | `33_crystalGrowth` („Crystal Growth“, Projekt `ZA03_crystalGrowth.dpr`, Units `CellForm.pas`, `cell_P.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2006 – neueste Quelltextdatei im ZIP `CellForm.pas`/`.dfm` vom 11.03.2006; Download auf der alten Seite „Source - 060313“ |
| Vorbild | Erweiterung von `32_snowFlake`; Michael Batty: *Cities and Complexity* (2005), Kapitel 3 |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm#crystalGrowth |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/33_crystalGrowth.zip` (nur gelesen; die .exe wurde nicht ausgeführt) |

## Übernommen

- **setupCells**: alle Zellen `Pot 0`, `State 0`; eine Saat in Zelle (50, 50) mit `State 1`, `Pot 1` – oder mit „random seed“ vier Saaten an `cellList[random(spalt), random(reih)]` (sie können zusammenfallen).
- **Ablauf je Schritt** (`Timer1Timer`): `ageCheck` → `repi`-mal `equiPot` (`repi = iteration steps − 1`) → `paint_Field` → `dev_Cell` → `steps + 1`; Halt bei Schritt 999.
- **equiPot** (`ausgleich`): `limboPot := Σ w · (Pot_k − Pot_i)`, orthogonal `1/6`, diagonal `1/12`, Torus; danach `Pot += diffEff / repi · limboPot` für alle Zellen gleichzeitig (auch Kristallzellen).
- **dev_Cell** (`entwickle`): `checkNei` liefert die gewichtete Summe `sumState` (orthogonal 2, diagonal 1) und die Zahl `nrD` der entwickelten Nachbarn. Für jede unentwickelte Zelle mit `sumState > 0`: `temp := Ut · (1 + amplit · (random · 2 − 1)) + interF · (sumState − nrD · interEff)`; `Pot ≤ temp` → vormerken (`limboWorld`). Danach gleichzeitig: `State 1`, `Pot + 1`, `birth := steps`. Eine Zufallszahl je Randzelle, zeilenweise.
- **ageCheck** (nur mit „activate aging“): `age := steps − birth`; `age > die at age` → `Pot 0`, `State 0`.
- **Feld**: 101 × 101 Zellen (ZeichenPanel 404 px, `cellScal 4`), Torus.
- **Parameter und Voreinstellungen** aus `CellForm.dfm` (Eingabefelder; Regler hier mit Bereichen): undercooling threshold U 0,09 (0–0,3) · interface size θ 0,02 (0–0,1) · noise amplitude δ 0,4 (0–1) · iteration steps T 5 (2–20) · diffusion const. ξ 1,0 (0–1,5) · interface const. ς 1,5 (0–3) · pot. multi. 2 (0–20) · die at age 500 · activate aging, random seed, just the field aus.
- **Wann Parameter wirken**: U, θ, δ, pot. multi., aging, die at age, just the field in jedem Schritt; T, ξ und ς liest das Original nur beim Start und bei „new Setup“ – hier setzen sie zurück (↺).
- **Grauwerte** aus `paint_Field`: Kristall `255 − 0,5 · age` (weiß), Feld `255 · pot. multi. · Pot`. Werte über 255 laufen über, weil Delphis `RGB` Bytes erwartet (ohne Bereichsprüfung, also mod 256) – so markiert „pot. multi.“ das Feld mit Höhenlinien, wie die Seite sagt („Markierung der Potentialwerte“). „just the field“ zeigt auch die Kristallzellen nach ihrem Potential.
- **Diagramm**: Zahl der entwickelten Zellen (RChart1, grüne Linie in Layer 3, y bis 3000, x bis 999); die rote Linie „entire potential“ war im Original auskommentiert – hier steht der Wert als Kennzahl.

## Eigenheiten, die bleiben

- **Formel und Programm**: Die Formel auf der alten Seite teilt `Σ D_k` durch ς, das Programm multipliziert `nrD · interEff`. Nur das Programm passt zum Satz „bei ς = 1,5 wird ein Mittelwert aus den Nachbarschaftsgewichten gebildet“ (Mittel aus 2 und 1); übernommen ist das Programm. Ebenso teilt es durch `T − 1` und rechnet `T − 1` Durchgänge, nicht `T`.
- **Erhaltung**: Die Gewichte summieren sich zu 1, die Diffusion erhält das Gesamtpotential; jede Kristallisation gibt `+1` ab. Ohne Altern ist „entire potential“ gleich der Zahl der Kristallzellen. Ist das mittlere Potential über U gestiegen, wächst nichts mehr – mit den Voreinstellungen nach gut 100 Schritten.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. Nach dem Halt bei 999 setzt Start den Lauf fort (wie Start/Stop im Original).
- **Altern nur für entwickelte Zellen**: `ageCheck` lief im Original über alle Zellen; weil unentwickelte Zellen `birth = 0` haben, hätte es ab Schritt 500 das ganze Feld in jedem Schritt auf `Pot 0` gesetzt – ein Programmfehler.
- **iteration steps mindestens 2**: Bei T = 1 rechnet das Original keinen Ausgleich mehr (und würde durch 0 teilen, wenn doch).
- **Zählen nach der Entwicklung**: Das Original zeichnete und zählte vor `dev_Cell`; hier zeigen Bild, Kennzahlen und Diagramm den Stand nach dem Schritt.
- **Helle Darstellung**: dunkler Kristall auf hellem Grund; dunkel wie im Original.
- **Kennzahlen**: „entire potential“ und neu „mittleres Potential“ (Gesamtpotential / Zellenzahl) – es erklärt, wann das Wachstum endet (vergleiche U).
