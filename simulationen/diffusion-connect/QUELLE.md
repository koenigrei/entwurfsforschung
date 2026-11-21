# Quelle · Diffusion Connect Model

| | |
|---|---|
| Originalprogramm | `23_diffusion-contract` – im Quelltext „Diffusion-Contact Model“ Version 1.0, „Last Update: Dec-17, 2005“, auf der alten Seite „23_Diffusion-Connect“ (Projekt `diffAgg01.dpr`, Units `CellForm.pas`/`.dfm`, `agenten.pas`, `cell_P.pas`; `Cell.pas` und `Node.pas` sind eingebunden, aber ungenutzt; Fenstertitel noch „Vicsek-Szalay Model“) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (17.12.2005) |
| Seite der alten Website | Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi), Anker #Diffusion-Connect – https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/23_diffusion-contract.zip` (nur gelesen; keine .exe ausgeführt), Bild `23_diffusionContract.gif` |
| Bezug | M. Batty (2005): *Cities and Complexity*, MIT Press, Kapitel 1 |

## Übernommen

- **Feld**: 135 × 135 Zellen (`ZeichenPanel` 404 px, `cellScal = 3`), Rand als Torus (in `checkNei` und beim Gehen; die Pixelversätze des Originals am Rand ändern die Zelle nicht).
- **Setup** (`setupAgents`, `B_setupClick` „new Setup“): `Edit_anzAg` Agenten (Voreinstellung 2000) auf zufälligen Zellen (`random(spalt)`, `random(reih)`, auch mehrere je Zelle), Ausrichtung `random(8) · 45`, alle frei; alle Zellen unentwickelt.
- **Gehen** (`Timer1Timer`, `TAgent.ChangeHeading(2)`): jeder freie Agent `Heading + rndN(−2, 2) · 45` mit `rndN(l, u) = round((u − l + 1) · Random + l)` – also −2 … 3, die Ränder halb so oft –, dann `StepX = round(sin(Heading))`, `StepY = round(cos(Heading))`, eine Zelle weit. **Heading in Grad wird als Bogenmaß an sin/cos gegeben**; dadurch ist die neue Richtung praktisch zufällig (ungerichtete Irrfahrt über acht Nachbarn statt einer gerichteten mit Winkeländerung). Das bleibt die Voreinstellung, weil es die Bilder des Originals erzeugt.
- **Zellen** (`TCell.State`, `AgNr`): Zu Beginn jedes Schritts beginnen unentwickelte Zellen bei 0; jeder Agent – frei oder angelagert – erhöht den State seiner Zelle um 1. Entwickelte Zellen werden **nicht** zurückgesetzt und zählen weiter. Diese Eigenheit macht das Modell aus: Neben einem Cluster ist die Moore-Summe nach wenigen Schritten groß, freie Agenten lagern sich dort sofort an.
- **Anlagerung** (`checkNei`, Timer1Timer): für jede Zelle `neighSum` = Summe der States der 3 × 3-Moore-Nachbarschaft **mit** der Zelle selbst; `neighSum > Schwellenwert` und Zelle unentwickelt und mindestens ein Agent auf der Zelle → Zelle entwickelt (`colr = 255`), alle Agenten darauf angelagert (`State 0`).
- **Schwellenwert** (`Edit_thresh`, Voreinstellung 7): wird wie im Original in jedem Schritt gelesen (wirkt ohne Neustart).
- **Ende**: `Timer1.enabled := false`, wenn kein Agent mehr frei ist.
- **Diagramm** `RChart1` „freie Agenten“: Zahl der in diesem Schritt bewegten (freien) Agenten, rot, x bis 1000 Schritte, y bis Anzahl + 50.
- **Darstellung** (`cell_P.Paint`, `TAgent.Paint`): Zellen `RGB(0, colr, 0)` – schwarz, entwickelt hellgrün –, alle Agenten (auch angelagerte) als rote Punkte (`AgSize 1`, 2 px in der 3-px-Zelle).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ = „new Setup“.
- **Schalter „Richtung in Grad (korrigiert)“** (neu, aus): rechnet Heading vor sin/cos ins Bogenmaß um; die Agenten gehen dann gerichtet mit Winkeländerungen von −90° bis +135° (wegen `rndN` im Mittel leicht nach rechts drehend), wie es die Beschreibung „θ ist die Winkel-Variation der Ausrichtung“ meint.
- **Ende im selben Schritt**: Das Original merkt erst im folgenden Schritt, dass niemand mehr frei ist; hier hält der Lauf in dem Schritt an, in dem der letzte Agent angelagert ist.
- **Diagramm**: nach 1000 Schritten wächst die x-Achse mit (das Original hörte wegen der Testversion von RChart auf zu zeichnen); auf breiten Bildschirmen rechts neben dem Feld, sonst darunter; abschaltbar. Regler „Anzahl Agenten“ 100–6000, „Schwellenwert“ 0–20 (im Original Eingabefelder ohne Grenzen).
- **Agenten zeigen** (neu): Punkte ausblendbar, damit die Cluster frei stehen.
- **Helle Darstellung**: Feld in `--surface`, entwickelte Zellen dunkleres Grün; dunkel wie im Original.
- **Kennzahlen neu**: freie und angelagerte Agenten, entwickelte Zellen, Zahl der Cluster (zusammenhängend in der Moore-Nachbarschaft, über den Rand) und größter Cluster, Schritt der Ruhe – damit lassen sich die Aussagen der Beschreibung („Wenn der Schwellenwert erhöht wird, reduziert sich die Anzahl der entstehenden Cluster. Wird die Anzahl der Agenten erhöht, nimmt die Anzahl bzw. Größe der Cluster zu.“) nachprüfen.
