import { useState, useEffect } from 'react';
import { apiGetCustomers, apiGetProducts } from '../lib/api';

/**
 * Custom hook for fetching and managing customer data and products
 */
export const useCustomerData = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);

  // Function to fetch and refresh sites data
  const fetchSites = async () => {
    try {
      setLoading(true);
      
      // Fetch ALL customer data from Supabase (not just sites)
      const sitesData = await apiGetCustomers().catch(() => []);
      
      console.log('Fetched sites data:', sitesData.length, 'total customers');
      
      // Convert data to consistent format for the map
      // Note: Geocoding happens during CSV import, not here!
      const convertedSites = sitesData.map(site => {
        const latitude = site.latitude;
        const longitude = site.longitude;
        
        // Log warning for sites without coordinates (but don't geocode them here)
        if (!latitude || !longitude) {
          console.warn('⚠️ Site missing coordinates (will not appear on map):', {
            id: site.id,
            name: site.name || site.company,
            city: site.city,
            state: site.state,
            zip: site.postal_code,
            products: site.products_interested
          });
        }
        
        // Log AudioSight customers specifically for debugging
        if (site.products_interested && Array.isArray(site.products_interested) && 
            site.products_interested.some(p => p.toLowerCase() === 'audiosight')) {
          console.log('🔴 AudioSight customer:', {
            name: site.name || site.company,
            city: site.city,
            state: site.state,
            coords: [latitude, longitude]
          });
        }
        
        return {
          id: site.id,
          customer_id: site.claimed_by || site.id,
          name: site.name || site.company || 'Unknown Customer',
          address: site.address || 'Unknown Address',
          city: site.city || 'Unknown',
          state: site.state || 'XX',
          zip_code: site.postal_code || '00000',
          latitude: latitude,
          longitude: longitude,
          'product(s)_interested': site.products_interested || ['Unknown'],
          registered_at: site.registered_at || site.created_at ? 
            (site.registered_at || site.created_at).split('T')[0] : 
            new Date().toISOString().split('T')[0],
          status: site.status || 'new',
          customer_type: site.customer_type || 'customer',
          source_system: site.source_system || 'unknown'
        };
      });
      
      const sitesWithCoords = convertedSites.filter(s => s.latitude && s.longitude).length;
      console.log(`✅ Loaded ${convertedSites.length} sites (${sitesWithCoords} with coordinates)`);
      
      setSites(convertedSites);
      setError(null);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to load available products from Supabase
  const loadProducts = async () => {
    try {
      const products = await apiGetProducts();
      console.log('✅ Loaded products from database:', products);
      setAvailableProducts(products);
      
      // Log color assignments for debugging
      products.forEach(p => {
        const productLower = p.name.toLowerCase();
        const colorMap = {
          'audiosight': '#ef4444', 
          'sate': '#3b82f6',       
          'armrehab': '#10b981',   
        };
        console.log(`  → ${p.name}: ${colorMap[productLower] || 'default'}`);
      });
    } catch (error) {
      console.error('Failed to load products:', error);
      // Fallback to default products if loading fails (match database casing)
      const fallbackProducts = [
        { id: 'audiosight', name: 'AudioSight', description: 'Audio and hearing assessment technology' },
        { id: 'sate', name: 'SATE', description: 'Speech and auditory training equipment' }
      ];
      console.log('⚠️ Using fallback products:', fallbackProducts);
      setAvailableProducts(fallbackProducts);
    }
  };

  // Fetch sites data and products on component mount
  useEffect(() => {
    fetchSites();
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sites,
    loading,
    error,
    availableProducts,
    fetchSites
  };
};



