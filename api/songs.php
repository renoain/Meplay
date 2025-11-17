<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = 'localhost';
$dbname = 'meplay_db';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ]);
    exit();
}

// Get action from request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
}
switch ($action) {
    case 'get_songs':
        getSongs($pdo);
        break;
        
    case 'add_song':
        addSong($pdo);
        break;
        
    case 'delete_song':
        deleteSong($pdo);
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action: ' . $action
        ]);
        break;
}

function getSongs($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM songs ORDER BY created_at DESC");
        $songs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $songs
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch songs'
        ]);
    }
}

function addSong($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['title']) || empty($input['artist']) || empty($input['file_path'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Title, Artist, and File Path are required'
        ]);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO songs (title, artist, album, genre, duration, file_path, cover_path) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        $success = $stmt->execute([
            $input['title'],
            $input['artist'],
            $input['album'] ?? '',
            $input['genre'] ?? '',
            $input['duration'] ?? '0:00',
            $input['file_path'],
            $input['cover_path'] ?? 'assets/images/default-cover.jpg'
        ]);
        
        if ($success) {
            echo json_encode([
                'success' => true,
                'song_id' => $pdo->lastInsertId(),
                'message' => 'Song added successfully'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to add song'
            ]);
        }
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
}

function deleteSong($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['song_id'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Song ID is required'
        ]);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM songs WHERE id = ?");
        $success = $stmt->execute([$input['song_id']]);
        
        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Song deleted successfully'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to delete song'
            ]);
        }
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
}
?>