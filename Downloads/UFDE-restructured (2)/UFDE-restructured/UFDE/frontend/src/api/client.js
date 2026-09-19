const BASE = import.meta.env.VITE_API_BASE || '';

const TOKEN_KEY = 'ufde_token';
const USER_KEY = 'ufde_user';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  setUser: (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
};

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Decodes the role/name/email carried inside the JWT payload. */
export function decodeToken(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const opts = { method, headers: { ...headers } };
  const token = tokenStore.get();
  if (token) opts.headers.Authorization = `Bearer ${token}`;

  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(BASE + path, opts);

  if (res.status === 401) {
    tokenStore.clear();
    throw new ApiError('Your session has expired. Sign in again.', 401, 'UNAUTHENTICATED');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new ApiError(data?.error?.message || `Request failed (${res.status})`, res.status, data?.error?.code);
  }
  return data.data;
}

/** Fetches a binary payload (STR report, export file) and saves it to disk. */
async function downloadFile(path, fallbackName) {
  const token = tokenStore.get();
  const res = await fetch(BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401) {
    tokenStore.clear();
    throw new ApiError('Your session has expired. Sign in again.', 401, 'UNAUTHENTICATED');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data?.error?.message || `Download failed (${res.status})`, res.status, data?.error?.code);
  }

  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = match ? match[1] : fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/api/auth/me'),

  listTransactions: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    ).toString();
    return request(`/api/transactions${q ? `?${q}` : ''}`);
  },
  getTransaction: (id) => request(`/api/transactions/${encodeURIComponent(id)}`),
  getStrModel: (id) => request(`/api/transactions/${encodeURIComponent(id)}/str/model`),
  downloadStr: (id, format = 'pdf') =>
    downloadFile(`/api/transactions/${encodeURIComponent(id)}/str?format=${format}`, `${id}.${format}`),

  riskScore: (payload) => request('/api/risk-score', { method: 'POST', body: payload }),
  upload: (formData) => request('/api/upload', { method: 'POST', body: formData }),
  applyAction: (id, action, note) =>
    request(`/api/actions/${encodeURIComponent(id)}`, { method: 'POST', body: { action, note } }),
  downloadExport: (format) => downloadFile(`/api/export/${format}`, `ufde-export.${format}`),

  getScoringConfig: () => request('/api/scoring-config'),
  saveScoringConfig: (cfg) => request('/api/scoring-config', { method: 'PUT', body: cfg }),
  resetScoringConfig: () => request('/api/scoring-config/reset', { method: 'POST' }),

  listUsers: () => request('/api/admin/users'),
  listAuditLog: (limit = 200) => request(`/api/admin/audit-log?limit=${limit}`),
};
