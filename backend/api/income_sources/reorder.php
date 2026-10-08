<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed', 405);

$input = body_input();
$order = $input['order'] ?? null; // array of source ids in desired order
if (!is_array($order) || empty($order)) json_error('order (array of ids) is required', 422);

$pdo = get_db();
$stmt = $pdo->prepare('UPDATE income_sources SET sort_order = :pos WHERE id = :id');

$pdo->beginTransaction();
try {
    foreach ($order as $index => $id) {
        $stmt->execute(['pos' => $index + 1, 'id' => (int)$id]);
    }
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    json_error('Failed to save order', 500);
}

log_activity($uid, 'reorder_sources', 'income_source', null, ['order' => $order]);
json_ok(['order' => array_map('intval', $order)]);
