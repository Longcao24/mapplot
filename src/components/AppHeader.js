/**
 * AppHeader Component
 * Common header navigation for all pages
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  initializeGoogleAPI, 
  authorizeGoogleCalendar, 
  revokeGoogleCalendar,
  isAuthorized,
  setStoredToken
} from '../services/googleCalendar';
import './AppHeader.css';

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');
  const [userEmail, setUserEmail] = useState('');
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
      }
    };
    getUser();

    // Initialize Google Calendar API
    const initGoogle = async () => {
      try {
        await initializeGoogleAPI();
        // Check if already authorized
        if (isAuthorized()) {
          setIsGoogleCalendarConnected(true);
          setStoredToken();
        }
      } catch (error) {
        console.error('Error initializing Google API:', error);
      }
    };
    initGoogle();

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (!userEmail) return 'U';
    return userEmail.charAt(0).toUpperCase();
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnecting(true);
      console.log('🔗 Connecting to Google Calendar...');
      
      await authorizeGoogleCalendar();
      
      setIsGoogleCalendarConnected(true);
      setIsConnecting(false);
      
      console.log('✅ Google Calendar connected successfully');
      
      // Optional: Show success notification
      alert('✅ Google Calendar connected successfully!\n\nYou can now sync your tasks and meetings with Google Calendar.');
    } catch (error) {
      console.error('❌ Error connecting to Google Calendar:', error);
      setIsConnecting(false);
      alert('❌ Failed to connect to Google Calendar.\n\nPlease make sure popups are enabled and try again.');
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    try {
      console.log('🔌 Disconnecting from Google Calendar...');
      
      revokeGoogleCalendar();
      setIsGoogleCalendarConnected(false);
      
      console.log('✅ Google Calendar disconnected');
      alert('✅ Google Calendar disconnected successfully.');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
      alert('❌ Error disconnecting from Google Calendar.');
    }
  };

  return (
    <header className="crm-header">
      <div className="crm-header-left">
        <img 
          src="/logo.png" 
          alt="Customer Atlas Logo" 
          className="crm-logo"
        />
        <div className="crm-header-title">
          <h1>Customer Atlas</h1>
          <p>CRM & Territory Management</p>
        </div>
      </div>
      {/* <nav className="crm-nav">
        <button 
          onClick={() => navigate('/')}
          className={`nav-button ${isActive('/') ? 'active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </button>
        <button 
          onClick={() => navigate('/map')}
          className={`nav-button ${isActive('/map') ? 'active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/>
            <line x1="8" y1="2" x2="8" y2="18"/>
            <line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
          Map
        </button>
        <button 
          onClick={() => navigate('/customers')}
          className={`nav-button ${isActive('/customers') ? 'active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Customers
        </button>
        <button 
          onClick={() => navigate('/analytics')}
          className={`nav-button ${isActive('/analytics') ? 'active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Analytics
        </button>
        <button 
          onClick={() => navigate('/tasks')}
          className={`nav-button ${isActive('/tasks') ? 'active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          Tasks
        </button>
      </nav> */}

      <div className="user-menu-container" ref={userMenuRef}>
        <button 
          className="user-menu-button"
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-label="User menu"
        >
          <div className="user-avatar">
            {getUserInitials()}
          </div>
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className="user-menu-chevron"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showUserMenu && (
          <div className="user-dropdown">
            <div className="user-dropdown-header">
              <div className="user-dropdown-avatar">
                {getUserInitials()}
              </div>
              <div className="user-dropdown-info">
                <p className="user-dropdown-email">{userEmail}</p>
                <p className="user-dropdown-label">Account</p>
              </div>
            </div>
            
            <div className="user-dropdown-divider"></div>
            
            <button 
              className="user-dropdown-item"
              onClick={() => {
                setShowUserMenu(false);
                navigate('/profile');
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Profile</span>
            </button>

            <button 
              className="user-dropdown-item"
              onClick={() => {
                setShowUserMenu(false);
                setShowSettingsModal(true);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>Settings</span>
            </button>

            <div className="user-dropdown-divider"></div>

            <button 
              className="user-dropdown-item user-dropdown-logout"
              onClick={handleLogout}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="settings-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            {/* Left Sidebar */}
            <div className="settings-sidebar">
              <div className="settings-sidebar-header">
                <button 
                  className="settings-modal-close"
                  onClick={() => setShowSettingsModal(false)}
                  aria-label="Close settings"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <nav className="settings-nav">
                <button 
                  className={`settings-nav-item ${activeSettingsTab === 'general' ? 'active' : ''}`}
                  onClick={() => setActiveSettingsTab('general')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>General</span>
                </button>

                <button 
                  className={`settings-nav-item ${activeSettingsTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => setActiveSettingsTab('notifications')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  <span>Notifications</span>
                </button>

                <button 
                  className={`settings-nav-item ${activeSettingsTab === 'account' ? 'active' : ''}`}
                  onClick={() => setActiveSettingsTab('account')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Account</span>
                </button>

                <button 
                  className={`settings-nav-item ${activeSettingsTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveSettingsTab('security')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>Security</span>
                </button>

                <button 
                  className={`settings-nav-item ${activeSettingsTab === 'preferences' ? 'active' : ''}`}
                  onClick={() => setActiveSettingsTab('preferences')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M2 12h20"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <span>Preferences</span>
                </button>

                <button 
                  className={`settings-nav-item ${activeSettingsTab === 'privacy' ? 'active' : ''}`}
                  onClick={() => setActiveSettingsTab('privacy')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>Privacy</span>
                </button>
              </nav>
            </div>

            {/* Right Content */}
            <div className="settings-content">
              <div className="settings-content-header">
                <h2>{activeSettingsTab.charAt(0).toUpperCase() + activeSettingsTab.slice(1)}</h2>
              </div>

              <div className="settings-content-body">
                {/* General Settings */}
                {activeSettingsTab === 'general' && (
                  <>
                    <div className="settings-group">
                      <h3 className="settings-group-title">Appearance</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Theme</label>
                          <p className="settings-item-description">Choose your display theme</p>
                        </div>
                        <select className="settings-select">
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>
                    </div>

                    <div className="settings-group">
                      <h3 className="settings-group-title">Language & Region</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Language</label>
                          <p className="settings-item-description">Choose your preferred language</p>
                        </div>
                        <select className="settings-select">
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                        </select>
                      </div>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Time Zone</label>
                          <p className="settings-item-description">Set your local time zone</p>
                        </div>
                        <select className="settings-select">
                          <option value="UTC">UTC</option>
                          <option value="EST">Eastern Time</option>
                          <option value="PST">Pacific Time</option>
                          <option value="CST">Central Time</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Notifications Settings */}
                {activeSettingsTab === 'notifications' && (
                  <>
                    <div className="settings-group">
                      <h3 className="settings-group-title">Email Notifications</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Email Updates</label>
                          <p className="settings-item-description">Receive email updates about your account</p>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" defaultChecked />
                          <span className="settings-toggle-slider"></span>
                        </label>
                      </div>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Marketing Emails</label>
                          <p className="settings-item-description">Receive promotional emails and newsletters</p>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" />
                          <span className="settings-toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-group">
                      <h3 className="settings-group-title">Activity Notifications</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Task Reminders</label>
                          <p className="settings-item-description">Get reminders for upcoming tasks</p>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" defaultChecked />
                          <span className="settings-toggle-slider"></span>
                        </label>
                      </div>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Customer Updates</label>
                          <p className="settings-item-description">Notifications for customer changes</p>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" defaultChecked />
                          <span className="settings-toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Account Settings */}
                {activeSettingsTab === 'account' && (
                  <>
                    <div className="settings-group">
                      <h3 className="settings-group-title">Account Information</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Email Address</label>
                          <p className="settings-item-value">{userEmail}</p>
                        </div>
                        <button className="settings-btn-secondary">Change</button>
                      </div>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Password</label>
                          <p className="settings-item-description">Last changed 30 days ago</p>
                        </div>
                        <button className="settings-btn-secondary">Change</button>
                      </div>
                    </div>

                    <div className="settings-group">
                      <h3 className="settings-group-title">Integrations</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <div className="integration-header">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#4285F4"/>
                              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" stroke="#4285F4" strokeWidth="2"/>
                              <path d="M12 7V12L15 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <label>Google Calendar</label>
                          </div>
                          <p className="settings-item-description">
                            {isGoogleCalendarConnected 
                              ? 'Sync your tasks and meetings with Google Calendar' 
                              : 'Connect to sync tasks and schedule meetings'}
                          </p>
                          {isGoogleCalendarConnected && (
                            <div className="connection-status">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                              <span className="status-text">Connected</span>
                            </div>
                          )}
                        </div>
                        {isGoogleCalendarConnected ? (
                          <button 
                            className="settings-btn-secondary"
                            onClick={handleDisconnectGoogleCalendar}
                            disabled={isConnecting}
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button 
                            className="settings-btn-primary"
                            onClick={handleConnectGoogleCalendar}
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
                              <>
                                <svg 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }}
                                >
                                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                                </svg>
                                Connecting...
                              </>
                            ) : (
                              <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z"/>
                                  <path d="M12 7V12L15 15"/>
                                </svg>
                                Connect Calendar
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="settings-group settings-danger-zone">
                      <h3 className="settings-group-title">Danger Zone</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Delete Account</label>
                          <p className="settings-item-description">Permanently delete your account and all data</p>
                        </div>
                        <button className="settings-btn-danger">Delete Account</button>
                      </div>
                    </div>
                  </>
                )}

                {/* Security Settings */}
                {activeSettingsTab === 'security' && (
                  <>
                    <div className="settings-group">
                      <h3 className="settings-group-title">Two-Factor Authentication</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Enable 2FA</label>
                          <p className="settings-item-description">Add an extra layer of security</p>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" />
                          <span className="settings-toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-group">
                      <h3 className="settings-group-title">Session Management</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Active Sessions</label>
                          <p className="settings-item-description">Manage your active login sessions</p>
                        </div>
                        <button className="settings-btn-secondary">View Sessions</button>
                      </div>
                    </div>
                  </>
                )}

                {/* Preferences Settings */}
                {activeSettingsTab === 'preferences' && (
                  <>
                    <div className="settings-group">
                      <h3 className="settings-group-title">Display Preferences</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Compact View</label>
                          <p className="settings-item-description">Show more items per page</p>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" />
                          <span className="settings-toggle-slider"></span>
                        </label>
                      </div>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Show Sidebar</label>
                          <p className="settings-item-description">Always show the navigation sidebar</p>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" defaultChecked />
                          <span className="settings-toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Privacy Settings */}
                {activeSettingsTab === 'privacy' && (
                  <>
                    <div className="settings-group">
                      <h3 className="settings-group-title">Data Privacy</h3>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Analytics</label>
                          <p className="settings-item-description">Help us improve by sharing usage data</p>
                        </div>
                        <label className="settings-toggle">
                          <input type="checkbox" defaultChecked />
                          <span className="settings-toggle-slider"></span>
                        </label>
                      </div>
                      <div className="settings-item">
                        <div className="settings-item-info">
                          <label>Download My Data</label>
                          <p className="settings-item-description">Export all your personal data</p>
                        </div>
                        <button className="settings-btn-secondary">Download</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
