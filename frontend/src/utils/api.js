// MACCAN RMS - API utility
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('maccan_token');
}

function errorMessage(data, status) {
  if (typeof data === 'string') return data;
  const message = data?.error || data?.message || data?.errors?.[0]?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (message && typeof message === 'object') return message.message || JSON.stringify(message);
  return `Request failed (${status})`;
}

async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    throw new Error('Backend is unavailable. Start the POS server on port 3001.');
  }

  if (res.status === 401) {
    localStorage.removeItem('maccan_token');
    localStorage.removeItem('maccan_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(errorMessage(data, res.status));
  return data;
}

export const api = {
  get: (ep) => apiCall(ep),
  post: (ep, body) => apiCall(ep, { method: 'POST', body: JSON.stringify(body) }),
  put: (ep, body) => apiCall(ep, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (ep) => apiCall(ep, { method: 'DELETE' }),
};
