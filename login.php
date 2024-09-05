<?php
header('Content-Type: application/json');

// Database connection parameters
$servername = localhost; // Typically 'localhost' on Freehostia
$username = soudey95; // Replace with your Freehostia MySQL username
$password = abh@y2024; // Replace with your Freehostia MySQL password
$dbname = soudey95_abhay_db; // Replace with your Freehostia MySQL database name

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(array("success" => false, "message" => "Connection failed: " . $conn->connect_error)));
}

// Get POST data
$user = $_POST['username'] ?? '';
$pass = $_POST['password'] ?? '';

if (empty($user) || empty($pass)) {
    echo json_encode(array("success" => false, "message" => "Missing username or password"));
    exit();
}

// Prepare and execute query
$stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
$stmt->bind_param("ss", $user, $pass);
$stmt->execute();
$result = $stmt->get_result();

// Check if credentials are valid
if ($result->num_rows > 0) {
    echo json_encode(array("success" => true));
} else {
    echo json_encode(array("success" => false, "message" => "Invalid username or password"));
}

// Close connection
$stmt->close();
$conn->close();
?>
