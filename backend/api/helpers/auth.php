<?php
function current_user_id(): ?int {
    return $_SESSION['user_id'] ?? null;
}

function require_auth(): int {
    $uid = current_user_id();
    if (!$uid) {
        json_error('Not authenticated', 401);
    }
    return $uid;
}
