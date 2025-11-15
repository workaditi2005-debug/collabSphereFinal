import React, { useState, useEffect } from 'react';
import './FindTeammates.css';
import { teammateAPI, projectAPI } from '../utils/api';
import { AVAILABLE_SKILLS, ACADEMIC_YEARS } from '../utils/constants';

const FindTeammates = ({ currentUser, activeUsers = [], kanbanData }) => {
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('teammateFilters');
    return saved ? JSON.parse(saved) : {
      skills: [],
      years: [],
      departments: []
    };
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('teammateSearchQuery') || '';
  });

  const [showResults, setShowResults] = useState(() => {
    return localStorage.getItem('showTeammateResults') === 'true';
  });

  const [filteredTeammates, setFilteredTeammates] = useState(() => {
    const saved = localStorage.getItem('filteredTeammates');
    return saved ? JSON.parse(saved) : [];
  });

  const [sentRequests, setSentRequests] = useState(() => {
    const saved = localStorage.getItem('sentRequests');
    return saved ? JSON.parse(saved) : [];
  });

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTeammate, setSelectedTeammate] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [projectForRequest, setProjectForRequest] = useState('');
  
  const [activeProjects, setActiveProjects] = useState(() => {
    // Get active projects from kanbanData
    const todo = kanbanData?.todo || [];
    const inProgress = kanbanData?.inProgress || [];
    return [...todo, ...inProgress];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Real-time matching suggestions based on current user skills
  const [matchingSuggestions, setMatchingSuggestions] = useState([]);

  // Available filter options
  const availableSkills = AVAILABLE_SKILLS;
  const availableYears = ACADEMIC_YEARS;
  const availableDepartments = [
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Mechanical',
    'Civil',
    'Electrical',
    'Data Science'
  ];

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem('teammateFilters', JSON.stringify(filters));
  }, [filters]);

  // Save search query to localStorage
  useEffect(() => {
    localStorage.setItem('teammateSearchQuery', searchQuery);
  }, [searchQuery]);

  // Save show results state
  useEffect(() => {
    localStorage.setItem('showTeammateResults', showResults.toString());
  }, [showResults]);

  // Save filtered teammates
  useEffect(() => {
    localStorage.setItem('filteredTeammates', JSON.stringify(filteredTeammates));
  }, [filteredTeammates]);

  // Save sent requests
  useEffect(() => {
    localStorage.setItem('sentRequests', JSON.stringify(sentRequests));
  }, [sentRequests]);

  // Update active projects when kanbanData changes
  useEffect(() => {
    if (kanbanData) {
      const todo = kanbanData.todo || [];
      const inProgress = kanbanData.inProgress || [];
      setActiveProjects([...todo, ...inProgress]);
    }
  }, [kanbanData]);

  // Calculate real-time matching based on online users and current user skills
  useEffect(() => {
    if (!currentUser || !activeUsers || activeUsers.length === 0) {
      setMatchingSuggestions([]);
      return;
    }

    // Filter out current user from active users
    const otherUsers = activeUsers.filter(u => 
      u.id !== currentUser.id && u.sessionId !== currentUser.sessionId
    );

    // Calculate match scores (mock calculation based on skills)
    const userSkills = currentUser.skills || [];
    const suggestions = otherUsers.map(user => {
      // Mock skills for demo - in real app, fetch from backend
      const mockSkills = ['React', 'JavaScript', 'Python'].slice(0, Math.floor(Math.random() * 3) + 1);
      const commonSkills = mockSkills.filter(skill => userSkills.includes(skill));
      const matchScore = commonSkills.length > 0 ? (commonSkills.length / userSkills.length) * 100 : 0;

      return {
        ...user,
        skills: mockSkills,
        matchScore: Math.round(matchScore),
        isOnline: true
      };
    }).filter(u => u.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);

    setMatchingSuggestions(suggestions);
  }, [activeUsers, currentUser]);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Searching teammates with filters:', filters, 'Query:', searchQuery);
      
      const response = await teammateAPI.search({
        query: searchQuery,
        skills: filters.skills,
        years: filters.years,
        departments: filters.departments
      });

      console.log('✅ Search Response:', response);

      if (response.success) {
  setFilteredTeammates(response.results || []);
  setShowResults(true);
} else {
  setError(response.error || "No results found");
  setFilteredTeammates([]);
}
      
    } catch (err) {
      console.error('❌ Search error:', err);
      setError(err.message || 'Failed to search teammates');
      setFilteredTeammates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFilter = (category, value) => {
    setFilters(prev => {
      const currentFilters = prev[category];
      if (currentFilters.includes(value)) {
        return {
          ...prev,
          [category]: currentFilters.filter(item => item !== value)
        };
      } else {
        return {
          ...prev,
          [category]: [...currentFilters, value]
        };
      }
    });
  };

  const clearAllFilters = () => {
    setFilters({
      skills: [],
      years: [],
      departments: []
    });
    setSearchQuery('');
    setShowResults(false);
    setFilteredTeammates([]);
    setError(null);
    
    // Clear localStorage
    localStorage.removeItem('teammateFilters');
    localStorage.removeItem('teammateSearchQuery');
    localStorage.removeItem('showTeammateResults');
    localStorage.removeItem('filteredTeammates');
  };

  const handleSendRequest = (teammate) => {
    setSelectedTeammate(teammate);
    setShowRequestModal(true);
    setRequestMessage('');
    setProjectForRequest('');
  };

const submitRequest = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  setError(null);

  try {
    if (!selectedTeammate || !projectForRequest || !requestMessage.trim()) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    console.log("📨 Sending collaboration request...");

    const response = await teammateAPI.sendRequest({
      teammateId: selectedTeammate.id,
      projectId: projectForRequest,
      subject: `Request to join project ${projectForRequest}`, // optional dynamic subject
      message: requestMessage
    });

    console.log("✅ Request sent:", response);

    if (response.success) {
      const newRequest = {
        id: response.request_id || Date.now(),
        teammate: selectedTeammate,
        project: projectForRequest,
        message: requestMessage,
        status: "pending",
        timestamp: new Date().toISOString()
      };

      setSentRequests([...sentRequests, newRequest]);

      setShowRequestModal(false);
      setRequestMessage("");
      setProjectForRequest("");
      setSelectedTeammate(null);
      setSuccessMessage(`Request sent to ${selectedTeammate.full_name}! 🎉`);

      setTimeout(() => setSuccessMessage(""), 3000);
    } else {
      setError(response.error || "Failed to send request");
    }

  } catch (err) {
    setError(err.message || "Failed to send collaboration request");
  } finally {
    setIsLoading(false);
  }
};

  const isRequestSent = (teammateId) => {
    return sentRequests.some(req => req.teammate.id === teammateId);
  };

  const FilterSection = ({ title, items, category }) => (
    <div className="filter-section">
      <h4>{title}</h4>
      <div className="filter-chips">
        {items.map(item => (
          <button
            key={item}
            className={`filter-chip ${filters[category].includes(item) ? 'active' : ''}`}
            onClick={() => toggleFilter(category, item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="find-teammates-container">
      {/* Success Message */}
      {successMessage && (
        <div className="success-message-banner">
          {successMessage}
        </div>
      )}

      {/* Real-time Matching Banner */}
      {matchingSuggestions.length > 0 && (
        <div className="realtime-matching-banner">
          <div className="banner-header">
            <span className="live-indicator">🔴 LIVE</span>
            <h3>🎯 Real-time Matches ({matchingSuggestions.length} online now)</h3>
          </div>
          <div className="matching-suggestions">
            {matchingSuggestions.map((match, idx) => (
              <div key={idx} className="match-suggestion-card">
                <div className="match-header">
                  <div className="match-avatar">
                    {match.name?.charAt(0).toUpperCase() || '?'}
                    <span className="online-dot-small"></span>
                  </div>
                  <div className="match-info">
                    <h4>{match.name}</h4>
                    <span className="match-score">{match.matchScore}% match</span>
                  </div>
                </div>
                <div className="match-skills">
                  {match.skills?.slice(0, 3).map((skill, i) => (
                    <span key={i} className="skill-tag-small">{skill}</span>
                  ))}
                </div>
                <button 
                  className="btn-connect-now"
                  onClick={() => handleSendRequest(match)}
                >
                  Connect Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content request-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowRequestModal(false)}>×</button>
            
            <div className="modal-header">
              <h2>Send Collaboration Request</h2>
              <p>To: {selectedTeammate?.full_name}</p>

            </div>

            {error && <div className="modal-error">{error}</div>}

            <div className="modal-form">
              <div className="form-group">
                <label>Select Project *</label>
                <select
                  value={projectForRequest}
                  onChange={(e) => setProjectForRequest(e.target.value)}
                  required
                >
                  <option value="">Choose a project</option>
                  {activeProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                  {activeProjects.length === 0 && (
                    <option disabled>No active projects available</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Message *</label>
                <textarea
                  placeholder={`Hi ${selectedTeammate?.full_name}, I'd love to collaborate...`}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows="5"
                  required
                />
              </div>

              <button 
                onClick={submitRequest}
                className="btn-send-request"
                disabled={isLoading || !projectForRequest || !requestMessage.trim()}
              >
                {isLoading ? '⏳ Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="teammates-header">
        <div>
          <h2>🤝 Find Teammates</h2>
          <p>Discover and connect with talented collaborators</p>
          {activeUsers.length > 0 && (
            <p className="online-status">
              <span className="online-dot"></span>
              {activeUsers.length} user(s) online right now
            </p>
          )}
        </div>
      </div>

      <div className="teammates-layout">
        {/* Filters Sidebar */}
        <div className="filters-sidebar">
          <div className="filters-header">
            <h3>Filters</h3>
            {(filters.skills.length > 0 || filters.years.length > 0 || filters.departments.length > 0 || searchQuery) && (
              <button className="clear-filters-btn" onClick={clearAllFilters}>
                Clear All
              </button>
            )}
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <span className="search-icon">🔍</span>
          </div>

          <FilterSection
            title="Skills"
            items={availableSkills}
            category="skills"
          />

          <FilterSection
            title="Year"
            items={availableYears}
            category="years"
          />

          <FilterSection
            title="Department"
            items={availableDepartments}
            category="departments"
          />

          <button 
            className="btn-search-teammates" 
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Searching...' : '🔍 Search Teammates'}
          </button>

          {(filters.skills.length > 0 || filters.years.length > 0 || filters.departments.length > 0) && (
            <div className="active-filters">
              <h4>Active Filters</h4>
              <div className="active-filter-tags">
                {[...filters.skills, ...filters.years, ...filters.departments].map((filter, idx) => (
                  <span key={idx} className="active-filter-tag">
                    {filter}
                    <button onClick={() => {
                      if (filters.skills.includes(filter)) toggleFilter('skills', filter);
                      else if (filters.years.includes(filter)) toggleFilter('years', filter);
                      else toggleFilter('departments', filter);
                    }}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Teammates Content */}
        <div className="teammates-content">
          {!showResults ? (
            <div className="no-search-yet">
              <div className="no-search-icon">🔍</div>
              <h3>Ready to find your perfect teammate?</h3>
              <p>Use the filters on the left and click "Search Teammates" to get started</p>
              {matchingSuggestions.length > 0 && (
                <p className="hint-text">💡 Check out the real-time matches above!</p>
              )}
            </div>
          ) : (
            <>
              {error ? (
                <div className="error-box">
                  <h3>⚠️ Error</h3>
                  <p>{error}</p>
                  <button className="btn-retry" onClick={handleSearch}>
                    🔄 Try Again
                  </button>
                </div>
              ) : filteredTeammates.length === 0 ? (
                <div className="no-results">
                  <div className="no-results-icon">🔍</div>
                  <h3>No teammates found</h3>
                  <p>Try adjusting your filters or search query</p>
                </div>
              ) : (
                <>
                  <div className="results-header">
                    <h3>{filteredTeammates.length} Teammates Found</h3>
                  </div>

                  <div className="teammates-grid">
                    {filteredTeammates.map((teammate) => (
                      <div key={teammate.id} className="teammate-card">
                        <div className="teammate-card-header">
                          <div className="teammate-avatar-large">
                            {teammate.avatar || teammate.full_name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={`availability-badge ${(teammate.availability || 'Available').toLowerCase()}`}>
                            {teammate.availability || 'Available'}
                          </span>
                        </div>

                        <h3>{teammate.full_name}</h3>

                        <p className="teammate-year">
                          {teammate.year} • {teammate.department}
                        </p>
                        <p className="teammate-bio">{teammate.bio || 'Student collaborator'}</p>

                        <div className="teammate-skills">
                          {teammate.skills?.slice(0, 4).map((skill, idx) => (
                            <span key={idx} className="skill-tag">{skill}</span>
                          ))}
                          {teammate.skills?.length > 4 && (
                            <span className="skill-tag more">+{teammate.skills.length - 4}</span>
                          )}
                        </div>

                        {teammate.linkedinUrl && (
                          <div className="teammate-links">
                            <a href={teammate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="link-btn">
                              LinkedIn →
                            </a>
                          </div>
                        )}

                        <button
                          className={`btn-send-collab ${isRequestSent(teammate.id) ? 'sent' : ''}`}
                          onClick={() => !isRequestSent(teammate.id) && handleSendRequest(teammate)}
                          disabled={isRequestSent(teammate.id)}
                        >
                          {isRequestSent(teammate.id) ? '✓ Request Sent' : 'Send Request'}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindTeammates;