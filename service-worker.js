<script>
const reminders = [
  "audio/reminder1.mp3",
  "audio/reminder2.mp3",
  "audio/reminder3.mp3",
  "audio/reminder4.mp3",
  "audio/reminder5.mp3",
  "audio/reminder6.mp3"
];

let reminderInterval = null;
const audioPlayer = document.getElementById("calmAudio");

function showTab(id) {
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  event.target.classList.add('active');
}

function playRandomReminder() {
  const file = reminders[Math.floor(Math.random() * reminders.length)];
  audioPlayer.src = file;
  audioPlayer.volume = 0.9;
  audioPlayer.play().catch(() => {});
}

function startReminders() {
  stopReminders();
  playRandomReminder();
  reminderInterval = setInterval(playRandomReminder, 45000);
}

function stopReminders() {
  clearInterval(reminderInterval);
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
}

document.getElementById('anger').oninput = e => {
  document.getElementById('angerValue').textContent = e.target.value;
};

function saveLog() {
  const logs = JSON.parse(localStorage.getItem('calmLogs') || '[]');
  logs.unshift({
    trigger: trigger.value,
    anger: anger.value,
    handled: handled.checked,
    date: new Date()
  });
  localStorage.setItem('calmLogs', JSON.stringify(logs));
  alert('Saved. Nice job staying aware.');
  loadStats();
}

function loadStats() {
  const logs = JSON.parse(localStorage.getItem('calmLogs') || '[]');
  const calm = logs.filter(l => l.handled).length;
  totalLogs.textContent = logs.length;
  calmPercent.textContent = logs.length
    ? Math.round((calm / logs.length) * 100) + '%'
    : '0%';

  if (calm >= 3) {
    highFive.textContent = "🙌 High-five! You stayed calm on multiple drives!";
  }
}

loadStats();
</script>
