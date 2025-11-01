/**
 * AppLayout Component
 * Common layout wrapper with sidebar and header
 * Used for all pages except Map (which has custom layout)
 */

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import AppHeader from './AppHeader';
import './AppLayout.css';

export default function AppLayout({ children }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar expanded={sidebarExpanded} setExpanded={setSidebarExpanded} />
      <div className={`app-layout-main ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
        <AppHeader />
        <main className="app-layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}

