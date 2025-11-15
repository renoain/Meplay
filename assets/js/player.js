class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.isPlaying = false;
    this.volume = 0.7;
    this.isShuffled = false;
    this.repeatMode = "none";

    this.setupPlayer();
  }

  setupPlayer() {
    this.audio.volume = this.volume;

    // Control buttons
    document.getElementById("playPauseBtn").addEventListener("click", () => {
      this.togglePlay();
    });

    document.getElementById("prevBtn").addEventListener("click", () => {
      window.mePlayApp.playPrevious();
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
      window.mePlayApp.playNext();
    });

    document.getElementById("shuffleBtn").addEventListener("click", () => {
      this.toggleShuffle();
    });

    document.getElementById("repeatBtn").addEventListener("click", () => {
      this.toggleRepeat();
    });

    // Progress bar
    document
      .querySelector(".progress-bar-container")
      .addEventListener("click", (e) => {
        this.seek(e);
      });

    // Volume
    document.getElementById("volumeControl").addEventListener("input", (e) => {
      this.setVolume(e.target.value);
    });

    // Add to playlist button
    document
      .getElementById("addToPlaylistBtn")
      .addEventListener("click", () => {
        if (
          window.playlistManager &&
          window.mePlayApp.currentSongIndex !== -1
        ) {
          const currentSong =
            window.mePlayApp.currentTrackList[
              window.mePlayApp.currentSongIndex
            ];
          window.playlistManager.songToAdd = currentSong.id;
          window.playlistManager.showAddToPlaylistModal(currentSong.id); // KIRIM songId
        } else {
          alert("No song is currently playing");
        }
      });

    // Audio events
    this.audio.addEventListener("timeupdate", () => this.updateProgress());
    this.audio.addEventListener("ended", () => this.handleSongEnd());
    this.audio.addEventListener("loadedmetadata", () => this.updateDuration());

    this.audio.addEventListener("play", () => {
      this.isPlaying = true;
      window.mePlayApp.isPlaying = true;
      this.updatePlayButton();
    });

    this.audio.addEventListener("pause", () => {
      this.isPlaying = false;
      window.mePlayApp.isPlaying = false;
      this.updatePlayButton();
    });
  }

  playSong(songPath) {
    if (!songPath) {
      console.error("No song path provided");
      return;
    }

    this.audio.src = songPath;
    this.audio
      .play()
      .then(() => {
        this.isPlaying = true;
        window.mePlayApp.isPlaying = true;
        this.updatePlayButton();
        console.log("🎵 Now playing:", songPath);
      })
      .catch((error) => {
        console.error("Error playing song:", error);
        this.showPlayError();
      });
  }

  togglePlay() {
    if (!this.audio.src) {
      if (window.mePlayApp.songs.length > 0) {
        window.mePlayApp.playTrack(window.mePlayApp.songs, 0, "all");
      }
      return;
    }

    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
    }
  }

  setVolume(volume) {
    this.volume = volume;
    this.audio.volume = volume;

    // Update volume icon
    const volumeBtn = document.getElementById("volumeBtn");
    if (volumeBtn) {
      let iconClass = "bi-volume-up-fill";
      if (volume == 0) {
        iconClass = "bi-volume-mute-fill";
      } else if (volume < 0.5) {
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

    if (duration) {
      const seekTime = (clickX / width) * duration;
      this.audio.currentTime = seekTime;
    }
  }

  updateProgress() {
    const current = this.audio.currentTime;
    const duration = this.audio.duration;

    if (duration) {
      const percent = (current / duration) * 100;
      document.getElementById("progressFill").style.width = percent + "%";
      document.getElementById("currentTime").textContent =
        this.formatTime(current);

      if (!this.durationSet) {
        document.getElementById("duration").textContent =
          this.formatTime(duration);
      }
    }
  }

  updateDuration() {
    const duration = this.audio.duration;
    if (duration && !isNaN(duration)) {
      document.getElementById("duration").textContent =
        this.formatTime(duration);
      this.durationSet = true;
    }
  }

  handleSongEnd() {
    switch (this.repeatMode) {
      case "one":
        this.audio.currentTime = 0;
        this.audio.play();
        break;
      case "all":
        window.mePlayApp.playNext();
        break;
      case "none":
      default:
        window.mePlayApp.playNext();
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
      "Unable to play the audio file. Please check if the file exists.";
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
