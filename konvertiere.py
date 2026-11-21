"""Übernimmt die alten Inhalte (WordPress-Beiträge und -Seiten, statische Seiten unter /alt/) in die neue Struktur.

Aufruf: python konvertiere.py   → archiv_inhalte/<id>.json (Text als bereinigtes HTML, Metadaten), archiv_medien/<id>/ (Bilder, Downloads)
                                  und archiv_offen.json (Links auf alte Seiten, die vorerst stehen bleiben)
Quellen: alt_inhalte/posts.json, alt_inhalte/pages.json (WordPress-REST, 21.11.2026), statische Seiten werden geladen und zwischengespeichert.
Bereinigung: nur einfache Auszeichnung (Absätze, Überschriften, Listen, Links, Bilder, Hervorhebung), keine Stile; Divi-Shortcodes und
Office-Reste entfernt; eingebettete Videos/Player werden zu Links (keine Inhalte fremder Server beim Seitenaufruf); Flash (.swf) und
Java-Applets werden nicht eingebettet, die Seite bekommt einen Hinweis.

archiv.json:
- unterseiten: {sid: [adresse, titel] oder [adresse, titel, eltern-sid]}; adresse relativ zu "unterseiten_basis" (Voreinstellung: Ordner der
  Quelle), darf in tiefere oder andere Ordner zeigen oder absolut sein. Mit eltern-sid hängt die Seite unter einer anderen Unterseite.
- links.umleiten: alte Adresse → Pfad unter archiv/ (für Seiten, die es unter anderem Namen gibt, z. B. tote Frame-Fassungen).
- links.ersetzen: alte Adresse → richtige alte Adresse (falsch verlinkte Dateien, z. B. Umlaut im Dateinamen).
- links.entfernen: Muster (regulärer Ausdruck auf den Pfad) für alte Adressen, deren Link entfällt; der Linktext bleibt als Text.
- links.offen: Muster für alte Adressen, die vorerst stehen bleiben (werden später als Web-Apps umgehängt) → archiv_offen.json.
"""
import collections, html, json, os, re, urllib.parse, urllib.request
from html.parser import HTMLParser

HIER = os.path.dirname(os.path.abspath(__file__))
ALT = os.path.join(HIER, "alt_inhalte"); AUS = os.path.join(HIER, "archiv_inhalte"); MED = os.path.join(HIER, "archiv_medien")
UA = {"User-Agent": "Mozilla/5.0 (entwurfsforschung.de Umzug)"}
ERLAUBT = {"p", "h2", "h3", "h4", "ul", "ol", "li", "a", "img", "strong", "em", "br", "blockquote", "figure", "figcaption", "sup", "sub", "hr", "pre", "code", "div"}
UMBENENNEN = {"b": "strong", "i": "em", "h1": "h2", "h5": "h4", "h6": "h4", "td": "div", "th": "div", "center": "div", "font": None, "span": None}
WEG_MIT_INHALT = {"script", "style", "noscript", "head", "title", "svg", "form", "object", "embed", "map", "applet"}
MEDIEN_ENDUNG = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".zip", ".exe", ".mp4", ".avi", ".doc")
SHORTCODE = re.compile(r"\[/?(?:et_pb_|caption|gallery|embed)[^\]]*\]")
KRUEMEL = re.compile(r"\\{1,2}\s*(?:Entwurfsforschung|Räumliche Prozesse|Zelluläre Automaten)\s*")
HINWEIS = {"flash": "Die interaktive Fassung dieser Seite (Adobe Flash) läuft in heutigen Browsern nicht mehr. Übernommen sind Text und Standbilder.",
           "java": "Das Java-Applet dieser Seite läuft in heutigen Browsern nicht mehr. Übernommen sind Text und Standbilder."}


def laden(url):
    p = urllib.parse.urlsplit(url)                                    # Leerzeichen, Umlaute, & in alten Dateinamen
    url = urllib.parse.urlunsplit((p.scheme, p.netloc, urllib.parse.quote(urllib.parse.unquote(p.path), safe="/"), p.query, p.fragment))
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def extern(src):
    """iframe-Adresse → (Link, Beschriftung)."""
    s = html.unescape(src)
    if s.startswith("//"):
        s = "https:" + s
    m = re.search(r"player\.vimeo\.com/video/(\d+)", s)
    if m:
        return f"https://vimeo.com/{m.group(1)}", "Video auf Vimeo ansehen"
    if "soundcloud.com" in s:
        return "https://soundcloud.com/", "Auf SoundCloud anhören"
    m = re.search(r"yumpu\.com/\w+/embed/view/(\w+)", s)
    if m:
        return f"https://www.yumpu.com/en/document/view/{m.group(1)}", "Dokument auf Yumpu ansehen"
    if "issuu.com" in s:
        return "https://issuu.com/", "Sammlung auf issuu (eingebettetes Regal nicht mehr verfügbar)"
    return s, "Externen Inhalt öffnen"


def sim_apps():
    """simulationen/bestand.json: alte Seite (alt_seite) → App-Ordner, sobald umgesetzt oder als Fassung aufgenommen."""
    bpfad = os.path.join(HIER, "simulationen", "bestand.json")
    if not os.path.exists(bpfad):
        return {}
    return {schluessel(p["alt_seite"]): p["app"] for p in json.load(open(bpfad, encoding="utf-8")).get("programme", [])
            if p.get("alt_seite") and p.get("app") and p.get("status") in ("umgesetzt", "aufgenommen")}


class Regeln:
    """Linkregeln aus archiv.json (links.*): umleiten, entfernen, offen. Zählt, was mit Links auf die alte Website geschieht."""
    def __init__(self, cfg=None):
        cfg = cfg or {}
        self.umleiten = {schluessel(k): v for k, v in cfg.get("umleiten", {}).items()}
        self.ersetzen = {schluessel(k): v for k, v in cfg.get("ersetzen", {}).items()}
        self.entfernen = [re.compile(m, re.I) for m in cfg.get("entfernen", [])]
        self.offen = [re.compile(m, re.I) for m in cfg.get("offen", [])]
        self.sim = sim_apps()                                          # alte Applet-Seite → fertige Web-App unter lab/simulationen/
        self.zahl = collections.Counter(); self.offene = collections.defaultdict(set); self.ort = ""

    def pruefe(self, pfad, muster):
        return any(m.search(pfad) for m in muster)


class Reiniger(HTMLParser):
    def __init__(self, basis, mid, karte, prefix="", regeln=None):
        super().__init__(convert_charrefs=True)
        self.basis, self.mid, self.karte, self.prefix = basis, mid, karte, prefix   # karte: alte Adresse → Pfad unter archiv/; prefix: von hier nach archiv/
        self.regeln = regeln or Regeln()
        self.out, self.stapel, self.weg, self.medien = [], [], 0, {}

    def medium(self, url):
        url = urllib.parse.urljoin(self.basis, html.unescape(url))
        name = re.sub(r"[^A-Za-z0-9._-]+", "_", urllib.parse.unquote(urllib.parse.urlparse(url).path.rsplit("/", 1)[-1])) or "datei"
        while name in self.medien and self.medien[name] != url:
            name = "_" + name
        self.medien[name] = url
        return f"medien/{name}"

    def ziel(self, href):
        """Linkziel → (neues Ziel oder None = Link entfällt)."""
        voll = urllib.parse.urljoin(self.basis, href)
        voll = self.regeln.ersetzen.get(schluessel(voll), voll)        # falsch verlinkte Dateien der alten Website
        p = urllib.parse.urlparse(voll)
        if "entwurfsforschung.de" not in p.netloc:
            return voll
        R = self.regeln; s = schluessel(voll); pfad = urllib.parse.unquote(p.path) + (f"?{p.query}" if p.query else "")
        if s in self.karte or s in R.umleiten:
            R.zahl["umgehängt"] += 1
            z = self.karte.get(s) or R.umleiten[s]
            return self.prefix + z + (f"#{p.fragment}" if p.fragment and "#" not in z else "")
        if R.pruefe(pfad, R.offen) and s in R.sim:
            R.zahl["Web-App"] += 1
            return self.prefix + "../lab/simulationen/" + R.sim[s] + "/"
        if R.pruefe(pfad, R.offen):
            R.zahl["offen"] += 1; R.offene[voll.split("#")[0]].add(R.ort); return voll
        if R.pruefe(pfad, R.entfernen):
            R.zahl["entfernt"] += 1; return None
        if p.path.lower().endswith(MEDIEN_ENDUNG):
            R.zahl["Medium"] += 1; return self.medium(voll)
        R.zahl["ungeklärt"] += 1
        return voll

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.weg or tag in WEG_MIT_INHALT:
            self.weg += tag in WEG_MIT_INHALT; return
        if tag == "iframe":
            if a.get("src"):
                link, text = extern(a["src"])
                self.out.append(f'<p class="extern"><a href="{html.escape(link)}" rel="noopener">{text} ↗</a></p>')
            return
        tag = UMBENENNEN.get(tag, tag)
        if tag not in ERLAUBT:
            return
        if tag == "img":
            src = a.get("src", "")
            if not src or src.lower().endswith((".wmz", ".emz")) or "invisible.gif" in src or (a.get("width", "9") in ("1", "0")):
                return
            self.out.append(f'<img src="{self.medium(src)}" alt="{html.escape(a.get("alt", "") or "")}" loading="lazy">'); return
        if tag == "a":
            href = html.unescape(a.get("href", "") or "")
            anker = a.get("name") or a.get("id")                      # Sprungmarken der alten Seiten (z. B. delphi.htm#Thuenen)
            idattr = f' id="{html.escape(anker)}"' if anker and re.fullmatch(r"[\w.:-]+", anker) else ""
            if not href or href.startswith(("mailto:", "#", "javascript:")):
                self.stapel.append("a"); self.out.append(f'<a href="{html.escape(href)}"{idattr}>' if href.startswith("mailto:") else f"<a{idattr}>"); return
            ziel = self.ziel(href)
            if ziel is None:                                          # Link entfällt, Text bleibt
                self.stapel.append("a!")
                if idattr:
                    self.out.append(f"<a{idattr}></a>")
                return
            extern_ = not ziel.startswith(("medien/", "../", "./")) and "://" in ziel
            self.stapel.append("a"); self.out.append(f'<a href="{html.escape(ziel)}"{idattr}' + (' rel="noopener"' if extern_ else "") + ">"); return
        self.stapel.append(tag)
        self.out.append(f"<{tag}>" if tag not in ("br", "hr") else f"<{tag}>")
        if tag in ("br", "hr"):
            self.stapel.pop()

    def handle_endtag(self, tag):
        if tag in WEG_MIT_INHALT and self.weg:
            self.weg -= 1; return
        if self.weg:
            return
        tag = UMBENENNEN.get(tag, tag)
        if tag in self.stapel or (tag == "a" and "a!" in self.stapel):
            while self.stapel:
                t = self.stapel.pop()
                if t != "a!":
                    self.out.append(f"</{t}>")
                if t.rstrip("!") == tag:
                    break

    def handle_data(self, d):
        if self.weg:
            return
        d = KRUEMEL.sub("", SHORTCODE.sub("", d.replace("\u201d", '"').replace("\u2033", '"')))
        if "<?xml" in d or "mso-" in d:
            return
        self.out.append(html.escape(d, quote=False))

    def ergebnis(self):
        while self.stapel:
            t = self.stapel.pop()
            if t != "a!":
                self.out.append(f"</{t}>")
        h = "".join(self.out)
        h = re.sub(r"\s*\n\s*", "\n", h)
        h = re.sub(r"\\{1,2}\s*(?:Entwurfsforschung|Räumliche\s+Prozesse|Zelluläre\s+Automaten)\b\s*", "", h)   # Brotkrumen, deren Link entfallen ist
        for _ in range(3):
            h = re.sub(r"<(p|div|strong|em|li|h[234])>\s*(?:&nbsp;|\u00a0|<br>|\s)*</\1>", "", h)
        h = re.sub(r"(?:<br>\s*){3,}", "<br><br>", h)
        return h.strip()


def reinige(roh, basis, mid, karte=None, prefix="", regeln=None):
    r = Reiniger(basis, mid, karte or {}, prefix, regeln); r.feed(roh); return r.ergebnis(), r.medien


def hinweis(roh):
    """Flash (.swf, ohne fremde Viewer wie issuu) oder Java-Applet auf der alten Seite → Hinweis oben auf der neuen Seite."""
    swf = [s for s in re.findall(r"""(?i)["'=]([^"'=\s>]*\.swf)\b""", roh) if "issuu" not in s]
    teile = ([HINWEIS["flash"]] if swf else []) + ([HINWEIS["java"]] if re.search(r"(?i)<applet\b", roh) else [])
    return "".join(f'<p class="hinweis"><em>{t}</em></p>' for t in teile)


def schluessel(url):
    p = urllib.parse.urlparse(url)
    return (p.netloc.replace("www.", "") + urllib.parse.unquote(p.path)).lower()


def text(h, n=None):
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", SHORTCODE.sub("", h)))).strip()
    if n and len(t) > n:
        t = t[:n].rsplit(" ", 1)[0] + " …"
    return t


def vorschau_aus(h, n=190):
    """Erster echter Absatz (mindestens 12 Wörter), ohne Brotkrumen, Hinweise und Kontaktzeile der alten Seite."""
    h = re.sub(r"\{1,2}\s*<a[^>]*>[^<]*</a>", "", h)
    h = re.sub(r'<p class="hinweis">.*?</p>', "", h)
    for teil in re.split(r"</p>|</div>|<br>\s*<br>", h):
        t = text(teil)
        if len(t.split()) >= 12 and not t.startswith("Kontakt"):
            return text(teil, n)
    return text(h, n)


def statisch(url):
    pfad = os.path.join(ALT, "cache", *urllib.parse.unquote(urllib.parse.urlparse(url).path).strip("/").split("/"))
    if not os.path.exists(pfad):
        os.makedirs(os.path.dirname(pfad), exist_ok=True); open(pfad, "wb").write(laden(url))
    roh = open(pfad, "rb").read()
    m = re.search(rb"charset=[\"']?([\w-]+)", roh[:3000])
    t = roh.decode((m.group(1).decode() if m else "cp1252").replace("iso-8859-1", "cp1252"), "replace")
    b = re.search(r"(?is)<body[^>]*>(.*)</body>", t)
    return re.sub(r"(?s)<!--.*?-->", "", b.group(1) if b else t)


def medien_holen(mid, medien):
    """Lädt die Medien; gibt die Namen zurück, die fehlen (nicht ladbar oder leer)."""
    d = os.path.join(MED, mid); os.makedirs(d, exist_ok=True); fehlt = {}
    for name, url in medien.items():
        z = os.path.join(d, name)
        if os.path.exists(z) and os.path.getsize(z) > 0:
            continue
        try:
            b = laden(url)
            if not b:
                raise ValueError("leere Datei")
            open(z, "wb").write(b)
        except Exception as e:
            fehlt[name] = f"{url} ({e})"
            if os.path.exists(z):
                os.remove(z)
    return fehlt


def ohne_medien(h, namen):
    """Verweise auf fehlende Medien entfernen: Link → Text, Bild → weg."""
    for n in namen:
        q = re.escape(f"medien/{n}")
        h = re.sub(rf'<a href="(?:\.\./)?{q}"[^>]*>(.*?)</a>', r"\1", h, flags=re.S)
        h = re.sub(rf'<img src="(?:\.\./)?{q}"[^>]*>', "", h)
    return h


def unterseiten_von(e, basis_default):
    basis = e.get("unterseiten_basis", basis_default)
    for sid, wert in e.get("unterseiten", {}).items():
        rel, titel, eltern = (list(wert) + [None])[:3]
        yield sid, urllib.parse.urljoin(basis, rel), titel, eltern


def main():
    cfg = json.load(open(os.path.join(HIER, "archiv.json"), encoding="utf-8"))
    wp = {p["id"]: p for f in ("posts.json", "pages.json") for p in json.load(open(os.path.join(ALT, f), encoding="utf-8"))}
    regeln = Regeln(cfg.get("links"))
    karte = {}                                                        # alte Adresse → Pfad unter archiv/

    def eintragen(url, ziel):
        karte[schluessel(url)] = ziel
        if re.search(r"(?i)/index\.html?$", url):                     # Ordneradresse führt auf dieselbe Seite
            karte[schluessel(url.rsplit("/", 1)[0] + "/")] = ziel
    for e in cfg["eintraege"]:
        if e["typ"] == "statisch":
            eintragen(e["quelle"], f"{e['id']}/")
            ordner = e["quelle"].rsplit("/", 1)[0] + "/"
        else:
            karte[schluessel(wp[e["wp"]]["link"]).rstrip("/")] = f"{e['id']}/"
            karte[schluessel(wp[e["wp"]]["link"])] = f"{e['id']}/"
            ordner = wp[e["wp"]]["link"]
        for sid, url, _, _ in unterseiten_von(e, ordner):
            eintragen(url, f"{e['id']}/{sid}/")
    os.makedirs(AUS, exist_ok=True); bericht = []
    for e in cfg["eintraege"]:
        mid = e["id"]; medien = {}
        if e["typ"].startswith("wp"):
            p = wp[e["wp"]]; ordner = p["link"]
            regeln.ort = f"{mid}/"
            inhalt, m = reinige(p["content"]["rendered"], p["link"], mid, karte, "../", regeln); medien.update(m)
            fm = (p.get("_embedded", {}).get("wp:featuredmedia") or [{}])[0].get("source_url")
            titel = e.get("titel") or {"de": html.unescape(p["title"]["rendered"]), "en": html.unescape(p["title"]["rendered"])}
            bild = None
            if fm:
                r = Reiniger(p["link"], mid, {}); bild = r.medium(fm); medien.update(r.medien)
            elif "<img" in inhalt:
                bild = re.search(r'<img src="([^"]+)"', inhalt).group(1)
            ex = text(p.get("excerpt", {}).get("rendered", "")) or text(inhalt)
            daten = {"datum": p["date"][:10], "jahr": int(p["date"][:4]), "autoren": "R. König", "vorschau": text(ex, 190), "quelle": p["link"]}
        else:
            ordner = e["quelle"].rsplit("/", 1)[0] + "/"
            regeln.ort = f"{mid}/"
            roh = statisch(e["quelle"])
            inhalt, m = reinige(roh, e["quelle"], mid, karte, "../", regeln); medien.update(m)
            inhalt = hinweis(roh) + inhalt
            titel = e["titel"]
            bild = None
            if e.get("bild"):
                r = Reiniger(e["quelle"], mid, {}); bild = r.medium(e["bild"]); medien.update(r.medien)
            daten = {"datum": e["datum"], "jahr": e["jahr"], "autoren": e["autoren"], "vorschau": vorschau_aus(inhalt), "quelle": e["quelle"]}
        unter = []
        for sid, url, t, eltern in unterseiten_von(e, ordner):
            regeln.ort = f"{mid}/{sid}/"
            roh = statisch(url)
            ui, um = reinige(roh, url, mid, karte, "../../", regeln)
            ui = hinweis(roh) + ui.replace('src="medien/', 'src="../medien/').replace('href="medien/', 'href="../medien/')
            medien.update(um); unter.append({"id": sid, "titel": t, "eltern": eltern, "inhalt": ui, "quelle": url})
        if not e["typ"].startswith("wp") and not bild:              # kein Bild auf der Startseite: erstes Bild der Unterseiten
            m1 = next((re.search(r'<img src="\.\./(medien/[^"]+)"', u["inhalt"]) for u in unter if '<img src="../medien/' in u["inhalt"]), None)
            bild = m1.group(1) if m1 else None
        if e.get("vorschau"):
            daten["vorschau"] = e["vorschau"]
        fehlt = medien_holen(mid, medien)
        if fehlt:
            inhalt = ohne_medien(inhalt, fehlt)
            for u in unter:
                u["inhalt"] = ohne_medien(u["inhalt"], fehlt)
            if bild and bild.split("/")[-1] in fehlt:
                bild = None
        json.dump({"id": mid, "titel": titel, "kategorie": e["kategorie"], "bild": bild, "inhalt": inhalt, **daten, "unterseiten": unter},
                  open(os.path.join(AUS, mid + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        bericht.append(f"{mid}: {len(text(inhalt).split())} Wörter, {len(medien) - len(fehlt)} Medien, {len(unter)} Unterseiten"
                       + (f", FEHLT {len(fehlt)}: {list(fehlt.values())[:3]}" if fehlt else ""))
    offen_schreiben(regeln)
    print("\n".join(bericht))
    print("Links auf die alte Website: " + ", ".join(f"{k} {v}" for k, v in sorted(regeln.zahl.items())))


def offen_schreiben(regeln):
    """archiv_offen.json: Links auf alte NetLogo-/VBA-Seiten, die stehen bleiben, bis die Web-Apps unter lab/simulationen/ fertig sind.
    Zuordnung zur App aus simulationen/bestand.json (nur gelesen)."""
    bestand = {}
    bpfad = os.path.join(HIER, "simulationen", "bestand.json")
    if os.path.exists(bpfad):
        for p in json.load(open(bpfad, encoding="utf-8")).get("programme", []):
            bestand.setdefault(schluessel(p.get("alt_seite") or ""), []).append(p)
    links = []
    for url in sorted(regeln.offene):
        progs = bestand.get(schluessel(url), [])
        links.append({"alt": url,
                      "app": progs[0]["id"] if progs else None,
                      "app_ordner": progs[0].get("app") if progs else None,
                      "status": progs[0].get("status") if progs else None,
                      "neu": f"lab/simulationen/{progs[0]['id']}/" if progs else None,
                      "verlinkt_von": sorted(f"archiv/{o}" for o in regeln.offene[url])})
    json.dump({"stand": "2026-11-21",
               "beschreibung": "Links der Archivseiten, die noch auf die alte Website zeigen (NetLogo-Applets, AutoCAD-VBA-Experimente). Sie werden als Web-Apps unter lab/simulationen/ neu umgesetzt und danach umgehängt (archiv.json → links.umleiten oder Karte in konvertiere.py). Wird von konvertiere.py geschrieben; pruefe.py lässt nur diese alten Adressen zu.",
               "links": links}, open(os.path.join(HIER, "archiv_offen.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
