<?php
session_start();
require_once 'config/config.php';

// Cek apakah user admin
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: index.php');
    exit();
}

$database = new Database();
$db = $database->getConnection();

$message = '';
$message_type = '';

// HANDLE ADD SONG
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['add_song'])) {
    $title = trim($_POST['title']);
    $artist = trim($_POST['artist']);
    $album = trim($_POST['album'] ?? '');
    $genre = trim($_POST['genre'] ?? '');
    $duration = trim($_POST['duration'] ?? '0:00');
    
    // Handle audio file upload
    if (isset($_FILES['audio_file']) && $_FILES['audio_file']['error'] === UPLOAD_ERR_OK) {
        $audio_dir = 'assets/audio/';
        if (!is_dir($audio_dir)) {
            mkdir($audio_dir, 0777, true);
        }
        
        $audio_ext = strtolower(pathinfo($_FILES['audio_file']['name'], PATHINFO_EXTENSION));
        $allowed_audio = ['mp3', 'wav', 'ogg', 'm4a'];
        
        if (in_array($audio_ext, $allowed_audio)) {
            $audio_filename = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9]/', '_', $title) . '.' . $audio_ext;
            $audio_path = $audio_dir . $audio_filename;
            
            if (move_uploaded_file($_FILES['audio_file']['tmp_name'], $audio_path)) {
                // Handle cover image upload (optional)
                $cover_path = 'assets/images/default-cover.jpg';
                if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
                    $cover_dir = 'assets/images/covers/';
                    if (!is_dir($cover_dir)) {
                        mkdir($cover_dir, 0777, true);
                    }
                    
                    $cover_ext = strtolower(pathinfo($_FILES['cover_image']['name'], PATHINFO_EXTENSION));
                    $allowed_images = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                    
                    if (in_array($cover_ext, $allowed_images)) {
                        $cover_filename = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9]/', '_', $title) . '.' . $cover_ext;
                        $cover_path = $cover_dir . $cover_filename;
                        move_uploaded_file($_FILES['cover_image']['tmp_name'], $cover_path);
                    }
                }
                
                // Save to database
                try {
                    $query = "INSERT INTO songs (title, artist, album, genre, duration, file_path, cover_path, added_by) 
                             VALUES (:title, :artist, :album, :genre, :duration, :file_path, :cover_path, :added_by)";
                    $stmt = $db->prepare($query);
                    $stmt->bindParam(':title', $title);
                    $stmt->bindParam(':artist', $artist);
                    $stmt->bindParam(':album', $album);
                    $stmt->bindParam(':genre', $genre);
                    $stmt->bindParam(':duration', $duration);
                    $stmt->bindParam(':file_path', $audio_path);
                    $stmt->bindParam(':cover_path', $cover_path);
                    $stmt->bindParam(':added_by', $_SESSION['user_id']);
                    
                    if ($stmt->execute()) {
                        $message = 'Song added successfully!';
                        $message_type = 'success';
                    } else {
                        $message = 'Failed to save song to database.';
                        $message_type = 'error';
                    }
                } catch (Exception $e) {
                    $message = 'Database error: ' . $e->getMessage();
                    $message_type = 'error';
                }
            } else {
                $message = 'Failed to upload audio file.';
                $message_type = 'error';
            }
        } else {
            $message = 'Invalid audio format. Allowed: MP3, WAV, OGG, M4A';
            $message_type = 'error';
        }
    } else {
        $message = 'Please select an audio file.';
        $message_type = 'error';
    }
}

// HANDLE DELETE SONG
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['delete_song'])) {
    $song_id = $_POST['song_id'];
    
    try {
        $query = "DELETE FROM songs WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $song_id);
        
        if ($stmt->execute()) {
            $message = 'Song deleted successfully!';
            $message_type = 'success';
        }
    } catch (Exception $e) {
        $message = 'Error deleting song: ' . $e->getMessage();
        $message_type = 'error';
    }
}

// Get all songs untuk ditampilkan
try {
    $query = "SELECT s.*, u.username as added_by_username 
              FROM songs s 
              LEFT JOIN users u ON s.added_by = u.id 
              ORDER BY s.created_at DESC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $songs = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $songs = [];
}

// Get statistics
$total_songs = count($songs);
$total_users = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
$total_likes = $db->query("SELECT COUNT(*) FROM liked_songs")->fetchColumn() ?: 0;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - MePlay</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <style>
        .admin-container { padding: 20px; background: #f8f9fa; min-height: 100vh; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 15px rgba(0,0,0,0.1); text-align: center; border-left: 4px solid #1db954; }
        .stat-number { font-size: 2.5rem; font-weight: bold; color: #1db954; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 0.9rem; font-weight: 500; }
        .song-form { background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 2px 15px rgba(0,0,0,0.1); }
        .song-list { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 15px rgba(0,0,0,0.1); }
        .song-item { border-bottom: 1px solid #eee; padding: 20px 0; }
        .song-item:hover { background: #f8f9fa; }
        .btn-admin { background: #1db954; color: white; border: none; padding: 12px 25px; border-radius: 8px; font-weight: 600; }
        .btn-admin:hover { background: #1ed760; }
        .song-cover { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="admin-container">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="mb-1"><i class="bi bi-gear"></i> Admin Panel</h1>
                <p class="text-muted mb-0">Manage your music library and users</p>
            </div>
            <div class="d-flex gap-2">
                <a href="index.php" class="btn btn-outline-primary">
                    <i class="bi bi-house"></i> Back to App
                </a>
                <a href="logout.php" class="btn btn-outline-danger">
                    <i class="bi bi-box-arrow-right"></i> Logout
                </a>
            </div>
        </div>

        <!-- Message Alert -->
        <?php if ($message): ?>
        <div class="alert alert-<?php echo $message_type === 'success' ? 'success' : 'danger'; ?> alert-dismissible fade show">
            <?php echo $message; ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
        <?php endif; ?>

        <!-- Statistics -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number"><?php echo $total_songs; ?></div>
                <div class="stat-label">Total Songs</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo $total_users; ?></div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo $total_likes; ?></div>
                <div class="stat-label">Total Likes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo $_SESSION['display_name']; ?></div>
                <div class="stat-label">Logged in as</div>
            </div>
        </div>

        <!-- Add Song Section -->
        <div class="song-form">
            <h3 class="mb-4"><i class="bi bi-plus-circle"></i> Add New Song</h3>
            <form method="POST" enctype="multipart/form-data">
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Title *</label>
                            <input type="text" name="title" class="form-control" required 
                                   value="<?php echo htmlspecialchars($_POST['title'] ?? ''); ?>"
                                   placeholder="Enter song title">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Artist *</label>
                            <input type="text" name="artist" class="form-control" required
                                   value="<?php echo htmlspecialchars($_POST['artist'] ?? ''); ?>"
                                   placeholder="Enter artist name">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Album</label>
                            <input type="text" name="album" class="form-control"
                                   value="<?php echo htmlspecialchars($_POST['album'] ?? ''); ?>"
                                   placeholder="Enter album name">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Genre</label>
                            <input type="text" name="genre" class="form-control"
                                   value="<?php echo htmlspecialchars($_POST['genre'] ?? ''); ?>"
                                   placeholder="e.g., Pop, Rock, Jazz">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Duration</label>
                            <input type="text" name="duration" class="form-control" 
                                   value="<?php echo htmlspecialchars($_POST['duration'] ?? '0:00'); ?>"
                                   placeholder="e.g., 3:45">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Audio File *</label>
                            <input type="file" name="audio_file" class="form-control" accept="audio/*" required>
                            <small class="form-text text-muted">Supported formats: MP3, WAV, OGG, M4A</small>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Cover Image (Optional)</label>
                            <input type="file" name="cover_image" class="form-control" accept="image/*">
                            <small class="form-text text-muted">Supported: JPG, PNG, GIF, WebP</small>
                        </div>
                    </div>
                </div>

                <button type="submit" name="add_song" class="btn-admin">
                    <i class="bi bi-plus-circle"></i> Add Song
                </button>
            </form>
        </div>

        <!-- Songs List -->
        <div class="song-list">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3><i class="bi bi-music-note-list"></i> Manage Songs (<?php echo $total_songs; ?>)</h3>
            </div>

            <?php if (count($songs) > 0): ?>
                <?php foreach ($songs as $song): ?>
                <div class="song-item">
                    <div class="row align-items-center">
                        <div class="col-md-1">
                            <img src="<?php echo $song['cover_path']; ?>" 
                                 alt="<?php echo htmlspecialchars($song['title']); ?>" 
                                 class="song-cover"
                                 onerror="this.src='assets/images/default-cover.jpg'">
                        </div>
                        <div class="col-md-8">
                            <div class="d-flex align-items-center mb-1">
                                <strong class="me-2"><?php echo htmlspecialchars($song['title']); ?></strong>
                                <?php if ($song['file_path'] && file_exists($song['file_path'])): ?>
                                    <span class="badge bg-success">File OK</span>
                                <?php else: ?>
                                    <span class="badge bg-danger">File Missing</span>
                                <?php endif; ?>
                            </div>
                            <div class="text-muted">
                                <i class="bi bi-person"></i> <?php echo htmlspecialchars($song['artist']); ?>
                                <?php if ($song['album']): ?>
                                    • <i class="bi bi-collection"></i> <?php echo htmlspecialchars($song['album']); ?>
                                <?php endif; ?>
                                <?php if ($song['genre']): ?>
                                    • <i class="bi bi-tag"></i> <?php echo htmlspecialchars($song['genre']); ?>
                                <?php endif; ?>
                                • <i class="bi bi-clock"></i> <?php echo $song['duration'] ?: 'N/A'; ?>
                            </div>
                            <small class="text-muted">
                                Added by: <?php echo $song['added_by_username']; ?> • 
                                <?php echo date('M j, Y', strtotime($song['created_at'])); ?>
                            </small>
                        </div>
                        <div class="col-md-3">
                            <form method="POST" style="display: inline;">
                                <input type="hidden" name="song_id" value="<?php echo $song['id']; ?>">
                                <button type="submit" name="delete_song" class="btn btn-outline-danger btn-sm" 
                                        onclick="return confirm('Are you sure you want to delete \"<?php echo addslashes($song['title']); ?>\"?')">
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="text-center py-5">
                    <i class="bi bi-music-note-beamed" style="font-size: 3rem; color: #dee2e6;"></i>
                    <h4 class="text-muted mt-3">No songs found</h4>
                    <p class="text-muted">Add your first song using the form above.</p>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>