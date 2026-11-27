<?php
// Test für api.php, auf dem Server oder überall mit PHP-Kommandozeile:
//   php notizen/test_api.php
// Baut einen Docroot im Temp-Ordner (…/docroot/lab/notizen/api.php, Daten in …/ki_notizen), startet den eingebauten
// Server (php -S) und prüft die Schnittstelle. Ändert nichts außerhalb des Temp-Ordners.
// Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 27.11.2026 · CC BY 4.0

$basis = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'notizen_test_' . bin2hex(random_bytes(4));
$docroot = $basis . '/docroot';
mkdir($docroot . '/lab/notizen', 0777, true);
mkdir($basis . '/ki_notizen');
copy(__DIR__ . '/api.php', $docroot . '/lab/notizen/api.php');
$schluessel = 'test-' . bin2hex(random_bytes(8));
$port = 18000 + random_int(0, 999);
$url = "http://127.0.0.1:$port/lab/notizen/api.php";

$fehler = 0;
function pruefe($ok, $was) { global $fehler; echo ($ok ? 'ok    ' : 'FEHLER ') . $was . "\n"; if (!$ok) $fehler++; }
function frage($methode, $url, $schluessel = null, $koerper = null) {
    $kopf = "Content-Type: application/json\r\n" . ($schluessel !== null ? "X-Notizen-Schluessel: $schluessel\r\n" : '');
    $ctx = stream_context_create(['http' => ['method' => $methode, 'header' => $kopf, 'content' => $koerper === null ? '' : $koerper, 'ignore_errors' => true, 'timeout' => 5]]);
    $text = @file_get_contents($url, false, $ctx);
    $code = 0;
    foreach (isset($http_response_header) ? $http_response_header : [] as $z) if (preg_match('#^HTTP/\S+ (\d+)#', $z, $m)) $code = (int)$m[1];
    return [$code, json_decode((string)$text, true)];
}
function post($url, $s, $a) { return frage('POST', $url, $s, json_encode($a)); }

$umgebung = getenv(); $umgebung['NOTIZEN_ORDNER'] = $basis . '/ki_notizen';
$server = proc_open([PHP_BINARY, '-S', "127.0.0.1:$port", '-t', $docroot], [1 => ['file', $basis . '/server.log', 'w'], 2 => ['file', $basis . '/server.log', 'a']], $pipes, null, $umgebung);
for ($i = 0; $i < 50; $i++) { if (@fsockopen('127.0.0.1', $port)) break; usleep(100000); }

// ohne schluessel.txt ist alles gesperrt
list($c) = frage('GET', "$url?projekt=zweispaenner", $schluessel);
pruefe($c === 403, 'ohne schluessel.txt gesperrt');
file_put_contents($basis . '/ki_notizen/schluessel.txt', hash('sha256', $schluessel) . "\n");

list($c) = frage('GET', "$url?projekt=zweispaenner");
pruefe($c === 403, 'ohne Schlüssel: 403');
list($c) = frage('GET', "$url?projekt=zweispaenner", 'falsch');
pruefe($c === 403, 'falscher Schlüssel: 403');
list($c) = frage('GET', "$url?projekt=../x", $schluessel);
pruefe($c === 400, 'Projektname mit Pfad abgewiesen');
list($c, $j) = frage('GET', "$url?projekt=zweispaenner", $schluessel);
pruefe($c === 200 && $j['notes'] === [] && $j['axes'] === [], 'leerer Stand');

list($c, $j) = post($url . '?projekt=zweispaenner', $schluessel, ['aktion' => 'add', 'sammlung' => 'notes',
    'daten' => ['n' => 1, 'text' => 'Küche größer – „Test“', 'x' => 120, 'y' => 340, 'status' => 'offen', 'variant' => 'v2', 'created' => '2026-11-27T12:00:00Z']]);
pruefe($c === 200 && count($j['notes']) === 1 && $j['notes'][0]['text'] === 'Küche größer – „Test“', 'Kommentar angelegt, Umlaute erhalten');
$id = $j['notes'][0]['id'];
pruefe(preg_match('/^[0-9a-f]{16}$/', $id) === 1, 'Server vergibt die id');

list($c, $j) = post($url . '?projekt=zweispaenner', $schluessel, ['aktion' => 'update', 'sammlung' => 'notes', 'id' => $id, 'daten' => ['status' => 'erledigt', 'reply' => 'Küche um 30 cm verbreitert']]);
pruefe($c === 200 && $j['notes'][0]['status'] === 'erledigt' && $j['notes'][0]['reply'] !== '' && $j['notes'][0]['x'] === 120, 'Status und Antwort gesetzt, übrige Felder bleiben');

list($c, $j) = post($url . '?projekt=zweispaenner', $schluessel, ['aktion' => 'add', 'sammlung' => 'axes', 'daten' => ['label' => 'A', 'x1' => 0, 'y1' => 0, 'x2' => 0, 'y2' => 1260, 'variant' => 'v0']]);
pruefe($c === 200 && count($j['axes']) === 1, 'Achse angelegt');

list($c) = post($url . '?projekt=zweispaenner', $schluessel, ['aktion' => 'add', 'sammlung' => 'notes', 'daten' => ['text' => ['verschachtelt']]]);
pruefe($c === 400, 'verschachtelte Werte abgewiesen');
list($c) = post($url . '?projekt=zweispaenner', $schluessel, ['aktion' => 'add', 'sammlung' => 'notes', 'daten' => ['text' => str_repeat('x', 4001)]]);
pruefe($c === 400, 'zu langer Text abgewiesen');
list($c) = post($url . '?projekt=zweispaenner', $schluessel, ['aktion' => 'add', 'sammlung' => 'fremd', 'daten' => ['text' => 'x']]);
pruefe($c === 400, 'unbekannte Sammlung abgewiesen');
list($c) = post($url . '?projekt=zweispaenner', null, ['aktion' => 'delete', 'sammlung' => 'notes', 'id' => $id]);
pruefe($c === 403, 'Löschen ohne Schlüssel: 403');

list($c, $j) = post($url . '?projekt=zweispaenner', $schluessel, ['aktion' => 'import', 'sammlung' => 'notes', 'eintraege' => [['id' => $id, 'text' => 'doppelt'], ['id' => 'lokal1', 'text' => 'aus Datei', 'n' => 2]]]);
pruefe($c === 200 && count($j['notes']) === 2 && $j['notes'][0]['text'] !== 'doppelt', 'Import ohne Doppelte');

list($c, $j) = post($url . '?projekt=zweispaenner', $schluessel, ['aktion' => 'delete', 'sammlung' => 'notes', 'id' => $id]);
pruefe($c === 200 && count($j['notes']) === 1, 'Kommentar gelöscht');
list($c) = post($url . '?projekt=zweispaenner', $schluessel, ['aktion' => 'delete', 'sammlung' => 'notes', 'id' => $id]);
pruefe($c === 404, 'schon gelöscht: 404');

list($c, $j) = frage('GET', "$url?projekt=andere", $schluessel);
pruefe($c === 200 && $j['notes'] === [], 'Projekte getrennt');
pruefe(!file_exists($docroot . '/lab/notizen/zweispaenner.json') && is_file($basis . '/ki_notizen/zweispaenner.json'), 'Daten außerhalb des Docroot');

proc_terminate($server);
echo $fehler ? "$fehler FEHLER\n" : "ALLES OK\n";
exit($fehler ? 1 : 0);
