<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_auth();

$pdo = get_db();
$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = min(200, max(1, (int)($_GET['per_page'] ?? 50)));
$offset = ($page - 1) * $perPage;
$type = clean_str($_GET['type'] ?? null); // 'activity' or 'login'

if ($type === 'login') {
    $total = (int)$pdo->query('SELECT COUNT(*) AS c FROM login_logs')->fetch()['c'];
    $stmt = $pdo->prepare('SELECT * FROM login_logs ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
} else {
    $total = (int)$pdo->query('SELECT COUNT(*) AS c FROM activity_logs')->fetch()['c'];
    $stmt = $pdo->prepare(
        'SELECT al.*, u.username FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id
         ORDER BY al.created_at DESC LIMIT :limit OFFSET :offset'
    );
}
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

json_ok(['rows' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage]);
