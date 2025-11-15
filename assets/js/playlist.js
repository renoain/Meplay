class PlaylistManager {
  constructor() {
    this.playlists = JSON.parse(localStorage.getItem("mePlay_playlists")) || [];
    this.likedSongs =
      JSON.parse(localStorage.getItem("mePlay_likedSongs")) || [];
    this.songToAdd = null;

    this.initializePlaylists();
    this.setupEventListeners();
  }

  initializePlaylists() {
    let likedPlaylist = this.playlists.find((p) => p.id === "liked-songs");
    if (!likedPlaylist) {
      likedPlaylist = {
        id: "liked-songs",
        name: "Liked Songs",
        description: "Your favorite tracks",
        songs: [...this.likedSongs],
        isSystem: true,
        cover_path: null,
      };
      this.playlists.unshift(likedPlaylist);
      this.saveToStorage();
    }

    this.renderSidebarPlaylists();
  }

  // Like button in player
  setupEventListeners() {
    document.addEventListener("click", (e) => {
      if (e.target.closest("#playerLikeBtn")) {
        this.toggleCurrentSongLike();
      }

      if (e.target.closest("#addToPlaylistBtn")) {
        this.showAddToPlaylistModal();
      }
    });

    // Create playlist from modal
    document
      .getElementById("createNewPlaylistFromModal")
      ?.addEventListener("click", () => {
        this.closeAddToPlaylistModal();
        if (window.mePlayApp) {
          window.mePlayApp.showCreatePlaylistModal();
        }
      });

    // Playlist updated event
    document.addEventListener("playlistUpdated", () => {
      this.renderSidebarPlaylists();
    });
  }

  // LIKE MANAGEMENT
  toggleLikeSong(songId) {
    console.log("❤️ Toggle like for song:", songId);

    if (this.likedSongs.includes(songId)) {
      this.likedSongs = this.likedSongs.filter((id) => id !== songId);
      this.removeSongFromPlaylist("liked-songs", songId);
    } else {
      this.likedSongs.push(songId);
      this.addSongToPlaylist("liked-songs", songId);
    }
    this.saveToStorage();

    // Update
    this.updatePlayerLikeButton(songId);
    this.refreshAllLikedStatus();
  }

  toggleCurrentSongLike() {
    if (window.mePlayApp && window.mePlayApp.currentSongIndex !== -1) {
      const currentSong =
        window.mePlayApp.currentTrackList[window.mePlayApp.currentSongIndex];
      this.toggleLikeSong(currentSong.id);
    }
  }

  updatePlayerLikeButton(songId) {
    const likeBtn = document.getElementById("playerLikeBtn");
    if (likeBtn) {
      const isLiked = this.isSongLiked(songId);
      likeBtn.classList.toggle("liked", isLiked);
      likeBtn.innerHTML = `<i class="bi bi-heart${
        isLiked ? "-fill" : ""
      }"></i>`;
    }
  }

  isSongLiked(songId) {
    return this.likedSongs.includes(songId);
  }

  getLikedSongs() {
    if (!window.mePlayApp || !window.mePlayApp.songs) return [];
    return window.mePlayApp.songs.filter((song) =>
      this.likedSongs.includes(song.id)
    );
  }

  // ======== REFRESH LIKED STATUS DENGAN GENRE ========
  refreshAllLikedStatus() {
    const gridContainers = [
      "allSongsGrid",
      "recentlyPlayedGrid",
      "searchResultsGrid",
      "likedSongsGrid",
      "playlistDetailGrid",
      // ======== TAMBAHKAN GENRE SONGS GRID ========
      "genreSongsGrid",
      // ============================================
    ];

    gridContainers.forEach((containerId) => {
      const container = document.getElementById(containerId);
      if (container) {
        container.querySelectorAll(".toggle-like").forEach((btn) => {
          const songId = btn.dataset.songId;
          const isLiked = this.isSongLiked(songId);

          btn.innerHTML = `
            <i class="bi bi-heart${isLiked ? "-fill" : ""}"></i> 
            ${isLiked ? "Remove from Liked" : "Add to Liked"}
          `;
          btn.classList.toggle("liked", isLiked);
        });
      }
    });
  }

  // PLAYLIST MANAGEMENT
  getUserPlaylists() {
    return this.playlists.filter((p) => !p.isSystem);
  }

  getPlaylistById(playlistId) {
    return this.playlists.find((p) => p.id === playlistId);
  }

  getPlaylistSongs(playlistId) {
    const playlist = this.getPlaylistById(playlistId);
    if (!playlist) return [];

    if (!window.mePlayApp || !window.mePlayApp.songs) return [];

    return playlist.songs
      .map((songId) =>
        window.mePlayApp.songs.find((song) => song.id === songId)
      )
      .filter((song) => song);
  }

  createPlaylist(name, description = "") {
    const newPlaylist = {
      id: "playlist-" + Date.now(),
      name: name,
      description: description,
      songs: [],
      created: new Date().toISOString(),
      isSystem: false,
    };

    this.playlists.push(newPlaylist);
    this.saveToStorage();
    document.dispatchEvent(new CustomEvent("playlistUpdated"));

    return newPlaylist;
  }

  deletePlaylist(playlistId) {
    this.playlists = this.playlists.filter((p) => p.id !== playlistId);
    this.saveToStorage();
    document.dispatchEvent(new CustomEvent("playlistUpdated"));
  }

  addSongToPlaylist(playlistId, songId) {
    const playlist = this.getPlaylistById(playlistId);
    if (playlist && !playlist.songs.includes(songId)) {
      playlist.songs.push(songId);
      this.saveToStorage();
      console.log("✅ Song added to playlist:", songId, "->", playlist.name);
      return true;
    }
    return false;
  }

  removeSongFromPlaylist(playlistId, songId) {
    const playlist = this.getPlaylistById(playlistId);
    if (playlist) {
      playlist.songs = playlist.songs.filter((id) => id !== songId);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // ADD TO PLAYLIST
  showAddToPlaylistModal(songId = null) {
    console.log("🎯 showAddToPlaylistModal called with:", songId);

    if (!songId) {
      if (window.mePlayApp && window.mePlayApp.currentSongIndex !== -1) {
        const currentSong =
          window.mePlayApp.currentTrackList[window.mePlayApp.currentSongIndex];
        songId = currentSong.id;
        console.log("🎵 Using currently playing song:", songId);
      } else {
        console.error("❌ No song selected for playlist");
        this.showToast("Please select a song first", "error");
        return;
      }
    }

    // Verif songId
    if (!songId) {
      console.error("❌ Invalid songId");
      this.showToast("Invalid song selection", "error");
      return;
    }

    // chose song
    const selectedSong = window.mePlayApp.songs.find((s) => s.id === songId);
    if (!selectedSong) {
      console.error("❌ Song not found:", songId);
      this.showToast("Song not found", "error");
      return;
    }

    this.songToAdd = songId;
    console.log(
      "📁 Setting songToAdd:",
      this.songToAdd,
      "Title:",
      selectedSong.title
    );

    const modal = document.getElementById("addToPlaylistModal");
    if (!modal) {
      console.error("❌ Add to playlist modal not found");
      return;
    }

    this.renderPlaylistsModalList();
    modal.style.display = "flex";

    console.log("✅ Add to playlist modal opened for:", selectedSong.title);

    // Setup modal handlers
    this.setupAddToPlaylistModalHandlers(modal);
  }

  // Close button
  setupAddToPlaylistModalHandlers(modal) {
    const closeBtn = modal.querySelector(".close-modal");
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.style.display = "none";
      };
    }

    // Background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    };

    // Create new playlist button
    const createNewBtn = document.getElementById("createNewPlaylistFromModal");
    if (createNewBtn) {
      createNewBtn.onclick = () => {
        modal.style.display = "none";
        if (window.mePlayApp) {
          window.mePlayApp.showCreatePlaylistModal();
        }
      };
    }
  }

  closeAddToPlaylistModal() {
    const modal = document.getElementById("addToPlaylistModal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  renderPlaylistsModalList() {
    const container = document.getElementById("playlistsModalList");
    if (!container) {
      console.error("❌ playlistsModalList container not found");
      return;
    }

    const playlists = this.getUserPlaylists();
    console.log(
      "📋 Available playlists:",
      playlists.map((p) => p.name)
    );

    if (!playlists.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No playlists yet</p>
          <p>Create your first playlist to get started</p>
        </div>
      `;
      return;
    }

    container.innerHTML = playlists
      .map(
        (playlist) => `
          <div class="modal-playlist-item" data-playlist-id="${playlist.id}">
            <img src="${this.generatePlaylistCover(playlist)}" 
                 class="modal-playlist-cover"
                 onerror="this.src='assets/images/default-playlist.jpg'">
            <div class="modal-playlist-info">
              <div class="modal-playlist-name">${playlist.name}</div>
              <div class="modal-playlist-stats">${
                playlist.songs.length
              } songs</div>
            </div>
          </div>
        `
      )
      .join("");

    console.log("✅ Rendered", playlists.length, "playlists in modal");

    // Add click events - FIXED VERSION
    container.querySelectorAll(".modal-playlist-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const playlistId = item.dataset.playlistId;
        const playlist = this.getPlaylistById(playlistId);

        console.log("🎯 Adding song to playlist:", {
          songId: this.songToAdd,
          playlistId: playlistId,
          playlistName: playlist?.name,
        });

        if (
          this.songToAdd &&
          this.addSongToPlaylist(playlistId, this.songToAdd)
        ) {
          this.closeAddToPlaylistModal();
          this.showToast(`Added to "${playlist.name}"!`, "success");
        } else {
          this.showToast("Failed to add song to playlist", "error");
        }
      });
    });
  }

  generatePlaylistCover(playlist) {
    const songs = this.getPlaylistSongs(playlist.id);
    if (songs.length > 0 && songs[0].cover_path) {
      return songs[0].cover_path;
    }
    return "assets/images/default-playlist.jpg";
  }

  // SIDEBAR PLAYLISTS create plylsit
  renderSidebarPlaylists() {
    const container = document.getElementById("sidebarPlaylistsList");
    if (!container) return;

    const playlists = this.getUserPlaylists();

    if (!playlists.length) {
      container.innerHTML =
        '<div class="empty-playlists">No playlists yet</div>';
      return;
    }

    container.innerHTML = playlists
      .map(
        (playlist) => `
          <div class="sidebar-playlist-item" data-playlist-id="${playlist.id}">
            <i class="bi bi-music-note-list"></i>
            <span class="sidebar-playlist-name">${playlist.name}</span>
            <button class="sidebar-playlist-delete" data-playlist-id="${playlist.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        `
      )
      .join("");

    // Add event listeners
    container.querySelectorAll(".sidebar-playlist-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (!e.target.closest(".sidebar-playlist-delete")) {
          if (window.mePlayApp) {
            window.mePlayApp.showPlaylistDetail(item.dataset.playlistId);
          }
        }
      });
    });

    container.querySelectorAll(".sidebar-playlist-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const playlistId = btn.dataset.playlistId;
        const playlist = this.getPlaylistById(playlistId);

        if (playlist && confirm(`Delete playlist "${playlist.name}"?`)) {
          this.deletePlaylist(playlistId);
          this.showToast("Playlist deleted", "success");
        }
      });
    });
  }

  // UTILITY
  saveToStorage() {
    localStorage.setItem("mePlay_playlists", JSON.stringify(this.playlists));
    localStorage.setItem("mePlay_likedSongs", JSON.stringify(this.likedSongs));
  }

  showToast(message, type = "success") {
    // Remove existing toasts
    document.querySelectorAll(".toast").forEach((toast) => toast.remove());

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}
