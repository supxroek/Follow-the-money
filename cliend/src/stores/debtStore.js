import { create } from "zustand";
import apiService from "../services/apiService";
import { logger } from "../utils/logger";

const useDebtStore = create((set, get) => ({
  // State
  debts: [],
  currentDebt: null,
  isLoading: false,
  error: null,
  summary: null,

  // Actions
  fetchDebts: async (groupId = null) => {
    set({ isLoading: true, error: null });

    try {
      // Mock data for development
      const mockDebts = [
        {
          _id: 'debt1',
          debtor: 'user2',
          creditor: 'user1',
          expense: 'expense1',
          group: groupId || 'group1',
          amount: 400,
          originalAmount: 400,
          currency: 'THB',
          isPaid: false,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days from now
          priority: 'medium',
          notes: 'Share of restaurant dinner'
        },
        {
          _id: 'debt2',
          debtor: 'user3',
          creditor: 'user1',
          expense: 'expense1',
          group: groupId || 'group1',
          amount: 400,
          originalAmount: 400,
          currency: 'THB',
          isPaid: false,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          priority: 'medium',
          notes: 'Share of restaurant dinner'
        }
      ];
      
      try {
        const options = groupId ? { groupId } : {};
        const debts = await apiService.getDebts(options);
        set({ debts: debts.data || debts, isLoading: false });
        return debts;
      } catch (apiError) {
        logger.warn('API call failed, using mock data:', apiError.message);
        set({ debts: mockDebts, isLoading: false });
        return mockDebts;
      }
    } catch (error) {
      logger.error("Failed to fetch debts:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchDebtById: async (debtId) => {
    set({ isLoading: true, error: null });

    try {
      const debt = await apiService.getDebtById(debtId);
      set({ currentDebt: debt, isLoading: false });
      return debt;
    } catch (error) {
      logger.error("Failed to fetch debt:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchDebtSummary: async (groupId) => {
    set({ isLoading: true, error: null });

    try {
      const summary = await apiService.getDebtSummary();
      set({ summary, isLoading: false });
      return summary;
    } catch (error) {
      logger.error("Failed to fetch debt summary:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  recordPayment: async (debtId, paymentData) => {
    set({ isLoading: true, error: null });

    try {
      const updatedDebt = await apiService.addPartialPayment(
        debtId,
        paymentData.amount,
        paymentData.note || ''
      );

      set((state) => ({
        debts: state.debts.map((d) => (d._id === debtId ? updatedDebt : d)),
        currentDebt:
          state.currentDebt?._id === debtId ? updatedDebt : state.currentDebt,
        isLoading: false,
      }));

      logger.info("Payment recorded successfully");
      return updatedDebt;
    } catch (error) {
      logger.error("Failed to record payment:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  settleDebt: async (debtId, settlementData) => {
    set({ isLoading: true, error: null });

    try {
      const settledDebt = await apiService.markDebtAsPaid(
        debtId,
        settlementData
      );

      set((state) => ({
        debts: state.debts.map((d) => (d._id === debtId ? settledDebt : d)),
        currentDebt:
          state.currentDebt?._id === debtId ? settledDebt : state.currentDebt,
        isLoading: false,
      }));

      logger.info("Debt settled successfully");
      return settledDebt;
    } catch (error) {
      logger.error("Failed to settle debt:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  optimizeDebts: async (groupId) => {
    set({ isLoading: true, error: null });

    try {
      const optimizedDebts = await apiService.optimizeGroupDebts(groupId);

      // Update debts with optimized data
      set((state) => ({
        debts: state.debts.map((debt) => {
          const optimized = optimizedDebts.find((od) => od._id === debt._id);
          return optimized || debt;
        }),
        isLoading: false,
      }));

      logger.info("Debts optimized successfully");
      return optimizedDebts;
    } catch (error) {
      logger.error("Failed to optimize debts:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  sendReminder: async (debtId, reminderData) => {
    set({ isLoading: true, error: null });

    try {
      await apiService.sendDebtReminder(debtId);

      set((state) => ({
        debts: state.debts.map((d) =>
          d._id === debtId
            ? { ...d, lastReminderSent: new Date().toISOString() }
            : d
        ),
        isLoading: false,
      }));

      logger.info("Reminder sent successfully");
    } catch (error) {
      logger.error("Failed to send reminder:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Helper methods
  setCurrentDebt: (debt) => set({ currentDebt: debt }),
  clearError: () => set({ error: null }),

  // Getters
  getDebtById: (debtId) => {
    const state = get();
    return state.debts.find((d) => d._id === debtId);
  },

  getCurrentDebt: () => get().currentDebt,
  getDebts: () => get().debts,
  getSummary: () => get().summary,

  getDebtsByGroup: (groupId) => {
    const state = get();
    return state.debts.filter((d) => d.group === groupId);
  },

  getDebtsByDebtor: (debtorId) => {
    const state = get();
    return state.debts.filter((d) => d.debtor === debtorId);
  },

  getDebtsByCreditor: (creditorId) => {
    const state = get();
    return state.debts.filter((d) => d.creditor === creditorId);
  },

  getUserDebts: (userId) => {
    const state = get();
    return state.debts.filter(
      (d) => d.debtor === userId || d.creditor === userId
    );
  },

  getPendingDebts: () => {
    const state = get();
    return state.debts.filter((d) => !d.isSettled && d.amount > 0);
  },

  getSettledDebts: () => {
    const state = get();
    return state.debts.filter((d) => d.isSettled);
  },

  getOverdueDebts: () => {
    const state = get();
    const now = new Date();
    return state.debts.filter((d) => {
      if (d.isSettled || !d.dueDate) return false;
      return new Date(d.dueDate) < now;
    });
  },

  // Statistics
  getTotalDebtAmount: (groupId = null) => {
    const state = get();
    const debts = groupId
      ? state.debts.filter((d) => d.group === groupId)
      : state.debts;

    return debts
      .filter((d) => !d.isSettled)
      .reduce((total, debt) => total + debt.amount, 0);
  },

  getUserOwedAmount: (userId, groupId = null) => {
    const state = get();
    const debts = groupId
      ? state.debts.filter((d) => d.group === groupId)
      : state.debts;

    return debts
      .filter((d) => d.creditor === userId && !d.isSettled)
      .reduce((total, debt) => total + debt.amount, 0);
  },

  getUserOwingAmount: (userId, groupId = null) => {
    const state = get();
    const debts = groupId
      ? state.debts.filter((d) => d.group === groupId)
      : state.debts;

    return debts
      .filter((d) => d.debtor === userId && !d.isSettled)
      .reduce((total, debt) => total + debt.amount, 0);
  },

  getUserNetBalance: (userId, groupId = null) => {
    const state = get();
    const owed = state.getUserOwedAmount(userId, groupId);
    const owing = state.getUserOwingAmount(userId, groupId);
    return owed - owing;
  },

  getGroupDebtSummary: (groupId) => {
    const state = get();
    const groupDebts = state.debts.filter(
      (d) => d.group === groupId && !d.isSettled
    );

    const summary = {
      totalAmount: 0,
      totalDebts: groupDebts.length,
      overdueDebts: 0,
      userBalances: {},
    };

    groupDebts.forEach((debt) => {
      summary.totalAmount += debt.amount;

      if (debt.dueDate && new Date(debt.dueDate) < new Date()) {
        summary.overdueDebts += 1;
      }

      // Update user balances
      if (!summary.userBalances[debt.creditor]) {
        summary.userBalances[debt.creditor] = { owed: 0, owing: 0 };
      }
      if (!summary.userBalances[debt.debtor]) {
        summary.userBalances[debt.debtor] = { owed: 0, owing: 0 };
      }

      summary.userBalances[debt.creditor].owed += debt.amount;
      summary.userBalances[debt.debtor].owing += debt.amount;
    });

    return summary;
  },
}));

export default useDebtStore;
