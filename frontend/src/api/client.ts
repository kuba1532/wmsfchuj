import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const resolveQueue = (token: string | null) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jeśli nie mamy response albo nie 401 — normalnie zwracamy błąd
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Nie próbujemy refreshować login/refresh, żeby nie zrobić pętli
    const url: string = originalRequest?.url || '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Jeśli request już raz był retry — kończymy
    if (originalRequest && originalRequest._retry) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Kolejkowanie requestów gdy refresh już trwa
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((newToken) => {
          if (!newToken) return reject(error);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshResponse = await apiClient.post('/auth/refresh', {
        refresh_token: refreshToken,
      });
      const newAccess = refreshResponse.data?.access_token;
      const newRefresh = refreshResponse.data?.refresh_token;

      if (!newAccess || !newRefresh) {
        throw new Error('Invalid refresh response');
      }

      localStorage.setItem('accessToken', newAccess);
      localStorage.setItem('refreshToken', newRefresh);

      resolveQueue(newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(originalRequest);
    } catch (e) {
      resolveQueue(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
