export const API_URL = import.meta.env.VITE_API_URL || 'https://examease-backend-r8s4.onrender.com';

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  let payload = {};
  try { payload = await response.json(); } catch { payload = {}; }
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  if (!response.ok) throw new Error(payload.message || payload.error || 'Request failed. Please try again.');
  return payload;
}
