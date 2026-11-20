// =========================================================
// STATE GLOBAL & UTILS
// =========================================================
let tasks = [];
const DB_THEME_KEY = 'ingattugas_theme_v1';
let swRegistration = null;

// Utils
function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function formatDeadlineIndonesia(deadlineStr) {
  if (!deadlineStr) return 'Belum ditentukan';
  const dateObj = new Date(deadlineStr);
  if (isNaN(dateObj.getTime())) return String(deadlineStr);
  return dateObj.toLocaleString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) + ' WIB';
}

function getTaskStatus(progress) {
  if (Number(progress) >= 100) return 'Selesai';
  if (Number(progress) > 0) return 'Sedang Dikerjakan';
  return 'Belum Dikerjakan';
}

function getCountdownInfo(deadlineStr, isCompleted) {
  if (isCompleted) return { text: 'SELESAI', isUrgent: false, isDone: true };
  const diff = new Date(deadlineStr).getTime() - Date.now();
  if (diff <= 0) return { text: 'DEADLINE LEWAT!', isUrgent: true, isDone: false };
  
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  
  return { 
    text: `Sisa: ${d}h ${h}j ${m}m`, 
    isUrgent: diff <= 24 * 60 * 60 * 1000, 
    isDone: false 
  };
}

// Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

// =========================================================
// MODUL AUTHENTICATION (LOGIN/REGISTER/LOGOUT)
// =========================================================
async function checkSession() {
  try {
    const res = await fetch('auth.php', {
      method: 'POST',
      body: new URLSearchParams({ action: 'check_session' })
    });
    const data = await res.json();
    
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';

    if (data.loggedIn) {
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app-content').style.display = 'block';
      document.getElementById('user-email-display').textContent = data.email;
      
      fetchTasks(); // Ambil data tugas setelah login
      updateNotifStatusBadge();
    } else {
      document.getElementById('auth-screen').style.display = 'block';
      document.getElementById('app-content').style.display = 'none';
    }
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    document.getElementById('auth-screen').style.display = 'block';
  }
}

async function doLogin() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  if (!email || !password) return showToast('Isi email dan password!', 'error');

  const formData = new FormData();
  formData.append('action', 'login');
  formData.append('email', email);
  formData.append('password', password);

  try {
    const res = await fetch('auth.php', { method: 'POST', body: formData });
    const data = await res.json();
    showToast(data.message, data.status === 'success' ? 'success' : 'error');
    
    if (data.status === 'success') {
      document.getElementById('auth-password').value = '';
      checkSession();
    }
  } catch (err) {
    showToast('Terjadi kesalahan pada server.', 'error');
  }
}

async function doRegister() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  if (password.length < 6) return showToast('Password minimal 6 karakter', 'error');

  const formData = new FormData();
  formData.append('action', 'register');
  formData.append('email', email);
  formData.append('password', password);

  try {
    const res = await fetch('auth.php', { method: 'POST', body: formData });
    const data = await res.json();
    showToast(data.message, data.status === 'success' ? 'success' : 'error');
    
    if (data.status === 'success') {
      document.getElementById('btn-show-login').click();
    }
  } catch (err) {
    showToast('Terjadi kesalahan pada server.', 'error');
  }
}

async function doLogout() {
  try {
    await fetch('auth.php', { method: 'POST', body: new URLSearchParams({ action: 'logout' }) });
    showToast('Logout berhasil', 'info');
    setTimeout(() => location.reload(), 1000);
  } catch (err) {
    location.reload();
  }
}

// Event Listeners untuk Auth UI
document.getElementById('btn-do-login')?.addEventListener('click', doLogin);
document.getElementById('btn-do-register')?.addEventListener('click', doRegister);
document.getElementById('btn-logout')?.addEventListener('click', doLogout);

document.getElementById('btn-show-register')?.addEventListener('click', () => {
  document.getElementById('auth-title').textContent = 'Buat Akun Baru';
  document.getElementById('btn-do-login').classList.add('hidden');
  document.getElementById('btn-show-register').classList.add('hidden');
  document.getElementById('btn-do-register').classList.remove('hidden');
  document.getElementById('btn-show-login').classList.remove('hidden');
});

document.getElementById('btn-show-login')?.addEventListener('click', () => {
  document.getElementById('auth-title').textContent = 'Masuk ke Akun Anda';
  document.getElementById('btn-do-login').classList.remove('hidden');
  document.getElementById('btn-show-register').classList.remove('hidden');
  document.getElementById('btn-do-register').classList.add('hidden');
  document.getElementById('btn-show-login').classList.add('hidden');
});

// =========================================================
// MODUL CRUD TUGAS (FETCH API.PHP)
// =========================================================
async function fetchTasks() {
  try {
    const response = await fetch('api.php?action=get_tasks');
    if (!response.ok) throw new Error('Gagal ambil data');
    tasks = await response.json();
    refreshAll();
  } catch (error) {
    showToast('Gagal memuat data tugas dari server.', 'error');
  }
}

// Form Submit (Create/Update)
document.getElementById('task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const taskId = document.getElementById('task-id').value;
  const taskData = {
    id: taskId,
    course: document.getElementById('task-course').value.trim(),
    type: document.getElementById('task-type').value,
    name: document.getElementById('task-name').value.trim(),
    deadline: document.getElementById('task-deadline').value,
    priority: document.getElementById('task-priority').value,
    progress: Number(document.getElementById('task-progress').value),
    link: document.getElementById('task-link').value.trim(),
    email: document.getElementById('task-email').value.trim()
  };

  // Jika deadline dari input datetime-local (YYYY-MM-DDTHH:MM), ubah ke format SQL (YYYY-MM-DD HH:MM:SS)
  if (taskData.deadline) {
    taskData.deadline = taskData.deadline.replace('T', ' ') + ':00';
  }

  const action = taskId ? 'edit_task' : 'add_task';
  
  try {
    const res = await fetch(`api.php?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    const result = await res.json();
    
    if(result.status === 'success') {
      showToast(result.message, 'success');
      resetForm();
      switchPage('page-dashboard');
      fetchTasks();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('Koneksi error saat menyimpan.', 'error');
  }
});

// Ubah Progres
async function updateTaskProgress(id, value) {
  try {
    await fetch('api.php?action=update_progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, progress: Number(value) })
    });
    
    const task = tasks.find(t => t.id == id);
    if(task) task.progress = Number(value);
    
    renderTaskGrid(); 
    renderStatsAndBanner();
    renderRekapTable();

    if (Number(value) === 100) showToast('Selamat! Tugas selesai.', 'success');
  } catch (err) {
    showToast('Gagal update progres.', 'error');
  }
}

// Hapus Tugas
async function deleteTask(id) {
  if (!confirm('Yakin ingin menghapus tugas ini?')) return;
  try {
    await fetch('api.php?action=delete_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    });
    showToast('Tugas dihapus.', 'info');
    fetchTasks();
  } catch (err) {
    showToast('Gagal menghapus tugas.', 'error');
  }
}

function editTask(id) {
  const task = tasks.find(t => t.id == id);
  if(!task) return;

  document.getElementById('task-id').value = task.id;
  document.getElementById('task-course').value = task.course;
  document.getElementById('task-type').value = task.type;
  document.getElementById('task-name').value = task.name;
  
  // Format dari SQL ke format input datetime-local
  if(task.deadline) {
    const formatted = task.deadline.replace(' ', 'T').substring(0, 16);
    document.getElementById('task-deadline').value = formatted;
  }
  
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-progress').value = task.progress;
  document.getElementById('task-link').value = task.link || '';
  document.getElementById('task-email').value = task.email || '';

  document.getElementById('form-title').textContent = 'Edit Tugas';
  document.getElementById('btn-submit-task').textContent = 'Update Tugas';
  document.getElementById('btn-cancel-edit').classList.remove('hidden');
  switchPage('page-form');
}

function resetForm() {
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = '';
  document.getElementById('form-title').textContent = 'Tambah Jadwal Tugas Baru';
  document.getElementById('btn-submit-task').textContent = 'Simpan Tugas';
  document.getElementById('btn-cancel-edit').classList.add('hidden');
}

document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
  resetForm();
  switchPage('page-dashboard');
});

// =========================================================
// MODUL RENDER UI (KARTU, STATS, TABEL)
// =========================================================
function renderTaskGrid() {
  const grid = document.getElementById('task-grid');
  if (!grid) return;

  const keyword = document.getElementById('search-input').value.toLowerCase();
  const statusVal = document.getElementById('filter-status').value;
  const prioVal = document.getElementById('filter-prioritas').value;
  const sortVal = document.getElementById('sort-by').value;

  const prioWeight = { 'Tinggi': 3, 'Sedang': 2, 'Rendah': 1 };

  let filtered = tasks.filter(t => {
    const matchText = t.name.toLowerCase().includes(keyword) || t.course.toLowerCase().includes(keyword);
    const matchStatus = statusVal === 'Semua' || getTaskStatus(t.progress) === statusVal;
    const matchPrio = prioVal === 'Semua' || t.priority === prioVal;
    return matchText && matchStatus && matchPrio;
  });

  filtered.sort((a, b) => {
    if (sortVal === 'deadline-asc') return new Date(a.deadline) - new Date(b.deadline);
    if (sortVal === 'priority-desc') return prioWeight[b.priority] - prioWeight[a.priority];
    return 0;
  });

  grid.innerHTML = '';
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align:center; color:var(--text-muted);">Tidak ada tugas yang cocok.</div>';
    return;
  }

  filtered.forEach(task => {
    const isDone = Number(task.progress) >= 100;
    const countdown = getCountdownInfo(task.deadline, isDone);
    const formattedDate = formatDeadlineIndonesia(task.deadline);

    const card = document.createElement('div');
    card.className = `task-card prio-${task.priority} ${isDone ? 'is-done' : ''}`;

    card.innerHTML = `
      <div>
        <div class="task-header">
          <span class="course-tag">${escapeHTML(task.course)}</span>
          <span class="badge badge-${isDone ? 'Selesai' : task.priority}">${isDone ? 'Selesai' : task.priority}</span>
        </div>
        <h4 class="task-title" style="margin-top: 0.5rem;">${escapeHTML(task.name)}</h4>
        <p class="task-meta" style="margin-top: 0.5rem;">Deadline: <strong>${formattedDate}</strong></p>
        ${task.link ? `<p class="task-meta">Link: <a href="${escapeHTML(task.link)}" target="_blank">${escapeHTML(task.link)}</a></p>` : ''}
      </div>

      <div class="countdown-box ${countdown.isUrgent ? 'urgent' : ''} ${countdown.isDone ? 'done' : ''}">
        ${countdown.text}
      </div>

      <div class="progress-wrapper">
        <div class="progress-label">
          <span>Status: ${getTaskStatus(task.progress)}</span>
          <span id="prog-val-${task.id}">${task.progress}%</span>
        </div>
        <div class="progress-track">
          <div id="prog-bar-${task.id}" class="progress-fill ${isDone ? 'complete' : ''}" style="width: ${task.progress}%"></div>
        </div>
        <input type="range" min="0" max="100" step="5" value="${task.progress}"
               oninput="document.getElementById('prog-val-${task.id}').textContent = this.value + '%'; document.getElementById('prog-bar-${task.id}').style.width = this.value + '%';"
               onchange="updateTaskProgress(${task.id}, this.value)">
      </div>

      <div class="btn-group">
        ${!isDone ? `<button class="btn-success btn-sm" onclick="updateTaskProgress(${task.id}, 100)">Selesai</button>` : ''}
        <button class="btn-warning btn-sm" onclick="editTask(${task.id})">Edit</button>
        <button class="btn-danger btn-sm" onclick="deleteTask(${task.id})">Hapus</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderStatsAndBanner() {
  const activeTasks = tasks.filter(t => Number(t.progress) < 100);
  const completedTasks = tasks.filter(t => Number(t.progress) >= 100);
  const urgentTasks = activeTasks.filter(t => {
    const diff = new Date(t.deadline).getTime() - Date.now();
    return diff <= 24 * 60 * 60 * 1000;
  });

  const avg = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + Number(t.progress), 0) / tasks.length) : 0;

  const elAktif = document.getElementById('stat-aktif');
  const elMendesak = document.getElementById('stat-mendesak');
  const elProgres = document.getElementById('stat-progres');
  const elSelesai = document.getElementById('stat-selesai');

  if (elAktif) elAktif.textContent = activeTasks.length;
  if (elMendesak) elMendesak.textContent = urgentTasks.length;
  if (elProgres) elProgres.textContent = avg + '%';
  if (elSelesai) elSelesai.textContent = completedTasks.length;

  const banner = document.getElementById('urgent-banner');
  if (banner) {
    if (urgentTasks.length > 0) {
      banner.classList.remove('hidden');
      document.getElementById('urgent-message').textContent = `Ada ${urgentTasks.length} tugas mendesak (H-1)!`;
    } else {
      banner.classList.add('hidden');
    }
  }
}

function renderRekapTable() {
  const tbody = document.getElementById('tbody-rekap');
  if (!tbody) return;

  tbody.innerHTML = '';
  if(tasks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada data.</td></tr>';
    return;
  }
  tasks.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(t.course)}</strong></td>
      <td>${escapeHTML(t.name)}</td>
      <td>${formatDeadlineIndonesia(t.deadline)}</td>
      <td>${t.priority}</td>
      <td>${t.progress}%</td>
      <td><strong>${getTaskStatus(t.progress)}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

function refreshAll() {
  renderStatsAndBanner();
  renderTaskGrid();
  renderRekapTable();
}

// =========================================================
// MODUL NAVIGASI & TEMA
// =========================================================
const navButtons = document.querySelectorAll('.nav-btn');
const pageSections = document.querySelectorAll('.page-section');

function switchPage(targetId) {
  navButtons.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-target') === targetId));
  pageSections.forEach(sec => sec.classList.toggle('active', sec.id === targetId));
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.getAttribute('data-target')));
});

// Dark Mode
const btnTheme = document.getElementById('btn-theme');
if (localStorage.getItem(DB_THEME_KEY) === 'dark') {
  document.body.classList.add('dark-theme');
  if(btnTheme) btnTheme.textContent = 'Mode Terang';
}
btnTheme?.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  btnTheme.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
  localStorage.setItem(DB_THEME_KEY, isDark ? 'dark' : 'light');
});

// Filter Events
['search-input', 'filter-status', 'filter-prioritas', 'sort-by'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', renderTaskGrid);
    el.addEventListener('change', renderTaskGrid);
  }
});

// =========================================================
// LAIN-LAIN (EXPORT, NOTIF DASAR)
// =========================================================
document.getElementById('btn-export-db')?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tugas_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});

function updateNotifStatusBadge() {
  const badge = document.getElementById('notif-status-badge');
  if (!badge) return;

  if (!('Notification' in window)) {
    badge.textContent = 'Tidak Didukung Browser'; 
    badge.className = 'badge badge-Tinggi'; 
    return;
  }
  if (Notification.permission === 'granted') {
    badge.textContent = 'Notifikasi Aktif'; 
    badge.className = 'badge badge-Selesai';
  } else {
    badge.textContent = 'Belum Diizinkan'; 
    badge.className = 'badge badge-Sedang';
  }
}

document.getElementById('btn-enable-notif')?.addEventListener('click', async () => {
  if (!('Notification' in window)) return showToast('Browser tidak mendukung notifikasi.', 'error');
  const perm = await Notification.requestPermission();
  updateNotifStatusBadge();
  if (perm === 'granted') {
    new Notification('IngatTugas', { body: 'Notifikasi berhasil diaktifkan!' });
    showToast('Notifikasi diaktifkan!', 'success');
  }
});

document.getElementById('btn-test-notif-now')?.addEventListener('click', () => {
  if (Notification.permission === 'granted') {
    new Notification('Tes Notifikasi', { body: 'Ini adalah tes alarm pengingat tugas.' });
  } else {
    showToast('Aktifkan izin notifikasi terlebih dahulu.', 'error');
  }
});

// Inisialisasi awal saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
});