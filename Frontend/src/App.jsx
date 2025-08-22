import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import TrainerDashboard from './components/Dashboard/TrainerDashboard';
import MemberDashboard from './components/Dashboard/MemberDashboard';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!user.token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Home Route Component
const Home = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Check if token is valid (basic check)
  if (user.token) {
    try {
      // Basic token validation - check if it's not expired
      const tokenPayload = JSON.parse(atob(user.token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (tokenPayload.exp && tokenPayload.exp < currentTime) {
        // Token is expired, clear it
        localStorage.removeItem('user');
        return <Navigate to="/login" replace />;
      }
      
      // Token is valid, redirect to appropriate dashboard
      switch(user.role) {
        case 'admin':
          return <Navigate to="/admin-dashboard" replace />;
        case 'trainer':
          return <Navigate to="/trainer-dashboard" replace />;
        case 'member':
          return <Navigate to="/member-dashboard" replace />;
        default:
          return <Navigate to="/login" replace />;
      }
    } catch (error) {
      // Invalid token format, clear it
      localStorage.removeItem('user');
      return <Navigate to="/login" replace />;
    }
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer-dashboard"
            element={
              <ProtectedRoute allowedRoles={['trainer']}>
                <TrainerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member-dashboard"
            element={
              <ProtectedRoute allowedRoles={['member']}>
                <MemberDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
