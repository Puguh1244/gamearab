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

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method tidak didukung. Gunakan POST.' })
    };
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'GROQ_API_KEY belum diisi di Netlify environment variables.' })
      };
    }

    const reportData = event.body ? JSON.parse(event.body) : {};

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
            content: buildPrompt(reportData)
          }
        ]
      })
    });

    const data = await groqResponse.json();
    if (!groqResponse.ok) {
      return {
        statusCode: groqResponse.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.error?.message || 'Gagal memanggil Groq API.' })
      };
    }

    const content = data.choices?.[0]?.message?.content || '';
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = { recommendation: content || 'Analisis AI belum tersedia.' };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'groq', analysis })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Function gagal membuat analisis.' })
    };
  }
}
