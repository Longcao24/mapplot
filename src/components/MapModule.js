import React, { useState, useEffect } from 'react';
import MapViewPage from '../pages/MapViewPage';
import './MapModule.css';

/**
 * MapModule - Embeddable map component for dashboard
 * Wraps the MapViewPage in a container suitable for embedding
 */
const MapModule = ({ customers }) => {
  const [viewMode, setViewMode] = useState('admin');

  // Store viewMode globally
  useEffect(() => {
    window.viewMode = viewMode;
  }, [viewMode]);

  return (
    <div className="map-module-wrapper">
      <MapViewPage viewMode={viewMode} setViewMode={setViewMode} />
    </div>
  );
};

export default MapModule;

