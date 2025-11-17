class AuthManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupFormHandlers();
    this.setupInputValidation();
    console.log("AuthManager initialized - No redirects to .html files");
  }

  setupFormHandlers() {
    // Login form
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) =>
        this.handleFormSubmit(e, "loginBtn")
      );
    }

    // Register form (cari form dengan method POST)
    const registerForm = document.querySelector('form[method="POST"]');
    if (registerForm && !loginForm) {
      registerForm.addEventListener("submit", (e) =>
        this.handleFormSubmit(e, "registerBtn")
      );
    }

    // Password confirmation check untuk register
    const confirmPassword = document.getElementById("confirm_password");
    if (confirmPassword) {
      confirmPassword.addEventListener("input", (e) =>
        this.checkPasswordMatch(e)
      );
    }
  }

  setupInputValidation() {
    // Clear error saat user mulai mengetik
    const inputs = document.querySelectorAll("input[required]");
    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        this.clearFieldError(input);
      });
    });
  }

  handleFormSubmit(e, buttonId) {
    console.log("Form submitted - Letting PHP handle the process");

    // Validasi client-side sederhana
    if (!this.validateForm(e.target)) {
      e.preventDefault();
      return;
    }

    // Show loading state
    this.showLoading(true, buttonId);

    // Biarkan form submit secara natural ke PHP
    // Tidak ada redirect JavaScript ke .html files
  }

  validateForm(form) {
    const inputs = form.querySelectorAll("input[required]");
    let isValid = true;

    inputs.forEach((input) => {
      if (!input.value.trim()) {
        this.showFieldError(input, "This field is required");
        isValid = false;
      }
    });

    // Validasi password match untuk register
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirm_password");

    if (
      password &&
      confirmPassword &&
      password.value !== confirmPassword.value
    ) {
      this.showFieldError(confirmPassword, "Passwords do not match");
      isValid = false;
    }

    // Validasi panjang password
    if (password && password.value.length < 6) {
      this.showFieldError(password, "Password must be at least 6 characters");
      isValid = false;
    }

    return isValid;
  }

  checkPasswordMatch(e) {
    const password = document.getElementById("password");
    const confirmPassword = e.target;

    if (!password || !confirmPassword) return;

    if (confirmPassword.value && password.value !== confirmPassword.value) {
      this.showFieldError(confirmPassword, "Passwords do not match");
    } else if (confirmPassword.value) {
      this.clearFieldError(confirmPassword);
      confirmPassword.style.borderColor = "#1db954";
    }
  }

  showLoading(show, buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const btnText = btn.querySelector(".btn-text");
    const btnLoading = btn.querySelector(".btn-loading");

    if (show) {
      if (btnText) btnText.style.display = "none";
      if (btnLoading) btnLoading.style.display = "flex";
      btn.disabled = true;

      // Fallback - enable button setelah 10 detik jika masih loading
      setTimeout(() => {
        btn.disabled = false;
        if (btnText) btnText.style.display = "block";
        if (btnLoading) btnLoading.style.display = "none";
      }, 10000);
    } else {
      if (btnText) btnText.style.display = "block";
      if (btnLoading) btnLoading.style.display = "none";
      btn.disabled = false;
    }
  }

  showFieldError(input, message) {
    this.clearFieldError(input);

    const formGroup = input.closest(".form-group");
    if (formGroup) {
      formGroup.classList.add("error");

      const errorDiv = document.createElement("div");
      errorDiv.className = "error-message";
      errorDiv.textContent = message;
      errorDiv.style.cssText =
        "color: #e74c3c; font-size: 0.85rem; margin-top: 5px;";

      formGroup.appendChild(errorDiv);
      input.style.borderColor = "#e74c3c";
    }
  }

  clearFieldError(input) {
    const formGroup = input.closest(".form-group");
    if (formGroup) {
      formGroup.classList.remove("error");
      const errorMessage = formGroup.querySelector(".error-message");
      if (errorMessage) {
        errorMessage.remove();
      }
      input.style.borderColor = "";
    }
  }

  // Utility function untuk clear semua error
  clearAllErrors() {
    document.querySelectorAll(".form-group").forEach((group) => {
      group.classList.remove("error");
      const errorMessage = group.querySelector(".error-message");
      if (errorMessage) {
        errorMessage.remove();
      }
    });

    document.querySelectorAll("input").forEach((input) => {
      input.style.borderColor = "";
    });
  }
}

// Enhanced UI effects
class UIEffects {
  constructor() {
    this.setupHoverEffects();
    this.setupFocusEffects();
  }

  setupHoverEffects() {
    // Button hover effects
    const buttons = document.querySelectorAll(".btn-login, .btn-register");
    buttons.forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.transform = "translateY(-2px)";
      });

      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "translateY(0)";
      });
    });

    // Input focus effects
    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => {
      input.addEventListener("focus", () => {
        input.parentElement.style.transform = "scale(1.02)";
      });

      input.addEventListener("blur", () => {
        input.parentElement.style.transform = "scale(1)";
      });
    });
  }

  setupFocusEffects() {
    // Auto-focus first input
    const firstInput = document.querySelector("input[required]");
    if (firstInput) {
      setTimeout(() => {
        firstInput.focus();
      }, 500);
    }
  }
}

// Initialize ketika DOM ready
document.addEventListener("DOMContentLoaded", function () {
  // Initialize auth manager
  window.authManager = new AuthManager();

  // Initialize UI effects
  window.uiEffects = new UIEffects();

  // Add any global auth-related functionality here
  console.log("MePlay Auth System Ready - PHP handles all redirects");
});

// Handle page visibility changes (jika user switch tabs saat loading)
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    // Reset loading states ketika user kembali ke tab
    const loadingButtons = document.querySelectorAll(
      '.btn-loading[style*="display: flex"]'
    );
    loadingButtons.forEach((btn) => {
      const button = btn.closest("button");
      const btnText = button.querySelector(".btn-text");
      if (btnText) {
        btnText.style.display = "block";
        btn.style.display = "none";
        button.disabled = false;
      }
    });
  }
});
