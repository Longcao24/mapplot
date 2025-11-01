import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { createMapLayers } from './mapLayers';
import { attachMapHandlers } from './mapHandlers';
import { toFeatures } from './mapUtils';

/**
 * useMapManager Hook
 * Manages map initialization, layers, and data updates
 * Max lines: 250 (per complex hook rules)
 */
export function useMapManager(mapContainer, filteredSites, getProductType, getProductColor) {
  const map = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapInitRetry, setMapInitRetry] = useState(0);

  // Convert sites to GeoJSON features
  const filteredFeatures = useMemo(() => {
    return toFeatures(filteredSites, getProductType, getProductColor);
  }, [filteredSites, getProductType, getProductColor]);

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    
    // Wait for map container to be rendered
    if (!mapContainer || !mapContainer.current) {
      console.warn('⚠️ Map container ref not ready yet (retry:', mapInitRetry, ')');
      if (mapInitRetry < 10) {
        const timer = setTimeout(() => setMapInitRetry(prev => prev + 1), 100);
        return () => clearTimeout(timer);
      }
      console.error('❌ Map container failed to initialize after 10 retries');
      return;
    }

    console.log('🗺️ Initializing map...');

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
        center: [-98.5, 39.8],
        zoom: 3
      });

      console.log('✅ Map instance created');

      map.current.on('error', (e) => {
        if (e && !e.tile) {
          console.warn('Map error (non-tile):', e.error?.message || e);
        }
      });

      map.current.on('load', () => {
        console.log('🎉 Map loaded event fired!');
        setMapReady(true);

        // Create map layers and sources
        createMapLayers(map.current);

        // Attach event handlers
        attachMapHandlers(map.current);

        console.log('🎊 Map initialization complete!');
      });

    } catch (error) {
      console.error('❌ Failed to initialize map:', error);
      return;
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInitRetry]);

  // Update map data when features change
  const updateMapData = useCallback((features) => {
    if (!map.current || !mapReady) {
      console.warn('⚠️ Map not ready for data update');
      return;
    }

    // Split features by product type
    const sateFeatures = features.filter(f => f.properties.color === '#3b82f6');
    const audiosightFeatures = features.filter(f => f.properties.color === '#ef4444');
    const otherFeatures = features.filter(f => 
      f.properties.color !== '#3b82f6' && f.properties.color !== '#ef4444'
    );

    console.log(`🗺️ Updating map: ${sateFeatures.length} SATE, ${audiosightFeatures.length} AudioSight, ${otherFeatures.length} other`);

    try {
      const srcSATE = map.current.getSource('favorites-sate');
      if (srcSATE) {
        srcSATE.setData({ type: 'FeatureCollection', features: sateFeatures });
      }

      const srcAudioSight = map.current.getSource('favorites-audiosight');
      if (srcAudioSight) {
        srcAudioSight.setData({ type: 'FeatureCollection', features: audiosightFeatures });
      }

      const srcOther = map.current.getSource('favorites-other');
      if (srcOther) {
        srcOther.setData({ type: 'FeatureCollection', features: otherFeatures });
      }
    } catch (e) {
      console.error('❌ Error updating map sources:', e);
    }
  }, [mapReady]);

  // Update map when filtered features change
  useEffect(() => {
    if (!mapReady || !map.current) return;

    const validFeatures = filteredFeatures.filter(f => {
      if (!f || !f.geometry || !f.geometry.coordinates) return false;
      const [lng, lat] = f.geometry.coordinates;
      return Number.isFinite(lng) && Number.isFinite(lat) &&
             lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
    });

    if (validFeatures.length === 0) {
      updateMapData([]);
      return;
    }

    console.log(`✅ Displaying ${validFeatures.length} valid features on map`);
    updateMapData(validFeatures);
  }, [filteredFeatures, mapReady, updateMapData]);

  return {
    map,
    mapReady,
    filteredFeatures,
    updateMapData
  };
}

