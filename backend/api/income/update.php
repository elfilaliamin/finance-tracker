<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();
require_csrf();
if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'])) json_error('Method not allowed', 405);

$input = body_input();
$id = (int)($input['id'] ?? 0);
if (!$id) json_error('id is required', 422);

$pdo = get_db();
$existingStmt = $pdo->prepare('SELECT * FROM income WHERE id = :id');
$existingStmt->execute(['id' => $id]);
$existing = $existingStmt->fetch();
if (!$existing) json_error('Income record not found', 404);

$entryDate = clean_str($input['entry_date'] ?? null) ?? $existing['entry_date'];
if (!DateTime::createFromFormat('Y-m-d', $entryDate)) json_error('Invalid entry_date', 422);

$sourceId = (int)($input['income_source_id'] ?? $existing['income_source_id']);
$currency = clean_str($input['original_currency'] ?? null) ?? $existing['original_currency'];
$amount = array_key_exists('original_amount', $input) ? $input['original_amount'] : $existing['original_amount'];

if (!in_array($currency, CurrencyService::SUPPORTED, true)) json_error('Unsupported currency', 422);
if (!is_numeric($amount) || (float)$amount < 0) json_error('original_amount must be a non-negative number', 422);

$svc = new CurrencyService($pdo);
// Recompute the rate/base only if currency or amount changed, to preserve historical accuracy otherwise.
$currencyChanged = $currency !== $existing['original_currency'];
$amountChanged = (float)$amount !== (float)$existing['original_amount'];
if ($currencyChanged || $amountChanged) {
    $rate = $svc->currentRateFor($currency);
    $baseAmount = $svc->toBaseAtRate((float)$amount, $rate);
} else {
    $rate = $existing['exchange_rate_used'];
    $baseAmount = $existing['base_amount'];
}

[$y, $m] = array_map('intval', explode('-', $entryDate));

$stmt = $pdo->prepare(
    'UPDATE income SET income_source_id = :source_id, entry_date = :entry_date, month = :month, year = :year,
        category = :category, description = :description, original_currency = :currency, original_amount = :amount,
        exchange_rate_used = :rate, base_amount = :base_amount, notes = :notes WHERE id = :id'
);
$stmt->execute([
    'source_id'   => $sourceId,
    'entry_date'  => $entryDate,
    'month'       => $m,
    'year'        => $y,
    'category'    => clean_str($input['category'] ?? $existing['category']),
    'description' => clean_str($input['description'] ?? $existing['description']),
    'currency'    => $currency,
    'amount'      => $amount,
    'rate'        => $rate,
    'base_amount' => $baseAmount,
    'notes'       => clean_str($input['notes'] ?? $existing['notes']),
    'id'          => $id,
]);

log_activity($uid, 'update_income', 'income', $id, $input);
json_ok(['id' => $id, 'base_amount' => $baseAmount]);
