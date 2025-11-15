// ADMIN PANEL JAVASCRIPT
class AdminPanel {
  constructor() {
    this.init();
  }

  init() {
    this.setupDragAndDrop();
    this.setupFormValidation();
    this.setupFileValidation();
    console.log("Admin Panel initialized");
  }

  setupDragAndDrop() {
    // Setup audio drop zone
    this.setupDropZone(
      "audioDropZone",
      "audioFileInfo",
      "audioFilePreview",
      "audioProgress"
    );

    // Setup cover drop zone
    this.setupDropZone(
      "coverDropZone",
      "coverFileInfo",
      "coverFilePreview",
      "coverProgress"
    );
  }

  setupDropZone(zoneId, infoId, previewId, progressId) {
    const dropZone = document.getElementById(zoneId);
    const fileInput = dropZone.querySelector('input[type="file"]');
    const fileInfo = document.getElementById(infoId);
    const filePreview = document.getElementById(previewId);
    const progress = document.getElementById(progressId);

    if (!dropZone || !fileInput) return;

    // Click to select file
    dropZone.addEventListener("click", () => fileInput.click());

    // File input change
    fileInput.addEventListener("change", (e) => {
      this.handleFileSelection(
        e.target.files[0],
        fileInput,
        fileInfo,
        filePreview,
        progress
      );
    });

    // Drag & drop events
    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
      });
    });

    // Handle file drop
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        this.handleFileSelection(
          files[0],
          fileInput,
          fileInfo,
          filePreview,
          progress
        );
      }
    });
  }

  handleFileSelection(file, fileInput, fileInfo, filePreview, progress) {
    if (!file) return;

    // Reset progress
    if (progress) {
      progress.style.display = "none";
      const progressBar = progress.querySelector(".progress-bar");
      if (progressBar) progressBar.style.width = "0%";
    }

    // Show file info
    fileInfo.textContent = `${file.name} (${this.formatFileSize(file.size)})`;

    // Show preview
    if (filePreview) {
      filePreview.style.display = "block";
      filePreview.textContent = `Selected: ${file.name} (${this.formatFileSize(
        file.size
      )})`;
    }

    // Validate file
    this.validateFile(file, fileInput.name);
  }

  validateFile(file, inputName) {
    const isAudio = inputName === "audio_file";
    const maxSize = isAudio ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      this.showAlert(
        `File is too large. Maximum size is ${this.formatFileSize(maxSize)}`,
        "error"
      );
      return false;
    }

    return true;
  }

  setupFormValidation() {
    const form = document.getElementById("addSongForm");
    const submitBtn = document.getElementById("submitBtn");

    if (!form) return;

    form.addEventListener("submit", (e) => {
      const audioFile = document.querySelector('input[name="audio_file"]')
        .files[0];
      const title = document.querySelector('input[name="title"]').value.trim();
      const artist = document
        .querySelector('input[name="artist"]')
        .value.trim();

      let errors = [];

      if (!audioFile) {
        errors.push("Please select an audio file.");
      }

      if (!title) {
        errors.push("Song title is required.");
      }

      if (!artist) {
        errors.push("Artist name is required.");
      }

      if (errors.length > 0) {
        e.preventDefault();
        this.showAlert(
          "Please fix the following errors:\\n\\n" + errors.join("\\n"),
          "error"
        );
        return false;
      }

      // Show loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="bi bi-hourglass-split"></i> Adding Song...';
      }
    });

    // Reset form handler
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        this.resetFilePreviews();
      });
    }
  }

  setupFileValidation() {
    // Real-time file type validation
    document.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          this.validateFile(file, input.name);
        }
      });
    });
  }

  resetFilePreviews() {
    document.querySelectorAll(".file-preview").forEach((preview) => {
      preview.style.display = "none";
      preview.textContent = "";
    });

    document.querySelectorAll(".file-info").forEach((info) => {
      info.textContent = "or click to browse";
    });

    document.querySelectorAll(".upload-progress").forEach((progress) => {
      progress.style.display = "none";
      const progressBar = progress.querySelector(".progress-bar");
      if (progressBar) progressBar.style.width = "0%";
    });

    // Re-enable submit button
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Add Song';
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  showAlert(message, type = "info") {
    alert(message); // Bisa diganti dengan toast notification
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  window.adminPanel = new AdminPanel();
});
