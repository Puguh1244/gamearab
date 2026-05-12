# Petualangan Huruf Arab

Project ini sudah dipisah dari satu file HTML besar menjadi struktur frontend + backend Groq.

## Struktur

```text
petualangan_huruf_arab_split/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  ├─ game-data.js          # Data huruf hijaiyah, sambung huruf, kosakata, ayat, mode
│  ├─ game-state.js         # State utama game
│  ├─ hand-state.js         # State tracking tangan
│  ├─ game-ui.js            # HUD, laporan KAP lokal, PDF, slot jawaban
│  ├─ report-ai.js          # Penghubung frontend ke backend Groq
│  ├─ teacher-dashboard.js  # Dashboard penilaian, simpan laporan, export CSV
│  ├─ game-scene.js         # Scene Phaser dan logika huruf jatuh
│  ├─ phaser-config.js      # Inisialisasi Phaser
│  ├─ hand-tracking.js      # MediaPipe Hands
│  ├─ app-init.js           # Start game, PIN guru, menu, setting
│  ├─ fallback-input.js     # Mouse/touch fallback
│  ├─ events.js             # Event listener tombol
│  └─ boot.js               # Boot saat load
├─ server.js                # Backend Express untuk Groq API dan penyimpanan laporan
├─ package.json
└─ .env.example
```

## Cara menjalankan tanpa Groq

Buka `index.html` langsung di browser. Game tetap jalan dan laporan memakai analisis lokal.

## Cara menjalankan dengan Groq

1. Install Node.js 18+.
2. Masuk folder project.
3. Jalankan:

```bash
npm install
cp .env.example .env
```

4. Isi API key di `.env`:

```env
GROQ_API_KEY=gsk_isi_api_key_kamu
GROQ_MODEL=llama-3.3-70b-versatile
```

5. Jalankan server:

```bash
npm start
```

6. Buka:

```text
http://localhost:3000
```


## Dashboard Penilaian

Versi ini sudah ditambahkan dashboard penilaian guru dalam satu website.

Fitur dashboard:
- tombol **Dashboard Penilaian** di halaman awal dan halaman game over;
- filter berdasarkan kelas/kelompok;
- pencarian nama siswa, kelas, atau materi;
- ringkasan total sesi, jumlah siswa, rata-rata akurasi, dan rata-rata skor;
- tabel riwayat permainan siswa;
- detail analisis KAP dan saran latihan;
- export data ke CSV.

Fitur Tambah Soal:
- hanya dibuka setelah PIN guru benar;
- guru dapat menambah soal baru;
- guru dapat menghapus soal tambahan yang tersimpan di browser.

Alur data:

```text
Murid bermain game
  ↓
Game over / selesai
  ↓
Laporan lokal dibuat
  ↓
Jika Groq aktif, laporan diperbarui dengan rekomendasi latihan otomatis
  ↓
Data tersimpan di localStorage dan, jika server Express aktif, juga di data/reports.json
  ↓
Guru membuka Dashboard Penilaian
```

Catatan:
- Jika game dibuka langsung dari `index.html`, dashboard tetap menyimpan data di browser melalui localStorage.
- Jika dijalankan dengan `npm start`, laporan juga disimpan di `data/reports.json` melalui endpoint `/api/reports`.
- Untuk pemantauan lintas perangkat secara online, storage dapat ditingkatkan ke Supabase/Firebase/Netlify Functions.

## Catatan keamanan

Jangan taruh API key Groq di file HTML atau file JavaScript frontend. API key hanya boleh ada di `.env` backend.

## Laporan akhir

Laporan KAP hanya muncul di halaman Game Over:
- Kognitif
- Afektif
- Psikomotorik
- Rekomendasi latihan
- Download PDF

Laporan ini adalah observasi belajar berbasis aktivitas game, bukan diagnosis medis atau psikologis.

## Perbaikan Groq API

Versi ini sudah memperjelas pemanggilan Groq API:

- Saat game over, fungsi `window.requestGroqKapAnalysis({ force: true })` dipanggil langsung.
- Saat semua level selesai, Groq juga dipanggil langsung.
- Saat tombol **Lihat Analisis** ditekan, Groq dipanggil lagi jika data sesi berubah.
- Saat **Download PDF**, sistem menunggu hasil Groq terlebih dahulu agar PDF tidak hanya berisi analisis lokal.
- Status Groq muncul di laporan: memproses, berhasil, atau error.
- Console browser akan menampilkan log `[Groq] Memanggil endpoint: /api/analyze-report`.

### Lokal dengan Express

```bash
npm install
cp .env.example .env
npm start
```

Isi `.env`:

```env
GROQ_API_KEY=gsk_isi_api_key_kamu
GROQ_MODEL=llama-3.3-70b-versatile
```

Buka `http://localhost:3000`, bukan membuka `index.html` langsung.

### Deploy Netlify

Versi ini sudah menyertakan:

```text
netlify.toml
netlify/functions/analyze-report.js
```

Di Netlify, isi Environment Variables:

```text
GROQ_API_KEY
GROQ_MODEL
```

Frontend tetap memanggil `/api/analyze-report`, lalu Netlify akan me-redirect ke function `/.netlify/functions/analyze-report`.
