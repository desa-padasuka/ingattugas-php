<?php
session_start();
require 'koneksi.php';

header('Content-Type: application/json');
$action = $_POST['action'] ?? '';

if ($action === 'register') {
    $email = $_POST['email'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT); // Hash password!

    $stmt = $conn->prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    $stmt->bind_param("ss", $email, $password);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Pendaftaran berhasil! Silakan login."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Email sudah terdaftar."]);
    }
    exit;
}

if ($action === 'login') {
    $email = $_POST['email'];
    $password = $_POST['password'];

    $stmt = $conn->prepare("SELECT id, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        if (password_verify($password, $row['password'])) {
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['email'] = $email;
            echo json_encode(["status" => "success", "message" => "Login berhasil!"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Password salah."]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Email tidak ditemukan."]);
    }
    exit;
}

if ($action === 'logout') {
    session_destroy();
    echo json_encode(["status" => "success", "message" => "Logout berhasil."]);
    exit;
}

if ($action === 'check_session') {
    if (isset($_SESSION['user_id'])) {
        echo json_encode(["loggedIn" => true, "email" => $_SESSION['email']]);
    } else {
        echo json_encode(["loggedIn" => false]);
    }
    exit;
}
?>