import axios from 'axios';
const api = axios.create({
  baseURL: '/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
let csrf = '';
export const setCsrf = (value) => {
  csrf = value || '';
};
api.interceptors.request.use((config) => {
  if (csrf) config.headers['x-csrf-token'] = csrf;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (e) => {
    e.message = e.response?.data?.error?.message || e.message;
    return Promise.reject(e);
  },
);
export default api;
