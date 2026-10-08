<?php
/**
 * Bootstrap included by every API endpoint.
 * Handles sessions, security headers, CORS, and consistent JSON error handling.
 */

// Session hardening
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
// If you serve over https in production, also set: ini_set('session.cookie_secure', 1);

session_name('finance_tracker_session');
session_start();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// CORS headers — the frontend and backend are separate containers
// behind a shared Nginx proxy, but we keep this permissive for
// flexibility (e.g. direct backend access during dev).
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/currency.php';
require_once __DIR__ . '/../helpers/logger.php';
require_once __DIR__ . '/../helpers/csrf.php';

// Session idle expiration (30 minutes)
$SESSION_LIFETIME = 1800;
if (isset($_SESSION['user_id'])) {
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $SESSION_LIFETIME) {
        session_unset();
        session_destroy();
    } else {
        $_SESSION['last_activity'] = time();
    }
}

set_exception_handler(function ($e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error', 'detail' => $e->getMessage()]);
});
