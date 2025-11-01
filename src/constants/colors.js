/**
 * Product color mappings for map markers
 */
export const PRODUCT_COLORS = {
  'audiosight': '#ef4444',  // RED for AudioSight
  'sate': '#3b82f6',        // BLUE for SATE
  'armrehab': '#10b981',    // GREEN for ArmRehab
  'multiple': '#8b5cf6'     // PURPLE for Multiple Products
};

/**
 * Fallback color palette for unknown products
 */
export const FALLBACK_COLORS = [
  '#f59e0b', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316'  // Orange-red
];

/**
 * Status color mappings
 */
export const STATUS_COLORS = {
  customer: {
    primary: '#10b981',
    background: '#d1fae5'
  },
  prospect: {
    primary: '#f59e0b',
    background: '#fef3c7'
  },
  lead: {
    primary: '#6b7280',
    background: '#f3f4f6'
  }
};

/**
 * Status sizes for map markers
 */
export const STATUS_SIZES = {
  customer: 12,  // Largest
  prospect: 10,  // Medium
  lead: 8        // Smallest
};

