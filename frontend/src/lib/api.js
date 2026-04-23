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

function isAuthFlowEndpoint(endpoint) {
  const e = String(endpoint || '');
  return (
    e.includes('/auth/login') ||
    e.includes('/auth/register') ||
    e.includes('/auth/refresh') ||
    e.includes('/auth/refresh-token') ||
    e.includes('/auth/logout')
  );
}

async function tryRefreshToken() {
  const refreshToken = localStorage.getItem('ncc_refresh_token');
  if (!refreshToken) return null;

  const url = joinUrl(API_ORIGIN, API_PREFIX, '/auth/refresh');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  if (!data?.token || !data?.refreshToken) return null;

  localStorage.setItem('ncc_token', data.token);
  localStorage.setItem('ncc_refresh_token', data.refreshToken);
  if (data.user) {
    localStorage.setItem('ncc_user', JSON.stringify(data.user));
  }
  return data;
}

export async function apiFetch(endpoint, options = {}, retrying = false) {
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
      if (response.status === 401 && !retrying && !isAuthFlowEndpoint(endpoint)) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          return apiFetch(endpoint, options, true);
        }
      }
      if (response.status === 401) {
        localStorage.removeItem('ncc_token');
        localStorage.removeItem('ncc_refresh_token');
        localStorage.removeItem('ncc_user');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('ncc_logout'));
        }
      }
      return { data: null, error: data.error || 'Something went wrong' };
    }

    return { data, error: null };
  } catch (err) {
    console.error('API Fetch Error:', err);
    return { data: null, error: 'Network error. Please check your connection.' };
  }
}
