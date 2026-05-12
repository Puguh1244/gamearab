import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));


async function readReports() {
  try {
    const raw = await fs.readFile(REPORTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeReports(reports) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REPORTS_FILE, JSON.stringify(reports.slice(0, 500), null, 2));
}

function normalizeReport(input = {}) {
  const payload = input.payload || {};
  const id = input.id || payload.sessionId || `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = input.createdAt || payload.createdAt || new Date().toISOString();
  return {
    id,
    createdAt,
    updatedAt: new Date().toISOString(),
    source: input.source || 'local',
    payload,
    analysis: input.analysis || {}
  };
}

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await readReports();
    reports.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Gagal membaca laporan.' });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const incoming = normalizeReport(req.body);
    const reports = await readReports();
    const index = reports.findIndex(report => report.id === incoming.id);
    if (index >= 0) {
      reports[index] = { ...reports[index], ...incoming, createdAt: reports[index].createdAt || incoming.createdAt };
    } else {
      reports.unshift(incoming);
    }
    reports.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    await writeReports(reports);
    res.json({ ok: true, report: incoming });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Gagal menyimpan laporan.' });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const reports = await readReports();
    const nextReports = reports.filter(report => report.id !== req.params.id);
    await writeReports(nextReports);
    res.json({ ok: true, deleted: reports.length - nextReports.length });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Gagal menghapus laporan.' });
  }
});

function buildPrompt(reportData) {
  return `
Buat laporan observasi belajar untuk game edukasi "Petualangan Huruf Arab".

Tugasmu membuat analisis KAP:
1. Kognitif: pemahaman huruf hijaiyah, sambung huruf, kosakata, penggalan ayat.
2. Afektif: motivasi, kemandirian, ketekunan, respons terhadap bantuan.
3. Psikomotorik: koordinasi tangan saat menangkap dan meletakkan huruf.
4. Rekomendasi latihan berikutnya.

Aturan penting:
- Jangan membuat diagnosis medis, psikologis, ADHD, autisme, gangguan belajar, atau label klinis.
- Gunakan bahasa Indonesia yang ramah, profesional, dan cocok untuk guru/orang tua.
- Fokus hanya pada data aktivitas bermain.
- Keluarkan JSON valid saja, tanpa markdown.
- Struktur JSON wajib:
{
  "summary": "...",
  "cognitive": "...",
  "affective": "...",
  "psychomotor": "...",
  "recommendation": "..."
}

Data game:
${JSON.stringify(reportData, null, 2)}
`.trim();
}

app.post('/api/analyze-report', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY belum diisi di file .env' });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.35,
        messages: [
          {
            role: 'system',
            content: 'Kamu adalah asisten pendidikan yang membuat laporan observasi belajar anak secara objektif, aman, dan tidak mendiagnosis.'
          },
          {
            role: 'user',
            content: buildPrompt(req.body)
          }
        ]
      })
    });

    const data = await groqResponse.json();
    if (!groqResponse.ok) {
      return res.status(groqResponse.status).json({ error: data.error?.message || 'Gagal memanggil Groq API' });
    }

    const content = data.choices?.[0]?.message?.content || '';
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = { recommendation: content || 'Analisis AI belum tersedia.' };
    }

    res.json({ source: 'groq', analysis });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server gagal membuat analisis.' });
  }
});

app.listen(PORT, () => {
  console.log(`Petualangan Huruf Arab jalan di http://localhost:${PORT}`);
});
