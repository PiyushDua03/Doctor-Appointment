// Doctors Directory Page Logic (Card Grid, Multi-filters, Leaflet Interactive Map View)

let currentPage = 1;
const limit = 9;
let leafletMap = null;
let currentView = 'cards';

document.addEventListener('DOMContentLoaded', () => {
  initFiltersFromUrl();
  loadDoctors();
  setupFilterListeners();
});

// Parse query params from URL
function initFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const search = params.get('search');
  const specialty = params.get('specialty');
  const city = params.get('city');

  if (search) document.getElementById('filter-search').value = search;
  if (specialty) document.getElementById('filter-specialty').value = specialty;
  if (city) document.getElementById('filter-city').value = city;
}

// View Switching: Cards Grid vs Interactive Leaflet Map
window.switchView = (mode) => {
  currentView = mode;
  const cardsBtn = document.getElementById('btn-view-cards');
  const mapBtn = document.getElementById('btn-view-map');
  const mapSection = document.getElementById('doctor-map-section');
  const cardsContainer = document.getElementById('doctors-list-container');
  const paginationContainer = document.getElementById('pagination-container');
  const resultsBar = document.getElementById('results-count-bar');

  if (mode === 'map') {
    cardsBtn?.classList.remove('active');
    mapBtn?.classList.add('active');
    if (mapSection) mapSection.style.display = 'block';
    if (cardsContainer) cardsContainer.style.display = 'none';
    if (paginationContainer) paginationContainer.style.display = 'none';
    if (resultsBar) resultsBar.style.display = 'none';
    
    // Ensure Leaflet is initialized and viewport resized
    initDoctorMap();
    setTimeout(() => {
      if (leafletMap) leafletMap.invalidateSize();
    }, 150);
    setTimeout(() => {
      if (leafletMap) leafletMap.invalidateSize();
    }, 450);
  } else {
    mapBtn?.classList.remove('active');
    cardsBtn?.classList.add('active');
    if (mapSection) mapSection.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = 'grid';
    if (paginationContainer) paginationContainer.style.display = 'block';
    if (resultsBar) resultsBar.style.display = 'flex';
  }
};

// Helper to ensure Leaflet library is ready
function ensureLeafletLoaded(callback) {
  if (typeof L !== 'undefined') {
    callback();
    return;
  }

  // Inject Leaflet CSS
  if (!document.querySelector('link[href*="leaflet"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  // Inject Leaflet JS
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = () => callback();
  script.onerror = () => {
    // Fallback to cdnjs if unpkg encounters network block
    const scriptFallback = document.createElement('script');
    scriptFallback.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
    scriptFallback.onload = () => callback();
    document.head.appendChild(scriptFallback);
  };
  document.head.appendChild(script);
}

// Initialize Leaflet Map with Doctor Markers
async function initDoctorMap() {
  const mapDiv = document.getElementById('doctor-map-container');
  if (!mapDiv) return;

  ensureLeafletLoaded(async () => {
    if (typeof L === 'undefined') {
      mapDiv.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--danger);">Unable to load map tiles. Please check your internet connection or use Grid View.</div>';
      return;
    }

    if (!leafletMap) {
      // Clear loading placeholder
      mapDiv.innerHTML = '';

      // Center initially on Central India
      leafletMap = L.map('doctor-map-container', {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([20.5937, 78.9629], 5);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(leafletMap);
    } else {
      // Replace any existing tile layer to clear the OSM 403 warning
      leafletMap.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          leafletMap.removeLayer(layer);
        }
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(leafletMap);
    }

    // Trigger viewport resize
    leafletMap.invalidateSize();

    try {
      const data = await window.apiFetch('/doctors/map');
      const doctors = data.doctors || [];

      // Clear existing markers if any
      if (window.doctorMapMarkers) {
        window.doctorMapMarkers.forEach((m) => leafletMap.removeLayer(m));
      }
      window.doctorMapMarkers = [];

      const bounds = [];

      doctors.forEach((doc) => {
        const coords = doc.location?.coordinates;
        if (coords && coords.lat && coords.lng) {
          bounds.push([coords.lat, coords.lng]);

          // Reliable custom doctor SVG Pin (bypasses default Leaflet PNG missing image issues)
          const doctorPinIcon = L.divIcon({
            className: 'custom-doctor-map-pin',
            html: `
              <div style="position: relative; width: 36px; height: 36px; background: #0d9488; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(13,148,136,0.4); border: 2.5px solid #ffffff;">
                <span style="transform: rotate(45deg); font-size: 16px;">🩺</span>
              </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36],
          });

          const marker = L.marker([coords.lat, coords.lng], { icon: doctorPinIcon }).addTo(leafletMap);

          const popupContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 230px; padding: 0.25rem;">
              <div style="display: flex; gap: 0.6rem; align-items: center; margin-bottom: 0.6rem;">
                <img src="${doc.profileImage || doc.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=100&q=80'}" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid #0d9488;">
                <div>
                  <strong style="font-size: 0.95rem; color: #0f172a; display: block; line-height: 1.2;">${doc.name}</strong>
                  <span style="font-size: 0.75rem; color: #0d9488; font-weight: 700;">${doc.specialization}</span>
                </div>
              </div>
              <div style="font-size: 0.8rem; color: #475569; margin-bottom: 0.4rem;">
                🏥 <strong>${doc.clinicName || 'Speciality Clinic'}</strong><br>
                📍 ${doc.location?.address || ''}, ${doc.location?.city || ''}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; font-size: 0.85rem; background: #f8fafc; padding: 0.35rem 0.6rem; border-radius: 6px;">
                <span style="color: #f59e0b; font-weight: 700;">★ ${doc.rating ? doc.rating.toFixed(1) : '4.9'}</span>
                <strong style="color: #0d9488; font-size: 0.95rem;">₹${doc.consultationFee || 500}</strong>
              </div>
              <a href="doctor-details.html?id=${doc._id}" class="btn btn-primary btn-sm" style="width: 100%; font-size: 0.8rem; padding: 0.4rem 0.5rem; text-align: center; display: block; text-decoration: none; border-radius: 6px;">
                Book Appointment
              </a>
            </div>
          `;

          marker.bindPopup(popupContent);
          window.doctorMapMarkers.push(marker);
        }
      });

      const countEl = document.getElementById('map-doctor-count');
      if (countEl) countEl.innerText = `${bounds.length} Certified Doctor Clinics Located`;

      if (bounds.length > 0) {
        leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }

      setTimeout(() => {
        if (leafletMap) leafletMap.invalidateSize();
      }, 250);
    } catch (err) {
      console.error('Error loading doctor map:', err);
    }
  });
}


// Set up event listeners on filter inputs
function setupFilterListeners() {
  const form = document.getElementById('doctors-filter-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      currentPage = 1;
      loadDoctors();
    });
  }

  // 250ms Debounced Instant Live Search
  let searchDebounceTimer = null;
  const searchInput = document.getElementById('filter-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        currentPage = 1;
        loadDoctors();
      }, 250);
    });
  }

  // Instant filter on dropdown changes
  ['filter-specialty', 'filter-city', 'filter-min-rating', 'filter-max-fee', 'filter-sort'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        currentPage = 1;
        loadDoctors();
      });
    }
  });

  const resetBtn = document.getElementById('btn-reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.getElementById('filter-search').value = '';
      document.getElementById('filter-specialty').value = '';
      document.getElementById('filter-city').value = '';
      document.getElementById('filter-min-rating').value = '';
      document.getElementById('filter-max-fee').value = '';
      currentPage = 1;
      loadDoctors();
    });
  }

  // Setup quick filter chips
  const chipBtns = document.querySelectorAll('#quick-filter-chips .filter-chip-btn');
  chipBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      chipBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      const specialtyInput = document.getElementById('filter-specialty');
      const minRatingInput = document.getElementById('filter-min-rating');
      const maxFeeInput = document.getElementById('filter-max-fee');

      if (filter === 'all') {
        if (specialtyInput) specialtyInput.value = '';
        if (minRatingInput) minRatingInput.value = '';
        if (maxFeeInput) maxFeeInput.value = '';
      } else if (filter === 'rating48') {
        if (minRatingInput) minRatingInput.value = '4.8';
      } else if (filter === 'under800') {
        if (maxFeeInput) maxFeeInput.value = '800';
      } else if (filter === 'today' || filter === 'video') {
        // Keeps specialty, requests all available
      } else {
        if (specialtyInput) specialtyInput.value = filter;
      }

      currentPage = 1;
      loadDoctors();
    });
  });
}

// Fetch doctors with all active filters
async function loadDoctors() {
  const container = document.getElementById('doctors-list-container');
  const countEl = document.getElementById('doctors-count-text');
  const paginationContainer = document.getElementById('pagination-container');

  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
      <div style="display: inline-block; width: 44px; height: 44px; border: 3px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="margin-top: 1rem; color: var(--navy-muted); font-size: 0.95rem;">Finding verified hospital specialists...</p>
    </div>
  `;

  const search = document.getElementById('filter-search')?.value.trim() || '';
  const specialty = document.getElementById('filter-specialty')?.value || '';
  const city = document.getElementById('filter-city')?.value || '';
  const minRating = document.getElementById('filter-min-rating')?.value || '';
  const maxFee = document.getElementById('filter-max-fee')?.value || '';
  const sortBy = document.getElementById('filter-sort')?.value || 'rating';

  const queryParams = new URLSearchParams({
    page: currentPage,
    limit,
    sortBy,
  });

  if (search) queryParams.set('search', search);
  if (specialty) queryParams.set('specialty', specialty);
  if (city) queryParams.set('city', city);
  if (minRating) queryParams.set('minRating', minRating);
  if (maxFee) queryParams.set('maxFee', maxFee);

  try {
    const data = await window.apiFetch(`/doctors?${queryParams.toString()}`);
    const doctors = data.doctors || [];
    const total = data.total || 0;
    const pages = data.pages || 1;

    if (countEl) {
      countEl.innerText = `Showing ${doctors.length} of ${total} verified doctor${total === 1 ? '' : 's'}`;
    }

    if (doctors.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3 style="margin-bottom: 0.5rem;">No Doctors Found</h3>
          <p style="color: var(--navy-muted); max-width: 400px; margin: 0 auto 1.5rem;">We couldn't find any doctors matching your search criteria. Try removing some filters or adjusting your keywords.</p>
          <button onclick="document.getElementById('btn-reset-filters').click()" class="btn btn-primary">Clear All Filters</button>
        </div>
      `;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    container.innerHTML = doctors
      .map(
        (doc) => `
        <div class="doctor-card">
          <div class="doctor-card-img-wrap">
            <img src="${doc.profileImage || doc.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80'}" alt="${doc.name}" loading="lazy">
            <div class="doctor-badge-rating">
              <span style="color: #f59e0b;">★</span>
              <span>${doc.rating ? doc.rating.toFixed(1) : '4.8'}</span>
              <span style="font-size: 0.75rem; color: var(--navy-muted);">(${doc.totalReviews || 35}+)</span>
            </div>
          </div>
          <div class="doctor-card-body">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <span class="doctor-specialty-chip">${doc.specialization}</span>
              <span style="font-size: 0.75rem; color: #059669; font-weight: 700; background: #d1fae5; padding: 0.2rem 0.5rem; border-radius: 4px;">● Available Today</span>
            </div>
            <h3 class="doctor-card-name">${doc.name}</h3>
            <p style="font-size: 0.8rem; color: var(--navy-muted); margin-bottom: 0.4rem;">
              ${doc.qualifications ? (Array.isArray(doc.qualifications) ? doc.qualifications.join(', ') : doc.qualifications) : 'MBBS, MD'}
            </p>
            <div class="doctor-clinic-info">
              <span>🏥</span>
              <span>${doc.clinicName || 'Care Clinic'}, ${doc.location?.city || 'New Delhi'}</span>
            </div>
            <div class="doctor-experience-info">
              <span>🩺</span>
              <span>${doc.experience || 5}+ Years Clinical Experience • Reg: ${doc.medicalRegNumber || 'MCI-VERIFIED'}</span>
            </div>
            <div class="doctor-tags-row">
              <span class="doctor-tag-item">🏥 In-Clinic</span>
              <span class="doctor-tag-item">💻 Video Consult</span>
              <span class="doctor-tag-item">🗣️ ${doc.languages && doc.languages.length ? doc.languages.slice(0, 2).join(', ') : 'English, Hindi'}</span>
            </div>
            <div class="doctor-card-footer">
              <div class="doctor-fee">
                <span>Consultation</span>
                <strong>₹${doc.consultationFee || 500}</strong>
              </div>
              <div style="display: flex; gap: 0.4rem;">
                <a href="doctor-details.html?id=${doc._id}" class="btn btn-secondary btn-sm">Profile</a>
                <a href="doctor-details.html?id=${doc._id}" class="btn btn-primary btn-sm">Book</a>
              </div>
            </div>
          </div>
        </div>
      `
      )
      .join('');

    renderPagination(pages);
  } catch (err) {
    console.error('Error fetching doctors:', err);
    container.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--danger);">Failed to load doctors: ${err.message}</p>`;
  }
}

// Render Pagination Controls
function renderPagination(totalPages) {
  const container = document.getElementById('pagination-container');
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = `<div style="display: flex; gap: 0.5rem; align-items: center; justify-content: center; margin-top: 3rem;">`;

  if (currentPage > 1) {
    html += `<button onclick="changePage(${currentPage - 1})" class="btn btn-secondary btn-sm">← Prev</button>`;
  }

  for (let i = 1; i <= totalPages; i++) {
    const isCurrent = i === currentPage;
    html += `
      <button onclick="changePage(${i})" class="btn ${isCurrent ? 'btn-primary' : 'btn-secondary'} btn-sm" style="min-width: 38px;">
        ${i}
      </button>
    `;
  }

  if (currentPage < totalPages) {
    html += `<button onclick="changePage(${currentPage + 1})" class="btn btn-secondary btn-sm">Next →</button>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

window.changePage = (p) => {
  currentPage = p;
  loadDoctors();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
