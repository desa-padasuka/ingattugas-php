<?php
session_start();
require 'koneksi.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// 1. AMBIL SEMUA TUGAS (READ)
if ($method === 'GET' && $action === 'get_tasks') {
    $stmt = $conn->prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY deadline ASC");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = $row;
    }
    echo json_encode($tasks);
    exit;
}

// 2. TAMBAH TUGAS BARU (CREATE)
if ($method === 'POST' && $action === 'add_task') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $stmt = $conn->prepare("INSERT INTO tasks (user_id, course, type, name, deadline, priority, progress, link, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("isssssiss", 
        $user_id, 
        $data['course'], 
        $data['type'], 
        $data['name'], 
        $data['deadline'], 
        $data['priority'], 
        $data['progress'], 
        $data['link'], 
        $data['email']
    );
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Tugas ditambahkan"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal menambahkan tugas"]);
    }
    exit;
}

// 3. UPDATE PROGRES (UPDATE)
if ($method === 'POST' && $action === 'update_progress') {
    $data = json_decode(file_get_contents("php://input"), true);
    $stmt = $conn->prepare("UPDATE tasks SET progress = ? WHERE id = ? AND user_id = ?");
    $stmt->bind_param("iii", $data['progress'], $data['id'], $user_id);
    $stmt->execute();
    echo json_encode(["status" => "success", "message" => "Progres diperbarui"]);
    exit;
}

// 4. HAPUS TUGAS (DELETE)
if ($method === 'POST' && $action === 'delete_task') {
    $data = json_decode(file_get_contents("php://input"), true);
    $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $data['id'], $user_id);
    $stmt->execute();
    echo json_encode(["status" => "success", "message" => "Tugas dihapus"]);
    exit;
}
?>