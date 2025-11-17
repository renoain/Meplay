<?php
session_start();
session_destroy();
$_SESSION = array();

$host = "localhost";
$db_name = "meplay_db";
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    $conn = null;
}

$error = '';
$success = '';

// Handle registration form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = trim($_POST['username']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];
    $display_name = trim($_POST['display_name']);

    // Validation
    if (empty($username) || empty($email) || empty($password)) {
        $error = 'Please fill all required fields';
    } elseif ($password !== $confirm_password) {
        $error = 'Passwords do not match';
    } elseif (strlen($password) < 6) {
        $error = 'Password must be at least 6 characters';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Please enter a valid email address';
    } else {
        // Try to save to database
        if ($conn) {
            try {
                // Check if user already exists
                $query = "SELECT id FROM users WHERE username = :username OR email = :email";
                $stmt = $conn->prepare($query);
                $stmt->bindParam(':username', $username);
                $stmt->bindParam(':email', $email);
                $stmt->execute();
                
                if ($stmt->rowCount() > 0) {
                    $error = 'Username or email already exists';
                } else {
                    // Create new user
                    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                    $role = 'user'; // Default role
                    
                    $query = "INSERT INTO users (username, email, password, display_name, role) 
                             VALUES (:username, :email, :password, :display_name, :role)";
                    $stmt = $conn->prepare($query);
                    $stmt->bindParam(':username', $username);
                    $stmt->bindParam(':email', $email);
                    $stmt->bindParam(':password', $hashed_password);
                    $stmt->bindParam(':display_name', $display_name);
                    $stmt->bindParam(':role', $role);
                    
                    if ($stmt->execute()) {
                        // REGISTRATION SUCCESS - REDIRECT TO LOGIN (NO AUTO LOGIN)
                        $success = 'Registration successful! You can now login with your credentials.';
                        
                        // Clear form
                        $_POST = array();
                        
                        // TIDAK ADA AUTO LOGIN - User harus login manual
                    } else {
                        $error = 'Registration failed. Please try again.';
                    }
                }
            } catch (Exception $e) {
                $error = 'Database error: ' . $e->getMessage();
            }
        } else {
            $error = 'Database not available. Please try again later.';
        }
    }
}

// kalo udah login remembeer me masuk ke index hapus aja gajalan kalo debug
if (isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MePlay - Register</title>
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css"
    />
    <link rel="stylesheet" href="assets/css/auth.css" />
    <style>
      .password-strength {
        margin-top: 5px;
        font-size: 0.85rem;
      }
      .strength-weak { color: #e74c3c; }
      .strength-medium { color: #f39c12; }
      .strength-strong { color: #27ae60; }
      .requirements {
        font-size: 0.8rem;
        color: #666;
        margin-top: 5px;
      }
      .success-message {
        background: rgba(76, 175, 80, 0.1);
        color: #388e3c;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #388e3c;
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="logo">MePlay</h1>
          <p class="auth-subtitle">Create your account</p>
        </div>

        <?php if ($error): ?>
        <div class="alert alert-danger"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <?php if ($success): ?>
        <div class="success-message">
          <?php echo $success; ?>
          <div style="margin-top: 10px;">
            <a href="login.php" class="btn-login" style="display: inline-block; padding: 10px 20px; text-decoration: none;">
              Go to Login
            </a>
          </div>
        </div>
        <?php endif; ?>

        <?php if (!$success): ?>
        <form method="POST" class="auth-form" id="registerForm">
          <div class="form-group">
            <label for="username">Username *</label>
            <div class="input-group">
              <span class="input-icon">
                <i class="bi bi-person"></i>
              </span>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username"
                required
                value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>"
                minlength="3"
                maxlength="50"
              />
            </div>
            <div class="requirements">3-50 characters, letters and numbers only</div>
          </div>

          <div class="form-group">
            <label for="email">Email *</label>
            <div class="input-group">
              <span class="input-icon">
                <i class="bi bi-envelope"></i>
              </span>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                required
                value="<?php echo htmlspecialchars($_POST['email'] ?? ''); ?>"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="display_name">Display Name</label>
            <div class="input-group">
              <span class="input-icon">
                <i class="bi bi-person-badge"></i>
              </span>
              <input
                type="text"
                id="display_name"
                name="display_name"
                placeholder="Enter your display name (optional)"
                value="<?php echo htmlspecialchars($_POST['display_name'] ?? ''); ?>"
                maxlength="100"
              />
            </div>
            <div class="requirements">How your name will appear in the app</div>
          </div>

          <div class="form-group">
            <label for="password">Password *</label>
            <div class="input-group">
              <span class="input-icon">
                <i class="bi bi-lock"></i>
              </span>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                required
                minlength="6"
              />
            </div>
            <div class="password-strength" id="passwordStrength"></div>
            <div class="requirements">Minimum 6 characters</div>
          </div>

          <div class="form-group">
            <label for="confirm_password">Confirm Password *</label>
            <div class="input-group">
              <span class="input-icon">
                <i class="bi bi-lock-fill"></i>
              </span>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                placeholder="Confirm your password"
                required
                minlength="6"
              />
            </div>
            <div class="password-match" id="passwordMatch"></div>
          </div>

          <button type="submit" class="btn-login" id="registerBtn">
            <span class="btn-text">Create Account</span>
            <div class="btn-loading" style="display: none">
              <div class="spinner"></div>
            </div>
          </button>

          <div class="auth-footer">
            <p>Already have an account? <a href="login.php">Login here</a></p>
          </div>
        </form>
        <?php endif; ?>
      </div>
    </div>

    <script>
      // Password strength indicator
      document.getElementById('password')?.addEventListener('input', function() {
        const password = this.value;
        const strengthText = document.getElementById('passwordStrength');
        
        let strength = '';
        let color = '';
        
        if (password.length === 0) {
          strength = '';
        } else if (password.length < 6) {
          strength = 'Weak';
          color = 'strength-weak';
        } else if (password.length < 8) {
          strength = 'Medium';
          color = 'strength-medium';
        } else {
          strength = 'Strong';
          color = 'strength-strong';
        }
        
        strengthText.textContent = strength;
        strengthText.className = 'password-strength ' + color;
      });

      // Password match indicator
      document.getElementById('confirm_password')?.addEventListener('input', function() {
        const password = document.getElementById('password').value;
        const confirmPassword = this.value;
        const matchText = document.getElementById('passwordMatch');
        
        if (confirmPassword.length === 0) {
          matchText.textContent = '';
          this.style.borderColor = '';
        } else if (password === confirmPassword) {
          matchText.textContent = '✓ Passwords match';
          matchText.style.color = '#27ae60';
          this.style.borderColor = '#27ae60';
        } else {
          matchText.textContent = '✗ Passwords do not match';
          matchText.style.color = '#e74c3c';
          this.style.borderColor = '#e74c3c';
        }
      });

      // Form validation
      document.getElementById('registerForm')?.addEventListener('submit', function(e) {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        const username = document.getElementById('username').value;
        
        // Check password match
        if (password !== confirmPassword) {
          e.preventDefault();
          alert('Passwords do not match!');
          document.getElementById('confirm_password').focus();
          return false;
        }
        
        // Check password length
        if (password.length < 6) {
          e.preventDefault();
          alert('Password must be at least 6 characters long!');
          document.getElementById('password').focus();
          return false;
        }
        
        // Check username length
        if (username.length < 3) {
          e.preventDefault();
          alert('Username must be at least 3 characters long!');
          document.getElementById('username').focus();
          return false;
        }
        
        // Show loading
        const btn = document.getElementById('registerBtn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        btn.disabled = true;
      });

      // Clear errors on input
      document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', function() {
          const formGroup = this.closest('.form-group');
          if (formGroup && formGroup.classList.contains('error')) {
            formGroup.classList.remove('error');
            const errorMsg = formGroup.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
          }
        });
      });

      // Auto-focus first field
      document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('username')?.focus();
      });
    </script>
  </body>
</html>