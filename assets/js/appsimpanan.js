class MePlayApp {
  constructor() {
    this.songs = [];
    this.currentView = "home";
    this.currentSongIndex = -1;
    this.isPlaying = false;
    this.currentTrackList = [];
    this.currentPlaylistId = null;
    this.queue = [];
    this.currentDropdown = null;

    this.initializeGenreManager();
    this.initializeApp();
  }

  initializeGenreManager() {
    setTimeout(() => {
      if (typeof GenreManager !== "undefined") {
        window.genreManager = new GenreManager();
        console.log("🎵 Genre Manager initialized");
      }
    }, 2000);
  }

  async initializeApp() {
    console.log("🎵 Initializing MePlay App...");

    // Check authentication
    if (typeof authManager !== "undefined") {
      if (authManager.requireAuth && !authManager.requireAuth()) {
        return;
      }
    }

    await this.loadSongs();

    // Initialize managers
    window.playlistManager = new PlaylistManager();
    window.audioPlayer = new AudioPlayer();

    // Initialize search manager
    setTimeout(() => {
      window.searchManager = new SearchManager();
    }, 500);

    this.setupEventListeners();
    this.setupQueueButton();
    this.showView("home");
    this.loadHomeContent();
    this.setupAuthUI();

    console.log("✅ App initialized successfully");
    console.log("📊 Loaded songs:", this.songs.length);
  }

  async loadSongs() {
    try {
      console.log("🔄 Loading songs...");

      const storedSongs = localStorage.getItem("meplay_songs");

      if (storedSongs) {
        this.songs = JSON.parse(storedSongs);
        console.log("📁 Loaded songs from localStorage:", this.songs.length);
      } else {
        console.log("🔄 Loading from JSON file...");
        const response = await fetch("data/songs.json");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        this.songs = data.songs;
        this.saveSongsToStorage();
        console.log("📁 Loaded songs from JSON file:", this.songs.length);
      }
    } catch (error) {
      console.error("❌ Error loading songs:", error);
      this.songs = this.getFallbackSongs();
      this.saveSongsToStorage();
      console.log("🔄 Using fallback songs:", this.songs.length);
    }
  }

  getFallbackSongs() {
    return [
      {
        id: "song-1",
        title: "All I Need",
        artist: "Radiohead",
        album: "In Rainbows",
        file_path: "assets/audio/All I Need.mp3",
        cover_path: "assets/images/default-cover.jpg",
        duration: "3:48",
        genre: "Alternative Rock",
      },
      {
        id: "song-2",
        title: "Be Quiet and Drive",
        artist: "Deftones",
        album: "Around the Fur",
        file_path: "assets/audio/Be Quiet and Drive.mp3",
        cover_path: "assets/images/default-cover.jpg",
        duration: "4:33",
        genre: "Alternative Metal",
      },
      {
        id: "song-3",
        title: "Cherry Waves",
        artist: "Deftones",
        album: "Saturday Night Wrist",
        file_path: "assets/audio/Cherry Waves.mp3",
        cover_path: "assets/images/default-cover.jpg",
        duration: "5:18",
        genre: "Alternative Metal",
      },
    ];
  }

  saveSongsToStorage() {
    localStorage.setItem("meplay_songs", JSON.stringify(this.songs));
  }

  setupEventListeners() {
    console.log("🔧 Setting up event listeners...");

    // Navigation
    document.querySelectorAll(".nav-item[data-section]").forEach((item) => {
      if (item.dataset.section === "library") {
        item.style.display = "none";
        return;
      }

      item.addEventListener("click", (e) => {
        e.preventDefault();
        this.showView(item.dataset.section);
      });
    });

    // Create playlist buttons
    document
      .getElementById("sidebarCreatePlaylist")
      ?.addEventListener("click", () => {
        this.showCreatePlaylistModal();
      });

    document
      .getElementById("createPlaylistBtn")
      ?.addEventListener("click", () => {
        this.showCreatePlaylistModal();
      });

    // Play buttons
    document.getElementById("playLikedSongs")?.addEventListener("click", () => {
      this.playLikedSongs();
    });

    document
      .getElementById("playPlaylistSongs")
      ?.addEventListener("click", () => {
        this.playPlaylistSongs();
      });

    // Delete playlist
    document
      .getElementById("deletePlaylistBtn")
      ?.addEventListener("click", () => {
        this.deleteCurrentPlaylist();
      });

    // Admin buttons
    document.getElementById("addSongBtn")?.addEventListener("click", () => {
      this.showAddSongModal();
    });

    document
      .getElementById("refreshStatsBtn")
      ?.addEventListener("click", () => {
        this.refreshAdminStats();
      });

    // Queue button
    document.getElementById("queueBtn")?.addEventListener("click", () => {
      this.showQueueModal();
    });

    // Clear queue button
    document.getElementById("clearQueueBtn")?.addEventListener("click", () => {
      this.clearQueue();
    });

    this.setupModalHandlers();
    this.setupUserDropdown();
    this.setupGlobalEventListeners();

    console.log("✅ Event listeners setup complete");
  }

  // Global click handler close dropdowns
  setupGlobalEventListeners() {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".track-dropdown") && this.currentDropdown) {
        this.currentDropdown.classList.remove("show");
        this.currentDropdown = null;
      }

      // Close user dropdown
      if (!e.target.closest(".user-dropdown")) {
        document.getElementById("userDropdown")?.classList.remove("show");
      }
    });

    // Escape key  close dropdowns
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document
          .querySelectorAll(".track-dropdown-content.show")
          .forEach((dropdown) => {
            dropdown.classList.remove("show");
          });
        document.getElementById("userDropdown")?.classList.remove("show");
        this.currentDropdown = null;
      }
    });
  }

  setupQueueButton() {
    this.updateQueueUI();
  }

  setupUserDropdown() {
    const dropdownBtn = document.getElementById("userDropdownBtn");
    const dropdown = document.getElementById("userDropdown");

    if (dropdownBtn && dropdown) {
      dropdownBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
      });

      // Logout functionality
      document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        if (typeof authManager !== "undefined") {
          authManager.logout();
        }
      });

      // Profile and Settings placeholders
      document.getElementById("profileBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        alert("Profile feature coming soon!");
        dropdown.classList.remove("show");
      });

      document.getElementById("settingsBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        alert("Settings feature coming soon!");
        dropdown.classList.remove("show");
      });
    }
  }

  setupAuthUI() {
    if (typeof authManager !== "undefined" && authManager.getCurrentUser) {
      const user = authManager.getCurrentUser();
      if (user) {
        const userName = document.getElementById("dropdownUserName");
        const userRole = document.getElementById("dropdownUserRole");

        if (userName) userName.textContent = user.displayName;
        if (userRole) userRole.textContent = user.role.toUpperCase();

        if (user.role === "admin") {
          this.showAdminFeatures();
        }
      }
    }
  }

  showAdminFeatures() {
    const adminMenuContainer = document.getElementById("adminMenuContainer");
    if (adminMenuContainer) {
      adminMenuContainer.style.display = "block";
    }

    document
      .querySelectorAll('.nav-item[data-section="admin"]')
      .forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          this.showView("admin");
          this.loadAdminContent();
        });
      });

    if (this.currentView === "admin") {
      this.loadAdminContent();
    }
  }

  loadAdminContent() {
    this.refreshAdminStats();
    this.renderSongsTable();
  }

  refreshAdminStats() {
    const totalSongs = document.getElementById("totalSongs");
    const totalLikes = document.getElementById("totalLikes");
    const totalPlaylists = document.getElementById("totalPlaylists");

    if (totalSongs) totalSongs.textContent = this.songs.length;
    if (totalLikes && window.playlistManager) {
      const likedSongs = window.playlistManager.getLikedSongs();
      totalLikes.textContent = likedSongs.length;
    }
    if (totalPlaylists && window.playlistManager) {
      const userPlaylists = window.playlistManager.getUserPlaylists();
      totalPlaylists.textContent = userPlaylists.length;
    }
  }

  renderSongsTable() {
    const tableBody = document.querySelector("#songsTable tbody");
    if (!tableBody) return;

    if (!this.songs.length) {
      tableBody.innerHTML =
        '<tr><td colspan="5" class="text-center">No songs found</td></tr>';
      return;
    }

    tableBody.innerHTML = this.songs
      .map(
        (song) => `
      <tr>
        <td>
          <div class="song-info">
            <img src="${song.cover_path || "assets/images/default-cover.jpg"}" 
                 alt="${song.title}" 
                 class="song-table-cover"
                 onerror="this.src='assets/images/default-cover.jpg'">
            <div>
              <div class="song-title">${song.title}</div>
              <div class="song-artist">${song.artist}</div>
            </div>
          </div>
        </td>
        <td>${song.artist}</td>
        <td>${song.album || "-"}</td>
        <td>${song.duration || "0:00"}</td>
        <td class="actions">
          <button class="btn-table edit" data-song-id="${song.id}" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn-table delete" data-song-id="${
            song.id
          }" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `
      )
      .join("");

    // Add event listeners for action buttons
    tableBody.querySelectorAll(".btn-table.edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        this.editSong(songId);
      });
    });

    tableBody.querySelectorAll(".btn-table.delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        this.deleteSong(songId);
      });
    });
  }

  showAddSongModal() {
    const modal = document.getElementById("addSongModal");
    if (modal) {
      modal.style.display = "flex";
      this.setupAddSongModal();
    }
  }

  setupAddSongModal() {
    const modal = document.getElementById("addSongModal");
    if (!modal) return;

    modal.querySelector(".close-modal")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    modal.querySelector(".btn-cancel")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    modal.querySelector("#saveSongBtn")?.addEventListener("click", () => {
      this.saveNewSong();
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });

    modal.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.saveNewSong();
      }
    });
  }

  saveNewSong() {
    const title = document.getElementById("songTitle")?.value.trim();
    const artist = document.getElementById("songArtist")?.value.trim();
    const album = document.getElementById("songAlbum")?.value.trim();
    const genre = document.getElementById("songGenre")?.value.trim();
    const duration = document.getElementById("songDuration")?.value.trim();
    const audioPath = document.getElementById("audioPath")?.value.trim();
    const coverPath = document.getElementById("coverPath")?.value.trim();

    if (!title || !artist || !audioPath) {
      alert("Please fill in required fields: Title, Artist, and Audio Path");
      return;
    }

    const newSong = {
      id: `song-${Date.now()}`,
      title: title,
      artist: artist,
      album: album || "",
      genre: genre || "",
      duration: duration || "0:00",
      file_path: audioPath,
      cover_path: coverPath || "assets/images/default-cover.jpg",
      addedBy: authManager.getCurrentUser()?.username || "admin",
      addedAt: new Date().toISOString(),
    };

    this.songs.push(newSong);
    this.saveSongsToStorage();
    this.updateAllUI();
    document.getElementById("addSongModal").style.display = "none";
    this.showToast("Song added successfully!", "success");
  }

  updateAllUI() {
    this.renderTracksGrid(this.songs, "allSongsGrid", "all");
    this.renderTracksGrid(
      this.songs.slice(0, 4),
      "recentlyPlayedGrid",
      "recent"
    );
    this.renderSongsTable();
    this.refreshAdminStats();

    if (this.currentView === "search") {
      const searchInput = document.getElementById("searchInput");
      if (searchInput && searchInput.value) {
        window.searchManager?.performSearch(searchInput.value);
      }
    }

    if (this.currentView === "liked") {
      this.showLikedSongs();
    }
  }

  editSong(songId) {
    const song = this.songs.find((s) => s.id === songId);
    if (!song) return;

    const newTitle = prompt("Edit song title:", song.title);
    if (newTitle && newTitle.trim() !== song.title) {
      song.title = newTitle.trim();
      this.saveSongsToStorage();
      this.updateAllUI();
      this.showToast("Song updated successfully!", "success");
    }
  }

  deleteSong(songId) {
    if (
      confirm(
        "Are you sure you want to delete this song? This action cannot be undone."
      )
    ) {
      this.songs = this.songs.filter((song) => song.id !== songId);
      this.saveSongsToStorage();
      this.updateAllUI();
      this.showToast("Song deleted successfully!", "success");
    }
  }

  showToast(message, type = "success") {
    document.querySelectorAll(".toast").forEach((toast) => toast.remove());

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  setupModalHandlers() {
    this.setupCreatePlaylistModal();
    this.setupQueueModalHandlers();
  }

  setupCreatePlaylistModal() {
    const modal = document.getElementById("createPlaylistModal");
    if (!modal) return;

    modal.querySelector(".close-modal")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    modal.querySelector(".btn-cancel")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    modal.querySelector("#savePlaylistBtn")?.addEventListener("click", () => {
      const name = document.getElementById("playlistName")?.value.trim();
      if (name) {
        window.playlistManager.createPlaylist(name);
        modal.style.display = "none";
        document.getElementById("playlistName").value = "";
        this.showToast("Playlist created successfully!", "success");
      } else {
        alert("Enter playlist name");
      }
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  setupQueueModalHandlers() {
    const modal = document.getElementById("queueModal");
    if (!modal) return;

    modal.querySelector(".close-modal")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  showCreatePlaylistModal() {
    const modal = document.getElementById("createPlaylistModal");
    const nameInput = document.getElementById("playlistName");

    if (modal && nameInput) {
      nameInput.value = "";
      modal.style.display = "flex";
      nameInput.focus();
    }
  }

  showView(viewName) {
    console.log("🔄 Switching to view:", viewName);

    document.querySelectorAll(".view").forEach((view) => {
      view.classList.remove("active");
    });

    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
      targetView.classList.add("active");
      this.currentView = viewName;
    }

    this.loadViewContent(viewName);
  }

  loadViewContent(viewName) {
    switch (viewName) {
      case "home":
        this.loadHomeContent();
        break;
      case "liked":
        this.showLikedSongs();
        break;
      case "admin":
        this.loadAdminContent();
        break;
      case "library":
        this.showLibrary();
        break;
      case "genreDetail":
        break;
      default:
        break;
    }
  }

  loadHomeContent() {
    this.renderTracksGrid(this.songs, "allSongsGrid", "all");
    this.renderTracksGrid(
      this.songs.slice(0, 4),
      "recentlyPlayedGrid",
      "recent"
    );
  }

  showLibrary() {
    if (window.playlistManager) {
      const playlists = window.playlistManager.getUserPlaylists();
      const container = document.getElementById("libraryPlaylists");

      if (!playlists.length) {
        container.innerHTML = `
          <div class="empty-state">
            <h3>No playlists yet</h3>
            <p>Create your first playlist to get started</p>
          </div>
        `;
        return;
      }

      container.innerHTML = playlists
        .map(
          (playlist) => `
        <div class="track-card" data-playlist-id="${playlist.id}">
          <div class="track-image">
            <img src="${window.playlistManager.generatePlaylistCover(
              playlist
            )}" 
                 alt="${playlist.name}" 
                 class="track-cover">
            <div class="play-button">
              <i class="bi bi-play-fill"></i>
            </div>
          </div>
          <div class="track-info">
            <h4 class="track-title">${playlist.name}</h4>
            <p class="track-artist">${playlist.songs.length} songs</p>
          </div>
        </div>
      `
        )
        .join("");

      // Add click events for library playlists
      container.querySelectorAll(".track-card").forEach((card) => {
        card.addEventListener("click", () => {
          const playlistId = card.dataset.playlistId;
          this.showPlaylistDetail(playlistId);
        });
      });
    }
  }

  renderTracksGrid(tracks, containerId, context) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("❌ Container not found:", containerId);
      return;
    }

    if (!tracks.length) {
      container.innerHTML =
        '<div class="empty-state"><p>No tracks found</p></div>';
      return;
    }

    container.innerHTML = tracks
      .map((track, index) => {
        const isLiked = window.playlistManager?.isSongLiked(track.id);
        return `
        <div class="track-card" data-track-id="${track.id}">
          <div class="track-image">
            <img src="${track.cover_path || "assets/images/default-cover.jpg"}" 
                 alt="${track.title}" 
                 class="track-cover"
                 onerror="this.src='assets/images/default-cover.jpg'">
            <div class="play-button">
              <i class="bi bi-play-fill"></i>
            </div>
            <div class="track-dropdown">
              <button class="track-dropdown-btn">
                <i class="bi bi-three-dots"></i>
              </button>
              <div class="track-dropdown-content">
                <button class="track-dropdown-item add-to-queue" data-song-id="${
                  track.id
                }">
                  <i class="bi bi-plus-circle"></i> Add to Queue
                </button>
                <button class="track-dropdown-item toggle-like ${
                  isLiked ? "liked" : ""
                }" data-song-id="${track.id}">
                  <i class="bi bi-heart${isLiked ? "-fill" : ""}"></i> 
                  ${isLiked ? "Remove from Liked" : "Add to Liked"}
                </button>
                <div class="track-dropdown-divider"></div>
                <button class="track-dropdown-item add-to-playlist" data-song-id="${
                  track.id
                }">
                  <i class="bi bi-plus-square"></i> Add to Playlist
                </button>
                ${
                  context === "playlist"
                    ? `
                <div class="track-dropdown-divider"></div>
                <button class="track-dropdown-item remove-from-playlist" data-song-id="${track.id}">
                  <i class="bi bi-dash-circle"></i> Remove from Playlist
                </button>
                `
                    : ""
                }
              </div>
            </div>
          </div>
          <div class="track-info">
            <h4 class="track-title">${track.title || "Unknown Title"}</h4>
            <p class="track-artist">${track.artist || "Unknown Artist"}</p>
            ${
              track.addedBy
                ? `<small class="song-added-by">Added by: ${track.addedBy}</small>`
                : ""
            }
          </div>
        </div>
      `;
      })
      .join("");

    this.setupTrackInteractions(container, tracks, context);
  }

  setupTrackInteractions(container, tracks, context) {
    // Track card click play
    container.querySelectorAll(".track-card").forEach((card, index) => {
      card.addEventListener("click", (e) => {
        if (
          !e.target.closest(".track-dropdown") &&
          !e.target.closest(".play-button")
        ) {
          this.playTrack(tracks, index, context);
        }
      });
    });

    // Play button click
    container.querySelectorAll(".play-button").forEach((button, index) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        this.playTrack(tracks, index, context);
      });
    });

    // Dropdown functionality
    this.setupTrackDropdowns(container, context);
  }

  setupTrackDropdowns(container, context) {
    // Dropdown toggle
    container.querySelectorAll(".track-dropdown-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const dropdown = btn.nextElementSibling;

        // Close other dropdowns
        if (this.currentDropdown && this.currentDropdown !== dropdown) {
          this.currentDropdown.classList.remove("show");
        }

        // Toggle current dropdown
        dropdown.classList.toggle("show");
        this.currentDropdown = dropdown.classList.contains("show")
          ? dropdown
          : null;
      });
    });

    // Add to Queue
    container.querySelectorAll(".add-to-queue").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        this.addToQueue(songId);
        this.closeDropdowns();
      });
    });

    // Toggle Like
    container.querySelectorAll(".toggle-like").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        this.toggleLike(songId, btn);
        this.closeDropdowns();
      });
    });

    // Add to Playlist
    container.querySelectorAll(".add-to-playlist").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        this.showAddToPlaylistModal(songId);
        this.closeDropdowns();
      });
    });

    // Remove from Playlist card in plylist
    if (context === "playlist") {
      container.querySelectorAll(".remove-from-playlist").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const songId = btn.dataset.songId;
          this.removeFromPlaylist(songId);
          this.closeDropdowns();
        });
      });
    }
  }

  closeDropdowns() {
    if (this.currentDropdown) {
      this.currentDropdown.classList.remove("show");
      this.currentDropdown = null;
    }
  }

  showAddToPlaylistModal(songId) {
    console.log("📁 Opening add to playlist modal for song:", songId);

    if (window.playlistManager) {
      window.playlistManager.showAddToPlaylistModal(songId);
    } else {
      this.showToast("Playlist manager not available", "error");
    }
  }

  removeFromPlaylist(songId) {
    if (!this.currentPlaylistId || !window.playlistManager) {
      this.showToast("No playlist selected", "error");
      return;
    }

    if (confirm("Remove this song from playlist?")) {
      window.playlistManager.removeSongFromPlaylist(
        this.currentPlaylistId,
        songId
      );
      this.showPlaylistDetail(this.currentPlaylistId); // Refresh view
      this.showToast("Song removed from playlist", "success");
    }
  }

  deleteCurrentPlaylist() {
    if (!this.currentPlaylistId || !window.playlistManager) {
      this.showToast("No playlist selected", "error");
      return;
    }

    if (confirm("Are you sure you want to delete this playlist?")) {
      window.playlistManager.deletePlaylist(this.currentPlaylistId);
      this.showView("home");
      this.showToast("Playlist deleted", "success");
    }
  }

  // add song
  showPlaylistDetail(playlistId) {
    if (!window.playlistManager) return;

    const playlist = window.playlistManager.getPlaylistById(playlistId);
    if (!playlist) return;

    this.currentPlaylistId = playlistId;

    // Update if add sogn
    const titleEl = document.getElementById("detailPlaylistTitle");
    const descEl = document.getElementById("detailPlaylistDescription");
    const coverEl = document.getElementById("detailPlaylistCover");
    const statsEl = document.getElementById("detailPlaylistStats");

    if (titleEl) titleEl.textContent = playlist.name;
    if (descEl) descEl.textContent = playlist.description || "No description";
    if (coverEl)
      coverEl.src = window.playlistManager.generatePlaylistCover(playlist);
    if (statsEl) statsEl.textContent = `${playlist.songs.length} songs`;

    // Show songs
    const playlistSongs = window.playlistManager.getPlaylistSongs(playlistId);
    this.renderTracksGrid(playlistSongs, "playlistDetailGrid", "playlist");

    this.showView("playlistDetail");
  }

  playPlaylistSongs() {
    if (!this.currentPlaylistId || !window.playlistManager) return;

    const playlistSongs = window.playlistManager.getPlaylistSongs(
      this.currentPlaylistId
    );
    if (playlistSongs.length) {
      this.playTrack(playlistSongs, 0, "playlist");
    }
  }

  //  QUEUE

  addToQueue(songId) {
    const song = this.songs.find((s) => s.id === songId);
    if (song) {
      this.queue.push(song);
      this.updateQueueUI();
      this.showToast(`"${song.title}" added to queue`, "success");
    } else {
      this.showToast("Song not found", "error");
    }
  }

  removeFromQueue(index) {
    if (index >= 0 && index < this.queue.length) {
      const removedSong = this.queue.splice(index, 1)[0];
      this.updateQueueUI();
      this.showToast(`"${removedSong.title}" removed from queue`, "success");
    }
  }

  clearQueue() {
    if (this.queue.length > 0) {
      this.queue = [];
      this.updateQueueUI();
      this.showToast("Queue cleared", "success");
    }
  }

  updateQueueUI() {
    const queueBadge = document.getElementById("queueBadge");
    const queueCount = document.getElementById("queueCount");

    if (queueBadge) {
      if (this.queue.length > 0) {
        queueBadge.textContent =
          this.queue.length > 99 ? "99+" : this.queue.length;
        queueBadge.classList.add("show");
      } else {
        queueBadge.classList.remove("show");
      }
    }

    if (queueCount) {
      queueCount.textContent = `${this.queue.length} ${
        this.queue.length === 1 ? "song" : "songs"
      } in queue`;
    }
  }

  showQueueModal() {
    const modal = document.getElementById("queueModal");
    if (modal) {
      this.renderQueueList();
      modal.style.display = "flex";
    }
  }

  renderQueueList() {
    const queueList = document.getElementById("queueList");
    if (!queueList) return;

    if (this.queue.length === 0) {
      queueList.innerHTML = `
        <div class="empty-state">
          <p>No songs in queue</p>
          <p class="queue-help">Add songs to queue from track dropdown menu</p>
        </div>
      `;
      return;
    }

    queueList.innerHTML = this.queue
      .map(
        (song, index) => `
      <div class="queue-item" data-queue-index="${index}">
        <img src="${song.cover_path || "assets/images/default-cover.jpg"}" 
             alt="${song.title}" 
             class="queue-item-cover"
             onerror="this.src='assets/images/default-cover.jpg'">
        <div class="queue-item-info">
          <div class="queue-item-title">${song.title}</div>
          <div class="queue-item-artist">${song.artist}</div>
        </div>
        <div class="queue-item-actions">
          <button class="btn-queue-action play" data-queue-index="${index}" title="Play Now">
            <i class="bi bi-play-fill"></i>
          </button>
          <button class="btn-queue-action remove" data-queue-index="${index}" title="Remove from Queue">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
    `
      )
      .join("");

    // Add event listeners for queue items
    queueList.querySelectorAll(".btn-queue-action.play").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.queueIndex);
        this.playFromQueue(index);
      });
    });

    queueList.querySelectorAll(".btn-queue-action.remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.queueIndex);
        this.removeFromQueue(index);
      });
    });
  }

  playFromQueue(index) {
    if (index >= 0 && index < this.queue.length) {
      const song = this.queue[index];
      this.queue.splice(index, 1);
      this.updateQueueUI();

      const songIndex = this.songs.findIndex((s) => s.id === song.id);
      if (songIndex !== -1) {
        this.playTrack(this.songs, songIndex, "queue");
      }

      document.getElementById("queueModal").style.display = "none";
    }
  }

  // LIKED

  toggleLike(songId, button) {
    if (window.playlistManager) {
      window.playlistManager.toggleLikeSong(songId);
      const isLiked = window.playlistManager.isSongLiked(songId);

      if (button) {
        button.innerHTML = `
          <i class="bi bi-heart${isLiked ? "-fill" : ""}"></i> 
          ${isLiked ? "Remove from Liked" : "Add to Liked"}
        `;
        button.classList.toggle("liked", isLiked);
      }

      this.showToast(
        isLiked ? "Added to liked songs" : "Removed from liked songs",
        "success"
      );
    }
  }

  showLikedSongs() {
    if (window.playlistManager) {
      const likedSongs = window.playlistManager.getLikedSongs();
      this.renderTracksGrid(likedSongs, "likedSongsGrid", "liked");

      // Update stats
      const statsEl = document.getElementById("likedSongsStats");
      if (statsEl) statsEl.textContent = `${likedSongs.length} songs`;
    }
  }

  playLikedSongs() {
    if (window.playlistManager) {
      const likedSongs = window.playlistManager.getLikedSongs();
      if (likedSongs.length) {
        this.playTrack(likedSongs, 0, "liked");
      }
    }
  }

  // PLAYBACK SYSTEM belum jadi masi eroro

  playTrack(tracks, trackIndex, context) {
    if (!tracks[trackIndex]) return;

    const track = tracks[trackIndex];
    this.currentSongIndex = trackIndex;
    this.currentTrackList = tracks;

    // Update player UI
    const titleEl = document.getElementById("currentTitle");
    const artistEl = document.getElementById("currentArtist");
    const coverEl = document.getElementById("currentCover");

    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    if (coverEl)
      coverEl.src = track.cover_path || "assets/images/default-cover.jpg";

    // Play audio
    if (window.audioPlayer) {
      window.audioPlayer.playSong(track.file_path);
      this.isPlaying = true;
      this.updatePlayButton();
    }

    // like button
    if (window.playlistManager) {
      window.playlistManager.updatePlayerLikeButton(track.id);
    }
  }

  togglePlayPause() {
    if (window.audioPlayer) {
      window.audioPlayer.togglePlay();
      this.isPlaying = window.audioPlayer.isPlaying;
      this.updatePlayButton();
    }
  }

  updatePlayButton() {
    const playPauseBtn = document.getElementById("playPauseBtn");
    if (playPauseBtn) {
      playPauseBtn.innerHTML = `<i class="bi bi-${
        this.isPlaying ? "pause" : "play"
      }-fill"></i>`;
    }
  }

  playNext() {
    if (this.queue.length > 0) {
      const nextSong = this.queue.shift();
      this.updateQueueUI();
      const trackIndex = this.songs.findIndex(
        (song) => song.id === nextSong.id
      );
      if (trackIndex !== -1) {
        this.playTrack(this.songs, trackIndex, "queue");
        return;
      }
    }

    if (this.currentSongIndex !== -1 && this.currentTrackList.length > 0) {
      const nextIndex =
        (this.currentSongIndex + 1) % this.currentTrackList.length;
      this.playTrack(this.currentTrackList, nextIndex);
    }
  }

  playPrevious() {
    if (this.currentSongIndex !== -1 && this.currentTrackList.length > 0) {
      const prevIndex =
        this.currentSongIndex > 0
          ? this.currentSongIndex - 1
          : this.currentTrackList.length - 1;
      this.playTrack(this.currentTrackList, prevIndex);
    }
  }
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM Content Loaded - Starting MePlay App");

  try {
    window.mePlayApp = new MePlayApp();
  } catch (error) {
    console.error("💥 Failed to initialize MePlay App:", error);

    // Show errorro
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #e74c3c;
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 10000;
      text-align: center;
    `;
    errorDiv.innerHTML = `
      <h3>App Error</h3>
      <p>Failed to initialize music player</p>
      <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: white; color: #e74c3c; border: none; border-radius: 4px; cursor: pointer;">
        Reload Page
      </button>
    `;
    document.body.appendChild(errorDiv);
  }
});
