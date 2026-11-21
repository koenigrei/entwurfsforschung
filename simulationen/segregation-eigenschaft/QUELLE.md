# Quelle · Segregation durch Eigenschaftsanpassung

| | |
|---|---|
| Originalprogramm | `522_SegregationEigenschaft` „Segregation Model“, Version 1.0 vom 18.12.2005 (Projekt `segregation01.dpr`, Units `CellForm.pas`/`.dfm`, `cell_P.pas`; `agenten.pas` ungenutzt); gleicher Quellcode wie `24_Segregation_01` im Laboratorium für räumliche Prozesse |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (Programmsammlung zur Dissertation 2008); Entstehungsdatum 18.12.2005 (neueste Quelldatei, Kopf „Last Update: Dec-18, 2005“, alte Seite „051218“) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 5.2.2 „Segregation durch Eigenschaftsanpassung“; Beschreibung „Segregation durch Eigenschaftsanpassung“ (#Segregation01) auf https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm; Liste der Programme auf https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm. Vorbild: M. Batty (2005): *Cities and Complexity*, Kapitel 1 |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 5.2.2](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/522_SegregationEigenschaft.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Feld**: 101 × 101 Zellen (`ZeichenPanel` 404 × 404 px, `cellScal = 4`), Rand als Torus (`checkNei`).
- **Setup** (`setupCells`): jede Zelle zufällig `random(2)` – 0 schwarz (Weintrinker), 1 weiß (Biertrinker); „mit leeren Zellen“ `random(3)`, der Wert 2 ist leer (grau 125) und bleibt es.
- **Regel ohne leere Zellen** (`checkNei`, `Timer1Timer`): `neighSum` = Zahl der weißen Zellen unter den acht Nachbarn; `neighSum > Schwellenwert` → weiß, `neighSum < Schwellenwert` → schwarz, gleich → unverändert. Schwellenwert `Edit_thresh` = 4, wirkt ohne Neustart (wird in jedem Schritt gelesen).
- **Regel mit leeren Zellen**: Zahl weißer und schwarzer Zellen im 3 × 3-Block – die Zelle selbst zählt mit, weil `checkNei` den eigenen Wert nur von `neighSum` abzieht; die größere Zahl setzt sich durch, Gleichstand → unverändert. Diese Eigenheit bleibt.
- **Synchrone Aktualisierung**: `Timer1Timer` zählt erst alle Nachbarschaften, dann ändert er alle Zellen.
- **Störung** (`B_disturbClick`): jede nicht leere Zelle wird mit Wahrscheinlichkeit `Störwert` (`Edit_disturb` = 0,45) neu gewürfelt, `random(2)`.
- **Darstellung**: Zellen schwarz/weiß/grau wie `cell_P.Paint` (`RGB(colr)`, `colr = 255 · State`); Diagramm wie `RChart1` mit Durchschnittswert (rot, Anteil weiß) und Änderungsrate (grün), x-Achse bis 30 Schritte. Die Farben bleiben in heller und dunkler Darstellung gleich; das Feld ist vollständig belegt.
- Der Lauf beginnt erst mit Start (im Original lief der Timer sofort).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ entspricht „new Setup“.
- **Ende**: Der Lauf hält an, sobald in einem Schritt keine Zelle mehr wechselt (Kennzahl „Ruhe nach Schritt“); das Original lief weiter, ohne dass sich etwas änderte. Nach einer Störung, einem neuen Schwellenwert oder Malen mit der Maus läuft er mit Start weiter.
- **Störung** setzt den Schrittzähler nicht auf 0 und löscht das Diagramm nicht (wie im Original), sondern markiert den Zeitpunkt als senkrechte Linie – so bleibt der Vorher-nachher-Vergleich sichtbar.
- **Änderungsrate** im Diagramm: Anteil der Zellen, die im Schritt gewechselt haben. Das Original zeichnete `|Durchschnitt − Vorwert| · 100`, die Änderung des Mittelwerts, die bei gleich vielen Wechseln in beide Richtungen 0 bleibt. Zusätzlich gestrichelt der mittlere Anteil gleicher Nachbarn (0–100 %) als Maß der Segregation; nach 30 Schritten wächst die x-Achse mit, statt das Zeichnen zu beenden. Die Beschriftung „rot: Durchschnittswert || grün: Änderungsrate“ steht in der Legende.
- **Malen mit der Maus** (neu): Klick oder Ziehen setzt einen kleinen Kreis weißer Zellen, Rechtsklick schwarzer – eine örtliche Störung von Hand.
- **Kennzahlen** neu: Zellen ohne leere, Anteil weiß, gleiche Nachbarn, gewechselte Zellen, Schritt der Ruhe.
- Der Schwellenwert ist ein Regler 0–8 (im Original ein Textfeld); „mit leeren Zellen“ setzt das Feld neu auf (im Original wirkte der Schalter erst beim nächsten Setup, die Regel aber sofort, auch auf ein Feld ohne leere Zellen).
