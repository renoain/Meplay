class PlaylistManager {
  constructor() {
    this.playlists = [];
    this.currentPlaylistId = null;
    this.songToAdd = null;

    this.setupModalHandlers();
    this.loadUserPlaylists();
  }

  async loadUserPlaylists() {
    try {
      console.log(" Loading user playlists...");
      const response = await fetch("api/playlists.php?action=get_playlists");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        this.playlists = result.data;
        this.renderSidebarPlaylists();
        console.log(" Loaded user playlists:", this.playlists.length);
      } else {
        console.error(" Failed to load playlists:", result.message);
        this.playlists = [];
      }
    } catch (error) {
      console.error(" Error loading playlists:", error);
      this.playlists = [];
    }
  }

  async createPlaylist(name, description = "") {
    try {
      const response = await fetch("api/playlists.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_playlist",
          name: name,
          description: description,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await this.loadUserPlaylists();
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(" Error creating playlist:", error);
      throw error;
    }
  }

  async getUserPlaylists() {
    return this.playlists;
  }

  async deletePlaylist(playlistId) {
    try {
      const response = await fetch("api/playlists.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_playlist",
          playlist_id: playlistId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await this.loadUserPlaylists();
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(" Error deleting playlist:", error);
      throw error;
    }
  }

  async addSongToPlaylist(playlistId, songId) {
    try {
      const response = await fetch("api/playlists.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_song_to_playlist",
          playlist_id: playlistId,
          song_id: songId,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(" Error adding song to playlist:", error);
      throw error;
    }
  }

  async removeSongFromPlaylist(playlistId, songId) {
    try {
      const response = await fetch("api/playlists.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_song_from_playlist",
          playlist_id: playlistId,
          song_id: songId,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(" Error removing song from playlist:", error);
      throw error;
    }
  }

  async getPlaylistSongs(playlistId) {
    try {
      const response = await fetch(
        `api/playlists.php?action=get_playlist_songs&playlist_id=${playlistId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        console.error(" Failed to load playlist songs:", result.message);
        return [];
      }
    } catch (error) {
      console.error(" Error loading playlist songs:", error);
      return [];
    }
  }

  getPlaylistById(playlistId) {
    return this.playlists.find((p) => p.id == playlistId);
  }

  renderSidebarPlaylists() {
    const container = document.getElementById("sidebarPlaylistsList");
    if (!container) return;

    if (this.playlists.length === 0) {
      container.innerHTML =
        '<div class="empty-playlists">No playlists yet</div>';
      return;
    }

    container.innerHTML = this.playlists
      .map(
        (playlist) => `
        <a href="#" class="nav-item playlist-item" data-playlist-id="${
          playlist.id
        }">
          <i class="bi bi-music-note-list"></i>
          <span>${playlist.name}</span>
          <small>(${playlist.song_count || 0})</small>
        </a>
      `
      )
      .join("");

    // Add event listeners
    container.querySelectorAll(".playlist-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const playlistId = item.dataset.playlistId;
        if (window.mePlayApp) {
          window.mePlayApp.showPlaylistDetail(playlistId);
        }
      });
    });
  }

  generatePlaylistCover(playlist) {
    return "assets/images/default-playlist.jpg";
  }

  showAddToPlaylistModal(songId) {
    this.songToAdd = songId;
    const modal = document.getElementById("addToPlaylistModal");

    if (!modal) {
      console.error(" Add to playlist modal not found");
      return;
    }

    this.renderPlaylistsModalList();
    modal.style.display = "flex";
  }

  renderPlaylistsModalList() {
    const container = document.getElementById("playlistsModalList");
    if (!container) return;

    if (this.playlists.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No playlists yet</p>
          <p>Create a playlist first</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.playlists
      .map(
        (playlist) => `
        <div class="playlist-modal-item" data-playlist-id="${playlist.id}">
          <div class="playlist-modal-info">
            <img src="${this.generatePlaylistCover(playlist)}" 
                 alt="${playlist.name}" 
                 class="playlist-modal-cover">
            <div>
              <div class="playlist-modal-name">${playlist.name}</div>
              <div class="playlist-modal-stats">${
                playlist.song_count || 0
              } songs</div>
            </div>
          </div>
          <button class="btn-add-to-playlist" data-playlist-id="${playlist.id}">
            Add
          </button>
        </div>
      `
      )
      .join("");

    // Add event listeners
    container.querySelectorAll(".btn-add-to-playlist").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const playlistId = btn.dataset.playlistId;
        await this.addToPlaylistHandler(playlistId);
      });
    });

    container.querySelectorAll(".playlist-modal-item").forEach((item) => {
      item.addEventListener("click", async (e) => {
        if (!e.target.classList.contains("btn-add-to-playlist")) {
          const playlistId = item.dataset.playlistId;
          await this.addToPlaylistHandler(playlistId);
        }
      });
    });
  }

  async addToPlaylistHandler(playlistId) {
    if (!this.songToAdd) {
      console.error(" No song selected to add");
      return;
    }

    try {
      const result = await this.addSongToPlaylist(playlistId, this.songToAdd);

      if (result.success) {
        if (window.mePlayApp) {
          window.mePlayApp.showToast("Song added to playlist!", "success");
        }
        document.getElementById("addToPlaylistModal").style.display = "none";
        this.songToAdd = null;
      } else {
        if (window.mePlayApp) {
          window.mePlayApp.showToast(
            result.message || "Failed to add song to playlist",
            "error"
          );
        }
      }
    } catch (error) {
      console.error(" Error adding to playlist:", error);
      if (window.mePlayApp) {
        window.mePlayApp.showToast("Error adding song to playlist", "error");
      }
    }
  }

  setupModalHandlers() {
    const modal = document.getElementById("addToPlaylistModal");
    if (!modal) return;

    // Close modal
    modal.querySelector(".close-modal")?.addEventListener("click", () => {
      modal.style.display = "none";
      this.songToAdd = null;
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        this.songToAdd = null;
      }
    });

    // Create new playlist from modal
    document
      .getElementById("createNewPlaylistFromModal")
      ?.addEventListener("click", () => {
        modal.style.display = "none";
        if (window.mePlayApp) {
          window.mePlayApp.showCreatePlaylistModal();
        }
      });
  }
}
