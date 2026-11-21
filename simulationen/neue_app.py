"""Legt eine neue App der Frühen Simulationen aus der Vorlage an (Aufruf: python simulationen/neue_app.py <id>).

Kopiert simulationen/_vorlage/ nach simulationen/<id>/ und setzt Titel, Original, Herkunft, Jahr, Archivseite und
Beschreibung aus simulationen/bestand.json ein. Ändert bestand.json NICHT (Status setzt, wer die Arbeit verteilt; siehe REZEPT.md).
Bricht ab, wenn der Ordner schon existiert.
"""
import json, os, shutil, sys

HIER = os.path.dirname(os.path.abspath(__file__))


def main(aid):
    B = json.load(open(os.path.join(HIER, "bestand.json"), encoding="utf-8"))
    e = next((p for p in B["programme"] if p["id"] == aid), None)
    if not e:
        sys.exit(f"„{aid}“ steht nicht in bestand.json")
    ziel = os.path.join(HIER, aid)
    if os.path.exists(ziel):
        sys.exit(f"{ziel} existiert schon")
    shutil.copytree(os.path.join(HIER, "_vorlage"), ziel)
    werte = {"ID": aid, "TITEL_DE": e["titel"], "TITEL_EN": e.get("titel_en") or e["titel"], "ORIGINAL": e["original"], "HERKUNFT": e["herkunft"],
             "JAHR": str(e["jahr"]) if e.get("jahr") else "undatiert", "JAHR_JSON": json.dumps(e.get("jahr")), "ARCHIV": e["archiv"],
             "KAPITEL": e["kapitel"], "ALT_SEITE": e["alt_seite"], "QUELLPFAD": e.get("quellpfad") or "–", "BESCHREIBUNG": e["beschreibung"]}
    for wurzel, _, dateien in os.walk(ziel):
        for f in dateien:
            p = os.path.join(wurzel, f)
            t = open(p, encoding="utf-8").read()
            for k, v in werte.items():
                t = t.replace("{{" + k + "}}", v.replace('"', "&quot;") if f.endswith(".html") else (v.replace('"', '\\"') if f.endswith(".json") and k != "JAHR_JSON" else v))
            open(p, "w", encoding="utf-8").write(t)
    print(f"angelegt: simulationen/{aid}/ – weiter mit REZEPT.md, Schritt 3")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
