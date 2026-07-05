import axios from 'axios';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    return `http://${hostname}:5001/api/`;
  }
  return 'http://localhost:5001/api/';
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || getBaseURL(),
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Avoid redirect loops if already on login or register or recovery pages
      const skipRedirectPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      
      const shouldSkip = skipRedirectPaths.some(path => currentPath.startsWith(path));

      if (typeof window !== 'undefined' && !shouldSkip) {
        console.warn('[API] Auth token invalid or expired. Redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
