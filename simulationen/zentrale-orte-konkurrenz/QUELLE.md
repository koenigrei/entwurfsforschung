# Quelle · Konkurrenz um zentrale Orte

| | |
|---|---|
| Originalprogramm | `560_KonkurrenzZentrOrte` „Segregation by Move“ mit Zentren (Projekt `segregation03_center.dpr`, Units `CellForm.pas`/`.dfm`, `agenten.pas`, `cell_P.pas`; Kopf der Unit noch „Version 1.0, Dec-19, 2005“ vom Grundmodell); gleicher Quellcode wie `34_Segregation_03_center` im Laboratorium für räumliche Prozesse |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2006; Entstehungsdatum 25.03.2006 (neueste Quelldateien im ZIP; alte Seite „060321“) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 5.6 „Konkurrenz um zentrale Orte“; Beschreibung „Segregation und Zentrale Orte“ (#Segregation03) auf https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm; Liste der Programme auf https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 5.6](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/560_KonkurrenzZentrOrte.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Feld**: 40 × 40 Zellen (`ZeichenPanel` 404 × 404 px, `cellScal = 10`), Rand als Torus für Umzug und Nachbarschaft (`TForm1.torus`).
- **Zentren** (`setupCells`, Schalter `CB_mCent` „setup with ten spred centers“, angehakt): zehn zufällige Zentren, Abstand jeder Zelle in Zellen zum nächsten (`CalcDistance`, gerundet); ohne Haken ein Zentrum in der Zelle `(round(spalt/2), round(reih/2))`, Abstand der Zellmitten in Bildpunkten (also zehnfach feiner). Abstände ohne Torus.
- **Setup** (`setupAgents`): 800 Agenten (`Edit_anzAg`) auf zufälligen Zellen, Typ `random(2)`, zu Beginn suchen alle.
- **Bewertung** (`calcCells`, `checkNei`): Anteil gleicher unter den besetzten Nachbarzellen der Moore-Nachbarschaft, ohne Nachbarn 0; angehalten wird bei `similar > Schwellenwert`. Schwellenwert als Schieber in Achteln (`TrB_thresh`, 0–8, Position 3), in Prozent `Position · 12,5` (`Lbl_P`), wirkt ohne Neustart.
- **Umzug** (`calcAgents`, `ChangeHeading(180, 10)`): Sprung um `rndN(−10, 10)` Zellen je Achse (−10 … +11), wiederholt bis zu einer freien Zelle, höchstens 100 Versuche (`resc > 100`).
- **Näherrücken** (`compareLoc`): jeder angehaltene Agent prüft bis zu zehn Orte (`nTest = 9`) mit demselben Sprung und zieht auf den ersten freien, dessen Abstand zum Zentrum kleiner ist.
- **Ablauf** (`Timer1Timer`): `calcAgents`, `calcCells`, `compareLoc`; der Lauf hält an, wenn niemand mehr sucht.
- **Darstellung**: Zellen grau 180 mit grauem Rand, Zentren rot (`cell_P.Paint`), Agenten als Kreise mit Radius 3 bei 10 px, Farbe `255 · State`; Diagramm mit angelagerten (rot) und suchenden Agenten (grün).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`. „Zurück“ entspricht „new Setup“.
- **Höchstens ein Agent je Zelle**: Das Original setzt beim Setup Agenten auch doppelt auf eine Zelle und lässt einen Agenten nach 100 vergeblichen Versuchen auf die zuletzt gewürfelte – besetzte – Zelle springen. Hier werden nur freie Zellen belegt; wer keine findet, bleibt stehen. Deshalb höchstens 1500 Agenten (Regler 100–1500).
- **Ende**: Das Original merkt erst im folgenden Schritt, dass niemand mehr sucht; hier hält der Lauf im Schritt an, in dem der letzte Agent angelagert ist.
- **Schwellenwert** wirkt sofort auf Suchen/Anhalten (im Original erst im nächsten Schritt).
- **Zentren** als Auswahl „zehn verteilte Zentren“ / „ein Zentrum in der Mitte“ statt Schalter; ein Wechsel setzt neu auf (im Original erst mit „new Setup“).
- **Diagramm**: x-Achse bis 100 Schritte, dann mitwachsend (im Original fest bis 500); zusätzlich gestrichelt der mittlere Anteil gleicher Nachbarn (0–100 %) und punktiert der mittlere Abstand zum Zentrum (bezogen auf den Anfang). Auf breiten Bildschirmen rechts neben dem Feld, sonst darunter; abschaltbar. Die Beschriftung „rot: Durchschnittswert || grün: Änderungsrate“ passte nicht zu den Kurven und entfällt.
- **Kennzahlen** neu: angelagert, suchend, Zahl der Umzüge näher ans Zentrum, gleiche Nachbarn, mittlerer Abstand zum Zentrum (in Zellen), „Sorte je Zentrum“ (Anteil der häufigeren Sorte unter den Agenten im Umkreis von 5 Zellen um jedes Zentrum, gewichtet gemittelt; 50 % gemischt, 100 % nur eine Sorte) als Maß der Segregation nach Zentren, Schritt der Ruhe.
