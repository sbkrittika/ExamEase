export const API_URL =
    import.meta.env.VITE_API_URL ||
    (
        import.meta.env.DEV ? 'http://127.0.0.1:5000' : 'https://examease-backend-r8s4.onrender.com');

export async function apiRequest(path, options = {}) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'Request failed.');
    return data;
}