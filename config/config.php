<?php
session_start();

// Database configuration
$host = 'localhost';
$dbname = 'meplay_db';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage());
    die("Database connection failed: " . $e->getMessage());
}

// Set default user session untuk testing (HAPUS INI DI PRODUCTION)
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1; // Default user ID
    $_SESSION['username'] = 'user1';
    $_SESSION['user_role'] = 'user';
    $_SESSION['display_name'] = 'User One';
}

function requireAuth() {
    if (!isset($_SESSION['user_id'])) {
        header('Location: login.php');
        exit;
    }
    return true;
}

function isAdmin() {
    return isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
}

function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}
?>