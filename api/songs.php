<?php
// api/songs.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/config.php';

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

function sendResponse($success, $message = '', $data = []) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

try {
    // Get JSON input for POST requests
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        
        if ($action === 'add_song') {
            // Validate required fields
            $required = ['title', 'artist', 'file_path'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    sendResponse(false, "Missing required field: $field");
                }
            }
            
            // Prepare data
            $title = trim($input['title']);
            $artist = trim($input['artist']);
            $album = trim($input['album'] ?? '');
            $genre = trim($input['genre'] ?? '');
            $duration = trim($input['duration'] ?? '0:00');
            $file_path = trim($input['file_path']);
            $cover_path = trim($input['cover_path'] ?? 'assets/images/default-cover.jpg');
            
            // Insert into database
            $stmt = $pdo->prepare("
                INSERT INTO songs 
                (title, artist, album, genre, duration, file_path, cover_path, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $result = $stmt->execute([$title, $artist, $album, $genre, $duration, $file_path, $cover_path]);
            
            if ($result) {
                $songId = $pdo->lastInsertId();
                sendResponse(true, 'Song added successfully', ['id' => $songId]);
            } else {
                sendResponse(false, 'Failed to add song to database');
            }
        }
        
        else {
            sendResponse(false, 'Invalid action');
        }
    }
    
    // Handle GET requests
    elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        if ($action === 'get_songs') {
            $stmt = $pdo->query("
                SELECT 
                    id,
                    title,
                    artist, 
                    album,
                    genre,
                    duration,
                    file_path,
                    cover_path,
                    created_at
                FROM songs 
                ORDER BY created_at DESC
            ");
            $songs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $formattedSongs = array_map(function($song) {
                return [
                    'id' => 'db-' . $song['id'],
                    'title' => $song['title'],
                    'artist' => $song['artist'],
                    'album' => $song['album'] ?? '',
                    'genre' => $song['genre'] ?? '',
                    'duration' => $song['duration'] ?? '0:00',
                    'file_path' => $song['file_path'],
                    'cover_path' => $song['cover_path'] ?? 'assets/images/default-cover.jpg',
                    'addedAt' => $song['created_at'],
                    'source' => 'database'
                ];
            }, $songs);
            
            sendResponse(true, 'Songs retrieved successfully', $formattedSongs);
        }
        
        else {
            sendResponse(false, 'Invalid action');
        }
    }
    
    else {
        sendResponse(false, 'Method not allowed');
    }
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    sendResponse(false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    sendResponse(false, 'Server error: ' . $e->getMessage());
}
?>