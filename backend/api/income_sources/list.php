<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_auth();

$pdo = get_db();
$search = clean_str($_GET['search'] ?? null);
$status = clean_str($_GET['status'] ?? null);
$sortBy = in_array($_GET['sort_by'] ?? '', ['name', 'created_at', 'status', 'sort_order']) ? $_GET['sort_by'] : 'sort_order';
$sortDir = strtoupper($_GET['sort_dir'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';

$where = [];
$params = [];
if ($search) {
    // PostgreSQL: use ILIKE for case-insensitive search
    $where[] = '(name ILIKE :search OR description ILIKE :search)';
    $params['search'] = "%$search%";
}
if ($status) {
    $where[] = 'status = :status';
    $params['status'] = $status;
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "SELECT s.*,
        (SELECT COUNT(*) FROM income i WHERE i.income_source_id = s.id) AS income_count,
        (SELECT COALESCE(SUM(i.base_amount),0) FROM income i WHERE i.income_source_id = s.id) AS total_base_amount
        FROM income_sources s $whereSql ORDER BY s.$sortBy $sortDir, s.id ASC";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

$settings = $pdo->query('SELECT display_currency FROM settings WHERE id = 1')->fetch();
$displayCurrency = clean_str($_GET['display_currency'] ?? null) ?? $settings['display_currency'];
$svc = new CurrencyService($pdo);

foreach ($rows as &$row) {
    $row['total_display_amount'] = $svc->convertFromBase((float)$row['total_base_amount'], $displayCurrency);
    $row['display_currency'] = $displayCurrency;
}
unset($row);

json_ok(['sources' => $rows, 'display_currency' => $displayCurrency]);
