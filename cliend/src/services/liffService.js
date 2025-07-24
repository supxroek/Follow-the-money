import liff from "@line/liff";
import { logger } from "../utils/logger";

class LiffService {
  constructor() {
    this.isInitialized = false;
    this.liffId = import.meta.env.VITE_LIFF_ID;
    this.apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
  }

  // Initialize LIFF
  async init() {
    try {
      if (!this.liffId || this.liffId === "your_liff_id_here") {
        logger.warn(
          "LIFF ID is not configured. Running in development mode without LIFF."
        );
        this.isInitialized = true; // Set as initialized for development
        return true;
      }

      await liff.init({ liffId: this.liffId });
      this.isInitialized = true;

      logger.info("LIFF initialized successfully");
      return true;
    } catch (error) {
      logger.error("LIFF initialization failed:", error);
      throw error;
    }
  }

  // Check if LIFF is initialized
  checkInitialized() {
    if (!this.isInitialized) {
      throw new Error("LIFF is not initialized. Call init() first.");
    }
  }

  // Check if user is logged in to LINE
  isLoggedIn() {
    this.checkInitialized();

    // In development mode without real LIFF ID, return false
    if (!this.liffId || this.liffId === "your_liff_id_here") {
      return false;
    }

    return liff.isLoggedIn();
  }

  // Get LINE login status
  getLoginStatus() {
    this.checkInitialized();
    return {
      isLoggedIn: liff.isLoggedIn(),
      isInClient: liff.isInClient(),
      isExternalBrowser: !liff.isInClient(),
      context: liff.getContext(),
    };
  }

  // Login to LINE
  async login() {
    this.checkInitialized();

    // In development mode without real LIFF ID, show alert
    if (!this.liffId || this.liffId === "your_liff_id_here") {
      alert(
        "Development Mode: LINE LIFF ID is not configured. Please configure VITE_LIFF_ID in your .env file to use LINE login."
      );
      throw new Error("LIFF ID not configured for LINE login");
    }

    if (this.isLoggedIn()) {
      return this.getAccessToken();
    }

    try {
      await liff.login({
        redirectUri: window.location.href,
      });
    } catch (error) {
      logger.error("LINE login failed:", error);
      throw error;
    }
  }

  // Logout from LINE
  logout() {
    this.checkInitialized();
    liff.logout();
  }

  // Get access token
  getAccessToken() {
    this.checkInitialized();

    if (!this.isLoggedIn()) {
      throw new Error("User is not logged in");
    }

    return liff.getAccessToken();
  }

  // Get ID token
  getIDToken() {
    this.checkInitialized();

    if (!this.isLoggedIn()) {
      throw new Error("User is not logged in");
    }

    return liff.getIDToken();
  }

  // Get user profile
  async getProfile() {
    this.checkInitialized();

    if (!this.isLoggedIn()) {
      throw new Error("User is not logged in");
    }

    try {
      const profile = await liff.getProfile();
      return profile;
    } catch (error) {
      logger.error("Failed to get LINE profile:", error);
      throw error;
    }
  }

  // Get friend status
  async getFriendship() {
    this.checkInitialized();

    try {
      const friendship = await liff.getFriendship();
      return friendship;
    } catch (error) {
      logger.warn("Failed to get friendship status:", error);
      return { friendFlag: false };
    }
  }

  // Close LIFF app
  closeWindow() {
    this.checkInitialized();

    if (liff.isInClient()) {
      liff.closeWindow();
    } else {
      window.close();
    }
  }

  // Open external URL
  openExternalWindow(url) {
    this.checkInitialized();
    liff.openWindow({
      url: url,
      external: true,
    });
  }

  // Share target picker (share to LINE friends/groups)
  async shareTargetPicker(messages) {
    this.checkInitialized();

    try {
      if (liff.isApiAvailable("shareTargetPicker")) {
        await liff.shareTargetPicker(messages);
        return true;
      } else {
        logger.warn("shareTargetPicker is not available");
        return false;
      }
    } catch (error) {
      logger.error("Share target picker failed:", error);
      throw error;
    }
  }

  // Send messages to current chat
  async sendMessages(messages) {
    this.checkInitialized();

    try {
      if (liff.isInClient()) {
        await liff.sendMessages(messages);
        return true;
      } else {
        logger.warn("sendMessages is only available in LINE client");
        return false;
      }
    } catch (error) {
      logger.error("Send messages failed:", error);
      throw error;
    }
  }

  // Get device info
  getContext() {
    this.checkInitialized();
    return liff.getContext();
  }

  // Get OS info
  getOS() {
    this.checkInitialized();
    return liff.getOS();
  }

  // Get language
  getLanguage() {
    this.checkInitialized();
    return liff.getLanguage();
  }

  // Get version
  getVersion() {
    this.checkInitialized();
    return liff.getVersion();
  }

  // Get line version
  getLineVersion() {
    this.checkInitialized();
    return liff.getLineVersion();
  }

  // Check if running in LINE client
  isInClient() {
    this.checkInitialized();
    return liff.isInClient();
  }

  // Check if API is available
  isApiAvailable(apiName) {
    this.checkInitialized();
    return liff.isApiAvailable(apiName);
  }

  // Get available APIs
  getAvailableApis() {
    this.checkInitialized();

    const apis = [
      "shareTargetPicker",
      "multipleLiffTransition",
      "subwindow",
      "scanCode",
      "bluetooth",
      "permission.query",
    ];

    return apis.reduce((available, api) => {
      available[api] = this.isApiAvailable(api);
      return available;
    }, {});
  }

  // Authenticate with backend using LIFF tokens
  async authenticateWithBackend() {
    try {
      if (!this.isLoggedIn()) {
        await this.login();
      }

      const accessToken = this.getAccessToken();
      const idToken = this.getIDToken();

      const response = await fetch(`${this.apiBaseUrl}/auth/line`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken,
          idToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data.token) {
        // Store JWT token for API calls
        localStorage.setItem("token", data.data.token);
        return data.data;
      } else {
        throw new Error("Invalid response from authentication endpoint");
      }
    } catch (error) {
      logger.error("Backend authentication failed:", error);
      throw error;
    }
  }

  // Get stored JWT token
  getStoredToken() {
    return localStorage.getItem("token");
  }

  // Clear stored token
  clearStoredToken() {
    localStorage.removeItem("token");
  }

  // Check if user is authenticated with backend
  isAuthenticatedWithBackend() {
    const token = this.getStoredToken();
    if (!token) return false;

    try {
      // Basic JWT validation (check if token is not expired)
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;

      return payload.exp > currentTime;
    } catch {
      logger.warn("Invalid JWT token in storage");
      this.clearStoredToken();
      return false;
    }
  }

  // Full authentication flow
  async ensureAuthenticated() {
    try {
      // Initialize LIFF if not already done
      if (!this.isInitialized) {
        await this.init();
      }

      // Check if already authenticated with backend
      if (this.isAuthenticatedWithBackend()) {
        return this.getStoredToken();
      }

      // Authenticate with backend
      const authData = await this.authenticateWithBackend();
      return authData.token;
    } catch (error) {
      logger.error("Full authentication failed:", error);
      throw error;
    }
  }
}

// Create singleton instance
const liffService = new LiffService();

export default liffService;
