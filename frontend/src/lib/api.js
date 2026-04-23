const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api';

function joinUrl(...parts) {
  return parts
    .filter(Boolean)
    .map((p, idx) => {
      const s = String(p);
      if (idx === 0) return s.replace(/\/+$/, '');
      return s.replace(/^\/+/, '').replace(/\/+$/, '');
    })
    .join('/')
    .replace(/\/+$/, '');
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('ncc_token');

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const url = joinUrl(API_ORIGIN, API_PREFIX, endpoint);
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('ncc_token');
        localStorage.removeItem('ncc_user');
        window.dispatchEvent(new Event('ncc_logout'));
      }
      return { data: null, error: data.error || 'Something went wrong' };
    }

    return { data, error: null };
  } catch (err) {
    console.error('API Fetch Error:', err);
    return { data: null, error: 'Network error. Please check your connection.' };
  }
}
