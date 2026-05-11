// HealthPod brand palette — single source of truth for JS/inline styles.
// CSS custom properties in src/index.css :root mirror these values.
// Update here (and :root) when rebranding.

export const BLUE   = '#1B75BC'   // --blue   / --color-primary
export const MAROON = '#A6215A'   // --maroon / --color-danger
export const GRAY   = '#7F8C9B'   // --gray

// Gradient used across the app (login panel, kiosk header, etc.)
export const BRAND_GRADIENT = `linear-gradient(160deg, ${BLUE} 0%, #145e9a 55%, ${MAROON} 100%)`

// Tier risk colors (also in riskConfig.js TIERS array)
export const TIER_COLORS = {
  green:  '#10b981',
  amber:  '#f59e0b',
  orange: '#f97316',
  red:    MAROON,
}
