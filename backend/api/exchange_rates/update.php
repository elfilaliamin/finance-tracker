<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed', 405);

$pdo = get_db();
$svc = new CurrencyService($pdo);
$result = $svc->refreshRates();

// PostgreSQL syntax for interval addition
$pdo->prepare("UPDATE settings SET last_rate_update = NOW(), next_scheduled_update = NOW() + INTERVAL '1 day' WHERE id = 1")->execute();

log_activity($uid, 'update_exchange_rates', 'exchange_rates', null, $result);

if (!$result['success']) {
    json_error('All exchange rate APIs failed; using cached values only', 502, ['result' => $result]);
}

json_ok($result);
