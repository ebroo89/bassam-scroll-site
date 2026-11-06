<?php
// Mohammad Bassam website → n8n relay (upload next to index.html, at /api/apply.php).
//
// Why: the site is https and n8n answers only over plain http, so the browser cannot call
// n8n directly (mixed content). The browser posts here and this file forwards server-side.
// The n8n address never reaches the browser, the body is capped, and each IP may send
// a few applications per 10 minutes (stops someone flooding the CRM).

// The n8n address is NOT in this repository (public): set it in api/relay-config.php (copy relay-config.example.php)
// or in the BASSAM_N8N_BASE environment variable. Without it the relay answers 503 not_configured.
$relayConfig = is_file(__DIR__ . '/relay-config.php') ? (include __DIR__ . '/relay-config.php') : [];
$n8nBase = rtrim((string) (getenv('BASSAM_N8N_BASE') ?: ($relayConfig['n8n_base'] ?? '')), '/');
define('N8N_URL', getenv('BASSAM_N8N_URL') ?: ($n8nBase !== '' ? $n8nBase . '/bassam-apply' : ''));
const MAX_BODY = 20 * 1024;
const RATE_MAX = 5;          // applications per IP…
const RATE_WINDOW = 600;     // …per 10 minutes

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (N8N_URL === '') reply(503, ['ok' => false, 'error' => 'not_configured']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply(405, ['ok' => false, 'error' => 'method_not_allowed']);

$len = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
$body = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($len > MAX_BODY || $body === false || strlen($body) > MAX_BODY) reply(413, ['ok' => false, 'error' => 'too_large']);
if ($body === '' || json_decode($body) === null) reply(400, ['ok' => false, 'error' => 'bad_json']);

// ---- per-IP rate limit (tiny file store) ----
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$rateFile = sys_get_temp_dir() . '/bassam-apply-' . hash('sha256', $ip) . '.json';
$now = time();
$hits = is_file($rateFile) ? (json_decode((string) file_get_contents($rateFile), true) ?: []) : [];
$hits = array_values(array_filter($hits, fn($t) => $now - (int) $t < RATE_WINDOW));
if (count($hits) >= RATE_MAX) reply(429, ['ok' => false, 'error' => 'too_many']);
$hits[] = $now;
@file_put_contents($rateFile, json_encode($hits), LOCK_EX);

// ---- forward to n8n ----
$ch = curl_init(N8N_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT        => 40,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json', 'X-Forwarded-For: ' . $ip],
]);
$res = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

if ($res === false || $code === 0) reply(502, ['ok' => false, 'error' => 'upstream_unreachable']);
if (json_decode($res) === null) reply(502, ['ok' => false, 'error' => 'upstream_bad_reply']);
http_response_code($code >= 200 && $code < 300 ? 200 : 502);
echo $res;
