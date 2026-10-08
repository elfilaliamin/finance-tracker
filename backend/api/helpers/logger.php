<?php
function log_activity(?int $userId, string $action, ?string $entityType = null, ?int $entityId = null, array $details = []): void {
    $pdo = get_db();
    $stmt = $pdo->prepare(
        'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES (:user_id, :action, :entity_type, :entity_id, :details, :ip)'
    );
    $stmt->execute([
        'user_id'     => $userId,
        'action'      => $action,
        'entity_type' => $entityType,
        'entity_id'   => $entityId,
        'details'     => json_encode($details),
        'ip'          => $_SERVER['REMOTE_ADDR'] ?? null,
    ]);
}

function log_login(?int $userId, string $username, bool $success): void {
    $pdo = get_db();
    $stmt = $pdo->prepare(
        'INSERT INTO login_logs (user_id, username, success, ip_address, user_agent)
         VALUES (:user_id, :username, :success, :ip, :ua)'
    );
    $stmt->execute([
        'user_id'  => $userId,
        'username' => $username,
        'success'  => $success ? 1 : 0,
        'ip'       => $_SERVER['REMOTE_ADDR'] ?? null,
        'ua'       => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ]);
}
