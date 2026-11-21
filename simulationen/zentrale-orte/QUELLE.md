# Quelle · Zentralität und zentrale Orte

| | |
|---|---|
| Originalprogramm | `09_christaller` (Projekt `christaller.dpr`, Units `facsSteer.pas`, `agenten.pas`, `cell.pas`) |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (Kopf: „Version 1.0, June 2005, Last Update: June-25, 2005“; neueste Quelltextdateien `facsSteer.pas`/`.dfm` vom 17.11.2005) |
| Veröffentlichung | Beschreibung auf der alten Seite; Theorie in R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 4.1.1 |
| Seite der alten Website | https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm#Zentral („09_christaller.exe / Source - 050625“) |
| Archivseite | [Strukturexperimente › Laboratorium für räumliche Prozesse (Delphi)](../../../archiv/strukturexperimente/delphi/) |
| Quelle im Repo | `archiv_medien/strukturexperimente/09_christaller.zip` (nur gelesen; keine .exe ausgeführt) |

## Übernommen

- **Ablauf** aus `ApplicationEvents1Idle`: erst für jeden Agenten der Reihe nach `NeigborCheck` (mit `Anlagern`), dann bewegen alle sich um ihren gerundeten Schritt, Rand als Torus; die Bindungszähler werden je Durchlauf zurückgesetzt (`CommonPaint`), sodass die ersten Bewerber in Listenfolge die Bindungen bekommen.
- **Nachbarn** (`NeigborCheck`): alle Agenten innerhalb der Anlagerungsdistanz des eigenen Rangs, der nächste Nachbar, der nächste gleichfarbige Nachbar; gerundete Entfernungen. Anlagern nur, wenn der nächste Nachbar im Radius liegt; unter dem Mindestabstand `SetRndDir(0.8)`.
- **Anlagern** (`Anlagern`, `SetAnlDir`): an einen Nachbarn des nächsthöheren Rangs mit freier Bindung (`BindungSet < BindungMax`) – der Agent übernimmt die Bewegung des ranghöchsten Nachbarn; Rot an Rot: beide `Connect = 2`, Schritt 0; sonst, solange nicht gebunden, `SetRndDir(1.1)`. Abstoßung innerhalb derselben Schleife: ist der nächste Gleichfarbige näher als `AnlDist − RepelDist`, Schritt `random(3) − 1 − Δ/20` vom Nachbarn weg.
- **Bewegung ohne Nachbarn**: Ein Agent ohne Nachbarn behält seinen Schritt (geradlinig oder still).
- **Parameter und Voreinstellungen** aus `facsSteer.dfm`: Anzahl Rot/Blau/Gelb 50/90/90, Anlagerungsdistanz Rot 75 (5–200), Blau 30 (5–120), Gelb 14 (5–120), Abstoßdistanz 10/10/6 (1–30), Bindungen je 6 (1–10), Mindestabstand 5 (1–50), Verbindungslinien an.
- **Eigenheit beim Ändern einer Anlagerungsdistanz**: Im Original steht nur die Zuweisung unter dem `If`; `Connect := 0` und ein neuer Zufallsschritt treffen alle Agenten. Das bleibt, denn erst dieser Anstoß lässt das System sich neu ordnen („Parameter verringern, bis das System zur Ruhe kommt“).
- **Erzeugung** (`Button_Create…Click`): Lage `random(760)` (Gelb `random(750)`) × `random(450)`, Schritt `random(3) − 1`; Klick ins Feld setzt einen roten Agenten (`ImagePaintClick`).
- **Darstellung**: rote, blaue, gelbe Punkte; Verbindungslinien in der Farbe des Agenten zu seinen Bindungen (`Verbinden`); gepunktete Kreise der Anlagerungs- und Abstoßdistanz (`RegionPaint`, Schalter „show“); „Zellen markieren“ (`lookCell`, `checkNeighbour`: −55 je blauem, +50 je gelbem Agenten in der Moore-Nachbarschaft, blau bzw. gelb eingefärbt).

## Bewusst geändert

- **Start/Pause/Schritt/Zurücksetzen und feste Saat**: wiederholbare Läufe statt `Randomize`.
- **Aufbau**: Im Original erzeugt man Rot, Blau und Gelb per Knopf. Hier stehen zu Beginn die roten Agenten; voreingestellt kommen Blau nach 150 und Gelb nach 300 Schritten hinzu („nacheinander“). „von Hand“ entspricht dem Original (Knöpfe „+ Rot/Blau/Gelb“), „alle gleichzeitig“ erzeugt alle sofort. „Delete 100 Pts“ entfällt.
- **Ende bei Ruhe**: Der Lauf hält an, wenn sich kein Agent mehr bewegt (bei „nacheinander“ erst, wenn alle Ränge da sind).
- **Nächster gleichfarbiger Nachbar richtig bestimmt**: Im Original wird er nur nebenbei aktualisiert, wenn ein Gleichfarbiger gerade auch der bisher nächste Nachbar ist, und sein Index und Abstand bleiben aus früheren Durchläufen stehen (zu Beginn Index 0, Abstand 0). Dadurch konnten Agenten von einem weit entfernten Agenten 0 „abgestoßen“ werden und mit Sprüngen bis zu 38 px über das Feld springen. Hier ist es in jedem Schritt der tatsächlich nächste Agent gleicher Farbe.
- **Höchstgeschwindigkeit** 5 px je Schritt: `SetRndDir(1.1)` wird im Original für jeden nicht passenden Nachbarn erneut angewandt und beschleunigt ohne Grenze.
- **Bindungen** wirken sofort auf alle Agenten (im Original nur auf neu erzeugte).
- **Verbindungslinien** verbinden die aktuellen Lagen (im Original die Lagen vor der Bewegung); Linien über den Torusrand werden nicht gezeichnet.
- **Mausinteraktion** (Abstoßen/Anziehen mit Mausradius) entfällt (Touch-Geräte).
- **Farben**: in der dunklen Darstellung aufgehellt, in der hellen abgedunkelt, damit Blau und Gelb lesbar sind. **Kennzahlen** neu.
