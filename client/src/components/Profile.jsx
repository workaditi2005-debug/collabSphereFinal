import React, { useState } from 'react';
import { notificationAPI } from '../utils/api';
import './Profile.css';

const Profile = ({ userData, onUpdateProfile, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(userData);
  const [newProfilePic, setNewProfilePic] = useState(null);

  const availableSkills = [
    'React', 'Node.js', 'Python', 'Java', 'Machine Learning',
    'UI/UX Design', 'Data Science', 'MongoDB', 'SQL', 'AWS',
    'Docker', 'C++', 'Flutter', 'Django', 'Express.js',
    'TypeScript', 'GraphQL', 'Vue.js', 'Angular', 'Spring Boot'
  ];

  const handleChange = (e) => {
    setEditedData({ ...editedData, [e.target.name]: e.target.value });
  };

  const handleSkillToggle = (skill) => {
    setEditedData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewProfilePic(file);
    }
  };

  const handleSave = () => {
    onUpdateProfile({ ...editedData, profilePic: newProfilePic || editedData.profilePic });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(userData);
    setNewProfilePic(null);
    setIsEditing(false);
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>×</button>
        
        <div className="profile-header">
          <div className="profile-pic-large">
            {editedData.profilePic ? (
              <img src={URL.createObjectURL(editedData.profilePic)} alt="Profile" />
            ) : (
              <div className="default-avatar-large">
                {editedData.fullName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h2>{editedData.fullName}</h2>
          <p className="profile-email">{editedData.email}</p>
        </div>

        <div className="profile-actions">
          {!isEditing ? (
            <button className="btn-edit-profile" onClick={() => setIsEditing(true)}>
              ✏️ Edit Profile
            </button>
          ) : (
            <div className="edit-actions">
              <button className="btn-save" onClick={handleSave}>Save</button>
              <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
            </div>
          )}
        </div>

        <div className="profile-content">
          {!isEditing ? (
            // View Mode
            <>
              <div className="profile-section">
                <h3>📚 Institution</h3>
                <p>{editedData.institution}</p>
              </div>

              <div className="profile-section">
                <h3>🎓 Department</h3>
                <p>{editedData.department}</p>
              </div>

              <div className="profile-section">
                <h3>📅 Year</h3>
                <p>{editedData.year}</p>
              </div>

              <div className="profile-section">
                <h3>💼 Skills</h3>
                <div className="skills-display">
                  {editedData.skills.map(skill => (
                    <span key={skill} className="skill-tag-view">{skill}</span>
                  ))}
                </div>
              </div>

              {editedData.linkedinUrl && (
                <div className="profile-section">
                  <h3>🔗 LinkedIn</h3>
                  <a href={editedData.linkedinUrl} target="_blank" rel="noopener noreferrer" className="linkedin-link">
                    {editedData.linkedinUrl}
                  </a>
                </div>
              )}
            </>
          ) : (
            // Edit Mode
            <div className="profile-edit-form">
              <div className="form-group-profile">
                <label>Profile Picture</label>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file-input-profile"
                />
              </div>

              <div className="form-group-profile">
                <label>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={editedData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group-profile">
                <label>Institution</label>
                <input
                  type="text"
                  name="institution"
                  value={editedData.institution}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group-profile">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  value={editedData.department}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group-profile">
                <label>Year</label>
                <select name="year" value={editedData.year} onChange={handleChange}>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
              </div>

              <div className="form-group-profile">
                <label>Skills</label>
                <div className="skills-edit-container">
                  {availableSkills.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      className={`skill-chip-edit ${editedData.skills.includes(skill) ? 'selected' : ''}`}
                      onClick={() => handleSkillToggle(skill)}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group-profile">
                <label>LinkedIn URL</label>
                <input
                  type="url"
                  name="linkedinUrl"
                  value={editedData.linkedinUrl}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
