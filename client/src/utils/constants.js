// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Available Skills List
export const AVAILABLE_SKILLS = [
  'React', 'Node.js', 'Python', 'Java', 'Machine Learning',
  'UI/UX Design', 'Data Science', 'MongoDB', 'SQL', 'AWS',
  'Docker', 'C++', 'Flutter', 'Django', 'Express.js',
  'TypeScript', 'GraphQL', 'Vue.js', 'Angular', 'Spring Boot',
  'TensorFlow', 'Kubernetes', 'Arduino', 'Figma', 'Redux',
  'FastAPI', 'PostgreSQL', 'Firebase', 'Next.js', 'Tailwind CSS'
];

// Academic Years
export const ACADEMIC_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year'
];

// Departments
export const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'CS',  // Add short forms
  'cse', // Add variations
  'Mechanical',
  'Civil',
  'Electrical',
  'Data Science',
  'Software Engineering',
  'Artificial Intelligence',
  'Cybersecurity'
];

// Project Status
export const PROJECT_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed'
};

// Request Status
export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
};

// Notification Types
export const NOTIFICATION_TYPES = {
  REQUEST_SENT: 'request_sent_pending',
  REQUEST_ACCEPTED: 'request_accepted',
  REQUEST_REJECTED: 'request_rejected',
  INCOMING_REQUEST: 'incoming_request',
  PROJECT_UPDATE: 'project_update',
  REVIEW_RECEIVED: 'review_received'
};

// User Roles
export const USER_ROLES = {
  OWNER: 'owner',
  MEMBER: 'member',
  VIEWER: 'viewer'
};

// Rating Categories
export const RATING_CATEGORIES = {
  OVERALL: 'overall',
  COMMUNICATION: 'communication',
  TECHNICAL: 'technical',
  COLLABORATION: 'collaboration'
};

// Chart Colors
export const CHART_COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6'
};

// Pagination
export const ITEMS_PER_PAGE = 12;

// Toast Messages
export const TOAST_MESSAGES = {
  LOGIN_SUCCESS: 'Welcome back! Login successful.',
  REGISTER_SUCCESS: 'Account created successfully!',
  PROFILE_UPDATE: 'Profile updated successfully.',
  PROJECT_CREATED: 'Project created successfully.',
  PROJECT_UPDATED: 'Project updated successfully.',
  PROJECT_DELETED: 'Project deleted successfully.',
  REQUEST_SENT: 'Collaboration request sent successfully.',
  REQUEST_ACCEPTED: 'Request accepted successfully.',
  REQUEST_REJECTED: 'Request rejected.',
  REVIEW_SUBMITTED: 'Review submitted successfully.',
  ERROR_GENERIC: 'Something went wrong. Please try again.',
  ERROR_NETWORK: 'Network error. Please check your connection.',
  ERROR_AUTH: 'Authentication failed. Please login again.'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  THEME: 'theme'
};

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  SKILLS_MIN_COUNT: 1,
  PROJECT_TITLE_MAX_LENGTH: 100,
  BIO_MAX_LENGTH: 500,
  MESSAGE_MAX_LENGTH: 1000
};

// Feature Flags (for gradual rollout)
export const FEATURES = {
  AI_RECOMMENDATIONS: true,
  PEER_REVIEWS: true,
  ANALYTICS_DASHBOARD: true,
  REAL_TIME_CHAT: false,  // Coming soon
  VIDEO_CALLS: false  // Coming soon
};

// Availability Status
export const AVAILABILITY_STATUS = {
  AVAILABLE: 'Available',
  BUSY: 'Busy',
  OFFLINE: 'Offline'
};

// Project Priorities
export const PROJECT_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Analytics Time Ranges
export const TIME_RANGES = {
  WEEK: '7d',
  MONTH: '30d',
  QUARTER: '90d',
  YEAR: '365d'
};

// Export all as default object
export default {
  API_BASE_URL,
  AVAILABLE_SKILLS,
  ACADEMIC_YEARS,
  DEPARTMENTS,
  PROJECT_STATUS,
  REQUEST_STATUS,
  NOTIFICATION_TYPES,
  USER_ROLES,
  RATING_CATEGORIES,
  CHART_COLORS,
  ITEMS_PER_PAGE,
  TOAST_MESSAGES,
  STORAGE_KEYS,
  VALIDATION,
  FEATURES,
  AVAILABILITY_STATUS,
  PROJECT_PRIORITIES,
  TIME_RANGES
};