// Map-related constants

// Geocoding cache to avoid repeated API calls
export const geocodeCache = new Map();

// State code -> full name map (50 states + DC)
export const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia'
};

// Product color mapping
export const PRODUCT_COLOR_MAP = {
  'audiosight': '#ef4444', // RED for AudioSight
  'sate': '#3b82f6',       // BLUE for SATE
  'armrehab': '#10b981',   // GREEN for ArmRehab
};

// Additional color palette for other products
export const COLOR_PALETTE = [
  '#f59e0b', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316'  // Orange-red
];

// Special product type for multiple products
export const MULTIPLE_PRODUCTS_TYPE = 'Multiple Products';
export const MULTIPLE_PRODUCTS_COLOR = '#8b5cf6'; // Purple

// Status sizes for map markers
export const STATUS_SIZES = {
  customer: 12,  // Largest
  prospect: 10,  // Medium
  lead: 8,       // Smallest
  default: 8
};

// Map default settings
export const MAP_DEFAULTS = {
  center: [-98.5, 39.8],
  zoom: 3,
  clusterRadius: 25,
  clusterMaxZoom: 16
};



