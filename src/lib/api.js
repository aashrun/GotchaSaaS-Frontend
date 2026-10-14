import axios from 'axios';
const api = axios.create({
  baseURL: '/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
const pendingGets = new Map();
const get = api.get.bind(api);
api.get = (url, config = {}) => {
  if (
    config.signal ||
    config.cancelToken ||
    config.headers ||
    config.adapter ||
    config.withCredentials === false
  )
    return get(url, config);
  const key = api.getUri({ ...config, url }) + ':' + (config.responseType || 'json');
  if (pendingGets.has(key)) return pendingGets.get(key);
  const request = get(url, config).finally(() => {
    if (pendingGets.get(key) === request) pendingGets.delete(key);
  });
  pendingGets.set(key, request);
  return request;
};
let csrf = '';
export const setCsrf = (value) => {
  if (csrf !== (value || '')) pendingGets.clear();
  csrf = value || '';
};
api.interceptors.request.use((config) => {
  if (!['get', 'head', 'options'].includes(config.method)) pendingGets.clear();
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
