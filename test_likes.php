<?php
session_start();
$_SESSION['user_id'] = 1; // Set user session untuk testing

// Test get_liked_songs
$url = "http://localhost/meplay/api/likes.php?action=get_liked_songs";
$response = file_get_contents($url);
echo "=== TEST GET LIKED SONGS ===\n";
echo $response . "\n\n";

// Test like a song
$data = [
    'action' => 'like_song',
    'song_id' => 1
];

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode($data)
    ]
]);

$response = file_get_contents("http://localhost/meplay/api/likes.php", false, $context);
echo "=== TEST LIKE SONG ===\n";
echo $response . "\n\n";

// Test get_liked_songs again
$response = file_get_contents($url);
echo "=== TEST GET LIKED SONGS AFTER LIKE ===\n";
echo $response . "\n";
?>