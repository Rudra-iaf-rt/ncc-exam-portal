import axios from 'axios';
import { getToken, setToken, clearAuth, getRefreshToken, setRefreshToken } from '../lib/auth';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '/api';
const COOKIE_AUTH_ENABLED = String(import.meta.env.VITE_COOKIE_AUTH || 'false') === 'true';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function readCsrfToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('ncc_csrf_token='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

// Lightweight, ultra-efficient client-side cache for GET requests to prevent duplicate API calls on page navigation
const apiCache = new Map();
const CACHE_TTL = 10000; // 10 seconds cache validity

apiClient.defaults.adapter = async function (config) {
  const method = config.method?.toLowerCase();
  
  // Only cache GET requests and only if bypassCache is not explicitly set
  if (method === 'get' && !config.bypassCache) {
    const cacheKey = `${config.url}?${JSON.stringify(config.params || {})}`;
    const cachedItem = apiCache.get(cacheKey);
    const now = Date.now();

    // 1. If we have a valid cached response, serve it immediately
    if (cachedItem && (now - cachedItem.timestamp < CACHE_TTL) && cachedItem.response) {
      return Promise.resolve(cachedItem.response);
    }

    // 2. If a request for this endpoint is already pending, reuse that same promise (request deduplication)
    if (cachedItem && cachedItem.pendingPromise) {
      return cachedItem.pendingPromise;
    }

    // 3. Otherwise, resolve the default adapter and trigger the network call
    let adapterToUse = config.adapter;
    if (!adapterToUse || adapterToUse === apiClient.defaults.adapter) {
      adapterToUse = axios.defaults.adapter;
    }
    const defaultAdapterFn = axios.getAdapter(adapterToUse);
    
    // Clone config and delete adapter property to prevent recursive loop inside Axios getAdapter wrapper
    const cleanConfig = { ...config };
    delete cleanConfig.adapter;
    
    const pendingPromise = (async () => {
      try {
        const response = await defaultAdapterFn(cleanConfig);
        
        // Update the cache with the completed response
        apiCache.set(cacheKey, {
          timestamp: Date.now(),
          response,
          pendingPromise: null
        });
        
        return response;
      } catch (error) {
        // If the API call fails, remove from cache so we can try again
        apiCache.delete(cacheKey);
        throw error;
      }
    })();

    // Store the pending promise immediately to prevent concurrent duplicate calls
    apiCache.set(cacheKey, {
      timestamp: now,
      response: null,
      pendingPromise
    });

    return pendingPromise;
  }

  // If this is a mutating request (POST, PUT, PATCH, DELETE), automatically invalidate all caches to guarantee fresh data
  if (method !== 'get') {
    apiCache.clear();
  }

  // Fallback to standard request execution
  let adapterToUse = config.adapter;
  if (!adapterToUse || adapterToUse === apiClient.defaults.adapter) {
    adapterToUse = axios.defaults.adapter;
  }
  const defaultAdapterFn = axios.getAdapter(adapterToUse);
  
  const cleanConfig = { ...config };
  delete cleanConfig.adapter;
  return defaultAdapterFn(cleanConfig);
};


let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  (config) => {
    const method = String(config.method || 'get').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfToken = readCsrfToken();
      if (csrfToken) {
        if (config.headers.set) {
          config.headers.set('X-CSRF-Token', csrfToken);
        } else {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }
    }

    const token = getToken();
    if (token) {
      if (config.headers.set) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const statusCode = error.response?.status || 0;
    const method = String(originalRequest?.method || "get").toLowerCase();

    // Transient upstream/proxy issue (common on free-tier cold wakes): retry idempotent GET once.
    if (statusCode === 502 && method === "get" && !originalRequest?._gatewayRetry) {
      originalRequest._gatewayRetry = true;
      await new Promise((resolve) => setTimeout(resolve, 350));
      return apiClient(originalRequest);
    }

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/password/change') &&
      !originalRequest.url.includes('/auth/password/forgot')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
          
        })
          .then((token) => {
            if (token) {
              if (originalRequest.headers.set) {
                originalRequest.headers.set('Authorization', `Bearer ${token}`);
              } else {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return apiClient(originalRequest);
            }
            return Promise.reject(error);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!COOKIE_AUTH_ENABLED && !refreshToken) {
          throw new Error('No refresh token available');
        }

        const csrfToken = readCsrfToken();
        const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};
        // Always pass refreshToken in the request body as a fallback so that the backend can resolve it if cookies are blocked
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, {
          headers,
          withCredentials: true
        });

        const newToken = data.token;
        if (newToken) {
          // Always save fallback tokens in localStorage for mobile/cross-origin resilience
          setToken(newToken);
          if (data.refreshToken) {
            setRefreshToken(data.refreshToken);
          }
          apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          if (originalRequest.headers.set) {
            originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
          } else {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Only clear authentication and force logout if:
        // 1. The error is due to a missing refresh token.
        // 2. The server responded with a definitive authentication failure (4xx except 404/429).
        // For temporary network or server-side errors (5xx, timeouts), we keep the tokens.
        const status = refreshError.response?.status;
        const isAuthError = refreshError.message === 'No refresh token available' || 
                            (status >= 400 && status < 500 && status !== 404 && status !== 429);
        
        if (isAuthError) {
          clearAuth();
          window.dispatchEvent(new Event('ncc_logout'));
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const customError = {
      message: error.response?.data?.error || error.message || 'An unexpected error occurred',
      status: error.response?.status || 0,
      data: error.response?.data || null
    };

    return Promise.reject(customError);
  }
);

export default apiClient;
