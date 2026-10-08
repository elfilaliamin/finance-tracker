<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Method not allowed', 405);

$input = body_input();
$entryDate = clean_str($input['entry_date'] ?? null);
$sourceId = (int)($input['income_source_id'] ?? 0);
$currency = clean_str($input['original_currency'] ?? null);
$amount = $input['original_amount'] ?? null;

if (!$entryDate || !DateTime::createFromFormat('Y-m-d', $entryDate)) json_error('Valid entry_date (YYYY-MM-DD) is required', 422);
if (!$sourceId) json_error('income_source_id is required', 422);
if (!in_array($currency, CurrencyService::SUPPORTED, true)) json_error('Unsupported currency', 422);
if ($amount === null || !is_numeric($amount) || (float)$amount < 0) json_error('original_amount must be a non-negative number', 422);

$pdo = get_db();
$srcCheck = $pdo->prepare('SELECT id FROM income_sources WHERE id = :id');
$srcCheck->execute(['id' => $sourceId]);
if (!$srcCheck->fetch()) json_error('Income source not found', 404);

$svc = new CurrencyService($pdo);
$rate = $svc->currentRateFor($currency);
$baseAmount = $svc->toBaseAtRate((float)$amount, $rate);

[$y, $m] = array_map('intval', explode('-', $entryDate));

$stmt = $pdo->prepare(
    'INSERT INTO income (income_source_id, entry_date, month, year, category, description,
        original_currency, original_amount, exchange_rate_used, base_amount, notes)
     VALUES (:source_id, :entry_date, :month, :year, :category, :description,
        :currency, :amount, :rate, :base_amount, :notes)'
);
$stmt->execute([
    'source_id'   => $sourceId,
    'entry_date'  => $entryDate,
    'month'       => $m,
    'year'        => $y,
    'category'    => clean_str($input['category'] ?? null),
    'description' => clean_str($input['description'] ?? null),
    'currency'    => $currency,
    'amount'      => $amount,
    'rate'        => $rate,
    'base_amount' => $baseAmount,
    'notes'       => clean_str($input['notes'] ?? null),
]);
$id = (int)$pdo->lastInsertId();

log_activity($uid, 'create_income', 'income', $id, ['amount' => $amount, 'currency' => $currency]);
json_ok(['id' => $id, 'base_amount' => $baseAmount, 'exchange_rate_used' => $rate], 201);
