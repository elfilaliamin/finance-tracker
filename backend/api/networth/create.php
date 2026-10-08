<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed', 405);

$input = body_input();
$entryDate = clean_str($input['entry_date'] ?? null);
$currency = clean_str($input['original_currency'] ?? null);
$amount = $input['original_amount'] ?? null;

if (!$entryDate || !DateTime::createFromFormat('Y-m-d', $entryDate)) json_error('Valid entry_date (YYYY-MM-DD) is required', 422);
if (!in_array($currency, CurrencyService::SUPPORTED, true)) json_error('Unsupported currency', 422);
if ($amount === null || !is_numeric($amount)) json_error('original_amount must be a number (may be negative)', 422);

$pdo = get_db();
$svc = new CurrencyService($pdo);
$rate = $svc->currentRateFor($currency);
$baseAmount = $svc->toBaseAtRate((float)$amount, $rate);

// Upsert: one net worth snapshot per date. PostgreSQL ON CONFLICT
$stmt = $pdo->prepare(
    'INSERT INTO networth (entry_date, original_currency, original_amount, exchange_rate_used, base_amount, notes)
     VALUES (:entry_date, :currency, :amount, :rate, :base_amount, :notes)
     ON CONFLICT (entry_date) DO UPDATE SET
        original_currency = EXCLUDED.original_currency,
        original_amount = EXCLUDED.original_amount,
        exchange_rate_used = EXCLUDED.exchange_rate_used,
        base_amount = EXCLUDED.base_amount,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP'
);
$stmt->execute([
    'entry_date'  => $entryDate,
    'currency'    => $currency,
    'amount'      => $amount,
    'rate'        => $rate,
    'base_amount' => $baseAmount,
    'notes'       => clean_str($input['notes'] ?? null),
]);

log_activity($uid, 'update_networth', 'networth', null, ['entry_date' => $entryDate, 'amount' => $amount]);
json_ok(['entry_date' => $entryDate, 'base_amount' => $baseAmount], 201);
