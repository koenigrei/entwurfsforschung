"""Baut die Dokumentation des KREMLAS-Projekts nach kremlas/doku/ (index.html, img/).
Gestaltung wie Konzeptsammlung (Selbstlernraum) und KI Lernlabor (Gartenatelier): Seitenvorlage Tutorials/_werkzeuge/mockup/page.html
aus Planungsgrundlagen im Modus „apps“; Kapitel mit "bericht": True als breite Lesespalte, der Rundgang im Tutorial-Format.
Quellen: kremlas/doku_quelle/doku.md (Text), ergebnisse.jsonl (Messwerte), bilder/ (Abbildungen und Bildschirmfotos aus doku_bilder.py).
Aufruf (im Repo entwurfsforschung):  python kremlas/werkzeuge/doku_bauen.py
Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 24.11.2026 · CC BY 4.0
"""
import json, os, re, shutil, statistics, sys
from PIL import Image

HIER = os.path.dirname(os.path.abspath(__file__)); K = os.path.dirname(HIER); REPO = os.path.dirname(K)
QUELLE = os.path.join(K, "doku_quelle"); OUT = os.path.join(K, "doku")
Q = json.load(open(os.path.join(REPO, "projekte.json"), encoding="utf-8"))["quelle_basis"]
MOCKUP = os.path.join(Q, "Tutorials", "_werkzeuge", "mockup")
sys.path.insert(0, os.path.join(Q, "Konzeptsammlung", "_werkzeuge"))
from bericht import zerlege  # noqa: E402  (Markdown → Blöcke, wie in der Konzeptsammlung)

if os.path.exists(OUT):
    shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, "img"))

# ------------------------------------------------------------------ Messwerte → Tabellen und Abbildungen
E = {e["f"]: e for e in (json.loads(l) for l in open(os.path.join(QUELLE, "ergebnisse.jsonl"), encoding="utf-8") if l.strip())}
REIHE = ["pal_malcontenta", "pal_saraceno", "pal_ragona", "pal_zeno", "pal_badoer", "pal_emo", "pal_pisani", "pal_angarano",
         "sz_ab_eg", "sz_ab_og", "sz_bb_eg", "sz_bb_og", "sz_dn_eg", "sz_dn_og", "sz_t2_eg", "sz_t2_og", "sz_t4_eg", "sz_t4_og", "sz_t5_eg", "sz_t5_og"]
pz = lambda v: f"{round(v * 100)} %"


def tabelle(praefix):
    z = ["| Vorbild | Rekonstruktion: beste | Mittel | Reihen | Variante: beste | Mittel | Reihen |", "|---|---|---|---|---|---|---|"]
    for f in REIHE:
        if not f.startswith(praefix):
            continue
        e, zeile = E[f], [E[f]["titel"]]
        for m in ("1", "0"):
            R, b = e["modi"][m]["reihen"], e["modi"][m]["bester"]
            zeile += [pz(b["aehnlichkeit"]) if b else "–", pz(statistics.mean(r["best"] for r in R)), f"{sum(1 for r in R if r['treffer'])}/4"]
        z.append("| " + " | ".join(zeile) + " |")
    return "\n".join(z)


def bilder(praefix):
    out = []
    for f in REIHE:
        if f.startswith(praefix):
            e = E[f]; r = e["modi"]["1"]["bester"]; v = e["modi"]["0"]["bester"]
            cap = (f"{e['titel']}: links das Vorbild, Mitte die Rekonstruktion ({pz(r['aehnlichkeit']) if r else 'kein gültiger Plan'}), "
                   f"rechts die freie Variante ({pz(v['aehnlichkeit']) if v else 'kein gültiger Plan'}). Grün: Räume mit mindestens 90 % Überdeckung.")
            out.append(f"@@FIG fig_{f}|{cap}")
    return "\n\n".join(out)


text = open(os.path.join(QUELLE, "doku.md"), encoding="utf-8").read()
for a, b in (("{{TAB_PALLADIO}}", tabelle("pal_")), ("{{TAB_SIZA}}", tabelle("sz_")), ("{{BILDER_PALLADIO}}", bilder("pal_")), ("{{BILDER_SIZA}}", bilder("sz_")),
             ("{{ABB_VERFAHREN}}", "@@FIG fig_verfahren|Ablauf des Verfahrens. Schwarz umrandet die Schritte des Originals, blau die Ergänzungen der Neuumsetzung 2026.")):
    assert a in text, a
    text = text.replace(a, b)
# Balkendiagramm hinter die Siza-Tabelle
text = text.replace("## 8 Fehler und Korrekturen", "@@FIG fig_balken|Ähnlichkeit zum Vorbild für alle 20 Vorbilder, Mittel über vier Suchreihen: dunkel die Rekonstruktion, hell die freie Variante.\n\n## 8 Fehler und Korrekturen", 1)

# ------------------------------------------------------------------ Bilder
def webp(ref, maxw=1700):
    src = next(os.path.join(QUELLE, "bilder", ref + e) for e in (".png", ".webp", ".jpg") if os.path.exists(os.path.join(QUELLE, "bilder", ref + e)))
    name = f"kremlas_{ref}.webp"; dst = os.path.join(OUT, "img", name)
    if not os.path.exists(dst):
        im = Image.open(src).convert("RGB")
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=88, method=6)
    w, h = Image.open(dst).size
    return "img/" + name, w, h


ABB = [0]


def bloecke_aus(md):
    out = []
    for b in zerlege(md):
        if b["t"] == "p" and b["md"].startswith("@@FIG "):
            ref, cap = b["md"][6:].split("|", 1)
            src, w, h = webp(ref.strip()); ABB[0] += 1
            out.append({"t": "fig", "src": src, "w": w, "h": h, "nr": ABB[0], "cap": cap.strip(), "quelle": "eigene Darstellung"})
        else:
            out.append(b)
    return out


# ------------------------------------------------------------------ Kapitel aus dem Text (Bericht)
teile = re.split(r"^## ", text, flags=re.M)
vorn = re.sub(r"^# .*\n", "", teile[0])
kapitel = [("ueberblick", "Auf einen Blick", [("Auf einen Blick", vorn)])]
for t in teile[1:]:
    kopf, _, rest = t.partition("\n")
    stuecke = re.split(r"^### ", rest, flags=re.M)
    absch = []
    for s in stuecke[1:]:
        st, _, inhalt = s.partition("\n"); absch.append((st.strip(), inhalt))
    if stuecke[0].strip():
        absch = [(kopf.split(" ", 1)[1], stuecke[0])] + absch if not absch else [(absch[0][0], stuecke[0] + "\n" + absch[0][1])] + absch[1:]
    nr, titel = kopf.split(" ", 1)
    kapitel.append((f"k{nr}", titel.strip(), absch))

COVER = {"ueberblick": "fig_pal_malcontenta", "k1": "fig_verfahren", "k2": "fig_verfahren", "k3": "a_packung", "k4": "a_loesungen", "k5": "a_palladio",
         "k6": "fig_pal_pisani", "k7": "fig_sz_ab_eg", "k8": "fig_sz_ab_og", "k9": "fig_balken", "k10": "a_loesungen", "k11": "fig_verfahren"}
ZIEL = {"ueberblick": "Kernaussagen der Dokumentation.", "k1": "Elezkurtaj und Franck, das DFG-Projekt KREMLAS und das Originalprogramm.",
        "k2": "Räume als Rechtecke, hybride Evolutionsstrategie, Federn.", "k3": "Treue Neuumsetzung, zwei Programmfehler, Grundriss-Generator.",
        "k4": "Mindestmaße, Bewertung des Plans, Suche, L-Räume.", "k5": "Vom Vorbild zum Raumprogramm, neue Bausteine, Ähnlichkeit, Abstimmung.",
        "k6": "Acht Villen mit Messwerten und Vergleichsbildern.", "k7": "Sechs Häuser, Erd- und Obergeschoss, mit Messwerten und Vergleichsbildern.",
        "k8": "Was am meisten gebracht hat: gefundene Fehler.", "k9": "Formgene, Inseln, Recherche und getestete Vorschläge.",
        "k10": "100 reale Wohnungen, Umriss und Funktionsmaß, Genpool, Formgrammatik, andere Bauaufgaben, verschachtelte Packung.", "k11": "Literatur, Code und Daten."}


def bericht_kapitel(kid, titel, absch):
    units = []
    for j, (st, inhalt) in enumerate(absch):
        units.append({"slide": j + 1, "title": st, "short": st.rstrip("?"), "subtitle": "", "notes": "", "orient": [], "orientLabel": "", "labels": [],
                      "images": [], "captions": [], "hints": [], "downloads": [], "actions": [], "prompts": [], "promptsFirst": False, "steps": [], "boxes": [],
                      "kontrolle": "", "fehler": [], "bloecke": bloecke_aus(inhalt)})
    return {"id": kid, "title": titel, "goal": ZIEL.get(kid, ""), "result": "", "commands": [], "cmdLabel": "Neu", "cover": webp(COVER.get(kid, "fig_verfahren"))[0],
            "units": units, "bericht": True}


# ------------------------------------------------------------------ Rundgang durch die App (Tutorial-Format wie Gartenatelier)
def schritte(items):
    out, n = [], 0
    for s in items:
        if s.startswith("· "):
            out.append({"n": None, "md": s[2:]})
        else:
            n += 1; out.append({"n": n, "md": s})
    return out


RUNDGANG = [
    {"short": "Dichte Packung", "sub": "Ein Grundriss aus sechs Räumen",
     "notes": "Die App startet mit dem Grundriss aus sechs Räumen: Flur, Wohnen, Küche, Elternschlafzimmer, Zimmer und Bad, angenommene Wohnung mit Eingang am Flur. "
              "Links die beste Lösung der aktuellen Generation als Plan mit Wänden und Türen, rechts daneben der Verlauf von Sg und f2, ganz rechts das Bedienfeld.",
     "img": [("a_packung", "Grundriss mit sechs Räumen nach 400 Generationen (Saat 2), helle Darstellung.")],
     "act": [("App öffnen", "../")],
     "steps": ["Öffne die App und drücke **Start**. Die Räume ordnen sich, ein Schritt ist eine Generation.",
               "Drücke **Pause** und ziehe einen Raum mit der Maus an eine andere Stelle. Die übrigen weichen aus.",
               "Wähle unter **Fassung** die Topologie Stern oder Gang, um das Verfahren des Originals ohne Raumprogramm zu sehen."],
     "kontrolle": "Du kannst erklären, warum die Räume in der Fassung „Einpassung“ keine Nachbarschaften bilden: Dort gibt es keine Federn."},
    {"short": "Regler", "sub": "Fassung, Mindestmaße, L-Räume, Evolutionsstrategie",
     "notes": "Das Bedienfeld folgt dem Original: Evolutionsstrategie (μ, Druck, (μ+λ), Rekombination), Kollisionserkennung (Kräfte und Raten für Abstoßen und Proportion) und Topologie "
              "(Federdämpfung, Durchgangsbreite, Federrunden). Neu sind unter **Fassung** die Nachbarschaften im Grundriss, der Schalter **Mindestmaße** und der Kasten **L-förmige Räume**.",
     "img": [("a_regler", "Bedienfeld mit Fassung, Mindestmaßen, L-förmigen Räumen und den Reglern der Evolutionsstrategie.")],
     "steps": ["Schalte **Mindestmaße** aus: Es gilt der Stand des Buchs mit 100 % Belegung, und die Räume dürfen schmal werden.",
               "Erhöhe die **Federrunden** von 2 auf 10 und beobachte, wie viel schneller sich die Nachbarn finden.",
               "· Regler mit ↺ setzen den Lauf zurück, die übrigen wirken ab der nächsten Generation."],
     "kontrolle": "Du weißt, welche Regler aus dem Original stammen und welche neu sind."},
    {"short": "Lösungen suchen", "sub": "Grundrisse mit Türen und Mindestmaßen",
     "notes": "Unter der Grafik sucht **Grundrisse suchen** die eingestellte Zahl gültiger Grundrisse: alle Türen, keine Überlappung, Mindestbreiten und Flächen. "
              "Die Suche startet viele kurze Läufe mit neuen Saaten, bessert Beinahe-Lösungen nach und wählt möglichst verschiedene Treffer. Ein Klick auf eine Karte lädt den Grundriss in die Ansicht.",
     "img": [("a_loesungen", "Drei gefundene Grundrisse als Karten, mit Saat, Generation und Türen.")],
     "steps": ["Stelle die **Anzahl** ein und drücke **Grundrisse suchen**.",
               "Klicke eine Karte an. Der Grundriss erscheint oben und lässt sich weiterrechnen oder mit der Maus bearbeiten.",
               "Wähle den Grundriss mit 8 oder 10 Räumen und vergleiche die Suchzeiten."],
     "kontrolle": "Du hast drei verschiedene gültige Grundrisse gefunden und einen davon weiterbearbeitet."},
    {"short": "L-förmige Räume", "sub": "Ein Raum aus zwei Rechtecken",
     "notes": "Im Kasten **L-förmige Räume** wählst du, welche Räume L-förmig werden dürfen. Ausgegraut sind Räume, deren Fläche für zwei Schenkel mit Mindestbreite nicht reicht. "
              "Ein L besteht aus Hauptteil und Schenkel, die bündig an einer Ecke liegen müssen.",
     "img": [("a_lwahl", "Kasten L-förmige Räume: Flur und Wohnen dürfen L-förmig werden."),
             ("a_lform", "Gefundener Grundriss mit L-förmigem Flur und Wohnen.")],
     "steps": ["Kreuze **Flur** und **Wohnen** an.", "Suche drei Grundrisse und lade einen davon.", "· L-Räume machen die Suche mit acht Räumen deutlich langsamer."],
     "kontrolle": "Du siehst im Plan, dass zwischen Hauptteil und Schenkel keine Wand steht."},
    {"short": "Palladio-Villen", "sub": "Rekonstruieren und Varianten",
     "notes": "Im Tab **Palladio-Villen** wählst du eine der acht Villen. Die Einstellungen sind je Villa abgestimmt. Mit **Nähe zum Vorbild** 1 rekonstruiert KREMLAS die Villa, mit 0 entstehen freie Varianten. "
              "Unter dem erzeugten Grundriss steht das Vorbild im gleichen Maßstab, so gespiegelt, wie es am besten passt, mit der Ähnlichkeit in der Bildunterschrift.",
     "img": [("a_palladio", "Villa Emo nach 400 Generationen, darunter das Vorbild im gleichen Maßstab."),
             ("a_palladio_varianten", "Drei freie Varianten der Villa Emo (Nähe zum Vorbild 0) mit ihrer Ähnlichkeit.")],
     "act": [("Palladio-Villen öffnen", "../palladio/")],
     "steps": ["Wähle unter **Villa (Vorbild)** die Villa Pisani und suche einen Grundriss.",
               "Schalte **Starre Raumform** aus und suche erneut. Was passiert mit dem I-förmigen Saal?",
               "Stelle **Nähe zum Vorbild** auf 0 und suche Varianten."],
     "kontrolle": "Du kannst erklären, warum die Varianten bei Palladio dem Vorbild trotzdem stark ähneln: Das symmetrische Raster lässt nur wenige Anordnungen zu."},
    {"short": "Siza/Duarte", "sub": "Haus aus Erd- und Obergeschoss",
     "notes": "Im Tab **Siza/Duarte** wählst du eines von sechs Häusern. Erd- und Obergeschoss entstehen zusammen und stehen nebeneinander: "
              "Die Treppe liegt in beiden Geschossen an derselben Stelle, der Luftraum im Obergeschoss genau über dem Hof. "
              "Die Treppe ist mit Stufen und Lauflinie gezeichnet, Punkt am Antritt, Pfeil am Austritt; davor muss ein Podest frei bleiben.",
     "img": [("a_siza", "Typ Bb nach 300 Generationen: links das Erdgeschoss, rechts das Obergeschoss mit derselben Treppe und dem Luftraum über dem Hof.")],
     "act": [("Siza/Duarte öffnen", "../siza/")],
     "steps": ["Wähle **Typ Bb (Hof hinten)**, starte die Evolution und beobachte, wie das Obergeschoss Treppe und Hof aus dem Erdgeschoss übernimmt.",
               "Suche Häuser. Die Statuszeile zeigt, ob gerade das Erdgeschoss oder ein Obergeschoss gesucht wird.",
               "Schau dir in der Kennzahl **Treppe: Antritt · Austritt** an, ob die Podeste frei sind."],
     "kontrolle": "Du kannst erklären, warum ein Haus aus zwei Geschossen schwerer zu finden ist als jedes Geschoss für sich."},
]
rundgang = {"id": "rundgang", "title": "Rundgang durch die App", "goal": "Die drei Tabs der App bedienen: Dichte Packung, Palladio-Villen, Siza/Duarte.", "result": "",
            "commands": [], "cmdLabel": "Neu", "cover": webp("a_palladio")[0], "bericht": False, "units": []}
for k, u in enumerate(RUNDGANG):
    imgs, caps = [], []
    for ref, cap in u["img"]:
        src, w, h = webp(ref); imgs.append({"src": src, "w": w, "h": h, "strip": False}); caps.append(cap)
    rundgang["units"].append({"slide": k + 1, "title": u["short"], "short": u["short"], "subtitle": u["sub"], "notes": u["notes"], "orient": [], "orientLabel": "",
                              "labels": [], "images": imgs, "captions": caps, "hints": [], "downloads": [], "actions": [{"label": l, "href": h} for l, h in u.get("act", [])],
                              "prompts": [], "promptsFirst": False, "steps": schritte(u["steps"]), "boxes": [], "kontrolle": u.get("kontrolle", ""), "fehler": [], "bloecke": []})

topics = [bericht_kapitel(*k) for k in kapitel]
topics.insert(5, rundgang)                                              # nach Kapitel 4 (Grundrisse, die funktionieren)
prog = {"id": "kremlas", "name": "KREMLAS · Dichte Packung", "kind": "Dokumentation",
        "lead": "Woher das evolutionäre Verfahren kommt, wie wir es als Web-App weiterentwickelt haben, wie es Palladios Villen und Sizas Häuser nachgeneriert, "
                "und welche Verbesserungen wir getestet haben, mit allen Messwerten und Vergleichsbildern.",
        "autor": "Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic", "app": True, "open": "../",
        "covers": [webp("fig_pal_malcontenta")[0], webp("a_palladio")[0]], "topics": topics, "bericht": False}
data = {"mode": "apps", "programs": [], "soon": [], "apps": [prog], "tutorialsUrl": None, "card": {"lines": 5, "topics": 6},
        "labels": {"open": "App öffnen", "bereich": "Kapitel"},
        "hero": {"label": "KREMLAS · Dokumentation", "h1": "Grundrisse durch <em>dichte Packung</em>.",
                 "p": "Dokumentation des KREMLAS-Projekts im KI Lab von entwurfsforschung.de: Herkunft, Neuumsetzung, Nachgenerieren von Palladio und Siza/Duarte, Versuche zur Verbesserung.",
                 "progLabel": "Dokumentation", "zaehl": ["Dokumentation", "Dokumentationen"], "soon": ["Dokumentation", "Weitere"]}}

# ------------------------------------------------------------------ Seite aus der Vorlage
vorlage = open(os.path.join(MOCKUP, "page.html"), encoding="utf-8").read()
logo = open(os.path.join(MOCKUP, "logo.svg"), encoding="utf-8").read()
uni = open(os.path.join(MOCKUP, "uni_logo.svg"), encoding="utf-8").read().split("-->\n", 1)[1]
page = vorlage
for a_, b_ in (("/*__DATA__*/", "const DATA = " + json.dumps(data, ensure_ascii=False) + ";"), ("<!--__LOGO__-->", logo), ("<!--__UNI__-->", uni),
               ("/*__ISSUES__*/null", "null"), ('<meta name="claude:viewport-fit-sides" content="cover">\n', ""),
               ("<title>InfAU Tutorials</title>", "<title>KREMLAS · Dokumentation · Entwurfsforschung</title>"),
               ('aria-label="Tutorials Übersicht"><span', 'aria-label="KREMLAS Dokumentation"><span'),
               ('<span class="label">Tutorials</span></a>', '<span class="label">KREMLAS · Dokumentation</span></a>')):
    assert a_ in page, a_
    page = page.replace(a_, b_)
# keine Inhalte fremder Server: Schriften vom eigenen Webspace (wie bauen.lokal)
page = re.sub(r'<link[^>]+href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>\s*', "", page)
page = re.sub(r'<link[^>]+href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*>', '<link rel="stylesheet" href="../../../schrift/geist.css">', page)
assert "fonts.googleapis" not in page and "fonts.gstatic" not in page
head, rest = page.split("<header", 1)
zurueck = ('<nav class="ef-zurueck" style="position:sticky;top:0;z-index:50;background:#000;padding:8px 16px;font:500 12px/1 Geist Mono,ui-monospace,monospace;'
           'letter-spacing:.06em;text-transform:uppercase"><a href="../" style="color:#fff;text-decoration:none">← KREMLAS · App</a>'
           '<a href="../../../" style="color:#9ea0f3;text-decoration:none;margin-left:1.5em">KI Lab</a>'
           '<a href="../../../lab/methode/kremlas/" style="color:#9ea0f3;text-decoration:none;margin-left:1.5em">Methode · Method</a></nav>')
html = ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="Dokumentation des KREMLAS-Projekts: Herkunft, Neuumsetzung als Web-App, Nachgenerieren der Palladio-Villen und der Siza-Häuser, Versuche zur Verbesserung.">\n'
        + head + "</head>\n<body>\n" + zurueck + "\n<header" + rest + "\n</body>\n</html>\n")
# Zeitstempel wie auf den App-Seiten (bauen.py fuss_stempel, 25.11.2026): Stand der Dokumentation = jüngste Textquelle, Stand der App = modell.js/app.js
import datetime  # noqa: E402
_tag = lambda fs: datetime.date.fromtimestamp(max(os.path.getmtime(f) for f in fs if os.path.exists(f))).strftime("%d.%m.%Y")
stand_doku = _tag([os.path.join(QUELLE, "doku.md"), os.path.join(QUELLE, "ergebnisse.jsonl")]); stand_app = _tag([os.path.join(K, "modell.js"), os.path.join(K, "app.js")])
html = html.replace('"kind": "Dokumentation"', '"kind": "Dokumentation", "standDoku": "%s", "standApp": "%s"' % (stand_doku, stand_app), 1) if '"standDoku"' not in html else html
html = re.sub(r'(<footer class="site-foot"><div class="wrap"><span>Autor: [^<]*</span>)', lambda m: m.group(1) + f'<span class="ef-stand">Stand Dokumentation {stand_doku} · Stand App {stand_app}</span>', html, count=1)
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
mb = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT) for f in fs) / 1e6
print("Kapitel", [(t["id"], len(t["units"])) for t in topics], "Abbildungen", ABB[0], "MB", round(mb, 1))
