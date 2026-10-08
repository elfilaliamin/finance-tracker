<?php
require_once __DIR__ . '/../config/bootstrap.php';

$uid = current_user_id();
if ($uid) {
    log_activity($uid, 'logout');
}
session_unset();
session_destroy();
json_ok(['message' => 'Logged out']);
