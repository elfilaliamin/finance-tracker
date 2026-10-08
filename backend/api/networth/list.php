<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_auth();

$pdo = get_db();
$svc = new CurrencyService($pdo);
$settings = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();
$displayCurrency = clean_str($_GET['display_currency'] ?? null) ?? $settings['display_currency'];

$dateFrom = clean_str($_GET['date_from'] ?? null);
$dateTo = clean_str($_GET['date_to'] ?? null);
$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = min(500, max(1, (int)($_GET['per_page'] ?? 50)));
$offset = ($page - 1) * $perPage;

$where = [];
$params = [];
if ($dateFrom) { $where[] = 'entry_date >= :date_from'; $params['date_from'] = $dateFrom; }
if ($dateTo)   { $where[] = 'entry_date <= :date_to'; $params['date_to'] = $dateTo; }
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$countStmt = $pdo->prepare("SELECT COUNT(*) AS c FROM networth $whereSql");
$countStmt->execute($params);
$total = (int)$countStmt->fetch()['c'];

$sql = "SELECT * FROM networth $whereSql ORDER BY entry_date DESC LIMIT :limit OFFSET :offset";
$stmt = $pdo->prepare($sql);
foreach ($params as $k => $v) $stmt->bindValue(":$k", $v);
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

foreach ($rows as &$row) {
    $row['display_amount'] = $svc->convertFromBase((float)$row['base_amount'], $displayCurrency);
    $row['display_currency'] = $displayCurrency;
}
unset($row);

json_ok(['rows' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage, 'display_currency' => $displayCurrency]);
