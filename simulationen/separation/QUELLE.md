# Quelle · Separation durch Standortpräferenzen

| | |
|---|---|
| Originalprogramm | `421_Separation` (Projekt `fraktErschl.dpr`, Units `facsSteer.pas`, `agenten.pas`, `cell.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (`agenten.pas` vom 10.06.2005, neueste Quelltextdatei `facsSteer.pas` vom 17.11.2005); Programmsammlung zur Dissertation 2008. Gleicher Quellcode: `08_fraktErschl` („Segregationsmodell“) im „Laboratorium für räumliche Prozesse“ („Source - 050610“) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 4.2.1 „Separation durch Standortpräferenzen“, Gleichungen 40–43, Abb. 32 |
| Seite der alten Website | https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm (Beschreibung: https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm#Segregat) |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008)](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/421_Separation.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Agenten** aus `Button_CreateClick`: 100 Punkte, Index `I < 25` rot (Anlagerungsdistanz 80), `I < 50` blau, sonst gelb (je 30); Lage `random(777)` × `random(450)`, Schritt `random(3) − 1`. „Create Blues/Yellows“ fügen je 50 hinzu; ein Klick setzt einen ruhenden roten Knoten (`ImagePaintClick`).
- **Zellmarkierung** aus `lookCell` und `checkNeighbour`: 78 × 45 Zellen zu 10 px; die Zelle unter einem Agenten trägt dessen Farbe, jede Innenzelle summiert in der Moore-Nachbarschaft −55 je blauem und +50 je gelbem Agenten (Randzellen bleiben 0). Der Zustand gilt im nächsten Durchlauf.
- **Standortregel** aus `Swarming`: Rot immer, Blau nur auf Zellen ≤ 0, Gelb nur auf Zellen ≥ 0 → Nachbarsuche; sonst `Connect := 0` und `SetRndDir(1.5)`.
- **Anlagern** aus `NeigborCheck`/`Anlagern`/`SetAnlDir`: liegt der nächste Nachbar im Anlagerungsradius, lagert ein blauer oder gelber Agent an jeden roten Nachbarn an (übernimmt die Bewegung des ranghöchsten Nachbarn), Rot an Rot hält an, sonst `SetRndDir(1.1)` solange nicht gebunden; unter dem Mindestabstand (10) `SetRndDir(0.8)`. Bindungszähler werden im Original nur heruntergezählt und nie geprüft – also unbegrenzt.
- **Ablauf**: erst alle Agenten der Reihe nach prüfen, dann alle bewegen (gerundeter Schritt, Rand als Torus), dann Zellen neu markieren.
- **Darstellung** aus `RectanglPaint`/`Verbinden`: negative Zellen blau, positive gelb (Intensität bis 255), Verbindungslinien in der Farbe des Agenten zu seinen Bindungen, Agenten rot/blau/gelb. „Zellen markieren“ voreingestellt an – ausgeschaltet bleiben alle Zellen neutral und das Meiden entfällt, wie im Original.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`; Saat und Parameter in der Adresse.
- **Startbelegung**: Im Original klickt man „Create Pts“ und danach beliebig oft „Create Blues/Yellows“. Hier stehen zu Beginn die 100 Punkte plus je 200 weitere Blaue und Gelbe (wie viermaliges Klicken; einstellbar 0–400), weil sich die Trennung erst bei dieser Dichte deutlich zeigt (Abb. 32). Die Knöpfe „+ 50 Blau/Gelb“ bleiben.
- **Anlagerungsdistanzen**: Im Original setzt der Schieber „Gelb“ die Blauen und der Schieber „Blau“ die Gelben (vertauscht), und Rot ist fest 80. Hier wirkt jeder Regler auf seine Farbe, Rot ist einstellbar (5–200).
- **Höchstgeschwindigkeit** 5 px je Schritt: `SetRndDir(1.5)` und `SetRndDir(1.1)` beschleunigen im Original ohne Grenze.
- **Verbindungslinien** zwischen den aktuellen Lagen (im Original vor der Bewegung), nicht über den Torusrand; „Delete 100 Pts“ und die Mausinteraktion (Abstoßen/Anziehen) entfallen.
- **Farben** für helle und dunkle Darstellung lesbar gemacht; **Kennzahlen** neu (Anteil gleichfarbiger Nachbarn im Umkreis von 30 px als Maß der Separation).
