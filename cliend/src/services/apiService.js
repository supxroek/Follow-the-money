import axios from 'axios';
import liffService from './liffService';
import { logger } from '../utils/logger';

class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    
    // Create axios instance
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup interceptors
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = liffService.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            await this.refreshToken();
            
            // Retry original request with new token
            const token = liffService.getStoredToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            liffService.clearStoredToken();
            logger.error('Token refresh failed:', refreshError);
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Refresh JWT token
  async refreshToken() {
    try {
      const response = await axios.post(`${this.baseURL}/auth/refresh`, {}, {
        withCredentials: true
      });

      if (response.data.success && response.data.data.token) {
        liffService.clearStoredToken();
        localStorage.setItem('token', response.data.data.token);
        return response.data.data.token;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  // Generic API call method
  async call(method, endpoint, data = null, config = {}) {
    try {
      const response = await this.api({
        method,
        url: endpoint,
        data,
        ...config
      });

      return response.data;
    } catch (error) {
      logger.error(`API call failed: ${method} ${endpoint}`, error);
      
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Network error occurred');
      }
    }
  }

  // Authentication endpoints
  async loginWithLine(authData) {
    return this.call('POST', '/auth/line', authData);
  }

  async logout() {
    const result = await this.call('POST', '/auth/logout');
    liffService.clearStoredToken();
    return result;
  }

  async getProfile() {
    return this.call('GET', '/auth/profile');
  }

  async updateProfile(profileData) {
    return this.call('PUT', '/auth/profile', profileData);
  }

  // User endpoints
  async getUsers(query = {}) {
    const params = new URLSearchParams(query).toString();
    return this.call('GET', `/users?${params}`);
  }

  async getUserById(userId) {
    return this.call('GET', `/users/${userId}`);
  }

  async searchUsers(searchTerm) {
    return this.call('GET', `/users/search?q=${encodeURIComponent(searchTerm)}`);
  }

  // Group endpoints
  async getGroups() {
    return this.call('GET', '/groups');
  }

  async getGroupById(groupId) {
    return this.call('GET', `/groups/${groupId}`);
  }

  async createGroup(groupData) {
    return this.call('POST', '/groups', groupData);
  }

  async updateGroup(groupId, groupData) {
    return this.call('PUT', `/groups/${groupId}`, groupData);
  }

  async deleteGroup(groupId) {
    return this.call('DELETE', `/groups/${groupId}`);
  }

  async joinGroup(groupId, inviteCode = null) {
    return this.call('POST', `/groups/${groupId}/join`, { inviteCode });
  }

  async leaveGroup(groupId) {
    return this.call('POST', `/groups/${groupId}/leave`);
  }

  async addGroupMember(groupId, userId, role = 'member') {
    return this.call('POST', `/groups/${groupId}/members`, { userId, role });
  }

  async removeGroupMember(groupId, userId) {
    return this.call('DELETE', `/groups/${groupId}/members/${userId}`);
  }

  async updateGroupMember(groupId, userId, updates) {
    return this.call('PUT', `/groups/${groupId}/members/${userId}`, updates);
  }

  async getGroupInviteCode(groupId) {
    return this.call('GET', `/groups/${groupId}/invite-code`);
  }

  async regenerateGroupInviteCode(groupId) {
    return this.call('POST', `/groups/${groupId}/invite-code/regenerate`);
  }

  // Expense endpoints
  async getExpenses(groupId, options = {}) {
    const params = new URLSearchParams(options).toString();
    return this.call('GET', `/expenses?groupId=${groupId}&${params}`);
  }

  async getExpenseById(expenseId) {
    return this.call('GET', `/expenses/${expenseId}`);
  }

  async createExpense(expenseData) {
    return this.call('POST', '/expenses', expenseData);
  }

  async updateExpense(expenseId, expenseData) {
    return this.call('PUT', `/expenses/${expenseId}`, expenseData);
  }

  async deleteExpense(expenseId) {
    return this.call('DELETE', `/expenses/${expenseId}`);
  }

  async addExpenseNote(expenseId, message) {
    return this.call('POST', `/expenses/${expenseId}/notes`, { message });
  }

  async uploadReceipt(expenseId, file) {
    const formData = new FormData();
    formData.append('receipt', file);
    
    return this.call('POST', `/expenses/${expenseId}/receipt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // Debt endpoints
  async getDebts(options = {}) {
    const params = new URLSearchParams(options).toString();
    return this.call('GET', `/debts?${params}`);
  }

  async getDebtById(debtId) {
    return this.call('GET', `/debts/${debtId}`);
  }

  async markDebtAsPaid(debtId, paymentData) {
    return this.call('POST', `/debts/${debtId}/pay`, paymentData);
  }

  async addPartialPayment(debtId, amount, note = '') {
    return this.call('POST', `/debts/${debtId}/partial-payment`, { amount, note });
  }

  async getDebtSummary() {
    return this.call('GET', '/debts/summary');
  }

  async optimizeGroupDebts(groupId) {
    return this.call('POST', `/debts/optimize/${groupId}`);
  }

  async sendDebtReminder(debtId) {
    return this.call('POST', `/debts/${debtId}/remind`);
  }

  // Analytics endpoints
  async getExpenseAnalytics(groupId, period = 'month') {
    return this.call('GET', `/analytics/expenses/${groupId}?period=${period}`);
  }

  async getUserExpenseStats(period = 'month') {
    return this.call('GET', `/analytics/user/expenses?period=${period}`);
  }

  async getGroupExpenseReport(groupId, startDate, endDate) {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }).toString();
    
    return this.call('GET', `/analytics/groups/${groupId}/report?${params}`);
  }

  // Export endpoints
  async exportGroupExpenses(groupId, format = 'csv', options = {}) {
    const params = new URLSearchParams({ format, ...options }).toString();
    
    const response = await this.api({
      method: 'GET',
      url: `/export/groups/${groupId}/expenses?${params}`,
      responseType: 'blob'
    });

    return response.data;
  }

  // Notification endpoints
  async getNotifications() {
    return this.call('GET', '/notifications');
  }

  async markNotificationAsRead(notificationId) {
    return this.call('PUT', `/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.call('PUT', '/notifications/read-all');
  }

  async updateNotificationSettings(settings) {
    return this.call('PUT', '/notifications/settings', settings);
  }

  // Health check
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL.replace('/api', '')}/health`);
      return response.data;
    } catch (error) {
      logger.error('Health check failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;