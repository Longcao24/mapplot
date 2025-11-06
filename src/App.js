import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';

import AppLayout from './components/AppLayout';
import CRMDashboard from './pages/CRMDashboard';
import AnalyticsPage from './pages/AnalyticsPage';
import CustomerManagementPage from './pages/CustomerManagementPage';
import RegistrationPage from './pages/RegistrationPage';
import SendRegistrationMail from './pages/SendRegistrationMail';
import MapViewPage from './pages/MapViewPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import Login from './pages/Login';
import AcceptInvite from './pages/AcceptInvite';
import { isAuthenticated } from './lib/supabase';

// Protected Route Component
function ProtectedRoute({ children }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await isAuthenticated();
        console.log('🔐 Auth check result:', isAuth);
        setAuthenticated(isAuth);
        
        if (!isAuth) {
          console.log('❌ Not authenticated, redirecting to login');
          navigate('/login', { replace: true, state: { from: location } });
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        setAuthenticated(false);
        navigate('/login', { replace: true, state: { from: location } });
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [navigate, location]);

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  return authenticated ? children : null;
}

function App() {
  const [viewMode, setViewMode] = useState('admin');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    window.viewMode = viewMode;
    console.log('👁️ View mode changed to:', viewMode);
  }, [viewMode]);

  const handleAuthed = (user) => {
    console.log('✅ User authenticated:', user);
    setCurrentUser(user);
  };

  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={<Login onAuthed={handleAuthed} />} 
        />
        
        <Route 
          path="/register" 
          element={<RegistrationPage />} 
        />

        <Route 
          path="/accept-invite" 
          element={<AcceptInvite />} 
        />

        {/* Protected Routes */}
        <Route 
          path="/map" 
          element={
            <ProtectedRoute>
              <MapViewPage viewMode={viewMode} setViewMode={setViewMode} />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <CRMDashboard viewMode={viewMode} setViewMode={setViewMode} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <AnalyticsPage viewMode={viewMode} setViewMode={setViewMode} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/customers" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <CustomerManagementPage viewMode={viewMode} setViewMode={setViewMode} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <TasksPage viewMode={viewMode} setViewMode={setViewMode} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <CalendarPage viewMode={viewMode} setViewMode={setViewMode} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/registration-mail" 
          element={
            <ProtectedRoute>
              <AppLayout>
                <SendRegistrationMail viewMode={viewMode} setViewMode={setViewMode} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />

        {/* Catch-all redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;
