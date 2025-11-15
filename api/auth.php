<?php
session_start();
require_once '../config/config.php';

if ($_POST['action'] === 'login') {
    $username = $_POST['username'];
    $password = $_POST['password'];
    
    // Check demo users
    if (isset($demo_users[$username]) && $demo_users[$username]['password'] === $password) {
        $_SESSION['user'] = [
            'username' => $username,
            'role' => $demo_users[$username]['role'],
            'display_name' => $demo_users[$username]['display_name']
        ];
        
        echo json_encode(['success' => true, 'message' => 'Login successful']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }
    exit();
}
?>