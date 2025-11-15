import React, { useState, useEffect } from 'react';
import './PeerReview.css';
import { reviewAPI } from '../utils/api';
import { RATING_CATEGORIES } from '../utils/constants';

const PeerReview = ({ kanbanData }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    teammate: '',
    rating: 0,
    comment: '',
    skills: {
      communication: 0,
      technical: 0,
      teamwork: 0,
      problemSolving: 0
    }
  });

  const [projects, setProjects] = useState([]);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Load projects from kanbanData
  useEffect(() => {
    if (kanbanData) {
      const allProjects = [
        ...kanbanData.todo,
        ...kanbanData.inProgress,
        ...kanbanData.completed
      ];

      const projectsWithReviews = allProjects.map(project => ({
        ...project,
        teammates: project.teammates || [],
        reviews: project.reviews || [],
        analytics: calculateAnalytics(project.reviews || [])
      }));

      setProjects(projectsWithReviews);
    }
  }, [kanbanData]);

  // Calculate analytics dynamically
  const calculateAnalytics = (reviews) => {
    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        avgRating: 0,
        completionRate: 0,
        topSkill: 'N/A'
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = totalRating / reviews.length;

    // Calculate average skill ratings
    const skillAverages = {
      communication: 0,
      technical: 0,
      teamwork: 0,
      problemSolving: 0
    };

    reviews.forEach(review => {
      Object.keys(skillAverages).forEach(skill => {
        skillAverages[skill] += review.skills[skill] || 0;
      });
    });

    Object.keys(skillAverages).forEach(skill => {
      skillAverages[skill] = skillAverages[skill] / reviews.length;
    });

    // Find top skill
    const topSkill = Object.keys(skillAverages).reduce((a, b) =>
      skillAverages[a] > skillAverages[b] ? a : b
    );

    const topSkillName = topSkill
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      totalReviews: reviews.length,
      avgRating: parseFloat(avgRating.toFixed(1)),
      completionRate: 100, // Can be dynamic based on your logic
      topSkill: topSkillName
    };
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
  };

  const handleStarClick = (rating) => {
    setReviewData({ ...reviewData, rating });
  };

  const handleSkillRating = (skill, rating) => {
    setReviewData({
      ...reviewData,
      skills: { ...reviewData.skills, [skill]: rating }
    });
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();

    const newReview = {
      id: Date.now(),
      reviewer: 'You',
      reviewee: reviewData.teammate,
      rating: reviewData.rating,
      date: new Date().toISOString().split('T')[0],
      comment: reviewData.comment,
      skills: reviewData.skills
    };

    // Update project with new review
    const updatedProjects = projects.map(project => {
      if (project.id === selectedProject.id) {
        const updatedReviews = [...project.reviews, newReview];
        return {
          ...project,
          reviews: updatedReviews,
          analytics: calculateAnalytics(updatedReviews)
        };
      }
      return project;
    });

    setProjects(updatedProjects);
    const updatedProject = updatedProjects.find(p => p.id === selectedProject.id);
    setSelectedProject(updatedProject);
    
    setShowReviewModal(false);
    setReviewData({
      teammate: '',
      rating: 0,
      comment: '',
      skills: { communication: 0, technical: 0, teamwork: 0, problemSolving: 0 }
    });
  };

  const StarRating = ({ rating, onRate, onHover, size = 'medium', readOnly = false }) => {
    const stars = [1, 2, 3, 4, 5];
    return (
      <div className="star-rating">
        {stars.map(star => (
          <span
            key={star}
            className={`star ${size} ${star <= (onHover || rating) ? 'filled' : ''} ${readOnly ? 'readonly' : ''}`}
            onClick={() => !readOnly && onRate && onRate(star)}
            onMouseEnter={() => !readOnly && onHover && setHoveredStar(star)}
            onMouseLeave={() => !readOnly && onHover && setHoveredStar(0)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="peer-review-container">
      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content review-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowReviewModal(false)}>×</button>

            <div className="modal-header">
              <h2>Submit Peer Review</h2>
              <p>Project: {selectedProject?.title}</p>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label>Select Teammate</label>
                <select
                  value={reviewData.teammate}
                  onChange={(e) => setReviewData({ ...reviewData, teammate: e.target.value })}
                  required
                >
                  <option value="">Choose a teammate</option>
                  {selectedProject?.teammates && selectedProject.teammates.length > 0 ? (
                    selectedProject.teammates.map(tm => (
                      <option key={tm.id} value={tm.name}>{tm.name}</option>
                    ))
                  ) : (
                    <option disabled>No teammates added yet</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Overall Rating</label>
                <StarRating
                  rating={reviewData.rating}
                  onRate={handleStarClick}
                  onHover={hoveredStar}
                  size="large"
                />
                <span className="rating-value">{reviewData.rating}/5</span>
              </div>

              <div className="form-group">
                <label>Skill Assessment</label>
                <div className="skill-ratings">
                  {Object.keys(reviewData.skills).map(skill => (
                    <div key={skill} className="skill-item">
                      <span className="skill-name">
                        {skill.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <StarRating
                        rating={reviewData.skills[skill]}
                        onRate={(rating) => handleSkillRating(skill, rating)}
                        size="small"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Review Comment</label>
                <textarea
                  placeholder="Share your feedback about this teammate's contribution..."
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  rows="4"
                  required
                />
              </div>

              <button type="submit" className="btn-submit-review">
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}

      {!selectedProject ? (
        <>
          <div className="section-header">
            <h2>Peer Reviews</h2>
            <p>Select a project to view and submit peer reviews</p>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state-peer">
              <div className="empty-icon-large">📝</div>
              <h3>No projects available</h3>
              <p>Create projects first to start giving peer reviews</p>
            </div>
          ) : (
            <div className="projects-list">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="project-card-review"
                  onClick={() => handleProjectSelect(project)}
                >
                  <div className="project-card-header">
                    <h3>{project.title}</h3>
                    <span className="review-badge">{project.analytics.totalReviews} reviews</span>
                  </div>

                  <div className="teammates-preview">
                    {project.teammates && project.teammates.length > 0 ? (
                      <>
                        {project.teammates.slice(0, 3).map((tm, idx) => (
                          <div key={idx} className="avatar-small" title={tm.name || tm}>
                            {typeof tm === 'string' ? tm.substring(0, 2).toUpperCase() : tm.name?.substring(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {project.teammates.length > 3 && (
                          <div className="avatar-small more">+{project.teammates.length - 3}</div>
                        )}
                      </>
                    ) : (
                      <p className="no-teammates">No teammates yet</p>
                    )}
                  </div>

                  <div className="project-stats">
                    <div className="stat-item">
                      <span className="stat-label">Avg Rating</span>
                      <span className="stat-value">
                        {project.analytics.avgRating > 0 ? `${project.analytics.avgRating} ⭐` : 'N/A'}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Reviews</span>
                      <span className="stat-value">{project.analytics.totalReviews}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="back-button" onClick={() => setSelectedProject(null)}>
            ← Back to Projects
          </div>

          <div className="project-detail-header">
            <div>
              <h2>{selectedProject.title}</h2>
              <p>{selectedProject.teammates?.length || 0} teammates</p>
            </div>
            <button
              className="btn-new-review"
              onClick={() => setShowReviewModal(true)}
            >
              + Write Review
            </button>
          </div>

          {/* Analytics Cards */}
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-icon">📊</div>
              <div className="analytics-content">
                <h4>Total Reviews</h4>
                <p className="analytics-value">{selectedProject.analytics.totalReviews}</p>
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-icon">⭐</div>
              <div className="analytics-content">
                <h4>Average Rating</h4>
                <p className="analytics-value">
                  {selectedProject.analytics.avgRating > 0 ? `${selectedProject.analytics.avgRating}/5` : 'N/A'}
                </p>
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-icon">✓</div>
              <div className="analytics-content">
                <h4>Completion Rate</h4>
                <p className="analytics-value">{selectedProject.analytics.completionRate}%</p>
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-icon">🏆</div>
              <div className="analytics-content">
                <h4>Top Skill</h4>
                <p className="analytics-value">{selectedProject.analytics.topSkill}</p>
              </div>
            </div>
          </div>

          {/* Teammates Section */}
          <div className="section-box">
            <h3>Team Members</h3>
            {selectedProject.teammates && selectedProject.teammates.length > 0 ? (
              <div className="teammates-grid">
                {selectedProject.teammates.map((tm, idx) => (
                  <div key={idx} className="teammate-card">
                    <div className="avatar-large">
                      {typeof tm === 'string' ? tm.substring(0, 2).toUpperCase() : tm.name?.substring(0, 2).toUpperCase()}
                    </div>
                    <h4>{typeof tm === 'string' ? tm : tm.name}</h4>
                    <p>{typeof tm === 'string' ? 'Team Member' : tm.role || 'Team Member'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data-message">No teammates added to this project yet</p>
            )}
          </div>

          {/* Reviews Section */}
          <div className="section-box">
            <h3>Reviews</h3>
            <div className="reviews-list">
              {selectedProject.reviews.length === 0 ? (
                <div className="empty-reviews">
                  <p>No reviews yet. Be the first to submit a review!</p>
                </div>
              ) : (
                selectedProject.reviews.map(review => (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <div className="review-info">
                        <div className="review-avatar">
                          {review.reviewer === 'You' ? '👤' : review.reviewer.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4>{review.reviewer} → {review.reviewee}</h4>
                          <span className="review-date">{review.date}</span>
                        </div>
                      </div>
                      <div className="review-rating">
                        <StarRating rating={review.rating} readOnly size="small" />
                        <span className="rating-text">{review.rating}/5</span>
                      </div>
                    </div>

                    <p className="review-comment">{review.comment}</p>

                    <div className="skills-breakdown">
                      <h5>Skill Breakdown</h5>
                      <div className="skills-grid">
                        {Object.entries(review.skills).map(([skill, rating]) => (
                          <div key={skill} className="skill-bar-item">
                            <span className="skill-bar-label">
                              {skill.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <div className="skill-bar">
                              <div
                                className="skill-bar-fill"
                                style={{ width: `${(rating / 5) * 100}%` }}
                              />
                            </div>
                            <span className="skill-bar-value">{rating}/5</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PeerReview;

