import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ttm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (payload) => api.post('/auth/login', payload).then((res) => res.data),
  signup: (payload) => api.post('/auth/signup', payload).then((res) => res.data),
  me: () => api.get('/users/me').then((res) => res.data),
  users: () => api.get('/users').then((res) => res.data),
};

export const projectApi = {
  list: () => api.get('/projects').then((res) => res.data),
  get: (id) => api.get(`/projects/${id}`).then((res) => res.data),
  create: (payload) => api.post('/projects', payload).then((res) => res.data),
  update: (id, payload) => api.put(`/projects/${id}`, payload).then((res) => res.data),
  remove: (id) => api.delete(`/projects/${id}`),
  addMember: (projectId, userId) => api.post(`/projects/${projectId}/members/${userId}`).then((res) => res.data),
};

export const taskApi = {
  list: () => api.get('/tasks').then((res) => res.data),
  create: (payload) => api.post('/tasks', payload).then((res) => res.data),
  update: (id, payload) => api.put(`/tasks/${id}`, payload).then((res) => res.data),
  remove: (id) => api.delete(`/tasks/${id}`),
};

export const dashboardApi = {
  get: () => api.get('/dashboard').then((res) => res.data),
};

export const taskingApi = {
  projects: () => api.get('/tasking/projects').then((res) => res.data),
  addProject: (payload) => api.post('/tasking/admin/projects', payload).then((res) => res.data),
  today: () => api.get('/tasking/today').then((res) => res.data),
  history: (date) => api.get('/tasking/history', { params: { date } }).then((res) => res.data),
  saveVisibleProjects: (projectNames) => api.post('/tasking/visible-projects', { projectNames }).then((res) => res.data),
  requestMissingProject: (payload) => api.post('/tasking/missing-project-requests', payload).then((res) => res.data),
  missingProjectRequests: () => api.get('/tasking/missing-project-requests').then((res) => res.data),
  productivityFlags: () => api.get('/tasking/admin/productivity-flags').then((res) => res.data),
  taskerReports: (date) => api.get('/tasking/admin/tasker-reports', { params: { date } }).then((res) => res.data),
  taskerHistory: (userId) => api.get(`/tasking/admin/users/${userId}/history`).then((res) => res.data),
  sendFeedback: (userId, payload) => api.post(`/tasking/admin/users/${userId}/feedback`, payload).then((res) => res.data),
  feedback: () => api.get('/tasking/feedback').then((res) => res.data),
  requestLeave: (payload) => api.post('/tasking/leave-requests', payload).then((res) => res.data),
  leaveRequests: () => api.get('/tasking/leave-requests').then((res) => res.data),
  updateLeaveStatus: (leaveId, status) => api.post(`/tasking/admin/leave-requests/${leaveId}/status`, { status }).then((res) => res.data),
  allowRepunch: (userId) => api.post(`/tasking/admin/users/${userId}/allow-repunch`).then((res) => res.data),
  punchIn: () => api.post('/tasking/punch-in').then((res) => res.data),
  punchOut: () => api.post('/tasking/punch-out').then((res) => res.data),
  start: (payload) => api.post('/tasking/start', payload).then((res) => res.data),
  submit: (id, payload) => api.post(`/tasking/${id}/submit`, payload).then((res) => res.data),
};
