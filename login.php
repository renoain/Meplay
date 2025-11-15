<?php
if (isset($_GET['logout'])) {
    session_start();
    session_destroy();
    $_SESSION = array();
    session_write_close();
}

// Database configuration
$host = "localhost";
$db_name = "meplay_db";
$username = "root";
$password = "";

// Try database connection
try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    $conn = null;
}

$error = '';

// Handle login form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = trim($_POST['username']);
    $password = $_POST['password'];

    // Demo users (fallback if database not working)
    $demo_users = [
        'admin' => ['password' => 'admin123', 'role' => 'admin', 'display_name' => 'Administrator'],
        'user' => ['password' => 'user123', 'role' => 'user', 'display_name' => 'Regular User'],
        'demo' => ['password' => 'demo123', 'role' => 'user', 'display_name' => 'Demo User']
    ];

    if (empty($username) || empty($password)) {
        $error = 'Please fill in all fields';
    } else {
        // Try database first
        $user_found = false;
        
        if ($conn) {
            try {
                $query = "SELECT * FROM users WHERE username = :username OR email = :username";
                $stmt = $conn->prepare($query);
                $stmt->bindParam(':username', $username);
                $stmt->execute();
                
                if ($stmt->rowCount() == 1) {
                    $user = $stmt->fetch(PDO::FETCH_ASSOC);
                    $user_found = true;
                    
                    if (password_verify($password, $user['password'])) {
                        // Login success - START NEW SESSION
                        session_start();
                        $_SESSION['user_id'] = $user['id'];
                        $_SESSION['username'] = $user['username'];
                        $_SESSION['user_role'] = $user['role'];
                        $_SESSION['display_name'] = $user['display_name'] ?: $user['username'];
                        
                        header('Location: index.php');
                        exit();
                    }
                }
            } catch (Exception $e) {
                // Database error, continue to demo users
            }
        }
        
        // Fallback to demo users if database not working or user not found
        if (!$user_found && isset($demo_users[$username]) && $demo_users[$username]['password'] === $password) {
            // Login success with demo user - START NEW SESSION
            session_start();
            $_SESSION['user_id'] = 1;
            $_SESSION['username'] = $username;
            $_SESSION['user_role'] = $demo_users[$username]['role'];
            $_SESSION['display_name'] = $demo_users[$username]['display_name'];
            
            header('Location: index.php');
            exit();
        } else {
            $error = 'Invalid username or password';
        }
    }
}

// If somehow already logged in (shouldn't happen because we clear session), redirect to index
session_start();
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
    <title>MePlay - Login</title>
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css"
    />
    <link rel="stylesheet" href="assets/css/auth.css" />
  </head>
  <body>
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="logo">MePlay</h1>
          <p class="auth-subtitle">Your Music Player</p>
        </div>

        <?php if ($error): ?>
        <div class="alert alert-danger"><?php echo $error; ?></div>
        <?php endif; ?>

        <form method="POST" class="auth-form">
          <div class="form-group">
            <label for="username">Username or Email</label>
            <div class="input-group">
              <span class="input-icon">
                <i class="bi bi-person"></i>
              </span>
              <input
                type="text"
                class="form-control"
                id="username"
                name="username"
                placeholder="Enter your username or email"
                required
                value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="input-group">
              <span class="input-icon">
                <i class="bi bi-lock"></i>
              </span>
              <input
                type="password"
                class="form-control"
                id="password"
                name="password"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button type="submit" class="btn-login">
            Sign In
          </button>

      <div class="auth-footer">
    <p>Don't have an account? <a href="http://localhost/meplay/register.php">Register here</a></p>
    
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
      // Simple form enhancement
      document.getElementById('loginForm')?.addEventListener('submit', function(e) {
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Signing In...';
        }
      });

      // Add spin animation
      const style = document.createElement('style');
      style.textContent = `
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    </script>
  </body>
</html>