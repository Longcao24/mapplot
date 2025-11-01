/**
 * Popup HTML templates for map markers
 */

export function createClusterPopupHTML(clusterFeatures, lng, lat, zoomLevel) {
  const tableRows = clusterFeatures.map((feature, idx) => {
    const props = feature.properties;
    const status = props.status;
    const statusColor = status === 'customer' ? '#10b981' : status === 'prospect' ? '#f59e0b' : '#6b7280';
    const statusBgColor = status === 'customer' ? '#d1fae5' : status === 'prospect' ? '#fef3c7' : '#f3f4f6';
    const productType = props.productType || 'Unknown';
    const name = props.name || 'Customer';
    const registered = props.registered_at 
      ? new Date(props.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';
    
    return `
      <tr style="border-bottom: 1px solid #e5e7eb; transition: all 0.2s; cursor: pointer;" 
          onmouseover="this.style.background='#eff6ff'; this.style.transform='scale(1.01)'"
          onmouseout="this.style.background='white'; this.style.transform='scale(1)'"
          onclick="
            const features = window.clusterFeatures;
            const clickedFeature = features[${idx}];
            if (!clickedFeature) return;
            
            const popup = this.closest('.maplibregl-popup');
            if (popup) popup.remove();
            
            window.showCustomerDetails(clickedFeature);
          ">
        <td style="padding: 12px 6px; color: #6b7280; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 12px 8px;">
          <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${name}</div>
          <div style="font-size: 11px; color: #6b7280;">${props.city || ''}, ${props.state || ''}</div>
        </td>
        <td style="padding: 12px 6px;">
          <span style="background: ${props.color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; white-space: nowrap;">
            ${productType}
          </span>
        </td>
        <td style="padding: 12px 6px;">
          <span style="background: ${statusBgColor}; color: ${statusColor}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize; white-space: nowrap;">
            ${status || 'Unknown'}
          </span>
        </td>
        <td style="padding: 12px 6px; color: #374151; font-size: 11px; white-space: nowrap;">${registered}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">Cluster Details</h3>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: ${clusterFeatures[0]?.properties.color || '#3b82f6'}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">
            ${clusterFeatures.length} customers
          </span>
          <button onclick="this.closest('.maplibregl-popup').remove()" 
                  style="background: #f3f4f6; border: none; font-size: 16px; cursor: pointer; color: #6b7280; padding: 4px 8px; border-radius: 6px;">✕</button>
        </div>
      </div>
      <div style="max-height: 400px; overflow-y: auto; margin: -4px; padding: 4px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead style="position: sticky; top: 0; z-index: 1; background: #f8fafc;">
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
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 11px; color: #6b7280;">💡 Click any row to see detailed customer information</div>
        <button onclick="
          const map = window.mapInstance;
          if (map) {
            map.easeTo({ center: [${lng}, ${lat}], zoom: ${zoomLevel}, duration: 500 });
            this.closest('.maplibregl-popup').remove();
          }
        " style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600;">
          Zoom In
        </button>
      </div>
    </div>
  `;
}

export function createCustomerPopupHTML(feature) {
  const { address, city, state, zip_code, customer_id } = feature.properties;
  const productsInterestedRaw = feature.properties['product(s)_interested'];
  const registered_at = feature.properties.registered_at;
  const status = feature.properties.status;

  let productsArr;
  if (Array.isArray(productsInterestedRaw)) {
    productsArr = productsInterestedRaw;
  } else if (typeof productsInterestedRaw === 'string') {
    try {
      productsArr = productsInterestedRaw.trim().startsWith('[')
        ? JSON.parse(productsInterestedRaw)
        : [productsInterestedRaw];
    } catch {
      productsArr = [productsInterestedRaw];
    }
  } else if (productsInterestedRaw != null) {
    productsArr = [String(productsInterestedRaw)];
  } else {
    productsArr = [];
  }

  const productText = productsArr.map(p => String(p)).join(', ');
  const productType = feature.properties.productType;
  const statusColor = status === 'customer' ? '#10b981' : status === 'prospect' ? '#f59e0b' : '#6b7280';
  const statusBgColor = status === 'customer' ? '#d1fae5' : status === 'prospect' ? '#fef3c7' : '#f3f4f6';
  const name = feature.properties.name || 'Customer';

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 400px; min-width: 320px; padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
        <div style="flex: 1; margin-right: 16px;">
          <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827;">${name}</h3>
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 6px;">${address}</div>
          <div style="font-size: 13px; color: #9ca3af;">${city}, ${state} ${zip_code}</div>
        </div>
        <button onclick="this.closest('.maplibregl-popup').remove()" 
                style="background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #6b7280; font-size: 18px;">✕</button>
      </div>
      <div style="display: grid; gap: 20px;">
        <div style="background: #f9fafb; padding: 16px 20px; border-radius: 10px; border: 1px solid #e5e7eb;">
          <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 10px;">Customer ID</div>
          <div style="font-size: 13px; color: #374151; font-family: monospace; word-break: break-all;">${customer_id}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="background: ${statusBgColor}; padding: 16px 20px; border-radius: 10px;">
            <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 10px;">Status</div>
            <div style="font-size: 15px; color: ${statusColor}; font-weight: 700; text-transform: capitalize;">${status || 'Unknown'}</div>
          </div>
          <div style="background: #f9fafb; padding: 16px 20px; border-radius: 10px;">
            <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 10px;">Registered</div>
            <div style="font-size: 15px; color: #374151; font-weight: 600;">${registered_at ? new Date(registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</div>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 16px 20px; border-radius: 10px;">
          <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 12px;">Product Type</div>
          <div style="display: inline-block; background: ${feature.properties.color}; color: white; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600;">${productType}</div>
        </div>
        <div style="background: #f9fafb; padding: 16px 20px; border-radius: 10px;">
          <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 12px;">Products of Interest</div>
          <div style="font-size: 14px; color: #374151;">${productText || 'None specified'}</div>
        </div>
      </div>
    </div>
  `;
}

