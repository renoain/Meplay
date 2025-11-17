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
    this.isShuffled = false;
    this.isRepeated = false;
    this.likedSongs = new Set();

    this.initializeApp();
  }

  async initializeApp() {
    console.log(" Initializing MePlay App...");

    await this.loadSongs();
    await this.loadLikedSongs();

    // Initialize AudioPlayer FIRST before other managers
    this.initializeAudioPlayer();

    this.initializeManagers();
    this.setupEventListeners();
    this.setupQueueButton();
    this.showView("home");
    this.loadHomeContent();
    this.setupUserUI();
    this.setupUserDropdown();

    console.log(" App initialized successfully");
    console.log(" Loaded songs:", this.songs.length);
    console.log(" Loaded liked songs:", this.likedSongs.size);
  }

  // PERBAIKAN: Initialize AudioPlayer terlebih dahulu
  initializeAudioPlayer() {
    if (typeof AudioPlayer !== "undefined") {
      window.audioPlayer = new AudioPlayer();
      console.log(
        " Audio Player initialized with methods:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(window.audioPlayer))
      );
    } else {
      console.error(" AudioPlayer class not found");
      // Fallback: create minimal audio player
      this.createFallbackAudioPlayer();
    }
  }

  // Fallback audio player jika AudioPlayer tidak tersedia
  createFallbackAudioPlayer() {
    console.log(" Creating fallback audio player");
    window.audioPlayer = {
      audio: new Audio(),
      currentSong: null,
      isPlaying: false,

      playSong: function (filePath, track = null) {
        return new Promise((resolve, reject) => {
          try {
            console.log(" Fallback player playing:", filePath);
            this.audio.src = filePath;
            this.currentSong = track;

            this.audio
              .play()
              .then(() => {
                this.isPlaying = true;
                console.log(" Fallback player started");
                resolve();
              })
              .catch((error) => {
                console.error(" Fallback player error:", error);
                reject(error);
              });
          } catch (error) {
            console.error(" Fallback player exception:", error);
            reject(error);
          }
        });
      },

      togglePlay: function () {
        if (this.isPlaying) {
          this.audio.pause();
          this.isPlaying = false;
        } else {
          this.audio
            .play()
            .then(() => {
              this.isPlaying = true;
            })
            .catch((error) => {
              console.error(" Toggle play error:", error);
            });
        }
      },

      setVolume: function (volume) {
        this.audio.volume = volume / 100;
      },

      // Method tambahan untuk kompatibilitas
      play: function () {
        return this.audio.play();
      },

      pause: function () {
        this.audio.pause();
        this.isPlaying = false;
      },
    };
    console.log(" Fallback audio player created");
  }

  initializeManagers() {
    // Playlist Manager
    if (typeof PlaylistManager !== "undefined") {
      window.playlistManager = new PlaylistManager();
      console.log(" Playlist Manager initialized");
    }

    // Search Manager
    setTimeout(() => {
      if (typeof SearchManager !== "undefined") {
        window.searchManager = new SearchManager();
        console.log(" Search Manager initialized");
      }
    }, 500);

    // Genre Manager
    setTimeout(() => {
      if (typeof GenreManager !== "undefined") {
        window.genreManager = new GenreManager();
        console.log(" Genre Manager initialized");
      }
    }, 1000);
  }

  // LIKED SONGS SYSTEM
  async loadLikedSongs() {
    try {
      console.log(" Loading liked songs...");
      const response = await fetch("api/likes.php?action=get_liked_songs");

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.likedSongs = new Set(
            result.data.map((song) => song.id.toString())
          );
          console.log(
            " Loaded liked songs from database:",
            this.likedSongs.size
          );
          return;
        }
      }

      console.log(" Falling back to localStorage for liked songs");
      await this.loadLikedSongsFromLocalStorage();
    } catch (error) {
      console.error(" Error loading liked songs:", error);
      await this.loadLikedSongsFromLocalStorage();
    }
  }

  async loadLikedSongsFromLocalStorage() {
    try {
      const stored = localStorage.getItem("meplay_liked_songs");
      if (stored) {
        const likedIds = JSON.parse(stored);
        this.likedSongs = new Set(likedIds);
        console.log(
          " Loaded liked songs from localStorage:",
          this.likedSongs.size
        );
      } else {
        console.log("ℹ️ No liked songs found in localStorage");
        this.likedSongs = new Set();
      }
    } catch (e) {
      console.error(" Error parsing localStorage liked songs:", e);
      this.likedSongs = new Set();
    }
  }

  saveLikedSongs() {
    try {
      const likedArray = Array.from(this.likedSongs);
      localStorage.setItem("meplay_liked_songs", JSON.stringify(likedArray));
    } catch (error) {
      console.error(" Error saving liked songs:", error);
    }
  }

  isSongLiked(songId) {
    return this.likedSongs.has(songId.toString());
  }

  async toggleLike(songId, button = null) {
    const songIdStr = songId.toString();
    const wasLiked = this.likedSongs.has(songIdStr);

    try {
      let response, result;

      if (wasLiked) {
        response = await fetch("api/likes.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unlike_song",
            song_id: songIdStr,
          }),
        });
      } else {
        response = await fetch("api/likes.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "like_song",
            song_id: songIdStr,
          }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(" HTTP error response:", errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(
            errorJson.message || `HTTP error! status: ${response.status}`
          );
        } catch (e) {
          throw new Error(
            `HTTP error! status: ${
              response.status
            }. Response: ${errorText.substring(0, 100)}`
          );
        }
      }

      const responseText = await response.text();
      console.log(" Raw response:", responseText);

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(" JSON parse error:", parseError);
        console.error(" Response that failed to parse:", responseText);

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
            console.log(" Extracted JSON from response");
          } catch (e) {
            throw new Error(
              "Invalid JSON in response: " + responseText.substring(0, 200)
            );
          }
        } else {
          throw new Error(
            "No valid JSON found in response: " + responseText.substring(0, 200)
          );
        }
      }

      if (result.success) {
        if (wasLiked) {
          this.likedSongs.delete(songIdStr);
        } else {
          this.likedSongs.add(songIdStr);
        }
        this.saveLikedSongs();

        this.updateLikeButtonUI(songIdStr, button);
        this.refreshAllLikeStatuses();

        this.showToast(
          wasLiked ? "Removed from liked songs" : " Added to liked songs",
          "success"
        );

        console.log(` Song ${songIdStr} ${wasLiked ? "unliked" : "liked"}`);
      } else {
        throw new Error(result.message || "Unknown error from server");
      }
    } catch (error) {
      console.error(" Error toggling like:", error);

      if (wasLiked) {
        this.likedSongs.delete(songIdStr);
      } else {
        this.likedSongs.add(songIdStr);
      }
      this.saveLikedSongs();
      this.updateLikeButtonUI(songIdStr, button);

      this.showToast(
        wasLiked ? " Removed from liked songs" : " Added to liked songs",
        "success"
      );
    }
  }

  updateLikeButtonUI(songId, button = null) {
    const isLiked = this.isSongLiked(songId);

    if (button) {
      button.innerHTML = `
        <i class="bi bi-heart${isLiked ? "-fill" : ""}"></i> 
        ${isLiked ? "Remove from Liked" : "Add to Liked"}
      `;
      button.classList.toggle("liked", isLiked);
    }

    if (
      window.audioPlayer &&
      window.audioPlayer.currentSong &&
      window.audioPlayer.currentSong.id.toString() === songId
    ) {
      this.updatePlayerLikeButton(songId);
    }
  }

  refreshAllLikeStatuses() {
    document.querySelectorAll(".toggle-like").forEach((button) => {
      const songId = button.dataset.songId;
      if (songId) {
        this.updateLikeButtonUI(songId, button);
      }
    });

    if (this.currentView === "liked") {
      this.showLikedSongs();
    }
  }

  getLikedSongs() {
    return this.songs.filter((song) => this.likedSongs.has(song.id.toString()));
  }

  // load song
  async loadSongs() {
    try {
      console.log(" Loading songs...");

      const response = await fetch("api/songs.php?action=get_songs");

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          this.songs = result.data.map((song) => {
            return {
              id: song.id.toString(),
              title: song.title || "Unknown Title",
              artist: song.artist || "Unknown Artist",
              album: song.album || "",
              genre: song.genre || "",
              duration: song.duration || "0:00",
              file_path: song.file_path || "",
              cover_path: song.cover_path || "assets/images/default-cover.jpg",
              created_at: song.created_at || new Date().toISOString(),
            };
          });
          console.log(" Loaded songs from database:", this.songs.length);
          return;
        }
      }

      console.log(" Loading from JSON file...");
      const jsonResponse = await fetch("data/songs.json");
      if (jsonResponse.ok) {
        const data = await jsonResponse.json();
        this.songs = data.songs || data;
        console.log(" Loaded songs from JSON:", this.songs.length);
      } else {
        throw new Error("JSON file not found");
      }
    } catch (error) {
      console.error(" Error loading songs:", error);
      this.songs = this.getFallbackSongs();
      console.log(" Using fallback songs:", this.songs.length);
    }
  }

  async loadSongsFromDatabase() {
    try {
      console.log(" Loading songs from database...");

      const response = await fetch("api/songs.php?action=get_songs");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        this.songs = result.data.map((song) => {
          return {
            id: song.id.toString(),
            title: song.title || "Unknown Title",
            artist: song.artist || "Unknown Artist",
            album: song.album || "",
            genre: song.genre || "",
            duration: song.duration || "0:00",
            file_path: song.file_path || "",
            cover_path: song.cover_path || "assets/images/default-cover.jpg",
            created_at: song.created_at || new Date().toISOString(),
          };
        });

        console.log(
          " SUCCESS: Loaded",
          this.songs.length,
          "songs from database"
        );
        return true;
      } else {
        throw new Error(result.message || "Invalid data format from server");
      }
    } catch (error) {
      console.error(" ERROR loading songs from database:", error);
      return false;
    }
  }

  getFallbackSongs() {
    return [
      {
        id: "1",
        title: "All I Need",
        artist: "Radiohead",
        album: "In Rainbows",
        file_path: "assets/audio/All I Need.mp3",
        cover_path: "assets/images/radiohead.jpg",
        duration: "3:48",
        genre: "Alternative Rock",
      },
      {
        id: "2",
        title: "Be Quiet and Drive",
        artist: "Deftones",
        album: "Around the Fur",
        file_path: "assets/audio/Be Quiet and Drive.mp3",
        cover_path: "assets/images/deftones.jpg",
        duration: "4:33",
        genre: "Alternative Metal",
      },
      {
        id: "3",
        title: "Cherry Waves",
        artist: "Deftones",
        album: "Saturday Night Wrist",
        file_path: "assets/audio/Cherry Waves.mp3",
        cover_path: "assets/images/deftones2.jpg",
        duration: "5:18",
        genre: "Alternative Metal",
      },
    ];
  }

  // EVENT LISTENERS
  setupEventListeners() {
    console.log("🔧 Setting up event listeners...");

    this.setupNavigation();
    this.setupPlaylistButtons();
    this.setupAdminButtons();
    this.setupPlayerControls();
    this.setupQueueControls();
    this.setupModalHandlers();
    this.setupGlobalEventListeners();

    console.log(" Event listeners setup complete");
  }

  setupNavigation() {
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
  }

  setupPlaylistButtons() {
    const sidebarCreateBtn = document.getElementById("sidebarCreatePlaylist");
    const createPlaylistBtn = document.getElementById("createPlaylistBtn");

    if (sidebarCreateBtn) {
      sidebarCreateBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showCreatePlaylistModal();
      });
    }

    if (createPlaylistBtn) {
      createPlaylistBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showCreatePlaylistModal();
      });
    }

    const playLikedBtn = document.getElementById("playLikedSongs");
    const playPlaylistBtn = document.getElementById("playPlaylistSongs");

    if (playLikedBtn) {
      playLikedBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.playLikedSongs();
      });
    }

    if (playPlaylistBtn) {
      playPlaylistBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.playPlaylistSongs();
      });
    }

    const deletePlaylistBtn = document.getElementById("deletePlaylistBtn");
    if (deletePlaylistBtn) {
      deletePlaylistBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.deleteCurrentPlaylist();
      });
    }
  }

  setupAdminButtons() {
    const addSongBtn = document.getElementById("addSongBtn");
    if (addSongBtn) {
      addSongBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log(" Add Song Button CLICKED!");
        this.showAddSongModal();
      });
    }

    const refreshStatsBtn = document.getElementById("refreshStatsBtn");
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener("click", () => {
        this.refreshAdminStats();
      });
    }
  }

  // Play/Pause
  setupPlayerControls() {
    const playPauseBtn = document.getElementById("playPauseBtn");
    if (playPauseBtn) {
      playPauseBtn.addEventListener("click", () => {
        this.togglePlayPause();
      });
    }

    // Previous/Next
    const prevBtn = document.getElementById("prevBtn");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        this.playPrevious();
      });
    }

    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        this.playNext();
      });
    }

    // Shuffle/Repeat
    const shuffleBtn = document.getElementById("shuffleBtn");
    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", () => {
        this.toggleShuffle();
      });
    }

    const repeatBtn = document.getElementById("repeatBtn");
    if (repeatBtn) {
      repeatBtn.addEventListener("click", () => {
        this.toggleRepeat();
      });
    }

    // Volume control
    const volumeControl = document.getElementById("volumeControl");
    if (volumeControl && window.audioPlayer) {
      volumeControl.addEventListener("input", (e) => {
        if (window.audioPlayer.setVolume) {
          window.audioPlayer.setVolume(e.target.value);
        } else if (window.audioPlayer.audio) {
          window.audioPlayer.audio.volume = e.target.value / 100;
        }
      });
    }

    // Progress bar
    const progressBar = document.getElementById("progressBar");
    if (progressBar) {
      progressBar.addEventListener("click", (e) => {
        this.seekAudio(e);
      });
    }

    // Like button in player
    const playerLikeBtn = document.getElementById("playerLikeBtn");
    if (playerLikeBtn) {
      playerLikeBtn.addEventListener("click", () => {
        this.toggleCurrentSongLike();
      });
    }
  }

  setupQueueControls() {
    const queueBtn = document.getElementById("queueBtn");
    if (queueBtn) {
      queueBtn.addEventListener("click", () => {
        this.showQueueModal();
      });
    }

    const clearQueueBtn = document.getElementById("clearQueueBtn");
    if (clearQueueBtn) {
      clearQueueBtn.addEventListener("click", () => {
        this.clearQueue();
      });
    }

    const addToPlaylistBtn = document.getElementById("addToPlaylistBtn");
    if (addToPlaylistBtn) {
      addToPlaylistBtn.addEventListener("click", () => {
        this.showAddToPlaylistForCurrent();
      });
    }
  }

  setupModalHandlers() {
    this.setupAddSongModal();
    this.setupCreatePlaylistModal();
    this.setupQueueModalHandlers();
    this.setupAddToPlaylistModal();
  }

  setupAddToPlaylistModal() {
    const modal = document.getElementById("addToPlaylistModal");
    if (!modal) return;

    const closeBtn = modal.querySelector(".close-modal");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
      });
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });

    const createNewBtn = document.getElementById("createNewPlaylistFromModal");
    if (createNewBtn) {
      createNewBtn.addEventListener("click", () => {
        modal.style.display = "none";
        this.showCreatePlaylistModal();
      });
    }
  }

  setupGlobalEventListeners() {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".track-dropdown") && this.currentDropdown) {
        this.currentDropdown.classList.remove("show");
        this.currentDropdown = null;
      }

      if (!e.target.closest(".user-dropdown")) {
        document.getElementById("userDropdown")?.classList.remove("show");
      }
    });

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

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          this.togglePlayPause();
          break;
        case "ArrowRight":
          if (e.ctrlKey) this.playNext();
          break;
        case "ArrowLeft":
          if (e.ctrlKey) this.playPrevious();
          break;
      }
    });
  }

  setupUserDropdown() {
    const dropdownBtn = document.getElementById("userDropdownBtn");
    const dropdown = document.getElementById("userDropdown");

    if (dropdownBtn && dropdown) {
      console.log("👤 Setting up user dropdown...");

      dropdownBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("👤 User dropdown clicked");
        dropdown.classList.toggle("show");
      });

      document.addEventListener("click", (e) => {
        if (
          !e.target.closest(".user-dropdown") &&
          dropdown.classList.contains("show")
        ) {
          dropdown.classList.remove("show");
        }
      });

      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("🚪 Logout clicked");
          this.logout();
        });
      }

      const profileBtn = document.getElementById("profileBtn");
      if (profileBtn) {
        profileBtn.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("👤 Profile clicked");
          this.showToast("Profile feature coming soon!", "info");
          dropdown.classList.remove("show");
        });
      }

      const settingsBtn = document.getElementById("settingsBtn");
      if (settingsBtn) {
        settingsBtn.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("⚙️ Settings clicked");
          this.showToast("Settings feature coming soon!", "info");
          dropdown.classList.remove("show");
        });
      }

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && dropdown.classList.contains("show")) {
          dropdown.classList.remove("show");
        }
      });
    } else {
      console.log(" User dropdown elements not found");
    }
  }

  setupUserUI() {
    const userName = document.getElementById("dropdownUserName");
    const userRole = document.getElementById("dropdownUserRole");

    if (userName) userName.textContent = "User";
    if (userRole) userRole.textContent = "USER";

    this.showAdminFeatures();
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

  // VIEW MANAGEMENT
  showView(viewName) {
    console.log(" Switching to view:", viewName);

    document.querySelectorAll(".view").forEach((view) => {
      view.classList.remove("active");
    });

    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
      targetView.classList.add("active");
      this.currentView = viewName;
    }

    document
      .querySelector(`.nav-item[data-section="${viewName}"]`)
      ?.classList.add("active");

    this.loadViewContent(viewName);
  }

  loadViewContent(viewName) {
    switch (viewName) {
      case "home":
        this.loadHomeContent();
        break;
      case "search":
        this.loadSearchContent();
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
      case "playlistDetail":
        break;
      default:
        console.log("Unknown view:", viewName);
    }
  }

  loadHomeContent() {
    this.renderTracksGrid(this.songs, "allSongsGrid", "all");

    const recentlyPlayed = this.getRecentlyPlayed();
    this.renderTracksGrid(recentlyPlayed, "recentlyPlayedGrid", "recent");

    const popularSongs = this.getPopularSongs();
    if (popularSongs.length > 0) {
      // Optional: Add popular songs section
    }
  }

  loadSearchContent() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput && searchInput.value.trim()) {
      window.searchManager?.performSearch(searchInput.value);
    }
  }

  loadAdminContent() {
    this.refreshAdminStats();
    this.renderSongsTable();
  }

  // SONG MANAGEMENT
  setupAddSongModal() {
    const modal = document.getElementById("addSongModal");
    if (!modal) return;

    modal.querySelector(".close-modal")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    modal.querySelector(".btn-cancel")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    const saveBtn = document.getElementById("saveSongBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        this.saveNewSong();
      });
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });

    modal.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.saveNewSong();
      }
    });
  }

  showAddSongModal() {
    const modal = document.getElementById("addSongModal");
    if (modal) {
      modal.style.display = "flex";

      setTimeout(() => {
        const titleInput = document.getElementById("songTitle");
        if (titleInput) {
          titleInput.focus();
        }
      }, 100);
    }
  }

  async saveNewSong() {
    console.log("💾 saveNewSong method called!");

    const title = document.getElementById("songTitle")?.value.trim();
    const artist = document.getElementById("songArtist")?.value.trim();
    const album = document.getElementById("songAlbum")?.value.trim();
    const genre = document.getElementById("songGenre")?.value.trim();
    const duration = document.getElementById("songDuration")?.value.trim();
    const audioPath = document.getElementById("audioPath")?.value.trim();
    const coverPath = document.getElementById("coverPath")?.value.trim();

    console.log("Form data:", { title, artist, audioPath });

    if (!title || !artist || !audioPath) {
      this.showToast(
        " Please fill in required fields: Title, Artist, and Audio Path",
        "error"
      );
      return;
    }

    const saveBtn = document.getElementById("saveSongBtn");
    const originalText = saveBtn.textContent;
    saveBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
      console.log(" Saving to database...");

      const songData = {
        title: title,
        artist: artist,
        album: album || "",
        genre: genre || "",
        duration: duration || "0:00",
        file_path: audioPath,
        cover_path: coverPath || "assets/images/default-cover.jpg",
      };

      const success = await this.saveToDatabase(songData);

      if (success) {
        console.log(" Song saved to database successfully");

        document.getElementById("addSongModal").style.display = "none";
        this.clearAddSongForm();

        this.showToast(" Song added successfully!", "success");

        setTimeout(async () => {
          console.log(" FORCE RELOADING songs from database...");
          await this.loadSongsFromDatabase();

          console.log(" Songs after reload:", this.songs.length);
          console.log(" Newest song:", this.songs[0]);

          this.updateAllUI();

          this.loadViewContent(this.currentView);

          if (this.currentView === "home") {
            this.loadHomeContent();
          }

          if (this.currentView === "admin") {
            this.loadAdminContent();
          }

          console.log(" UI should be updated with new song");
        }, 500);
      } else {
        this.showToast(" Failed to save song to database", "error");
      }
    } catch (error) {
      console.error(" Error adding song:", error);
      this.showToast(" Error saving song: " + error.message, "error");
    } finally {
      saveBtn.textContent = "Add Song";
      saveBtn.disabled = false;
    }
  }

  async saveToDatabase(songData) {
    try {
      console.log(" Saving song to database:", songData);

      const response = await fetch("api/songs.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add_song",
          ...songData,
        }),
      });

      console.log(" Response status:", response.status);

      const responseText = await response.text();
      console.log(" Raw response:", responseText);

      const cleanResponse = responseText
        .replace(/<script>[\s\S]*?<\/script>/g, "")
        .trim();

      let result;
      try {
        result = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error(" JSON parse error:", parseError);
        console.error(" Cleaned response:", cleanResponse);

        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
            console.log(" Extracted JSON from response");
          } catch (e) {
            throw new Error("Invalid JSON in response");
          }
        } else {
          throw new Error("No valid JSON found in response");
        }
      }

      console.log(" Parsed result:", result);

      if (result.success) {
        console.log(" Song saved to database successfully");
        return true;
      } else {
        console.error(" Server returned error:", result.message);
        throw new Error(result.message || "Failed to save song");
      }
    } catch (error) {
      console.error(" Database save error:", error);

      let errorMessage = "Failed to save song to database";
      if (error.message.includes("JSON") || error.message.includes("script")) {
        errorMessage =
          "Server configuration error. Song saved but response invalid.";
        return true;
      } else {
        errorMessage = error.message;
      }

      this.showToast(errorMessage, "error");
      return false;
    }
  }

  clearAddSongForm() {
    document.getElementById("songTitle").value = "";
    document.getElementById("songArtist").value = "";
    document.getElementById("songAlbum").value = "";
    document.getElementById("songGenre").value = "";
    document.getElementById("songDuration").value = "0:00";
    document.getElementById("audioPath").value = "";
    document.getElementById("coverPath").value = "";
  }

  playTrack(tracks, trackIndex, context = "all") {
    if (!tracks[trackIndex]) {
      console.error(" Track not found at index:", trackIndex);
      return;
    }

    const track = tracks[trackIndex];
    console.log(" Playing track:", track.title, "from:", track.file_path);

    this.currentSongIndex = trackIndex;
    this.currentTrackList = tracks;
    this.currentPlayContext = context;

    this.updatePlayerUI(track);

    // Check if audioPlayer exists and has playSong method
    if (window.audioPlayer) {
      console.log(
        " AudioPlayer available, methods:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(window.audioPlayer))
      );

      if (typeof window.audioPlayer.playSong === "function") {
        window.audioPlayer
          .playSong(track.file_path, track)
          .then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.updatePlayerLikeButton(track.id);
            this.addToRecentlyPlayed(track);
            this.incrementPlayCount(track.id);
            console.log(" Track playback started successfully");
          })
          .catch((error) => {
            console.error(" Error in playTrack:", error);
            this.showToast("Error playing song: " + error.message, "error");
          });
      } else {
        console.error(" playSong method not found in audioPlayer");
        this.showToast("Audio player not properly initialized", "error");
      }
    } else {
      console.error(" Audio player not available");
      this.showToast("Audio player not available", "error");
    }
  }

  updatePlayerUI(track) {
    const titleEl = document.getElementById("currentTitle");
    const artistEl = document.getElementById("currentArtist");
    const coverEl = document.getElementById("currentCover");

    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    if (coverEl) {
      coverEl.src = track.cover_path || "assets/images/default-cover.jpg";
      coverEl.onerror = () => {
        coverEl.src = "assets/images/default-cover.jpg";
      };
    }
  }

  updatePlayerLikeButton(songId) {
    const likeBtn = document.getElementById("playerLikeBtn");
    if (!likeBtn) return;

    const isLiked = this.isSongLiked(songId);
    likeBtn.classList.toggle("liked", isLiked);
    likeBtn.innerHTML = `<i class="bi bi-heart${isLiked ? "-fill" : ""}"></i>`;
  }

  toggleCurrentSongLike() {
    if (!window.audioPlayer || !window.audioPlayer.currentSong) return;

    const songId = window.audioPlayer.currentSong.id;
    this.toggleLike(songId);
    this.updatePlayerLikeButton(songId);
  }

  togglePlayPause() {
    if (
      window.audioPlayer &&
      typeof window.audioPlayer.togglePlay === "function"
    ) {
      window.audioPlayer.togglePlay();
      this.isPlaying = window.audioPlayer.isPlaying;
      this.updatePlayButton();
    } else {
      console.error(" togglePlay method not available");
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
    console.log("playNext called - Queue length:", this.queue.length);

    if (this.queue.length > 0) {
      console.log(" Playing from queue");
      this.playFromQueue(0);
      return;
    }

    if (this.currentSongIndex !== -1 && this.currentTrackList.length > 0) {
      let nextIndex;

      if (this.isShuffled) {
        nextIndex = Math.floor(Math.random() * this.currentTrackList.length);
        console.log(" Shuffled next index:", nextIndex);
      } else {
        nextIndex = (this.currentSongIndex + 1) % this.currentTrackList.length;
        console.log(" Normal next index:", nextIndex);
      }

      this.playTrack(this.currentTrackList, nextIndex);
    } else {
      console.log(" No current track or track list");
    }
  }

  playPrevious() {
    if (this.currentSongIndex !== -1 && this.currentTrackList.length > 0) {
      let prevIndex;

      if (this.isShuffled) {
        prevIndex = Math.floor(Math.random() * this.currentTrackList.length);
      } else {
        prevIndex =
          this.currentSongIndex > 0
            ? this.currentSongIndex - 1
            : this.currentTrackList.length - 1;
      }

      this.playTrack(this.currentTrackList, prevIndex);
    }
  }

  playFromQueue(index) {
    console.log(" playFromQueue called with index:", index);

    if (index >= 0 && index < this.queue.length) {
      const song = this.queue[index];
      console.log(" Playing from queue:", song.title);

      this.queue.splice(index, 1);
      this.updateQueueUI();

      const songIndex = this.songs.findIndex(
        (s) => s.id.toString() === song.id.toString()
      );
      if (songIndex !== -1) {
        console.log(" Found song in main list, playing...");
        this.playTrack(this.songs, songIndex, "queue");
      } else {
        console.log(
          " Song not found in main list, playing directly from queue data"
        );
        this.currentSongIndex = 0;
        this.currentTrackList = [song];
        this.updatePlayerUI(song);

        if (
          window.audioPlayer &&
          typeof window.audioPlayer.playSong === "function"
        ) {
          window.audioPlayer
            .playSong(song.file_path, song)
            .then(() => {
              this.isPlaying = true;
              this.updatePlayButton();
              this.updatePlayerLikeButton(song.id);
              this.addToRecentlyPlayed(song);
              this.incrementPlayCount(song.id);
            })
            .catch((error) => {
              console.error(" Error playing from queue:", error);
            });
        }
      }

      document.getElementById("queueModal").style.display = "none";
    } else {
      console.error(" Invalid queue index:", index);
    }
  }

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    const shuffleBtn = document.getElementById("shuffleBtn");
    if (shuffleBtn) {
      shuffleBtn.classList.toggle("active", this.isShuffled);
    }
    this.showToast(
      this.isShuffled ? " Shuffle enabled" : " Shuffle disabled",
      "info"
    );
  }

  toggleRepeat() {
    this.isRepeated = !this.isRepeated;
    const repeatBtn = document.getElementById("repeatBtn");
    if (repeatBtn) {
      repeatBtn.classList.toggle("active", this.isRepeated);
    }
    this.showToast(
      this.isRepeated ? "🔁 Repeat enabled" : "🔁 Repeat disabled",
      "info"
    );
  }

  seekAudio(e) {
    if (!window.audioPlayer || !window.audioPlayer.audio) return;

    const progressBar = e.currentTarget;
    const clickPosition = e.offsetX;
    const progressBarWidth = progressBar.offsetWidth;
    const percentage = clickPosition / progressBarWidth;

    window.audioPlayer.audio.currentTime =
      percentage * window.audioPlayer.audio.duration;
  }

  // QUEUE MANAGEMENT
  setupQueueButton() {
    this.updateQueueUI();
  }

  addToQueue(songId) {
    const song = this.songs.find((s) => s.id.toString() === songId.toString());
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

  // LIKED SONGS VIEW
  showLikedSongs() {
    const likedSongs = this.getLikedSongs();
    this.renderTracksGrid(likedSongs, "likedSongsGrid", "liked");

    const statsEl = document.getElementById("likedSongsStats");
    if (statsEl) statsEl.textContent = `${likedSongs.length} songs`;
  }

  playLikedSongs() {
    const likedSongs = this.getLikedSongs();
    if (likedSongs.length) {
      this.playTrack(likedSongs, 0, "liked");
    }
  }

  // PLAYLIST MANAGEMENT
  setupCreatePlaylistModal() {
    const modal = document.getElementById("createPlaylistModal");
    if (!modal) return;

    modal.querySelector(".close-modal")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    modal.querySelector(".btn-cancel")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    const saveBtn = modal.querySelector("#savePlaylistBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const nameInput = document.getElementById("playlistName");
        const descInput = document.getElementById("playlistDescription");

        const name = nameInput?.value.trim();
        const description = descInput?.value.trim();

        if (!name) {
          this.showToast(" Playlist name is required", "error");
          return;
        }

        console.log(" Creating playlist:", name);

        try {
          const result = await window.playlistManager.createPlaylist(
            name,
            description
          );

          if (result.success) {
            modal.style.display = "none";
            nameInput.value = "";
            descInput.value = "";

            this.showToast(" Playlist created successfully!", "success");
          } else {
            this.showToast(" Failed: " + result.message, "error");
          }
        } catch (error) {
          console.error(" Error:", error);
          this.showToast(" Error creating playlist", "error");
        }
      });
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  showCreatePlaylistModal() {
    const modal = document.getElementById("createPlaylistModal");
    const nameInput = document.getElementById("playlistName");

    if (modal && nameInput) {
      nameInput.value = "";
      document.getElementById("playlistDescription").value = "";
      modal.style.display = "flex";
      nameInput.focus();
    }
  }

  async showLibrary() {
    if (window.playlistManager) {
      const playlists = await window.playlistManager.getUserPlaylists();
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
            <p class="track-artist">${playlist.song_count || 0} songs</p>
            ${
              playlist.description
                ? `<p class="track-album">${playlist.description}</p>`
                : ""
            }
          </div>
        </div>
      `
        )
        .join("");

      container.querySelectorAll(".track-card").forEach((card) => {
        card.addEventListener("click", () => {
          const playlistId = card.dataset.playlistId;
          this.showPlaylistDetail(playlistId);
        });
      });
    }
  }

  async showPlaylistDetail(playlistId) {
    if (!window.playlistManager) return;

    const playlist = window.playlistManager.getPlaylistById(playlistId);
    if (!playlist) return;

    this.currentPlaylistId = playlistId;

    const titleEl = document.getElementById("detailPlaylistTitle");
    const descEl = document.getElementById("detailPlaylistDescription");
    const coverEl = document.getElementById("detailPlaylistCover");
    const statsEl = document.getElementById("detailPlaylistStats");

    if (titleEl) titleEl.textContent = playlist.name;
    if (descEl) descEl.textContent = playlist.description || "No description";
    if (coverEl)
      coverEl.src = window.playlistManager.generatePlaylistCover(playlist);

    const playlistSongs = await window.playlistManager.getPlaylistSongs(
      playlistId
    );
    if (statsEl) statsEl.textContent = `${playlistSongs.length} songs`;

    this.renderTracksGrid(playlistSongs, "playlistDetailGrid", "playlist");
    this.showView("playlistDetail");
  }

  async playPlaylistSongs() {
    if (!this.currentPlaylistId || !window.playlistManager) return;

    const playlistSongs = await window.playlistManager.getPlaylistSongs(
      this.currentPlaylistId
    );
    if (playlistSongs.length) {
      this.playTrack(playlistSongs, 0, "playlist");
    }
  }

  async deleteCurrentPlaylist() {
    if (!this.currentPlaylistId || !window.playlistManager) {
      this.showToast("No playlist selected", "error");
      return;
    }

    if (confirm("Are you sure you want to delete this playlist?")) {
      try {
        const result = await window.playlistManager.deletePlaylist(
          this.currentPlaylistId
        );

        if (result.success) {
          this.showView("home");
          this.showToast("Playlist deleted successfully", "success");
        } else {
          this.showToast(
            result.message || "Failed to delete playlist",
            "error"
          );
        }
      } catch (error) {
        console.error(" Error deleting playlist:", error);
        this.showToast("Error deleting playlist", "error");
      }
    }
  }

  async removeFromPlaylist(songId) {
    if (!this.currentPlaylistId || !window.playlistManager) {
      this.showToast("No playlist selected", "error");
      return;
    }

    if (confirm("Remove this song from playlist?")) {
      try {
        const result = await window.playlistManager.removeSongFromPlaylist(
          this.currentPlaylistId,
          songId
        );

        if (result.success) {
          this.showPlaylistDetail(this.currentPlaylistId);
          this.showToast("Song removed from playlist", "success");
        } else {
          this.showToast(result.message || "Failed to remove song", "error");
        }
      } catch (error) {
        console.error(" Error removing from playlist:", error);
        this.showToast("Error removing song from playlist", "error");
      }
    }
  }

  showAddToPlaylistModal(songId) {
    if (window.playlistManager) {
      window.playlistManager.showAddToPlaylistModal(songId);
    } else {
      this.showToast("Playlist manager not available", "error");
    }
  }

  showAddToPlaylistForCurrent() {
    if (window.audioPlayer && window.audioPlayer.currentSong) {
      this.showAddToPlaylistModal(window.audioPlayer.currentSong.id);
    } else {
      this.showToast("No song currently playing", "error");
    }
  }

  // TRACK DISPLAY
  renderTracksGrid(tracks, containerId, context = "all") {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(" Container not found:", containerId);
      return;
    }

    console.log(` Rendering ${tracks.length} tracks to ${containerId}`);

    if (!tracks || tracks.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>No tracks found</p></div>';
      console.log(" No tracks to render for", containerId);
      return;
    }

    container.innerHTML = tracks
      .map((track, index) => {
        if (!track.id || !track.title) {
          console.warn(" Invalid track data:", track);
          return "";
        }

        const isLiked = this.isSongLiked(track.id);

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
          ${track.album ? `<p class="track-album">${track.album}</p>` : ""}
          ${
            track.genre
              ? `<small class="track-genre">${track.genre}</small>`
              : ""
          }
        </div>
      </div>
    `;
      })
      .join("");

    console.log(` Rendered ${tracks.length} tracks to ${containerId}`);

    this.setupTrackInteractions(container, tracks, context);
  }

  setupTrackInteractions(container, tracks, context) {
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

    container.querySelectorAll(".play-button").forEach((button, index) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        this.playTrack(tracks, index, context);
      });
    });

    this.setupTrackDropdowns(container, context);
  }

  setupTrackDropdowns(container, context) {
    container.querySelectorAll(".track-dropdown-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const dropdown = btn.nextElementSibling;

        if (this.currentDropdown && this.currentDropdown !== dropdown) {
          this.currentDropdown.classList.remove("show");
        }

        dropdown.classList.toggle("show");
        this.currentDropdown = dropdown.classList.contains("show")
          ? dropdown
          : null;
      });
    });

    container.querySelectorAll(".add-to-queue").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        this.addToQueue(songId);
        this.closeDropdowns();
      });
    });

    container.querySelectorAll(".toggle-like").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        this.toggleLike(songId, btn);
        this.closeDropdowns();
      });
    });

    container.querySelectorAll(".add-to-playlist").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        this.showAddToPlaylistModal(songId);
        this.closeDropdowns();
      });
    });

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

  // ADMIN FEATURES
  refreshAdminStats() {
    const totalSongs = document.getElementById("totalSongs");
    const totalLikes = document.getElementById("totalLikes");
    const totalPlaylists = document.getElementById("totalPlaylists");

    if (totalSongs) totalSongs.textContent = this.songs.length;
    if (totalLikes) totalLikes.textContent = this.likedSongs.size;
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
        '<tr><td colspan="6" class="text-center">No songs found</td></tr>';
      return;
    }

    tableBody.innerHTML = this.songs
      .map(
        (song) => `
            <tr>
                <td>${song.id}</td>
                <td>
                    <div class="song-info">
                        <img src="${
                          song.cover_path || "assets/images/default-cover.jpg"
                        }" 
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

    tableBody.querySelectorAll(".btn-table.delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        this.deleteSong(songId);
      });
    });
  }

  async deleteSong(songId) {
    if (
      !confirm(
        "Are you sure you want to delete this song? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      console.log("🗑️ Deleting song from database:", songId);

      const success = await this.deleteSongFromDatabase(songId);

      if (success) {
        this.songs = this.songs.filter((song) => song.id !== songId);

        if (this.likedSongs.has(songId)) {
          this.likedSongs.delete(songId);
          this.saveLikedSongs();
        }

        this.updateAllUI();

        this.showToast("Song deleted successfully from database!", "success");

        await this.loadSongsFromDatabase();
      } else {
        this.showToast("Failed to delete song from database", "error");
      }
    } catch (error) {
      console.error(" Error deleting song:", error);
      this.showToast("Error deleting song", "error");
    }
  }

  async deleteSongFromDatabase(songId) {
    try {
      const response = await fetch("api/songs.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete_song",
          song_id: songId,
        }),
      });

      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error(" Database delete error:", error);
      return false;
    }
  }

  // UTILITY METHODS
  updateAllUI() {
    console.log(" UPDATING ALL UI COMPONENTS...");
    console.log(" Current songs count:", this.songs.length);

    if (this.songs.length === 0) {
      console.warn(" No songs available to display");
    }

    const allSongsGrid = document.getElementById("allSongsGrid");
    if (allSongsGrid) {
      console.log(" Rendering all songs grid...");
      this.renderTracksGrid(this.songs, "allSongsGrid", "all");
    }

    const recentlyPlayedGrid = document.getElementById("recentlyPlayedGrid");
    if (recentlyPlayedGrid) {
      const recentlyPlayed = this.songs.slice(0, 6);
      console.log(" Rendering recently played:", recentlyPlayed.length);
      this.renderTracksGrid(recentlyPlayed, "recentlyPlayedGrid", "recent");
    }

    this.renderSongsTable();
    this.refreshAdminStats();

    if (this.currentView === "search" && window.searchManager) {
      const searchInput = document.getElementById("searchInput");
      if (searchInput && searchInput.value) {
        console.log(" Refreshing search results...");
        window.searchManager.performSearch(searchInput.value);
      }
    }

    if (this.currentView === "liked") {
      console.log(" Refreshing liked songs...");
      this.showLikedSongs();
    }

    if (this.currentView === "playlistDetail" && this.currentPlaylistId) {
      console.log(" Refreshing playlist detail...");
      this.showPlaylistDetail(this.currentPlaylistId);
    }

    if (window.genreManager && this.currentView === "home") {
      console.log(" Refreshing genres...");
      window.genreManager.organizeSongsByGenre();
      window.genreManager.renderGenreGrid();
    }

    setTimeout(() => {
      document.querySelectorAll(".tracks-grid").forEach((grid) => {
        grid.style.display = "none";
        setTimeout(() => {
          grid.style.display = "grid";
        }, 10);
      });
    }, 100);

    console.log(" ALL UI COMPONENTS UPDATED");
  }

  showToast(message, type = "success") {
    document.querySelectorAll(".toast").forEach((toast) => toast.remove());

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  logout() {
    localStorage.removeItem("meplay_songs");
    localStorage.removeItem("meplay_playlists");
    localStorage.removeItem("meplay_liked_songs");
    localStorage.removeItem("meplay_recently_played");
    localStorage.removeItem("meplay_play_counts");

    window.location.href = "login.php?logout=1";
  }

  getRecentlyPlayed() {
    const recentlyPlayed = JSON.parse(
      localStorage.getItem("meplay_recently_played") || "[]"
    );
    return recentlyPlayed
      .map((songId) => this.songs.find((s) => s.id === songId))
      .filter(Boolean)
      .slice(0, 6);
  }

  addToRecentlyPlayed(song) {
    let recentlyPlayed = JSON.parse(
      localStorage.getItem("meplay_recently_played") || "[]"
    );

    recentlyPlayed = recentlyPlayed.filter((id) => id !== song.id);
    recentlyPlayed.unshift(song.id);
    recentlyPlayed = recentlyPlayed.slice(0, 10);

    localStorage.setItem(
      "meplay_recently_played",
      JSON.stringify(recentlyPlayed)
    );
  }

  getPopularSongs() {
    const playCounts = JSON.parse(
      localStorage.getItem("meplay_play_counts") || "{}"
    );
    return this.songs
      .filter((song) => playCounts[song.id] > 0)
      .sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0))
      .slice(0, 6);
  }

  incrementPlayCount(songId) {
    const playCounts = JSON.parse(
      localStorage.getItem("meplay_play_counts") || "{}"
    );
    playCounts[songId] = (playCounts[songId] || 0) + 1;
    localStorage.setItem("meplay_play_counts", JSON.stringify(playCounts));
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM Content Loaded - Starting MePlay App");

  try {
    window.mePlayApp = new MePlayApp();
  } catch (error) {
    console.error("💥 Failed to initialize MePlay App:", error);

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
