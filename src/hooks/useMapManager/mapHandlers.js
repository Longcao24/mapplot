import maplibregl from 'maplibre-gl';
import { createClusterPopupHTML, createCustomerPopupHTML } from './popupTemplates';

/**
 * Attach event handlers to map
 */
export function attachMapHandlers(map) {
  const popup = new maplibregl.Popup({ 
    closeButton: false, 
    closeOnClick: false,
    maxWidth: '500px',
    className: 'cluster-popup'
  });

  // Global function to show customer details
  window.showCustomerDetails = (feature) => {
    const [fLng, fLat] = feature.geometry.coordinates;
    const customerPopupHTML = createCustomerPopupHTML(feature);

    const newPopup = new maplibregl.Popup({ 
      closeButton: false, 
      closeOnClick: false,
      maxWidth: '500px',
      className: 'cluster-popup'
    });

    newPopup.setLngLat([fLng, fLat])
           .setHTML(customerPopupHTML)
           .addTo(map);
  };

  // Cluster click handler
  const handleClusterClick = (e, layerId, sourceName) => {
    if (window.viewMode === 'customer') {
      console.log('👁️ Customer view mode: cluster interaction disabled');
      return;
    }
    
    const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
    if (!features || !features.length) return;
    
    const clId = features[0]?.properties?.cluster_id;
    const pointCount = features[0]?.properties?.point_count;
    if (clId == null) return;
    
    const [lng, lat] = features[0].geometry.coordinates;
    const source = map.getSource(sourceName);
    if (!source) return;
    
    source.getClusterLeaves(clId, pointCount, 0, (err, clusterFeatures) => {
      if (err) {
        console.error('❌ Error getting cluster leaves:', err);
        return;
      }
      
      window.clusterFeatures = clusterFeatures;
      
      source.getClusterExpansionZoom(clId, (err, expansionZoom) => {
        const zoomLevel = err ? map.getZoom() + 2 : expansionZoom;
        const popupContent = createClusterPopupHTML(clusterFeatures, lng, lat, zoomLevel);
        
        window.mapInstance = map;
        
        popup.setLngLat([lng, lat])
             .setHTML(popupContent)
             .addTo(map);
      });
    });
  };

  // Point click handler
  const handlePointClick = (e) => {
    if (window.viewMode === 'customer') {
      console.log('👁️ Customer view mode: point interaction disabled');
      return;
    }
    
    const feature = e.features?.[0];
    if (!feature) return;

    const [lng, lat] = feature.geometry.coordinates;
    const allPointLayers = ['points-sate', 'points-audiosight', 'points-other'];
    let allFeaturesAtLocation = [];
    
    allPointLayers.forEach(layerId => {
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (features && features.length > 0) {
        const featuresAtSameLocation = features.filter(f => {
          const [fLng, fLat] = f.geometry.coordinates;
          return Math.abs(fLng - lng) < 0.0001 && Math.abs(fLat - lat) < 0.0001;
        });
        allFeaturesAtLocation = allFeaturesAtLocation.concat(featuresAtSameLocation);
      }
    });

    if (allFeaturesAtLocation.length > 2) {
      window.locationFeatures = allFeaturesAtLocation;
      
      const tableRows = allFeaturesAtLocation.map((f, idx) => {
        const status = f.properties.status;
        const statusColor = status === 'customer' ? '#10b981' : status === 'prospect' ? '#f59e0b' : '#6b7280';
        const statusBgColor = status === 'customer' ? '#d1fae5' : status === 'prospect' ? '#fef3c7' : '#f3f4f6';
        const productType = f.properties.productType || 'Unknown';
        const name = f.properties.name || 'Customer';
        const registered = f.properties.registered_at 
          ? new Date(f.properties.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'N/A';

        return `
          <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" 
              onmouseover="this.style.background='#eff6ff'"
              onmouseout="this.style.background='white'"
              onclick="
                const features = window.locationFeatures;
                const clickedFeature = features[${idx}];
                if (!clickedFeature) return;
                this.closest('.maplibregl-popup').remove();
                window.showCustomerDetails(clickedFeature);
              ">
            <td style="padding: 12px 6px; color: #6b7280; font-weight: 600;">${idx + 1}</td>
            <td style="padding: 12px 8px;">
              <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${name}</div>
              <div style="font-size: 11px; color: #6b7280;">${f.properties.city || ''}, ${f.properties.state || ''}</div>
            </td>
            <td style="padding: 12px 6px;">
              <span style="background: ${f.properties.color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${productType}</span>
            </td>
            <td style="padding: 12px 6px;">
              <span style="background: ${statusBgColor}; color: ${statusColor}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize;">${status || 'Unknown'}</span>
            </td>
            <td style="padding: 12px 6px; color: #374151; font-size: 11px;">${registered}</td>
          </tr>
        `;
      }).join('');

      const locationPopupContent = `
        <div style="font-family: system-ui, sans-serif; max-width: 550px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Multiple Customers at Location</h3>
              <div style="font-size: 12px; color: #6b7280;">${feature.properties.address || ''}, ${feature.properties.city || ''}, ${feature.properties.state || ''}</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <span style="background: #3b82f6; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${allFeaturesAtLocation.length} customers</span>
              <button onclick="this.closest('.maplibregl-popup').remove()" style="background: #f3f4f6; border: none; font-size: 16px; cursor: pointer; color: #6b7280; padding: 4px 8px; border-radius: 6px;">✕</button>
            </div>
          </div>
          <div style="max-height: 400px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead style="position: sticky; top: 0; background: #f8fafc;">
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 10px 6px; text-align: left; font-weight: 600; color: #374151; font-size: 11px;">#</th>
                  <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; font-size: 11px;">Customer</th>
                  <th style="padding: 10px 6px; text-align: left; font-weight: 600; color: #374151; font-size: 11px;">Product</th>
                  <th style="padding: 10px 6px; text-align: left; font-weight: 600; color: #374151; font-size: 11px;">Status</th>
                  <th style="padding: 10px 6px; text-align: left; font-weight: 600; color: #374151; font-size: 11px;">Date</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280;">
            💡 Tip: Click on any row to see detailed customer information
          </div>
        </div>
      `;

      popup.setLngLat([lng, lat])
           .setHTML(locationPopupContent)
           .addTo(map);
      
      return;
    }

    // Single customer - show detailed popup
    const customerPopupHTML = createCustomerPopupHTML(feature);
    popup.setLngLat([lng, lat])
         .setHTML(customerPopupHTML)
         .addTo(map);
  };

  // Attach cluster click handlers
  map.on("click", "clusters-sate", (e) => {
    e.preventDefault();
    handleClusterClick(e, "clusters-sate", "favorites-sate");
  });
  map.on("click", "clusters-audiosight", (e) => {
    e.preventDefault();
    handleClusterClick(e, "clusters-audiosight", "favorites-audiosight");
  });
  map.on("click", "clusters-other", (e) => {
    e.preventDefault();
    handleClusterClick(e, "clusters-other", "favorites-other");
  });

  // Attach point click handlers
  map.on("click", "points-sate", handlePointClick);
  map.on("click", "points-audiosight", handlePointClick);
  map.on("click", "points-other", handlePointClick);

  // Add cursor pointer on hover (only in admin mode)
  const clusterLayers = ['clusters-sate', 'clusters-audiosight', 'clusters-other'];
  const pointLayers = ['points-sate', 'points-audiosight', 'points-other'];
  
  [...clusterLayers, ...pointLayers].forEach(layerId => {
    map.on('mouseenter', layerId, () => {
      if (window.viewMode === 'admin') {
        map.getCanvas().style.cursor = 'pointer';
      }
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  });

  console.log('✅ All event handlers attached');
}

