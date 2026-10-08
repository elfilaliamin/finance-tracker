<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();
if (!in_array($_SERVER['REQUEST_METHOD'], ['DELETE', 'POST'])) json_error('Method not allowed', 405);

$input = body_input();
$id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
if (!$id) json_error('id is required', 422);

$pdo = get_db();
$stmt = $pdo->prepare('DELETE FROM networth WHERE id = :id');
$stmt->execute(['id' => $id]);

log_activity($uid, 'delete_networth', 'networth', $id);
json_ok(['id' => $id]);
