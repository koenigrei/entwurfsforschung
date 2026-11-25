# KREMLAS · Dichte Packung

KREMLAS ist ein evolutionäres Verfahren, das Grundrisse aus einem Raumprogramm erzeugt: Räume fester Fläche, geforderte Nachbarschaften und ein Umriss gehen hinein, angeordnete Räume mit Wänden und Türen kommen heraus. Entstanden ist es im DFG-Projekt KREMLAS (2009–2011) an der Bauhaus-Universität Weimar, aufbauend auf einer Idee von Tomor Elezkurtaj und Georg Franck. Seit November 2026 läuft es als Web-App im KI Lab von entwurfsforschung.de und wurde dabei stark weiterentwickelt. Diese Dokumentation erzählt, woher das Verfahren kommt, was wir geändert haben, wie es die Grundrisse von Palladios Villen und von Álvaro Sizas Häusern in der Malagueira nachgeneriert und welche Verbesserungen wir getestet haben, mit allen Messwerten.

**Die Kernaussagen auf einen Blick:**

1. **Herkunft.** Ausgangspunkt der ganzen Entwicklung ist die Arbeit von Elezkurtaj und Franck (2002). Im DFG-Projekt KREMLAS entstand daraus der Layoutsolver „Dichte Packung“: eine hybride Evolutionsstrategie mit Kollisionserkennung und virtuellen Federn, beschrieben im Buch von Donath, König und Petzold (2012).
2. **Treue Neuumsetzung.** Die Web-App folgt dem C#-Programm Regel für Regel. Zwei Programmfehler aus dem Original haben wir gefunden und behoben: Die Hälfte der Federn zog in die falsche Richtung, und Räume, die sich berührten, bekamen gar keinen Zug.
3. **Grundrisse, die funktionieren.** Mindestbreiten je Raum, eine Bewertung des fertigen Plans (Türen, Breiten, Flächen) und eine Suche über viele kurze Läufe machen aus der Packung brauchbare Grundrisse. Vorher war bei unseren Prüfregeln kein einziger Lauf gültig.
4. **Vorbilder nachgenerieren.** KREMLAS bekommt von einem Vorbild nur das Raumprogramm, die Türen und den Umriss und sucht die Anordnung selbst. Gemessen wird die Überdeckung jedes Raums mit dem Vorbild, gespiegelte Pläne gelten als gleich.
5. **Palladio fast vollständig, Siza zum größten Teil.** Sieben der acht Villen werden mit 99–100 % Ähnlichkeit wiedergefunden, Pisani mit 88 %. Die Erdgeschosse der Siza-Häuser gelingen einzeln meist vollständig, die Obergeschosse mit langen, verketteten Fluren deutlich seltener. Seit 25.11.2026 entstehen Erd- und Obergeschoss zusammen, mit Treppe und Hof übereinander; solche Häuser findet die Suche bisher selten.
6. **Fehler finden lohnt mehr als Tricks.** Die größten Sprünge kamen aus behobenen Fehlern: falsche Federrichtung, eine zu strenge Türregel für Siza, ein falscher Feldrahmen in der Überlappungsbewertung. Von zwölf Vorschlägen aus der Literatur brachte keiner im Mittel über alle Vorbilder einen messbaren Gewinn.
7. **Die Startsaat entscheidet viel.** Dieselbe Villa wird mit einer Suchreihe vollständig, mit einer anderen gar nicht gefunden. Verlässliche Aussagen brauchen deshalb Messungen über mehrere Suchreihen; seit 25.11.2026 gelten Voreinstellungen nur, wenn sie an zwei getrennten Saatgruppen gewinnen.

## 1 Herkunft

### Ausgangspunkt: Elezkurtaj und Franck

Die Idee, Grundrisse durch dichtes Packen von Räumen zu erzeugen, geht auf Tomor Elezkurtaj und Georg Franck zurück: [Algorithmic Support of Creative Architectural Design](https://www.researchgate.net/publication/255606960_Algorithmic_Support_of_Creative_Architectural_Design), erschienen in *Umbau* 19 (2002), S. 129–137. Sie unterscheiden konkret definierbare, „handfeste“ Fragen eines Entwurfs, die sich einem Algorithmus übergeben lassen, von unscharfen, kontextabhängigen Fragen, die beim Menschen bleiben. Das Packen von Räumen fester Fläche unter Nachbarschaftsbedingungen ist eine solche handfeste Frage. Der Computer schlägt Anordnungen vor, die Entwerferin wählt und greift ein.

### Das DFG-Projekt KREMLAS

Im DFG-Projekt KREMLAS (2009–2011) wurden an der Bauhaus-Universität Weimar kreative evolutionäre Entwurfsmethoden für Layoutprobleme in Architektur und Städtebau untersucht. Die Ergebnisse stehen im Buch, herausgegeben von Dirk Donath, Reinhard König und Frank Petzold: *KREMLAS. Entwicklung einer kreativen evolutionären Entwurfsmethode für Layoutprobleme in Architektur und Städtebau* (Verlag der Bauhaus-Universität Weimar 2012). Kapitel 5 beschreibt die dichte Packung, Kapitel 9 den Grundriss-Generator mit den Raumprogrammen nach Flemming, Kapitel 12 die Türen. Zwei Videos aus dem Projekt zeigen das Verfahren in Bewegung: [Computational Floorplan Synthesis](https://vimeo.com/42206895) und [Packing mit Sichtfeldbewertung](https://vimeo.com/24671938).

Neben der dichten Packung entstanden im Projekt Unterteilungsverfahren mit K-d- und Slicing-Bäumen. Katja Knecht und Reinhard König haben beide Ansätze später verglichen: [Comparing two evolutionary algorithm based methods for layout generation: dense packing versus subdivision](https://doi.org/10.1017/S0890060414000237) (AI EDAM 2014).

### Das Originalprogramm

Das Programm „Einpassung“ ist in C# geschrieben (Windows Forms, Reinhard König, Computational Planning Group). Es liegt im öffentlichen Repository [cpg_all](https://bitbucket.org/koenigr/cpg_all) im Ordner `Source/Kremlas/`: die Evolutionsstrategie in `REvo`, das Individuum in `RChromosome`, die Federn in `RSpring`, die Kollisionserkennung in `Collision`. Die Klassen tragen Stände von 2010 und Februar 2011. Viele Teile des Buchs sind im Code vorbereitet, aber nicht aufgerufen: die Topologie-Läufe, die Raumprogramme, die Türen. Die Neuumsetzung hat sie wieder zusammengeführt.

## 2 Das Verfahren

### Räume als Rechtecke

Ein Individuum ist ein Grundriss aus n Rechtecken in einem Umgebungsrechteck, im Original 500 × 430 Pixel. Jedes Rechteck ist ein Raum mit fester Fläche. Frei sind seine Lage und sein Seitenverhältnis, mit einer Untergrenze für die kürzeste Seite. Gesucht ist eine Anordnung, in der sich die Räume nicht überlappen. Zu minimieren ist die Überlappung **Sg**: die Summe aller Schnittflächen der Räume plus der Flächen außerhalb des Umgebungsrechtecks.

### Hybride Evolutionsstrategie

Eine Evolutionsstrategie verbindet zwei Verfahren. Kinder entstehen durch Rekombination zweier Eltern (ein Abschnitt der Genliste wird getauscht, die Raumnummern bleiben erhalten) und durch Mutation: zufällige Verschiebung einzelner Räume, selten mit großen Sprüngen, Änderung der Proportion, Inversion der Genreihenfolge. Danach „entwickelt“ sich jedes Kind durch Kollisionserkennung. Überlappen sich zwei Räume, weichen beide um einen Teil des kürzesten Trennvektors aus (Abstoßen, Kraft β) und ändern ihre Proportion so, dass die Fläche bleibt (Kraft α). Die Kollision prüft das Separating Axis Theorem, im Original nach Laurent Cozic, hier für achsparallele Rechtecke eigenständig formuliert. Bei der (μ+λ)-Selektion konkurrieren Eltern und Kinder, bei (μ,λ) nur die Kinder.

### Federn für Nachbarschaften

Sollen zwei Räume benachbart sein, zieht eine virtuelle Feder sie zusammen. Ein zweites Kriterium **f2** summiert die Abstände geforderter Nachbarn samt fehlender Durchgangsbreite. Die Selektion wählt einen Teil der Eltern nach Sg, den anderen nach f2. Sobald die beste Lösung nach Sg auch f2 unter 1,5 · Räume erreicht, verschiebt sich die Aufteilung (Regeln 20 und 21 des Buchs, Schwellen aus dem Code). Das Original kennt zwei Topologien: alle Räume an einem zentralen Raum (Stern) und ein Gang mit drei Wohnungen zu je fünf Räumen.

{{ABB_VERFAHREN}}

## 3 Neuumsetzung als Web-App

### Treu zum Original

Die Web-App entstand im November 2026 im Rahmen der Frühen Simulationen, der Neuumsetzung der Programme der alten Website. Modell und Oberfläche sind getrennt: `modell.js` enthält die reine Logik ohne Bildschirm und lässt sich in Node prüfen, `app.js` die Bedienung im gemeinsamen Rahmen der Frühen Simulationen. Gerechnet wird mit fester Saat, gleiche Saat ergibt denselben Lauf. Das Original legte den Zufall bei jedem Raum mit der Uhrzeit neu an und hatte dadurch höchstens 1000 verschiedene Startindividuen. Die Fassungen *Einpassung* (Stand des Programms), *Kollision allein*, *Topologie: Stern* und *Topologie: Gang* bilden die Abläufe des Codes nach, jede Abweichung steht in `QUELLE.md`.

### Zwei Programmfehler und die Federrunden

Beim Prüfen fiel auf, dass sich die Räume kaum der Topologie entsprechend anzogen. Die Ursache waren zwei Fehler im Original. Erstens war der Zuschlag für fehlende Durchgangsbreite in `RSpring.AdditionalVector` immer positiv. Er schob einen Raum stets nach rechts unten, gleich wo der Nachbar lag, und zog so bei rund der Hälfte der Federn in die falsche Richtung. Zweitens prüfen `CalcSpringVector` und `AdditionalVector` nur echte Abstände. Liegen zwei Räume genau aneinander oder überlappen sie hauchdünn, der Normalfall nach jeder Kollisionsrunde, fällt der Fall durch alle Abfragen: Die Feder ist tot, obwohl die gemeinsame Wand für einen Durchgang zu kurz ist. Bei Saat 1 war das bei 20 von 96 offenen Nachbarschaften so.

Nach beiden Korrekturen kam ein neuer Regler dazu: Federn und Kollisionserkennung wechseln je Kind mehrmals ab (*Federrunden*, im Original zwei). Erst dann ziehen sich die Räume sichtbar zusammen.

| Fassung (16 Saaten) | vorher ganz gelöst | nachher ganz gelöst |
|---|---|---|
| Stern, 8 Räume, nach 100 Generationen | 4 | 12 |
| Stern, 8 Räume, nach 2000 Generationen | 10 | 16 |
| Gang, 16 Räume, nach 1000 Generationen | 3 | 12 |

### Der Grundriss-Generator

Die Fassungen *Grundriss* machen aus der Packung einen Grundriss-Generator, wie ihn das Buch beschreibt. Grundlage sind die Raumprogramme mit acht und zehn Räumen nach Flemming (Flur, Hof, Wohnen, Elternschlafzimmer, Zimmer, Küche, Bad, zusammen 86 m²), im Code in `REvo.GrowPolys` vorbereitet. Dazu kam ein angenommenes Programm mit sechs Räumen, die heutige Voreinstellung. Maßstab 50 Pixel = 1 m, Feld 10 × 8,6 m. Aus der besten Packung wird ein Plan abgeleitet: Jeder Raum wächst in die Restflächen, bis er auf einen anderen oder auf die Außenwand stößt. An gemeinsamen Wänden geforderter Nachbarn sitzt mittig eine Tür, wie im Buch. Voreingestellt ist eine angenommene Wohnung mit Eingang am Flur, die Sterntopologie des Buchs ist wählbar.

## 4 Grundrisse, die funktionieren

### Was als gültig zählt

Ein Plan zählt als gültig, wenn jede geforderte Nachbarschaft eine Tür hat, sich keine Räume überlappen und jeder Raum seine Mindestbreite und mindestens 95 % seiner Fläche erreicht. Mit dem Stand des Buchs war nach diesen Regeln kein Lauf gültig: Die kürzeste Seite durfte bis auf 0,4 · √Fläche sinken, das Wohnzimmer wurde dann 1,3 m breit. Eine geltende Norm mit Mindestbreiten je Raumart gibt es nicht. Für den Flur gilt DIN 18040-2 (barrierefreie Wohnungen, 1,20 m), die übrigen Werte sind ausgewiesene Annahmen nach üblichen Möblierungen: Wohnen 3,00 m, Eltern 2,80 m, Zimmer und Essen 2,40 m, Küche 1,80 m, Bad 1,60 m.

### Bewerten, was am Ende geprüft wird

Mindestbreiten allein halfen nicht, die steifen Räume verhakten sich. Den Ausschlag gab eine dritte Bewertung **f3**, die den abgeleiteten Plan selbst bewertet: fehlende Türen, zu schmale und zu kleine Räume, Überlappung. Wichtig war, Türen gleitend zu messen, als Abstand der Räume plus fehlende Länge der gemeinsamen Wand. So sieht die Selektion auch kleine Fortschritte. In der Selektion ersetzt f3 das Kriterium f2. Kleine Überlappungen bis 0,5 m teilt der Plan, die Wand rückt in ihre Mitte, und damit dabei jeder Raum seine Fläche behält, belegen die Räume 96 % des Feldes.

### Viele kurze Läufe

Treffer kamen in den Messungen fast immer früh oder gar nicht. Die Suche startet deshalb viele kurze Läufe mit neuen Saaten statt eines langen. Ein Lauf endet beim ersten gültigen Plan. Sonst wird am Ende nachgebessert: Einzelne Räume werden ein wenig verschoben oder in der Proportion geändert, und behalten wird, was f3 nicht verschlechtert (eine örtliche Suche, memetisch). Unter den Treffern wählt die Suche möglichst verschiedene aus (Maximin). Mit sechs Räumen sind drei Grundrisse meist in ein bis zwei Sekunden gefunden, mit acht Räumen in rund 20 Sekunden.

### L-förmige Räume

Je Raum lässt sich erlauben, dass er L-förmig wird. Er besteht dann aus zwei Rechtecken, Hauptteil und Schenkel, die eine innere Feder zusammenhält. Gültig ist ein L, wenn sich beide Teile auf mindestens der Mindestbreite berühren und an einem Ende bündig liegen, sonst entstünde ein T oder ein Z. Mit sechs Räumen und L-förmigem Flur und Wohnen findet die Suche drei Grundrisse in wenigen Sekunden, mit acht Räumen werden L-Räume deutlich seltener gültig.

## 5 Vorbilder nachgenerieren: das Vorgehen

### Die Frage

Kann die evolutionäre Methode von KREMLAS bekannte Grundrisse wiederfinden? Vorbilder sind die acht Villen der Konzeptstudie Palladio (Grammatik nach Stiny und Mitchell 1978, Raumaufteilungen nach Stiny und Gips 1978) und sechs Häuser der Konzeptstudie Duarte/Siza (eigene Rekonstruktion der Malagueira-Grammatik von Duarte 2005), je Erd- und Obergeschoss. KREMLAS bekommt vom Vorbild nur, was ein Raumprogramm enthält: Umriss, Räume mit Flächen und Formen, Türen als geforderte Nachbarschaften, bei Palladio die Spiegelachse, bei Siza die Lage von Treppe und Luftraum im Obergeschoss. Wo die übrigen Räume liegen, muss die dichte Packung selbst finden.

### Vom Vorbild zum Raumprogramm

Zwei kleine Werkzeuge übersetzen die Vorbilder, `vorbilder_palladio.cjs` und `vorbilder_siza.cjs`. Bei Palladio ist ein Raum die Fläche seiner Rasterzellen samt der Wände dazwischen, nach außen um eine halbe Wandstärke erweitert. So füllen die Räume das Innere lückenlos. Maße in Meter, ein Vicentiner Fuß zu 0,357 m. Zusammengesetzte Säle (Kreuz, T, I) werden zeilenweise in Rechtecke zerlegt, Loggien sind nach außen offen und dienen als Eingang. Bei Siza füllen die Räume das Grundstück von 8 × 12 m, die Höfe zählen als Räume, und Räume gleicher Funktion, die sich berühren, bilden einen Raum aus Teilen. Die Türbreite ist bei Siza 0,80 m wie in der Grammatik. Die Mindestbreite eines Raums ist 0,8 · seine kürzeste Seite im Vorbild, als Spielraum für Varianten. Vor jeder Messung prüfen wir, ob das Vorbild selbst unsere Regeln besteht. Sonst könnte die Rekonstruktion es nie als gültig finden.

### Neue Bausteine im Verfahren

- **Feld je Programm:** Umriss und Maßstab je Vorbild statt fest 500 × 430 Pixel.
- **Spiegelsymmetrie** (Palladio): Räume auf der Achse bleiben mittig, die übrigen bilden Paare, die nach jeder Entwicklung auf ihre gemittelte, gespiegelte Lage gebracht werden.
- **Raumtausch:** Zwei Räume ähnlicher Fläche tauschen ihre Plätze, Spiegelpaare immer beidseitig. Sonst bliebe die einmal gefundene Reihenfolge der Räume fast fest.
- **Starre Raumform:** Ein zusammengesetzter Saal behält Form und Maße des Vorbilds, frei ist nur seine Lage.
- **Feste Räume** (Siza): Treppe und Luftraum stehen an der Stelle des Vorbilds.
- **Nähe zum Vorbild:** ein Regler von 0 (freie Varianten mit demselben Programm) bis 1 (Rekonstruktion). Er nimmt die Abweichung vom Vorbild in f3 auf. Bei Nähe > 0 läuft jeder Lauf bis zum Ende, und der gültige Plan, der dem Vorbild am nächsten kommt, wird zum Schluss noch nachgebessert.

### Ähnlichkeit messen

Je Raum zählt die Überdeckung seiner Fläche im Plan mit der Fläche im Vorbild, als Schnitt durch Vereinigung, gemittelt über alle Räume. 100 % heißt deckungsgleich. Gespiegelte Grundrisse gelten als gleich: Verglichen wird mit dem Plan selbst und seinen Spiegelungen links/rechts, vorn/hinten und beiden, und es zählt die beste Lage. In der App steht das Vorbild unter dem erzeugten Grundriss im gleichen Maßstab und so gespiegelt, wie es am besten passt.

### Abstimmung je Vorbild

Welche Einstellungen am besten sind, hängt vom Vorbild ab. Für jedes Vorbild wurden 18 Einstellungen gemessen: starre Raumform an oder aus, zwei, fünf oder zehn Federrunden und eine Belegung von 94, 96 oder 98 %, je höchstens acht Läufe zu 400 Generationen. Die beste ist bei der Wahl des Vorbilds voreingestellt (`werkzeuge/abstimmen.cjs`, Ergebnis `werkzeuge/abstimmung.json`). Weil die Abstimmung auf einer Suchreihe beruht, sind die dort gemessenen Werte etwas optimistisch. Die Tabellen in den nächsten beiden Kapiteln mitteln deshalb über vier Suchreihen.

Am 25.11.2026 haben wir die Voreinstellungen nachgeprüft: starre Raumform an oder aus, Raumgruppe spiegeln und Wände verschieben, je vier Suchreihen, und jede Änderung zusätzlich an vier frischen Saaten. Übernommen wurde nur, was an beiden Saatgruppen gewinnt. Dabei zeigte sich, dass die Wahl der starren Raumform je Vorbild vorher vom Zufall der einen Suchreihe abhing (Einzelheiten im Kapitel „Versuche zur Verbesserung“).

## 6 Ergebnisse: Palladios Villen

### Messwerte

Je Villa vier Suchreihen mit den Startsaaten 1, 51, 101 und 151, je höchstens sechs Läufe zu 400 Generationen, abgestimmte Voreinstellungen. **Beste** ist die beste Ähnlichkeit über alle Reihen, **Mittel** der Durchschnitt der besten Ähnlichkeit je Reihe (eine Reihe ohne gültigen Plan zählt 0), **Reihen** die Zahl der Reihen mit gültigem Plan. Bei Nähe 0 sucht KREMLAS freie Varianten mit demselben Programm, und die Ähnlichkeit zeigt nur, wie weit sie vom Vorbild abweichen.

{{TAB_PALLADIO}}

### Vergleich: Vorbild, Rekonstruktion, Variante

Je Villa links das Vorbild, in der Mitte die ähnlichste Rekonstruktion (Nähe 1), rechts die ähnlichste freie Variante (Nähe 0), alle im gleichen Maßstab und in der Lage des Vorbilds. Grün: Räume, deren Überdeckung mit dem Vorbild mindestens 90 % beträgt, sonst hell. Die Prozentzahlen sind die Ähnlichkeiten.

{{BILDER_PALLADIO}}

### Warum Saraceno und Pisani schwer sind

Beide Vorbilder bestehen die eigenen Regeln. Schwer ist der Weg dorthin. Pisanis Saal ist ein I aus drei Rechtecken, das zwei Stanzen in seinen Einbuchtungen umschließt. Hängen die Teile nur an Federn, landen die Querbalken oft auf derselben Seite, oder sie können sich nicht um die Stanzen schließen, denn Kollision und Federn wirken nur paarweise. Erst die starre Raumform hält das I zusammen, von 48 auf 88 %. Saraceno hat extrem ungleiche Räume, 14 bis 186 m², und einen T-Saal. Vor der Korrektur des Feldrahmens (siehe „Fehler und Korrekturen“) fand die Suche mit der ersten Voreinstellung keinen gültigen Plan, seither bis 100 %.

## 7 Ergebnisse: Sizas Häuser in der Malagueira

### Messwerte

Wie bei Palladio: vier Suchreihen je Geschoss, abgestimmte Voreinstellungen. Stand 24.11.2026, die Geschosse noch einzeln erzeugt; zum Haus aus zwei Geschossen siehe unten.

{{TAB_SIZA}}

### Vergleich: Vorbild, Rekonstruktion, Variante

Wie bei Palladio: Vorbild, ähnlichste Rekonstruktion, ähnlichste Variante, gleicher Maßstab, Lage des Vorbilds, grün die Räume mit mindestens 90 % Überdeckung.

{{BILDER_SIZA}}

### Was die Obergeschosse schwer macht

Die Erdgeschosse gelingen meist vollständig, die Obergeschosse deutlich seltener. Dort liegen viele kleine Räume an schmalen Gängen, und der Flur besteht aus drei bis vier verketteten Rechtecken, die sich um die feste Treppe und den Luftraum legen müssen. In den Fehlschlägen ist der Flur fast immer zu klein oder überlappt, und die Türen zum Abstellraum oder zum Bad fehlen. Für das Obergeschoss von Duartes neuem Haus fand die Suche in keiner Reihe einen gültigen Plan.

### Haus aus zwei Geschossen (seit 25.11.2026)

Einzeln erzeugte Geschosse passen nicht zusammen: Treppe und Hof können im Obergeschoss woanders liegen als im Erdgeschoss. Seit dem 25.11.2026 entstehen beide zusammen. Die Treppe ist ein eigener Raum mit festen Maßen aus dem Vorbild; die gerade Treppe der Typen Ab, zwei Zimmer und Duartes neues Haus steht im Wohnraum und wird dafür aus ihm ausgeschnitten. Das Obergeschoss übernimmt Treppe und Hof aus dem Erdgeschoss als feste Räume: die Treppe an derselben Stelle, den Luftraum genau über dem Hof, Teil für Teil. Beide wachsen im Plan nicht, andere Räume weichen ihnen aus.

Gezeichnet wird die Treppe mit Stufen und Lauflinie, Punkt am Antritt, Pfeil am Austritt; die zweiläufige Treppe mit Wendepodest. Geprüft wird, ob Antritt und Austritt zugänglich sind: Vor dem Antritt im Erdgeschoss und vor dem Austritt im Obergeschoss muss ein Podest so breit wie der Lauf und so tief, wie der Lauf breit ist, mindestens 0,8 m (nach DIN 18065), ganz in einem Raum liegen, der die Treppe erschließt, und der Zugang muss dort offen sein. Bei der zweiläufigen Treppe zählt im Erdgeschoss der Antrittslauf, im Obergeschoss der Austrittslauf. Alle sechs Vorbilder erfüllen diese Regeln.

Die Suche arbeitet in zwei Schritten: erst ein gültiges Erdgeschoss, dann bis zu drei Läufe für ein passendes Obergeschoss mit Treppe und Hof aus genau diesem Erdgeschoss. Eine eigene Mutation legt die Treppe an ihren Zugang (im Obergeschoss rückt der Flur vor die feste Treppe), auch beim Nachbessern. Das Obergeschoss läuft mit seinen eigenen abgestimmten Einstellungen.

| Haus | Häuser in 2 × 24 Läufen | Ähnlichkeit (Mittel EG und OG) |
|---|---|---|
| Typ Bb (Hof hinten) | 5 | 15–63 % |
| Haus mit fünf Zimmern | 1 | 54 % |
| Typ Ab (Hof vorn) | 0 (1, solange der Luftraum noch angeschnitten werden durfte) | – |
| Haus mit vier Zimmern | 0 (1, solange der Luftraum noch angeschnitten werden durfte) | – |
| Duartes neues Haus | 0 | – |
| Haus mit zwei Zimmern | 0 | – |

Gültige Erdgeschosse findet die Suche für alle Häuser; es scheitert meist das Obergeschoss, weil es mit der Lage von Treppe und Hof leben muss, die das Erdgeschoss gewählt hat. Der nächste Schritt ist deshalb, das Haus als ein Individuum zu behandeln: Erd- und Obergeschoss werden gemeinsam bewertet und ausgewählt, so dass sich Erdgeschosse durchsetzen, zu denen ein Obergeschoss passt.

## 8 Fehler und Korrekturen

### Was am meisten gebracht hat

Die größten Sprünge kamen nicht aus neuen Verfahren, sondern aus gefundenen Fehlern. Deshalb hier die wichtigsten, mit ihrer Wirkung.

| Fehler | Wirkung | Korrektur |
|---|---|---|
| Federzuschlag immer positiv (Original) | rund die Hälfte der Federn zog falsch herum | Zuschlag zeigt zum Nachbarn |
| Federn tot bei Berührung (Original) | gerade die fast fertigen Nachbarn bekamen keinen Zug | kleinere Überdeckung gilt als Berührrichtung |
| Sortierung mit Untergrenze 1 (Original, `FitOverl`) | alle fast gültigen Pläne galten als gleich gut | f3 ohne Untergrenze sortiert |
| Türregel 0,9 + 0,2 m auch für Siza | sieben von zwölf Siza-Vorbildern waren selbst ungültig | Türbreite je Programm, Siza 0,80 m |
| Loggia als „L-Form“ gelesen (Übersetzer Palladio) | Villa Angarano ohne Eingang | Loggien als offener Eingang |
| Außentür als Raum gelesen (Übersetzer Siza) | Häuser ohne Eingang von der Straße | Außentüren erkannt |
| Feldrahmen in Sg fest 500 × 430 px | bei Siza wurde der hintere Streifen als „außerhalb“ bestraft | Rahmen folgt dem Feld je Programm |

### Prüfen, ob das Vorbild selbst gültig ist

Eine einfache Prüfung hat zwei der Fehler aufgedeckt: Jedes Vorbild wird selbst als Lösung in die Bewertung gegeben. Besteht es nicht, kann die Rekonstruktion es nie als gültig finden, und der Fehler liegt in den Regeln oder in der Übersetzung, nicht in der Suche. Seit den Korrekturen bestehen alle 20 Vorbilder.

## 9 Versuche zur Verbesserung

### Generische Formgene

Die starre Raumform übernimmt Form und Maße aus dem Vorbild. Für ein generisches Verfahren, mit dem sich viele verschiedene Grundrisse nachgenerieren lassen, ist das zu speziell. Wir haben deshalb parametrische Raumformen als Gene erprobt: Jeder Raum mit genug Fläche kann Rechteck, L, T, Kreuz/I oder U werden, beschrieben durch Seite, Armbreite, Flächenanteil und Aufteilung der Arme. Ein seltener Formwechsel und ein Drift der Parameter mischen Formen ein, die Selektion entscheidet. Auch ein Inselmodell haben wir versucht, je eine Teilpopulation pro Formtyp mit Austausch der Besten. Ergebnis: Beide finden gültige Pläne, rekonstruieren die zusammengesetzten Säle aber deutlich schlechter als die übernommene Form, das Inselmodell zudem fünfmal langsamer. Die Form muss gleichzeitig mit der Anordnung gefunden werden, und der Raum aus Formtyp und Parametern ist groß.

| Vorbild | Formgene | Formgene mit Inseln | übernommene Form |
|---|---|---|---|
| Malcontenta | 76 % | 76 % | 93–99 % |
| Saraceno | 63 % | 63 % | 92–100 % |
| Pisani | 49 % | 31 % | 77–88 % |

### Was die Literatur vorschlägt

Eine Recherche nach Verbesserungen für evolutionäre Grundrissgeneratoren ergab zwölf umsetzbare Vorschläge, darunter: Annahme schlechterer Zwischenstände und Raumtausch nach [Merrell, Schkufza und Koltun (2010)](https://www.cs.princeton.edu/courses/archive/spring11/cos598A/pdfs/Merrell10a.pdf) und [Burke und Bykov (2017)](https://doi.org/10.1016/j.ejor.2016.07.012); Raumgruppen spiegeln, Wände ausrichten und frische Individuen aus EPSAP von [Rodrigues, Gaspar und Gomes (2013)](https://doi.org/10.1016/j.cad.2013.01.001); erst die Topologie kraftbasiert auslegen, dann packen, nach [Guo und Li (2017)](https://doi.org/10.1016/j.foar.2016.11.003) und [Fruchterman und Reingold (1991)](https://doi.org/10.1002/spe.4380211102); Räume schrittweise in Teile aufspalten nach [Wu et al. (2018)](https://doi.org/10.1111/cgf.13380); eine graphentheoretische Vorprüfung nach [Pinki, Shekhawat und Lal (2025)](https://doi.org/10.1017/S0890060424000179); und Unterteilung statt Packung nach [Knecht und König (2014)](https://doi.org/10.1017/S0890060414000237), für Palladio auch als Unterteilungsgrammatik bei [Benrós, Duarte und Hanna (2012)](https://doi.org/10.1260/1478-0771.10.4.521). Einen Überblick gibt [Weber, Mueller und Reinhart (2022)](https://doi.org/10.1016/j.autcon.2022.104385).

### Getestet

Sieben der Vorschläge haben wir eingebaut, schaltbar, und an den schweren Fällen gemessen, zuletzt an allen 20 Vorbildern mit je vier Suchreihen.

| Vorschlag | Wirkung |
|---|---|
| Spätannahme in der Nachbesserung (Late Acceptance) | schadet deutlich, die Nachbesserung findet seltener zurück zu einem gültigen Plan |
| Topologie zuerst (kraftbasierte Startlage) | schadet |
| frische Zufallspläne je Generation | schadet |
| Wände ausrichten | neutral |
| feste Räume im Plan unantastbar | gemischt |
| Raumgruppe spiegeln (2 %) | Malcontenta von 25 auf 63 % im Mittel, andere verlieren |
| Wände am fertigen Plan verschieben | Siza Erdgeschoss Ab von 83 auf 90 %, sonst neutral |
| beide letzten zusammen, alle 20 Vorbilder | Mittel 75,6 → 75,9 %, Reihen mit Treffer 69 → 71 von 80: im Rauschen |
| schrittweise aufspalten (erst ein Rechteck je Raum, nach 100 bzw. 200 Generationen in Teile zerlegt), 10 Vorbilder | 58,0 bzw. 54,7 % gegen 62,5 % ohne: schadet, nur Pisani gewinnt |

### Schalter in der App, abgestimmt über zwei Saatgruppen

Raumgruppe spiegeln (als Rate) und Wände verschieben sind seit dem 25.11.2026 Regler der App, damit sich das Prinzip weiter nutzen lässt. Abgestimmt wurden sie je Vorbild über vier Suchreihen, zusammen mit der starren Raumform, und jede Wahl wurde an vier frischen Saaten gegengeprüft. Von sieben zunächst gewählten Schaltern hielten nur drei der Gegenprobe stand; viel stärker wirkte die Raumform:

| Vorbild | neu voreingestellt | Saaten 1–151 | Saaten 201–351 |
|---|---|---|---|
| Malcontenta | frei + Raumgruppe spiegeln | 25 → 74 % | 25 → 74 % |
| Siza Ab, EG | frei + Raumgruppe spiegeln | 83 → 94 % | 62 → 92 % |
| Siza Ab, OG | starr + Raumgruppe spiegeln | 68 → 73 % | 69 → 71 % |
| Siza vier Zimmer, OG | frei | 22 → 48 % | 23 → 57 % |
| Siza Bb, OG | frei | 70 → 63 %, Reihen mit Treffer 3 → 4 | 46 → 68 %, 2 → 4 |
| Siza Duartes Haus, OG | frei | 0 → 17 % | 0 → 12 % |

Wände verschieben ist nirgends voreingestellt.

### Packung und Unterteilung kombinieren

Lässt sich die Unterteilung nach Knecht und König (2014) mit der dichten Packung verbinden, ohne das Verfahren auf einen Fall zuzuschneiden? Ja, am besten in Schritten statt in einem gemeinsamen Chromosom. Die Packung findet Nachbarschaften und grobe Lage. Der daraus abgeleitete Plan ist bereits eine Unterteilung, denn jede Wand trennt zwei Räume. Eine zweite Suche verschiebt dann nur noch Wände, so dass der Plan immer lückenlos bleibt; der Schalter „Wände verschieben“ ist genau dieser erste Baustein. Das bleibt generisch, weil der Übergang von der Packung zum Wandnetz für jedes Programm automatisch geht. Ein gemeinsames Chromosom aus Schnittbaum und Packung wäre möglich, verdoppelt aber den Suchraum, und Federn und Kollision greifen auf einem Schnittbaum nicht. Dieselbe Frage stellt sich beim Haus aus zwei Geschossen (Kapitel zu Siza): Die Kopplung in Schritten funktioniert, die gemeinsame Bewertung beider Geschosse in einem Individuum ist der nächste Versuch.

### Was wir daraus schließen

Keiner der günstigen Vorschläge macht das Verfahren im Mittel besser, einzelne Vorbilder gewinnen, andere verlieren ebenso deutlich. Den größten Einfluss hat die Startsaat: Malcontenta erreicht mit der einen Suchreihe 99 %, mit der anderen keinen Treffer. Online bleibt deshalb der beste gemessene Stand mit übernommener Form und abgestimmten Voreinstellungen. Lohnende nächste Schritte sind die größeren Vorschläge: Räume schrittweise aufspalten als generischer Ersatz für die übernommene Form, Unterteilung als zweite Darstellung, die Graph-Vorprüfung, um geometrisch unmögliche Programme früh zu erkennen, und eine Abstimmung über mehrere Suchreihen, damit die Voreinstellungen robust werden. Die Abstimmung über zwei Saatgruppen ist inzwischen umgesetzt (siehe oben), das schrittweise Aufspalten getestet und verworfen.

## 10 Quellen

### Literatur

- T. Elezkurtaj, G. Franck (2002): Algorithmic Support of Creative Architectural Design. *Umbau* 19, 129–137. [ResearchGate](https://www.researchgate.net/publication/255606960_Algorithmic_Support_of_Creative_Architectural_Design) – Ausgangspunkt der gesamten Entwicklung.
- D. Donath, R. König, F. Petzold (Hrsg.) (2012): *KREMLAS. Entwicklung einer kreativen evolutionären Entwurfsmethode für Layoutprobleme in Architektur und Städtebau.* Weimar: Verlag der Bauhaus-Universität, urn:nbn:de:gbv:wim2-20120509-16504.
- K. Knecht, R. König (2014): Comparing two evolutionary algorithm based methods for layout generation: dense packing versus subdivision. *AI EDAM*, [doi:10.1017/S0890060414000237](https://doi.org/10.1017/S0890060414000237).
- G. Stiny, W. J. Mitchell (1978): The Palladian grammar. *Environment and Planning B* 5(1), 5–18, [doi:10.1068/b050005](https://doi.org/10.1068/b050005).
- G. Stiny, J. Gips (1978): An evaluation of Palladian plans. *Environment and Planning B* 5(2), 199–206, [doi:10.1068/b050199](https://doi.org/10.1068/b050199).
- J. P. Duarte (2005): Towards the mass customization of housing: the grammar of Siza's houses at Malagueira. *Environment and Planning B* 32(3), 347–380, [doi:10.1068/b31124](https://doi.org/10.1068/b31124).
- P. Merrell, E. Schkufza, V. Koltun (2010): Computer-generated residential building layouts. *ACM Transactions on Graphics* 29(6), Art. 181, [PDF](https://www.cs.princeton.edu/courses/archive/spring11/cos598A/pdfs/Merrell10a.pdf).
- E. Rodrigues, A. R. Gaspar, Á. Gomes (2013): An evolutionary strategy enhanced with a local search technique for the space allocation problem in architecture, Part 1: Methodology. *Computer-Aided Design* 45(5), 887–897, [doi:10.1016/j.cad.2013.01.001](https://doi.org/10.1016/j.cad.2013.01.001).
- E. K. Burke, Y. Bykov (2017): The late acceptance hill-climbing heuristic. *European Journal of Operational Research* 258(1), 70–78, [doi:10.1016/j.ejor.2016.07.012](https://doi.org/10.1016/j.ejor.2016.07.012).
- Z. Guo, B. Li (2017): Evolutionary approach for spatial architecture layout design enhanced by an agent-based topology finding system. *Frontiers of Architectural Research* 6(1), 53–62, [doi:10.1016/j.foar.2016.11.003](https://doi.org/10.1016/j.foar.2016.11.003).
- T. M. J. Fruchterman, E. M. Reingold (1991): Graph drawing by force-directed placement. *Software: Practice and Experience* 21(11), 1129–1164, [doi:10.1002/spe.4380211102](https://doi.org/10.1002/spe.4380211102).
- W. Wu, L. Fan, L. Liu, P. Wonka (2018): MIQP-based layout design for building interiors. *Computer Graphics Forum* 37(2), 511–521, [doi:10.1111/cgf.13380](https://doi.org/10.1111/cgf.13380).
- Pinki, K. Shekhawat, A. Lal (2025): Automated generation of floor plans with minimum bends. *AI EDAM* 39, e3, [doi:10.1017/S0890060424000179](https://doi.org/10.1017/S0890060424000179).
- D. Benrós, J. P. Duarte, S. Hanna (2012): A new Palladian shape grammar: a subdivision grammar as alternative to the Palladian grammar. *IJAC* 10(4), 521–540, [doi:10.1260/1478-0771.10.4.521](https://doi.org/10.1260/1478-0771.10.4.521).
- R. E. Weber, C. Mueller, C. Reinhart (2022): Automated floorplan generation in architectural design: A review of methods and applications. *Automation in Construction* 140, 104385, [doi:10.1016/j.autcon.2022.104385](https://doi.org/10.1016/j.autcon.2022.104385).
- DIN 18040-2:2011-09: Barrierefreies Bauen – Planungsgrundlagen – Teil 2: Wohnungen.

### Code und Daten

- Originalprogramm: Repository [cpg_all](https://bitbucket.org/koenigr/cpg_all), Ordner `Source/Kremlas/`.
- Web-App mit Quellcode: [lab/kremlas/](../), Quellcode als `quellcode.zip`, Abweichungen vom Original in `QUELLE.md`, Methode in `METHODE.md`.
- Vorbilder: Konzeptstudien [Palladio](../../palladio/) und [Duarte/Siza](../../duarte-siza/), übersetzt mit `werkzeuge/vorbilder_palladio.cjs` und `werkzeuge/vorbilder_siza.cjs`.
- Messungen dieser Dokumentation: `werkzeuge/doku_ergebnisse.cjs`, Rohdaten in `doku_quelle/ergebnisse.jsonl`.
