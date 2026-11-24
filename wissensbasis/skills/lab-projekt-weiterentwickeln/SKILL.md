---
name: lab-projekt-weiterentwickeln
description: Verwenden, wenn an einer App oder einem Projekt des KI Lab (entwurfsforschung.de/lab) aus dessen Quellcode-Paket weitergearbeitet wird – Regeln ändern, Generator oder Prüfer erweitern, das Verfahren auf ein anderes Baufeld, einen anderen Ort oder ein anderes Vorbild übertragen.
---

# An einem Projekt des KI Lab weiterarbeiten

**Erst lesen:** `PROJEKTE.md` (Link zum Paket), die `METHODE.md` des Projekts (`methoden/projekte/<id>/METHODE.md`), im entpackten Paket `README.md`, `AGENTS.md` und, falls vorhanden, `QUELLE.md`.

## Ablauf

1. **Paket holen:** Quellcode-Paket laden (Link in `PROJEKTE.md` oder auf der App-Seite unter „Quellcode · Weiterentwickeln“) und in einen eigenen Unterordner entpacken, z. B. `vorbilder/<id>/`. Nichts aus dem Paket ungelesen ausführen.
2. **Verstehen, ohne zu ändern:** Aufbau, Darstellung, Generator und Prüfer in eigenen Worten zusammenfassen; die Tests laufen lassen (`node --test`, `python -m pytest` oder was README bzw. AGENTS.md nennen) und das Ergebnis festhalten. Rote Tests vorher melden.
3. **Plan mit dem Menschen:** Was ändert sich, was muss gleich bleiben (geprüfte Regeln, Saat, Variantencodes)? Entscheidungen mit Datum in `STAND.md`.
4. **Ändern mit Test:** Jede neue Regel und jeder Wunsch wird zuerst ein Test bzw. eine Prüfung. Zufall nur über die Saat; Logik ohne DOM, damit sie in Node testbar bleibt.
5. **Ansehen:** App im Browser öffnen (dunkel und hell, breit und schmal), Bildschirmfotos ansehen; Generatoren mit vielen Saaten prüfen, nicht mit einer.
6. **Herkunft und Lizenz:** Im neuen Projekt nennen, woher Code und Regeln stammen (Projekt, Link, CC BY 4.0, Namensnennung). Lizenzen der Originale in `QUELLE.md` bzw. `LICENSE.md` beachten.
7. **Zurückführen:** `METHODE.md` nachziehen (Skill `methode-dokumentieren`): was trägt, Stolperfallen, Zahlen mit Datum.

## Regeln

- Apps, die im KI Lab laufen sollen, laden nichts von fremden Servern (keine CDNs, Webfonts, iframes); Bibliotheken liegen lokal.
- Keine Zugangsdaten in Dateien: API-Schlüssel aus Umgebungsvariablen oder als Eingabe im Browser, nie im Code.
- Fremde Pläne und Daten mit unklarer Lizenz bleiben lokal (`.gitignore`).
- Prüfer nicht aufweichen, damit ein Ergebnis durchkommt: erst den Generator verbessern; Schwellen nur mit Begründung und Datum ändern.
