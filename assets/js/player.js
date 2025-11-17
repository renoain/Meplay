class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.currentSong = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 0.7;

    this.setupAudioEvents();
    this.setupProgressBar();

    console.log("AudioPlayer initialized successfully");
  }

  setupAudioEvents() {
    this.audio.addEventListener("loadedmetadata", () => {
      this.duration = this.audio.duration;
      console.log(" Audio duration:", this.duration, "seconds");
      this.updateProgressBar();
      this.updateTimeDisplay();
    });

    this.audio.addEventListener("timeupdate", () => {
      this.currentTime = this.audio.currentTime;
      this.updateProgressBar();
      this.updateTimeDisplay();
    });

    this.audio.addEventListener("ended", () => {
      this.isPlaying = false;
      this.updatePlayButton();
      if (window.mePlayApp) {
        window.mePlayApp.playNext();
      }
    });

    this.audio.addEventListener("error", (e) => {
      console.error(" Audio error:", e);
      this.isPlaying = false;
      this.updatePlayButton();
    });

    this.audio.addEventListener("canplay", () => {
      console.log(" Audio can play");
    });

    this.audio.addEventListener("waiting", () => {
      console.log("⏳ Audio buffering...");
    });
  }

  setupProgressBar() {
    // Setup progress bar dengan delay untuk pastikan DOM ready
    setTimeout(() => {
      this.initializeProgressBar();
    }, 500);
  }

  initializeProgressBar() {
    const progressBar = document.querySelector(".progress-bar-container");

    if (progressBar) {
      // Remove existing event listeners
      const newProgressBar = progressBar.cloneNode(true);
      progressBar.parentNode.replaceChild(newProgressBar, progressBar);

      // Add click event to new progress bar
      newProgressBar.addEventListener("click", (e) => {
        this.handleProgressBarClick(e);
      });

      console.log(" Progress bar event listener setup successfully");
    } else {
      console.log("⏳ Progress bar not found, retrying...");
      // Retry after 1 second
      setTimeout(() => this.initializeProgressBar(), 1000);
    }
  }

  handleProgressBarClick(e) {
    if (this.duration > 0) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const progressBarWidth = rect.width;
      const percent = clickX / progressBarWidth;
      const seekTime = percent * this.duration;

      console.log(
        "🎯 Seeking to:",
        seekTime.toFixed(1),
        "seconds (",
        percent.toFixed(2) * 100,
        "%)"
      );

      this.seekTo(seekTime);
    } else {
      console.log(" Cannot seek - duration not available yet");
    }
  }

  playSong(filePath, track = null) {
    return new Promise((resolve, reject) => {
      try {
        console.log("🎵 AudioPlayer playing:", filePath);

        // Reset state
        this.currentTime = 0;
        this.duration = 0;
        this.isPlaying = false;

        // Stop and reset current audio
        this.audio.pause();
        this.audio.currentTime = 0;

        // Set new source
        this.audio.src = filePath;
        this.currentSong = track;

        // Reset UI
        this.updatePlayButton();
        this.updateProgressBar();
        this.updateTimeDisplay();

        // Play audio
        this.audio
          .play()
          .then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            console.log(" Audio playback started successfully");
            resolve();
          })
          .catch((error) => {
            console.error(" Play error:", error);
            this.isPlaying = false;
            this.updatePlayButton();
            reject(error);
          });
      } catch (error) {
        console.error(" PlaySong exception:", error);
        reject(error);
      }
    });
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.audio.src) {
      this.audio
        .play()
        .then(() => {
          this.isPlaying = true;
          this.updatePlayButton();
          console.log("▶️ Play");
        })
        .catch((error) => {
          console.error(" Play failed:", error);
        });
    } else {
      console.log(" No audio source to play");
    }
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.updatePlayButton();
    console.log("⏸️ Pause");
  }

  setVolume(volume) {
    this.volume = volume / 100;
    this.audio.volume = this.volume;

    const volumeSlider = document.getElementById("volumeControl");
    if (volumeSlider) {
      volumeSlider.value = volume;
    }

    console.log(" Volume:", volume + "%");
  }

  seekTo(time) {
    if (this.audio.duration && time >= 0 && time <= this.audio.duration) {
      this.audio.currentTime = time;
      this.currentTime = time;
      this.updateProgressBar();
      this.updateTimeDisplay();
      console.log("⏩ Seeked to:", this.formatTime(time));
    }
  }

  updateProgressBar() {
    const progressFill = document.querySelector(".progress-fill");
    if (progressFill) {
      if (this.duration > 0) {
        const progress = (this.currentTime / this.duration) * 100;
        progressFill.style.width = `${progress}%`;

        // Debug log occasionaly
        if (progress % 10 < 0.5) {
          console.log(" Progress:", progress.toFixed(1) + "%");
        }
      } else {
        progressFill.style.width = "0%";
      }
    } else {
      console.log(" Progress fill element not found");
    }
  }

  updateTimeDisplay() {
    let currentTimeEl = document.querySelector(".time.current");
    let durationEl = document.querySelector(".time.duration");

    if (!currentTimeEl || !durationEl) {
      const timeElements = document.querySelectorAll(
        ".progress-container .time"
      );
      if (timeElements.length >= 2) {
        currentTimeEl = timeElements[0];
        durationEl = timeElements[1];
      }
    }

    if (!currentTimeEl || !durationEl) {
      const allTimeElements = document.querySelectorAll(".time");
      if (allTimeElements.length >= 2) {
        currentTimeEl = allTimeElements[0];
        durationEl = allTimeElements[1];
      }
    }

    // Update current time
    if (currentTimeEl) {
      currentTimeEl.textContent = this.formatTime(this.currentTime);
    } else {
      console.log(" Current time element not found");
    }

    // Update duration
    if (durationEl) {
      if (this.duration > 0) {
        durationEl.textContent = this.formatTime(this.duration);
      } else {
        durationEl.textContent = "0:00";
      }
    } else {
      console.log(" Duration element not found");
    }

    // Log every ~5 seconds
    if (this.currentTime % 5 < 0.1) {
      console.log(
        "Time:",
        this.formatTime(this.currentTime),
        "/",
        this.formatTime(this.duration)
      );
    }
  }

  updatePlayButton() {
    const playPauseBtn = document.getElementById("playPauseBtn");
    if (playPauseBtn) {
      const icon = this.isPlaying ? "pause" : "play";
      playPauseBtn.innerHTML = `<i class="bi bi-${icon}-fill"></i>`;
      console.log("🔄 Play button:", icon);
    } else {
      console.log(" Play button element not found");
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds === 0) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  // Utility method untuk debugging
  debugElements() {
    console.log(" DEBUG AudioPlayer Elements:");
    console.log(
      "- Progress container:",
      document.querySelector(".progress-container")
    );
    console.log("- Time elements:", document.querySelectorAll(".time"));
    console.log("- Current time el:", document.querySelector(".time.current"));
    console.log("- Duration el:", document.querySelector(".time.duration"));
    console.log("- Progress fill:", document.querySelector(".progress-fill"));
    console.log(
      "- Progress bar container:",
      document.querySelector(".progress-bar-container")
    );
    console.log("- Play button:", document.getElementById("playPauseBtn"));
    console.log("- Volume slider:", document.getElementById("volumeControl"));

    console.log(" DEBUG AudioPlayer State:");
    console.log("- isPlaying:", this.isPlaying);
    console.log("- currentTime:", this.currentTime);
    console.log("- duration:", this.duration);
    console.log("- volume:", this.volume);
    console.log("- audio src:", this.audio.src);
  }

  playTrack(track) {
    return this.playSong(track.file_path, track);
  }

  // Cleanup method
  destroy() {
    this.audio.pause();
    this.audio.src = "";
    this.isPlaying = false;
    console.log("AudioPlayer destroyed");
  }
}

if (typeof window !== "undefined") {
  window.AudioPlayer = AudioPlayer;
}

document.addEventListener("DOMContentLoaded", function () {
  console.log(" DOM Ready - Initializing AudioPlayer...");

  function initializeAudioPlayer() {
    try {
      if (!window.audioPlayer) {
        window.audioPlayer = new AudioPlayer();
        console.log(" AudioPlayer instance created");

        // Setup global progress bar fallback
        setupGlobalProgressBarFallback();

        // Setup volume control
        setupVolumeControl();
      } else {
        console.log(" AudioPlayer already exists");
      }
    } catch (error) {
      console.error(" Failed to initialize AudioPlayer:", error);
    }
  }

  // Fallback progress bar handler dengan retry mechanism
  function setupGlobalProgressBarFallback() {
    let retryCount = 0;
    const maxRetries = 10;

    const progressBarSetup = setInterval(() => {
      const progressBar = document.querySelector(".progress-bar-container");

      if (progressBar) {
        progressBar.addEventListener("click", function (e) {
          if (window.audioPlayer && window.audioPlayer.duration > 0) {
            const rect = this.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const seekTime = percent * window.audioPlayer.duration;
            window.audioPlayer.seekTo(seekTime);
          }
        });

        console.log(" Global progress bar fallback setup");
        clearInterval(progressBarSetup);
      } else if (retryCount >= maxRetries) {
        console.error(" Progress bar not found after", maxRetries, "retries");
        clearInterval(progressBarSetup);
      } else {
        retryCount++;
        if (retryCount % 3 === 0) {
          console.log(" Still looking for progress bar...", retryCount);
        }
      }
    }, 300);
  }

  function setupVolumeControl() {
    const volumeControl = document.getElementById("volumeControl");
    if (volumeControl && window.audioPlayer) {
      volumeControl.addEventListener("input", (e) => {
        window.audioPlayer.setVolume(e.target.value);
      });
      console.log(" Volume control setup");
    }
  }

  // Initialize dengan delay kecil
  setTimeout(initializeAudioPlayer, 100);
});

// Export untuk module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = AudioPlayer;
}

console.log(" player.js loaded successfully");
