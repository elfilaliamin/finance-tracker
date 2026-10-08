<?php
require_once __DIR__ . '/../config/bootstrap.php';
$uid = require_auth();

$type = clean_str($_GET['type'] ?? null) ?? 'income'; // 'income' or 'networth'
$pdo = get_db();
$svc = new CurrencyService($pdo);
$settings = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();
$displayCurrency = clean_str($_GET['display_currency'] ?? null) ?? $settings['display_currency'];

$dateFrom = clean_str($_GET['date_from'] ?? null);
$dateTo = clean_str($_GET['date_to'] ?? null);

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $type . '_report_' . date('Y-m-d') . '.csv"');

$out = fopen('php://output', 'w');

if ($type === 'networth') {
    $where = [];
    $params = [];
    if ($dateFrom) { $where[] = 'entry_date >= :from'; $params['from'] = $dateFrom; }
    if ($dateTo) { $where[] = 'entry_date <= :to'; $params['to'] = $dateTo; }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $pdo->prepare("SELECT * FROM networth $whereSql ORDER BY entry_date ASC");
    $stmt->execute($params);

    fputcsv($out, ['Date', 'Original Amount', 'Original Currency', 'Rate Used', "Amount ($displayCurrency)", 'Notes']);
    foreach ($stmt as $row) {
        fputcsv($out, [
            $row['entry_date'], $row['original_amount'], $row['original_currency'], $row['exchange_rate_used'],
            $svc->convertFromBase((float)$row['base_amount'], $displayCurrency), $row['notes'],
        ]);
    }
} else {
    $where = [];
    $params = [];
    if ($dateFrom) { $where[] = 'i.entry_date >= :from'; $params['from'] = $dateFrom; }
    if ($dateTo) { $where[] = 'i.entry_date <= :to'; $params['to'] = $dateTo; }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $pdo->prepare(
        "SELECT i.*, s.name AS source_name FROM income i JOIN income_sources s ON s.id = i.income_source_id
         $whereSql ORDER BY i.entry_date ASC"
    );
    $stmt->execute($params);

    fputcsv($out, ['Date', 'Source', 'Category', 'Description', 'Original Amount', 'Original Currency', 'Rate Used', "Amount ($displayCurrency)", 'Notes']);
    foreach ($stmt as $row) {
        fputcsv($out, [
            $row['entry_date'], $row['source_name'], $row['category'], $row['description'],
            $row['original_amount'], $row['original_currency'], $row['exchange_rate_used'],
            $svc->convertFromBase((float)$row['base_amount'], $displayCurrency), $row['notes'],
        ]);
    }
}

fclose($out);
log_activity($uid, 'export_report', $type, null, ['date_from' => $dateFrom, 'date_to' => $dateTo]);
exit;
