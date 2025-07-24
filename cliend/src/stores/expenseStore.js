import { create } from "zustand";
import apiService from "../services/apiService";
import { logger } from "../utils/logger";

const useExpenseStore = create((set, get) => ({
  // State
  expenses: [],
  currentExpense: null,
  isLoading: false,
  error: null,
  filters: {
    groupId: null,
    startDate: null,
    endDate: null,
    category: null,
    paidBy: null,
  },

  // Actions
  fetchExpenses: async (groupId, filters = {}) => {
    set({ isLoading: true, error: null });

    try {
      // Mock data for development
      const mockExpenses = [
        {
          _id: 'expense1',
          title: 'Restaurant Dinner',
          description: 'Birthday celebration dinner',
          amount: 1200,
          currency: 'THB',
          category: 'food',
          paidBy: 'user1',
          group: groupId || 'group1',
          date: new Date().toISOString(),
          isSettled: false,
          splits: [
            { user: 'user1', amount: 400, isPaid: true },
            { user: 'user2', amount: 400, isPaid: false },
            { user: 'user3', amount: 400, isPaid: false }
          ]
        },
        {
          _id: 'expense2',
          title: 'Movie Tickets',
          description: 'Group movie night',
          amount: 800,
          currency: 'THB',
          category: 'entertainment',
          paidBy: 'user2',
          group: groupId || 'group1',
          date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          isSettled: true,
          splits: [
            { user: 'user1', amount: 400, isPaid: true },
            { user: 'user2', amount: 400, isPaid: true }
          ]
        }
      ];
      
      try {
        const expenses = await apiService.getExpenses(groupId, filters);
        set({ expenses: expenses.data || expenses, isLoading: false });
        return expenses;
      } catch (apiError) {
        logger.warn('API call failed, using mock data:', apiError.message);
        set({ expenses: mockExpenses, isLoading: false });
        return mockExpenses;
      }
    } catch (error) {
      logger.error("Failed to fetch expenses:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchExpenseById: async (expenseId) => {
    set({ isLoading: true, error: null });

    try {
      const expense = await apiService.getExpenseById(expenseId);
      set({ currentExpense: expense, isLoading: false });
      return expense;
    } catch (error) {
      logger.error("Failed to fetch expense:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createExpense: async (expenseData) => {
    set({ isLoading: true, error: null });

    try {
      const newExpense = await apiService.createExpense(expenseData);

      set((state) => ({
        expenses: [newExpense, ...state.expenses],
        isLoading: false,
      }));

      logger.info("Expense created successfully");
      return newExpense;
    } catch (error) {
      logger.error("Failed to create expense:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateExpense: async (expenseId, updateData) => {
    set({ isLoading: true, error: null });

    try {
      const updatedExpense = await apiService.updateExpense(
        expenseId,
        updateData
      );

      set((state) => ({
        expenses: state.expenses.map((e) =>
          e._id === expenseId ? updatedExpense : e
        ),
        currentExpense:
          state.currentExpense?._id === expenseId
            ? updatedExpense
            : state.currentExpense,
        isLoading: false,
      }));

      logger.info("Expense updated successfully");
      return updatedExpense;
    } catch (error) {
      logger.error("Failed to update expense:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteExpense: async (expenseId) => {
    set({ isLoading: true, error: null });

    try {
      await apiService.deleteExpense(expenseId);

      set((state) => ({
        expenses: state.expenses.filter((e) => e._id !== expenseId),
        currentExpense:
          state.currentExpense?._id === expenseId ? null : state.currentExpense,
        isLoading: false,
      }));

      logger.info("Expense deleted successfully");
    } catch (error) {
      logger.error("Failed to delete expense:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  uploadReceipt: async (expenseId, receiptFile) => {
    set({ isLoading: true, error: null });

    try {
      const formData = new FormData();
      formData.append("receipt", receiptFile);

      const updatedExpense = await apiService.uploadReceipt(
        expenseId,
        receiptFile
      );

      set((state) => ({
        expenses: state.expenses.map((e) =>
          e._id === expenseId ? updatedExpense : e
        ),
        currentExpense:
          state.currentExpense?._id === expenseId
            ? updatedExpense
            : state.currentExpense,
        isLoading: false,
      }));

      logger.info("Receipt uploaded successfully");
      return updatedExpense;
    } catch (error) {
      logger.error("Failed to upload receipt:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  settleExpense: async (expenseId, settlementData) => {
    set({ isLoading: true, error: null });

    try {
      // Settle expense - this would typically mark all splits as paid
      const updatedExpense = await apiService.updateExpense(expenseId, {
        isSettled: true,
        settledAt: new Date().toISOString()
      });

      set((state) => ({
        expenses: state.expenses.map((e) =>
          e._id === expenseId ? updatedExpense : e
        ),
        currentExpense:
          state.currentExpense?._id === expenseId
            ? updatedExpense
            : state.currentExpense,
        isLoading: false,
      }));

      logger.info("Expense settled successfully");
      return updatedExpense;
    } catch (error) {
      logger.error("Failed to settle expense:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Filter methods
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        groupId: null,
        startDate: null,
        endDate: null,
        category: null,
        paidBy: null,
      },
    });
  },

  applyFilters: async () => {
    const { filters } = get();
    if (filters.groupId) {
      await get().fetchExpenses(filters.groupId, filters);
    }
  },

  // Helper methods
  setCurrentExpense: (expense) => set({ currentExpense: expense }),
  clearError: () => set({ error: null }),

  // Getters
  getExpenseById: (expenseId) => {
    const state = get();
    return state.expenses.find((e) => e._id === expenseId);
  },

  getCurrentExpense: () => get().currentExpense,
  getExpenses: () => get().expenses,

  getExpensesByGroup: (groupId) => {
    const state = get();
    return state.expenses.filter((e) => e.group === groupId);
  },

  getExpensesByCategory: (category) => {
    const state = get();
    return state.expenses.filter((e) => e.category === category);
  },

  getExpensesByDateRange: (startDate, endDate) => {
    const state = get();
    return state.expenses.filter((e) => {
      const expenseDate = new Date(e.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return expenseDate >= start && expenseDate <= end;
    });
  },

  getUserExpenses: (userId) => {
    const state = get();
    return state.expenses.filter((e) => e.paidBy === userId);
  },

  getPendingExpenses: () => {
    const state = get();
    return state.expenses.filter((e) => !e.isSettled);
  },

  getSettledExpenses: () => {
    const state = get();
    return state.expenses.filter((e) => e.isSettled);
  },

  // Statistics
  getTotalExpenseAmount: (groupId = null) => {
    const state = get();
    const expenses = groupId
      ? state.expenses.filter((e) => e.group === groupId)
      : state.expenses;

    return expenses.reduce((total, expense) => total + expense.amount, 0);
  },

  getCategoryTotals: (groupId = null) => {
    const state = get();
    const expenses = groupId
      ? state.expenses.filter((e) => e.group === groupId)
      : state.expenses;

    return expenses.reduce((totals, expense) => {
      totals[expense.category] =
        (totals[expense.category] || 0) + expense.amount;
      return totals;
    }, {});
  },

  getUserBalance: (userId, groupId = null) => {
    const state = get();
    const expenses = groupId
      ? state.expenses.filter((e) => e.group === groupId)
      : state.expenses;

    let paid = 0;
    let owes = 0;

    expenses.forEach((expense) => {
      if (expense.paidBy === userId) {
        paid += expense.amount;
      }

      const userSplit = expense.splits.find((s) => s.user === userId);
      if (userSplit) {
        owes += userSplit.amount;
      }
    });

    return paid - owes;
  },
}));

export default useExpenseStore;
