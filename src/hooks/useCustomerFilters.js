import { useState, useMemo, useRef } from 'react';
import { normalizeProducts, parseFlexibleDate } from '../utils/customerData';

/**
 * Custom hook for managing customer filters
 */
export const useCustomerFilters = (sites, availableProducts) => {
  // Filter state
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [statuses, setStatuses] = useState(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [zipQuery, setZipQuery] = useState('');

  // Refs to keep scroll position of multi-selects
  const stateSelectRef = useRef(null);
  const productSelectRef = useRef(null);

  // Options (derived)
  const stateOptions = useMemo(
    () => Array.from(new Set(sites.map(s => s.state))).sort(),
    [sites]
  );
  
  const productOptions = useMemo(
    () => availableProducts.map(p => p.name),
    [availableProducts]
  );

  // Check if all products are selected
  const allProductsSelected = useMemo(
    () => productOptions.every(p => selectedProducts.includes(p)) && selectedProducts.length > 0,
    [selectedProducts, productOptions]
  );

  // Apply filters (show ALL when nothing selected)
  const filteredSites = useMemo(() => {
    if (!sites.length) return [];

    let fromTs = parseFlexibleDate(dateFrom, false);
    let toTs   = parseFlexibleDate(dateTo, true);

    if (fromTs && toTs && fromTs > toTs) {
      const tmp = fromTs; fromTs = toTs; toTs = tmp; // swap if reversed
    }

    // cleaned zip entered (digits only, 5 max)
    const zipClean = (zipQuery || '').replace(/\D/g, '').slice(0, 5);
    const applyZip = zipClean.length === 5;

    const prodSel = new Set(selectedProducts);

    return sites.filter(site => {
      if (selectedStates.length && !selectedStates.includes(site.state)) return false;

      if (statuses.size && !statuses.has(site.status)) return false;

      if (fromTs || toTs) {
        const ts = site.registered_at ? Date.parse(site.registered_at) : NaN;
        if (!Number.isFinite(ts)) return false;
        if (fromTs && ts < fromTs) return false;
        if (toTs && ts > toTs) return false;
      }

      if (applyZip) {
        const z = String(site.zip_code ?? '');
        // normalize to 5-digit string for comparison
        const z5 = z.padStart(5, '0').slice(-5);
        if (z5 !== zipClean) return false;
      }

      // --- Product filter (checkboxes: match ANY selected product) ---
      if (prodSel.size) {
        const prods = normalizeProducts(site['product(s)_interested']).map(p => String(p));
        // Case-insensitive matching
        const prodsLower = new Set(prods.map(p => p.toLowerCase()));
        const selLower = Array.from(prodSel).map(p => p.toLowerCase());
        const hasAny = selLower.some(sel => prodsLower.has(sel));
        if (!hasAny) return false;
      }

      return true;
    });
  }, [sites, selectedStates, selectedProducts, statuses, dateFrom, dateTo, zipQuery]);

  return {
    // State
    selectedStates,
    setSelectedStates,
    selectedProducts,
    setSelectedProducts,
    statuses,
    setStatuses,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    zipQuery,
    setZipQuery,
    
    // Refs
    stateSelectRef,
    productSelectRef,
    
    // Derived values
    stateOptions,
    productOptions,
    allProductsSelected,
    filteredSites
  };
};



