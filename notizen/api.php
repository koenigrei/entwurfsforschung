<?php
// Notizen der Apps im KI Lab (Kommentare, Achsen, später Skizzen) – Speicher auf dem Server, nur mit Schlüssel.
// Wunsch Reinhard 27.11.2026: Kommentare und Achsen der Konzeptstudie Zweispänner auf entwurfsforschung.de speichern,
// nur er schreibt, Besucher sehen nichts. Claude liest und beantwortet sie (Werkzeug notizen.py in Planungsgrundlagen).
//
// Liegt online unter lab/notizen/api.php. Daten außerhalb des Web im Home des Kontos: ~/ki_notizen/ (0700, Dateien 0600)
//   schluessel.txt         SHA-256 (hex) des Schlüssels, eine Zeile; ohne diese Datei ist alles gesperrt
//   <projekt>.json         {"notes": [...], "axes": [...], "stand": "..."} je Projekt
// So fassen bauen.py und deploy.py die Daten nie an.
//
// GET  api.php?projekt=<id>                 → ganzer Stand des Projekts
// POST api.php?projekt=<id>  JSON {"aktion": "add"|"update"|"delete"|"import", "sammlung": "notes"|"axes",
//                                  "id": "...", "daten": {...}, "eintraege": [...]}   → ganzer neuer Stand
// Schlüssel immer im Kopf X-Notizen-Schluessel. Falscher oder fehlender Schlüssel: 403, sonst nichts.
//
// Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 27.11.2026 · CC BY 4.0
// Bewusst ohne neuere Sprachmittel, damit es ab PHP 7.4 läuft.

const SAMMLUNGEN = ['notes', 'axes'];          // später 'skizzen'
const MAX_KOERPER = 65536;                     // Bytes je Anfrage
const MAX_EINTRAEGE = 2000;                    // je Sammlung
const MAX_FELDER = 30;
const MAX_TEXT = 4000;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');

function antwort($code, $daten) {
    http_response_code($code);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Home des Kontobenutzers (PHP läuft unter CloudLinux als dieser Benutzer), nicht getenv('HOME') – unter CGI unsicher
// (Hinweis ce 27.11.2026). NOTIZEN_ORDNER nur für test_api.php (php -S im Temp-Ordner), auf dem Server nicht gesetzt.
function datenordner() {
    $test = getenv('NOTIZEN_ORDNER');
    if ($test) return $test;
    if (!function_exists('posix_getpwuid')) antwort(500, ['fehler' => 'posix fehlt']);
    $pw = posix_getpwuid(posix_geteuid());
    if (!$pw || empty($pw['dir'])) antwort(500, ['fehler' => 'home']);
    return $pw['dir'] . DIRECTORY_SEPARATOR . 'ki_notizen';
}

function schluessel_ok($ordner) {
    $datei = $ordner . DIRECTORY_SEPARATOR . 'schluessel.txt';
    $gegeben = isset($_SERVER['HTTP_X_NOTIZEN_SCHLUESSEL']) ? (string)$_SERVER['HTTP_X_NOTIZEN_SCHLUESSEL'] : '';
    if (!is_file($datei) || $gegeben === '' || strlen($gegeben) > 200) return false;
    $soll = strtolower(trim((string)file_get_contents($datei)));
    if (!preg_match('/^[0-9a-f]{64}$/', $soll)) return false;
    return hash_equals($soll, hash('sha256', $gegeben));
}

// Ein Eintrag: flaches Objekt aus Zahlen, kurzen Texten, Wahrheitswerten (Kommentar: n, text, x, y, status, reply, variant, created;
// Achse: label, x1, y1, x2, y2, variant, created). Mehr wird nicht gebraucht, alles andere wird abgewiesen.
function eintrag_pruefen($e) {
    if (!is_array($e) || count($e) > MAX_FELDER) return null;
    $aus = [];
    foreach ($e as $k => $v) {
        if (!is_string($k) || !preg_match('/^[A-Za-z][A-Za-z0-9_]{0,31}$/', $k)) return null;
        if (is_string($v)) { if (!preg_match('//u', $v) || (function_exists('mb_strlen') ? mb_strlen($v, 'UTF-8') : strlen($v)) > MAX_TEXT) return null; }
        elseif (is_int($v) || is_float($v)) { if (!is_finite((float)$v)) return null; }
        elseif (!is_bool($v) && $v !== null) return null;
        $aus[$k] = $v;
    }
    return $aus;
}

function neue_id() { return bin2hex(random_bytes(8)); }

function id_ok($id) { return is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $id); }

// ------------------------------------------------------------------ Anfrage
$projekt = isset($_GET['projekt']) ? (string)$_GET['projekt'] : '';
if (!preg_match('/^[a-z0-9]{1,40}$/', $projekt)) antwort(400, ['fehler' => 'projekt']);
$ordner = datenordner();
if (!schluessel_ok($ordner)) { usleep(300000); antwort(403, ['fehler' => 'schluessel']); }

$datei = $ordner . DIRECTORY_SEPARATOR . $projekt . '.json';
$methode = $_SERVER['REQUEST_METHOD'];
if ($methode !== 'GET' && $methode !== 'POST') antwort(405, ['fehler' => 'methode']);

$neu_angelegt = !is_file($datei);
$h = fopen($datei, 'c+');
if ($h === false) antwort(500, ['fehler' => 'speicher']);
if ($neu_angelegt) @chmod($datei, 0600);
flock($h, $methode === 'GET' ? LOCK_SH : LOCK_EX);
$roh = stream_get_contents($h);
$stand = $roh ? json_decode($roh, true) : null;
if (!is_array($stand)) $stand = [];
foreach (SAMMLUNGEN as $s) if (!isset($stand[$s]) || !is_array($stand[$s])) $stand[$s] = [];

if ($methode === 'GET') {
    flock($h, LOCK_UN); fclose($h);
    if (isset($_GET['diagnose'])) $stand['diagnose'] = ['php' => PHP_VERSION, 'open_basedir' => (string)ini_get('open_basedir'),
        'ordner_beschreibbar' => is_writable($ordner)];        // nur mit Schlüssel sichtbar (erste Probe nach dem Upload)
    antwort(200, $stand);
}

$koerper = file_get_contents('php://input', false, null, 0, MAX_KOERPER + 1);
if ($koerper === false || strlen($koerper) > MAX_KOERPER) antwort(413, ['fehler' => 'zu gross']);
$a = json_decode($koerper, true);
if (!is_array($a)) antwort(400, ['fehler' => 'json']);
$aktion = isset($a['aktion']) ? $a['aktion'] : '';
$sammlung = isset($a['sammlung']) ? $a['sammlung'] : '';
if (!in_array($sammlung, SAMMLUNGEN, true)) antwort(400, ['fehler' => 'sammlung']);
$liste = $stand[$sammlung];

if ($aktion === 'add' || $aktion === 'import') {
    $neu = $aktion === 'add' ? [isset($a['daten']) ? $a['daten'] : null] : (isset($a['eintraege']) && is_array($a['eintraege']) ? $a['eintraege'] : []);
    $ids = array_column($liste, 'id');
    foreach ($neu as $roh_e) {
        $e = eintrag_pruefen($roh_e);
        if ($e === null) antwort(400, ['fehler' => 'eintrag']);
        if ($aktion === 'import' && isset($e['id']) && id_ok($e['id'])) {
            if (in_array($e['id'], $ids, true)) continue;            // schon vorhanden: nicht doppelt
        } else {
            $e['id'] = neue_id();
        }
        $liste[] = $e; $ids[] = $e['id'];
    }
    if (count($liste) > MAX_EINTRAEGE) antwort(413, ['fehler' => 'zu viele']);
} elseif ($aktion === 'update' || $aktion === 'delete') {
    $id = isset($a['id']) ? $a['id'] : '';
    if (!id_ok($id)) antwort(400, ['fehler' => 'id']);
    $gefunden = false;
    foreach ($liste as $i => $e) {
        if (isset($e['id']) && $e['id'] === $id) {
            $gefunden = true;
            if ($aktion === 'delete') { array_splice($liste, $i, 1); break; }
            $p = eintrag_pruefen(isset($a['daten']) ? $a['daten'] : null);
            if ($p === null) antwort(400, ['fehler' => 'eintrag']);
            unset($p['id']);
            $neu = array_merge($e, $p);
            if (count($neu) > MAX_FELDER) antwort(400, ['fehler' => 'eintrag']);
            $liste[$i] = $neu;
            break;
        }
    }
    if (!$gefunden) antwort(404, ['fehler' => 'nicht gefunden']);
} else {
    antwort(400, ['fehler' => 'aktion']);
}

$stand[$sammlung] = array_values($liste);
$stand['stand'] = gmdate('c');
$text = json_encode($stand, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
// Sicherung des vorigen Stands, dann in derselben gesperrten Datei überschreiben
if ($roh) { @file_put_contents($datei . '.vorher', $roh); @chmod($datei . '.vorher', 0600); }
ftruncate($h, 0); rewind($h); fwrite($h, $text); fflush($h);
flock($h, LOCK_UN); fclose($h);
antwort(200, $stand);
