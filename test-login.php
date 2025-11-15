<?php
session_start();
?>
<!DOCTYPE html>
<html>
<head>
    <title>Test Login</title>
    <style>
        body { font-family: Arial; padding: 50px; }
        .box { background: #f5f5f5; padding: 30px; border-radius: 10px; max-width: 400px; margin: 0 auto; }
        input, button { width: 100%; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="box">
        <h2>Test Login (No Redirect)</h2>
        <form method="post">
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Login Test</button>
        </form>
        
        <?php
        if ($_POST['username']) {
            echo "<h3>Form Submitted:</h3>";
            echo "Username: " . $_POST['username'] . "<br>";
            echo "Password: " . $_POST['password'] . "<br>";
            
            // Manual session set untuk testing
            $_SESSION['user_id'] = 1;
            $_SESSION['username'] = $_POST['username'];
            $_SESSION['user_role'] = 'user';
            $_SESSION['display_name'] = 'Test User';
            
            echo "<p style='color:green'>Session set manually!</p>";
            echo "<a href='index.php'>Go to Index</a>";
        }
        ?>
    </div>
</body>
</html>