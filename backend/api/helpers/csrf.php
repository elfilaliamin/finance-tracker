<?php
/**
 * Simple double-submit CSRF protection for state-changing requests.
 * The login endpoint issues a token stored in the session; the frontend
 * must echo it back in the X-CSRF-Token header on POST/PUT/DELETE.
 */
function issue_csrf_token(): string {
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    return $token;
}

function require_csrf(): void {
    $method = $_SERVER['REQUEST_METHOD'];
    if (!in_array($method, ['POST', 'PUT', 'DELETE'], true)) return;

    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';
    if (!$expected || !$sent || !hash_equals($expected, $sent)) {
        json_error('Invalid or missing CSRF token', 403);
    }
}
