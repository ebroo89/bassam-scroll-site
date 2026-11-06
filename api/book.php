<?php
// Mohammad Bassam website → n8n relay for consultation booking (upload next to book.html, at /api/book.php).
//
//   GET  book.php?days=14  → free slots of the consultation calendar  (n8n: /webhook/bassam-slots)
//   POST book.php (JSON)   → books the chosen slot                    (n8n: /webhook/bassam-book)
//
// Same reason as apply.php/pay.php: the site is https and n8n answers only over plain http, so the browser talks
// to this file and this file talks to n8n. Each IP may book a few times per 10 minutes; slots are cached for 20 s.

// The n8n address is NOT in this repository (public): set it in api/relay-config.php (copy relay-config.example.php)
// or in the BASSAM_N8N_BASE environment variable. Without it the relay answers 503 not_configured.
$relayConfig = is_file(__DIR__ . '/relay-config.php') ? (include __DIR__ . '/relay-config.php') : [];
$n8nBase = rtrim((string) (getenv('BASSAM_N8N_BASE') ?: ($relayConfig['n8n_base'] ?? '')), '/');
define('N8N_BASE', $n8nBase);
const RATE_MAX = 5;          // bookings per IP…
const RATE_WINDOW = 600;     // …per 10 minutes
const SLOTS_TTL = 20;        // seconds a slots answer is reused (keeps GHL calls low)
const FIELDS = ['name', 'email', 'phone', 'slot', 'page', 'submitted_at', 'company'];

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (N8N_BASE === '') reply(503, ['ok' => false, 'error' => 'not_configured']);

function forward(string $url, ?array $json, string $ip): array {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => ['Accept: application/json', 'X-Forwarded-For: ' . $ip],
    ];
    if ($json !== null) {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = json_encode($json, JSON_UNESCAPED_UNICODE);
        $opts[CURLOPT_HTTPHEADER][] = 'Content-Type: application/json';
    }
    curl_setopt_array($ch, $opts);
    $res = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    if ($res === false || $code === 0) reply(502, ['ok' => false, 'error' => 'upstream_unreachable']);
    if (json_decode($res) === null) reply(502, ['ok' => false, 'error' => 'upstream_bad_reply']);
    return [$code, $res];
}

$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$method = $_SERVER['REQUEST_METHOD'] ?? '';

// ---- slots ----
if ($method === 'GET') {
    $days = max(1, min(30, (int) ($_GET['days'] ?? 14)));
    $cache = sys_get_temp_dir() . '/bassam-slots-' . $days . '.json';
    if (is_file($cache) && time() - filemtime($cache) < SLOTS_TTL) {
        echo file_get_contents($cache);
        exit;
    }
    [$code, $res] = forward(N8N_BASE . '/bassam-slots?days=' . $days, null, $ip);
    $data = json_decode($res, true);
    if ($code < 200 || $code >= 300 || !is_array($data) || ($data['ok'] ?? false) !== true) {
        reply(502, ['ok' => false, 'error' => (is_array($data) && isset($data['error'])) ? (string) $data['error'] : 'unavailable']);
    }
    @file_put_contents($cache, $res, LOCK_EX);
    echo $res;
    exit;
}

// ---- booking ----
if ($method !== 'POST') reply(405, ['ok' => false, 'error' => 'method_not_allowed']);
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16 * 1024) reply(413, ['ok' => false, 'error' => 'too_large']);
$in = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($in)) reply(400, ['ok' => false, 'error' => 'invalid']);

$rateFile = sys_get_temp_dir() . '/bassam-book-' . hash('sha256', $ip) . '.json';
$now = time();
$hits = is_file($rateFile) ? (json_decode((string) file_get_contents($rateFile), true) ?: []) : [];
$hits = array_values(array_filter($hits, fn($t) => $now - (int) $t < RATE_WINDOW));
if (count($hits) >= RATE_MAX) reply(429, ['ok' => false, 'error' => 'too_many']);
$hits[] = $now;
@file_put_contents($rateFile, json_encode($hits), LOCK_EX);

$post = [];
foreach (FIELDS as $key) {
    if (isset($in[$key]) && is_string($in[$key])) $post[$key] = mb_substr($in[$key], 0, 300);
}
[$code, $res] = forward(N8N_BASE . '/bassam-book', $post, $ip);
@unlink(sys_get_temp_dir() . '/bassam-slots-14.json'); // a booked slot must disappear from the list at once
http_response_code($code >= 200 && $code < 300 ? 200 : 502);
echo $res;
