const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api';
const COOKIE_AUTH_ENABLED = String(import.meta.env.VITE_COOKIE_AUTH || 'false') === 'true';

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
  try {
    const url = joinUrl(API_ORIGIN, API_PREFIX, '/auth/refresh');
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: COOKIE_AUTH_ENABLED ? JSON.stringify({}) : JSON.stringify({ refreshToken: localStorage.getItem('ncc_refresh_token') }),
    });
    
    if (!response.ok) {
      return { status: 'ERROR', httpStatus: response.status };
    }

    const data = await response.json().catch(() => null);
    if (!data?.token || !data?.refreshToken) {
      return { status: 'INVALID_RESPONSE' };
    }

    if (!COOKIE_AUTH_ENABLED) {
      localStorage.setItem('ncc_token', data.token);
      localStorage.setItem('ncc_refresh_token', data.refreshToken);
      if (data.user) {
        localStorage.setItem('ncc_user', JSON.stringify(data.user));
      }
    }
    return { status: 'SUCCESS', data };
  } catch (err) {
    console.error('Token refresh error:', err);
    return { status: 'NETWORK_ERROR' };
  }
}

export async function apiFetch(endpoint, options = {}, retrying = false) {
  const token = COOKIE_AUTH_ENABLED ? null : localStorage.getItem('ncc_token');

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const csrfToken = typeof document !== 'undefined'
    ? document.cookie.split('; ').find((x) => x.startsWith('ncc_csrf_token='))?.split('=')[1]
    : null;
  const method = String(options.method || 'GET').toUpperCase();
  if (COOKIE_AUTH_ENABLED && csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['X-CSRF-Token'] = decodeURIComponent(csrfToken);
  }

  try {
    const url = joinUrl(API_ORIGIN, API_PREFIX, endpoint);
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !isAuthFlowEndpoint(endpoint)) {
        if (!retrying) {
          const refreshResult = await tryRefreshToken();
          if (refreshResult.status === 'SUCCESS') {
            return apiFetch(endpoint, options, true);
          }
          
          // Refresh failed. Wiping tokens and logging out ONLY if it's a definitive auth failure:
          // - No refresh token in storage.
          // - Server returned a 4xx error (except 404/429).
          const status = refreshResult.httpStatus;
          const isAuthError = refreshResult.status === 'NO_TOKEN' || 
                              refreshResult.status === 'INVALID_RESPONSE' ||
                              (refreshResult.status === 'ERROR' && 
                               status >= 400 && status < 500 && status !== 404 && status !== 429);
          
          if (isAuthError) {
            localStorage.removeItem('ncc_token');
            localStorage.removeItem('ncc_refresh_token');
            localStorage.removeItem('ncc_user');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('ncc_logout'));
            }
          }
        } else {
          // If we already retried and still got 401, the new access token is invalid.
          // This is a definitive auth failure.
          localStorage.removeItem('ncc_token');
          localStorage.removeItem('ncc_refresh_token');
          localStorage.removeItem('ncc_user');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('ncc_logout'));
          }
        }
      } else if (response.status === 401) {
        // If it's an auth flow endpoint (like login/logout) and it returns 401, clear storage.
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
