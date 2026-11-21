# Quelle · Verhandlungsmodell für die Landnutzung nach v. Thünen

| | |
|---|---|
| Originalprogramm | `413_ThuenenVerhandel` (Projekt `thuenen3verh.dpr`, Units `facsSteer.pas`, `cell.pas`, `agenten.pas`, `calcer.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (Kopf: „Version 1.0, July 2005, Last Update: July-06, 2005“; neueste Quelltextdatei `facsSteer.dfm` vom 17.11.2005); Programmsammlung zur Dissertation 2008. Gleicher Quellcode: `11_verh_thuenen` im „Laboratorium für räumliche Prozesse“ („Source - 050706“) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 4.1.3 „Verhandlungsmodell für die Landnutzung nach v. Thünen“, Abb. 28 und 29 |
| Seite der alten Website | https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm (Beschreibung: https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm#Thuenen) |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008)](../../../archiv/raumprozesse/simulationsprogramme/) |
| Quelle im Repo | `archiv_medien/raumprozesse/413_ThuenenVerhandel.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Lagerente** aus `TBaseCell.RechneLagerR`: `Ertrag · (Marktpreis − Erzeugungskosten) − Ertrag · Distanz · Transportkosten`, Distanz = gerundete euklidische Entfernung der Zellmitte zum nächsten Markt in Bildpunkten (`NextMarkt`, `CalcDistance`).
- **Startverteilung** aus `RectanglCreate`: je Zelle `random(100)`, kumulativ gegen die Anteile Gelb, Grün, Weiß; der Rest bleibt leer (`State = 99`).
- **Verhandlung** in der Reihenfolge der Idle-Prozedur: `CalcLagerR` (Rente jeder Zelle für ihr eigenes Produkt) → `makeOffer` (acht Vergleichszellen aus `setNachbKoordi`: je Richtung Versatz `random(Tauschradius)`, am Rand begrenzt; Bewerbung, wenn die Rente dort größer ist als zu Hause **und** größer als die des Besitzers) → `acceptOffer` (alle Bewerber mit dem höchsten Gebot werden angenommen) → `ChooseChange` (jeder Angenommene tauscht mit seinem besten Ziel, bei Gleichstand mit dem in Zeilenfolge ersten; die Tausche laufen nacheinander in Zeilenfolge mit dem jeweils aktuellen Zelleninhalt – diese Eigenheit bleibt).
- **Feld**: 77 × 45 Zellen zu 10 Bildpunkten (`ImagePaint` 769 × 450, `cellScal = 10`); erster Markt bei (400, 300) wie in `FormCreate`.
- **Parameter und Voreinstellungen** aus `facsSteer.dfm`: Anteile Gelb/Grün/Weiß je 25 % (0–100), Tauschradius 40 (1–200), je Produkt Anbauertrag (1–10000), Erzeugungskosten (1–1000), Marktpreis (1–1000), Transportkosten (1–500); A 2500/10/400/5, B 500/1/900/6, C 2000/6/400/3; „Märkte bewegen“ aus.
- **Darstellung** aus `RectanglPaint`: Helligkeit = Lagerente, begrenzt auf 110…255 (A `(h, h, 0)`, B `(10, h, 10)`, C `(h, h, h)`), daher hell nur auf Flächen mit positiver Rente; Anzeigen „pos. Lagerente“ und „Distanzen“; Märkte als rote Punkte; „Märkte löschen“; Markt per Klick.
- **Märkte bewegen** wie in `412_ThuenenRinge`: `SetRndDir(1.0001)`, Rand als Torus.

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: Das Original rechnet im Leerlauf mit `Randomize`. Hier ist jeder Lauf mit derselben Saat wiederholbar; ein Schritt = eine Verhandlungsrunde.
- **Ende bei Ruhe**: Der Lauf hält an, wenn 25 Schritte lang niemand getauscht hat und die Märkte stehen (die Dissertation spricht von „stabilen Zuständen“; das Original rechnet weiter).
- **Anzeige nach dem Tausch**: Das Original zeichnet die Zellen vor der Verhandlung eines Durchlaufs; hier zeigt das Bild den Stand nach dem Schritt.
- **Märkte zu Beginn** (0–12, weitere zufällig nach Saat) und **„Beispiel“** mit den Einstellungen der Abb. 28 (1, 5, 12 Märkte) und Abb. 29 (Tauschradius 2, 5, 10) sind neu, damit die Ergebnisse der Dissertation direkt nachvollziehbar sind. Im Original setzt man weitere Märkte nur per Klick.
- **Anteile über 100 %**: Das Original korrigiert die anderen Schieber (`checkVert`). Hier bleiben die Regler stehen; die Verteilung kürzt kumulativ (erst Gelb, dann Grün, dann Weiß) – die tatsächlichen Anteile zeigt die Kennzahl „Fläche“.
- **Keine Ganzzahl-Überläufe**: Das Original rechnet mit 32-Bit-Ganzzahlen; bei extremen Reglerwerten (oder ohne Markt, `Distance = MaxInt`) läuft die Rentenformel über. Hier wird mit Gleitkommazahlen gerechnet; ohne Markt ist keine Rente positiv.
- **Höchstgeschwindigkeit der Märkte** 4 px je Schritt (im Original wächst sie unbegrenzt); das Abstoßen/Anziehen der Märkte mit dem Mauszeiger entfällt (auf Touch-Geräten nicht bedienbar), dafür entfernt ein Rechtsklick den nächsten Markt.
- **Helle Darstellung**: Produkt C erscheint etwas abgedunkelt, leere Zellen in der Flächenfarbe (im Original schwarz); feines Zellraster statt schwarzer Zellränder.
- **Kennzahlen** neu: Tausche je Schritt, Anteil positiver Lagerenten, Summe der Lagerenten, mittlere Entfernung je Produkt.
