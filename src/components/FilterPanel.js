import React, { useRef } from 'react';
import { STATE_NAMES } from '../constants/states';
import { PRODUCT_COLORS } from '../constants/colors';

function FilterPanel({
  panelOpen,
  onClose,
  panelScale,
  // States
  selectedStates,
  setSelectedStates,
  stateOptions,
  // Products
  selectedProducts,
  setSelectedProducts,
  productOptions,
  availableProducts,
  // Other filters
  zipQuery,
  setZipQuery,
  zipRadius,
  setZipRadius,
  zipRadiusCount,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  statuses,
  setStatuses,
  // Stats
  filteredCount,
  totalCount,
  // Actions
  onReset,
  getProductColor,
  onQuickEmailToArea,
  displayedSites
}) {
  const stateSelectRef = useRef(null);
  const productSelectRef = useRef(null);

  const toggleSelectValue = (refEl, updater, value) => {
    const el = refEl.current;
    const scroll = el ? el.scrollTop : 0;
    updater(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));
    requestAnimationFrame(() => {
      if (refEl.current) refEl.current.scrollTop = scroll;
    });
  };

  const allProductsSelected = productOptions.every(p => selectedProducts.includes(p)) && selectedProducts.length > 0;

  return (
    <div
      className={`filter-panel ${panelOpen ? 'open' : 'closed'}`}
      style={{ '--scale': panelScale }}
      aria-hidden={!panelOpen}
    >
      <div className="panel-header">
        <strong className="panel-title">Filters</strong>
        <div className="panel-actions">
          <button onClick={onReset} className="btn" title="Reset all filters" style={{
            height: 42, padding: '8px 16px', borderRadius: 14, background: '#fff7cc',
            color: '#111827', border: '1px solid #f6e08a', fontWeight: 700, fontSize: 14,
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,.95), 0 6px 16px rgba(0,0,0,.07)',
            transition: 'transform .15s ease, box-shadow .2s ease'
          }}>Reset</button>
          <button onClick={onClose} className="btn close-btn" title="Hide filters" style={{
            width: 36, height: 36, borderRadius: 999, padding: 0, fontSize: 18,
            background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca'
          }}>×</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '14px' }}>Legend</div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 4 }}>Product Colors:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: '11px' }}>
            {availableProducts.map((product) => (
              <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="legend-dot" style={{ color: getProductColor(product.name), '--sz': '14px' }} />
                <span>{product.name}</span>
              </div>
            ))}
            {availableProducts.length >= 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="legend-dot" style={{ color: PRODUCT_COLORS.multiple, '--sz': '14px' }} />
                <span>Multiple Products</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* States */}
      <label className="label">State(s)</label>
      <select ref={stateSelectRef} multiple value={selectedStates} onChange={() => {}} className="select">
        {stateOptions.map((st) => (
          <option key={st} value={st} onMouseDown={(e) => {
            e.preventDefault();
            toggleSelectValue(stateSelectRef, setSelectedStates, st);
          }}>
            {`${st} - ${STATE_NAMES[st] || st}`}
          </option>
        ))}
      </select>

      {/* Products */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label className="label" style={{ marginBottom: 0 }}>Product(s)</label>
        <button type="button" onClick={() => setSelectedProducts(productOptions)} className="btn ghost" style={{
          padding: '4px 10px', background: allProductsSelected ? '#2563eb' : '#fff',
          color: allProductsSelected ? '#fff' : '#111827', borderColor: allProductsSelected ? '#2563eb' : '#e5e7eb'
        }}>Select all</button>
      </div>
      <div ref={productSelectRef} className="checkbox-list" style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 8, margin: '6px 0 12px' }}>
        {productOptions.map((p) => (
          <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
            <input type="checkbox" checked={selectedProducts.includes(p)} onChange={() => {
              setSelectedProducts((prev) => prev.includes(p) ? prev.filter((v) => v !== p) : [...prev, p]);
            }} />
            {p}
          </label>
        ))}
      </div>

      {/* Zip */}
      <label className="label">Zip code</label>
      <div className="input-wrap zip-field">
        <span className="input-icon search-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span>
        <input type="text" inputMode="numeric" placeholder="e.g., 10027" value={zipQuery} onChange={e => setZipQuery(e.target.value.replace(/\D/g, '').slice(0, 5))} className="input input--elev with-icon" maxLength={5} />
      </div>

      {/* Radius Slider (only show when zip code is entered) */}
      {zipQuery && zipQuery.length === 5 && (
        <div style={{ marginTop: 12, padding: 12, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="label" style={{ marginBottom: 0, fontSize: 13 }}>Search Radius</label>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0369a1' }}>{zipRadius} miles</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="100" 
            step="5" 
            value={zipRadius} 
            onChange={e => setZipRadius(Number(e.target.value))}
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${(zipRadius - 5) / 0.95}%, #e0e7ff ${(zipRadius - 5) / 0.95}%, #e0e7ff 100%)`,
              outline: 'none',
              WebkitAppearance: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#64748b' }}>
            <span>5 mi</span>
            <span>100 mi</span>
          </div>
          <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #bae6fd', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Customers in radius</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: zipRadiusCount === 0 ? '#dc2626' : '#0369a1' }}>
              {zipRadiusCount !== null ? zipRadiusCount : '...'}
            </div>
            {zipRadiusCount === 0 && (
              <div style={{ fontSize: 10, color: '#dc2626', marginTop: 4 }}>
                No customers found in this area
              </div>
            )}
          </div>

          {/* Quick Email to Area Button */}
          {zipRadiusCount > 0 && onQuickEmailToArea && (() => {
            const emailCount = displayedSites?.filter(s => s.email && s.email.trim()).length || 0;
            const buttonText = zipRadiusCount === 1 
              ? 'Email Customer' 
              : 'Quick Email to Area';
            const tooltipText = emailCount === 0 
              ? 'No customers with email addresses in this area'
              : emailCount === 1
                ? 'Send email to 1 customer in this area'
                : `Send email to ${emailCount} customers in this area`;
            
            return (
              <button
                onClick={onQuickEmailToArea}
                className="btn"
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.3)';
                }}
                title={tooltipText}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                {buttonText}
                {emailCount > 0 && (
                  <span style={{ 
                    background: 'rgba(255, 255, 255, 0.25)', 
                    padding: '2px 8px', 
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    {emailCount}
                  </span>
                )}
              </button>
            );
          })()}
        </div>
      )}

      {/* Dates */}
      <div className="date-fields-vertical">
        <div className="input-wrap calendar-field">
          <label className="label">Reg. From</label>
          <span className="input-icon calendar-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></span>
          <input type="text" placeholder="mm-dd-yyyy or yyyy" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input input--elev with-icon" />
        </div>
        <div className="input-wrap calendar-field">
          <label className="label">Reg. To</label>
          <span className="input-icon calendar-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></span>
          <input type="text" placeholder="mm-dd-yyyy or yyyy" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input input--elev with-icon" />
        </div>
      </div>

      {/* Status */}
      <label className="label">Account status</label>
      <div className="chips">
        {['lead', 'prospect', 'customer'].map((s) => (
          <button key={s} onClick={() => {
            setStatuses((prev) => {
              const next = new Set(prev);
              if (next.has(s)) next.delete(s); else next.add(s);
              return next;
            });
          }} className={`chip chip--${s} ${statuses.has(s) ? 'active' : ''}`}>
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="footnote">Showing <b>{filteredCount}</b> of {totalCount}</div>
    </div>
  );
}

export default FilterPanel;

