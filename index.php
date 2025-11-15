<?php
require_once 'config/config.php';

// REQUIRE LOGIN - Redirect ke login jika belum login
requireAuth();

$current_user = [
    'id' => $_SESSION['user_id'],
    'username' => $_SESSION['username'],
    'role' => $_SESSION['user_role'],
    'display_name' => $_SESSION['display_name']
];
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MePlay - Your Music Player</title>
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css"
    />
    <!-- Toastify CSS & JS -->
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css"
    />

    <link rel="stylesheet" href="assets/css/style.css" />
    <link rel="stylesheet" href="assets/css/sidebar.css" />
    <link rel="stylesheet" href="assets/css/player.css" />
    <link rel="stylesheet" href="assets/css/genre.css" />
  </head>
  <body>
    <div class="app-container">

    <!-- Add Song Modal -->
    <div class="modal" id="addSongModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add New Song</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="songTitle">Song Title *</label>
            <input
              type="text"
              id="songTitle"
              placeholder="Enter song title"
              required
            />
          </div>
          <div class="form-group">
            <label for="songArtist">Artist *</label>
            <input
              type="text"
              id="songArtist"
              placeholder="Enter artist name"
              required
            />
          </div>
          <div class="form-group">
            <label for="songAlbum">Album</label>
            <input type="text" id="songAlbum" placeholder="Enter album name" />
          </div>
          <div class="form-group">
            <label for="songGenre">Genre</label>
            <input type="text" id="songGenre" placeholder="Enter genre" />
          </div>
          <div class="form-group">
            <label for="songDuration">Duration</label>
            <input
              type="text"
              id="songDuration"
              placeholder="e.g., 3:45"
              value="0:00"
            />
          </div>
          <div class="form-group">
            <label for="audioPath">Audio File Path *</label>
            <input
              type="text"
              id="audioPath"
              placeholder="assets/audio/song.mp3"
              required
            />
            <small class="form-help">Path to audio file relative to root</small>
          </div>
          <div class="form-group">
            <label for="coverPath">Cover Image Path</label>
            <input
              type="text"
              id="coverPath"
              placeholder="assets/images/cover.jpg"
            />
            <small class="form-help">Path to cover image (optional)</small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-create" id="saveSongBtn">Add Song</button>
        </div>
      </div>
    </div>

    <!-- Create Playlist Modal -->
    <div class="modal" id="createPlaylistModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create Playlist</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="playlistName">Playlist Name</label>
            <input type="text" id="playlistName" placeholder="My Playlist" />
          </div>
          <div class="form-group">
            <label for="playlistDescription">Description (optional)</label>
            <textarea
              id="playlistDescription"
              placeholder="Add an optional description"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-create" id="savePlaylistBtn">Create</button>
        </div>
      </div>
    </div>

    <!-- Add to Playlist Modal -->
    <div class="modal" id="addToPlaylistModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add to Playlist</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="playlists-list-modal" id="playlistsModalList"></div>
          <button
            class="btn-create-new-playlist"
            id="createNewPlaylistFromModal"
          >
            <i class="bi bi-plus-circle"></i> Create New Playlist
          </button>
        </div>
      </div>
    </div>

    <!-- Queue Modal -->
    <div class="modal" id="queueModal">
      <div class="modal-content queue-modal">
        <div class="modal-header">
          <h3>Playback Queue</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="queue-info">
            <div class="queue-stats">
              <span id="queueCount">0 songs in queue</span>
              <button class="btn-clear-queue" id="clearQueueBtn">
                Clear Queue
              </button>
            </div>
          </div>
          <div class="queue-list" id="queueList">
            <div class="empty-state">
              <p>No songs in queue</p>
              <p class="queue-help">
                Add songs to queue from track dropdown menu
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div class="modal" id="deletePlaylistModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Delete Playlist</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p>
            Are you sure you want to delete this playlist? This action cannot be
            undone.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-delete" id="confirmDeletePlaylist">Delete</button>
        </div>
      </div>
    </div>

      <!-- Sidebar -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h2 class="logo">MePlay</h2>
        </div>
        <nav class="sidebar-nav">
          <a href="#" class="nav-item active" data-section="home">
            <i class="bi bi-house"></i>
            <span>Home</span>
          </a>
          <a href="#" class="nav-item" data-section="search">
            <i class="bi bi-search"></i>
            <span>Search</span>
          </a>
          <a href="#" class="nav-item" data-section="library">
            <i class="bi bi-collection"></i>
            <span>Your Library</span>
          </a>
          <div class="nav-divider"></div>

          <!-- Liked Songs -->
          <a href="#" class="nav-item" data-section="liked">
            <i class="bi bi-heart"></i>
            <span>Liked Songs</span>
          </a>

          <!-- Create Playlist Button -->
          <div class="nav-item create-playlist-btn" id="sidebarCreatePlaylist">
            <i class="bi bi-plus-circle"></i>
            <span>Create Playlist</span>
          </div>

          <!-- User Playlists List -->
          <div class="playlists-sidebar-list" id="sidebarPlaylistsList">
            <div class="empty-playlists">No playlists yet</div>
          </div>

          <!-- Admin Menu (Hanya tampil untuk admin) -->
          <?php if (isAdmin()): ?>
          <div id="adminMenuContainer">
            <div class="nav-divider"></div>
            <a href="admin.php" class="nav-item" data-section="admin">
              <i class="bi bi-gear"></i>
              <span>Admin Panel</span>
              <span class="badge">ADMIN</span>
            </a>
          </div>
          <?php endif; ?>
        </nav>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Top Bar dengan Search -->
        <div class="top-bar">
          <div class="search-bar">
            <i class="bi bi-search"></i>
            <input
              type="text"
              id="searchInput"
              placeholder="Search for songs, artists, or albums..."
            />
          </div>
          <div class="user-menu">
            <div class="user-dropdown">
              <button class="user-dropdown-btn" id="userDropdownBtn">
                <div class="user-avatar">
                  <i class="bi bi-person-circle"></i>
                </div>
                <span style="color: white; margin: 0 10px;">
                  <?php echo $current_user['display_name']; ?>
                </span>
                <i class="bi bi-chevron-down"></i>
              </button>
              <div class="user-dropdown-content" id="userDropdown">
                <div class="user-info">
                  <strong><?php echo $current_user['display_name']; ?></strong>
                  <small><?php echo strtoupper($current_user['role']); ?></small>
                </div>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item" id="profileBtn">
                  <i class="bi bi-person"></i> Profile
                </a>
                <a href="#" class="dropdown-item" id="settingsBtn">
                  <i class="bi bi-gear"></i> Settings
                </a>
                <div class="dropdown-divider"></div>
                <a href="login.php" class="dropdown-item" id="logoutBtn">
                  <i class="bi bi-box-arrow-right"></i> Logout
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Area -->
        <div class="content-area">
          <!-- Home View -->
          <div class="view active" id="homeView">
            <!-- All Songs Section -->
            <section class="section-container">
              <div class="section-header">
                <h2 class="section-title">All Songs</h2>
              </div>
              <div class="tracks-grid" id="allSongsGrid">
                <div class="empty-state">
                  <p>Loading songs...</p>
                </div>
              </div>
            </section>

            <!-- Recently Played Section -->
            <section class="section-container">
              <div class="section-header">
                <h2 class="section-title">Recently Played</h2>
              </div>
              <div class="tracks-grid" id="recentlyPlayedGrid">
                <div class="empty-state">
                  <p>No recent songs</p>
                </div>
              </div>
            </section>
          </div>

          <!-- Search View -->
          <div class="view" id="searchView">
            <div class="search-results">
              <h2 class="search-title" id="searchTitle">Search</h2>
              <div class="tracks-grid" id="searchResultsGrid">
                <div class="empty-state">
                  <p>Start typing to search</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Library View -->
          <div class="view" id="libraryView">
            <div class="library-content">
              <h2 class="section-title">Your Playlists</h2>
              <div class="playlists-grid" id="libraryPlaylists">
                <div class="empty-state">
                  <h3>No playlists yet</h3>
                  <p>Create your first playlist to get started</p>
                </div>
              </div>
              <button class="btn-create-playlist" id="createPlaylistBtn">
                <i class="bi bi-plus-circle"></i> Create New Playlist
              </button>
            </div>
          </div>

          <!-- Liked Songs View -->
          <div class="view" id="likedView">
            <div class="playlist-header">
              <div class="liked-cover">
                <div class="heart-icon">❤️</div>
              </div>
              <div class="playlist-info">
                <span class="playlist-type">PLAYLIST</span>
                <h1 class="playlist-title">Liked Songs</h1>
                <p class="playlist-stats" id="likedSongsStats">0 songs</p>
              </div>
            </div>
            <div class="playlist-actions">
              <button class="btn-play-large" id="playLikedSongs">
                <i class="bi bi-play-fill"></i>
              </button>
            </div>
            <div class="tracks-grid" id="likedSongsGrid">
              <div class="empty-state">
                <p>No liked songs yet</p>
              </div>
            </div>
          </div>

          <!-- Admin View -->
          <?php if (isAdmin()): ?>
          <div class="view" id="adminView">
            <div class="admin-content">
              <div class="admin-header">
                <h1 class="admin-title">
                  <i class="bi bi-gear"></i> Admin Panel
                  <span class="admin-badge">ADMIN</span>
                </h1>
                <p class="admin-subtitle">Manage your music library</p>
              </div>

              <div class="admin-stats">
                <div class="stat-card">
                  <div class="stat-icon">
                    <i class="bi bi-music-note-beamed"></i>
                  </div>
                  <div class="stat-info">
                    <div class="stat-number" id="totalSongs">0</div>
                    <div class="stat-label">Total Songs</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">
                    <i class="bi bi-heart"></i>
                  </div>
                  <div class="stat-info">
                    <div class="stat-number" id="totalLikes">0</div>
                    <div class="stat-label">Total Likes</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">
                    <i class="bi bi-collection-play"></i>
                  </div>
                  <div class="stat-info">
                    <div class="stat-number" id="totalPlaylists">0</div>
                    <div class="stat-label">Playlists</div>
                  </div>
                </div>
              </div>

              <div class="admin-actions">
                <button class="btn-admin-primary" id="addSongBtn">
                  <i class="bi bi-plus-circle"></i> Add New Song
                </button>
                <button class="btn-admin-secondary" id="refreshStatsBtn">
                  <i class="bi bi-arrow-clockwise"></i> Refresh Stats
                </button>
              </div>

              <div class="songs-management">
                <h3>Manage Songs</h3>
                <div class="table-container">
                  <table class="songs-table" id="songsTable">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Artist</th>
                        <th>Album</th>
                        <th>Duration</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- Songs will be loaded here -->
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <?php endif; ?>

          <!-- Playlist Detail View -->
          <div class="view" id="playlistDetailView">
            <div class="playlist-header">
              <div class="playlist-cover">
                <img
                  id="detailPlaylistCover"
                  src="assets/images/default-playlist.jpg"
                  alt="Playlist Cover"
                  class="detail-playlist-cover"
                />
              </div>
              <div class="playlist-info">
                <span class="playlist-type">PLAYLIST</span>
                <h1 class="playlist-title" id="detailPlaylistTitle">
                  Playlist Name
                </h1>
                <p
                  class="playlist-description"
                  id="detailPlaylistDescription"
                ></p>
                <p class="playlist-stats" id="detailPlaylistStats">0 songs</p>
              </div>
            </div>
            <div class="playlist-actions">
              <button class="btn-play-large" id="playPlaylistSongs">
                <i class="bi bi-play-fill"></i>
              </button>
              <button class="btn-delete-playlist" id="deletePlaylistBtn">
                <i class="bi bi-trash"></i> Delete Playlist
              </button>
            </div>
            <div class="tracks-grid" id="playlistDetailGrid">
              <div class="empty-state">
                <p>No songs in this playlist</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Audio Player -->
      <div class="audio-player" id="audioPlayer">
        <div class="player-container">
          <!-- Now Playing Info -->
          <div class="now-playing">
            <div class="track-info">
              <img
                id="currentCover"
                src="assets/images/default-cover.jpg"
                alt="Now Playing"
                class="now-playing-cover"
              />
              <div class="track-details">
                <div id="currentTitle" class="track-title">Not playing</div>
                <div id="currentArtist" class="track-artist">
                  Select a song to play
                </div>
              </div>
              <button class="btn-like-track" id="playerLikeBtn">
                <i class="bi bi-heart"></i>
              </button>
            </div>
          </div>

          <!-- Player Controls -->
          <div class="player-controls">
            <div class="control-buttons">
              <button class="btn-control" id="shuffleBtn">
                <i class="bi bi-shuffle"></i>
              </button>
              <button class="btn-control" id="prevBtn">
                <i class="bi bi-skip-start-fill"></i>
              </button>
              <button class="btn-play-pause" id="playPauseBtn">
                <i class="bi bi-play-fill"></i>
              </button>
              <button class="btn-control" id="nextBtn">
                <i class="bi bi-skip-end-fill"></i>
              </button>
              <button class="btn-control" id="repeatBtn">
                <i class="bi bi-repeat"></i>
              </button>
            </div>
            <div class="progress-container">
              <span class="time" id="currentTime">0:00</span>
              <div class="progress-bar-container">
                <div class="progress-bar" id="progressBar">
                  <div class="progress-fill" id="progressFill"></div>
                </div>
              </div>
              <span class="time" id="duration">0:00</span>
            </div>
          </div>

          <!-- Extra Controls -->
          <div class="extra-controls">
            <button class="btn-control" id="addToPlaylistBtn">
              <i class="bi bi-plus-square"></i>
            </button>
            <button class="btn-control btn-queue" id="queueBtn">
              <div class="queue-indicator">
                <i class="bi bi-music-note-list"></i>
                <span class="queue-badge" id="queueBadge">0</span>
              </div>
            </button>
            <button class="btn-control" id="volumeBtn">
              <i class="bi bi-volume-up-fill"></i>
            </button>
            <div class="volume-slider-container">
              <input
                type="range"
                class="volume-slider"
                id="volumeControl"
                min="0"
                max="1"
                step="0.01"
                value="0.7"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    

    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <script src="assets/js/app.js"></script>
    <script src="assets/js/player.js"></script>
    <script src="assets/js/playlist.js"></script>
    <script src="assets/js/search.js"></script>
    <script src="assets/js/genre.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            localStorage.clear();
            sessionStorage.clear();
            
            window.location.href = 'login.php?logout=1';
        });
    }
});
    </script>
    <script>
// DEBUG SCRIPT - Tambahkan ini
console.log('🔧 DEBUG: Checking modal functionality...');

// Test manual function
window.debugAddSong = function() {
    console.log('🧪 Manual debug function called');
    
    // Check if modal exists
    const modal = document.getElementById('addSongModal');
    console.log('📱 Modal element:', modal);
    
    // Check if save button exists
    const saveBtn = document.getElementById('saveSongBtn');
    console.log('💾 Save button:', saveBtn);
    
    // Check if app is loaded
    console.log('🎵 MePlayApp:', window.mePlayApp);
    
    // Test show modal
    if (modal) {
        modal.style.display = 'flex';
        console.log('✅ Modal shown manually');
    }
};

// Check DOM on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 DOM loaded - checking elements:');
    
    const addSongBtn = document.getElementById('addSongBtn');
    console.log('🎵 Add Song Button:', addSongBtn);
    
    const modal = document.getElementById('addSongModal');
    console.log('📱 Modal:', modal);
    
    const saveBtn = document.getElementById('saveSongBtn');
    console.log('💾 Save Button:', saveBtn);
    
    // Add direct click listener for testing
    if (addSongBtn) {
        addSongBtn.addEventListener('click', function() {
            console.log('🎵 DIRECT CLICK: Add Song Button clicked!');
            const modal = document.getElementById('addSongModal');
            if (modal) {
                modal.style.display = 'flex';
                console.log('✅ Modal shown via direct click');
            }
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            console.log('💾 DIRECT CLICK: Save Button clicked!');
            const title = document.getElementById('songTitle')?.value;
            console.log('📝 Title value:', title);
            alert('DIRECT TEST: Would save song: ' + title);
        });
    }
});

console.log('💡 Type debugAddSong() in console to test manually');
</script>
  </body>
</html>