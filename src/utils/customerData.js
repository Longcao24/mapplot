import { PRODUCT_COLOR_MAP, COLOR_PALETTE, MULTIPLE_PRODUCTS_TYPE, MULTIPLE_PRODUCTS_COLOR, STATUS_SIZES } from '../constants/maps';

/**
 * Normalize products from various formats to array
 */
export const normalizeProducts = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const maybeArr = JSON.parse(raw);
      return Array.isArray(maybeArr) ? maybeArr : [raw];
    } catch {
      return [raw];
    }
  }
  if (raw != null) return [String(raw)];
  return [];
};

/**
 * STRICT date parser: allow ONLY "yyyy" or "mm-dd-yyyy"
 */
export const parseFlexibleDate = (str, isEnd) => {
  if (!str || !str.trim()) return null;
  const s = str.trim();

  // yyyy
  if (/^\d{4}$/.test(s)) {
    const y = parseInt(s, 10);
    return isEnd
      ? new Date(y, 11, 31, 23, 59, 59, 999).getTime()
      : new Date(y, 0, 1, 0, 0, 0, 0).getTime();
  }

  // mm-dd-yyyy
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const mm = Math.max(1, Math.min(12, parseInt(m[1], 10))) - 1;
    const dd = Math.max(1, Math.min(31, parseInt(m[2], 10)));
    const yy = parseInt(m[3], 10);
    return new Date(yy, mm, dd, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, isEnd ? 999 : 0).getTime();
  }

  // anything else is invalid -> don't apply a date filter
  return null;
};

/**
 * Helper function to determine product type for coloring
 */
export const getProductType = (productsRaw, availableProducts) => {
  const products = normalizeProducts(productsRaw).map(p => {
    // Normalize product names to match available products (case-insensitive)
    const productName = String(p);
    const matchedProduct = availableProducts.find(ap => 
      ap.name.toLowerCase() === productName.toLowerCase()
    );
    return matchedProduct ? matchedProduct.name : productName;
  });
  
  // Check if we have multiple products from our available list (case-insensitive)
  const matchedProducts = products.filter(p => 
    availableProducts.some(ap => ap.name.toLowerCase() === p.toLowerCase())
  );
  
  if (matchedProducts.length > 1) return MULTIPLE_PRODUCTS_TYPE;
  if (matchedProducts.length === 1) return matchedProducts[0];
  return products.length > 0 ? products[0] : 'Other';
};

/**
 * Helper function to get color based on product type
 */
export const getProductColor = (productType, availableProducts) => {
  // Special handling for Multiple Products
  if (productType === MULTIPLE_PRODUCTS_TYPE) return MULTIPLE_PRODUCTS_COLOR;
  
  // Assign specific colors to known products (case-insensitive)
  const productLower = productType.toLowerCase();
  
  // Check if we have a specific color mapping
  if (PRODUCT_COLOR_MAP[productLower]) {
    console.log(`Assigning color to ${productType}: ${PRODUCT_COLOR_MAP[productLower]}`);
    return PRODUCT_COLOR_MAP[productLower];
  }
  
  // Fallback: use index-based color assignment for other products
  const productIndex = availableProducts.findIndex(p => 
    p.name.toLowerCase() === productLower
  );
  if (productIndex >= 0) {
    return COLOR_PALETTE[productIndex % COLOR_PALETTE.length];
  }
  
  // Fallback for unknown products
  console.warn('Unknown product type:', productType);
  return '#6b7280'; // Gray
};

/**
 * Helper function to get size based on status
 */
export const getStatusSize = (status) => {
  return STATUS_SIZES[status] || STATUS_SIZES.default;
};

/**
 * Convert sites data to GeoJSON features (filter out invalid coordinates)
 */
export const toFeatures = (sitesData, availableProducts) => {
  if (!Array.isArray(sitesData)) {
    console.warn('toFeatures received non-array data:', sitesData);
    return [];
  }

  const features = sitesData
    .filter(site => {
      // Only include sites with valid coordinates
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
      const productType = getProductType(site["product(s)_interested"], availableProducts);
      const color = getProductColor(productType, availableProducts);
      const size = getStatusSize(site.status);
      
      // Debug log for AudioSight features
      if (productType.toLowerCase() === 'audiosight') {
        console.log('🔴 Creating AudioSight feature:', {
          name: site.name,
          city: site.city,
          productType,
          color,
          products: site["product(s)_interested"]
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

      // Validate the feature structure
      if (!feature.geometry || !feature.geometry.coordinates || 
          feature.geometry.coordinates.length !== 2 ||
          !Number.isFinite(feature.geometry.coordinates[0]) ||
          !Number.isFinite(feature.geometry.coordinates[1])) {
        console.error('Invalid feature created:', feature);
        return null;
      }

      return feature;
    })
    .filter(feature => feature !== null); // Remove any invalid features

  console.log(`Created ${features.length} valid GeoJSON features from ${sitesData.length} sites`);
  return features;
};



