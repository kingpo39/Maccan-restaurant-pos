// MACCAN RMS - API utility
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('maccan_token');
}

async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('maccan_token');
    localStorage.removeItem('maccan_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }
  return data;
}

export const api = {
  get: (ep) => apiCall(ep),
  post: (ep, body) => apiCall(ep, { method: 'POST', body: JSON.stringify(body) }),
  put: (ep, body) => apiCall(ep, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (ep) => apiCall(ep, { method: 'DELETE' }),
};
