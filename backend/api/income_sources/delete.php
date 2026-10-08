<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();
if (!in_array($_SERVER['REQUEST_METHOD'], ['DELETE', 'POST'])) json_error('Method not allowed', 405);

$input = body_input();
$id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
if (!$id) json_error('id is required', 422);

$pdo = get_db();
$check = $pdo->prepare('SELECT COUNT(*) c FROM income WHERE income_source_id = :id');
$check->execute(['id' => $id]);
if ((int)$check->fetch()['c'] > 0) {
    json_error('Cannot delete a source that has income records. Set it to inactive instead.', 409);
}

$stmt = $pdo->prepare('DELETE FROM income_sources WHERE id = :id');
$stmt->execute(['id' => $id]);

log_activity($uid, 'delete_source', 'income_source', $id);
json_ok(['id' => $id]);
