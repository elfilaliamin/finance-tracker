<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed', 405);

$input = body_input();
$currentPassword = (string)($input['current_password'] ?? '');
$newPassword = (string)($input['new_password'] ?? '');

if (!$currentPassword || !$newPassword) json_error('Current and new password are required', 422);
if (strlen($newPassword) < 8) json_error('New password must be at least 8 characters', 422);

$pdo = get_db();
$stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
$stmt->execute(['id' => $uid]);
$user = $stmt->fetch();

if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
    json_error('Current password is incorrect', 401);
}

$newHash = password_hash($newPassword, PASSWORD_BCRYPT);
$update = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
$update->execute(['hash' => $newHash, 'id' => $uid]);

log_activity($uid, 'change_password', 'user', $uid);
json_ok(['message' => 'Password updated']);
