<?php
session_start();
// Jika user sudah login, arahkan langsung ke aplikasi
$is_logged_in = isset($_SESSION['user_id']);
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IngatTugas - Web Pengingat Tugas Kuliah</title>
  <link rel="stylesheet" href="style.css">
  <style>
    /* CSS Tambahan kecil untuk menutupi layar saat loading */
    #loading-overlay { position: fixed; inset: 0; background: var(--bg-body); z-index: 9999; display: flex; justify-content: center; align-items: center; flex-direction: column; gap: 1rem; }
    .spinner { width: 40px; height: 40px; border: 4px solid var(--border-color); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>

  <!-- LAYAR LOADING AWAL -->
  <div id="loading-overlay">
    <div class="spinner"></div>
    <h3 style="color: var(--text-muted);">Memuat IngatTugas...</h3>
  </div>

  <!-- ================= HALAMAN LOGIN / REGISTER ================= -->
  <div id="auth-screen" class="container" style="max-width: 400px; margin-top: 10vh; display: none;">
    <div class="card form-container" style="padding: 2rem;">
      <div class="brand" style="justify-content: center; margin-bottom: 1.5rem;">
        <div class="brand-logo">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </div>
        <div class="brand-text">
          <h1 style="font-size: 1.6rem;">IngatTugas</h1>
        </div>
      </div>
      <h3 id="auth-title" style="text-align: center; margin-bottom: 1.5rem; color: var(--text-main);">Masuk ke Akun Anda</h3>
      
      <div class="form-group">
        <label for="auth-email">Email</label>
        <input type="email" id="auth-email" placeholder="mahasiswa@email.com">
      </div>
      <div class="form-group">
        <label for="auth-password">Password</label>
        <input type="password" id="auth-password" placeholder="Minimal 6 karakter">
      </div>
      
      <div class="btn-group" style="margin-top: 1.5rem; flex-direction: column;">
        <button id="btn-do-login" class="btn-primary" style="width: 100%;">Login</button>
        <button id="btn-show-register" class="btn-outline" style="width: 100%;">Belum punya akun? Daftar</button>
        <button id="btn-do-register" class="btn-success hidden" style="width: 100%;">Daftar Sekarang</button>
        <button id="btn-show-login" class="btn-outline hidden" style="width: 100%;">Sudah punya akun? Login</button>
      </div>
    </div>
  </div>

  <!-- ================= APLIKASI UTAMA (Hanya muncul jika sudah login) ================= -->
  <div id="app-content" style="display: none;">
    
    <!-- Header & Navigasi -->
    <header class="navbar">
      <div class="brand">
        <div class="brand-logo" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </div>
        <div class="brand-text">
          <h1>IngatTugas</h1>
          <span id="user-email-display">Memuat...</span>
        </div>
      </div>

      <nav class="nav-menu">
        <button class="nav-btn active" data-target="page-dashboard">Daftar Tugas</button>
        <button class="nav-btn" data-target="page-form">+ Tambah Tugas</button>
        <button class="nav-btn" data-target="page-database">Arsip & Database</button>
        <button id="btn-theme" class="btn-outline">Mode Gelap</button>
        <button id="btn-logout" class="btn-danger">Logout</button>
      </nav>
    </header>

    <main class="container">
      <!-- Banner Peringatan Otomatis -->
      <div id="urgent-banner" class="urgent-banner hidden">
        <div class="banner-content">
          <div>
            <strong>PERINGATAN DEADLINE MENDEKATI:</strong>
            <span id="urgent-message">Ada tugas yang mendekati batas waktu!</span>
          </div>
          <button id="btn-notif-urgent-now" class="btn-danger btn-sm">Kirim Peringatan Sekarang</button>
        </div>
      </div>

      <!-- Panel Kontrol Notifikasi Langsung ke HP -->
      <section class="card notif-panel">
        <div class="notif-panel-flex">
          <div>
            <div class="notif-title-row">
              <h3>Pengaturan Notifikasi & Alarm Langsung HP</h3>
              <span id="notif-status-badge" class="badge badge-Sedang">Memeriksa Izin...</span>
            </div>
            <p class="text-muted">Aktifkan izin notifikasi agar alarm peringatan deadline muncul di layar HP.</p>
          </div>
          <div class="btn-group">
            <button id="btn-enable-notif" class="btn-success">1. Aktifkan Izin Notif</button>
            <button id="btn-test-notif-now" class="btn-primary">2. Tes Notif & Alarm</button>
          </div>
        </div>
      </section>

      <!-- Panel Pengaturan Email -->
      <section class="card notif-panel email-panel">
        <div class="notif-panel-flex">
          <div style="flex: 1; min-width: 240px;">
            <div class="notif-title-row">
              <h3>Pengingat Otomatis Email (H-1)</h3>
              <span id="email-status-badge" class="badge badge-Sedang">Email Belum Diatur</span>
            </div>
            <p class="text-muted">Sistem akan mengirim email peringatan H-1 jika tugas belum selesai.</p>
          </div>
          <div class="btn-group" style="align-items: center;">
            <input type="email" id="input-user-email" placeholder="nama@email.com" style="width: 220px;">
            <button type="button" id="btn-save-email" class="btn-primary">Simpan Email</button>
            <button type="button" id="btn-test-email-h1" class="btn-warning">Tes Email H-1</button>
          </div>
        </div>
      </section>

      <!-- Ringkasan Statistik -->
      <section class="stats-grid">
        <div class="stat-card">
          <p class="stat-label">Tugas Aktif</p>
          <h2 id="stat-aktif">0</h2>
        </div>
        <div class="stat-card danger">
          <p class="stat-label">Mendesak (< 24 Jam)</p>
          <h2 id="stat-mendesak">0</h2>
        </div>
        <div class="stat-card info">
          <p class="stat-label">Rata-Rata Progres</p>
          <h2 id="stat-progres">0%</h2>
        </div>
        <div class="stat-card success">
          <p class="stat-label">Tugas Selesai</p>
          <h2 id="stat-selesai">0</h2>
        </div>
      </section>

      <!-- HALAMAN 1: DASHBOARD -->
      <section id="page-dashboard" class="page-section active">
        <div class="card filter-bar">
          <input type="text" id="search-input" placeholder="Cari judul tugas atau mata kuliah...">
          <select id="filter-status">
            <option value="Semua">Semua Status</option>
            <option value="Belum Dikerjakan">Belum Dikerjakan</option>
            <option value="Sedang Dikerjakan">Sedang Dikerjakan</option>
            <option value="Selesai">Selesai</option>
          </select>
          <select id="filter-prioritas">
            <option value="Semua">Semua Prioritas</option>
            <option value="Tinggi">Prioritas Tinggi</option>
            <option value="Sedang">Prioritas Sedang</option>
            <option value="Rendah">Prioritas Rendah</option>
          </select>
          <select id="sort-by">
            <option value="deadline-asc">Urutkan: Deadline Terdekat</option>
            <option value="priority-desc">Urutkan: Prioritas Tertinggi</option>
          </select>
        </div>
        <div id="task-grid" class="task-grid"></div>
      </section>

      <!-- HALAMAN 2: FORM TAMBAH TUGAS -->
      <section id="page-form" class="page-section">
        <div class="card form-container">
          <h3 id="form-title">Tambah Jadwal Tugas Baru</h3>
          <form id="task-form">
            <input type="hidden" id="task-id">
            <div class="form-row">
              <div class="form-group">
                <label for="task-course">Mata Kuliah</label>
                <input type="text" id="task-course" placeholder="Contoh: Pemrograman Web" required>
              </div>
              <div class="form-group">
                <label for="task-type">Jenis Pengerjaan</label>
                <select id="task-type" required>
                  <option value="Individu">Tugas Individu</option>
                  <option value="Kelompok">Tugas Kelompok</option>
                  <option value="Praktikum">Laporan Praktikum</option>
                  <option value="Proyek UTS/UAS">Proyek UTS / UAS</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="task-name">Nama / Judul Tugas</label>
              <input type="text" id="task-name" placeholder="Contoh: Membuat Aplikasi Web" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="task-deadline">Batas Waktu (Deadline)</label>
                <input type="datetime-local" id="task-deadline" required>
              </div>
              <div class="form-group">
                <label for="task-priority">Prioritas</label>
                <select id="task-priority" required>
                  <option value="Tinggi">Tinggi (Mendesak)</option>
                  <option value="Sedang" selected>Sedang</option>
                  <option value="Rendah">Rendah</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="task-progress">Progres (%)</label>
                <input type="number" id="task-progress" min="0" max="100" value="0" required>
              </div>
              <div class="form-group">
                <label for="task-link">Tautan / Catatan</label>
                <input type="text" id="task-link" placeholder="https://...">
              </div>
            </div>
            <div class="form-group">
              <label for="task-email">Email Pengingat H-1</label>
              <input type="email" id="task-email" placeholder="email@contoh.com">
            </div>
            <div class="btn-group">
              <button type="submit" id="btn-submit-task" class="btn-primary">Simpan Tugas</button>
              <button type="button" id="btn-cancel-edit" class="btn-outline hidden">Batal Edit</button>
            </div>
          </form>
        </div>
      </section>

      <!-- HALAMAN 3: DATABASE -->
      <section id="page-database" class="page-section">
        <div class="card">
          <div class="card-header-flex">
            <h3>Rekapitulasi Tugas Anda</h3>
            <div class="btn-group">
              <button id="btn-export-db" class="btn-primary">Export ke JSON</button>
            </div>
          </div>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Mata Kuliah</th>
                  <th>Nama Tugas</th>
                  <th>Deadline</th>
                  <th>Prioritas</th>
                  <th>Progres</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="tbody-rekap"></tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p><strong>IngatTugas</strong> — Sistem Pengingat Tugas Kuliah Terintegrasi.</p>
    </footer>
  </div>

  <!-- Wadah Toast -->
  <div id="toast-container"></div>

  <!-- SCRIPT.JS DIMUAT DI AKHIR -->
  <script src="script.js"></script>
</body>
</html>