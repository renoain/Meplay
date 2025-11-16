<?php
// test_likes.php - Testing script untuk liked songs
session_start();
$_SESSION['user_id'] = 1; // Set manual untuk testing

// Test like song
$test_data = [
    'action' => 'like_song',
    'song_id' => '1'
];

$url = 'http://localhost/meplay/api/likes.php';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($test_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $http_code\n";
echo "Response: $response\n";
?>