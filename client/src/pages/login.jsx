import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';  
import { authAPI } from '../utils/api';
import { AVAILABLE_SKILLS, ACADEMIC_YEARS, VALIDATION, TOAST_MESSAGES } from '../utils/constants';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('signIn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sign In Form Data
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  // Sign Up Form Data
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    institution: '',
    department: '',
    year: '',
    skills: [],
    profilePic: null,
    linkedinUrl: '',
    password: '',
    confirmPassword: ''
  });

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setError('');
  };

  // ==================== SIGN IN HANDLERS ====================
  const handleSignInChange = (e) => {
    setSignInData({ ...signInData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!VALIDATION.EMAIL_REGEX.test(signInData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!signInData.password) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting login...');
      const response = await authAPI.login({
        email: signInData.email,
        password: signInData.password
      });

      console.log('✅ Login successful:', response);

      if (response.token && response.user) {
        onLogin(response.user);
        navigate('/dashboard');
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(err.message || TOAST_MESSAGES.ERROR_AUTH);
    } finally {
      setLoading(false);
    }
  };

  // ==================== SIGN UP HANDLERS ====================
  const handleSignUpChange = (e) => {
    setSignUpData({ ...signUpData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSkillToggle = (skill) => {
    setSignUpData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      setSignUpData({ ...signUpData, profilePic: file });
    }
  };

  const validateSignUpForm = () => {
    // Name validation
    if (signUpData.fullName.length < VALIDATION.NAME_MIN_LENGTH) {
      return 'Name must be at least 2 characters long';
    }

    // Email validation
    if (!VALIDATION.EMAIL_REGEX.test(signUpData.email)) {
      return 'Please enter a valid email address';
    }

    // Institution validation
    if (!signUpData.institution.trim()) {
      return 'Institution name is required';
    }

    // Department validation
    if (!signUpData.department.trim()) {
      return 'Department is required';
    }

    // Year validation
    if (!signUpData.year) {
      return 'Please select your year';
    }

    // Skills validation
    if (signUpData.skills.length < VALIDATION.SKILLS_MIN_COUNT) {
      return 'Please select at least one skill';
    }

    // Password validation
    if (signUpData.password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters long`;
    }

    // Password match validation
    if (signUpData.password !== signUpData.confirmPassword) {
      return 'Passwords do not match';
    }

    return null;
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    const validationError = validateSignUpForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      console.log('📝 Attempting registration...');

      // Prepare data for API
      const userData = {
        fullName: signUpData.fullName,
        email: signUpData.email,
        institution: signUpData.institution,
        department: signUpData.department,
        year: signUpData.year,
        skills: signUpData.skills,
        linkedinUrl: signUpData.linkedinUrl || '',
        password: signUpData.password
      };

      // Note: In a real app, you'd upload the profile picture separately
      // For now, we're just storing the file name
      if (signUpData.profilePic) {
        userData.profilePic = signUpData.profilePic.name;
      }

      const response = await authAPI.register(userData);

      console.log('✅ Registration successful:', response);

      if (response.token && response.user) {
        onLogin(response.user);
        navigate('/dashboard');
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('❌ Registration error:', err);
      setError(err.message || TOAST_MESSAGES.ERROR_REGISTER);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="back-home" onClick={() => navigate('/')}>
        ← Back to home
      </div>
      
      <div className="login-card">
        <h2>Welcome to CollabSphere</h2>
        <p>Sign in or create an account to start collaborating</p>
        
        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="login-tabs">
          <button 
            className={`login-tab${activeTab === 'signIn' ? ' active' : ''}`} 
            onClick={() => handleTabClick('signIn')}
            disabled={loading}
          >
            Sign In
          </button>
          <button 
            className={`login-tab${activeTab === 'signUp' ? ' active' : ''}`} 
            onClick={() => handleTabClick('signUp')}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>
        
        {/* Sign In Form */}
        {activeTab === 'signIn' ? (
          <form onSubmit={handleSignInSubmit}>
            <label>Email</label>
            <input 
              name="email" 
              type="email" 
              placeholder="student@university.edu"
              value={signInData.email}
              onChange={handleSignInChange}
              disabled={loading}
              required
            />
            
            <label>Password</label>
            <input 
              name="password" 
              type="password" 
              placeholder="Enter your password"
              value={signInData.password}
              onChange={handleSignInChange}
              disabled={loading}
              required
            />
            
            <button 
              className="btn-gradient" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* Sign Up Form */
          <form onSubmit={handleSignUpSubmit} className="signup-form">
            <label>Full Name <span className="required">*</span></label>
            <input 
              name="fullName" 
              type="text" 
              placeholder="John Doe"
              value={signUpData.fullName}
              onChange={handleSignUpChange}
              disabled={loading}
              required
            />
            
            <label>Email <span className="required">*</span></label>
            <input 
              name="email" 
              type="email" 
              placeholder="student@university.edu"
              value={signUpData.email}
              onChange={handleSignUpChange}
              disabled={loading}
              required
            />
            
            <label>Institution Name <span className="required">*</span></label>
            <input 
              name="institution" 
              type="text" 
              placeholder="University of Technology"
              value={signUpData.institution}
              onChange={handleSignUpChange}
              disabled={loading}
              required
            />
            
            <label>Department <span className="required">*</span></label>
            <input 
              name="department" 
              type="text" 
              placeholder="Computer Science"
              value={signUpData.department}
              onChange={handleSignUpChange}
              disabled={loading}
              required
            />
            
            <label>Year <span className="required">*</span></label>
            <select 
              name="year" 
              value={signUpData.year} 
              onChange={handleSignUpChange}
              disabled={loading}
              required
            >
              <option value="">Select year</option>
              {ACADEMIC_YEARS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Skills Selection */}
            <label className="required-label">
              Skills <span className="required-star">*</span>
            </label>
            <div className="skills-container">
              {AVAILABLE_SKILLS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  className={`skill-chip ${signUpData.skills.includes(skill) ? 'selected' : ''}`}
                  onClick={() => handleSkillToggle(skill)}
                  disabled={loading}
                >
                  {skill}
                  {signUpData.skills.includes(skill) && <span className="check-mark"> ✓</span>}
                </button>
              ))}
            </div>
            {signUpData.skills.length > 0 && (
              <div className="selected-skills-count">
                {signUpData.skills.length} skill{signUpData.skills.length !== 1 ? 's' : ''} selected
              </div>
            )}

            {/* Profile Picture - Optional */}
            <label className="optional-label">
              Profile Picture <span className="optional-tag">(Optional)</span>
            </label>
            <div className="file-input-wrapper">
              <input 
                type="file"
                id="profilePic"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
                disabled={loading}
              />
              <label htmlFor="profilePic" className="file-label">
                {signUpData.profilePic ? signUpData.profilePic.name : 'Choose a photo'}
              </label>
            </div>

            {/* LinkedIn URL - Optional */}
            <label className="optional-label">
              LinkedIn Profile <span className="optional-tag">(Optional)</span>
            </label>
            <input 
              name="linkedinUrl" 
              type="url" 
              placeholder="https://linkedin.com/in/yourprofile"
              value={signUpData.linkedinUrl}
              onChange={handleSignUpChange}
              disabled={loading}
            />
            
            <label>Password <span className="required">*</span></label>
            <input 
              name="password" 
              type="password" 
              placeholder="Create a password"
              value={signUpData.password}
              onChange={handleSignUpChange}
              disabled={loading}
              required
            />
            
            <label>Confirm Password <span className="required">*</span></label>
            <input 
              name="confirmPassword" 
              type="password" 
              placeholder="Confirm your password"
              value={signUpData.confirmPassword}
              onChange={handleSignUpChange}
              disabled={loading}
              required
            />
            
            <button 
              className="btn-gradient" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;