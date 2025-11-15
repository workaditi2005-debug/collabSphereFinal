import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import heroImage from '../assets/image.jpg'; 

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <header className="header">
        <div className="logo">CollabSphere</div>
        <nav>
          <a onClick={() => navigate('/login')} className="nav-link" style={{cursor: 'pointer'}}>
            Sign In
          </a>
          <button className="btn-getstarted" onClick={() => navigate('/login')}>
            Get Started →
          </button>
        </nav>
      </header>

      <section className="hero">
        <p className="tagline">AI-Powered Academic Collaboration</p>
        <h1>
          Transform Team Projects into <span className="highlight">Success Stories</span>
        </h1>
        <p className="hero-subtitle">
          Connect with teammates, manage projects seamlessly, and leverage ML insights to build exceptional academic collaborations.
        </p>
        <div className="hero-buttons">
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Start Collaborating →
          </button>
        </div>
      </section>

      <section className="hero-image">
        <img 
          src={heroImage}  
          alt="Students collaborating on a project" 
        />
      </section>


      <section className="features">
        <h2>Everything You Need for Successful Collaboration</h2>
        <p className="features-subtitle">
          Powerful tools designed for students to work together effectively
        </p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon">👥</div>
            <h3>Find Perfect Teammates</h3>
            <p>Advanced filtering by skills, interests, and availability. Connect with students who complement your strengths.</p>
          </div>
          <div className="feature-card">
            <div className="icon">🎯</div>
            <h3>Project Management</h3>
            <p>Kanban boards, task tracking, and progress monitoring. Keep your team organized and on track.</p>
          </div>
          <div className="feature-card">
            <div className="icon">💬</div>
            <h3>Real-time Communication</h3>
            <p>Built-in chat and comment system. Discuss ideas, share updates, and collaborate seamlessly.</p>
          </div>
          <div className="feature-card">
            <div className="icon">🧠</div>
            <h3>ML-Powered Insights</h3>
            <p>Sentiment analysis on team interactions and collaboration health scores to optimize teamwork.</p>
          </div>
          <div className="feature-card">
            <div className="icon">📊</div>
            <h3>Analytics Dashboard</h3>
            <p>Track your progress, view team metrics, and get actionable insights to improve collaboration.</p>
          </div>
          <div className="feature-card">
            <div className="icon">⭐</div>
            <h3>Peer Reviews</h3>
            <p>Give and receive constructive feedback from teammates to improve collaboration and build stronger teams.</p>
          </div>
        </div>
      </section>

      <section className="call-to-action">
        <h2>Ready to Elevate Your Academic Projects?</h2>
        <p>Join thousands of students already collaborating smarter, not harder.</p>
        <button className="btn-primary" onClick={() => navigate('/login')}>
          Get Started for Free →
        </button>
      </section>

      <footer>
        <div className="footer-logo">CollabSphere</div>
        <p>Empowering academic collaboration through intelligent technology.</p>
        <div className="footer-links">
          <div>
            <h4>Product</h4>
            <ul>
              <li><a href="/features">Features</a></li>
              <li><a href="/pricing">Pricing</a></li>
              <li><a href="/demo">Demo</a></li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li><a href="/documentation">Documentation</a></li>
              <li><a href="/support">Support</a></li>
              <li><a href="/community">Community</a></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="/about">About</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;


