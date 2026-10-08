<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_auth();

$pdo = get_db();
$settings = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();
if ($settings && isset($settings['dashboard_config']) && is_string($settings['dashboard_config'])) {
    $settings['dashboard_config'] = json_decode($settings['dashboard_config'], true);
}

$currencyService = new CurrencyService($pdo);
$rates = [
    'USD' => $currencyService->getCachedRate('USD'),
    'EUR' => $currencyService->getCachedRate('EUR'),
];

json_ok(['settings' => $settings, 'rates' => $rates]);
