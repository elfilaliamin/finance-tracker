<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();
if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'])) json_error('Method not allowed', 405);

$input = body_input();
$id = (int)($input['id'] ?? 0);
if (!$id) json_error('id is required', 422);

$allowed = ['name', 'color', 'icon', 'description', 'status'];
$fields = [];
$params = ['id' => $id];
foreach ($allowed as $key) {
    if (array_key_exists($key, $input)) {
        $fields[] = "$key = :$key";
        $params[$key] = clean_str($input[$key]) ?? $input[$key];
    }
}
if (!$fields) json_error('No valid fields to update', 422);

$pdo = get_db();
$sql = 'UPDATE income_sources SET ' . implode(', ', $fields) . ' WHERE id = :id';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

log_activity($uid, 'update_source', 'income_source', $id, $input);
json_ok(['id' => $id]);
