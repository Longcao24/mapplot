import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../App.css';
import './CRMDashboard.css';
import FilterPanel from '../components/FilterPanel';
import AppHeader from '../components/AppHeader';
import EmailComposer from '../components/EmailComposer';
import { apiGetCustomers, apiGetProducts } from '../lib/api';
import { useMapManager } from '../hooks/useMapManager';
import { useCustomerFilters } from '../hooks/useCustomerFilters';
import { useCustomerData } from '../hooks/useCustomerData';
import { PRODUCT_COLORS } from '../constants/colors';

/**
 * Helper function to calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Helper function to create a GeoJSON circle
 */
function createGeoJSONCircle(center, radiusInMeters, points = 64) {
  const coords = {
    latitude: center[1],
    longitude: center[0]
  };

  const km = radiusInMeters / 1000;
  const ret = [];
  const distanceX = km / (111.320 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret]
    }
  };
}

/**
 * MapViewPage Component
 * Full-page map view with filtering and clustering
 * Max lines: 150 (per component rules)
 */
function MapViewPage({ viewMode, setViewMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const mapContainer = useRef(null);

  // Panel state
  const [panelOpen, setPanelOpen] = useState(true);
  const [mapZoom, setMapZoom] = useState(3);
  const [showNavDropdown, setShowNavDropdown] = useState(false);
  const [zipRadius, setZipRadius] = useState(25); // Default 25 miles
  const [zipRadiusCount, setZipRadiusCount] = useState(null);
  const [zipCoordinates, setZipCoordinates] = useState(null);
  
  // Email composer state
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState([]);

  // Custom hooks
  const { 
    sites, 
    loading, 
    error, 
    availableProducts,
    fetchSites,
    getProductType,
    getProductColor 
  } = useCustomerData();

  const {
    selectedStates,
    setSelectedStates,
    selectedProducts,
    setSelectedProducts,
    statuses,
    setStatuses,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    zipQuery,
    setZipQuery,
    filteredSites,
    stateOptions,
    productOptions,
    resetFilters
  } = useCustomerFilters(sites, availableProducts);

  // Filter sites to display on map based on zip radius
  const displayedSites = useMemo(() => {
    // If no zip code entered, show all filtered sites
    if (!zipQuery || zipQuery.length !== 5 || !zipCoordinates) {
      return filteredSites;
    }

    // Filter by radius when zip code is entered
    const radiusInMeters = zipRadius * 1609.34;
    return filteredSites.filter(site => {
      if (!site.latitude || !site.longitude) return false;
      
      const distance = getDistance(
        zipCoordinates.lat, 
        zipCoordinates.lng,
        site.latitude, 
        site.longitude
      );
      
      return distance <= radiusInMeters;
    });
  }, [filteredSites, zipQuery, zipCoordinates, zipRadius]);

  const {
    map,
    mapReady,
    filteredFeatures,
    initializeMap,
    updateMapData
  } = useMapManager(mapContainer, displayedSites, getProductType, getProductColor);

  // Close filter panel when switching to customer view
  useEffect(() => {
    if (viewMode === 'customer') {
      setPanelOpen(false);
    }
  }, [viewMode]);

  // Handle zoom to new customer location after registration
  useEffect(() => {
    const zoomToLocation = location.state?.zoomToLocation;
    if (zoomToLocation && map.current && mapReady) {
      const { latitude, longitude, name } = zoomToLocation;
      console.log('🎯 Zooming to new customer:', { name, latitude, longitude });
      
      setTimeout(() => {
        map.current.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          duration: 2500,
          essential: true
        });

        setTimeout(() => {
          const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false })
            .setLngLat([longitude, latitude])
            .setHTML(`
              <div style="padding: 16px;">
                <h3 style="margin: 0 0 8px 0;">Welcome to Mapplot!</h3>
                <p style="margin: 0;"><strong>${name}</strong></p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">
                  Your location has been added to the map.
                </p>
              </div>
            `)
            .addTo(map.current);
          
          setTimeout(() => popup.remove(), 8000);
        }, 2600);
      }, 2000);

      window.history.replaceState({}, document.title);
    }
  }, [location.state, mapReady, map]);

  // Track map zoom
  useEffect(() => {
    if (!map.current) return;
    const handleMove = () => setMapZoom(map.current.getZoom());
    map.current.on('move', handleMove);
    return () => map.current?.off('move', handleMove);
  }, [map]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNavDropdown && !event.target.closest('.nav-dropdown-container')) {
        setShowNavDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNavDropdown]);

  // Geocode zip code and calculate customers in radius
  useEffect(() => {
    if (!zipQuery || zipQuery.length !== 5) {
      setZipCoordinates(null);
      setZipRadiusCount(null);
      return;
    }

    const geocodeZip = async () => {
      try {
        console.log('🔍 Geocoding zip code:', zipQuery);
        
        // Use OpenStreetMap Nominatim API to geocode US zip code
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?postalcode=${zipQuery}&country=United States&format=json&limit=1`,
          {
            headers: {
              'User-Agent': 'CustomerAtlasCRM/1.0'
            }
          }
        );
        const data = await response.json();
        
        console.log('📍 Geocoding response:', data);
        
        if (data && data.length > 0) {
          const coords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
          setZipCoordinates(coords);
          
          console.log('📌 Zip coordinates:', coords);
          console.log('👥 Total sites (all customers):', sites.length);
          console.log('👥 Total filtered sites (by other filters):', filteredSites.length);
          console.log('📏 Radius in miles:', zipRadius);

          // Calculate customers within radius
          // Important: Use 'sites' (not filteredSites) to include customers from ALL zip codes
          // but still apply other filters (states, products, statuses, dates)
          const radiusInMeters = zipRadius * 1609.34; // Convert miles to meters
          console.log('📏 Radius in meters:', radiusInMeters);
          
          // Filter by radius from ALL customers (not just matching zip code)
          // but respect the other filters (selectedStates, selectedProducts, etc)
          const customersInRadius = sites.filter(site => {
            // Check if customer has coordinates
            if (!site.latitude || !site.longitude) {
              return false;
            }
            
            // Apply state filter if any
            if (selectedStates.length && !selectedStates.includes(site.state)) {
              return false;
            }
            
            // Apply status filter if any
            if (statuses.size && !statuses.has(site.status)) {
              return false;
            }
            
            // Apply product filter if any
            if (selectedProducts.length) {
              const prods = Array.isArray(site['product(s)_interested']) 
                ? site['product(s)_interested'] 
                : [];
              const prodsLower = new Set(prods.map(p => String(p).toLowerCase()));
              const selLower = selectedProducts.map(p => p.toLowerCase());
              const hasAny = selLower.some(sel => prodsLower.has(sel));
              if (!hasAny) return false;
            }
            
            // Calculate distance
            const distance = getDistance(
              coords.lat, coords.lng,
              site.latitude, site.longitude
            );
            const isInRadius = distance <= radiusInMeters;
            
            if (isInRadius) {
              console.log('✅ Customer in radius:', site.name || site.id, 
                'Zip:', site.zip_code,
                'Distance:', (distance / 1609.34).toFixed(2), 'miles');
            }
            
            return isInRadius;
          });

          console.log('✨ Customers in radius count:', customersInRadius.length);
          setZipRadiusCount(customersInRadius.length);

          // Fly to zip code location with appropriate zoom to fit radius
          if (map.current && mapReady) {
            // Calculate zoom level based on radius to fit the entire circle in view
            // Using logarithmic scale: smaller radius = higher zoom, larger radius = lower zoom
            // Formula ensures the entire radius circle is visible
            const zoomLevel = Math.max(6, Math.min(13, 13 - Math.log2(zipRadius / 5)));
            
            console.log('🔍 Calculated zoom level:', zoomLevel, 'for radius:', zipRadius, 'miles');
            
            map.current.flyTo({
              center: [coords.lng, coords.lat],
              zoom: zoomLevel,
              duration: 1500,
              padding: { top: 100, bottom: 100, left: 450, right: 100 } // Account for filter panel
            });
          }
        } else {
          console.warn('❌ No geocoding results for zip:', zipQuery);
          setZipCoordinates(null);
          setZipRadiusCount(0);
        }
      } catch (error) {
        console.error('❌ Error geocoding zip code:', error);
        setZipCoordinates(null);
        setZipRadiusCount(null);
      }
    };

    // Add a small delay to avoid rate limiting
    const timeoutId = setTimeout(geocodeZip, 300);
    return () => clearTimeout(timeoutId);
  }, [zipQuery, zipRadius, sites, filteredSites, selectedStates, selectedProducts, statuses, map, mapReady]);

  // Draw radius circle on map
  useEffect(() => {
    if (!map.current || !mapReady || !zipCoordinates) {
      // Remove existing circle layers if they exist
      if (map.current && map.current.getLayer('zip-radius-circle')) {
        map.current.removeLayer('zip-radius-circle');
        map.current.removeLayer('zip-radius-outline');
      }
      if (map.current && map.current.getSource('zip-radius')) {
        map.current.removeSource('zip-radius');
      }
      return;
    }

    const radiusInMeters = zipRadius * 1609.34;
    const circle = createGeoJSONCircle([zipCoordinates.lng, zipCoordinates.lat], radiusInMeters);

    // Remove existing layers and source
    if (map.current.getLayer('zip-radius-circle')) {
      map.current.removeLayer('zip-radius-circle');
      map.current.removeLayer('zip-radius-outline');
    }
    if (map.current.getSource('zip-radius')) {
      map.current.removeSource('zip-radius');
    }

    // Add source and layers
    map.current.addSource('zip-radius', {
      type: 'geojson',
      data: circle
    });

    map.current.addLayer({
      id: 'zip-radius-circle',
      type: 'fill',
      source: 'zip-radius',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.15
      }
    });

    map.current.addLayer({
      id: 'zip-radius-outline',
      type: 'line',
      source: 'zip-radius',
      paint: {
        'line-color': '#3b82f6',
        'line-width': 3,
        'line-opacity': 0.8
      }
    });

    return () => {
      if (map.current) {
        if (map.current.getLayer('zip-radius-circle')) {
          map.current.removeLayer('zip-radius-circle');
          map.current.removeLayer('zip-radius-outline');
        }
        if (map.current.getSource('zip-radius')) {
          map.current.removeSource('zip-radius');
        }
      }
    };
  }, [zipCoordinates, zipRadius, map, mapReady]);

  const panelScale = Math.min(1.08, Math.max(0.92, 0.92 + (mapZoom - 3) * 0.04));

  // Handler for quick email to zipcode area
  const handleQuickEmailToArea = useCallback(() => {
    console.log('📧 Quick email clicked - checking displayed sites:', displayedSites.length);
    console.log('📧 Sample displayed site:', displayedSites[0]);
    
    // Get customers with valid emails from the displayed sites
    const recipientsWithEmail = displayedSites.filter(site => site.email && site.email.trim());
    
    console.log('📧 Customers with valid email:', recipientsWithEmail.length);
    if (recipientsWithEmail.length > 0) {
      console.log('📧 Sample recipient:', {
        name: recipientsWithEmail[0].name,
        email: recipientsWithEmail[0].email,
        city: recipientsWithEmail[0].city
      });
    }
    
    if (recipientsWithEmail.length === 0) {
      alert('No customers with valid email addresses found in this area.');
      return;
    }
    
    console.log('📧 Opening email composer for', recipientsWithEmail.length, 'customers in zipcode area');
    setEmailRecipients(recipientsWithEmail);
    setShowEmailComposer(true);
  }, [displayedSites]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Loading sites data...
    </div>;
  }

  if (error) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'red' }}>
      Error loading sites: {error}
    </div>;
  }

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Floating Navigation Menu */}
      <div className="nav-dropdown-container" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1001 }}>
        <button
          onClick={() => setShowNavDropdown(!showNavDropdown)}
          style={{
            padding: '12px',
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(8px)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s ease',
            width: '48px',
            height: '48px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.95)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showNavDropdown && (
          <div
            style={{
              position: 'absolute',
              top: '56px',
              right: '0',
              minWidth: '200px',
              background: 'rgba(30, 41, 59, 0.98)',
              backdropFilter: 'blur(12px)',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
              animation: 'slideDown 0.2s ease'
            }}
          >
            <button
              onClick={() => {
                navigate('/');
                setShowNavDropdown(false);
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background 0.2s ease',
                textAlign: 'left',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
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
              onClick={() => {
                navigate('/customers');
                setShowNavDropdown(false);
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background 0.2s ease',
                textAlign: 'left',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
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
              onClick={() => {
                navigate('/analytics');
                setShowNavDropdown(false);
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background 0.2s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              Analytics
            </button>

            <button
              onClick={() => {
                navigate('/tasks');
                setShowNavDropdown(false);
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background 0.2s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Tasks
            </button>
          </div>
        )}
      </div>

      {/* Floating FAB when panel is closed (hide in customer mode) */}
      {!panelOpen && viewMode === 'admin' && (
        <button
          onClick={() => setPanelOpen(true)}
          className="fab-open"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 998
          }}
        >
          <span className="fab-dot" /> Filters
        </button>
      )}

      {/* Filter Panel - only show in admin mode */}
      {viewMode === 'admin' && (
        <FilterPanel
          panelOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          panelScale={panelScale}
          selectedStates={selectedStates}
          setSelectedStates={setSelectedStates}
          stateOptions={stateOptions}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
          productOptions={productOptions}
          availableProducts={availableProducts}
          zipQuery={zipQuery}
          setZipQuery={setZipQuery}
          zipRadius={zipRadius}
          setZipRadius={setZipRadius}
          zipRadiusCount={zipRadiusCount}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          statuses={statuses}
          setStatuses={setStatuses}
          filteredCount={filteredSites.length}
          totalCount={sites.length}
          onReset={resetFilters}
          getProductColor={getProductColor}
          onQuickEmailToArea={handleQuickEmailToArea}
          displayedSites={displayedSites}
        />
      )}

      {/* Email Composer Modal */}
      {showEmailComposer && (
        <EmailComposer
          customers={emailRecipients}
          isBulk={true}
          onClose={() => {
            setShowEmailComposer(false);
            setEmailRecipients([]);
          }}
          onSendComplete={() => {
            console.log('✅ Bulk emails sent successfully');
          }}
        />
      )}

      {/* Map Container - Full Screen */}
      <div 
        ref={mapContainer} 
        className="map-container" 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100vh',
          background: '#f0f0f0',
          zIndex: 0
        }}
      />
    </div>
  );
}

export default MapViewPage;

