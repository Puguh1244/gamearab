// EVENT LISTENERS
// =============================================

const pinInput = document.getElementById('access-pin-input');
const pinCheckBtn = document.getElementById('pin-check-btn');
if (pinInput) {
  pinInput.addEventListener('input', () => updatePinAccess(false));
  pinInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (requireAccessPin()) startGame(true);
    }
  });
}
if (pinCheckBtn) {
  pinCheckBtn.addEventListener('click', () => updatePinAccess(true));
}
updatePinAccess(false);

document.getElementById('start-btn').addEventListener('click', () => startGame(true));
document.getElementById('mouse-only-btn').addEventListener('click', () => startGame(false));
document.getElementById('add-question-btn').addEventListener('click', addTeacherQuestion);
document.getElementById('hint-btn').addEventListener('click', () => applyAdaptiveHint('manual'));
document.getElementById('back-to-menu-btn').addEventListener('click', returnToMenu);
document.getElementById('menu-from-level-btn').addEventListener('click', returnToMenu);
document.getElementById('menu-from-gameover-btn').addEventListener('click', returnToMenu);
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => setPlayMode(btn.dataset.mode));
});

document.querySelectorAll('.track-btn').forEach(btn => {
  btn.addEventListener('click', () => setLearningTrack(btn.dataset.track));
});

document.querySelectorAll('.vocab-btn').forEach(btn => {
  btn.addEventListener('click', () => setVocabularySubchapter(btn.dataset.vocab));
});

document.getElementById('next-btn').addEventListener('click', () => {
  const scene = phaserGame && phaserGame.scene ? phaserGame.scene.getScene('GameScene') : null;
  if (scene) scene.nextLevel();
});

document.getElementById('report-btn').addEventListener('click', () => {
  updateHandStatsPanel();
  if (typeof window.requestGroqKapAnalysis === 'function') {
    window.requestGroqKapAnalysis({ reason: 'manual-report' });
  }
  const report = document.getElementById('hand-stats');
  report.classList.toggle('show');
  document.getElementById('report-btn').textContent = report.classList.contains('show')
    ? 'Tutup Laporan ✨'
    : 'Lihat Analisis 📊';
});

const downloadReportBtn = document.getElementById('download-report-btn');
if (downloadReportBtn) {
  downloadReportBtn.addEventListener('click', downloadGameOverReportPdf);
}

document.getElementById('restart-btn').addEventListener('click', () => {
  const scene = phaserGame && phaserGame.scene ? phaserGame.scene.getScene('GameScene') : null;
  if (scene) {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('game-over').querySelector('h2').textContent = '🌈 Yuk Coba Lagi!';
    document.getElementById('game-over').querySelector('h2').style.color = '#1687d9';
    document.getElementById('hand-stats').classList.remove('show');
    document.getElementById('report-btn').textContent = 'Lihat Analisis 📊';
    scene.restartGame();
  }
});

window.addEventListener('resize', () => {
  resizeHandCanvas();
  if (phaserGame) phaserGame.scale.resize(window.innerWidth, window.innerHeight);
});

// =============================================

document.querySelectorAll('[data-scroll-target]').forEach(button => {
  button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.scrollTarget);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Protected navigation for teacher-only pages
let protectedAction = null;
let teacherToolsUnlocked = false;

function scrollToSectionById(id) {
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openProtectedPinModal(action, copy) {
  protectedAction = action;
  const modal = document.getElementById('protected-pin-modal');
  const input = document.getElementById('protected-pin-input');
  const status = document.getElementById('protected-pin-status');
  const copyEl = document.getElementById('protected-pin-copy');
  if (copyEl && copy) copyEl.textContent = copy;
  if (status) {
    status.textContent = 'PIN hanya untuk Tambah Soal dan Dashboard Penilaian.';
    status.className = '';
  }
  if (input) input.value = '';
  modal?.classList.add('show');
  modal?.setAttribute('aria-hidden', 'false');
  setTimeout(() => input?.focus(), 80);
}

function closeProtectedPinModal() {
  const modal = document.getElementById('protected-pin-modal');
  modal?.classList.remove('show');
  modal?.setAttribute('aria-hidden', 'true');
  protectedAction = null;
}

function unlockProtectedAction() {
  const input = document.getElementById('protected-pin-input');
  const status = document.getElementById('protected-pin-status');
  const pin = (input?.value || '').trim();
  if (pin !== '123123') {
    if (status) {
      status.textContent = 'PIN salah. Coba masukkan ulang.';
      status.className = 'error';
    }
    return;
  }
  if (status) {
    status.textContent = 'PIN benar. Akses dibuka.';
    status.className = 'unlocked';
  }
  const action = protectedAction;
  closeProtectedPinModal();
  if (action === 'questions') {
    teacherToolsUnlocked = true;
    const tools = document.getElementById('teacher-tools-section');
    if (tools) tools.hidden = false;
    renderQuestionBankList();
    scrollToSectionById('teacher-tools-section');
  } else if (action === 'dashboard') {
    openTeacherDashboard();
  }
}

document.getElementById('open-teacher-tools-nav-btn')?.addEventListener('click', () => {
  if (teacherToolsUnlocked) {
    const tools = document.getElementById('teacher-tools-section');
    if (tools) tools.hidden = false;
    renderQuestionBankList();
    scrollToSectionById('teacher-tools-section');
    return;
  }
  openProtectedPinModal('questions', 'Masukkan PIN guru untuk membuka fitur tambah dan hapus soal.');
});

document.getElementById('hero-start-scroll-btn')?.addEventListener('click', () => scrollToSectionById('learning-section'));

document.getElementById('protected-pin-submit')?.addEventListener('click', unlockProtectedAction);
document.getElementById('protected-pin-input')?.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    unlockProtectedAction();
  }
});
document.getElementById('protected-pin-close')?.addEventListener('click', closeProtectedPinModal);
document.getElementById('protected-pin-modal')?.addEventListener('click', event => {
  if (event.target && event.target.id === 'protected-pin-modal') closeProtectedPinModal();
});
document.getElementById('question-bank-items')?.addEventListener('click', event => {
  const button = event.target.closest('[data-question-index]');
  if (button) deleteTeacherQuestion(button.dataset.questionIndex);
});
