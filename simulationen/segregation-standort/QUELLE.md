# Quelle · Segregation durch Standortwahl

| | |
|---|---|
| Originalprogramm | `521_SegragationStandort` „Segregation by Move“, Version 1.0 vom 19.12.2005 (Projekt `segregation02.dpr`, Units `CellForm.pas`/`.dfm`, `agenten.pas`, `cell_P.pas`); gleicher Quellcode wie `25_Segregation_02` im Laboratorium für räumliche Prozesse |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (Programmsammlung zur Dissertation 2008) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 5.2.1 „Segregation durch Standortwahl“ (Grundmodell einfach); Beschreibung „Segregation durch Ortsveränderung“ (#Segregation02) auf https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm; Liste der Programme auf https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 5.2.1](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/521_SegragationStandort.zip`, zum Vergleich `521_SegragationStandort2.zip` („Grundmodell erweitert“, `segregation_tolerance.dpr`, September 2006); nur gelesen, keine .exe ausgeführt. Bild: `521_SegragationStandort.gif` |

## Übernommen

- **Feld**: 40 × 40 Zellen (`ZeichenPanel` 404 × 404 px, `cellScal = 10`), Rand als Torus (`TForm1.torus`).
- **Setup** (`setupAgents`): Agenten auf zufälligen Zellen, Typ zufällig `random(2)`; zu Beginn suchen alle (`Stopped = false`), das Diagramm beginnt bei 0 angelagert.
- **Regel Nachbarschaft** (`calcCells`, `checkNei`): 3 × 3-Moore-Nachbarschaft; gezählt werden besetzte Zellen gleichen und anderen Typs, der Agent selbst nicht; `similar = neighSimi / (neighSimi + neighDiff) · 100`, ohne Nachbarn 0.
- **Schwellenwert** (`Edit_thresh`, Voreinstellung 74 %): angehalten wird nur bei `similar > Schwellenwert`, sonst sucht der Agent weiter. Der Wert wird wie im Original in jedem Schritt gelesen (Änderung ohne Neustart).
- **Umzugsregel** (`calcAgents`, `TAgent.ChangeHeading(180, 10)`): Jeder suchende Agent springt in Listenreihenfolge um `rndN(−10, 10)` Zellen je Achse – also −10 … +11, mit der leichten Asymmetrie des Originals – und wiederholt den Sprung, bis die Zielzelle frei ist.
- **Ablauf** (`Timer1Timer`): ein Schritt = erst alle Suchenden umziehen, dann alle neu bewerten; der Lauf hält an, wenn niemand mehr sucht.
- **Anzahl Agenten für Setup** (`Edit_anzAg`, Voreinstellung 1000).
- **Darstellung**: Zellen grau 125 mit grauem Rand (`cell_P.Paint`), Agenten als Kreise mit Radius 4 bei 10 px (`AgSize`), Farbe `255 · State`: schwarz und weiß; Diagramm wie `RChart1` mit angelagerten (rot) und suchenden Agenten (grün), x-Achse bis 100 Schritte. Die Farben bleiben in heller und dunkler Darstellung gleich, weil das graue Feld beide trägt.
- **Optionen aus der erweiterten Fassung** `521_SegragationStandort2` (Grundmodell-Werte voreingestellt, damit der Start dem einfachen Grundmodell entspricht):
  - Radius Nachbarschaft (`Edit_nRad`, dort 5; hier 1–5, Voreinstellung 1),
  - Umzugsweite (`Edit_mDist`, dort 55 Zellen bei etwa 115 × 115; hier 1–20, Voreinstellung 10),
  - Anzahl Gruppen (`Edit_anzGr`, dort 6; hier 2–6, Voreinstellung 2) mit dem Farbband aus `chooseCol` ab drei Gruppen,
  - „nur in bessere Lage umziehen“ (`calcAgents`/`testLocation`: umziehen nur, wenn der Anteil gleicher Nachbarn am neuen Ort größer ist; dort immer an, hier Schalter, Voreinstellung aus).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ entspricht „new Setup“.
- **Höchstens ein Agent je Zelle**: Das Original setzt Agenten beim Setup auch doppelt auf eine Zelle und gibt beim Umzug die alte Zelle frei, selbst wenn dort noch ein zweiter Agent steht; so entstehen Doppelbelegungen, bei denen nur einer bewertet wird. Hier werden nur freie Zellen belegt (wie in der erweiterten Fassung).
- **Abbruch der Suche** nach 1000 Versuchen ohne freie Zelle (aus der erweiterten Fassung); der Agent bleibt dann stehen. Im Grundmodell konnte die Schleife bei sehr vielen Agenten hängen. Deshalb auch höchstens 1500 Agenten (Regler 100–1500).
- **Ende**: Das Original merkt erst im folgenden Schritt, dass niemand mehr sucht; hier hält der Lauf im Schritt an, in dem der letzte Agent angelagert ist (Kennzahl „Ruhe nach Schritt“).
- **Schwellenwert und Radius** wirken sofort auf Suchen/Anhalten (im Original erst nach dem nächsten Umzug).
- **Diagramm**: zusätzlich der mittlere Anteil gleicher Nachbarn (gestrichelt, 0–100 %); nach 100 Schritten wächst die x-Achse mit, statt das Zeichnen zu beenden. Auf breiten Bildschirmen steht es rechts neben dem Feld, sonst darunter; abschaltbar. Die Beschriftung „rot: Durchschnittswert || grün: Änderungsrate“ des Originals passte nicht zu den Kurven und entfällt.
- **Kennzahlen** neu: angelagert, suchend (unzufrieden), mittlerer Anteil gleicher Nachbarn (über Agenten mit mindestens einem Nachbarn), Schritt der Ruhe.
- **Nicht übernommen** aus der erweiterten Fassung: Clusteranalyse, Dissimilaritätsindex, Analyse des Parameterraums, Stopp nach Zeitschritt, Zellgröße; dort zählt `checkNei` außerdem den Agenten selbst mit – hier gilt die Zählung des Grundmodells.
