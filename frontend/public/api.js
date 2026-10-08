// API base now points to the same origin /api path.
// Nginx reverse-proxies /api/* to the backend container.
const API_BASE = window.location.origin + '/api';

const client = axios.create({ baseURL: API_BASE, withCredentials: true });

let csrfToken = localStorage.getItem('csrf_token') || null;

client.interceptors.request.use((config) => {
  if (csrfToken && ['post', 'put', 'delete'].includes(config.method)) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

function setCsrfToken(token) {
  csrfToken = token;
  if (token) localStorage.setItem('csrf_token', token);
  else localStorage.removeItem('csrf_token');
}

const Api = {
  checkSession: () => client.get('/auth/check.php').then(r => {
    if (r.data.data.csrf_token) setCsrfToken(r.data.data.csrf_token);
    return r.data.data;
  }),
  login: (username, password) => client.post('/auth/login.php', { username, password }).then(r => {
    setCsrfToken(r.data.data.csrf_token);
    return r.data.data;
  }),
  logout: () => client.post('/auth/logout.php').then(() => setCsrfToken(null)),

  dashboard: (displayCurrency, period, year) => client.get('/dashboard/stats.php', { params: { display_currency: displayCurrency, period, year } }).then(r => r.data.data),

  changePassword: (payload) => client.post('/auth/change_password.php', payload).then(r => r.data.data),
  clearData: (payload) => client.post('/settings/clear_data.php', payload).then(r => r.data.data),

  listIncome: (params) => client.get('/income/list.php', { params }).then(r => r.data.data),
  createIncome: (payload) => client.post('/income/create.php', payload).then(r => r.data.data),
  updateIncome: (payload) => client.put('/income/update.php', payload).then(r => r.data.data),
  deleteIncome: (id) => client.delete('/income/delete.php', { data: { id } }).then(r => r.data.data),

  listSources: (params) => client.get('/income_sources/list.php', { params }).then(r => r.data.data),
  createSource: (payload) => client.post('/income_sources/create.php', payload).then(r => r.data.data),
  updateSource: (payload) => client.put('/income_sources/update.php', payload).then(r => r.data.data),
  deleteSource: (id) => client.delete('/income_sources/delete.php', { data: { id } }).then(r => r.data.data),
  reorderSources: (order) => client.post('/income_sources/reorder.php', { order }).then(r => r.data.data),

  listNetWorth: (params) => client.get('/networth/list.php', { params }).then(r => r.data.data),
  saveNetWorth: (payload) => client.post('/networth/create.php', payload).then(r => r.data.data),
  deleteNetWorth: (id) => client.delete('/networth/delete.php', { data: { id } }).then(r => r.data.data),

  getSettings: () => client.get('/settings/get.php').then(r => r.data.data),
  updateSettings: (payload) => client.put('/settings/update.php', payload).then(r => r.data.data),

  getExchangeRates: () => client.get('/exchange_rates/get.php').then(r => r.data.data),
  refreshExchangeRates: () => client.post('/exchange_rates/update.php').then(r => r.data.data),

  listActivityLogs: (params) => client.get('/activity_logs/list.php', { params }).then(r => r.data.data),

  exportCsvUrl: (type, params) => {
    const qs = new URLSearchParams({ type, ...params }).toString();
    return `${API_BASE}/reports/export_csv.php?${qs}`;
  },
};
