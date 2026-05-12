// =============================================
// TEACHER DASHBOARD & LEARNING REPORT STORAGE
// Dashboard ini menyimpan riwayat laporan permainan.
// - Browser/local fallback: localStorage
// - Server lokal opsional: /api/reports dari server.js
// =============================================
const TEACHER_REPORT_STORAGE_KEY = 'petualanganHurufArab.teacherReports.v1';
let teacherDashboardReports = [];
let teacherDashboardSelectedId = null;
let teacherDashboardLoaded = false;
const DASHBOARD_ACCESS_PIN = '123123';
let dashboardUnlocked = false;

function safeJsonParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function readLocalTeacherReports() {
  return safeJsonParse(localStorage.getItem(TEACHER_REPORT_STORAGE_KEY) || '[]', []);
}

function writeLocalTeacherReports(reports) {
  localStorage.setItem(TEACHER_REPORT_STORAGE_KEY, JSON.stringify(reports.slice(0, 250)));
}

function getReportId(report) {
  return report?.id || report?.payload?.sessionId || report?.sessionId || `report-${Date.now()}`;
}

function normalizeTeacherReport(input = {}) {
  const payload = input.payload || input;
  const analysis = input.analysis || input.aiAnalysis || {};
  const id = input.id || payload.sessionId || `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = input.createdAt || payload.createdAt || new Date().toISOString();
  return {
    id,
    createdAt,
    updatedAt: new Date().toISOString(),
    source: input.source || 'local',
    payload,
    analysis
  };
}

function upsertTeacherReport(report) {
  const normalized = normalizeTeacherReport(report);
  const reports = readLocalTeacherReports();
  const index = reports.findIndex(item => getReportId(item) === normalized.id);
  if (index >= 0) reports[index] = { ...reports[index], ...normalized, updatedAt: new Date().toISOString() };
  else reports.unshift(normalized);
  reports.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  writeLocalTeacherReports(reports);
  teacherDashboardReports = reports;
  return normalized;
}

async function saveLearningReport(report) {
  const saved = upsertTeacherReport(report);

  // Server lokal/Express bersifat opsional. Jika tidak aktif, localStorage tetap dipakai.
  try {
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saved)
    });
  } catch (error) {
    // Diamkan supaya game tidak terganggu saat backend belum aktif.
  }

  if (document.getElementById('teacher-dashboard')?.classList.contains('show')) {
    renderTeacherDashboard();
  }
  return saved;
}
window.saveLearningReport = saveLearningReport;

function collectReportFromDom() {
  if (typeof buildGameReportPayload !== 'function') return null;
  const payload = buildGameReportPayload();
  const text = id => document.getElementById(id)?.textContent?.trim() || '';
  const analysis = {
    summary: text('stat-learning-note'),
    cognitive: text('stat-cognitive-note'),
    affective: text('stat-affective-note'),
    psychomotor: text('stat-psychomotor-note'),
    recommendation: text('stat-recommendation-note')
  };
  return { payload, analysis, source: 'local' };
}

function attachDashboardReportCapture() {
  const originalUpdate = window.updateHandStatsPanel;
  if (typeof originalUpdate !== 'function' || originalUpdate.__dashboardWrapped) return;

  function wrappedUpdateHandStatsPanel(...args) {
    const result = originalUpdate.apply(this, args);
    const report = collectReportFromDom();
    if (report && report.payload) saveLearningReport(report);
    return result;
  }
  wrappedUpdateHandStatsPanel.__dashboardWrapped = true;
  window.updateHandStatsPanel = wrappedUpdateHandStatsPanel;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function reportSearchText(report) {
  const p = report.payload || {};
  const a = report.analysis || {};
  return [
    p.studentName, p.studentClass, p.learningTrack, p.playMode,
    (p.weakLetters || []).join(' '), a.summary, a.recommendation
  ].filter(Boolean).join(' ').toLowerCase();
}

function getFilteredTeacherReports() {
  const search = (document.getElementById('dashboard-search')?.value || '').trim().toLowerCase();
  const classFilter = document.getElementById('dashboard-filter-class')?.value || 'all';
  return teacherDashboardReports.filter(report => {
    const p = report.payload || {};
    const matchSearch = !search || reportSearchText(report).includes(search);
    const matchClass = classFilter === 'all' || (p.studentClass || 'Kelas Umum') === classFilter;
    return matchSearch && matchClass;
  });
}

function updateDashboardClassFilter(reports) {
  const select = document.getElementById('dashboard-filter-class');
  if (!select) return;
  const current = select.value || 'all';
  const classes = Array.from(new Set(reports.map(r => r.payload?.studentClass || 'Kelas Umum'))).sort();
  select.innerHTML = '<option value="all">Semua kelas</option>' + classes.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  select.value = classes.includes(current) ? current : 'all';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderDashboardSummary(reports) {
  const students = new Set(reports.map(r => r.payload?.studentName || 'Siswa'));
  const accuracies = reports.map(r => Number(r.payload?.overallAccuracy || 0));
  const scores = reports.map(r => Number(r.payload?.score || 0));
  const avg = arr => arr.length ? Math.round(arr.reduce((sum, v) => sum + v, 0) / arr.length) : 0;

  document.getElementById('dash-total-sessions').textContent = reports.length;
  document.getElementById('dash-total-students').textContent = students.size;
  document.getElementById('dash-average-accuracy').textContent = `${avg(accuracies)}%`;
  document.getElementById('dash-average-score').textContent = avg(scores);
}

function renderDashboardTable(reports) {
  const tbody = document.getElementById('dashboard-table-body');
  if (!tbody) return;
  if (!reports.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="dashboard-empty">Belum ada data permainan yang sesuai filter.</td></tr>';
    return;
  }

  tbody.innerHTML = reports.map(report => {
    const p = report.payload || {};
    const weak = Array.isArray(p.weakLetters) && p.weakLetters.length ? p.weakLetters.join(', ') : '-';
    const id = escapeHtml(getReportId(report));
    return `
      <tr class="${teacherDashboardSelectedId === getReportId(report) ? 'selected' : ''}">
        <td>${escapeHtml(formatDateTime(report.updatedAt || report.createdAt))}</td>
        <td><strong>${escapeHtml(p.studentName || 'Siswa')}</strong></td>
        <td>${escapeHtml(p.studentClass || 'Kelas Umum')}</td>
        <td>${escapeHtml(p.learningTrack || '-')}<br><small>${escapeHtml(p.playMode || '')}</small></td>
        <td>${escapeHtml(p.score ?? 0)}</td>
        <td>${escapeHtml(p.overallAccuracy ?? 0)}%</td>
        <td class="arabic-cell">${escapeHtml(weak)}</td>
        <td><button class="dashboard-link-btn" type="button" data-report-id="${id}">Detail</button></td>
      </tr>`;
  }).join('');
}

function renderDashboardDetail(report) {
  const detail = document.getElementById('dashboard-detail-content');
  if (!detail) return;
  if (!report) {
    detail.className = 'dashboard-empty-detail';
    detail.textContent = 'Pilih salah satu riwayat permainan untuk melihat perkembangan siswa.';
    return;
  }

  const p = report.payload || {};
  const a = report.analysis || {};
  const hand = p.handStats || {};
  const weak = Array.isArray(p.weakLetters) && p.weakLetters.length ? p.weakLetters.join(', ') : '-';
  detail.className = 'dashboard-detail-content';
  detail.innerHTML = `
    <div class="detail-hero">
      <div><span>Siswa</span><strong>${escapeHtml(p.studentName || 'Siswa')}</strong></div>
      <div><span>Kelas</span><strong>${escapeHtml(p.studentClass || 'Kelas Umum')}</strong></div>
      <div><span>Skor</span><strong>${escapeHtml(p.score ?? 0)}</strong></div>
      <div><span>Akurasi</span><strong>${escapeHtml(p.overallAccuracy ?? 0)}%</strong></div>
    </div>
    <div class="detail-row"><b>Waktu</b><span>${escapeHtml(formatDateTime(report.updatedAt || report.createdAt))}</span></div>
    <div class="detail-row"><b>Materi</b><span>${escapeHtml(p.learningTrack || '-')} • ${escapeHtml(p.playMode || '-')}</span></div>
    <div class="detail-row"><b>Huruf perlu penguatan</b><span class="arabic-cell">${escapeHtml(weak)}</span></div>
    <div class="detail-row"><b>Bantuan dipakai</b><span>${escapeHtml(p.hintsUsed ?? 0)} kali</span></div>
    <div class="detail-row"><b>Rata-rata waktu</b><span>${escapeHtml(p.averageLevelTimeSeconds ?? 0)} detik/level</span></div>
    <div class="detail-row"><b>Interaksi tangan</b><span>Kiri ${escapeHtml(hand.leftGrabs ?? 0)} • Kanan ${escapeHtml(hand.rightGrabs ?? 0)}</span></div>
    <div class="analysis-block"><h4>Ringkasan</h4><p>${escapeHtml(a.summary || 'Belum ada ringkasan.')}</p></div>
    <div class="analysis-block"><h4>Kognitif</h4><p>${escapeHtml(a.cognitive || 'Belum ada catatan kognitif.')}</p></div>
    <div class="analysis-block"><h4>Afektif</h4><p>${escapeHtml(a.affective || 'Belum ada catatan afektif.')}</p></div>
    <div class="analysis-block"><h4>Psikomotorik</h4><p>${escapeHtml(a.psychomotor || 'Belum ada catatan psikomotorik.')}</p></div>
    <div class="analysis-block recommendation"><h4>Rekomendasi Latihan</h4><p>${escapeHtml(a.recommendation || 'Belum ada rekomendasi.')}</p></div>
  `;
}

function renderTeacherDashboard() {
  updateDashboardClassFilter(teacherDashboardReports);
  const reports = getFilteredTeacherReports();
  renderDashboardSummary(reports);
  renderDashboardTable(reports);
  document.getElementById('dash-data-source').textContent = teacherDashboardLoaded
    ? 'Data lokal + Supabase/Server jika tersedia'
    : 'Data lokal';

  const selected = teacherDashboardReports.find(item => getReportId(item) === teacherDashboardSelectedId) || reports[0] || null;
  teacherDashboardSelectedId = selected ? getReportId(selected) : null;
  renderDashboardDetail(selected);
}

async function loadTeacherReports() {
  const localReports = readLocalTeacherReports();
  teacherDashboardReports = localReports;
  teacherDashboardLoaded = false;

  try {
    const response = await fetch('/api/reports');
    if (response.ok) {
      const data = await response.json();
      const serverReports = Array.isArray(data.reports) ? data.reports : [];
      const byId = new Map();
      [...serverReports, ...localReports].forEach(report => byId.set(getReportId(report), report));
      teacherDashboardReports = Array.from(byId.values())
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      writeLocalTeacherReports(teacherDashboardReports);
      teacherDashboardLoaded = true;
    }
  } catch (error) {
    teacherDashboardLoaded = false;
  }
}

function renderDashboardAccessState() {
  const gate = document.getElementById('dashboard-pin-gate');
  const main = document.getElementById('dashboard-main-content');
  const pinInput = document.getElementById('dashboard-pin-input');
  const pinStatus = document.getElementById('dashboard-pin-status');

  if (gate) gate.style.display = dashboardUnlocked ? 'none' : 'grid';
  if (main) {
    main.style.display = dashboardUnlocked ? 'block' : 'none';
    main.setAttribute('aria-hidden', dashboardUnlocked ? 'false' : 'true');
  }
  if (!dashboardUnlocked && pinInput) {
    pinInput.value = '';
    setTimeout(() => pinInput.focus(), 80);
  }
  if (pinStatus && !dashboardUnlocked) {
    pinStatus.textContent = 'Dashboard hanya dapat diakses oleh guru.';
    pinStatus.className = '';
  }
}

async function unlockTeacherDashboard() {
  const pinInput = document.getElementById('dashboard-pin-input');
  const pinStatus = document.getElementById('dashboard-pin-status');
  const value = (pinInput?.value || '').trim();
  if (value !== DASHBOARD_ACCESS_PIN) {
    if (pinStatus) {
      pinStatus.textContent = 'PIN salah. Coba masukkan lagi.';
      pinStatus.className = 'error';
    }
    pinInput?.focus();
    return;
  }
  dashboardUnlocked = true;
  if (pinStatus) {
    pinStatus.textContent = 'PIN benar. Dashboard penilaian dibuka.';
    pinStatus.className = 'unlocked';
  }
  renderDashboardAccessState();
  await loadTeacherReports();
  renderTeacherDashboard();
}

async function openTeacherDashboard() {
  const dashboard = document.getElementById('teacher-dashboard');
  if (dashboard) {
    dashboard.classList.add('show');
    dashboard.setAttribute('aria-hidden', 'false');
  }
  renderDashboardAccessState();
  if (dashboardUnlocked) {
    await loadTeacherReports();
    renderTeacherDashboard();
  }
}
window.openTeacherDashboard = openTeacherDashboard;

function closeTeacherDashboard() {
  const dashboard = document.getElementById('teacher-dashboard');
  if (dashboard) {
    dashboard.classList.remove('show');
    dashboard.setAttribute('aria-hidden', 'true');
  }
}

function exportDashboardCsv() {
  const reports = getFilteredTeacherReports();
  const headers = ['waktu','siswa','kelas','materi','mode','skor','akurasi','huruf_sulit','rekomendasi'];
  const rows = reports.map(report => {
    const p = report.payload || {};
    const a = report.analysis || {};
    return [
      formatDateTime(report.updatedAt || report.createdAt),
      p.studentName || 'Siswa',
      p.studentClass || 'Kelas Umum',
      p.learningTrack || '',
      p.playMode || '',
      p.score ?? 0,
      `${p.overallAccuracy ?? 0}%`,
      Array.isArray(p.weakLetters) ? p.weakLetters.join(' ') : '',
      a.recommendation || ''
    ];
  });
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard-penilaian-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearLocalDashboardData() {
  if (!confirm('Hapus data dashboard yang tersimpan di browser ini?')) return;
  localStorage.removeItem(TEACHER_REPORT_STORAGE_KEY);
  teacherDashboardReports = [];
  teacherDashboardSelectedId = null;
  renderTeacherDashboard();
}

function attachTeacherDashboardEvents() {
  ['open-dashboard-btn', 'open-dashboard-top-btn', 'open-dashboard-from-gameover-btn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', openTeacherDashboard);
  });
  document.getElementById('dashboard-pin-submit')?.addEventListener('click', unlockTeacherDashboard);
  document.getElementById('dashboard-pin-input')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      unlockTeacherDashboard();
    }
  });
  document.getElementById('close-dashboard-btn')?.addEventListener('click', closeTeacherDashboard);
  document.getElementById('dashboard-refresh-btn')?.addEventListener('click', async () => {
    await loadTeacherReports();
    renderTeacherDashboard();
  });
  document.getElementById('dashboard-export-btn')?.addEventListener('click', exportDashboardCsv);
  document.getElementById('dashboard-clear-local-btn')?.addEventListener('click', clearLocalDashboardData);
  document.getElementById('dashboard-search')?.addEventListener('input', renderTeacherDashboard);
  document.getElementById('dashboard-filter-class')?.addEventListener('change', renderTeacherDashboard);
  document.getElementById('dashboard-table-body')?.addEventListener('click', event => {
    const button = event.target.closest('[data-report-id]');
    if (!button) return;
    teacherDashboardSelectedId = button.dataset.reportId;
    renderTeacherDashboard();
  });
  document.getElementById('teacher-dashboard')?.addEventListener('click', event => {
    if (event.target && event.target.id === 'teacher-dashboard') closeTeacherDashboard();
  });
}

attachDashboardReportCapture();
attachTeacherDashboardEvents();
loadTeacherReports().then(renderTeacherDashboard);

// =============================================
