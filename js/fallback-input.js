// KEYBOARD / MOUSE FALLBACK
// =============================================
function enableKeyboardFallback() {
  fallbackInputActive = true;
  if (fallbackEnabled) return;
  fallbackEnabled = true;
  document.addEventListener('mousemove', (e) => {
    if (!fallbackInputActive || !GameState.started) return;
    HandData.leftSmooth = {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight
    };
    HandData.leftHand = [{ x: 1 - HandData.leftSmooth.x, y: HandData.leftSmooth.y }];
    for (let i = 1; i < 21; i++) {
      HandData.leftHand.push({ x: 1 - HandData.leftSmooth.x, y: HandData.leftSmooth.y });
    }
  });

  document.addEventListener('mousedown', () => { if (fallbackInputActive && GameState.started) HandData.leftPinching = true; });
  document.addEventListener('mouseup', () => { if (fallbackInputActive) HandData.leftPinching = false; });

  document.addEventListener('touchmove', (e) => {
    if (!fallbackInputActive || !GameState.started) return;
    e.preventDefault();
    const t = e.touches[0];
    HandData.leftSmooth = {
      x: t.clientX / window.innerWidth,
      y: t.clientY / window.innerHeight
    };
    HandData.leftHand = [{ x: 1 - HandData.leftSmooth.x, y: HandData.leftSmooth.y }];
    for (let i = 1; i < 21; i++) HandData.leftHand.push({ x: 1 - HandData.leftSmooth.x, y: HandData.leftSmooth.y });
  }, { passive: false });

  document.addEventListener('touchstart', (e) => {
    if (!fallbackInputActive || !GameState.started) return;
    e.preventDefault();
    HandData.leftPinching = true;
    const t = e.touches[0];
    HandData.leftSmooth = { x: t.clientX / window.innerWidth, y: t.clientY / window.innerHeight };
    HandData.leftHand = [{ x: 1 - HandData.leftSmooth.x, y: HandData.leftSmooth.y }];
    for (let i = 1; i < 21; i++) HandData.leftHand.push({ x: 1 - HandData.leftSmooth.x, y: HandData.leftSmooth.y });
  }, { passive: false });

  document.addEventListener('touchend', () => { if (fallbackInputActive) HandData.leftPinching = false; });

  console.log('Mode mouse/touch fallback aktif');
}


function buildReportFileName() {
  const safeName = String(GameState.studentName || 'Siswa')
    .replace(/[^a-z0-9_\-]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'Siswa';
  const date = new Date().toISOString().slice(0, 10);
  return `laporan_petualangan_huruf_arab_${safeName}_${date}.pdf`;
}

function pdfEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getReportText(id, fallback = '-') {
  const text = document.getElementById(id)?.textContent?.trim();
  return text || fallback;
}

function buildPdfReportElement() {
  const weakLetters = getReportText('stat-weak-letters', '-');
  const now = new Date().toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const metrics = [
    ['Siswa', getReportText('stat-student-name', GameState.studentName || 'Siswa')],
    ['Kelas/Kelompok', GameState.studentClass || 'Kelas Umum'],
    ['Skor', getReportText('go-score', `Najm Kamu: ${GameState.score}`).replace('Najm Kamu:', '').trim() || String(GameState.score)],
    ['Materi & Mode', getReportText('stat-play-mode')],
    ['Total Tangkapan', getReportText('stat-total-grabs')],
    ['Akurasi Kiri', getReportText('stat-left-accuracy')],
    ['Akurasi Kanan', getReportText('stat-right-accuracy')],
    ['Pola Dominan', getReportText('stat-dominant-hand')],
    ['Bantuan Dipakai', getReportText('stat-hints-used')],
    ['Rata-rata Waktu/Level', getReportText('stat-average-level-time')]
  ];

  const sections = [
    ['Ringkasan Belajar', getReportText('stat-learning-note', 'Belum ada ringkasan.')],
    ['Analisis Kognitif', getReportText('stat-cognitive-note', 'Belum ada data kognitif.')],
    ['Analisis Afektif', getReportText('stat-affective-note', 'Belum ada data afektif.')],
    ['Analisis Psikomotorik', getReportText('stat-psychomotor-note', 'Belum ada data psikomotorik.')],
    ['Rekomendasi Latihan', getReportText('stat-recommendation-note', 'Belum ada rekomendasi.')]
  ];

  const root = document.createElement('div');
  root.className = 'pdf-export-report';
  root.innerHTML = `
    <style>
      .pdf-export-report {
        width: 760px;
        min-height: 1040px;
        box-sizing: border-box;
        background: #fffdf4;
        color: #1f3347;
        font-family: Arial, "Noto Sans", "Noto Naskh Arabic", sans-serif;
        padding: 28px;
        border: 1px solid #e7edf5;
      }
      .pdf-export-report * { box-sizing: border-box; }
      .pdf-header {
        background: linear-gradient(135deg, #0f766e, #2563eb);
        color: white;
        border-radius: 22px;
        padding: 24px 26px;
        margin-bottom: 18px;
      }
      .pdf-eyebrow {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
        opacity: .9;
      }
      .pdf-title {
        margin: 0;
        font-size: 28px;
        line-height: 1.18;
        font-weight: 900;
      }
      .pdf-subtitle {
        margin: 10px 0 0;
        font-size: 13px;
        line-height: 1.5;
        opacity: .94;
      }
      .pdf-meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin: 16px 0 18px;
      }
      .pdf-metric {
        border: 1px solid #dbe8f7;
        border-radius: 14px;
        padding: 10px 12px;
        background: #ffffff;
      }
      .pdf-metric span {
        display: block;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: #64748b;
        font-weight: 800;
        margin-bottom: 4px;
      }
      .pdf-metric strong {
        display: block;
        color: #1e3a5f;
        font-size: 14px;
        line-height: 1.3;
      }
      .pdf-alert {
        border-radius: 14px;
        padding: 12px 14px;
        background: #fff7df;
        border: 1px solid #f8d66d;
        color: #654200;
        font-weight: 800;
        margin-bottom: 16px;
      }
      .pdf-section {
        border: 1px solid #dbe8f7;
        border-radius: 16px;
        background: #ffffff;
        padding: 14px 16px;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      .pdf-section h3 {
        margin: 0 0 7px;
        color: #0f766e;
        font-size: 16px;
        font-weight: 900;
      }
      .pdf-section p {
        margin: 0;
        font-size: 13px;
        line-height: 1.55;
        color: #334155;
      }
      .pdf-footer {
        margin-top: 18px;
        padding-top: 12px;
        border-top: 1px dashed #cbd5e1;
        color: #64748b;
        font-size: 11px;
        line-height: 1.5;
      }
    </style>
    <div class="pdf-header">
      <p class="pdf-eyebrow">Petualangan Huruf Arab</p>
      <h1 class="pdf-title">Laporan Observasi Belajar Siswa</h1>
      <p class="pdf-subtitle">Hasil permainan hijaiyah berbasis gestur tangan, MediaPipe, dan AI Recommendation. Dibuat otomatis pada ${pdfEscape(now)}.</p>
    </div>
    <div class="pdf-meta">
      ${metrics.map(([label, value]) => `
        <div class="pdf-metric"><span>${pdfEscape(label)}</span><strong>${pdfEscape(value)}</strong></div>
      `).join('')}
    </div>
    <div class="pdf-alert">Materi perlu penguatan: <span dir="rtl">${pdfEscape(weakLetters)}</span></div>
    ${sections.map(([title, body]) => `
      <section class="pdf-section">
        <h3>${pdfEscape(title)}</h3>
        <p>${pdfEscape(body)}</p>
      </section>
    `).join('')}
    <div class="pdf-footer">
      Catatan: laporan ini bukan diagnosis psikologis atau medis. Laporan hanya berisi observasi belajar berdasarkan aktivitas bermain dan dapat digunakan guru/orang tua sebagai bahan pendampingan.
    </div>
  `;
  return root;
}

async function downloadGameOverReportPdf() {
  updateHandStatsPanel();
  const report = document.getElementById('hand-stats');
  if (report) report.classList.add('show');
  const reportBtn = document.getElementById('report-btn');
  if (reportBtn) reportBtn.textContent = 'Tutup Laporan ✨';

  if (typeof html2pdf === 'undefined') {
    showSetupToast('Library PDF belum termuat. Gunakan dialog print lalu pilih Save as PDF.', 'error');
    window.print();
    return;
  }

  const downloadBtn = document.getElementById('download-report-btn');
  const oldText = downloadBtn ? downloadBtn.textContent : '';
  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Membuat PDF...';
  }

  const pdfRoot = buildPdfReportElement();
  pdfRoot.style.position = 'fixed';
  pdfRoot.style.left = '0';
  pdfRoot.style.top = '0';
  pdfRoot.style.zIndex = '2147483647';
  pdfRoot.style.pointerEvents = 'none';
  document.body.appendChild(pdfRoot);

  const options = {
    margin: 8,
    filename: buildReportFileName(),
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#fffdf4',
      scrollX: 0,
      scrollY: 0,
      windowWidth: 820
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  try {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await html2pdf().set(options).from(pdfRoot).save();
  } catch (error) {
    console.error('Gagal membuat PDF:', error);
    showSetupToast('PDF gagal dibuat otomatis. Gunakan dialog print lalu pilih Save as PDF.', 'error');
    window.print();
  } finally {
    pdfRoot.remove();
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.textContent = oldText || 'Download PDF 📄';
    }
  }
}

// =============================================
