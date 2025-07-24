import { create } from "zustand";
import { persist } from "zustand/middleware";
import liffService from "../services/liffService";
import apiService from "../services/apiService";
import { logger } from "../utils/logger";

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      liffProfile: null,
      token: null,

      // Actions
      initialize: async () => {
        set({ isLoading: true });

        try {
          // Initialize LIFF
          await liffService.init();

          if (liffService.isLoggedIn()) {
            const profile = await liffService.getProfile();
            const token = liffService.getAccessToken();

            // Get user data from backend (in development, create mock data)
            let userData;
            try {
              userData = await apiService.getProfile();
            } catch (error) {
              // Fallback to mock data if API call fails
              userData = {
                id: profile.userId || 'dev-user-1',
                displayName: profile.displayName || 'Development User',
                lineUserId: profile.userId || 'dev-line-user-1',
                email: 'dev@example.com',
                pictureUrl: profile.pictureUrl || null
              };
            }

            set({
              user: userData,
              liffProfile: profile,
              token: token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Development mode fallback
            if (
              !liffService.liffId ||
              liffService.liffId === "your_liff_id_here"
            ) {
              logger.info("Development mode: Using mock authentication");

              const mockUser = {
                id: "dev-user-1",
                name: "Development User",
                lineUserId: "dev-line-user-1",
                email: "dev@example.com",
                pictureUrl: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              const mockProfile = {
                userId: "dev-line-user-1",
                displayName: "Development User",
                pictureUrl: null,
                statusMessage: null,
              };

              set({
                user: mockUser,
                liffProfile: mockProfile,
                token: "dev-token-123",
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              set({ isLoading: false });
            }
          }
        } catch (error) {
          logger.error("Failed to initialize auth:", error);

          // In development mode, still provide fallback
          if (
            !liffService.liffId ||
            liffService.liffId === "your_liff_id_here"
          ) {
            logger.info("Development mode fallback after error");

            const mockUser = {
              id: "dev-user-1",
              name: "Development User",
              lineUserId: "dev-line-user-1",
              email: "dev@example.com",
              pictureUrl: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const mockProfile = {
              userId: "dev-line-user-1",
              displayName: "Development User",
              pictureUrl: null,
              statusMessage: null,
            };

            set({
              user: mockUser,
              liffProfile: mockProfile,
              token: "dev-token-123",
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        }
      },

      login: async () => {
        try {
          // Ensure LIFF is initialized first
          if (!liffService.isInitialized) {
            await liffService.init();
          }

          if (!liffService.isLoggedIn()) {
            liffService.login();
            return;
          }

          const profile = await liffService.getProfile();
          const token = liffService.getAccessToken();

          // Login/register with backend
          let userData;
          try {
            userData = await apiService.loginWithLine({
              lineUserId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
            });
          } catch (error) {
            // Fallback to mock data for development
            userData = {
              id: profile.userId || 'dev-user-1',
              displayName: profile.displayName || 'Development User',
              lineUserId: profile.userId || 'dev-line-user-1',
              email: 'dev@example.com',
              pictureUrl: profile.pictureUrl || null
            };
          }

          set({
            user: userData,
            liffProfile: profile,
            token: token,
            isAuthenticated: true,
          });

          logger.info("User logged in successfully");
        } catch (error) {
          logger.error("Login failed:", error);
          throw error;
        }
      },

      logout: async () => {
        try {
          if (liffService.isLoggedIn()) {
            liffService.logout();
          }

          // Clear stored token
          liffService.clearStoredToken();

          set({
            user: null,
            liffProfile: null,
            token: null,
            isAuthenticated: false,
          });

          logger.info("User logged out successfully");
        } catch (error) {
          logger.error("Logout failed:", error);
          throw error;
        }
      },

      updateProfile: async (profileData) => {
        try {
          const updatedUser = await apiService.updateProfile(profileData);

          set((state) => ({
            user: { ...state.user, ...updatedUser },
          }));

          logger.info("Profile updated successfully");
          return updatedUser;
        } catch (error) {
          logger.error("Profile update failed:", error);
          throw error;
        }
      },

      refreshToken: async () => {
        try {
          if (liffService.isLoggedIn()) {
            const token = liffService.getAccessToken();
            set({ token });
            return token;
          }
          return null;
        } catch (error) {
          logger.error('Token refresh failed:', error);
          throw error;
        }
      },

      // Helper methods
      isLiffReady: () => liffService.isReady(),
      getLiffProfile: () => get().liffProfile,
      getUser: () => get().user,
      isUserAuthenticated: () => get().isAuthenticated,
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    }
  )
);

export default useAuthStore;
