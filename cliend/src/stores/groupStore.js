import { create } from "zustand";
import apiService from "../services/apiService";
import { logger } from "../utils/logger";

const useGroupStore = create((set, get) => ({
  // State
  groups: [],
  currentGroup: null,
  isLoading: false,
  error: null,

  // Actions
  fetchGroups: async () => {
    set({ isLoading: true, error: null });

    try {
      // For development, return mock data
      const mockGroups = [
        {
          _id: 'group1', 
          name: 'Friends Group',
          description: 'Our friend group expenses',
          groupType: 'friends',
          currency: 'THB',
          members: [
            { user: { _id: 'user1', displayName: 'John' }, role: 'admin' },
            { user: { _id: 'user2', displayName: 'Jane' }, role: 'member' }
          ],
          stats: { totalExpenses: 5, totalAmount: 2500, activeDebts: 2 },
          createdAt: new Date().toISOString()
        }
      ];
      
      try {
        const groups = await apiService.getGroups();
        set({ groups: groups.data || groups, isLoading: false });
        return groups;
      } catch (apiError) {
        logger.warn('API call failed, using mock data:', apiError.message);
        set({ groups: mockGroups, isLoading: false });
        return mockGroups;
      }
    } catch (error) {
      logger.error("Failed to fetch groups:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchGroupById: async (groupId) => {
    set({ isLoading: true, error: null });

    try {
      const group = await apiService.getGroupById(groupId);
      set({ currentGroup: group, isLoading: false });
      return group;
    } catch (error) {
      logger.error("Failed to fetch group:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createGroup: async (groupData) => {
    set({ isLoading: true, error: null });

    try {
      const newGroup = await apiService.createGroup(groupData);

      set((state) => ({
        groups: [...state.groups, newGroup],
        isLoading: false,
      }));

      logger.info("Group created successfully");
      return newGroup;
    } catch (error) {
      logger.error("Failed to create group:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateGroup: async (groupId, updateData) => {
    set({ isLoading: true, error: null });

    try {
      const updatedGroup = await apiService.updateGroup(
        groupId,
        updateData
      );

      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? updatedGroup : g)),
        currentGroup:
          state.currentGroup?._id === groupId
            ? updatedGroup
            : state.currentGroup,
        isLoading: false,
      }));

      logger.info("Group updated successfully");
      return updatedGroup;
    } catch (error) {
      logger.error("Failed to update group:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteGroup: async (groupId) => {
    set({ isLoading: true, error: null });

    try {
      await apiService.deleteGroup(groupId);

      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        currentGroup:
          state.currentGroup?._id === groupId ? null : state.currentGroup,
        isLoading: false,
      }));

      logger.info("Group deleted successfully");
    } catch (error) {
      logger.error("Failed to delete group:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  joinGroup: async (inviteCode) => {
    set({ isLoading: true, error: null });

    try {
      const group = await apiService.joinGroup(null, inviteCode);

      set((state) => ({
        groups: [...state.groups, group],
        isLoading: false,
      }));

      logger.info("Joined group successfully");
      return group;
    } catch (error) {
      logger.error("Failed to join group:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  leaveGroup: async (groupId) => {
    set({ isLoading: true, error: null });

    try {
      await apiService.leaveGroup(groupId);

      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        currentGroup:
          state.currentGroup?._id === groupId ? null : state.currentGroup,
        isLoading: false,
      }));

      logger.info("Left group successfully");
    } catch (error) {
      logger.error("Failed to leave group:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  addMember: async (groupId, memberData) => {
    set({ isLoading: true, error: null });

    try {
      const updatedGroup = await apiService.addGroupMember(
        groupId,
        memberData.userId,
        memberData.role
      );

      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? updatedGroup : g)),
        currentGroup:
          state.currentGroup?._id === groupId
            ? updatedGroup
            : state.currentGroup,
        isLoading: false,
      }));

      logger.info("Member added successfully");
      return updatedGroup;
    } catch (error) {
      logger.error("Failed to add member:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  removeMember: async (groupId, memberId) => {
    set({ isLoading: true, error: null });

    try {
      const updatedGroup = await apiService.removeGroupMember(
        groupId,
        memberId
      );

      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? updatedGroup : g)),
        currentGroup:
          state.currentGroup?._id === groupId
            ? updatedGroup
            : state.currentGroup,
        isLoading: false,
      }));

      logger.info("Member removed successfully");
      return updatedGroup;
    } catch (error) {
      logger.error("Failed to remove member:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateMemberRole: async (groupId, memberId, role) => {
    set({ isLoading: true, error: null });

    try {
      const updatedGroup = await apiService.updateGroupMember(
        groupId,
        memberId,
        { role }
      );

      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? updatedGroup : g)),
        currentGroup:
          state.currentGroup?._id === groupId
            ? updatedGroup
            : state.currentGroup,
        isLoading: false,
      }));

      logger.info("Member role updated successfully");
      return updatedGroup;
    } catch (error) {
      logger.error("Failed to update member role:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateInviteCode: async (groupId) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiService.regenerateGroupInviteCode(groupId);

      set((state) => ({
        groups: state.groups.map((g) =>
          g._id === groupId ? { ...g, inviteCode: response.inviteCode } : g
        ),
        currentGroup:
          state.currentGroup?._id === groupId
            ? { ...state.currentGroup, inviteCode: response.inviteCode }
            : state.currentGroup,
        isLoading: false,
      }));

      logger.info("Invite code generated successfully");
      return response.inviteCode;
    } catch (error) {
      logger.error("Failed to generate invite code:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Helper methods
  setCurrentGroup: (group) => set({ currentGroup: group }),
  clearError: () => set({ error: null }),

  // Getters
  getGroupById: (groupId) => {
    const state = get();
    return state.groups.find((g) => g._id === groupId);
  },

  getCurrentGroup: () => get().currentGroup,
  getGroups: () => get().groups,
  isGroupAdmin: (groupId, userId) => {
    const group = get().getGroupById(groupId);
    if (!group) return false;

    const member = group.members.find((m) => m.user._id === userId);
    return member?.role === "admin";
  },
}));

export default useGroupStore;
