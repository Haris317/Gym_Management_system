import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Clear any existing authentication on component mount
  useEffect(() => {
    // Check if there's a logout parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true') {
      localStorage.removeItem('user');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setError('');
    window.location.reload();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call the real API
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
        role: formData.role
      });

      if (response.success) {
        // Store user data in localStorage with new token structure
        localStorage.setItem('user', JSON.stringify({
          ...response.user,
          token: response.accessToken || response.token, // Support both old and new token structure
          refreshToken: response.refreshToken
        }));

        // Navigate based on role
        switch(response.user.role) {
          case 'admin':
            navigate('/admin-dashboard');
            break;
          case 'trainer':
            navigate('/trainer-dashboard');
            break;
          case 'member':
            navigate('/member-dashboard');
            break;
          default:
            navigate('/member-dashboard');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Role Selector */}
          <div className="role-selector">
            <button
              type="button"
              className={`role-option ${formData.role === 'member' ? 'active' : ''}`}
              onClick={() => setFormData({...formData, role: 'member'})}
            >
              👤 Member
            </button>
            <button
              type="button"
              className={`role-option ${formData.role === 'trainer' ? 'active' : ''}`}
              onClick={() => setFormData({...formData, role: 'trainer'})}
            >
              🏋️ Trainer
            </button>
            <button
              type="button"
              className={`role-option ${formData.role === 'admin' ? 'active' : ''}`}
              onClick={() => setFormData({...formData, role: 'admin'})}
            >
              ⚙️ Admin
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? (
              <>
                <span>🔄</span> Signing in...
              </>
            ) : (
              <>
                <span>🚀</span> Sign In
              </>
            )}
          </button>
        </form>
        
        <p className="auth-link">
          New to our gym? <a href="/signup">Create an account</a>
        </p>
        
        {/* Debug: Show logout button if user is stored */}
        {localStorage.getItem('user') && (
          <div className="logout-section">
            <p style={{ fontSize: '12px', color: '#666' }}>
              Already logged in? 
              <button 
                type="button" 
                onClick={handleLogout}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#007bff', 
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginLeft: '5px'
                }}
              >
                Logout first
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
