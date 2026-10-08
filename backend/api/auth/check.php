<?php
require_once __DIR__ . '/../config/bootstrap.php';

$uid = current_user_id();
if (!$uid) {
    json_ok(['authenticated' => false]);
}

$token = $_SESSION['csrf_token'] ?? issue_csrf_token();
json_ok([
    'authenticated' => true,
    'user' => ['id' => $uid, 'username' => $_SESSION['username'] ?? ''],
    'csrf_token' => $token,
]);
