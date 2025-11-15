// src/utils/api.js
import { API_BASE_URL } from "./constants";

/**
 * Get auth token from localStorage
 */
export const getAuthToken = () => localStorage.getItem("authToken");

/**
 * Set auth token in localStorage
 */
export const setAuthToken = (token) => localStorage.setItem("authToken", token);

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
 * Generic API request handler
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
      hasAuth: !!token,
      data: options.body ? JSON.parse(options.body) : null 
    });

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    console.log(`📦 Response Status: ${response.status}`, data);

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
      console.error(`❌ API Error ${response.status}:`, errorMessage);
      return { success: false, error: errorMessage, status: response.status, data: null };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error("❌ API Error:", error);
    throw error;
  }
};

// ==================== AUTH API ====================
export const authAPI = {
  register: async (userData) => {
    const res = await apiRequest("/auth/register", { method: "POST", body: JSON.stringify(userData) });
    if (res.token) {
      setAuthToken(res.token);
      setUserData(res.user);
    }
    return res;
  },
  login: async (credentials) => {
    const res = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
    if (res.token) {
      setAuthToken(res.token);
      setUserData(res.user);
    }
    return res;
  },
  getProfile: () => apiRequest("/auth/profile", { method: "GET" }),
  updateProfile: async (profileData) => {
    const res = await apiRequest("/auth/profile", { method: "PUT", body: JSON.stringify(profileData) });
    const currentData = getUserData();
    setUserData({ ...currentData, ...profileData });
    return res;
  },
  logout: () => removeAuthToken(),
};

// ==================== PROJECT API ====================
export const projectAPI = {
  getAll: () => apiRequest("/projects", { method: "GET" }),
  create: (projectData) => apiRequest("/projects", { method: "POST", body: JSON.stringify(projectData) }),
  update: (project_id, updateData) => apiRequest(`/projects/${project_id}`, { method: "PUT", body: JSON.stringify(updateData) }),
  delete: (project_id) => apiRequest(`/projects/${project_id}`, { method: "DELETE" }),
  sendRequest: (requestData) => apiRequest("/requests/send", { method: "POST", body: JSON.stringify(requestData) }),
};

// ==================== TEAMMATE API ====================
export const teammateAPI = {
  search: (params) => apiRequest("/teammates/search", { method: "POST", body: JSON.stringify(params) }),
  
  testSend: (data) => {
    // Test endpoint - no auth
    const payload = {
      teammate_id: data.teammate_id,
      project_id: data.project_id,
      message: data.message
    };
    
    console.log("🧪 TEST: Calling /requests/test-send:", payload);
    
    return apiRequest("/requests/test-send", {  
      method: "POST", 
      body: JSON.stringify(payload)
    });
  },
  
  sendRequest: (data) => {
    // Validate and convert IDs to integers
    const teammate_id = parseInt(data.teammate_id);
    const project_id = parseInt(data.project_id);
    const message = (data.message || "").trim();

    // Validate required fields BEFORE sending
    if (!teammate_id || !project_id || !message) {
      const missing = [];
      if (!teammate_id) missing.push("teammate_id");
      if (!project_id) missing.push("project_id");
      if (!message) missing.push("message");
      
      const errorMsg = `Missing required fields: ${missing.join(", ")}`;
      console.error("❌ Validation failed:", errorMsg, { teammate_id, project_id, message });
      return Promise.reject(new Error(errorMsg));
    }

    const payload = {
      teammate_id: teammate_id,
      project_id: project_id,
      subject: data.subject || "Collaboration Request",
      message: message
    };
    
    console.log("📤 Sending payload to /requests/send:", payload);

    return apiRequest("/requests/send", {  
      method: "POST", 
      body: JSON.stringify(payload)
    });
  },

  getSentRequests: () => apiRequest("/requests/sent", { method: "GET" }),
  getReceivedRequests: () => apiRequest("/requests/received", { method: "GET" }),
  acceptRequest: (id) => apiRequest(`/requests/${id}/accept`, { method: "PUT" }),
  rejectRequest: (id) => apiRequest(`/requests/${id}/reject`, { method: "PUT" }),
};


// ==================== NOTIFICATION API ====================
export const notificationAPI = {
  getAll: () => apiRequest("/notifications", { method: "GET" }),
  markAsRead: (id) => apiRequest(`/notifications/${id}/read`, { method: "PUT" }),
  delete: (id) => apiRequest(`/notifications/${id}`, { method: "DELETE" }),
  clearAll: () => apiRequest("/notifications/clear", { method: "DELETE" }),
};

// ==================== ANALYTICS API ====================
export const analyticsAPI = {
  getUserAnalytics: () => apiRequest("/analytics", { method: "GET" }),
  getProjectAnalytics: (id) => apiRequest(`/analytics/project/${id}`, { method: "GET" }),
};

// ==================== PEER REVIEW API ====================
export const reviewAPI = {
  submit: (data) => apiRequest("/reviews", { method: "POST", body: JSON.stringify(data) }),
  getReceived: () => apiRequest("/reviews/received", { method: "GET" }),
  getGiven: () => apiRequest("/reviews/given", { method: "GET" }),
};

export default {
  auth: authAPI,
  project: projectAPI,
  teammate: teammateAPI,
  notification: notificationAPI,
  analytics: analyticsAPI,
  review: reviewAPI,
};
