<?php
function json_ok($data = [], int $code = 200): void {
    http_response_code($code);
    echo json_encode(array_merge(['success' => true], ['data' => $data]));
    exit;
}

function json_error(string $message, int $code = 400, array $extra = []): void {
    http_response_code($code);
    echo json_encode(array_merge(['success' => false, 'error' => $message], $extra));
    exit;
}

function body_input(): array {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/** Basic string sanitizer against stored XSS; HTML-escape on output, not input,
 *  but we trim/strip control chars here. Real defense is prepared statements
 *  (below) + escaping on the frontend when rendering. */
function clean_str($v): ?string {
    if ($v === null) return null;
    $v = trim((string)$v);
    return $v === '' ? null : $v;
}
