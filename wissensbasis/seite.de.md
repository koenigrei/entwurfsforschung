## Worum es geht

Jedes Projekt im KI Lab hinterlässt mehr als eine App: den Quellcode mit Tests, eine Beschreibung der Methode, Erfahrungen, was trägt und was nicht, und die Abläufe, nach denen gearbeitet wurde. Zusammen ist das eine Wissensbasis. Ein Coding-Agent wie Claude Code liest sie in wenigen Minuten und knüpft dort an, statt bei null anzufangen: Er kennt die Vorbilder, die Prüfer, die Stolperfallen und die Regeln, die sich bewährt haben.

Diese Seite zeigt, wie man die Wissensbasis für ein neues Projekt verwendet. Das Paket oben enthält alle übergeordneten Dateien; die Quellcode-Pakete der einzelnen Projekte kommen bei Bedarf dazu.

## Was es gibt

| Baustein | Wo | Wofür |
|---|---|---|
| Apps | Kacheln im [KI Lab](../../) | ansehen, ausprobieren, Varianten erzeugen |
| Quellcode-Paket je App | in der App unter „Quellcode · Weiterentwickeln“, Übersicht unten | Code, Tests, `README.md`, `AGENTS.md`, meist auch `QUELLE.md` und `METHODE.md` |
| `METHODE.md` je Projekt | [Methoden](../methode/), im Paket unter `methoden/projekte/` | Frage, Vorbild und Quellen, Darstellung, Korpus, Generator, Prüfer, Handschrift, was trägt, Stolperfallen, Offenes |
| Methodenkatalog | im Paket `methoden/README.md` | Index aller Projekte, Vergleich, wie die Methoden Stil fassen, Wissen über alle Studien |
| Vorlage | im Paket `methoden/VORLAGE_METHODE.md` | Raster für die METHODE.md eines neuen Projekts |
| Skills | im Paket `.claude/skills/<name>/SKILL.md` | Abläufe, die der Agent lädt, bevor er eine Aufgabenart bearbeitet |
| Rezepte | im Paket `rezepte/` | wie aus alten Programmen und Grasshopper-Modulen Serien von Web-Apps wurden |
| Startdatei | im Paket `AGENTS.md` und `CLAUDE.md` | sagt dem Agenten, was er zuerst liest und welche Regeln gelten |

Ein **Skill** ist eine kurze Anleitung in einer Datei `SKILL.md`: oben Name und Beschreibung, wann sie gilt, darunter der Ablauf. Claude Code findet Skills im Ordner `.claude/skills/` des Projekts und lädt einen, sobald eine Aufgabe zu seiner Beschreibung passt. Andere Coding-Agenten wie Codex oder Gemini CLI lesen `AGENTS.md` und von dort aus die passende `SKILL.md` als Anleitung.

## Projekte und ihre Pakete

{{PROJEKTE}}

## Ein neues Projekt starten

1. **Paket laden:** [KI-Lab_Wissensbasis.zip](KI-Lab_Wissensbasis.zip) herunterladen und entpacken.
2. **Projektordner anlegen** und den Inhalt des Ordners `KI-Lab_Wissensbasis/` hineinlegen. Der Ordner `.claude/` ist versteckt und muss mit (im Windows-Explorer: Ansicht › Einblenden › Ausgeblendete Elemente).
3. **Vorbilder dazulegen** (nach Bedarf): das Quellcode-Paket der ein bis zwei nächstverwandten Projekte in einen Unterordner `vorbilder/<projekt>/` entpacken.
4. **Git einrichten** (`git init`), damit jeder Schritt nachvollziehbar und umkehrbar bleibt.
5. **Agent starten:** den Ordner in VS Code oder im Terminal öffnen und den Agenten dort starten, z. B. `claude` für Claude Code. Claude Code liest `CLAUDE.md`, die `AGENTS.md` einbindet; Codex und andere lesen `AGENTS.md` direkt.
6. **Mit einer Frage beginnen,** nicht mit einem Auftrag: Der Agent liest zuerst und berichtet, was er übernehmen würde.

## Beispiel: eine neue generative Studie

Angenommen, eine Studie soll Reihenhäuser im Stil einer Siedlung der 1920er-Jahre erzeugen. Die nächsten Projekte im Lab sind die Formgrammatiken Duarte/Siza und Palladio in der [Studie Formgrammatik](../formgrammatik/). So kann der Ablauf aussehen; jeder Prompt ist eine Etappe, danach wird das Ergebnis angesehen.

### 1 · Orientieren, nichts ändern

```
Lies AGENTS.md, methoden/README.md und PROJEKTE.md. Meine Frage: Lässt sich der Stil der Reihenhäuser der Siedlung <Name> als Generator fassen? Welche zwei bis drei Projekte des KI Lab sind am nächsten? Lies deren METHODE.md und fasse zusammen, was ich übernehmen kann und welche Stolperfallen ich vermeiden sollte. Ändere noch nichts.
```

### 2 · Plan nach dem Skill

```
Nutze den Skill generative-studie. Schreib einen Plan in PLAN.md: Frage, Vorbild und Quellen mit DOI, Korpus mit Auswahlregeln, Darstellung, Prüfer, Generator, App. Kennzeichne, was belegt und was Annahme ist. Warte auf mein OK.
```

### 3 · Korpus und Prüfer zuerst

```
Lade das Quellcode-Paket der Studie Formgrammatik (Link in PROJEKTE.md) nach vorbilder/formgrammatik/; Duarte/Siza liegt darin unter konzepte/2026-11-20_Experiment_Siza_Malagueira/. Leg unseren Korpus im selben Format an, das auch der Generator benutzen wird (Vorbild: korpus/katalog.json und prototyp/korpus.js im Paket). Schreib den Prüfer mit Tests: Kennzahlen der Originale und harte Regeln. Zeig mir die Kennzahlen der Originale als Tabelle.
```

### 4 · Generator mit Saat

```
Schreib den Generator nach dem Muster „Grammatik als Gene mit Saat und sichtbarer Ableitung“ aus der METHODE.md von Duarte/Siza: gleiche Saat, gleiches Haus. Schick 200 Saaten durch den Prüfer, berichte die Trefferquote und die drei größten Unterschiede zu den Originalen und behebe sie im Generator, nicht im Prüfer.
```

### 5 · App zum Ansehen

```
Baue eine App als eine HTML-Datei: Bilderwand vieler Varianten, Einzelansicht mit Ableitung, Deutsch und Englisch, dunkel und hell, Autorenzeile und Lizenz, keine Inhalte fremder Server. Prüfe sie im Browser bei 1440 und 390 px Breite und zeig mir Bildschirmfotos.
```

### 6 · Zurückführen

```
Nutze den Skill methode-dokumentieren: Schreib METHODE.md nach methoden/VORLAGE_METHODE.md, nur mit Fakten aus unseren Dateien und Zahlen mit Datum, und schlag eine Zeile für die Tabelle „Projekte“ in methoden/README.md vor.
```

Nach jeder Etappe: Ergebnisse selbst ansehen, Tests laufen lassen, Entscheidungen mit Datum festhalten (der Agent schreibt sie in `STAND.md`).

## An einer vorhandenen App weiterarbeiten

Für kleinere Vorhaben genügt das Quellcode-Paket einer App, etwa um den Generator der Palladio-Tabs der [Studie Formgrammatik](../formgrammatik/formgrammatik.html#tab:palladio) um eine Regel zu erweitern oder [Procedural Cities](../procedural-cities/) auf ein anderes Gelände anzuwenden. Paket entpacken, den Skill `lab-projekt-weiterentwickeln` aus der Wissensbasis nach `.claude/skills/` legen und so beginnen:

```
Lies README.md, AGENTS.md und METHODE.md. Erkläre mir den Aufbau, lass die Tests laufen und sag mir, welche Regeln nicht brechen dürfen. Ändere nichts.
```

## Ergebnisse zurückführen

Eine Wissensbasis wächst nur, wenn neue Projekte ihr Wissen zurückgeben:

- **METHODE.md** im neuen Projekt nach der Vorlage, mit allen Abschnitten; „noch offen“ ist eine erlaubte Antwort.
- **Katalogzeile** für die Tabelle „Projekte“ in `methoden/README.md`; neue Erkenntnisse über alle Studien unter „Was über alle Studien trägt“.
- **Paket** des neuen Projekts mit `README.md`, `AGENTS.md`, `METHODE.md`, Tests und Lizenz, damit andere dort weiterarbeiten können.

Wer ein Projekt in das KI Lab einbringen möchte, schickt METHODE.md und Katalogzeile an die Professur InfAU der Bauhaus-Universität Weimar (Kontakt im [Impressum](../../impressum/)).

## Grenzen

- **Qualität prüfen:** Agenten irren mit derselben Sicherheit, mit der sie richtig liegen. Ergebnisse ansehen, Tests laufen lassen, Änderungen lesen. Ein Prüfer misst nur, was er misst; ein Blindurteil durch Menschen fehlt bisher in allen Studien.
- **Zahlen veralten:** Die METHODE.md nennen Messwerte mit Datum. Vor dem Zitieren neu messen.
- **Quellen:** Fakten nur aus Dateien und belegten Quellen mit Autor, Jahr und DOI. Was der Agent ohne Beleg „weiß“, gehört nicht in eine METHODE.md.
- **Lizenzen:** Inhalte des KI Lab stehen unter CC BY 4.0 mit der Namensnennung „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“. Originale anderer haben eigene Lizenzen (in den Paketen unter `QUELLE.md` und `LICENSE.md`). Fremde Pläne bleiben lokal; lizenzierte Kennwerte wie die des BKI sind in keinem Paket.
- **Keine Zugangsdaten:** API-Schlüssel nur in Umgebungsvariablen, nie in Dateien, Prompts, Commits oder Paketen.
- **Keine personenbezogenen Daten:** keine Daten von Studierenden oder Dritten in Prompts und Repos.
- **Sprache:** Die Dateien des Pakets sind deutsch; Coding-Agenten lesen sie ohne Weiteres.
- **Rezepte:** Sie beschreiben die Arbeit im Repository der Website, dessen Werkzeuge nicht im Paket liegen; als Vorlage für eine neue App dient das `quellcode.zip` einer vorhandenen.

## Inhalt des Pakets

Stand {{STAND}}. Das Paket wird bei jedem Bau der Website aus den aktuellen Quellen zusammengestellt und auf private Angaben geprüft (Pfade mit Benutzernamen, E-Mail-Adressen, Zugangsschlüssel, Gedächtnisdateien). Die Dateien lassen sich auch einzeln ansehen; die Skills liegen dafür unter `skills/`, im Paket unter `.claude/skills/`.

{{DATEIEN}}

{{ANPASSUNGEN}}
