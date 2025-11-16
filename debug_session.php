<?php
session_start();
echo "<h1>DEBUG SESSION</h1>";
echo "<pre>";
echo "SESSION DATA:\n";
print_r($_SESSION);
echo "\nPOST DATA:\n"; 
print_r($_POST);
echo "\nGET DATA:\n";
print_r($_GET);
echo "</pre>";

// Test database connection
try {
    $pdo = new PDO("mysql:host=localhost;dbname=meplay_db;charset=utf8mb4", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<h2>DATABASE CHECK</h2>";
    
    // Check users
    $stmt = $pdo->query("SELECT id, username FROM users");
    $users = $stmt->fetchAll();
    echo "<h3>Users in database:</h3>";
    print_r($users);
    
    // Check songs
    $stmt = $pdo->query("SELECT id, title FROM songs"); 
    $songs = $stmt->fetchAll();
    echo "<h3>Songs in database:</h3>";
    print_r($songs);
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage();
}
?>