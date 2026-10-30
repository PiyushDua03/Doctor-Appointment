// Configuration for API Base URL
// Supports local development, custom host, and deployed Render/Vercel endpoints
const API_BASE_URL = (() => {
  if (window.DOCTORP_API_URL) {
    return window.DOCTORP_API_URL;
  }
  // When running on Render cloud domain:
  if (window.location.hostname.includes('onrender.com')) {
    return `${window.location.origin}/api`;
  }
  // If served via Vite/Live Server on port 5173 / 5500:
  if (window.location.port === '5173' || window.location.port === '5500') {
    return 'http://localhost:5050/api';
  }
  // When served directly by Express or behind any proxy/domain:
  return '/api';
})();

window.API_BASE_URL = API_BASE_URL;
window.PRODUCTION_API_URL = 'https://doctor-appointment-1-67hu.onrender.com/api';
