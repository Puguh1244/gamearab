// =============================================
// GROQ AI REPORT INTEGRATION
// File ini TIDAK menyimpan API key. Frontend hanya memanggil backend.
// API key Groq disimpan di .env backend / environment variable Netlify.
// =============================================
const GROQ_ANALYSIS_ENDPOINT = window.GROQ_ANALYSIS_ENDPOINT || '/api/analyze-report';
let lastGroqAnalysisKey = '';
let groqAnalysisInProgress = false;
let currentGroqAnalysisPromise = null;

function buildGameReportPayload() {
  const s = GameState.handStats;
  const totalGrabs = s.leftGrabs + s.rightGrabs;
  const totalCorrect = s.leftCorrect + s.rightCorrect;
  const totalWrong = s.leftWrong + s.rightWrong;
  const overallAccuracy = getAccuracy(totalCorrect, totalWrong);
  const weakLetters = getWeakLetters(8);
  const averageLevelTime = GameState.levelHistory.length
    ? Math.round(GameState.levelHistory.reduce((sum, item) => sum + item.duration, 0) / GameState.levelHistory.length)
    : 0;
  const track = LEARNING_TRACKS[GameState.learningTrack] || LEARNING_TRACKS.hijaiyah;
  const subchapter = VOCAB_SUBCHAPTERS[GameState.vocabSubchapter] || VOCAB_SUBCHAPTERS.general;

  return {
    sessionId: GameState.sessionId || `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
    studentName: GameState.studentName || 'Siswa',
    studentClass: GameState.studentClass || 'Kelas Umum',
    gameTitle: 'Petualangan Huruf Arab',
    learningTrack: track.label,
    vocabularySubchapter: GameState.learningTrack === 'vocabulary' ? subchapter.label : null,
    playMode: getModeLabel(),
    score: GameState.score,
    totalCorrect,
    totalWrong,
    overallAccuracy,
    weakLetters,
    hintsUsed: GameState.totalHints,
    averageLevelTimeSeconds: averageLevelTime,
    completedAnswers: GameState.completedWords,
    levelHistory: GameState.levelHistory,
    handStats: {
      leftGrabs: s.leftGrabs,
      rightGrabs: s.rightGrabs,
      leftCorrect: s.leftCorrect,
      rightCorrect: s.rightCorrect,
      leftWrong: s.leftWrong,
      rightWrong: s.rightWrong,
      totalGrabs
    },
    analytics: GameState.analytics,
    safetyNote: 'Laporan ini adalah observasi belajar berbasis aktivitas game, bukan diagnosis medis atau psikologis.'
  };
}

function getCurrentKapAnalysisFromDom() {
  const text = id => document.getElementById(id)?.textContent?.trim() || '';
  return {
    summary: text('stat-learning-note'),
    cognitive: text('stat-cognitive-note'),
    affective: text('stat-affective-note'),
    psychomotor: text('stat-psychomotor-note'),
    recommendation: text('stat-recommendation-note')
  };
}

function ensureGroqStatusElement() {
  let el = document.getElementById('stat-ai-status');
  if (el) return el;

  const anchor = document.getElementById('stat-learning-note');
  if (!anchor || !anchor.parentNode) return null;

  el = document.createElement('div');
  el.id = 'stat-ai-status';
  el.className = 'stat-note ai-status-note';
  el.textContent = '🤖 AI Groq: belum dipanggil.';
  anchor.parentNode.insertBefore(el, anchor);
  return el;
}

function setGroqStatus(message, type = 'idle') {
  const el = ensureGroqStatusElement();
  if (!el) return;
  el.textContent = message;
  el.dataset.status = type;
}

function applyAiKapAnalysis(analysis) {
  if (!analysis) return;

  if (typeof analysis === 'string') {
    const recommendationEl = document.getElementById('stat-recommendation-note');
    if (recommendationEl) recommendationEl.textContent = analysis;
    return;
  }

  const map = {
    cognitive: 'stat-cognitive-note',
    affective: 'stat-affective-note',
    psychomotor: 'stat-psychomotor-note',
    recommendation: 'stat-recommendation-note',
    summary: 'stat-learning-note'
  };

  Object.entries(map).forEach(([key, elementId]) => {
    if (analysis[key]) {
      const el = document.getElementById(elementId);
      if (el) el.textContent = analysis[key];
    }
  });
}

function getGroqAnalysisKey(payload) {
  return JSON.stringify({
    sessionId: payload.sessionId,
    name: payload.studentName,
    score: payload.score,
    correct: payload.totalCorrect,
    wrong: payload.totalWrong,
    hints: payload.hintsUsed,
    weak: payload.weakLetters,
    levels: payload.levelHistory.length
  });
}

async function requestGroqKapAnalysis(options = {}) {
  const { force = false, reason = 'manual' } = options;
  const payload = buildGameReportPayload();
  const key = getGroqAnalysisKey(payload);

  if (!force && key === lastGroqAnalysisKey) {
    return currentGroqAnalysisPromise || { source: 'cached', analysis: getCurrentKapAnalysisFromDom() };
  }

  if (groqAnalysisInProgress && currentGroqAnalysisPromise) {
    return currentGroqAnalysisPromise;
  }

  lastGroqAnalysisKey = key;
  groqAnalysisInProgress = true;
  setGroqStatus(`🤖 AI Groq: memproses analisis (${reason})...`, 'loading');
  console.log('[Groq] Memanggil endpoint:', GROQ_ANALYSIS_ENDPOINT, payload);

  currentGroqAnalysisPromise = (async () => {
    try {
      const response = await fetch(GROQ_ANALYSIS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `Groq backend error: ${response.status}`);
      }

      applyAiKapAnalysis(result.analysis);
      setGroqStatus('✅ AI Groq: analisis berhasil dibuat dan disimpan ke dashboard.', 'success');
      console.log('[Groq] Analisis berhasil:', result);

      if (typeof window.saveLearningReport === 'function') {
        await window.saveLearningReport({
          payload,
          analysis: result.analysis || getCurrentKapAnalysisFromDom(),
          source: result.source || 'groq'
        });
      }

      return result;
    } catch (error) {
      setGroqStatus(`⚠️ AI Groq belum aktif: ${error.message}. Laporan lokal tetap dipakai.`, 'error');
      console.warn('[Groq] Analisis Groq tidak aktif, memakai laporan lokal:', error);

      if (typeof window.saveLearningReport === 'function') {
        await window.saveLearningReport({
          payload,
          analysis: getCurrentKapAnalysisFromDom(),
          source: 'local'
        });
      }

      return { source: 'local', error: error.message, analysis: getCurrentKapAnalysisFromDom() };
    } finally {
      groqAnalysisInProgress = false;
      currentGroqAnalysisPromise = null;
    }
  })();

  return currentGroqAnalysisPromise;
}

window.buildGameReportPayload = buildGameReportPayload;
window.requestGroqKapAnalysis = requestGroqKapAnalysis;

(function attachGroqToReportPanel() {
  const originalUpdate = window.updateHandStatsPanel;
  if (typeof originalUpdate !== 'function' || originalUpdate.__groqWrapped) return;

  function wrappedUpdateHandStatsPanel(...args) {
    const result = originalUpdate.apply(this, args);
    requestGroqKapAnalysis({ reason: 'report-panel' });
    return result;
  }

  wrappedUpdateHandStatsPanel.__groqWrapped = true;
  window.updateHandStatsPanel = wrappedUpdateHandStatsPanel;
})();
