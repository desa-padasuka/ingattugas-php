// reminder.js
const fs = require('fs');

async function checkAndSendReminders() {
  const tasks = JSON.parse(fs.readFileSync('tasks.json', 'utf8'));
  const now = new Date();
  let updated = false;

  console.log(`[${now.toISOString()}] Mengecek tugas...`);

  for (let task of tasks) {
    // Lewati jika tugas sudah selesai atau sudah pernah dikirim email
    if (task.progress >= 100 || task.emailedH1) continue;

    const deadlineDate = new Date(task.deadline);
    const diffMs = deadlineDate - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    // Jika sisa waktu <= 24 jam (H-1) dan belum lewat
    if (diffHours > 0 && diffHours <= 24) {
      console.log(`Mengirim email H-1 untuk tugas: ${task.name}`);
      
      const subject = `Pengingat H-1: ${task.name} (${task.course})`;
      const body = `Halo!\n\nTugas Anda "${task.name}" untuk mata kuliah ${task.course} akan berakhir dalam waktu kurang dari 24 jam.\n\nDeadline: ${deadlineDate.toLocaleString('id-ID')}\nProgres saat ini: ${task.progress}%\n\nSegera selesaikan tugas Anda!`;

      try {
        const response = await fetch(`https://formsubmit.co/ajax/${task.email}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            _subject: subject,
            _captcha: 'false',
            Pesan: body
          })
        });

        const result = await response.json();
        if (response.ok) {
          console.log(`✅ Email berhasil dikirim ke ${task.email}`);
          task.emailedH1 = true; // Tandai sudah dikirim
          updated = true;
        } else {
          console.error('❌ Gagal mengirim:', result);
        }
      } catch (error) {
        console.error('❌ Error jaringan:', error);
      }
    }
  }

  // Simpan perubahan status emailedH1 kembali ke tasks.json
  if (updated) {
    fs.writeFileSync('tasks.json', JSON.stringify(tasks, null, 2));
    console.log('Database tasks.json diperbarui.');
  } else {
    console.log('Tidak ada email yang perlu dikirim saat ini.');
  }
}

checkAndSendReminders();