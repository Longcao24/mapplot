import { useState, useMemo } from 'react';

/**
 * useCustomerFilters Hook
 * Manages filter state and applies filters to customer data
 * Max lines: 200 (per hook rules)
 */
export function useCustomerFilters(sites, availableProducts) {
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [statuses, setStatuses] = useState(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [zipQuery, setZipQuery] = useState('');

  // Derive state and product options from sites
  const stateOptions = useMemo(
    () => Array.from(new Set(sites.map(s => s.state))).sort(),
    [sites]
  );

  const productOptions = useMemo(
    () => availableProducts.map(p => p.name),
    [availableProducts]
  );

  // Helper to normalize products array
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

  // Date parser: allow ONLY "yyyy" or "mm-dd-yyyy"
  const parseFlexibleDate = (str, isEnd) => {
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

    return null;
  };

  // Apply filters
  // Note: Zip code filtering is now handled by radius filter in MapViewPage
  const filteredSites = useMemo(() => {
    if (!sites.length) return [];

    let fromTs = parseFlexibleDate(dateFrom, false);
    let toTs = parseFlexibleDate(dateTo, true);

    if (fromTs && toTs && fromTs > toTs) {
      const tmp = fromTs;
      fromTs = toTs;
      toTs = tmp;
    }

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

      // Removed exact zip code match filter - now handled by radius filter

      if (prodSel.size) {
        const prods = normalizeProducts(site['product(s)_interested']).map(p => String(p));
        const prodsLower = new Set(prods.map(p => p.toLowerCase()));
        const selLower = Array.from(prodSel).map(p => p.toLowerCase());
        const hasAny = selLower.some(sel => prodsLower.has(sel));
        if (!hasAny) return false;
      }

      return true;
    });
  }, [sites, selectedStates, selectedProducts, statuses, dateFrom, dateTo]);

  // Reset all filters
  const resetFilters = () => {
    setSelectedStates([]);
    setSelectedProducts([]);
    setStatuses(new Set());
    setDateFrom('');
    setDateTo('');
    setZipQuery('');
  };

  return {
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
    filteredSites,
    stateOptions,
    productOptions,
    resetFilters
  };
}
