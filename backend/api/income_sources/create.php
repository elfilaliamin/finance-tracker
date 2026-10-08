<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed', 405);

$input = body_input();
$name = clean_str($input['name'] ?? null);
if (!$name) json_error('Name is required', 422);

$color = clean_str($input['color'] ?? null) ?? '#4F46E5';
$icon = clean_str($input['icon'] ?? null) ?? 'FaMoneyBillWave';
$description = clean_str($input['description'] ?? null);
$status = in_array($input['status'] ?? '', ['active', 'inactive']) ? $input['status'] : 'active';

$pdo = get_db();
$maxOrder = (int)$pdo->query('SELECT COALESCE(MAX(sort_order),0) m FROM income_sources')->fetch()['m'];
$stmt = $pdo->prepare(
    'INSERT INTO income_sources (name, color, icon, description, status, sort_order) VALUES (:name, :color, :icon, :description, :status, :sort_order)'
);
$stmt->execute(array_merge(compact('name', 'color', 'icon', 'description', 'status'), ['sort_order' => $maxOrder + 1]));
$id = (int)$pdo->lastInsertId();

log_activity($uid, 'create_source', 'income_source', $id, ['name' => $name]);
json_ok(['id' => $id], 201);
