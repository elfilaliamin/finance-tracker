<?php
require_once __DIR__ . '/../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed', 405);

$input = body_input();
$username = clean_str($input['username'] ?? null);
$password = (string)($input['password'] ?? '');

if (!$username || !$password) {
    json_error('Username and password are required', 422);
}

$pdo = get_db();
$stmt = $pdo->prepare('SELECT id, username, password_hash, display_name FROM users WHERE username = :u LIMIT 1');
$stmt->execute(['u' => $username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    log_login($user['id'] ?? null, $username, false);
    json_error('Invalid credentials', 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['username'] = $user['username'];
$_SESSION['last_activity'] = time();
$token = issue_csrf_token();

log_login((int)$user['id'], $username, true);
log_activity((int)$user['id'], 'login');

json_ok([
    'user' => ['id' => (int)$user['id'], 'username' => $user['username'], 'display_name' => $user['display_name']],
    'csrf_token' => $token,
]);
