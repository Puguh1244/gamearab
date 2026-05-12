const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(statusCode, data) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(data)
  };
}

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  const table = process.env.SUPABASE_REPORTS_TABLE || 'learning_reports';

  if (!url || !key) {
    throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi di Netlify Environment Variables.');
  }

  return { url, key, table };
}

function normalizeReport(input = {}) {
  const payload = input.payload || input || {};
  const id = input.id || payload.sessionId || `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = input.createdAt || input.created_at || payload.createdAt || new Date().toISOString();
  const updatedAt = new Date().toISOString();

  return {
    id,
    created_at: createdAt,
    updated_at: updatedAt,
    source: input.source || 'local',
    payload,
    analysis: input.analysis || input.aiAnalysis || {}
  };
}

function toClientReport(row = {}) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source || 'supabase',
    payload: row.payload || {},
    analysis: row.analysis || {}
  };
}

async function supabaseRequest(path, options = {}) {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!response.ok) {
    const message = data?.message || data?.error || text || `Supabase error ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function listReports() {
  const { table } = getSupabaseConfig();
  const rows = await supabaseRequest(`${table}?select=*&order=updated_at.desc&limit=500`, {
    method: 'GET'
  });
  return Array.isArray(rows) ? rows.map(toClientReport) : [];
}

async function upsertReport(rawReport) {
  const { table } = getSupabaseConfig();
  const row = normalizeReport(rawReport);
  const rows = await supabaseRequest(`${table}?on_conflict=id`, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(row)
  });
  const saved = Array.isArray(rows) ? rows[0] : row;
  return toClientReport(saved);
}

async function deleteReport(id) {
  const { table } = getSupabaseConfig();
  if (!id) throw new Error('ID laporan tidak ditemukan.');
  await supabaseRequest(`${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' }
  });
  return id;
}

function getDeleteId(event) {
  const parts = (event.path || '').split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last || last === 'reports') return '';
  return decodeURIComponent(last);
}

export async function handler(event) {
  try {
    if (event.httpMethod === 'GET') {
      const reports = await listReports();
      return json(200, { ok: true, source: 'supabase', reports });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const report = await upsertReport(body);
      return json(200, { ok: true, source: 'supabase', report });
    }

    if (event.httpMethod === 'DELETE') {
      const id = getDeleteId(event);
      const deletedId = await deleteReport(id);
      return json(200, { ok: true, source: 'supabase', deleted: deletedId });
    }

    return json(405, { error: 'Method tidak didukung. Gunakan GET, POST, atau DELETE.' });
  } catch (error) {
    return json(500, { error: error.message || 'Gagal mengakses database Supabase.' });
  }
}
