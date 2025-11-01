/**
 * Map utility functions
 * Helpers for processing map data
 */

/**
 * Convert sites data to GeoJSON features
 */
export function toFeatures(sitesData, getProductType, getProductColor) {
  if (!Array.isArray(sitesData)) {
    console.warn('toFeatures received non-array data:', sitesData);
    return [];
  }

  const getStatusSize = (status) => {
    switch (status) {
      case 'customer': return 12;
      case 'prospect': return 10;
      case 'lead': return 8;
      default: return 8;
    }
  };

  const features = sitesData
    .filter(site => {
      const lat = parseFloat(site.latitude);
      const lng = parseFloat(site.longitude);
      const isValid = !isNaN(lat) && !isNaN(lng) && 
             lat >= -90 && lat <= 90 && 
             lng >= -180 && lng <= 180;
      
      if (!isValid) {
        console.warn('Filtering out site with invalid coordinates:', {
          id: site.id,
          name: site.name,
          lat: site.latitude,
          lng: site.longitude
        });
      }
      
      return isValid;
    })
    .map(site => {
      const productType = getProductType(site["product(s)_interested"]);
      const color = getProductColor(productType);
      const size = getStatusSize(site.status);
      
      if (productType.toLowerCase() === 'audiosight') {
        console.log('🔴 Creating AudioSight feature:', {
          name: site.name,
          city: site.city,
          productType,
          color
        });
      }
      
      const feature = {
        type: "Feature",
        properties: {
          id: site.id,
          customer_id: site.customer_id,
          name: site.name,
          address: site.address,
          city: site.city,
          state: site.state,
          zip_code: site.zip_code,
          "product(s)_interested": site["product(s)_interested"],
          registered_at: site.registered_at,
          status: site.status,
          customer_type: site.customer_type,
          source_system: site.source_system,
          productType: productType,
          color: color,
          size: size
        },
        geometry: {
          type: "Point",
          coordinates: [parseFloat(site.longitude), parseFloat(site.latitude)]
        }
      };

      // Validate feature structure
      if (!feature.geometry || !feature.geometry.coordinates || 
          feature.geometry.coordinates.length !== 2 ||
          !Number.isFinite(feature.geometry.coordinates[0]) ||
          !Number.isFinite(feature.geometry.coordinates[1])) {
        console.error('Invalid feature created:', feature);
        return null;
      }

      return feature;
    })
    .filter(feature => feature !== null);

  console.log(`Created ${features.length} valid GeoJSON features from ${sitesData.length} sites`);
  return features;
}

