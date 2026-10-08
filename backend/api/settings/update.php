<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = body_input();
$allowed = ['theme', 'display_currency', 'conversion_mode', 'exchange_api', 'auto_update_rates', 'language'];
$fields = [];
$params = ['id' => 1];

foreach ($allowed as $key) {
    if (array_key_exists($key, $input)) {
        $fields[] = "$key = :$key";
        $params[$key] = $input[$key];
    }
}

if (array_key_exists('dashboard_config', $input)) {
    $fields[] = 'dashboard_config = :dashboard_config';
    $params['dashboard_config'] = json_encode($input['dashboard_config']);
}

if (empty($fields)) json_error('No valid fields to update', 422);

$pdo = get_db();
$fields[] = 'updated_at = CURRENT_TIMESTAMP';
$sql = 'UPDATE settings SET ' . implode(', ', $fields) . ' WHERE id = :id';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

log_activity($uid, 'update_settings', 'settings', 1, $input);

$settings = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();
if ($settings && isset($settings['dashboard_config']) && is_string($settings['dashboard_config'])) {
    $settings['dashboard_config'] = json_decode($settings['dashboard_config'], true);
}
json_ok(['settings' => $settings]);
