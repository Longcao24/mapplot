import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { MAP_DEFAULTS } from '../constants/maps';
import { initializeMapLayers, createClusterClickHandlers, createPointClickHandler } from '../utils/mapLayers';

/**
 * Custom hook for managing MapLibre map instance and updates
 * Handles map initialization, layer setup, and data updates
 */
export const useMapManager = (activeTab, filteredFeatures) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const clusterIndex = useRef(null);
  const listenerAttached = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [mapInitRetry, setMapInitRetry] = useState(0);
  const [mapZoom, setMapZoom] = useState(MAP_DEFAULTS.zoom);

  // Setup map once - wait for container to be ready and map tab to be active
  useEffect(() => {
    // Only prevent initialization if map already exists
    if (map.current) return;
    
    // Only init when on map tab
    if (activeTab !== 'map') {
      console.warn('⚠️ Not on map tab yet, waiting...');
      return;
    }
    
    // Wait for map container to be rendered (ref attachment can be delayed)
    if (!mapContainer.current) {
      console.warn('⚠️ Map container not ready yet (retry:', mapInitRetry, ') - scheduling retry');
      // Retry after a short delay (max 10 retries)
      if (mapInitRetry < 10) {
        const timer = setTimeout(() => {
          setMapInitRetry(prev => prev + 1);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        console.error('❌ Map container failed to initialize after 10 retries');
      }
      return;
    }

    console.log('🗺️ Initializing map');

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: {
            'carto-light': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors © CARTO',
              maxzoom: 19
            }
          },
          layers: [{
            id: 'carto-light-layer',
            type: 'raster',
            source: 'carto-light',
            minzoom: 0,
            maxzoom: 19
          }]
        },
        center: MAP_DEFAULTS.center,
        zoom: MAP_DEFAULTS.zoom
      });

      console.log('✅ Map instance created');

      // Add error handler to suppress non-critical tile errors
      map.current.on('error', (e) => {
        // Only log non-tile errors (tile errors are usually just 404s for tiles outside view)
        if (e && !e.tile) {
          console.warn('Map error (non-tile):', e.error?.message || e);
        }
        // Silently ignore tile loading errors - they don't affect functionality
      });
    } catch (error) {
      console.error('❌ Failed to initialize map:', error);
      return;
    }

    map.current.on('move', () => {
      if (map.current) setMapZoom(map.current.getZoom());
    });

    map.current.on("load", () => {
      console.log('🎉 Map loaded event fired!');
      setMapReady(true);

      // Initialize map layers and sources
      initializeMapLayers(map.current);

      // Setup click handlers
      const { handleClusterClick, handlePointClick } = createClusterClickHandlers(map, clusterIndex);
      const pointClickHandler = createPointClickHandler(map);

      // Attach cluster click handlers
      map.current.on("click", "clusters-sate", (e) => handleClusterClick(e, "clusters-sate", "favorites-sate"));
      map.current.on("click", "clusters-audiosight", (e) => handleClusterClick(e, "clusters-audiosight", "favorites-audiosight"));
      map.current.on("click", "clusters-other", (e) => handleClusterClick(e, "clusters-other", "favorites-other"));

      // Old cluster handler for backward compatibility (not used anymore)
      map.current.on("click", "clusters", handlePointClick);

      // Attach click handlers to all point layers
      map.current.on("click", "points-sate", pointClickHandler);
      map.current.on("click", "points-audiosight", pointClickHandler);
      map.current.on("click", "points-other", pointClickHandler);

      console.log('🎊 Map initialization complete! Ready to display data.');
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      listenerAttached.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, mapInitRetry]); // Re-run when tab changes or retry counter increments

  // Update map data - split features by product type into separate sources
  const refreshSafe = useCallback((features) => {
    if (!map.current) {
      console.warn('⚠️ refreshSafe: map.current is null');
      return;
    }
    if (!mapReady) {
      console.warn('⚠️ refreshSafe: map not ready yet');
      return;
    }
    
    // Split features into 3 groups by color/product
    const sateFeatures = features.filter(f => f.properties.color === '#3b82f6'); // Blue - SATE
    const audiosightFeatures = features.filter(f => f.properties.color === '#ef4444'); // Red - AudioSight
    const otherFeatures = features.filter(f => 
      f.properties.color !== '#3b82f6' && f.properties.color !== '#ef4444'
    );

    console.log(`🗺️ Updating map: ${sateFeatures.length} SATE (blue), ${audiosightFeatures.length} AudioSight (red), ${otherFeatures.length} other`);

    try {
      // Update SATE source (blue clusters)
      const srcSATE = map.current.getSource('favorites-sate');
      if (srcSATE) {
        srcSATE.setData({ type: 'FeatureCollection', features: sateFeatures });
        console.log('✅ Updated SATE source');
      } else {
        console.error('❌ SATE source not found - map may not be fully loaded');
      }

      // Update AudioSight source (red clusters)
      const srcAudioSight = map.current.getSource('favorites-audiosight');
      if (srcAudioSight) {
        srcAudioSight.setData({ type: 'FeatureCollection', features: audiosightFeatures });
        console.log('✅ Updated AudioSight source');
      } else {
        console.error('❌ AudioSight source not found - map may not be fully loaded');
      }

      // Update Other source (green/other clusters)
      const srcOther = map.current.getSource('favorites-other');
      if (srcOther) {
        srcOther.setData({ type: 'FeatureCollection', features: otherFeatures });
        console.log('✅ Updated Other source');
      } else {
        console.error('❌ Other source not found - map may not be fully loaded');
      }
    } catch (e) {
      console.error('❌ Error updating map sources:', e);
    }
  }, [mapReady]);

  // Update map when filtered features change
  useEffect(() => {
    if (!mapReady || !map.current) {
      console.log('⏳ Waiting for map to be ready...');
      return;
    }

    if (!filteredFeatures.length) {
      console.log('📍 No features to display');
      refreshSafe([]);
      return;
    }

    // Validate features
    const validFeatures = filteredFeatures.filter(f => {
      if (!f || !f.geometry || !f.geometry.coordinates) return false;
      const [lng, lat] = f.geometry.coordinates;
      return Number.isFinite(lng) && Number.isFinite(lat) &&
             lng >= -180 && lng <= 180 &&
             lat >= -90 && lat <= 90;
    });

    if (validFeatures.length === 0) {
      console.warn('⚠️ No valid features to display');
      refreshSafe([]);
      return;
    }

    if (validFeatures.length < filteredFeatures.length) {
      console.warn(`⚠️ Filtered out ${filteredFeatures.length - validFeatures.length} invalid features`);
    }

    console.log(`✅ Displaying ${validFeatures.length} valid features on map`);
    
    // Update map with features - clustering is now handled by MapLibre automatically
    refreshSafe(validFeatures);
    
  }, [filteredFeatures, mapReady, refreshSafe]);

  return {
    mapContainer,
    map,
    mapReady,
    mapZoom
  };
};



