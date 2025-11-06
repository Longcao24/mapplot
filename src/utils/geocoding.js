import zipcodes from 'zipcodes';
import { geocodeCache } from '../constants/maps';

// Extract ZIP + country from MapTiler feature
const extractZipFromMapTiler = (feature) => {
  if (!feature) return {};
  // MapTiler/Mapbox-style "context" array can contain place/country/postcode
  const ctx = feature.context || [];
  const postcodeCtx = ctx.find(c => (c.id || '').startsWith('postcode')) || {};
  const countryCtx = ctx.find(c => (c.id || '').startsWith('country')) || {};
  // Some features carry postcode directly
  const directZip = feature.postcode || feature.properties?.postcode;
  return {
    zip: directZip || postcodeCtx.text,
    country: countryCtx?.short_code?.toUpperCase() || feature.properties?.country_code?.toUpperCase() || 'US',
  };
};

// Extract ZIP + country from Nominatim result
// Currently the zipcode is only US-based
const extractZipFromNominatim = (result) => {
  const addr = result?.address || {};
  const zip = addr.postcode || addr['ISO3166-2-lvl4']; // best-effort
  // Nominatim uses ISO 3166-1 alpha2 codes for country_code
  const country = (addr.country_code || 'us').toUpperCase();
  return { zip, country };
};

// Pull a ZIP from any of: explicit arg, validated feature, or raw text fallback
const resolveZip = ({ zipFromArg, maptilerHit, nominatimHit, rawText }) => {
  // 1) explicit arg wins
  if (zipFromArg) {
    const z = zipFromArg.toString().match(/\b\d{5}\b/);
    if (z) return { zip: z[0], country: 'US' };
  }

  // 2) from MapTiler
  if (maptilerHit?.feature) {
    const { zip, country } = extractZipFromMapTiler(maptilerHit.feature);
    if (zip) return { zip: (zip.match(/\b\d{5}\b/) || [zip])[0], country: country || 'US' };
  }

  // 3) from Nominatim
  if (nominatimHit?.raw) {
    const { zip, country } = extractZipFromNominatim(nominatimHit.raw);
    if (zip) return { zip: (zip.match(/\b\d{5}\b/) || [zip])[0], country: country || 'US' };
  }

  // 4) regex from raw text as a last resort
  if (rawText) {
    const z = rawText.match(/\b\d{5}\b/);
    if (z) return { zip: z[0], country: 'US' };
  }

  return {};
};

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
  const fullAddress = [address, city, state, zipCode].filter(Boolean).join(', ').trim();
  if (!fullAddress && !zipCode) return null;

  // Cache by ZIP if present, else full text
  const cacheKey = (zipCode || fullAddress).toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  let validatedHit = null;
  let provider = null;

  // 1) Validate with MapTiler
  let maptilerHit = null;
  if (fullAddress) {
    maptilerHit = await geocodeWithMapTiler(fullAddress);
    if (maptilerHit) {
      validatedHit = maptilerHit;
      provider = 'maptiler';
    }
  }

  // 2) If not validated yet, try Nominatim (respect rate limit)
  let nominatimHit = null;
  if (!validatedHit && fullAddress) {
    await new Promise(r => setTimeout(r, 500));
    nominatimHit = await geocodeWithNominatim(fullAddress);
    if (nominatimHit) {
      validatedHit = nominatimHit;
      provider = 'nominatim';
    }
  }

  // 3) Extract ZIP (arg → provider result → regex)
  const { zip, country } = resolveZip({
    zipFromArg: zipCode,
    maptilerHit,
    nominatimHit,
    rawText: fullAddress
  });

  // If we couldn't validate the address at all, we still allow ZIP plotting if provided
  const validated = !!validatedHit || !!zip;

  // 4) Plot by ZIP centroid if we have a zip
  let plotted = null;
  if (zip) {
    // 4a) Zippopotam
    plotted = await geocodeZipcode(zip, (country || 'US').toLowerCase());
    if (plotted) {
      const result = { validated, provider, zip, country: plotted.country || country || 'US', plotted };
      geocodeCache.set(cacheKey, result);
      return result;
    }

    // 4b) Local zipcodes library (US only)
    try {
      const z = zipcodes.lookup(zip);
      if (z?.latitude && z?.longitude) {
        plotted = {
          latitude: z.latitude,
          longitude: z.longitude,
          displayName: `${z.city}, ${z.state} ${zip}`,
          city: z.city,
          state: z.state,
          zip,
          country: 'US'
        };
        const result = { validated, provider, zip, country: 'US', plotted };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.warn('Local zipcode lookup failed:', e);
    }
  }

  // 5) If we still don't have ZIP, fall back progressively to city/state, then address point
  if (!plotted && city && state) {
    try {
      const cityStateData = zipcodes.lookupByName(city, state);
      if (cityStateData?.length > 0) {
        plotted = {
          latitude: cityStateData[0].latitude,
          longitude: cityStateData[0].longitude,
          displayName: `${city}, ${state}`
        };
        const result = { validated, provider: provider || 'fallback', zip: zip || null, country: 'US', plotted };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.warn('City/state lookup failed:', e);
    }
  }

  // 6) Absolute last resort: plot the validated address point (not preferred, but avoids total failure)
  if (!plotted && validatedHit) {
    const lat = validatedHit.latitude;
    const lng = validatedHit.longitude;
    if (typeof lat === 'number' && typeof lng === 'number') {
      plotted = {
        latitude: lat,
        longitude: lng,
        displayName: validatedHit.displayName
      };
      const result = { validated, provider, zip: zip || null, country: country || 'US', plotted };
      geocodeCache.set(cacheKey, result);
      return result;
    }
  }

  console.warn('❌ Could not geocode (even by fallback):', { address, city, state, zipCode });
  return { validated: false, provider: null, zip: null, country: null, plotted: null };
};