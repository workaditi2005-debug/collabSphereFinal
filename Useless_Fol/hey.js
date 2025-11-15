// src/utils/api.js
import { API_BASE_URL } from "./constants";

/**
 * Get auth token from localStorage
 */
export const getAuthToken = () => {
  return localStorage.getItem("authToken");
};

/**
 * Set auth token in localStorage
 */
export const setAuthToken = (token) => {
  localStorage.setItem("authToken", token);
};

/**
 * Remove auth token from localStorage
 */
export const removeAuthToken = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
};


/**
 * Get stored user data
 */
export const getUserData = () => {
  const data = localStorage.getItem("userData");
  return data ? JSON.parse(data) : null;
};

/**
 * Store user data
 */
export const setUserData = (userData) => {
  localStorage.setItem("userData", JSON.stringify(userData));
};

/**
 * Generic API request handler with logging
 */
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    console.log(`🔗 API Request: ${endpoint}`, {
      method: config.method,
      data: options.body,
    });

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle empty response
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    console.log(`📦 Response Status: ${response.status}`, data);

    if (!response.ok) {
      const errorMessage =
        data?.error || data?.message || `HTTP ${response.status}`;
      return {
        success: false,
        error: errorMessage,
        status: response.status,
        data: null,
      };
    }

    return {
      success: true,
      ...data,
    };
  } catch (error) {
    console.error("❌ API Error:", error);
    throw error;
  }
};

// ==================== AUTH API ====================
export const authAPI = {
  /**
   * Register new user
   */
  register: async (userData) => {
    try {
      const response = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      if (response.token) {
        setAuthToken(response.token);
        setUserData(response.user);
      }

      return response;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  /**
   * Login user
   */
  login: async (credentials) => {
    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if (response.token) {
        setAuthToken(response.token);
        setUserData(response.user);
      }

      return response;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    try {
      return await apiRequest("/auth/profile", {
        method: "GET",
      });
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (profileData) => {
    try {
      const response = await apiRequest("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(profileData),
      });

      // Update local storage
      const currentData = getUserData();
      setUserData({ ...currentData, ...profileData });

      return response;
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    removeAuthToken();
  },
};

// ==================== PROJECT API ====================
export const projectAPI = {
  getAll: async () => {
    return await apiRequest("/projects", { method: "GET" });
  },

  create: async (projectData) => {
    return await apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify(projectData),
    });
  },

  update: async (projectId, updateData) => {
    return await apiRequest(`/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  },

  delete: async (projectId) => {
    return await apiRequest(`/projects/${projectId}`, {
      method: "DELETE",
    });
  },

  /**
   * ✔ ADDED — send collaboration request
   */
  sendRequest: async (requestData) => {
    try {
      return await apiRequest("requests/send", {
        method: "POST",
        body: JSON.stringify(requestData),
      });
    } catch (error) {
      console.error("Send collaboration request error:", error);
      throw error;
    }
  },
};

// ==================== TEAMMATE API ====================
export const teammateAPI = {
  /**
   * Search for teammates
   */
  search: async (searchParams) => {
    try {
      return await apiRequest("/teammates/search", {
        method: "POST",
        body: JSON.stringify(searchParams),
      });
    } catch (error) {
      console.error("Search teammates error:", error);
      throw error;
    }
  },

  /**
   * Send collaboration request
   */
  sendRequest: async (requestData) => {
    try {
      return await apiRequest("requests/send", {
        method: "POST",
        body: JSON.stringify(requestData),
      });
    } catch (error) {
      console.error("Send collaboration request error:", error);
      throw error;
    }
  },

  /**
   * Get sent requests
   */
  getSentRequests: async () => {
    try {
      return await apiRequest("/requests/sent", {
        method: "GET",
      });
    } catch (error) {
      console.error("Get sent requests error:", error);
      throw error;
    }
  },

  /**
   * Get received requests
   */
  getReceivedRequests: async () => {
    try {
      return await apiRequest("/requests/received", {
        method: "GET",
      });
    } catch (error) {
      console.error("Get received requests error:", error);
      throw error;
    }
  },

  /**
   * Accept collaboration request
   */
  acceptRequest: async (requestId) => {
    try {
      return await apiRequest(`/requests/${requestId}/accept`, {
        method: "PUT",
      });
    } catch (error) {
      console.error("Accept request error:", error);
      throw error;
    }
  },

  /**
   * Reject collaboration request
   */
  rejectRequest: async (requestId) => {
    try {
      return await apiRequest(`/requests/${requestId}/reject`, {
        method: "PUT",
      });
    } catch (error) {
      console.error("Reject request error:", error);
      throw error;
    }
  },
};

// ==================== NOTIFICATION API ====================
export const notificationAPI = {
  /**
   * Get all notifications
   */
  getAll: async () => {
    try {
      return await apiRequest("/notifications", {
        method: "GET",
      });
    } catch (error) {
      console.error("Get notifications error:", error);
      throw error;
    }
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId) => {
    try {
      return await apiRequest(`/notifications/${notificationId}/read`, {
        method: "PUT",
      });
    } catch (error) {
      console.error("Mark notification read error:", error);
      throw error;
    }
  },

  /**
   * Delete notification
   */
  delete: async (notificationId) => {
    try {
      return await apiRequest(`/notifications/${notificationId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Delete notification error:", error);
      throw error;
    }
  },

  /**
   * Clear all notifications
   */
  clearAll: async () => {
    try {
      return await apiRequest("/notifications/clear", {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Clear notifications error:", error);
      throw error;
    }
  },
};

// ==================== ANALYTICS API ====================
export const analyticsAPI = {
  /**
   * Get user analytics
   */
  getUserAnalytics: async () => {
    try {
      return await apiRequest("/analytics", {
        method: "GET",
      });
    } catch (error) {
      console.error("Get analytics error:", error);
      throw error;
    }
  },

  /**
   * Get project analytics
   */
  getProjectAnalytics: async (projectId) => {
    try {
      return await apiRequest(`/analytics/project/${projectId}`, {
        method: "GET",
      });
    } catch (error) {
      console.error("Get project analytics error:", error);
      throw error;
    }
  },
};

// ==================== PEER REVIEW API ====================
export const reviewAPI = {
  /**
   * Submit peer review
   */
  submit: async (reviewData) => {
    try {
      return await apiRequest("/reviews", {
        method: "POST",
        body: JSON.stringify(reviewData),
      });
    } catch (error) {
      console.error("Submit review error:", error);
      throw error;
    }
  },

  /**
   * Get reviews received
   */
  getReceived: async () => {
    try {
      return await apiRequest("/reviews/received", {
        method: "GET",
      });
    } catch (error) {
      console.error("Get received reviews error:", error);
      throw error;
    }
  },

  /**
   * Get reviews given
   */
  getGiven: async () => {
    try {
      return await apiRequest("/reviews/given", {
        method: "GET",
      });
    } catch (error) {
      console.error("Get given reviews error:", error);
      throw error;
    }
  },
};

export default {
  auth: authAPI,
  project: projectAPI,
  teammate: teammateAPI,
  notification: notificationAPI,
  analytics: analyticsAPI,
  review: reviewAPI,
};
