class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.isPlaying = false;
    this.volume = 0.7;
    this.isShuffled = false;
    this.repeatMode = "none";
    this.currentSong = null;
    this.isLoading = false;

    this.setupPlayer();
  }

  setupPlayer() {
    this.audio.volume = this.volume;
    this.audio.preload = "none";

    // Control buttons
    document.getElementById("playPauseBtn")?.addEventListener("click", () => {
      this.togglePlay();
    });

    document.getElementById("prevBtn")?.addEventListener("click", () => {
      if (window.mePlayApp) {
        window.mePlayApp.playPrevious();
      }
    });

    document.getElementById("nextBtn")?.addEventListener("click", () => {
      if (window.mePlayApp) {
        window.mePlayApp.playNext();
      }
    });

    document.getElementById("shuffleBtn")?.addEventListener("click", () => {
      this.toggleShuffle();
    });

    document.getElementById("repeatBtn")?.addEventListener("click", () => {
      this.toggleRepeat();
    });

    // Progress bar
    const progressContainer = document.querySelector(".progress-bar-container");
    if (progressContainer) {
      progressContainer.addEventListener("click", (e) => {
        this.seek(e);
      });
    }

    // Volume
    const volumeControl = document.getElementById("volumeControl");
    if (volumeControl) {
      volumeControl.addEventListener("input", (e) => {
        this.setVolume(e.target.value);
      });
    }

    // Add to playlist button
    const addToPlaylistBtn = document.getElementById("addToPlaylistBtn");
    if (addToPlaylistBtn) {
      addToPlaylistBtn.addEventListener("click", () => {
        if (this.currentSong && window.mePlayApp) {
          window.mePlayApp.showAddToPlaylistModal(this.currentSong.id);
        } else {
          window.mePlayApp?.showToast("No song is currently playing", "error");
        }
      });
    }

    // Queue button
    const queueBtn = document.getElementById("queueBtn");
    if (queueBtn) {
      queueBtn.addEventListener("click", () => {
        if (window.mePlayApp) {
          window.mePlayApp.showQueueModal();
        }
      });
    }

    // Audio events
    this.audio.addEventListener("timeupdate", () => this.updateProgress());
    this.audio.addEventListener("ended", () => this.handleSongEnd());
    this.audio.addEventListener("loadedmetadata", () => this.updateDuration());
    this.audio.addEventListener("canplaythrough", () => {
      this.isLoading = false;
    });
    this.audio.addEventListener("loadstart", () => {
      this.isLoading = true;
    });
    this.audio.addEventListener("error", (e) => {
      console.error("Audio error:", e);
      this.isLoading = false;
      this.showPlayError();
    });

    this.audio.addEventListener("play", () => {
      this.isPlaying = true;
      if (window.mePlayApp) window.mePlayApp.isPlaying = true;
      this.updatePlayButton();
    });

    this.audio.addEventListener("pause", () => {
      this.isPlaying = false;
      if (window.mePlayApp) window.mePlayApp.isPlaying = false;
      this.updatePlayButton();
    });
  }

  async playSong(songPath, songData = null) {
    if (!songPath) {
      console.error("No song path provided");
      return;
    }

    try {
      // Stop current playback first
      this.audio.pause();
      this.audio.currentTime = 0;

      this.currentSong = songData;
      this.isLoading = true;

      console.log("🎵 Loading song:", songPath);

      // Set new source
      this.audio.src = songPath;

      // Load the audio
      this.audio.load();

      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        const onCanPlay = () => {
          this.audio.removeEventListener("canplay", onCanPlay);
          this.audio.removeEventListener("error", onError);
          resolve();
        };

        const onError = (e) => {
          this.audio.removeEventListener("canplay", onCanPlay);
          this.audio.removeEventListener("error", onError);
          reject(new Error("Audio loading failed: " + e.message));
        };

        this.audio.addEventListener("canplay", onCanPlay, { once: true });
        this.audio.addEventListener("error", onError, { once: true });

        // Timeout fallback
        setTimeout(() => {
          this.audio.removeEventListener("canplay", onCanPlay);
          this.audio.removeEventListener("error", onError);
          resolve(); // Continue even if timeout
        }, 5000);
      });

      // Play the audio
      await this.audio.play();

      this.isPlaying = true;
      this.isLoading = false;

      if (window.mePlayApp) {
        window.mePlayApp.isPlaying = true;
        window.mePlayApp.updatePlayButton();
      }

      console.log("✅ Now playing:", songPath);
    } catch (error) {
      console.error("❌ Error playing song:", error);
      this.isLoading = false;
      this.showPlayError();
      throw error;
    }
  }

  togglePlay() {
    if (!this.audio.src) {
      // If no song is loaded, play the first song
      if (window.mePlayApp && window.mePlayApp.songs.length > 0) {
        window.mePlayApp.playTrack(window.mePlayApp.songs, 0, "all");
      }
      return;
    }

    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play().catch((error) => {
        console.error("Error playing audio:", error);
        this.showPlayError();
      });
    }
  }

  setVolume(volume) {
    this.volume = parseFloat(volume);
    this.audio.volume = this.volume;

    // Update volume icon
    const volumeBtn = document.getElementById("volumeBtn");
    if (volumeBtn) {
      let iconClass = "bi-volume-up-fill";
      if (this.volume == 0) {
        iconClass = "bi-volume-mute-fill";
      } else if (this.volume < 0.5) {
        iconClass = "bi-volume-down-fill";
      }
      volumeBtn.innerHTML = `<i class="bi ${iconClass}"></i>`;
    }
  }

  seek(e) {
    const progressContainer = e.currentTarget;
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = progressContainer.offsetWidth;
    const duration = this.audio.duration;

    if (duration && !isNaN(duration)) {
      const seekTime = (clickX / width) * duration;
      this.audio.currentTime = seekTime;
      console.log("⏩ Seeking to:", this.formatTime(seekTime));
    }
  }

  updateProgress() {
    const current = this.audio.currentTime;
    const duration = this.audio.duration;

    if (duration && !isNaN(duration)) {
      const percent = (current / duration) * 100;
      const progressFill = document.getElementById("progressFill");
      const currentTime = document.getElementById("currentTime");

      if (progressFill) {
        progressFill.style.width = percent + "%";
      }

      if (currentTime) {
        currentTime.textContent = this.formatTime(current);
      }

      if (!this.durationSet) {
        const durationEl = document.getElementById("duration");
        if (durationEl) {
          durationEl.textContent = this.formatTime(duration);
        }
      }
    }
  }

  updateDuration() {
    const duration = this.audio.duration;
    if (duration && !isNaN(duration)) {
      const durationEl = document.getElementById("duration");
      if (durationEl) {
        durationEl.textContent = this.formatTime(duration);
      }
      this.durationSet = true;
    }
  }

  handleSongEnd() {
    console.log("🎵 Song ended");
    switch (this.repeatMode) {
      case "one":
        this.audio.currentTime = 0;
        this.audio.play();
        break;
      case "all":
        if (window.mePlayApp) {
          window.mePlayApp.playNext();
        }
        break;
      case "none":
      default:
        if (window.mePlayApp) {
          window.mePlayApp.playNext();
        }
        break;
    }
  }

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    const shuffleBtn = document.getElementById("shuffleBtn");

    if (shuffleBtn) {
      if (this.isShuffled) {
        shuffleBtn.classList.add("active");
        shuffleBtn.style.color = "var(--primary-blue)";
      } else {
        shuffleBtn.classList.remove("active");
        shuffleBtn.style.color = "";
      }
    }

    if (window.mePlayApp) {
      window.mePlayApp.isShuffled = this.isShuffled;
    }

    console.log("🔀 Shuffle:", this.isShuffled ? "ON" : "OFF");
  }

  toggleRepeat() {
    const modes = ["none", "one", "all"];
    const currentIndex = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(currentIndex + 1) % modes.length];

    const repeatBtn = document.getElementById("repeatBtn");
    if (repeatBtn) {
      repeatBtn.classList.remove("active", "repeat-one");
      repeatBtn.style.color = "";

      switch (this.repeatMode) {
        case "one":
          repeatBtn.classList.add("active", "repeat-one");
          repeatBtn.style.color = "var(--primary-blue)";
          repeatBtn.innerHTML = '<i class="bi bi-repeat-1"></i>';
          break;
        case "all":
          repeatBtn.classList.add("active");
          repeatBtn.style.color = "var(--primary-blue)";
          repeatBtn.innerHTML = '<i class="bi bi-repeat"></i>';
          break;
        case "none":
        default:
          repeatBtn.innerHTML = '<i class="bi bi-repeat"></i>';
          break;
      }
    }

    console.log("🔁 Repeat mode:", this.repeatMode);
  }

  updatePlayButton() {
    const playBtn = document.getElementById("playPauseBtn");
    if (!playBtn) return;

    if (this.isPlaying) {
      playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
    } else {
      playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  showPlayError() {
    console.error("Failed to play audio");
    const errorMsg =
      "Unable to play the audio file. The file may not exist or is corrupted.";
    if (window.mePlayApp && window.mePlayApp.showToast) {
      window.mePlayApp.showToast(errorMsg, "error");
    } else {
      alert(errorMsg);
    }
  }

  // Utility method to get current playback time
  getCurrentTime() {
    return this.audio.currentTime;
  }

  // Utility method to get duration
  getDuration() {
    return this.audio.duration;
  }

  // Method to skip to specific time
  skipTo(time) {
    if (this.audio.duration && time >= 0 && time <= this.audio.duration) {
      this.audio.currentTime = time;
    }
  }

  // Method to stop playback completely
  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.updatePlayButton();
  }
}
