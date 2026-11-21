# Quelle · Erreichbarkeit und Gravitationsmodell

| | |
|---|---|
| Originalprogramm | `310_Gravitation` „Erreichbarkeitsanalyse“ Version 1.1 vom 23.11.2005 („gravitation function was added“; Projekt `Gravitation.dpr`, Units `GravForm.pas`/`.dfm`, `Node.pas`, `Cell.pas`) – gleicher Quellcode wie `18_Gravitation` im Laboratorium. Als Fassung enthalten: `17_Erreichbarkeit` Version 1.0 vom 17.11.2005 (`Erreichbarkeit.pas`), dieselbe Analyse ohne Ströme |
| Sprache | Delphi 2005 (Object Pascal), Windows |
| Autor | Reinhard König |
| Jahr | 2005 (23.11.2005 laut Programmkopf, alter Seite „Source - 051123“ und Dateizeiten im ZIP; 17_Erreichbarkeit: „Source - 051117“) |
| Veröffentlichung | R. König (2008): *Dynamische Simulation und Visualisierung räumlicher Prozesse*, Kapitel 3.1 „Gravitationsmodell“ (Programmliste https://www.entwurfsforschung.de/alt/RaumProzesse/DSVPro.htm); Beschreibungen „Gravitationsmodell (social physics paradigm)“ (#Gravitation) und „Erreichbarkeitsanalyse“ (#Erreichbarkeit) auf https://www.entwurfsforschung.de/alt/Strukturfor/delphi/delphi.htm; Blogbeitrag „Gravitationsmodell“ (9.4.2012) |
| Archivseite | [Räumliche Prozesse › Simulationsprogramme (Dissertation 2008) 3.1](../../../archiv/raumprozesse/simulationsprogramme/), außerdem [Strukturexperimente › Delphi](../../../archiv/strukturexperimente/delphi/) und [Gravitationsmodell](../../../archiv/gravitationsmodell/) |
| Quelle im Repo | `archiv_medien/raumprozesse/310_Gravitation.zip`, `archiv_medien/strukturexperimente/18_Gravitation.zip` (identisch), `archiv_medien/strukturexperimente/17_Erreichbarkeit.zip` (nur gelesen; keine .exe ausgeführt); Bilder `17_Erreichbarkeit.gif`, `310_Gravitationsmodell.gif`, `gravitationsmodell/Gravitationsmodell.jpg` |

## Übernommen

- **Zeichenfläche** `ZeichenPanel` 500 × 400 px mit Zellenraster `cellScal = 20` (cremefarbene Zellen, weiße Ränder) als Hintergrund.
- **Graph zeichnen**: Klick ins Leere erzeugt einen Knoten (`NodeCreate`, `Popul = 20`, Durchmesser = Popul), Ziehen verschiebt ihn, Verbinden zweier Knoten legt den jeweils anderen als Nachbarn mit Entfernung ab (`Node_MouseUp` mit ALT), Größe ändern (Strg + Ziehen: Maus unterhalb der Knotenmitte `Popul + 1`, oberhalb `− 1`, Grenzen 15 und 200). Knoten rot mit schwarzem Rand und weißer Nummer, Verbindungen clMaroon, Stärke 2.
- **Erreichbarkeit** (`TB_findPathClick`, Knopf „fP“): für jedes geordnete Paar `I ≠ J` A* (`findPath`), Entfernung = `pfadList.Count` (Knoten im Pfad ohne Start = Zahl der Kanten), ohne Weg 0. Je Zeile: Zeilensumme, Zahl der positiven Werte (`counter`), `dLänge = Summe / counter` (gerundet auf zwei Stellen, `RoundTo(…, −2)`); Gesamtsumme (Streuwert) und `Gesamtsumme / alle positiven Werte`. Die Zeilensumme steht oben links neben jedem Knoten (`konLabel`).
- **A*** (`checkNeighbour`, `calcF`, `compareByF`): `G = G(Vorgänger) + gerundete Strecke`, `H = gerundete Luftlinie zum Ziel`, offene Liste absteigend nach F sortiert, der letzte Eintrag wird expandiert, das Ziel gilt beim Aufnehmen in die offene Liste als gefunden; bei schon offenen Knoten wird der Vorgänger getauscht, wenn das neue G nicht größer ist.
- **Gravitationsmodell** (`verbindeNodes` bei gedrücktem Schalter `TB_Stoeme`): für jede gezeichnete Verbindung `Usage = Popul_i · Popul_j / dist` mit der gerundeten Strecke, Linienstärke `1 + round(Usage)`; nur entlang der Verbindungen (die Rechnung für alle Paare ist im Original auskommentiert).
- **Knopf „Graph löschen“** (`ToolButton1Click`).

## Bewusst geändert

- **Fassungen zusammengelegt**: `17_Erreichbarkeit` (1.0) und `18_Gravitation`/`310_Gravitation` (1.1) sind ein Programm in zwei Ständen; 1.1 ergänzt nur die Ströme und die Größe der Knoten. Hier eine App: „Ströme zeigen“ aus entspricht der Fassung 1.0 (dort Knoten stets 20 px).
- **Distanzexponent wählbar**: Die Formel auf der alten Seite und im Blog lautet `F_ij = P_i · P_j / d²`, das Programm teilt durch `d`. Voreinstellung ist das Programm; „d² (Formel)“ setzt zugleich den neuen „Linienfaktor“ auf × 100, damit die Linien sichtbar bleiben (Linienstärke `1 + round(Faktor · F)`; × 1 wie im Original).
- **Startgraph** (neu): Das Original begann mit leerer Fläche. Hier entstehen „Knoten zu Beginn“ (Voreinstellung 9, Mindestabstand 70 px) mit zufälliger Größe P 15 … 40, je mit den zwei nächsten Nachbarn verbunden und zu einem zusammenhängenden Graphen ergänzt. 0 Knoten = leere Fläche wie im Original.
- **Maus**: Statt Tasten (ALT, Strg) Werkzeuge „Knoten“ (rechts: Knoten löschen – neu), „Verbinden“ (zwei Knoten nacheinander anklicken; ist die Verbindung schon da, wird sie getrennt – neu) und „Größe P“. Doppelte Verbindungen zwischen denselben Knoten legt die App nicht an (das Original zählte sie doppelt in der Nachbarliste).
- **Analyse schrittweise**: Ein Schritt rechnet ein Knotenpaar; der gefundene Pfad wird gelb gezeigt (wie in der auskommentierten Pfadanzeige des Originals), Zeilensummen erscheinen, sobald ihre Zeile fertig ist. „fP“ rechnet alles auf einmal; „Analyse nach Änderung sofort“ (Voreinstellung an) rechnet nach jeder Änderung neu, das Original erst auf Knopfdruck. Die Tabelle `DataView` ist durch Kennzahlen ersetzt (Zeilensumme und dLänge je Knoten, bis Knoten 15).
- **Nicht übernommen**: Einfärben der Hintergrundzellen mit Umschalt und ihre Abfrage per Rechtsklick (`sb_Zellen`, `showListView`) – ohne Einfluss auf Analyse und Ströme.
- **Sortierung** stabil statt Quicksort (bei gleichem F kann ein anderer, gleich langer Weg herauskommen); Zeilensummen werden direkt summiert (im Original über ein Hilfsfeld, mit demselben Ergebnis).
- **Darstellung**: dunkel mit schwarzem Grund und hellerem Maroon; Kennzahl „Ströme Σ F · max F“ neu.
