# KI Lab · Wissensbasis

{{ATTRIBUTION}} · Stand {{STAND}} · Lizenz CC BY 4.0

Dieses Paket macht die Vorarbeit des KI Lab ({{WEB}}) für neue Projekte nutzbar: Methoden, Erfahrungen, Stolperfallen und Abläufe aus generativen Studien für Architektur und Städtebau, geschrieben für Menschen und für Coding-Agenten wie Claude Code, Codex oder Gemini CLI.

## So geht's

1. Einen neuen Projektordner anlegen und den Inhalt dieses Pakets hineinlegen. Der Ordner `.claude/` ist versteckt; er muss mit.
2. Den Ordner in VS Code oder im Terminal öffnen und den Coding-Agenten dort starten, z. B. `claude` für Claude Code. Claude Code liest `CLAUDE.md`, andere Agenten lesen `AGENTS.md`.
3. Erster Prompt: „Lies AGENTS.md und methoden/README.md. Meine Frage ist: … Welche Projekte des KI Lab sind am nächsten, und was kann ich übernehmen? Ändere noch nichts.“

Anleitung mit Beispielablauf und Prompts: {{WEB}}lab/wissensbasis/ · Übersicht der Dateien: `AGENTS.md`, Abschnitt „Was hier liegt“.

## Lizenz

Texte: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.de), Namensnennung „{{ATTRIBUTION}}“.
Methoden und Rezepte nennen Vorbilder und Originale anderer Autorinnen und Autoren, jeweils mit Quelle; für deren Werke gelten deren Lizenzen (z. B. MIT für den Parametric Planning Catalogue).

## Anpassungen in dieser Kopie

Die Dateien sind der aktuelle Stand der Quellen beim Bau der Website. Für das Paket wurden interne Stellen angepasst:

{{ANPASSUNGEN}}

Pfade wie `Apps/<projekt>/` oder `_prozess/…` in den METHODE.md beziehen sich auf die Quell-Repositorien der Projekte; die veröffentlichten Teile stehen in den Quellcode-Paketen (Links in `PROJEKTE.md`). Die Rezepte beschreiben die Arbeit im Repository der Website, Werkzeuge wie `neue_app.py` und `pruefe_apps.py` liegen dort; als Vorlage für eine neue App dient das `quellcode.zip` einer vorhandenen App.

## English

This package makes the groundwork of the AI Lab at entwurfsforschung.de reusable for new projects: methods, lessons learned, pitfalls and workflows from generative studies in architecture and urban design, written for people and for coding agents. Put its contents (including the hidden folder `.claude/`) into a new project folder and start your coding agent there: Claude Code reads `CLAUDE.md`, other agents read `AGENTS.md`; the skills are in `.claude/skills/`. The files are in German, which coding agents read without trouble. Licence CC BY 4.0, attribution “Prof. Dr. Reinhard König in collaboration with Claude by Anthropic”.
