<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed', 405);

$input = body_input();
$password = (string)($input['password'] ?? '');
$scope = clean_str($input['scope'] ?? null) ?? 'all'; // 'income' | 'networth' | 'all'

if (!$password) json_error('Password is required to clear data', 422);
if (!in_array($scope, ['income', 'networth', 'all'], true)) json_error('Invalid scope', 422);

$pdo = get_db();
$stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
$stmt->execute(['id' => $uid]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    json_error('Password is incorrect', 401);
}

$deleted = [];
if ($scope === 'income' || $scope === 'all') {
    $deleted['income'] = $pdo->exec('DELETE FROM income');
}
if ($scope === 'networth' || $scope === 'all') {
    $deleted['networth'] = $pdo->exec('DELETE FROM networth');
}

log_activity($uid, 'clear_data', 'data', null, ['scope' => $scope, 'deleted' => $deleted]);
json_ok(['scope' => $scope, 'deleted' => $deleted]);
