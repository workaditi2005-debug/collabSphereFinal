import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Notification from '../components/Notification';
import Profile from '../components/Profile';
import Analytics from './Analytics';
import FindTeammates from './FindTeammates';
import PeerReview from './PeerReview';
import './Dashboard.css';

const Dashboard = ({ userData, onUpdateUserData, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'projects';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    assignee: 'You'
  });

  // Kanban board state - Load from localStorage
  const [kanbanData, setKanbanData] = useState(() => {
    const saved = localStorage.getItem('kanbanData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse kanban data:', e);
      }
    }
    return {
      todo: [],
      inProgress: [],
      completed: []
    };
  });

  // Real-time user tracking
  const [activeUsers, setActiveUsers] = useState(() => {
    const saved = localStorage.getItem('activeUsers');
    return saved ? JSON.parse(saved) : [];
  });

  const [onlineCount, setOnlineCount] = useState(0);

  // Save kanban data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kanbanData', JSON.stringify(kanbanData));
  }, [kanbanData]);

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Track user session and update online status
  useEffect(() => {
    if (!userData) return;

    const sessionId = `session_${Date.now()}_${Math.random()}`;
    const userSession = {
      id: userData.id || sessionId,
      name: userData.fullName || userData.name || 'Anonymous',
      email: userData.email || '',
      lastActive: Date.now(),
      sessionId: sessionId
    };

    // Add current user to active users
    const updateActiveUsers = () => {
      const allUsers = JSON.parse(localStorage.getItem('allActiveUsers') || '[]');
      const now = Date.now();
      
      // Filter out inactive users (more than 5 minutes)
      const activeUsersList = allUsers.filter(u => 
        now - u.lastActive < 5 * 60 * 1000
      );

      // Update or add current user
      const existingIndex = activeUsersList.findIndex(u => 
        u.sessionId === sessionId
      );
      
      if (existingIndex >= 0) {
        activeUsersList[existingIndex] = userSession;
      } else {
        activeUsersList.push(userSession);
      }

      localStorage.setItem('allActiveUsers', JSON.stringify(activeUsersList));
      setActiveUsers(activeUsersList);
      setOnlineCount(activeUsersList.length);
    };

    updateActiveUsers();

    // Update presence every 30 seconds
    const presenceInterval = setInterval(updateActiveUsers, 30000);

    // Listen for storage changes from other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'allActiveUsers' && e.newValue) {
        const users = JSON.parse(e.newValue);
        setActiveUsers(users);
        setOnlineCount(users.length);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup on unmount
    return () => {
      clearInterval(presenceInterval);
      window.removeEventListener('storage', handleStorageChange);
      
      // Remove user from active list
      const allUsers = JSON.parse(localStorage.getItem('allActiveUsers') || '[]');
      const updatedUsers = allUsers.filter(u => u.sessionId !== sessionId);
      localStorage.setItem('allActiveUsers', JSON.stringify(updatedUsers));
    };
  }, [userData]);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  const handleUpdateProfile = (newData) => {
    if (onUpdateUserData) {
      onUpdateUserData(newData);
    }
    setShowProfileModal(false);
  };

  const handleLogout = () => {
    // Clear user-specific data but keep kanban data
    const kanbanBackup = localStorage.getItem('kanbanData');
    
    if (onLogout) {
      onLogout();
    }
    
    // Restore kanban data after logout
    if (kanbanBackup) {
      localStorage.setItem('kanbanData', kanbanBackup);
    }
    
    navigate('/login');
  };

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const handleMarkAsRead = (id) => {
    setNotifications(nots => nots.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleAccept = (id) => {
    console.log('Accepted request:', id);
    setNotifications(nots => nots.filter(n => n.id !== id));
  };

  const handleReject = (id) => {
    console.log('Rejected request:', id);
    setNotifications(nots => nots.filter(n => n.id !== id));
  };

  const handleClear = () => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  };

  // Drag and Drop handlers
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);

  // Calculate statistics dynamically
  const getStatistics = () => {
    const activeProjects = kanbanData.inProgress.length;
    const tasksCompleted = kanbanData.completed.length;
    const totalTasks = kanbanData.todo.length + kanbanData.inProgress.length + kanbanData.completed.length;
    
    return {
      activeProjects,
      connections: onlineCount,
      tasksCompleted,
      avgRating: 0.0,
      totalTasks
    };
  };

  const stats = getStatistics();

  const handleDragStart = (item, column) => {
    setDraggedItem(item);
    setDraggedFrom(column);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetColumn) => {
    if (!draggedItem || !draggedFrom) return;

    const sourceItems = kanbanData[draggedFrom].filter(
      item => item.id !== draggedItem.id
    );

    const targetItems = [...kanbanData[targetColumn], draggedItem];

    setKanbanData({
      ...kanbanData,
      [draggedFrom]: sourceItems,
      [targetColumn]: targetItems
    });

    setDraggedItem(null);
    setDraggedFrom(null);
  };

  const handleStatusChange = (taskId, currentColumn, newStatus) => {
    const task = kanbanData[currentColumn].find(t => t.id === taskId);
    if (!task) return;

    const updatedCurrentColumn = kanbanData[currentColumn].filter(t => t.id !== taskId);
    const updatedNewColumn = [...kanbanData[newStatus], task];

    setKanbanData({
      ...kanbanData,
      [currentColumn]: updatedCurrentColumn,
      [newStatus]: updatedNewColumn
    });
  };

  const handleModalInputChange = (e) => {
    setNewProject({
      ...newProject,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    
    const newTask = {
      id: Date.now(),
      title: newProject.title,
      description: newProject.description,
      assignee: newProject.assignee,
      createdAt: new Date().toISOString()
    };

    setKanbanData({
      ...kanbanData,
      todo: [...kanbanData.todo, newTask]
    });

    setNewProject({ title: '', description: '', assignee: 'You' });
    setIsModalOpen(false);
  };

  const handleDeleteTask = (taskId, column) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setKanbanData({
        ...kanbanData,
        [column]: kanbanData[column].filter(t => t.id !== taskId)
      });
    }
  };

  const StatCard = ({ icon, title, value, bgColor }) => (
    <div className="stat-card">
      <div className="stat-content">
        <div className="stat-header">
          <h3>{title}</h3>
        </div>
        <div className="stat-value">{value}</div>
      </div>
      <div className={`stat-icon ${bgColor}`}>
        {icon}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch(activeTab) {
      case 'projects':
        return (
          <div className="kanban-container">
            <div className="kanban-header">
              <h2>My Projects</h2>
              <button 
                className="btn-new-project"
                onClick={() => setIsModalOpen(true)}
              >
                <span className="plus-icon">+</span>
                New Project
              </button>
            </div>

            {stats.totalTasks === 0 ? (
              <div className="empty-state-kanban">
                <div className="empty-icon-large">📋</div>
                <h3>No projects yet</h3>
                <p>Create your first project to get started!</p>
                <button 
                  className="btn-create-first"
                  onClick={() => setIsModalOpen(true)}
                >
                  + Create Project
                </button>
              </div>
            ) : (
              <div className="kanban-board">
                {/* TODO Column */}
                <div 
                  className="kanban-column"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop('todo')}
                >
                  <div className="column-header">
                    <div className="column-title">
                      <span className="column-icon"></span>
                      <h3>Todo</h3>
                      <span className="column-count">{kanbanData.todo.length}</span>
                    </div>
                  </div>
                  <div className="column-content">
                    {kanbanData.todo.map(task => (
                      <div
                        key={task.id}
                        className="kanban-card"
                        draggable
                        onDragStart={() => handleDragStart(task, 'todo')}
                      >
                        <div className="card-header">
                          <h4>{task.title}</h4>
                          <button 
                            className="delete-task-btn"
                            onClick={() => handleDeleteTask(task.id, 'todo')}
                            title="Delete task"
                          >
                            ×
                          </button>
                        </div>
                        {task.description && (
                          <p className="task-description">{task.description}</p>
                        )}
                        <div className="card-footer">
                          <span className="assignee">{task.assignee}</span>
                          <select 
                            className="status-dropdown"
                            value="todo"
                            onChange={(e) => handleStatusChange(task.id, 'todo', e.target.value)}
                          >
                            <option value="todo">To Do</option>
                            <option value="inProgress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* IN PROGRESS Column */}
                <div 
                  className="kanban-column"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop('inProgress')}
                >
                  <div className="column-header">
                    <div className="column-title">
                      <span className="column-icon">🔄</span>
                      <h3>In Progress</h3>
                      <span className="column-count">{kanbanData.inProgress.length}</span>
                    </div>
                  </div>
                  <div className="column-content">
                    {kanbanData.inProgress.map(task => (
                      <div
                        key={task.id}
                        className="kanban-card"
                        draggable
                        onDragStart={() => handleDragStart(task, 'inProgress')}
                      >
                        <div className="card-header">
                          <h4>{task.title}</h4>
                          <button 
                            className="delete-task-btn"
                            onClick={() => handleDeleteTask(task.id, 'inProgress')}
                            title="Delete task"
                          >
                            ×
                          </button>
                        </div>
                        {task.description && (
                          <p className="task-description">{task.description}</p>
                        )}
                        <div className="card-footer">
                          <span className="assignee">{task.assignee}</span>
                          <select 
                            className="status-dropdown"
                            value="inProgress"
                            onChange={(e) => handleStatusChange(task.id, 'inProgress', e.target.value)}
                          >
                            <option value="todo">To Do</option>
                            <option value="inProgress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COMPLETED Column */}
                <div 
                  className="kanban-column"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop('completed')}
                >
                  <div className="column-header">
                    <div className="column-title">
                      <span className="column-icon">✓</span>
                      <h3>Completed</h3>
                      <span className="column-count">{kanbanData.completed.length}</span>
                    </div>
                  </div>
                  <div className="column-content">
                    {kanbanData.completed.map(task => (
                      <div
                        key={task.id}
                        className="kanban-card"
                        draggable
                        onDragStart={() => handleDragStart(task, 'completed')}
                      >
                        <div className="card-header">
                          <h4>{task.title}</h4>
                          <button 
                            className="delete-task-btn"
                            onClick={() => handleDeleteTask(task.id, 'completed')}
                            title="Delete task"
                          >
                            ×
                          </button>
                        </div>
                        {task.description && (
                          <p className="task-description">{task.description}</p>
                        )}
                        <div className="card-footer">
                          <span className="assignee">{task.assignee}</span>
                          <select 
                            className="status-dropdown"
                            value="completed"
                            onChange={(e) => handleStatusChange(task.id, 'completed', e.target.value)}
                          >
                            <option value="todo">To Do</option>
                            <option value="inProgress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'teammates':
        return <FindTeammates kanbanData={kanbanData} activeUsers={activeUsers} currentUser={userData} />; 
      case 'analytics':
        return <Analytics kanbanData={kanbanData} />;
      case 'reviews':
        return <PeerReview kanbanData={kanbanData} />; 
      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setIsModalOpen(false)}
            >
              ×
            </button>
            
            <div className="modal-header">
              <h2>Create New Project</h2>
              <p>Start a new project and invite teammates to collaborate</p>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>Project Title *</label>
                <input
                  type="text"
                  name="title"
                  placeholder="Enter project title"
                  value={newProject.title}
                  onChange={handleModalInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  name="description"
                  placeholder="Describe your project..."
                  value={newProject.description}
                  onChange={handleModalInputChange}
                  rows="5"
                />
              </div>

              <button type="submit" className="btn-create-project">
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="logo-section">
          <div className="brand">
            <h1>CollabSphere</h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Online Users Indicator */}
          <div className="online-indicator" title={`${onlineCount} user(s) online`}>
            <span className="online-dot"></span>
            <span className="online-count">{onlineCount}</span>
          </div>

          <Notification
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onAcceptRequest={handleAccept}
            onRejectRequest={handleReject}
            onClearNotification={handleClear}
          />
          
          {/* Profile Dropdown */}
          <div className="profile-dropdown-container" ref={dropdownRef}>
            <button 
              className="profile-trigger"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              {userData?.profilePic ? (
                <img 
                  src={typeof userData.profilePic === 'string' 
                    ? userData.profilePic 
                    : URL.createObjectURL(userData.profilePic)
                  } 
                  alt="Profile" 
                  className="profile-avatar" 
                />
              ) : (
                <div className="default-avatar">
                  {userData?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </button>
            
            {showProfileDropdown && (
              <div className="profile-dropdown-menu">
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setShowProfileModal(true);
                    setShowProfileDropdown(false);
                  }}
                >
                  <span className="dropdown-icon"></span>
                  Profile
                </button>
                <button 
                  className="dropdown-item logout"
                  onClick={handleLogout}
                >
                  <span className="dropdown-icon"></span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <div className="stats-section">
        <StatCard 
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
              <path d="M9 3v18" strokeWidth="2"/>
            </svg>
          }
          title="Active Projects"
          value={stats.activeProjects}
          bgColor="blue-bg"
        />
        <StatCard 
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2"/>
              <circle cx="9" cy="7" r="4" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2"/>
            </svg>
          }
          title="Online Users"
          value={stats.connections}
          bgColor="cyan-bg"
        />
        <StatCard 
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeWidth="2"/>
              <polyline points="22 4 12 14.01 9 11.01" strokeWidth="2"/>
            </svg>
          }
          title="Tasks Completed"
          value={stats.tasksCompleted}
          bgColor="orange-bg"
        />
        <StatCard 
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeWidth="2"/>
            </svg>
          }
          title="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          bgColor="purple-bg"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
            <path d="M9 3v18" strokeWidth="2"/>
          </svg>
          Projects
        </button>
        <button 
          className={`nav-tab ${activeTab === 'teammates' ? 'active' : ''}`}
          onClick={() => setActiveTab('teammates')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" strokeWidth="2"/>
          </svg>
          Find Teammates
        </button>
        <button 
          className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="2"/>
          </svg>
          Analytics
        </button>
        <button 
          className={`nav-tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2"/>
            <circle cx="8.5" cy="7" r="4" strokeWidth="2"/>
            <polyline points="17 11 19 13 23 9" strokeWidth="2"/>
          </svg>
          Peer Reviews
        </button>
      </div>

      {/* Tab Content */}
      <div className="main-content">
        {renderTabContent()}
      </div>

      {/* Profile Modal */}
      {showProfileModal && userData && (
        <Profile
          userData={userData}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;