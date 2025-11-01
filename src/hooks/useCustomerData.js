import { useState, useEffect, useCallback } from 'react';
import { apiGetCustomers, apiGetProducts } from '../lib/api';
import { PRODUCT_COLORS, FALLBACK_COLORS, STATUS_SIZES } from '../constants/colors';

/**
 * useCustomerData Hook
 * Manages customer data fetching and processing
 * Max lines: 200 (per hook rules)
 */
export function useCustomerData() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);

  // Fetch sites data from Supabase
  const fetchSites = useCallback(async () => {
    try {
      setLoading(true);
      const sitesData = await apiGetCustomers().catch(() => []);
      
      console.log('Fetched sites data:', sitesData.length, 'total customers');
      
      const convertedSites = sitesData.map(site => {
        const latitude = site.latitude;
        const longitude = site.longitude;
        
        if (!latitude || !longitude) {
          console.warn('⚠️ Site missing coordinates:', {
            id: site.id,
            name: site.name || site.company,
            city: site.city,
            state: site.state
          });
        }
        
        return {
          id: site.id,
          customer_id: site.claimed_by || site.id,
          name: site.name || site.company || 'Unknown Customer',
          email: site.email || '',
          phone: site.phone || '',
          company: site.company || '',
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
          source_system: site.source_system || 'unknown',
          notes: site.notes || ''
        };
      });
      
      const sitesWithCoords = convertedSites.filter(s => s.latitude && s.longitude).length;
      const sitesWithEmail = convertedSites.filter(s => s.email && s.email.trim()).length;
      console.log(`✅ Loaded ${convertedSites.length} sites (${sitesWithCoords} with coordinates, ${sitesWithEmail} with email)`);
      
      setSites(convertedSites);
      setError(null);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load available products from Supabase
  const loadProducts = useCallback(async () => {
    try {
      const products = await apiGetProducts();
      console.log('✅ Loaded products from database:', products);
      setAvailableProducts(products);
    } catch (error) {
      console.error('Failed to load products:', error);
      const fallbackProducts = [
        { id: 'audiosight', name: 'AudioSight', description: 'Audio and hearing assessment technology' },
        { id: 'sate', name: 'SATE', description: 'Speech and auditory training equipment' }
      ];
      console.log('⚠️ Using fallback products:', fallbackProducts);
      setAvailableProducts(fallbackProducts);
    }
  }, []);

  // Helper function to determine product type for coloring
  const getProductType = useCallback((productsRaw) => {
    const normalizeProducts = (raw) => {
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

    const products = normalizeProducts(productsRaw).map(p => {
      const productName = String(p);
      const matchedProduct = availableProducts.find(ap => 
        ap.name.toLowerCase() === productName.toLowerCase()
      );
      return matchedProduct ? matchedProduct.name : productName;
    });
    
    const matchedProducts = products.filter(p => 
      availableProducts.some(ap => ap.name.toLowerCase() === p.toLowerCase())
    );
    
    if (matchedProducts.length > 1) return 'Multiple Products';
    if (matchedProducts.length === 1) return matchedProducts[0];
    return products.length > 0 ? products[0] : 'Other';
  }, [availableProducts]);

  // Helper function to get color based on product type
  const getProductColor = useCallback((productType) => {
    if (productType === 'Multiple Products') return PRODUCT_COLORS.multiple;
    
    const productLower = productType.toLowerCase();
    
    if (PRODUCT_COLORS[productLower]) {
      return PRODUCT_COLORS[productLower];
    }
    
    const productIndex = availableProducts.findIndex(p => 
      p.name.toLowerCase() === productLower
    );
    if (productIndex >= 0) {
      return FALLBACK_COLORS[productIndex % FALLBACK_COLORS.length];
    }
    
    return '#6b7280'; // Gray fallback
  }, [availableProducts]);

  // Helper function to get size based on status
  const getStatusSize = useCallback((status) => {
    return STATUS_SIZES[status] || 8;
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchSites();
    loadProducts();
  }, [fetchSites, loadProducts]);

  return {
    sites,
    loading,
    error,
    availableProducts,
    fetchSites,
    getProductType,
    getProductColor,
    getStatusSize
  };
}
