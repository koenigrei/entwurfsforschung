# Quelle · Skalenerträge

| | |
|---|---|
| Originalprogramm | `415_Skalenertraege` (Projekt `skalenertraege.dpr`, Units `facsSteer.pas`, `cell.pas`, `agenten.pas`, `calcer.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (Kopf: „Version 1.0, July 2005, Last Update: July-09, 2005“; neueste Quelltextdatei `facsSteer.dfm` vom 17.11.2005); Programmsammlung zur Dissertation 2008. Gleicher Quellcode: `12_skalenertraege` im „Laboratorium für räumliche Prozesse“ („Source - 050709“); als `01_Skalenertraege.exe` auch in der „Stadt der Agenten“ |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 4.1.5 „Skalenerträge“, Gleichungen 36–39, Abb. 31 |
| Seite der alten Website | https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm (Beschreibung: https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm#Skalenertr) |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008)](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/415_Skalenertraege.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Regeln** aus `calcLocalPreis` (facsSteer.pas) und `TBaseShape.SetAngebPreis` (agenten.pas): Kunden je Markt auf 1 zurücksetzen; jede Zelle wählt den Markt mit dem kleinsten `Angebotspreis + Entfernung · Fahrtkosten` (bei Gleichstand den ersten), zählt dort als Kunde; danach neuer Preis `Kunden / Kunden^S · Produktionskosten`. Die Zuordnung eines Schritts benutzt also die Preise des vorigen Schritts.
- **Entfernung**: gerundete euklidische Entfernung der Zellmitte zum Markt in Bildpunkten (`CalcDistance`).
- **Feld**: 96 × 56 Zellen zu 8 Bildpunkten (`ImagePaint` 770 × 450, `cellScal = 8`); zehn Märkte (`NUM_BALLS = 10`) an zufälligen Bildpunkten, Startpreis = Produktionskosten.
- **Parameter und Voreinstellungen** aus `facsSteer.dfm`: Produktionskosten 100 (1–1000), Fahrtkosten `0,001 · Position` = 0,010 (0,001–0,1), Skalenertrag `0,996 + 0,0002 · Position` = 1,0002 (0,996–1,026); „Märkte bewegen“ aus. Parameter wirken ohne Neustart.
- **Farben** der Einzugsgebiete wie in `TAgent.Paint` (clSkyBlue, clBlue, clYellow, clGreen, clTeal, clNavy, clLime, clFuchsia, clAqua, clPurple), Märkte als Punkt mit rotem Ring, schwarze Zellränder.
- **Märkte bewegen**: `SetRndDir(1.0001)`, Rand als Torus.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: Das Original rechnet im Leerlauf mit `Randomize`. Hier ist jeder Lauf mit derselben Saat wiederholbar; ein Schritt = eine Zuordnung aller Kunden mit anschließender Preisbildung.
- **Ende im Gleichgewicht**: Wechselt kein Kunde mehr den Markt (und stehen die Märkte), bleiben auch die Preise gleich; der Lauf hält dann an. Eine Parameteränderung hebt das auf, Start rechnet weiter.
- **Märkte per Klick setzen und entfernen** sowie **„Anzahl Märkte“** (2–20) sind neu; im Original stehen immer zehn Märkte. Weitere Märkte bekommen Farben aus einem Farbkreis.
- **Anzeige „relativer Preis“** neu: billigster erreichbarer Preis je Zelle als Graustufe.
- **Bild nach dem Schritt und Anfangsbild**: Das Original zeichnet die Zellen vor der Neuzuordnung (Farben hinken einen Durchlauf nach) und beginnt mit leerem Feld. Hier zeigt schon Schritt 0 die Gebiete nach Entfernung (gleiche Preise, noch ohne Preisbildung), danach jeweils den Stand nach dem Schritt.
- **Höchstgeschwindigkeit der Märkte** 4 px je Schritt (im Original unbegrenzt); Abstoßen/Anziehen mit dem Mauszeiger entfällt (Touch-Geräte).
- **Kennzahlen** neu: Märkte mit Kunden, größtes Einzugsgebiet, Anteil der drei größten, Preisspanne, Wechsel je Schritt.
