import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapComp = forwardRef((props, ref) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  useEffect(() => {
    if (map.current) return; // Prevent reinitialization

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
              'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: 'carto-light-layer',
            type: 'raster',
            source: 'carto-light',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [-98.5, 39.8], // Default center (USA)
      zoom: 3, // Default zoom level
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    zoomToLocation: (latitude, longitude) => {
      if (map.current) {
        map.current.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          essential: true,
        });

        // Add or update the marker
        if (!marker.current) {
          marker.current = new maplibregl.Marker()
            .setLngLat([longitude, latitude])
            .addTo(map.current);
        } else {
          marker.current.setLngLat([longitude, latitude]);
        }
      }
    },
  }));

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '400px',
        marginTop: '20px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    ></div>
  );
});

export default MapComp;