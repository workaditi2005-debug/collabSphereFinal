import React, { useState, useEffect } from "react";
import "./Analytics.css";
import { analyticsAPI, projectAPI } from '../utils/api';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('completion_rate');
  const [timeRange, setTimeRange] = useState('all');

  // Fetch analytics data on component mount
  useEffect(() => {
    fetchAnalyticsData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalyticsData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch analytics
      const analyticsResponse = await analyticsAPI.getUserAnalytics();
      console.log('📊 Analytics Response:', analyticsResponse);
      
      if (analyticsResponse.success) {
        setAnalyticsData(analyticsResponse.analytics);
      }

      // Fetch projects for detailed analysis
      const projectsResponse = await projectAPI.getAll();
      console.log('📁 Projects Response:', projectsResponse);
      
      if (projectsResponse.success) {
        setProjectsData(projectsResponse.projects || []);
      }

      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('❌ Analytics Fetch Error:', err);
      setError(err.message || 'Failed to load analytics');
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate project metrics
  const getProjectMetrics = () => {
    if (!projectsData.length) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        todo: 0,
        completionRate: 0,
        avgPriority: 'N/A'
      };
    }

    const completed = projectsData.filter(p => p.status === 'completed').length;
    const inProgress = projectsData.filter(p => p.status === 'inProgress').length;
    const todo = projectsData.filter(p => p.status === 'todo').length;

    return {
      total: projectsData.length,
      completed,
      inProgress,
      todo,
      completionRate: Math.round((completed / projectsData.length) * 100),
      avgPriority: 'High'
    };
  };

  // Get status color
  const getStatusColor = (value, type = 'completion') => {
    if (type === 'completion') {
      if (value >= 75) return '#10b981'; // green
      if (value >= 50) return '#f59e0b'; // amber
      if (value >= 25) return '#ef4444'; // red
      return '#6b7280'; // gray
    }
    if (type === 'status') {
      if (value === 'completed') return '#10b981';
      if (value === 'inProgress') return '#3b82f6';
      return '#f59e0b';
    }
  };

  // Get status emoji
  const getStatusEmoji = (status) => {
    switch(status) {
      case 'completed': return '✅';
      case 'inProgress': return '⚙️';
      case 'todo': return '📋';
      default: return '❓';
    }
  };

  // Calculate quality score based on multiple factors
  const calculateQualityScore = () => {
    if (!analyticsData) return 0;
    
    const metrics = getProjectMetrics();
    const completionWeight = metrics.completionRate * 0.4;
    const statusWeight = (metrics.inProgress > 0 ? 30 : 50) * 0.4;
    const consistencyWeight = Math.min(projectsData.length * 10, 100) * 0.2;
    
    return Math.round(completionWeight + statusWeight + consistencyWeight);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render loading state
  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <h3>📊 Loading Real-Time Analytics...</h3>
          <p>Fetching your project data</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="analytics-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Analytics</h3>
          <p>{error}</p>
          <button className="btn-retry" onClick={fetchAnalyticsData}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  const metrics = getProjectMetrics();
  const qualityScore = calculateQualityScore();
  const completionRate = analyticsData?.completion_rate || metrics.completionRate;

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h2>📊 Analytics Dashboard</h2>
          <p>Real-time insights into your project performance</p>
        </div>
        <div className="header-actions">
          <button 
            className={`btn-refresh ${refreshing ? 'loading' : ''}`}
            onClick={fetchAnalyticsData}
            disabled={refreshing}
          >
            {refreshing ? '⏳ Updating...' : '🔄 Refresh'}
          </button>
          <span className="last-updated">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        {/* Completion Rate Card */}
        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>Completion Rate</h3>
            <div className="metric-value" style={{ color: getStatusColor(completionRate) }}>
              {completionRate}%
            </div>
            <div className="metric-bar">
              <div 
                className="metric-bar-fill" 
                style={{ 
                  width: `${completionRate}%`,
                  backgroundColor: getStatusColor(completionRate)
                }}
              ></div>
            </div>
            <p className="metric-label">{metrics.completed} of {metrics.total} projects completed</p>
          </div>
        </div>

        {/* Quality Score Card */}
        <div className="metric-card">
          <div className="metric-icon"></div>
          <div className="metric-content">
            <h3>Quality Score</h3>
            <div className="metric-value" style={{ color: getStatusColor(qualityScore) }}>
              {qualityScore}/100
            </div>
            <div className="metric-bar">
              <div 
                className="metric-bar-fill" 
                style={{ 
                  width: `${qualityScore}%`,
                  backgroundColor: getStatusColor(qualityScore)
                }}
              ></div>
            </div>
            <p className="metric-label">Overall project health</p>
          </div>
        </div>

        {/* Total Projects Card */}
        <div className="metric-card">
          <div className="metric-icon"></div>
          <div className="metric-content">
            <h3>Total Projects</h3>
            <div className="metric-value">{metrics.total}</div>
            <div className="project-breakdown">
              <div className="breakdown-item">
                <span className="status-dot" style={{ backgroundColor: '#10b981' }}></span>
                <span>{metrics.completed} Completed</span>
              </div>
              <div className="breakdown-item">
                <span className="status-dot" style={{ backgroundColor: '#3b82f6' }}></span>
                <span>{metrics.inProgress} In Progress</span>
              </div>
              <div className="breakdown-item">
                <span className="status-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                <span>{metrics.todo} To Do</span>
              </div>
            </div>
          </div>
        </div>

        {/* Productivity Card */}
        <div className="metric-card">
          <div className="metric-icon"></div>
          <div className="metric-content">
            <h3>Productivity</h3>
            <div className="metric-value" style={{ color: '#3b82f6' }}>
              {metrics.inProgress > 0 ? 'Active' : 'Stable'}
            </div>
            <div className="productivity-info">
              <p>Active Projects: <strong>{metrics.inProgress}</strong></p>
              <p>Pending Tasks: <strong>{metrics.todo}</strong></p>
            </div>
            <p className="metric-label">
              {metrics.inProgress > 0 ? '🚀 Keep up the momentum!' : '✨ Ready for new projects'}
            </p>
          </div>
        </div>
      </div>

      {/* Projects Details Section */}
      {projectsData.length > 0 ? (
        <div className="projects-section">
          <div className="section-header">
            <h3>📋 Project Details</h3>
            <div className="filter-tabs">
              <button 
                className={`tab ${selectedMetric === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('all')}
              >
                All ({metrics.total})
              </button>
              <button 
                className={`tab ${selectedMetric === 'completed' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('completed')}
              >
                Completed ({metrics.completed})
              </button>
              <button 
                className={`tab ${selectedMetric === 'inProgress' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('inProgress')}
              >
                In Progress ({metrics.inProgress})
              </button>
            </div>
          </div>

          <div className="projects-table-wrapper">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Project Title</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectsData.map((project) => (
                  <tr key={project.id} className={`status-${project.status}`}>
                    <td className="project-title">
                      <span className="status-emoji">
                        {getStatusEmoji(project.status)}
                      </span>
                      {project.title}
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(project.status, 'status') }}
                      >
                        {project.status === 'inProgress' ? 'In Progress' : project.status}
                      </span>
                    </td>
                    <td>
                      <div className="progress-mini">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: project.status === 'completed' ? '100%' : project.status === 'inProgress' ? '50%' : '0%'
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="date-cell">
                      {formatDate(project.createdAt)}
                    </td>
                    <td>
                      <button className="action-btn">View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-projects">
          <div className="empty-icon">📁</div>
          <h3>No Projects Yet</h3>
          <p>Create your first project to see analytics</p>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="analytics-summary">
        <h3>Performance Insights</h3>
        <div className="insights-list">
          <div className="insight-item">
            <span className="insight-icon"></span>
            <div>
              <strong>Completion Status:</strong>
              <p>
                {completionRate >= 75 
                  ? '🟢 Excellent progress! Keep maintaining this pace.' 
                  : completionRate >= 50 
                  ? '🟡 Good progress, but there\'s room for improvement.' 
                  : '🔴 Focus on completing pending tasks to boost productivity.'}
              </p>
            </div>
          </div>
          
          <div className="insight-item">
            <span className="insight-icon">⚡</span>
            <div>
              <strong>Current Activity:</strong>
              <p>
                {metrics.inProgress > 0 
                  ? `You have ${metrics.inProgress} project(s) in progress. Great momentum!` 
                  : 'No active projects. Consider starting new work or checking completed projects.'}
              </p>
            </div>
          </div>

          <div className="insight-item">
            <span className="insight-icon"></span>
            <div>
              <strong>Recommendations:</strong>
              <p>
                {metrics.todo > 0 
                  ? `You have ${metrics.todo} pending task(s). Prioritize and move them to in-progress.` 
                  : 'All tasks are progressing well. Consider planning new initiatives!'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Status Indicator */}
      <div className="realtime-indicator">
        <span className="pulse"></span>
        Data updates in real-time • Last sync: {formatDate(new Date().toISOString())}
      </div>
    </div>
  );
};

export default Analytics;