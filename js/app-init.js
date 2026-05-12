// LOADING, PRIVACY-FIRST INIT & SETTINGS
// =============================================
let loadingProgress = 0;
let fallbackEnabled = false;
let fallbackInputActive = false;
let cameraStarted = false;

function setLoadingProgress(pct, msg) {
  loadingProgress = pct;
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) loadingBar.style.width = pct + '%';

  // Status teks sengaja dihapus dari UI agar menu tidak ramai.
  const loadingStatus = document.getElementById('loading-status');
  if (loadingStatus) loadingStatus.textContent = '';
}

let setupToastTimer = null;
function showSetupToast(message, kind = '') {
  const toast = document.getElementById('setup-toast');
  if (!toast || !message) return;
  if (setupToastTimer) clearTimeout(setupToastTimer);
  toast.textContent = message;
  toast.className = `show ${kind}`.trim();
  setupToastTimer = setTimeout(() => {
    toast.className = '';
    toast.textContent = '';
    setupToastTimer = null;
  }, kind === 'error' ? 4200 : 2600);
}



const ACCESS_PIN = '123123';

function isAccessPinValid() {
  const input = document.getElementById('access-pin-input');
  return !input || input.value.trim() === ACCESS_PIN;
}

function setStartButtonsLocked(locked) {
  // PIN hanya dipakai untuk Tambah Soal dan Dashboard Penilaian. Tombol bermain tetap bebas diakses siswa.
  ['start-btn', 'mouse-only-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = false;
    btn.setAttribute('aria-disabled', 'false');
    btn.title = '';
  });
}

function updatePinAccess(showMessage = false) {
  const status = document.getElementById('pin-status');
  const input = document.getElementById('access-pin-input');
  const valid = isAccessPinValid();
  GameState.pinVerified = valid;
  setStartButtonsLocked(!valid);

  if (status) {
    status.className = '';
    if (valid) {
      status.textContent = 'PIN benar. Tombol mulai sudah aktif.';
      status.classList.add('unlocked');
    } else if (showMessage && input && input.value.trim().length > 0) {
      status.textContent = 'PIN salah. Coba masukkan lagi.';
      status.classList.add('error');
    } else {
      status.textContent = 'Masukkan PIN untuk mengaktifkan tombol mulai.';
    }
  }
}

function requireAccessPin() {
  // Dipertahankan agar kode lama tetap aman, tetapi bermain tidak dikunci PIN.
  GameState.pinVerified = true;
  return true;
}

function refreshQuestionCountChip() {
  const chip = document.getElementById('question-count-chip');
  if (!chip) return;
  const track = LEARNING_TRACKS[GameState.learningTrack] || LEARNING_TRACKS.hijaiyah;
  const count = buildQuestionSet(GameState.learningTrack).length;
  const teacherCount = Array.isArray(CUSTOM_QUESTIONS) ? CUSTOM_QUESTIONS.length : 0;
  const subLabel = GameState.learningTrack === 'vocabulary'
    ? ` • ${(VOCAB_SUBCHAPTERS[GameState.vocabSubchapter] || VOCAB_SUBCHAPTERS.general).label}`
    : '';
  chip.textContent = `📚 ${count} soal • ${track.label}${subLabel}${teacherCount ? ` • ${teacherCount} soal guru` : ''}`;
}

function updateVocabularyPanelVisibility() {
  const panel = document.getElementById('vocab-panel');
  if (!panel) return;
  panel.style.display = (GameState.learningTrack === 'vocabulary' || GameState.learningTrack === 'mixed') ? 'block' : 'none';
}

function setVocabularySubchapter(subchapter) {
  selectedVocabSubchapter = VOCAB_SUBCHAPTERS[subchapter] ? subchapter : 'nouns';
  GameState.vocabSubchapter = selectedVocabSubchapter;
  document.querySelectorAll('.vocab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.vocab === selectedVocabSubchapter);
  });
  QUESTIONS = buildQuestionSet(GameState.learningTrack);
  refreshQuestionCountChip();
  const subText = (VOCAB_SUBCHAPTERS[selectedVocabSubchapter] || VOCAB_SUBCHAPTERS.nouns).label;
  setLoadingProgress(30, `Sub-bab ${subText} dipilih. Siap mulai.`);
}

function setLearningTrack(track) {
  GameState.learningTrack = LEARNING_TRACKS[track] ? track : 'hijaiyah';
  QUESTIONS = buildQuestionSet(GameState.learningTrack);
  document.querySelectorAll('.track-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.track === GameState.learningTrack);
  });
  refreshQuestionCountChip();
  updateVocabularyPanelVisibility();
  const trackText = (LEARNING_TRACKS[GameState.learningTrack] || LEARNING_TRACKS.hijaiyah).label;
  setLoadingProgress(30, `Materi ${trackText} dipilih. Siap mulai.`);
}

function setPlayMode(mode) {
  GameState.mode = PLAY_MODES[mode] ? mode : 'learn';
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === GameState.mode);
  });
  const modeText = getModeLabel();
  setLoadingProgress(30, `Mode ${modeText} dipilih. Siap mulai.`);
}

function readStartSettings() {
  const rawName = document.getElementById('student-name-input')?.value || 'Siswa';
  GameState.studentName = rawName.trim().slice(0, 24) || 'Siswa';
  const rawClass = document.getElementById('student-class-input')?.value || 'Kelas Umum';
  GameState.studentClass = rawClass.trim().slice(0, 32) || 'Kelas Umum';
  GameState.voiceMode = document.getElementById('voice-toggle')?.value || 'sfx';
  GameState.voiceEnabled = GameState.voiceMode !== 'off';
  GameState.selectedVoice = chooseBestVoice();
}

function showStartButton() {
  document.getElementById('start-btn').style.display = 'block';
  document.getElementById('mouse-only-btn').style.display = 'block';
  updatePinAccess(false);
}

async function waitForVideoFrame(video, timeoutMs = 3500) {
  if (!video) return false;
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return true;

  return new Promise(resolve => {
    let done = false;
    const finish = ok => {
      if (done) return;
      done = true;
      cleanup();
      resolve(ok);
    };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('playing', onReady);
      clearTimeout(timer);
    };
    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) finish(true);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('playing', onReady);
  });
}

async function prepareCameraAndHands() {
  fallbackInputActive = false;
  if (cameraStarted) return true;
  setLoadingProgress(45, 'Meminta izin kamera...');

  const preview = document.getElementById('cam-preview');
  const previewVideo = document.getElementById('cam-preview-video');
  const hiddenWebcam = document.getElementById('webcam');

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    });
  } catch (e) {
    setLoadingProgress(70, 'Kamera belum aktif. Mode mouse/touch dipakai.');
    enableKeyboardFallback();
    return false;
  }

  try {
    if (preview) preview.style.display = 'block';

    if (previewVideo) {
      previewVideo.srcObject = stream;
      previewVideo.muted = true;
      previewVideo.playsInline = true;
      previewVideo.autoplay = true;
      await previewVideo.play().catch(() => {});
    }

    // Hidden webcam hanya disamakan stream-nya agar kode lama tetap aman,
    // tetapi MediaPipe membaca frame dari video preview yang terlihat.
    if (hiddenWebcam) {
      hiddenWebcam.srcObject = stream;
      hiddenWebcam.muted = true;
      hiddenWebcam.playsInline = true;
      hiddenWebcam.autoplay = true;
      hiddenWebcam.play().catch(() => {});
    }

    const ready = await waitForVideoFrame(previewVideo || hiddenWebcam);
    if (!ready) throw new Error('Frame kamera belum siap');

    setLoadingProgress(70, 'Mengenali tangan...');
    resizeHandCanvas();
    const camera = initMediaPipe(previewVideo || hiddenWebcam);
    await camera.start();
    cameraStarted = true;
    setLoadingProgress(92, 'Tangan siap bermain!');
    return true;
  } catch (e) {
    try {
      if (mpCamera && typeof mpCamera.stop === 'function') mpCamera.stop();
    } catch (_) {}
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach(track => {
        try { track.stop(); } catch (_) {}
      });
    }
    if (previewVideo) previewVideo.srcObject = null;
    if (hiddenWebcam) hiddenWebcam.srcObject = null;
    if (preview) preview.style.display = 'none';
    cameraStarted = false;
    setLoadingProgress(92, 'Hand tracking gagal. Mode mouse/touch aktif.');
    enableKeyboardFallback();
    return false;
  }
}

async function initGame() {
  setLoadingProgress(15, 'Menyiapkan dunia huruf...');
  resizeHandCanvas();
  try {
    initPhaser();
  } catch (e) {
    showStartButton();
    showSetupToast('Library game belum termuat. Jalankan lewat internet/localhost lalu refresh.', 'error');
    return;
  }
  setVocabularySubchapter(GameState.vocabSubchapter);
  setLearningTrack(GameState.learningTrack);
  setPlayMode(GameState.mode);
  renderQuestionBankList();
  await new Promise(r => setTimeout(r, 250));
  setLoadingProgress(35, '');
  showStartButton();
}

async function startGame(useCamera = true) {
  if (!requireAccessPin()) return;

  if (!phaserGame) {
    try {
      resizeHandCanvas();
      initPhaser();
    } catch (e) {
      showSetupToast('Game belum siap. Coba refresh halaman atau cek koneksi library.', 'error');
      return;
    }
  }

  if (GameState.started) return;
  GameState.started = true;
  readStartSettings();
  QUESTIONS = buildQuestionSet(GameState.learningTrack);
  if (!QUESTIONS.length) {
    GameState.started = false;
    showSetupToast('Belum ada soal untuk materi ini. Tambahkan soal atau pilih materi lain.', 'error');
    return;
  }
  resetHandStats();
  resetLearningAnalytics();
  GameState.currentLevel = 0;
  GameState.score = 0;
  GameState.lives = 3;
  GameState.sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (useCamera) {
    await prepareCameraAndHands();
  } else {
    stopCameraStream();
    setLoadingProgress(85, 'Mode mouse/touch aktif.');
    enableKeyboardFallback();
  }

  setLoadingProgress(100, 'Ayo mulai!');
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('question-box').style.display = 'block';
  document.getElementById('answer-bar').style.display = 'flex';
  document.getElementById('hand-status').style.display = 'block';
  document.getElementById('cam-preview').style.display = cameraStarted ? 'block' : 'none';

  let sceneWaitTicks = 0;
  const waitScene = setInterval(() => {
    sceneWaitTicks++;
    try {
      gameScene = phaserGame && phaserGame.scene ? phaserGame.scene.getScene('GameScene') : null;
    } catch (e) {
      gameScene = null;
    }
    if (gameScene) {
      clearInterval(waitScene);
      gameScene.startLevel();
    } else if (sceneWaitTicks > 50) {
      clearInterval(waitScene);
      returnToMenu();
      showSetupToast('Game belum siap. Refresh halaman atau cek koneksi library Phaser.', 'error');
    }
  }, 100);
}

function resetHandTrackingData() {
  HandData.leftHand = null;
  HandData.rightHand = null;
  HandData.leftPinching = false;
  HandData.rightPinching = false;
  HandData.leftSmooth = { x: 0.5, y: 0.5 };
  HandData.rightSmooth = { x: 0.5, y: 0.5 };
}

function stopCameraStream() {
  fallbackInputActive = false;
  try {
    if (mpCamera && typeof mpCamera.stop === 'function') mpCamera.stop();
  } catch (e) {}

  const previewCanvas = document.getElementById('cam-preview-canvas');
  if (previewCanvas) {
    const ctx = previewCanvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  }

  ['webcam', 'cam-preview-video'].forEach(id => {
    const video = document.getElementById(id);
    const stream = video && video.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
    }
    if (video) video.srcObject = null;
  });

  cameraStarted = false;
  resetHandTrackingData();
}

function hideGameplayScreens() {
  ['hud', 'question-box', 'answer-bar', 'hand-status', 'cam-preview', 'level-complete', 'game-over'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const report = document.getElementById('hand-stats');
  if (report) report.classList.remove('show');

  const reportBtn = document.getElementById('report-btn');
  if (reportBtn) reportBtn.textContent = 'Lihat Analisis 📊';

  const answerBar = document.getElementById('answer-bar');
  if (answerBar) answerBar.innerHTML = '';

  clearSlotTargets();
}

function stopActiveRound() {
  clearInterval(GameState.timerInterval);
  GameState.timerInterval = null;
  GameState.roundToken++;
  GameState.state = GameMode.READY;
  GameState.activeHand = null;
  GameState.heldLetter = null;
  GameState.selectedSlotIndex = -1;
  resetHandTrackingData();

  if (GameState.feedbackTimer) {
    clearTimeout(GameState.feedbackTimer);
    GameState.feedbackTimer = null;
  }
  document.getElementById('feedback-overlay')?.classList.remove('show');
  if ('speechSynthesis' in window) speechSynthesis.cancel();

  const scene = phaserGame ? phaserGame.scene.getScene('GameScene') : null;
  if (scene && typeof scene.clearLetters === 'function') {
    scene.clearLetters();
    scene.canSpawn = false;
    scene.spawnTimer = 0;
  }
}

function returnToMenu() {
  stopActiveRound();
  stopCameraStream();
  hideGameplayScreens();
  GameState.started = false;
  GameState.currentLevel = 0;
  GameState.score = 0;
  GameState.lives = 3;
  GameState.sessionId = null;
  GameState.currentLevelMistakes = 0;
  GameState.wrongStreak = 0;
  GameState.filledSlots = [];

  const title = document.getElementById('game-over')?.querySelector('h2');
  if (title) {
    title.textContent = '🌈 Yuk Coba Lagi!';
    title.style.color = '#1687d9';
  }

  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) loadingScreen.style.display = 'block';

  refreshQuestionCountChip();
  showStartButton();
  setLoadingProgress(35, '');
}


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[ch]));
}

function renderQuestionBankList() {
  const list = document.getElementById('question-bank-items');
  const total = document.getElementById('question-bank-total');
  if (!list) return;
  const count = Array.isArray(CUSTOM_QUESTIONS) ? CUSTOM_QUESTIONS.length : 0;
  if (total) total.textContent = `${count} soal`;
  if (!count) {
    list.innerHTML = '<p class="question-bank-empty">Belum ada soal tambahan.</p>';
    return;
  }
  list.innerHTML = CUSTOM_QUESTIONS.map((q, index) => `
    <div class="question-bank-item">
      <div>
        <strong>${escapeHtml(q.question || 'Soal Arab')}</strong>
        <span>${escapeHtml(q.category || q.type || 'Materi')} • Jawaban: <b dir="rtl">${escapeHtml(q.displayAnswer || q.answer || '')}</b></span>
      </div>
      <button type="button" class="delete-question-btn" data-question-index="${index}">Hapus</button>
    </div>
  `).join('');
}

function deleteTeacherQuestion(index) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= CUSTOM_QUESTIONS.length) return;
  const removed = CUSTOM_QUESTIONS.splice(i, 1)[0];
  saveCustomQuestions(CUSTOM_QUESTIONS);
  QUESTIONS = buildQuestionSet(GameState.learningTrack);
  refreshQuestionCountChip();
  renderQuestionBankList();
  showSetupToast(`Soal ${removed?.displayAnswer || removed?.answer || ''} berhasil dihapus.`, 'success');
}

function addTeacherQuestion() {
  const questionInput = document.getElementById('teacher-question-input');
  const answerInput = document.getElementById('teacher-answer-input');
  const difficultyInput = document.getElementById('teacher-difficulty-input');
  const typeInput = document.getElementById('teacher-type-input');
  const subchapterInput = document.getElementById('teacher-subchapter-input');
  const question = (questionInput?.value || '').trim();
  const answer = sanitizeAnswer(answerInput?.value || '');
  const displayAnswer = (answerInput?.value || '').trim() || answer;
  const difficulty = difficultyInput?.value || 'easy';
  const type = typeInput?.value || 'vocabulary';
  const subchapter = subchapterInput?.value || 'general';

  if (!question || answer.length < 1) {
    showSetupToast('Isi pertanyaan dan jawaban Arab terlebih dahulu.', 'error');
    return;
  }

  const symbolPool = type === 'joining' ? JOINING_SYMBOL_POOL : ARABIC_SYMBOL_POOL;
  const icon = type === 'joining' ? '🧩' : type === 'ayat' ? '📜' : type === 'hijaiyah' ? '🔤' : '📚';
  const newQuestion = makeQuestion({
    question,
    answer,
    displayAnswer,
    category: type === 'vocabulary' ? (VOCAB_SUBCHAPTERS[subchapter]?.label || 'Kosakata Arab') : (LEARNING_TRACKS[type]?.label || 'Materi Arab'),
    subchapter,
    difficulty,
    time: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 75 : 90,
    icon,
    type,
    symbolPool
  });
  CUSTOM_QUESTIONS.push(newQuestion);
  saveCustomQuestions(CUSTOM_QUESTIONS);
  QUESTIONS = buildQuestionSet(GameState.learningTrack);
  questionInput.value = '';
  answerInput.value = '';
  refreshQuestionCountChip();
  renderQuestionBankList();
  showSetupToast(`Soal Arab ${displayAnswer} berhasil ditambahkan.`, 'success');
}

// =============================================
