// Configuration for API Base URL
// Supports local development, custom host, and deployed Render/Vercel endpoints
const API_BASE_URL = (() => {
  if (window.DOCTORP_API_URL) {
    return window.DOCTORP_API_URL;
  }
  // If served via Vite/Live Server on port 5173 / 5500:
  if (window.location.port === '5173' || window.location.port === '5500') {
    return 'http://localhost:5050/api';
  }
  // When served directly by Express or behind any proxy/domain:
  return '/api';
})();

window.API_BASE_URL = API_BASE_URL;
