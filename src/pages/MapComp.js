import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapComp = forwardRef((props, ref) => {
  const { sites = [] } = props; // Accept sites as a prop
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]); // Store markers

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

  useEffect(() => {
    // Remove existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add new markers for sites
    if (map.current && sites.length > 0) {
      sites.forEach((site) => {
        if (site.latitude && site.longitude) {
          // Extract first name and last initial
        const [firstName, lastName] = site.name.split(' ');
        const lastInitial = lastName ? `${lastName.charAt(0)}.` : '';
          const marker = new maplibregl.Marker()
            .setLngLat([site.longitude, site.latitude])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setText(
                `${firstName} ${lastInitial} (${site.city}, ${site.state})`
              )
            )
            .addTo(map.current);

          markers.current.push(marker);
        }
      });
    }
  }, [sites]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    zoomToLocation: (latitude, longitude) => {
      if (map.current) {
        map.current.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          essential: true,
        });
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