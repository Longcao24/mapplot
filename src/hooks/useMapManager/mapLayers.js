/**
 * Map layers configuration
 * Creates and configures all map sources and layers
 */

export function createMapLayers(map) {
  // Create 3 separate sources for each product type
  
  // Source 1: SATE (Blue clusters)
  map.addSource("favorites-sate", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterRadius: 25,
    clusterMaxZoom: 16
  });

  // Source 2: AudioSight (Red clusters)
  map.addSource("favorites-audiosight", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterRadius: 25,
    clusterMaxZoom: 16
  });

  // Source 3: Other products (default color clusters)
  map.addSource("favorites-other", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterRadius: 25,
    clusterMaxZoom: 16
  });

  console.log('✅ All 3 map sources created');

  // === SATE BLUE CLUSTERS ===
  map.addLayer({
    id: "clusters-sate",
    type: "circle",
    source: "favorites-sate",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "interpolate", ["linear"], ["get", "point_count"],
        2, "#dbeafe", 5, "#93c5fd", 10, "#60a5fa",
        25, "#3b82f6", 50, "#2563eb", 100, "#1d4ed8", 200, "#1e40af"
      ],
      "circle-radius": [
        "interpolate", ["linear"], ["get", "point_count"],
        2, 15, 10, 20, 50, 25, 100, 30
      ],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2,
      "circle-opacity": 0.85
    }
  });

  map.addLayer({
    id: "cluster-count-sate",
    type: "symbol",
    source: "favorites-sate",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 13,
      "text-font": ["Noto Sans Regular"]
    },
    paint: { "text-color": "#ffffff" }
  });

  // === AUDIOSIGHT RED CLUSTERS ===
  map.addLayer({
    id: "clusters-audiosight",
    type: "circle",
    source: "favorites-audiosight",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "interpolate", ["linear"], ["get", "point_count"],
        2, "#fee2e2", 5, "#fca5a5", 10, "#f87171",
        25, "#ef4444", 50, "#dc2626", 100, "#b91c1c", 200, "#991b1b"
      ],
      "circle-radius": [
        "interpolate", ["linear"], ["get", "point_count"],
        2, 15, 10, 20, 50, 25, 100, 30
      ],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2,
      "circle-opacity": 0.9
    }
  });

  map.addLayer({
    id: "cluster-count-audiosight",
    type: "symbol",
    source: "favorites-audiosight",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 13,
      "text-font": ["Noto Sans Regular"]
    },
    paint: { "text-color": "#ffffff" }
  });

  // === OTHER PRODUCTS CLUSTERS ===
  map.addLayer({
    id: "clusters-other",
    type: "circle",
    source: "favorites-other",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "interpolate", ["linear"], ["get", "point_count"],
        2, "#d1fae5", 5, "#6ee7b7", 10, "#34d399",
        25, "#10b981", 50, "#059669", 100, "#047857", 200, "#065f46"
      ],
      "circle-radius": [
        "interpolate", ["linear"], ["get", "point_count"],
        2, 15, 10, 20, 50, 25, 100, 30
      ],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2,
      "circle-opacity": 0.85
    }
  });

  map.addLayer({
    id: "cluster-count-other",
    type: "symbol",
    source: "favorites-other",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 13,
      "text-font": ["Noto Sans Regular"]
    },
    paint: { "text-color": "#ffffff" }
  });

  // Individual point layers for each product type
  map.addLayer({
    id: "points-sate",
    type: "circle",
    source: "favorites-sate",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": "#3b82f6",
      "circle-radius": ["get", "size"],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 1.5,
      "circle-opacity": 0.9
    }
  });

  map.addLayer({
    id: "points-audiosight",
    type: "circle",
    source: "favorites-audiosight",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": "#ef4444",
      "circle-radius": ["+", ["get", "size"], 2],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2.5,
      "circle-opacity": 1
    }
  });

  map.addLayer({
    id: "points-other",
    type: "circle",
    source: "favorites-other",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": ["get", "size"],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 1.5
    }
  });

  console.log('✅ All map layers created');
}

