import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/login';
import Dashboard from './pages/Dashboard';
import { getUserData, getAuthToken, removeAuthToken } from './utils/api';
import './App.css';


function App() {
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      const storedUserData = getUserData();

      if (token && storedUserData) {
        setUserData(storedUserData);
        setIsAuthenticated(true);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  /**
   * Handle user login
   */
  const handleLogin = (data) => {
    setUserData(data);
    setIsAuthenticated(true);
  };

  /**
   * Handle user logout
   */
  const handleLogout = () => {
    removeAuthToken();
    setUserData(null);
    setIsAuthenticated(false);
    navigate('/');
  };

  /**
   * Update user data (e.g., after profile edit)
   */
  const handleUpdateUserData = (newData) => {
    setUserData(prev => ({
      ...prev,
      ...newData
    }));
  };

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    if (isLoading) {
      return (
        <div className="loading-screen">
          <div className="loader"></div>
          <p>Loading...</p>
        </div>
      );
    }

    if (!isAuthenticated || !userData) {
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  // Public Route Component (redirect to dashboard if already logged in)
  const PublicRoute = ({ children }) => {
    if (isLoading) {
      return (
        <div className="loading-screen">
          <div className="loader"></div>
          <p>Loading...</p>
        </div>
      );
    }

    if (isAuthenticated && userData) {
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading CollabSphere...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <Home />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login onLogin={handleLogin} />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/signin" 
          element={
            <PublicRoute>
              <Login onLogin={handleLogin} />
            </PublicRoute>
          } 
        />

        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard 
                userData={userData} 
                onUpdateUserData={handleUpdateUserData}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;