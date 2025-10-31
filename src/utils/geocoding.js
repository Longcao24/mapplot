import zipcodes from 'zipcodes';
import { geocodeCache } from '../constants/maps';

/**
 * Geocode an address using Nominatim (OpenStreetMap) API
 * Free service with rate limiting (1 request/second recommended)
 */
export const geocodeWithNominatim = async (address) => {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MapPlot/1.0' // Nominatim requires a user agent
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Nominatim geocoding failed:', error);
    return null;
  }
};

/**
 * Geocode US zipcode using Zippopotam.us API
 * Free, no API key required, very reliable for US zipcodes
 */
export const geocodeZipcode = async (zipCode, country = 'us') => {
  try {
    // Clean zipcode - remove any non-numeric characters and get first 5 digits
    const cleanZip = zipCode.toString().replace(/\D/g, '').slice(0, 5);
    if (cleanZip.length !== 5) {
      return null;
    }

    const url = `https://api.zippopotam.us/${country}/${cleanZip}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Zippopotam API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.places && data.places.length > 0) {
      const place = data.places[0];
      return {
        latitude: parseFloat(place.latitude),
        longitude: parseFloat(place.longitude),
        displayName: `${place['place name']}, ${place['state abbreviation']} ${cleanZip}`,
        city: place['place name'],
        state: place['state abbreviation']
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Zippopotam geocoding failed:', error);
    return null;
  }
};

/**
 * Geocode using MapTiler API (requires API key)
 * More reliable and faster than Nominatim
 */
export const geocodeWithMapTiler = async (address, apiKey = 'b9c8lYjfkzHCjixZoLqo') => {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.maptiler.com/geocoding/${encodedAddress}.json?key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`MapTiler API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      return {
        latitude,
        longitude,
        displayName: data.features[0].place_name
      };
    }
    
    return null;
  } catch (error) {
    console.warn('MapTiler geocoding failed:', error);
    return null;
  }
};

/**
 * Geocode an address or zip code with caching and multiple fallback strategies
 * Priority: US Zipcode API > Local Zipcode Library > MapTiler > Nominatim
 * Note: Not currently used in App.js, but kept for future use
 */
export const geocodeAddress = async (address, city = '', state = '', zipCode = '') => {
  // Create a full address string for better geocoding results
  const fullAddress = [address, city, state, zipCode]
    .filter(Boolean)
    .join(', ')
    .trim();
  
  if (!fullAddress && !zipCode) return null;
  
  // Check cache first
  const cacheKey = (zipCode || fullAddress).toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    console.log('✅ Using cached geocode for:', zipCode || fullAddress);
    return geocodeCache.get(cacheKey);
  }
  
  let result = null;
  
  // Strategy 1: If we have a zipcode, try Zippopotam API (most accurate for US zipcodes)
  if (zipCode) {
    result = await geocodeZipcode(zipCode);
    if (result) {
      console.log('✅ Geocoded with Zippopotam API:', zipCode, '→', result.displayName);
      geocodeCache.set(cacheKey, result);
      return result;
    }
  }
  
  // Strategy 2: Try local zipcodes library (fast, offline, but limited coverage)
  if (zipCode) {
    try {
      const zipData = zipcodes.lookup(zipCode);
      if (zipData && zipData.latitude && zipData.longitude) {
        result = {
          latitude: zipData.latitude,
          longitude: zipData.longitude,
          displayName: `${city || zipData.city}, ${state || zipData.state} ${zipCode}`
        };
        console.log('✅ Geocoded with local zipcodes library:', zipCode);
        geocodeCache.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.warn('⚠️ Local zipcode lookup failed:', e);
    }
  }
  
  // Strategy 3: Try city/state lookup with local library
  if (!result && city && state) {
    try {
      const cityStateData = zipcodes.lookupByName(city, state);
      if (cityStateData && cityStateData.length > 0) {
        result = {
          latitude: cityStateData[0].latitude,
          longitude: cityStateData[0].longitude,
          displayName: `${city}, ${state}`
        };
        console.log('✅ Geocoded with city/state lookup:', `${city}, ${state}`);
        geocodeCache.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.warn('⚠️ City/state lookup failed:', e);
    }
  }
  
  // Strategy 4: Try MapTiler API (reliable, requires API key)
  if (!result && fullAddress) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to avoid rate limiting
    result = await geocodeWithMapTiler(fullAddress);
    if (result) {
      console.log('✅ Geocoded with MapTiler:', fullAddress);
      geocodeCache.set(cacheKey, result);
      return result;
    }
  }
  
  // Strategy 5: Fallback to Nominatim (free but slower)
  if (!result && fullAddress) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Respect Nominatim rate limit
    result = await geocodeWithNominatim(fullAddress);
    if (result) {
      console.log('✅ Geocoded with Nominatim:', fullAddress);
      geocodeCache.set(cacheKey, result);
      return result;
    }
  }
  
  // If still no result, log warning
  if (!result) {
    console.warn('❌ Could not geocode:', { address, city, state, zipCode });
  }
  
  return result;
};



