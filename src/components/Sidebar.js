/**
 * Sidebar Component
 * Common left sidebar navigation for all pages
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar({ expanded, setExpanded }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`crm-sidebar ${expanded ? 'expanded' : ''}`}>
      <div className="sidebar-top">
        <button 
          onClick={() => navigate('/')}
          className={`sidebar-icon-btn ${isActive('/') ? 'active' : ''}`}
          title="Dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          {expanded && <span className="sidebar-label">Dashboard</span>}
        </button>

        <button 
          onClick={() => navigate('/customers')}
          className={`sidebar-icon-btn ${isActive('/customers') ? 'active' : ''}`}
          title="Customers"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {expanded && <span className="sidebar-label">Customers</span>}
        </button>

        <button 
          onClick={() => navigate('/map')}
          className={`sidebar-icon-btn ${isActive('/map') ? 'active' : ''}`}
          title="Map View"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/>
            <line x1="8" y1="2" x2="8" y2="18"/>
            <line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
          {expanded && <span className="sidebar-label">Map View</span>}
        </button>

        <button 
          onClick={() => navigate('/analytics')}
          className={`sidebar-icon-btn ${isActive('/analytics') ? 'active' : ''}`}
          title="Analytics"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          {expanded && <span className="sidebar-label">Analytics</span>}
        </button>

        <button 
          onClick={() => navigate('/tasks')}
          className={`sidebar-icon-btn ${isActive('/tasks') ? 'active' : ''}`}
          title="Tasks"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          {expanded && <span className="sidebar-label">Tasks</span>}
        </button>

        <button 
          onClick={() => navigate('/calendar')}
          className={`sidebar-icon-btn ${isActive('/calendar') ? 'active' : ''}`}
          title="Calendar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {expanded && <span className="sidebar-label">Calendar</span>}
        </button>

        <button 
          onClick={() => navigate('/registration-mail')}
          className={`sidebar-icon-btn ${isActive('/registration-mail') ? 'active' : ''}`}
          title="Send Registration Emails"
        >
          {/* envelope icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          {expanded && <span className="sidebar-label">Registration Mail</span>}
        </button>


        {/* <button 
          className="sidebar-icon-btn"
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m5.196-13.196l-4.242 4.242m0 6.364l4.242 4.242M23 12h-6m-6 0H1m18.196 5.196l-4.242-4.242m0-6.364l4.242-4.242"/>
          </svg>
          {expanded && <span className="sidebar-label">Settings</span>}
        </button> */}
      </div>

      <div className="sidebar-bottom">
        <button 
          className="sidebar-icon-btn"
          title="Help"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {expanded && <span className="sidebar-label">Help</span>}
        </button>
        
        <button 
          className="sidebar-icon-btn"
          title="Menu"
          onClick={() => setExpanded(!expanded)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          {expanded && <span className="sidebar-label">Menu</span>}
        </button>
      </div>
    </aside>
  );
}

