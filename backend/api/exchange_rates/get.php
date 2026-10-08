<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_auth();

$pdo = get_db();
$svc = new CurrencyService($pdo);

$usd = $svc->getCachedRate('USD');
$eur = $svc->getCachedRate('EUR');
$settings = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();

json_ok([
    'USD_MAD' => $usd['rate_to_base'] ?? null,
    'EUR_MAD' => $eur['rate_to_base'] ?? null,
    'usd_source' => $usd['source_api'] ?? null,
    'eur_source' => $eur['source_api'] ?? null,
    'last_updated' => max($usd['fetched_at'] ?? '', $eur['fetched_at'] ?? '') ?: null,
    'conversion_mode' => $settings['conversion_mode'] ?? 'historical',
    'display_currency' => $settings['display_currency'] ?? 'MAD',
]);
