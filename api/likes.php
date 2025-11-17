<?php
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

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
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'User not authenticated. Please login.']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Get input data
$input = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputData = file_get_contents('php://input');
    if (!empty($inputData)) {
        $input = json_decode($inputData, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
            exit;
        }
    }
} else {
    $input = $_GET;
}

$action = $input['action'] ?? '';

// Validate action
if (empty($action)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action is required']);
    exit;
}

// Debug logging
error_log("Likes API Called - User: $user_id, Action: $action, Input: " . json_encode($input));

try {
    switch ($action) {
        case 'like_song':
            handleLikeSong($pdo, $user_id, $input);
            break;
            
        case 'unlike_song':
            handleUnlikeSong($pdo, $user_id, $input);
            break;
            
        case 'get_liked_songs':
            handleGetLikedSongs($pdo, $user_id);
            break;
            
        case 'is_song_liked':
            handleIsSongLiked($pdo, $user_id, $input);
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

//  HANDLER FUNCTIONS 

function handleLikeSong($pdo, $user_id, $input) {
    if (empty($input['song_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Song ID is required']);
        return;
    }
    
    $song_id = $input['song_id'];
    
    // Debug
    error_log("Like Song - User: $user_id, Song: $song_id");
    
    // Check if song exists
    $stmt = $pdo->prepare("SELECT id FROM songs WHERE id = ?");
    $stmt->execute([$song_id]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Song not found in database']);
        return;
    }
    
    // Check if already liked
    $stmt = $pdo->prepare("SELECT id FROM liked_songs WHERE user_id = ? AND song_id = ?");
    $stmt->execute([$user_id, $song_id]);
    
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Song already liked']);
        return;
    }
    
    // Add to liked songs
    $stmt = $pdo->prepare("INSERT INTO liked_songs (user_id, song_id, liked_at) VALUES (?, ?, NOW())");
    $result = $stmt->execute([$user_id, $song_id]);
    
    if ($result && $stmt->rowCount() > 0) {
        error_log("Successfully liked song: $song_id for user: $user_id");
        echo json_encode([
            'success' => true, 
            'message' => 'Song liked successfully',
            'song_id' => $song_id
        ]);
    } else {
        error_log("Failed to like song: $song_id for user: $user_id");
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to like song']);
    }
}

function handleUnlikeSong($pdo, $user_id, $input) {
    if (empty($input['song_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Song ID is required']);
        return;
    }
    
    $song_id = $input['song_id'];
    
    // Debug
    error_log("Unlike Song - User: $user_id, Song: $song_id");
    
    $stmt = $pdo->prepare("DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?");
    $result = $stmt->execute([$user_id, $song_id]);
    
    if ($result && $stmt->rowCount() > 0) {
        error_log("Successfully unliked song: $song_id for user: $user_id");
        echo json_encode([
            'success' => true, 
            'message' => 'Song unliked successfully',
            'song_id' => $song_id
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Song was not liked or already unliked']);
    }
}

function handleGetLikedSongs($pdo, $user_id) {
    $stmt = $pdo->prepare("
        SELECT s.* 
        FROM songs s 
        INNER JOIN liked_songs ls ON s.id = ls.song_id 
        WHERE ls.user_id = ? 
        ORDER BY ls.liked_at DESC
    ");
    $stmt->execute([$user_id]);
    $liked_songs = $stmt->fetchAll();
    
    // Convert IDs to string for consistency dengan JavaScript
    foreach ($liked_songs as &$song) {
        $song['id'] = (string)$song['id'];
    }
    
    error_log("Retrieved " . count($liked_songs) . " liked songs for user: $user_id");
    
    echo json_encode([
        'success' => true, 
        'data' => $liked_songs,
        'count' => count($liked_songs)
    ]);
}

function handleIsSongLiked($pdo, $user_id, $input) {
    if (empty($input['song_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Song ID is required']);
        return;
    }
    
    $song_id = $input['song_id'];
    
    $stmt = $pdo->prepare("SELECT id FROM liked_songs WHERE user_id = ? AND song_id = ?");
    $stmt->execute([$user_id, $song_id]);
    $isLiked = (bool)$stmt->fetch();
    
    echo json_encode([
        'success' => true, 
        'liked' => $isLiked,
        'song_id' => $song_id
    ]);
}

?>