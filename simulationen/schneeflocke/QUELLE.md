# Quelle · Schneeflocken-Wachstum

| | |
|---|---|
| Originalprogramm | `32_snowFlake` („Snow Flake Growth“, Projekt `ZA_snowFlakeGrowth.dpr`, Units `CellForm.pas`, `cell_P.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2006 – neueste Quelltextdatei im ZIP `CellForm.pas`/`.dfm` vom 07.03.2006; Download auf der alten Seite „Source - 060310“ |
| Vorbild | Clifford A. Reiter: *A local cellular model for snow crystal growth*, Chaos, Solitons & Fractals 23 (2005); Begleitmaterial unter ww2.lafayette.edu/~reiterc/mvp/sfn/ |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi) – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm#snowFlake |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/32_snowFlake.zip` (nur gelesen; die .exe wurde nicht ausgeführt) |

## Übernommen

- **setupCells**: alle Zellen `Pot := beta`, `State 0`; Saat in Zelle (50, 50) mit `State 1`, `Pot 1`.
- **equiPot** (`ausgleich`):
  1. `rezeptiv`: `checkNei` zählt die entwickelten Zellen der Moore-Nachbarschaft; `sumState > 0` oder selbst entwickelt → `recept := Pot`, `nonrecept := 0`, sonst umgekehrt.
  2. `checkPot` für **alle** Zellen: `limboPot := Σ w · (nonrecept_k − nonrecept_i)` über die vier orthogonalen (Gewicht 1/12) und vier diagonalen Nachbarn (Gewicht 1/6), Torus; danach `nonrecept += limboPot` – gleichzeitig für alle. Rezeptive Zellen (nonrecept 0) erhalten so das gewichtete Mittel ihrer nichtrezeptiven Nachbarn als Zufluss, wie bei Reiter.
  3. `if recept > 0 then recept := recept + gamma`.
- **dev_Cell** (`entwickle`): `Pot := nonrecept + recept`; `Pot ≥ 1` → `State 1`.
- **Halt** bei Schritt 500 (`If steps = 500`).
- **Feld**: 101 × 101 Zellen (ZeichenPanel 404 px, `cellScal 4`), Torus.
- **Parameter und Voreinstellungen** aus `CellForm.dfm`: `beta` 0,3, `gamma` 0,002 (Eingabefelder; Regler hier β 0–1, γ 0–0,02).
- **Grauwerte** aus `paint_Field`: entwickelt `255 − 25 · Pot` (weiß), sonst `125 · Pot`.
- **Diagramm** „number of developed cells“ (RChart1, rote Linie) als „Verlauf zeigen“, voreingestellt an.

## Eigenheiten, die bleiben

- **Gewichte**: Der Quelltext gibt den orthogonalen Nachbarn 1/12 und den diagonalen 1/6; die Beschreibung auf der alten Seite (Formelbild `32_snowFlake_f6`) nennt es umgekehrt. Voreingestellt ist das Programm – es erzeugt die X-förmigen Kristalle der Bilder auf der alten Seite. Die Fassung der Beschreibung ist unter „Gewichte“ wählbar (sie wächst ebenfalls diagonal, mit breiteren Armen und Seitenästen).
- **Ein wirksamer Durchgang je Schritt**: `Timer1Timer` ruft `equiPot` fünfmal auf, aber jeder Aufruf setzt `recept`/`nonrecept` neu aus dem unveränderten `Pot` – die Durchgänge sind gleich. Die App rechnet einen.
- **γ nur bei `recept > 0`**: Bei β = 0 wachsen rezeptive Randzellen ohne Zufluss nicht.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen**: Das Modell hat keinen Zufall; die Saat im Bedienfeld ändert nichts. Nach dem Halt bei 500 setzt Start den Lauf fort (wie Start/Stop im Original).
- **Helle Darstellung**: dunkler Kristall auf hellem Grund; dunkel wie im Original (weißer Kristall auf schwarzem Grund).
- **Diagramm**: die y-Achse wächst über 600 hinaus mit (mit den Voreinstellungen sind es nach 500 Schritten 1781 Zellen).
- **Kennzahlen neu**: Länge der Arme diagonal und längs der Achsen (entwickelte Zellen in Folge ab der Mitte) und Symmetrie (Anteil der Zellen, die beim Drehen um 90° und Spiegeln gleich bleiben – immer 100 %).
- Nicht übernommen: „activate aging“ und „Die with age“ stehen im Formular, sind im Programm aber abgeschaltet (`ageCheck` und `infl_Field` auskommentiert); ebenso die auskommentierten „aggregating tests“, die zu `33_crystalGrowth` führen.
