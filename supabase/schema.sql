-- Jalankan di Supabase Dashboard > SQL Editor
-- Tabel untuk menyimpan riwayat nilai/laporan game siswa.

create table if not exists public.learning_reports (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'local',
  payload jsonb not null default '{}'::jsonb,
  analysis jsonb not null default '{}'::jsonb
);

create index if not exists learning_reports_updated_at_idx
  on public.learning_reports (updated_at desc);

create index if not exists learning_reports_student_class_idx
  on public.learning_reports ((payload->>'studentClass'));

create index if not exists learning_reports_student_name_idx
  on public.learning_reports ((payload->>'studentName'));

alter table public.learning_reports enable row level security;

-- Tidak dibuat policy anon karena browser tidak akses Supabase langsung.
-- Akses database dilakukan dari Netlify Function memakai SUPABASE_SERVICE_ROLE_KEY.
-- Simpan service role key hanya di Netlify Environment Variables, jangan di frontend/GitHub.
