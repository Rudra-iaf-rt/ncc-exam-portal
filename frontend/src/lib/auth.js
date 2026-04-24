export function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn(e)
    return null;
  }
}

export function getToken() {
  return localStorage.getItem('ncc_token');
}

export function setToken(token) {
  localStorage.setItem('ncc_token', token);
}

export function clearAuth() {
  localStorage.removeItem('ncc_token');
  localStorage.removeItem('ncc_user');
}

export function logout() {
  clearAuth();
  window.dispatchEvent(new Event('ncc_logout'));
}

export function getSavedUser() {
  const user = localStorage.getItem('ncc_user');
  return user ? JSON.parse(user) : null;
}

export function saveUser(user) {
  localStorage.setItem('ncc_user', JSON.stringify(user));
}
