<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include config
require_once '../config.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'User not authenticated']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Get input data
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
}

// Validate action
if (empty($action)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action is required']);
    exit;
}

try {
    switch ($action) {
        case 'like_song':
            if (empty($input['song_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Song ID is required']);
                exit;
            }
            
            $song_id = (int)$input['song_id'];
            
            // Check if song exists
            $stmt = $pdo->prepare("SELECT id FROM songs WHERE id = ?");
            $stmt->execute([$song_id]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Song not found']);
                exit;
            }
            
            // Check if already liked
            $stmt = $pdo->prepare("SELECT id FROM liked_songs WHERE user_id = ? AND song_id = ?");
            $stmt->execute([$user_id, $song_id]);
            
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Song already liked']);
                exit;
            }
            
            // Add to liked songs
            $stmt = $pdo->prepare("INSERT INTO liked_songs (user_id, song_id, liked_at) VALUES (?, ?, NOW())");
            $result = $stmt->execute([$user_id, $song_id]);
            
            if ($result) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Song liked successfully',
                    'song_id' => $song_id
                ]);
            } else {
                throw new Exception('Failed to insert into database');
            }
            break;

        case 'unlike_song':
            if (empty($input['song_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Song ID is required']);
                exit;
            }
            
            $song_id = (int)$input['song_id'];
            
            $stmt = $pdo->prepare("DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?");
            $result = $stmt->execute([$user_id, $song_id]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Song unliked successfully',
                    'song_id' => $song_id
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Song was not liked']);
            }
            break;

        case 'get_liked_songs':
            $stmt = $pdo->prepare("
                SELECT s.* 
                FROM songs s 
                INNER JOIN liked_songs ls ON s.id = ls.song_id 
                WHERE ls.user_id = ? 
                ORDER BY ls.liked_at DESC
            ");
            $stmt->execute([$user_id]);
            $liked_songs = $stmt->fetchAll();
            
            // Convert IDs to string for consistency
            foreach ($liked_songs as &$song) {
                $song['id'] = (string)$song['id'];
            }
            
            echo json_encode([
                'success' => true, 
                'data' => $liked_songs,
                'count' => count($liked_songs)
            ]);
            break;

        case 'is_song_liked':
            if (empty($_GET['song_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Song ID is required']);
                exit;
            }
            
            $song_id = (int)$_GET['song_id'];
            
            $stmt = $pdo->prepare("SELECT id FROM liked_songs WHERE user_id = ? AND song_id = ?");
            $stmt->execute([$user_id, $song_id]);
            
            echo json_encode([
                'success' => true, 
                'liked' => (bool)$stmt->fetch(),
                'song_id' => $song_id
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
            break;
    }
} catch (Exception $e) {
    error_log("Likes API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>