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

function getPdfReportPayload() {
  updateHandStatsPanel();
  return {
    generatedAt: new Date().toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    studentName: getReportText('stat-student-name', GameState.studentName || 'Siswa'),
    className: GameState.studentClass || 'Kelas Umum',
    score: getReportText('go-score', `Najm Kamu: ${GameState.score}`).replace('Najm Kamu:', '').trim() || String(GameState.score),
    playMode: getReportText('stat-play-mode', '-'),
    totalGrabs: getReportText('stat-total-grabs', '-'),
    leftAccuracy: getReportText('stat-left-accuracy', '-'),
    rightAccuracy: getReportText('stat-right-accuracy', '-'),
    dominantHand: getReportText('stat-dominant-hand', '-'),
    hintsUsed: getReportText('stat-hints-used', '-'),
    averageLevelTime: getReportText('stat-average-level-time', '-'),
    weakLetters: getReportText('stat-weak-letters', '-'),
    sections: [
      ['Ringkasan Belajar', getReportText('stat-learning-note', 'Belum ada ringkasan.')],
      ['Analisis Kognitif', getReportText('stat-cognitive-note', 'Belum ada data kognitif.')],
      ['Analisis Afektif', getReportText('stat-affective-note', 'Belum ada data afektif.')],
      ['Analisis Psikomotorik', getReportText('stat-psychomotor-note', 'Belum ada data psikomotorik.')],
      ['Rekomendasi Latihan', getReportText('stat-recommendation-note', 'Belum ada rekomendasi.')]
    ]
  };
}

function getSafePdfText(value) {
  return String(value ?? '-')
    .replace(/\s+/g, ' ')
    .trim() || '-';
}

function addWrappedPdfText(doc, text, x, y, maxWidth, lineHeight, options = {}) {
  const lines = doc.splitTextToSize(getSafePdfText(text), maxWidth);
  const pageHeight = doc.internal.pageSize.getHeight();
  let cursorY = y;

  lines.forEach((line) => {
    if (cursorY > pageHeight - 18) {
      doc.addPage();
      cursorY = 18;
      if (options.fontSize) doc.setFontSize(options.fontSize);
      if (options.textColor) doc.setTextColor(...options.textColor);
    }
    doc.text(line, x, cursorY);
    cursorY += lineHeight;
  });

  return cursorY;
}


function loadScriptOnce(src, globalCheck) {
  return new Promise((resolve, reject) => {
    if (globalCheck && globalCheck()) return resolve();
    const existing = Array.from(document.scripts).find((script) => script.src === src);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensureJsPdfReady() {
  if (window.jspdf?.jsPDF || window.jsPDF) return true;
  try {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', () => window.jspdf?.jsPDF || window.jsPDF);
    return Boolean(window.jspdf?.jsPDF || window.jsPDF);
  } catch (error) {
    console.error('Gagal memuat jsPDF:', error);
    return false;
  }
}

function generateReportWithJsPdf(payload) {
  const JsPdfCtor = window.jspdf?.jsPDF || window.jsPDF;
  if (!JsPdfCtor) return false;

  const doc = new JsPdfCtor({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  doc.setFillColor(15, 118, 110);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 34, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PETUALANGAN HURUF ARAB', margin + 7, y + 9);
  doc.setFontSize(18);
  doc.text('Laporan Observasi Belajar Siswa', margin + 7, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Dibuat otomatis pada ${payload.generatedAt}`, margin + 7, y + 28);
  y += 44;

  const metrics = [
    ['Siswa', payload.studentName],
    ['Kelas/Kelompok', payload.className],
    ['Skor', payload.score],
    ['Materi & Mode', payload.playMode],
    ['Total Tangkapan', payload.totalGrabs],
    ['Akurasi Kiri', payload.leftAccuracy],
    ['Akurasi Kanan', payload.rightAccuracy],
    ['Pola Dominan', payload.dominantHand],
    ['Bantuan Dipakai', payload.hintsUsed],
    ['Rata-rata Waktu/Level', payload.averageLevelTime]
  ];

  const colW = (pageWidth - margin * 2 - 6) / 2;
  const rowH = 15;
  doc.setTextColor(31, 51, 71);
  metrics.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (colW + 6);
    const boxY = y + row * (rowH + 4);
    doc.setDrawColor(219, 232, 247);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, boxY, colW, rowH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x + 4, boxY + 5);
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 95);
    doc.text(doc.splitTextToSize(getSafePdfText(value), colW - 8).slice(0, 2), x + 4, boxY + 11);
  });
  y += Math.ceil(metrics.length / 2) * (rowH + 4) + 3;

  doc.setFillColor(255, 247, 223);
  doc.setDrawColor(248, 214, 109);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'FD');
  doc.setTextColor(101, 66, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Materi perlu penguatan: ${getSafePdfText(payload.weakLetters)}`, margin + 4, y + 8);
  y += 20;

  payload.sections.forEach(([title, body]) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y > pageHeight - 45) {
      doc.addPage();
      y = 18;
    }
    doc.setDrawColor(219, 232, 247);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 118, 110);
    doc.text(title, margin + 4, y + 8);
    y += 17;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    y = addWrappedPdfText(doc, body, margin + 2, y, pageWidth - margin * 2 - 4, 5, {
      fontSize: 10,
      textColor: [51, 65, 85]
    }) + 8;
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - 25) {
    doc.addPage();
    y = 18;
  }
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  addWrappedPdfText(
    doc,
    'Catatan: laporan ini bukan diagnosis psikologis atau medis. Laporan hanya berisi observasi belajar berdasarkan aktivitas bermain dan dapat digunakan guru/orang tua sebagai bahan pendampingan.',
    margin,
    y,
    pageWidth - margin * 2,
    4,
    { fontSize: 8, textColor: [100, 116, 139] }
  );

  doc.save(buildReportFileName());
  return true;
}

async function downloadGameOverReportPdf() {
  document.body.classList.add('report-open', 'game-over-open');
  updateHandStatsPanel();
  const report = document.getElementById('hand-stats');
  if (report) report.classList.add('show');
  const reportBtn = document.getElementById('report-btn');
  if (reportBtn) reportBtn.textContent = 'Tutup Laporan ✨';

  const downloadBtn = document.getElementById('download-report-btn');
  const oldText = downloadBtn ? downloadBtn.textContent : '';
  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Membuat PDF...';
  }

  try {
    const payload = getPdfReportPayload();
    await ensureJsPdfReady();
    const ok = generateReportWithJsPdf(payload);
    if (!ok) {
      throw new Error('jsPDF tidak tersedia dari html2pdf bundle.');
    }
  } catch (error) {
    console.error('Gagal membuat PDF:', error);
    showSetupToast('PDF gagal dibuat otomatis. Membuka print dialog sebagai cadangan.', 'error');
    window.print();
  } finally {
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.textContent = oldText || 'Download PDF 📄';
    }
  }
}

// =============================================
