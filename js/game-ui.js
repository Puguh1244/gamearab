// UI HELPERS
// =============================================
function updateHUD() {
  const modeCfg = GameState.getModeConfig();
  document.getElementById('hud-lives-val').textContent = modeCfg.lives ? ('💖'.repeat(GameState.lives) || '💙') : '🌟 Aman';
  document.getElementById('hud-score-val').textContent = GameState.score;
  document.getElementById('hud-level-val').textContent = `${GameState.currentLevel + 1} / ${QUESTIONS.length}`;
  document.getElementById('hud-timer-val').textContent = modeCfg.timer ? GameState.timerValue : '∞';
}

const LETTER_NAMES_ID = HIJAIYAH_LETTERS.reduce((acc, item) => {
  acc[item.letter] = item.name;
  return acc;
}, {});

const DIGIT_NAMES_ID = {
  '٠': 'nol', '١': 'satu', '٢': 'dua', '٣': 'tiga', '٤': 'empat',
  '٥': 'lima', '٦': 'enam', '٧': 'tujuh', '٨': 'delapan', '٩': 'sembilan'
};

function getQuestionKind(q = GameState.getCurrentQuestion()) {
  if (!q) return 'huruf';
  if (q.type === 'joining') return 'bentuk huruf';
  if (q.type === 'vocabulary') return 'huruf Arab';
  if (q.type === 'ayat') return 'huruf penggalan ayat';
  return 'huruf hijaiyah';
}

function getCompletionLabel(q = GameState.getCurrentQuestion()) {
  if (!q) return 'Materi';
  if (q.type === 'joining') return 'Bentuk Huruf';
  if (q.type === 'vocabulary') return 'Kosakata';
  if (q.type === 'ayat') return 'Penggalan Ayat';
  return 'Huruf Hijaiyah';
}

function getSymbolPoolForCurrentQuestion() {
  const q = GameState.getCurrentQuestion();
  if (q && Array.isArray(q.symbolPool) && q.symbolPool.length) return q.symbolPool;
  if (q && q.type === 'joining') return JOINING_SYMBOL_POOL;
  return ARABIC_SYMBOL_POOL;
}

let audioContext = null;

function getAudioContext() {
  try {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioContext = new AudioCtx();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  } catch (e) {
    return null;
  }
}

function playSfx(type = 'tap') {
  if (!GameState.voiceEnabled || GameState.voiceMode === 'off') return;
  const now = Date.now();
  if (now - GameState.lastSfxAt < 220) return;
  GameState.lastSfxAt = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  const presets = {
    correct: [660, 880, 0.09],
    wrong: [260, 180, 0.11],
    hint: [520, 660, 0.08],
    complete: [523, 784, 0.14],
    tap: [430, 520, 0.06]
  };
  const [startFreq, endFreq, duration] = presets[type] || presets.tap;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

function getLetterName(letter) {
  const symbol = String(letter || '').toUpperCase();
  if (DIGIT_NAMES_ID[symbol]) return DIGIT_NAMES_ID[symbol];
  return LETTER_NAMES_ID[symbol] || String(letter || '').toLowerCase();
}

function formatSpeechText(text) {
  return String(text || '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function chooseBestVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
  if (!voices || !voices.length) return null;

  const preferred = voices.find(v => /id-ID|Indonesian|Bahasa Indonesia/i.test(`${v.lang} ${v.name}`));
  const localNatural = voices.find(v => /Google|Microsoft|Natural|Online/i.test(v.name) && /^id/i.test(v.lang));
  const anyId = voices.find(v => /^id/i.test(v.lang));
  return preferred || localNatural || anyId || null;
}

if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => {
    GameState.selectedVoice = chooseBestVoice();
  };
}

function speak(text, interrupt = true, type = 'tap') {
  if (!GameState.voiceEnabled || GameState.voiceMode === 'off') return;

  // Default baru: bunyi pendek, bukan robot TTS. Ini lebih nyaman untuk anak dan tidak terdengar aneh.
  if (GameState.voiceMode === 'sfx') {
    playSfx(type);
    return;
  }

  if (!('speechSynthesis' in window)) {
    playSfx(type);
    return;
  }

  const spokenText = formatSpeechText(text);
  if (!spokenText) return;

  const now = Date.now();
  const repeatedTooSoon = spokenText === GameState.lastSpeechText && now - GameState.lastSpeechAt < 1400;
  const talkingTooSoon = now - GameState.lastSpeechAt < 520 && !interrupt;
  if (repeatedTooSoon || talkingTooSoon) return;

  GameState.lastSpeechText = spokenText;
  GameState.lastSpeechAt = now;

  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = 'id-ID';
  utterance.rate = 0.78;
  utterance.pitch = 0.92;
  utterance.volume = 0.86;

  GameState.selectedVoice = GameState.selectedVoice || chooseBestVoice();
  if (GameState.selectedVoice) utterance.voice = GameState.selectedVoice;

  if (interrupt) speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function getCurrentTargetIndex() {
  return GameState.filledSlots.findIndex(v => !v);
}

function getCurrentTargetLetter() {
  const tokens = GameState.getCurrentAnswerTokens();
  const index = GameState.filledSlots.findIndex(v => !v);
  return index >= 0 ? tokens[index] : '';
}

function getModeLabel() {
  return (GameState.getModeConfig() || PLAY_MODES.learn).label;
}

function resetLearningAnalytics() {
  GameState.totalHints = 0;
  GameState.completedWords = [];
  GameState.levelHistory = [];
  GameState.analytics = {
    letterAttempts: {},
    letterCorrect: {},
    letterWrong: {},
    confusedPairs: {},
    missedLetters: {},
    hintsByLetter: {},
    dropOutside: 0
  };
}

function incrementMap(map, key, amount = 1) {
  if (!key) return;
  map[key] = (map[key] || 0) + amount;
}

function recordLetterAttempt(expected, actual, isCorrect) {
  incrementMap(GameState.analytics.letterAttempts, expected);
  if (isCorrect) {
    incrementMap(GameState.analytics.letterCorrect, expected);
  } else {
    incrementMap(GameState.analytics.letterWrong, expected);
    incrementMap(GameState.analytics.confusedPairs, `${expected}←${actual || '?'}`);
  }
}

function getWeakLetters(limit = 4) {
  return Object.entries(GameState.analytics.letterWrong)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([letter]) => letter);
}

function updateQuestionHint(extraText = '') {
  const target = getCurrentTargetLetter();
  const q = GameState.getCurrentQuestion();
  const label = document.getElementById('question-label');
  if (!label || !q) return;
  const kind = getQuestionKind(q);
  const categoryText = q.category ? ` • ${q.category}` : '';
  label.textContent = target ? `${q.icon || '🌙'} Cari ${kind}: ${target}${categoryText}${extraText}` : `${q.icon || '🌙'} Selesai`;
}

function applyAdaptiveHint(reason = 'hint') {
  if (GameState.state !== GameMode.PLAYING && GameState.state !== GameMode.HOLDING_LETTER) return;
  const now = Date.now();
  if (reason === 'manual' && now - GameState.lastHintAt < 900) return;
  if (reason !== 'auto' && now - GameState.lastHintAt < 350) return;
  GameState.lastHintAt = now;
  const targetIndex = GameState.filledSlots.findIndex(v => !v);
  const targetLetter = getCurrentTargetLetter();
  if (targetIndex < 0 || !targetLetter) return;
  const token = GameState.roundToken;
  GameState.totalHints++;
  GameState.currentLevelHints++;
  incrementMap(GameState.analytics.hintsByLetter, targetLetter);
  document.querySelectorAll('.slot').forEach((slot, i) => {
    slot.classList.toggle('hint', i === targetIndex);
  });
  updateQuestionHint(' • Bantuan aktif');
  const kind = getQuestionKind();
  showFeedback(`Cari ${kind} ${targetLetter}`, '#8d6ad9', 900);
  speak(`Cari ${kind} ${targetLetter}. Taruh di kotak yang bersinar.`, true, 'hint');
  setTimeout(() => {
    if (token !== GameState.roundToken) return;
    const slot = document.getElementById(`slot-${targetIndex}`);
    if (slot) slot.classList.remove('hint');
  }, reason === 'auto' ? 2800 : 2200);
}

function resetHandStats() {
  GameState.handStats = {
    leftGrabs: 0,
    rightGrabs: 0,
    leftCorrect: 0,
    rightCorrect: 0,
    leftWrong: 0,
    rightWrong: 0
  };
}

function recordHandGrab(handName) {
  if (handName === 'right') GameState.handStats.rightGrabs++;
  else GameState.handStats.leftGrabs++;
}

function recordHandResult(handName, isCorrect) {
  if (handName === 'right') {
    if (isCorrect) GameState.handStats.rightCorrect++;
    else GameState.handStats.rightWrong++;
  } else {
    if (isCorrect) GameState.handStats.leftCorrect++;
    else GameState.handStats.leftWrong++;
  }
}

function getAccuracy(correct, wrong) {
  const total = correct + wrong;
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

function buildKapAnalysis(totalCorrect, totalWrong, overallAccuracy, averageLevelTime, weakLetters, dominant, totalGrabs, trackLabel, subLabel) {
  const modeLabel = getModeLabel();
  const totalAnswers = totalCorrect + totalWrong;
  const weakText = weakLetters.length ? weakLetters.join(', ') : 'belum tampak materi yang paling dominan sulit';
  const materialLabel = `${trackLabel}${subLabel}`;

  let cognitive = 'Data kognitif belum cukup karena siswa belum banyak menyelesaikan soal.';
  if (totalAnswers > 0) {
    if (overallAccuracy >= 85) {
      cognitive = `Pada aspek kognitif, siswa menunjukkan pemahaman yang kuat pada materi ${materialLabel}. Akurasi ${overallAccuracy}% menunjukkan siswa mampu mengenali target huruf/kata Arab dengan konsisten. Materi yang tetap perlu dipantau: ${weakText}.`;
    } else if (overallAccuracy >= 60) {
      cognitive = `Pada aspek kognitif, siswa sudah mulai memahami materi ${materialLabel}, tetapi masih membutuhkan penguatan. Akurasi ${overallAccuracy}% menunjukkan pemahaman dasar sudah muncul, namun latihan ulang diperlukan terutama pada ${weakText}.`;
    } else {
      cognitive = `Pada aspek kognitif, siswa masih memerlukan pendampingan pada materi ${materialLabel}. Akurasi ${overallAccuracy}% menunjukkan siswa perlu lebih banyak contoh visual, pengulangan huruf/kata, dan latihan bertahap tanpa tekanan waktu.`;
    }
  }

  let affective = 'Data afektif belum cukup untuk membaca pola motivasi belajar.';
  if (totalAnswers > 0 || GameState.totalHints > 0 || GameState.levelHistory.length > 0) {
    const hintText = GameState.totalHints > 0
      ? `Siswa menggunakan bantuan ${GameState.totalHints} kali, yang menandakan materi masih menantang tetapi siswa tetap mengikuti proses belajar.`
      : 'Siswa jarang menggunakan bantuan, sehingga terlihat cukup mandiri dalam menyelesaikan permainan.';

    if (overallAccuracy >= 75 && GameState.totalHints <= 2) {
      affective = `Pada aspek afektif, siswa menunjukkan rasa percaya diri dan kemandirian belajar yang baik. ${hintText} Mode ${modeLabel} dapat dilanjutkan karena respons belajar tampak positif.`;
    } else if (overallAccuracy >= 50) {
      affective = `Pada aspek afektif, siswa menunjukkan kemauan mencoba dan masih dapat mengikuti alur permainan. ${hintText} Disarankan memberi pujian singkat setiap selesai level agar motivasi tetap terjaga.`;
    } else {
      affective = `Pada aspek afektif, siswa perlu suasana belajar yang lebih santai dan tidak terburu-buru. ${hintText} Gunakan mode Belajar terlebih dahulu agar siswa merasa aman saat mencoba kembali.`;
    }
  }

  let psychomotor = 'Data psikomotorik belum cukup karena interaksi tangan belum banyak tercatat.';
  if (totalGrabs > 0) {
    const dominantText = dominant === 'Seimbang'
      ? 'penggunaan tangan kiri dan kanan relatif seimbang'
      : `siswa lebih sering menggunakan tangan ${String(dominant).toLowerCase()}`;
    const movementQuality = totalGrabs >= totalAnswers && overallAccuracy >= 70
      ? 'Koordinasi menangkap dan meletakkan huruf terlihat cukup stabil.'
      : 'Koordinasi gerak masih perlu dilatih agar huruf lebih tepat ditempatkan ke kotak jawaban.';
    psychomotor = `Pada aspek psikomotorik, ${dominantText} selama bermain. Total tangkapan tercatat ${totalGrabs} kali. ${movementQuality} Data ini hanya menggambarkan pola interaksi selama permainan, bukan penentuan dominasi tangan permanen.`;
  }

  let recommendation = `Rekomendasi latihan berikutnya: ulangi materi ${materialLabel} di mode Belajar, lalu lanjutkan ke mode Latihan atau Kompetisi setelah siswa lebih stabil.`;
  if (weakLetters.length > 0) {
    recommendation = `Fokus latihan berikutnya adalah ${weakText}. Mulai dari pengenalan bentuk dasar, lanjutkan ke bentuk sambung, kemudian gunakan soal melengkapi kata/ayat pendek. Gunakan mode Belajar sebelum mode Kompetisi.`;
  } else if (overallAccuracy >= 85 && GameState.totalHints <= 2) {
    recommendation = `Siswa siap dinaikkan ke tingkat berikutnya. Berikan variasi kosakata dan penggalan ayat yang sedikit lebih menantang, tetap dengan visual ceria dan durasi pendek.`;
  } else if (averageLevelTime > 35) {
    recommendation = `Latihan sebaiknya dilakukan tanpa timer terlebih dahulu. Berikan contoh pelan, tampilkan huruf target lebih besar, dan kurangi distraktor sampai siswa lebih percaya diri.`;
  }

  return { cognitive, affective, psychomotor, recommendation };
}


function updateHandStatsPanel() {
  const s = GameState.handStats;
  const totalGrabs = s.leftGrabs + s.rightGrabs;
  const totalCorrect = s.leftCorrect + s.rightCorrect;
  const totalWrong = s.leftWrong + s.rightWrong;
  const overallAccuracy = getAccuracy(totalCorrect, totalWrong);
  const leftAccuracy = getAccuracy(s.leftCorrect, s.leftWrong);
  const rightAccuracy = getAccuracy(s.rightCorrect, s.rightWrong);
  const weakLetters = getWeakLetters(5);
  const averageLevelTime = GameState.levelHistory.length
    ? Math.round(GameState.levelHistory.reduce((sum, item) => sum + item.duration, 0) / GameState.levelHistory.length)
    : 0;

  let dominant = '-';
  const trackLabel = (LEARNING_TRACKS[GameState.learningTrack] || LEARNING_TRACKS.hijaiyah).label;
  const subLabel = GameState.learningTrack === 'vocabulary'
    ? ` • ${(VOCAB_SUBCHAPTERS[GameState.vocabSubchapter] || VOCAB_SUBCHAPTERS.general).label}`
    : '';

  let note = 'Data observasi belum cukup. Laporan ini bukan diagnosis psikologis, melainkan ringkasan perilaku belajar selama permainan.';

  if (totalGrabs > 0 || GameState.levelHistory.length > 0) {
    const diff = Math.abs(s.leftGrabs - s.rightGrabs);
    const balanceThreshold = Math.max(1, Math.ceil(Math.max(totalGrabs, 1) * 0.15));

    if (diff <= balanceThreshold) dominant = 'Seimbang';
    else dominant = s.leftGrabs > s.rightGrabs ? 'Kiri' : 'Kanan';

    let performance = 'cukup baik';
    if (overallAccuracy >= 85 && GameState.totalHints <= 2) performance = 'sangat baik';
    else if (overallAccuracy < 60 || GameState.totalHints >= 5) performance = 'masih membutuhkan pendampingan';

    note = `Berdasarkan aktivitas bermain, siswa menunjukkan performa ${performance} pada materi ${trackLabel}${subLabel}. `;

    if (overallAccuracy >= 85) {
      note += 'Ketepatan jawaban tinggi, sehingga siswa tampak mampu mengenali target huruf/kata dengan konsisten. ';
    } else if (overallAccuracy >= 60) {
      note += 'Siswa sudah mulai memahami materi, tetapi masih perlu pengulangan agar respons lebih stabil. ';
    } else {
      note += 'Siswa masih memerlukan penguatan konsep dasar dan contoh visual yang lebih sering. ';
    }

    if (averageLevelTime > 0) {
      if (averageLevelTime <= 15) note += 'Kecepatan respons tergolong cepat. ';
      else if (averageLevelTime <= 35) note += 'Kecepatan respons cukup terkontrol; siswa cenderung berhati-hati. ';
      else note += 'Waktu pengerjaan cukup lama, sehingga latihan bertahap tanpa timer disarankan. ';
    }

    if (weakLetters.length > 0) {
      note += `Fokus latihan berikutnya: ${weakLetters.join(', ')}. `;
    } else if (GameState.completedWords.length > 0) {
      note += 'Belum tampak pola kesulitan yang dominan pada huruf/kosakata yang dimainkan. ';
    }

    if (GameState.totalHints > 0) {
      note += `Bantuan dipakai ${GameState.totalHints} kali; ini menandakan materi masih menantang namun siswa tetap mengikuti alur belajar. `;
    }

    note += 'Rekomendasi: ulangi materi sulit di mode Belajar, lalu lanjutkan ke mode Kompetisi setelah akurasi lebih stabil.';
  }

  document.getElementById('stat-left-grabs').textContent = s.leftGrabs;
  document.getElementById('stat-right-grabs').textContent = s.rightGrabs;
  document.getElementById('stat-left-correct').textContent = s.leftCorrect;
  document.getElementById('stat-right-correct').textContent = s.rightCorrect;
  document.getElementById('stat-left-wrong').textContent = s.leftWrong;
  document.getElementById('stat-right-wrong').textContent = s.rightWrong;
  document.getElementById('stat-total-grabs').textContent = totalGrabs;
  document.getElementById('stat-dominant-hand').textContent = dominant;
  document.getElementById('stat-left-accuracy').textContent = `${leftAccuracy}%`;
  document.getElementById('stat-right-accuracy').textContent = `${rightAccuracy}%`;
  document.getElementById('stat-student-name').textContent = GameState.studentName || 'Siswa';
  document.getElementById('stat-play-mode').textContent = `${trackLabel}${subLabel} • ${getModeLabel()} • Akurasi ${overallAccuracy}%`;
  document.getElementById('stat-weak-letters').textContent = weakLetters.length ? weakLetters.join(', ') : '-';
  document.getElementById('stat-hints-used').textContent = GameState.totalHints;
  document.getElementById('stat-average-level-time').textContent = `${averageLevelTime} dtk`;
  document.getElementById('stat-learning-note').textContent = note;

  const kap = buildKapAnalysis(totalCorrect, totalWrong, overallAccuracy, averageLevelTime, weakLetters, dominant, totalGrabs, trackLabel, subLabel);
  const cognitiveEl = document.getElementById('stat-cognitive-note');
  const affectiveEl = document.getElementById('stat-affective-note');
  const psychomotorEl = document.getElementById('stat-psychomotor-note');
  const recommendationEl = document.getElementById('stat-recommendation-note');
  if (cognitiveEl) cognitiveEl.textContent = kap.cognitive;
  if (affectiveEl) affectiveEl.textContent = kap.affective;
  if (psychomotorEl) psychomotorEl.textContent = kap.psychomotor;
  if (recommendationEl) recommendationEl.textContent = kap.recommendation;
}

function buildAnswerSlots() {
  const bar = document.getElementById('answer-bar');
  bar.innerHTML = '';
  bar.style.display = 'flex';
  bar.dir = 'rtl';
  const tokens = GameState.getCurrentAnswerTokens();
  for (let i = 0; i < tokens.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.id = `slot-${i}`;
    slot.dataset.index = i;
    slot.lang = 'ar';
    slot.dir = 'rtl';
    slot.textContent = '';
    bar.appendChild(slot);
  }
  updateQuestionHint();
}

function fillSlot(index, char) {
  const slot = document.getElementById(`slot-${index}`);
  if (!slot) return;
  slot.textContent = char;
  slot.classList.remove('active', 'target', 'wrong', 'hint');
  slot.classList.add('filled');
  updateQuestionHint();
}

function flashWrongSlot(index = GameState.selectedSlotIndex) {
  if (index < 0) return;
  const slot = document.getElementById(`slot-${index}`);
  if (!slot) return;
  slot.classList.add('wrong');
  setTimeout(() => slot.classList.remove('wrong'), 400);
}

function clearSlotTargets() {
  document.querySelectorAll('.slot').forEach(slot => slot.classList.remove('target'));
  GameState.selectedSlotIndex = -1;
}

function setSlotTarget(index) {
  GameState.selectedSlotIndex = index;
  document.querySelectorAll('.slot').forEach((slot, i) => {
    slot.classList.toggle('target', i === index && !slot.classList.contains('filled'));
  });
}

function getSlotIndexAtPosition(x, y, handX = x, handY = y) {
  const slots = Array.from(document.querySelectorAll('.slot'));
  if (!slots.length) return -1;

  // FINAL: drop jawaban hanya valid ketika pusat huruf ATAU titik tangan
  // benar-benar masuk area kotak slot. Area bawah/answer-bar di luar kotak
  // tidak dihitung supaya huruf tidak pecah atau dianggap salah.
  for (const slot of slots) {
    const rect = slot.getBoundingClientRect();
    const index = Number(slot.dataset.index);
    if (GameState.filledSlots && GameState.filledSlots[index]) continue;

    const insideLetter = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    const insideHand = handX >= rect.left && handX <= rect.right && handY >= rect.top && handY <= rect.bottom;
    if (insideLetter || insideHand) return index;
  }

  return -1;
}

function isWordComplete() {
  return GameState.filledSlots.length > 0 && GameState.filledSlots.every(Boolean);
}

function getNeededLetters() {
  const tokens = GameState.getCurrentAnswerTokens();
  if (!GameState.filledSlots || GameState.filledSlots.length !== tokens.length) {
    return [...tokens];
  }

  return tokens.filter((char, index) => !GameState.filledSlots[index]);
}

function showFeedback(text, color, duration = 800) {
  const el = document.getElementById('feedback-overlay');
  const txt = document.getElementById('feedback-text');
  if (!el || !txt) return;
  if (GameState.feedbackTimer) clearTimeout(GameState.feedbackTimer);
  txt.textContent = text;
  txt.style.color = color;
  el.classList.add('show');
  GameState.feedbackTimer = setTimeout(() => {
    el.classList.remove('show');
    GameState.feedbackTimer = null;
  }, duration);
}

function startTimer(overrideSeconds = null) {
  clearInterval(GameState.timerInterval);
  const modeCfg = GameState.getModeConfig();
  const baseTime = GameState.getCurrentQuestion().time || 60;

  if (!modeCfg.timer) {
    GameState.timerValue = '∞';
    updateHUD();
    return;
  }

  GameState.timerValue = typeof overrideSeconds === 'number'
    ? overrideSeconds
    : (GameState.mode === 'practice' ? baseTime + 35 : baseTime);
  updateHUD();
  GameState.timerInterval = setInterval(() => {
    if (GameState.state !== GameMode.PLAYING && GameState.state !== GameMode.HOLDING_LETTER) return;
    if (typeof GameState.timerValue !== 'number') return;
    GameState.timerValue--;
    updateHUD();
    const timerEl = document.getElementById('hud-timer-val');
    if (timerEl) timerEl.style.color = GameState.timerValue <= 10 ? '#ff5f8f' : '#e28b00';
    if (GameState.timerValue <= 0) {
      clearInterval(GameState.timerInterval);
      GameState.timerInterval = null;
      if (GameState.mode === 'challenge') {
        triggerGameOver();
      } else {
        showFeedback('Waktu habis, kita bantu ya!', '#1687d9', 900);
        applyAdaptiveHint('auto');
        startTimer(30);
      }
    }
  }, 1000);
}

function triggerLevelComplete() {
  clearInterval(GameState.timerInterval);
  GameState.timerInterval = null;
  GameState.state = GameMode.LEVEL_COMPLETE;
  const token = GameState.roundToken;
  showFeedback('⭐ Hebat!', '#23a65a', 1000);

  const duration = Math.max(1, Math.round((Date.now() - GameState.levelStartTime) / 1000));
  const bonus = typeof GameState.timerValue === 'number' ? Math.max(0, GameState.timerValue * 2) : 30;
  const mistakePenalty = GameState.currentLevelMistakes * 12;
  const rawLevelScore = GameState.mode === 'learn' ? 50 : 70 + bonus - mistakePenalty;
  const levelScore = Math.max(30, rawLevelScore);
  const stars = GameState.currentLevelMistakes === 0 ? '⭐⭐⭐' : GameState.currentLevelMistakes <= 2 ? '⭐⭐' : '⭐';

  GameState.score += levelScore;
  GameState.completedWords.push(GameState.getCurrentAnswer());
  GameState.levelHistory.push({
    word: GameState.getCurrentAnswer(),
    duration,
    mistakes: GameState.currentLevelMistakes,
    hints: GameState.currentLevelHints
  });
  updateHUD();

  const completeLabel = getCompletionLabel();
  speak(`Hebat ${GameState.studentName}. ${completeLabel.toLowerCase()} ${GameState.getCurrentAnswer()} selesai.`, true, 'complete');

  setTimeout(() => {
    if (token !== GameState.roundToken || GameState.state !== GameMode.LEVEL_COMPLETE) return;
    const lc = document.getElementById('level-complete');
    document.getElementById('lc-word').textContent = `${completeLabel}: ${GameState.getCurrentAnswer()} ${stars}`;
    document.getElementById('lc-score').textContent = `+${levelScore} Najm • ${duration} detik`;
    lc.style.display = 'flex';
  }, 800);
}

function triggerGameOver() {
  GameState.state = GameMode.GAME_OVER;
  clearInterval(GameState.timerInterval);
  GameState.timerInterval = null;
  const token = GameState.roundToken;
  showFeedback('🌈 Coba Lagi!', '#1687d9', 1000);
  setTimeout(() => {
    if (token !== GameState.roundToken || GameState.state !== GameMode.GAME_OVER) return;
    const go = document.getElementById('game-over');
    document.getElementById('go-score').textContent = `Najm Kamu: ${GameState.score}`;
    updateHandStatsPanel();
    if (typeof window.requestGroqKapAnalysis === 'function') {
      window.requestGroqKapAnalysis({ force: true, reason: 'game-over' });
    }
    document.getElementById('hand-stats').classList.remove('show');
    go.style.display = 'flex';
  }, 1000);
}

// =============================================
