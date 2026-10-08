<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_auth();

$pdo = get_db();
$svc = new CurrencyService($pdo);
$settings = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();
$displayCurrency = clean_str($_GET['display_currency'] ?? null) ?? $settings['display_currency'];
$mode = $settings['conversion_mode'];

$search = clean_str($_GET['search'] ?? null);
$sourceId = (int)($_GET['source_id'] ?? 0);
$currency = clean_str($_GET['currency'] ?? null);
$year = (int)($_GET['year'] ?? 0);
$month = (int)($_GET['month'] ?? 0);
$dateFrom = clean_str($_GET['date_from'] ?? null);
$dateTo = clean_str($_GET['date_to'] ?? null);
$sortBy = in_array($_GET['sort_by'] ?? '', ['entry_date', 'base_amount', 'created_at']) ? $_GET['sort_by'] : 'entry_date';
$sortDir = strtoupper($_GET['sort_dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = min(200, max(1, (int)($_GET['per_page'] ?? 25)));
$offset = ($page - 1) * $perPage;

$where = [];
$params = [];
if ($search) {
    // PostgreSQL: use ILIKE for case-insensitive search
    $where[] = '(i.description ILIKE :search OR i.notes ILIKE :search OR s.name ILIKE :search)';
    $params['search'] = "%$search%";
}
if ($sourceId) { $where[] = 'i.income_source_id = :source_id'; $params['source_id'] = $sourceId; }
if ($currency) { $where[] = 'i.original_currency = :currency'; $params['currency'] = $currency; }
if ($year)  { $where[] = 'i.year = :year'; $params['year'] = $year; }
if ($month) { $where[] = 'i.month = :month'; $params['month'] = $month; }
if ($dateFrom) { $where[] = 'i.entry_date >= :date_from'; $params['date_from'] = $dateFrom; }
if ($dateTo)   { $where[] = 'i.entry_date <= :date_to'; $params['date_to'] = $dateTo; }
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$countStmt = $pdo->prepare("SELECT COUNT(*) AS c FROM income i JOIN income_sources s ON s.id = i.income_source_id $whereSql");
$countStmt->execute($params);
$total = (int)$countStmt->fetch()['c'];

$sql = "SELECT i.*, s.name AS source_name, s.color AS source_color, s.icon AS source_icon
        FROM income i JOIN income_sources s ON s.id = i.income_source_id
        $whereSql ORDER BY i.$sortBy $sortDir LIMIT :limit OFFSET :offset";
$stmt = $pdo->prepare($sql);
foreach ($params as $k => $v) $stmt->bindValue(":$k", $v);
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

// Attach display-currency amount.
foreach ($rows as &$row) {
    $row['display_amount'] = $svc->convertFromBase((float)$row['base_amount'], $displayCurrency);
    $row['display_currency'] = $displayCurrency;
}
unset($row);

$availableYears = $pdo->query('SELECT DISTINCT year FROM income ORDER BY year DESC')->fetchAll(PDO::FETCH_COLUMN);

json_ok([
    'rows' => $rows,
    'total' => $total,
    'page' => $page,
    'per_page' => $perPage,
    'display_currency' => $displayCurrency,
    'available_years' => array_map('intval', $availableYears),
]);
