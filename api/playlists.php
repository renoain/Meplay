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
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

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
        case 'create_playlist':
            if (empty($input['name'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Playlist name is required']);
                exit;
            }
            
            $name = trim($input['name']);
            $description = trim($input['description'] ?? '');
            
            $stmt = $pdo->prepare("INSERT INTO playlists (user_id, name, description, created_at) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$user_id, $name, $description]);
            
            $playlist_id = $pdo->lastInsertId();
            
            echo json_encode([
                'success' => true, 
                'playlist_id' => $playlist_id,
                'message' => 'Playlist created successfully'
            ]);
            break;

        case 'get_playlists':
            $stmt = $pdo->prepare("SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC");
            $stmt->execute([$user_id]);
            $playlists = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get song count for each playlist
            foreach ($playlists as &$playlist) {
                $stmt = $pdo->prepare("SELECT COUNT(*) as song_count FROM playlist_songs WHERE playlist_id = ?");
                $stmt->execute([$playlist['id']]);
                $count = $stmt->fetch(PDO::FETCH_ASSOC);
                $playlist['song_count'] = $count['song_count'] ?? 0;
                $playlist['id'] = (string)$playlist['id']; 
            }
            
            echo json_encode([
                'success' => true, 
                'data' => $playlists,
                'count' => count($playlists)
            ]);
            break;

        case 'delete_playlist':
            if (empty($input['playlist_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Playlist ID is required']);
                exit;
            }
            
            $playlist_id = $input['playlist_id'];
            
            // Verify playlist belongs to user
            $stmt = $pdo->prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?");
            $stmt->execute([$playlist_id, $user_id]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Playlist not found']);
                exit;
            }
            
            // Delete playlist songs first
            $stmt = $pdo->prepare("DELETE FROM playlist_songs WHERE playlist_id = ?");
            $stmt->execute([$playlist_id]);
            
            // Delete playlist
            $stmt = $pdo->prepare("DELETE FROM playlists WHERE id = ?");
            $stmt->execute([$playlist_id]);
            
            echo json_encode([
                'success' => true, 
                'message' => 'Playlist deleted successfully'
            ]);
            break;

        case 'add_song_to_playlist':
            if (empty($input['playlist_id']) || empty($input['song_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Playlist ID and Song ID are required']);
                exit;
            }
            
            $playlist_id = $input['playlist_id'];
            $song_id = $input['song_id'];
            
            // Verify playlist belongs to user
            $stmt = $pdo->prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?");
            $stmt->execute([$playlist_id, $user_id]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Playlist not found']);
                exit;
            }
            
            // Check if song exists
            $stmt = $pdo->prepare("SELECT id FROM songs WHERE id = ?");
            $stmt->execute([$song_id]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Song not found']);
                exit;
            }
            
            // Check if song already in playlist
            $stmt = $pdo->prepare("SELECT id FROM playlist_songs WHERE playlist_id = ? AND song_id = ?");
            $stmt->execute([$playlist_id, $song_id]);
            
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Song already in playlist']);
                exit;
            }
            
            $stmt = $pdo->prepare("INSERT INTO playlist_songs (playlist_id, song_id, added_at) VALUES (?, ?, NOW())");
            $stmt->execute([$playlist_id, $song_id]);
            
            echo json_encode([
                'success' => true, 
                'message' => 'Song added to playlist'
            ]);
            break;

        case 'remove_song_from_playlist':
            if (empty($input['playlist_id']) || empty($input['song_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Playlist ID and Song ID are required']);
                exit;
            }
            
            $playlist_id = $input['playlist_id'];
            $song_id = $input['song_id'];
            
            $stmt = $pdo->prepare("DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?");
            $stmt->execute([$playlist_id, $song_id]);
            
            echo json_encode([
                'success' => true, 
                'message' => 'Song removed from playlist'
            ]);
            break;

        case 'get_playlist_songs':
            if (empty($_GET['playlist_id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Playlist ID is required']);
                exit;
            }
            
            $playlist_id = $_GET['playlist_id'];
            
            $stmt = $pdo->prepare("
                SELECT s.* 
                FROM songs s 
                INNER JOIN playlist_songs ps ON s.id = ps.song_id 
                WHERE ps.playlist_id = ? 
                ORDER BY ps.added_at DESC
            ");
            $stmt->execute([$playlist_id]);
            $songs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($songs as &$song) {
                $song['id'] = (string)$song['id'];
            }
            
            echo json_encode([
                'success' => true, 
                'data' => $songs,
                'count' => count($songs)
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
            break;
    }
} catch (Exception $e) {
    error_log("Playlist API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
}
?>