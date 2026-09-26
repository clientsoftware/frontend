import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-nvo1.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Unwrap { success, data, message } → data (keep blobs intact)
    if (
      response.config.responseType !== 'blob' &&
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      if (token !== 'demo-token') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    // Prefer API message from { success:false, message }
    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard'),
  getRecentTransactions: () => api.get('/dashboard/transactions'),
  getLowStock: () => api.get('/dashboard/low-stock'),
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  adjustStock: (id, data) => api.post(`/products/${id}/adjust-stock`, data),
};

export const salesAPI = {
  create: (data) => api.post('/sales', data),
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  getInvoice: (id) => api.get(`/sales/${id}/invoice`, { responseType: 'blob' }),
};

export const scrapAPI = {
  createSale: (data) => api.post('/scrap-sales', data),
  getSales: (params) => api.get('/scrap-sales', { params }),
  getTodayTotal: () => api.get('/scrap-sales/today'),
};

export const exchangeAPI = {
  create: (data) => api.post('/exchange', data),
  getAll: (params) => api.get('/exchange', { params }),
  getById: (id) => api.get(`/exchange/${id}`),
};

export const ratesAPI = {
  getToday: () => api.get('/rates/today'),
  update: (data) => api.put('/rates', data),
  getHistory: (params) => api.get('/rates/history', { params }),
};

export const dispatchAPI = {
  create: (data) => api.post('/dispatch', data),
  update: (id, data) => api.put(`/dispatch/${id}`, data),
  getAll: (params) => api.get('/dispatch', { params }),
  getById: (id) => api.get(`/dispatch/${id}`),
};

export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getLedger: (id, params) => api.get(`/customers/${id}/ledger`, { params }),
  receivePayment: (id, data) => api.post(`/customers/${id}/payments`, data),
  getDues: (params) => api.get('/notifications/pending-payments', { params }),
  creditCheck: (id, params) => api.get(`/customers/${id}/credit-check`, { params }),
};

export const returnsAPI = {
  create: (data) => api.post('/returns', data),
  getAll: (params) => api.get('/returns', { params }),
  searchInvoice: (query) => api.get('/returns/search-invoice', { params: { q: query } }),
};

export const reportsAPI = {
  get: (type, params) => api.get(`/reports/${type}`, { params }),
  export: (type, params) =>
    api.get(`/reports/${type}/export`, { params, responseType: 'blob' }),
  getGroups: () => api.get('/reports/groups'),
  createGroup: (data) => api.post('/reports/groups', data),
};

export const settingsAPI = {
  getBusiness: () => api.get('/settings/business'),
  updateBusiness: (data) => api.put('/settings/business', data),
  getInvoiceTemplate: () => api.get('/settings/invoice-template'),
  updateInvoiceTemplate: (data) => api.put('/settings/invoice-template', data),
  getUnits: () => api.get('/settings/units'),
  createUnit: (data) => api.post('/settings/units', data),
  deleteUnit: (id) => api.delete(`/settings/units/${id}`),
  getCategories: () => api.get('/settings/categories'),
  createCategory: (data) => api.post('/settings/categories', data),
  deleteCategory: (id) => api.delete(`/settings/categories/${id}`),
  getUsers: () => api.get('/settings/users'),
  createUser: (data) => api.post('/settings/users', data),
  updateUser: (id, data) => api.put(`/settings/users/${id}`, data),
  deleteUser: (id) => api.delete(`/settings/users/${id}`),
};
