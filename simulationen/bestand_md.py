"""Schreibt simulationen/BESTAND.md (kurze Tabelle) aus simulationen/bestand.json (Aufruf: python simulationen/bestand_md.py).
Nach jeder Änderung an bestand.json ausführen; BESTAND.md nie von Hand bearbeiten."""
import collections, json, os

HIER = os.path.dirname(os.path.abspath(__file__))
B = json.load(open(os.path.join(HIER, "bestand.json"), encoding="utf-8"))
P, G = B["programme"], {g["id"]: g["titel"]["de"] for g in B["gruppen"]}
z = ["# Bestand · Frühe Simulationen", "",
     f"Stand {B['stand']} · erzeugt aus `bestand.json` mit `python simulationen/bestand_md.py` – nicht von Hand bearbeiten.", "",
     f"**{len(P)} Programme**: " + ", ".join(f"{n} {h}" for h, n in collections.Counter(p["herkunft"] for p in P).items()) + ". "
     + "Status: " + ", ".join(f"{n} {s}" for s, n in collections.Counter(p["status"] for p in P).most_common()) + ".", "",
     "Wellen (Vorschlag für die Reihenfolge): " + " · ".join(f"**{k}** {v}" for k, v in B["wellen"].items()) + ".", ""]
for gid, gname in G.items():
    L = [p for p in P if p["gruppe"] == gid]
    if not L:
        continue
    z += [f"## {gname}", "", "| Nr. | id | Titel | Herkunft | Jahr | Quelle | Umfang | Welle | Status | Kurzbeschreibung |", "|---|---|---|---|---|---|---|---|---|---|"]
    for p in L:
        quelle = f"`{os.path.basename(p['quellpfad'])}`" if p["quellcode"] else "–"
        status = p["status"] + (f" → `{p['app']}`" if p.get("app") and p["app"] != p["id"] else "")
        z.append(f"| {p['reihenfolge']} | `{p['id']}` | {p['titel']} | {p['herkunft']} | {p['jahr'] or '–'} | {quelle} | {p['umfang']} | {p['welle']} | {status} | {p['beschreibung']} |")
    z.append("")
open(os.path.join(HIER, "BESTAND.md"), "w", encoding="utf-8").write("\n".join(z))
print("BESTAND.md:", len(P), "Programme")
