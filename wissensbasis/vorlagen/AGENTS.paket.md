# AGENTS.md · Startdatei für Coding-Agenten

Dieses Projekt nutzt die Wissensbasis des KI Lab ({{WEB}}): Methoden, Erfahrungen, Prüfer und Abläufe aus generativen Studien für Architektur und Städtebau.
{{ATTRIBUTION}} · Stand {{STAND}} · Lizenz CC BY 4.0

Ein Mensch verantwortet dieses Projekt. Du arbeitest in seinem Auftrag: Er entscheidet, du schlägst vor, setzt um und prüfst.

## Zuerst lesen

1. Diese Datei.
2. `methoden/README.md` – der Methodenkatalog: welche Methoden im KI Lab umgesetzt sind, was sich bewährt hat und was nicht, wie die Methoden Stil („Handschrift“) fassen.
3. `PROJEKTE.md` – alle Projekte mit App, Methode und Quellcode-Paket.
4. Die `METHODE.md` der ein bis drei Projekte, die der Aufgabe am nächsten sind (`methoden/projekte/<id>/METHODE.md`).
5. Den passenden Skill unter `.claude/skills/`, bevor du mit einer Aufgabenart beginnst.

Lies nur, was du brauchst. Die METHODE.md sind kurz und folgen demselben Raster: Frage, Vorbild und Quellen, Darstellung, Korpus, Generator, Prüfer, Handschrift, Was trägt, Stolperfallen, Offen.

## Was hier liegt

| Pfad | Inhalt |
|---|---|
| `methoden/README.md` | Methodenkatalog: Index der Projekte, Vergleich nach Handschrift, Wissen über alle Studien |
| `methoden/VORLAGE_METHODE.md` | Vorlage für die METHODE.md eines neuen Projekts |
| `methoden/projekte/<id>/METHODE.md` | Methode je Projekt des KI Lab |
| `.claude/skills/<name>/SKILL.md` | Abläufe für wiederkehrende Aufgaben |
| `rezepte/simulationen/REZEPT.md`, `rezepte/katalog/REZEPT.md` | Rezepte, nach denen alte Programme und Grasshopper-Module zu Serien von Web-Apps wurden |
| `konzepte/KONZEPT_Coding_Agent_Kapitel.md` | wie jede App ein Kapitel „Weiterarbeiten mit einem Coding-Agenten“ bekommt |
| `PROJEKTE.md` | Projekte mit Links zu App, Methode und Quellcode |
| `LIESMICH.md` | für Menschen: Nutzung, Lizenz, Anpassungen dieser Kopie |

## Skills

{{SKILLS}}

Claude Code findet die Skills unter `.claude/skills/` selbst. Andere Agenten (Codex, Gemini CLI …) lesen die passende `SKILL.md` als Anleitung, bevor sie mit der Aufgabe beginnen.

## Code aus dem KI Lab übernehmen

Lade das Quellcode-Paket des Vorbilds (Links in `PROJEKTE.md`) und entpacke es in einen eigenen Unterordner, z. B. `vorbilder/<id>/`. Lies dort zuerst `README.md`, `AGENTS.md`, `METHODE.md` und, falls vorhanden, `QUELLE.md`; lass die Tests laufen, bevor du etwas änderst. Übernimm Muster und Bausteine mit Herkunftsangabe im Code und in der METHODE.md des neuen Projekts.

## Arbeitsregeln

- Fakten nur aus Dateien und belegten Quellen (Autor, Jahr, Titel, DOI oder URL), nicht aus dem Gedächtnis. Zahlen mit Datum.
- Entscheidungen des Menschen mit Datum festhalten (z. B. in `STAND.md`); jeder Wunsch wird ein Test oder eine Prüfung.
- Erst Maßstab und Prüfer, dann Generator. Gleiche Saat → gleiches Ergebnis. Widersprüche im Programm beheben, nicht nur berichten.
- Keine Zugangsdaten in Dateien, Prompts, Commits oder Paketen: API-Schlüssel nur aus Umgebungsvariablen, `.env` in `.gitignore`.
- Keine personenbezogenen Daten (etwa von Studierenden), keine fremden Pläne und keine lizenzierten Daten ins Repo; Korpusdaten mit unklarer Lizenz bleiben lokal.
- Fremden Code nur mit passender Lizenz und Herkunftsangabe; im Zweifel neu schreiben und das kennzeichnen.
- Übernommene Inhalte aus dem KI Lab: CC BY 4.0, Namensnennung „{{ATTRIBUTION}}“. KI-Bilder kennzeichnen.
- Veröffentlichen, pushen oder deployen nur mit ausdrücklichem OK des Menschen.

## Ergebnisse zurückführen

Am Ende jeder Etappe die `METHODE.md` des neuen Projekts nach `methoden/VORLAGE_METHODE.md` schreiben bzw. nachziehen und eine Zeile für die Tabelle „Projekte“ in `methoden/README.md` vorschlagen (Skill `methode-dokumentieren`). So wird das neue Projekt selbst Teil der Wissensbasis.

## Links

- KI Lab: {{WEB}}
- Diese Wissensbasis mit Beispielablauf und Prompts: {{WEB}}lab/wissensbasis/
- Alle Methoden als Webseiten: {{WEB}}lab/methode/
