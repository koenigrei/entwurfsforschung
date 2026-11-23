"""Legt eine neue App des Parametric Planning Catalogue aus der Vorlage an (Aufruf: python katalog/neue_app.py <app-id>).

Kopiert katalog/_vorlage/ nach katalog/<app-id>/ und setzt Titel, Original, Autoren und Katalogeintrag aus katalog/bestand.json ein
(Eintrag mit "app": "<app-id>"). Ändert bestand.json NICHT. Bricht ab, wenn der Ordner schon existiert.
"""
import json, os, shutil, sys

HIER = os.path.dirname(os.path.abspath(__file__))


def main(aid):
    B = json.load(open(os.path.join(HIER, "bestand.json"), encoding="utf-8"))
    e = next((p for p in B["eintraege"] + B.get("lab", []) if p.get("app") == aid), None)   # Katalog oder DeCodingSpaces Lab
    if not e:
        sys.exit(f"Keine App „{aid}“ in katalog/bestand.json")
    ziel = os.path.join(HIER, aid)
    if os.path.exists(ziel):
        sys.exit(f"{ziel} existiert schon")
    shutil.copytree(os.path.join(HIER, "_vorlage"), ziel)
    werte = {"ID": aid, "TITEL_DE": e["titel_de"], "TITEL_EN": e.get("titel_en") or e["titel"], "ORIGINAL": e["titel"], "KATALOG_ID": e["id"],
             "KATALOG_URL": e["url"], "AUTOREN": ("DeCodingSpaces – " + e["autoren"]) if "eintraege" in B and e in B["eintraege"] else e["autoren"], "BESCHREIBUNG": "TODO: ein bis zwei Sätze."}
    for wurzel, _, dateien in os.walk(ziel):
        for f in dateien:
            p = os.path.join(wurzel, f)
            t = open(p, encoding="utf-8").read()
            for k, v in werte.items():
                t = t.replace("{{" + k + "}}", v.replace('"', "&quot;") if f.endswith(".html") else (v.replace('"', '\\"') if f.endswith(".json") else v))
            open(p, "w", encoding="utf-8").write(t)
    print(f"angelegt: katalog/{aid}/")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
