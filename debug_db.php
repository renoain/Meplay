<?php
session_start();
header('Content-Type: text/plain');

echo "=== DATABASE DEBUG ===\n\n";

// Database configuration
$host = 'localhost';
$dbname = 'meplay_db';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Database connected successfully\n\n";
    
    // Check tables
    $tables = ['users', 'songs', 'liked_songs', 'playlists', 'playlist_songs'];
    
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->fetch()) {
            echo "✅ Table '$table' exists\n";
            
            // Count rows
            $count = $pdo->query("SELECT COUNT(*) as count FROM $table")->fetch()['count'];
            echo "   - Rows: $count\n";
            
            // Show sample data for some tables
            if ($table === 'liked_songs') {
                $data = $pdo->query("SELECT * FROM $table LIMIT 5")->fetchAll();
                if ($data) {
                    echo "   - Sample data:\n";
                    foreach ($data as $row) {
                        echo "     User: {$row['user_id']}, Song: {$row['song_id']}\n";
                    }
                }
            }
        } else {
            echo "❌ Table '$table' does NOT exist\n";
        }
        echo "\n";
    }
    
    // Check session
    echo "=== SESSION DEBUG ===\n";
    echo "User ID: " . ($_SESSION['user_id'] ?? 'NOT SET') . "\n";
    echo "Username: " . ($_SESSION['username'] ?? 'NOT SET') . "\n";
    
} catch (PDOException $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
}
?>