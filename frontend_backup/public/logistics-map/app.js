// App Controller State
let map;
let routeGlowLayer = null;
let routeFlowLayer = null;
let routeLegLayers = [];
let activeMarkers = [];
let hoverMarker = null;

let dropoffCounter = 0;
let activeMode = 'driving';

// Geolocation Tracking variables
let userLocationMarker = null;
let userAccuracyCircle = null;
let isTrackingUser = false;

// Geocoding LocalStorage Cache
let geocodeCache = {};
try {
    const savedCache = localStorage.getItem('logiroute_geocode_cache');
    if (savedCache) {
        geocodeCache = JSON.parse(savedCache);
    }
} catch (e) {
    console.warn("Failed to load geocode cache from localStorage:", e);
}

// Init Map
function initConsole() {
    // Set up Map
    map = L.map('map', { zoomControl: false }).setView([13.0827, 80.2707], 12);
    
    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Set up tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Set up Leaflet Geolocation events
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    // Disable auto-follow when user manually drags the map
    map.on('dragstart', () => {
        if (isTrackingUser) {
            isTrackingUser = false;
            document.getElementById('btn-map-track').classList.remove('tracking-active');
            showToast("Auto-follow paused. Click locate button to resume.", "info");
        }
    });

    registerEvents();

    // Load URL-based shipment from AWS backend if specified
    checkForIncomingShipment();
}

// DOM Triggers
function registerEvents() {
    document.getElementById('btn-calculate').addEventListener('click', onCalculateRoute);
    document.getElementById('btn-gps').addEventListener('click', onGeolocateUser);
    document.getElementById('btn-add-stop').addEventListener('click', () => addDropoffField());
    document.getElementById('btn-reset').addEventListener('click', onResetAll);

    // Mode tabs click
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeMode = btn.getAttribute('data-mode');
        });
    });

    // Autocomplete for Dispatch Hub
    setupSearchBox('src-input', 'src-dropdown', (coords, label) => {
        const srcEl = document.getElementById('src-input');
        srcEl.dataset.lat = coords.lat;
        srcEl.dataset.lon = coords.lon;
        srcEl.value = label;
    });

    // Fetch and populate shipment dropdown dynamically
    loadShipmentsDropdown();

    document.getElementById('shipment-select').addEventListener('change', (e) => {
        const shipmentId = e.target.value;
        if (shipmentId) {
            // Update URL query param without reloading page
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?shipment_id=' + shipmentId;
            window.history.pushState({ path: newUrl }, '', newUrl);
            
            // Trigger load
            loadShipmentById(shipmentId);
        }
    });

    // Map locate control button
    document.getElementById('btn-map-track').addEventListener('click', toggleLocationTracking);
}

// Add dropoff destination row dynamically
function addDropoffField(defaultValue = "") {
    dropoffCounter++;
    const container = document.getElementById('inputs-container');

    const row = document.createElement('div');
    row.className = 'dropoff-row';
    row.id = `dropoff-row-${dropoffCounter}`;

    const inputGroupId = `dropoff-group-${dropoffCounter}`;
    const inputId = `dropoff-input-${dropoffCounter}`;
    const dropdownId = `dropoff-dropdown-${dropoffCounter}`;

    row.innerHTML = `
        <div class="input-group" id="${inputGroupId}">
            <label class="input-label">Delivery Stop #${dropoffCounter}</label>
            <div class="input-wrapper">
                <!-- Flag Icon -->
                <svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
                <input class="input-field location-input dropoff-input" id="${inputId}" type="text" placeholder="Enter delivery stop address..." autocomplete="off" value="${defaultValue}">
            </div>
            <div class="suggestions-dropdown" id="${dropdownId}"></div>
        </div>
        <button class="btn-delete-row" type="button" onclick="removeDropoffField('${row.id}')" title="Remove Stop">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
    `;

    container.appendChild(row);

    // Register Autocomplete on the new search row
    setupSearchBox(inputId, dropdownId, (coords, label) => {
        const inp = document.getElementById(inputId);
        inp.dataset.lat = coords.lat;
        inp.dataset.lon = coords.lon;
        inp.value = label;
    });

    // Scroll container to bottom
    const scrollArea = document.getElementById('inputs-container').parentElement;
    scrollArea.scrollTop = scrollArea.scrollHeight;
}

// Remove dropoff row
window.removeDropoffField = function(rowId) {
    const rowElement = document.getElementById(rowId);
    if (!rowElement) return;

    if (document.querySelectorAll('.dropoff-row').length <= 1) {
        showToast("You must have at least one delivery drop-off destination.", "danger");
        return;
    }
    rowElement.remove();
    
    // Renumber labels
    const rows = document.querySelectorAll('.dropoff-row');
    rows.forEach((r, idx) => {
        r.querySelector('.input-label').textContent = `Delivery Stop #${idx + 1}`;
    });
};

// Reset Console
function onResetAll() {
    // Clear inputs
    document.getElementById('src-input').value = '';
    document.getElementById('src-input').removeAttribute('data-lat');
    document.getElementById('src-input').removeAttribute('data-lon');

    const rows = document.querySelectorAll('.dropoff-row');
    rows.forEach(r => r.remove());
    dropoffCounter = 0;
    addDropoffField();

    // Clear map layers
    if (routeGlowLayer) map.removeLayer(routeGlowLayer);
    if (routeFlowLayer) map.removeLayer(routeFlowLayer);
    routeLegLayers.forEach(l => {
        if (l && l.layer) map.removeLayer(l.layer);
    });
    routeLegLayers = [];
    clearActiveMarkers();
    removeHoverMarker();

    // Hide stats
    document.getElementById('stats-panel').style.display = 'none';
    showToast("Console reset successfully.", "info");
}

function clearActiveMarkers() {
    activeMarkers.forEach(m => map.removeLayer(m));
    activeMarkers = [];
}

// Autocomplete debouncing
function setupSearchBox(inputId, dropdownId, onSelected) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    let timer = null;

    input.addEventListener('input', () => {
        // Clear existing coordinates when typing modifies value manually
        input.removeAttribute('data-lat');
        input.removeAttribute('data-lon');
        
        clearTimeout(timer);
        const query = input.value.trim();
        
        if (query.length < 3) {
            dropdown.style.display = 'none';
            removeHoverMarker();
            return;
        }

        timer = setTimeout(async () => {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    renderDropdownList(data, dropdown, onSelected);
                }
            } catch (e) {
                console.error("Geocoding service error", e);
            }
        }, 300);
    });

    // Clear suggestion dropdown on blur
    document.addEventListener('click', (e) => {
        if (e.target !== input) {
            dropdown.style.display = 'none';
            removeHoverMarker();
        }
    });
}

// Suggestions drawing with map hover preview markers
function renderDropdownList(items, dropdown, onSelected) {
    dropdown.innerHTML = '';
    if (items.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-row';
        div.textContent = item.display_name;

        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        // Add map preview marker on hover
        div.addEventListener('mouseenter', () => {
            drawHoverMarker(lat, lon, item.display_name);
        });

        div.addEventListener('click', () => {
            onSelected({ lat, lon }, item.display_name);
            dropdown.style.display = 'none';
            removeHoverMarker();
        });

        dropdown.appendChild(div);
    });

    dropdown.style.display = 'block';
}

// Draw temporary yellow indicator marker
function drawHoverMarker(lat, lon, label) {
    removeHoverMarker();
    const previewIcon = L.divIcon({
        html: '<div style="background-color: var(--warning); width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px var(--warning);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    hoverMarker = L.marker([lat, lon], { icon: previewIcon }).addTo(map)
        .bindPopup(`<div style="color:#000; font-size:11px;"><b>Preview Match:</b><br>${label.split(',')[0]}</div>`)
        .openPopup();
}

function removeHoverMarker() {
    if (hoverMarker) {
        map.removeLayer(hoverMarker);
        hoverMarker = null;
    }
}

// Check if query matches current location or placeholders
function is_placeholder_or_current(address) {
    const val = address.toLowerCase().trim();
    const placeholders = new Set([
        "your source address", "source address", "current location", 
        "current", "my location", "me", "here", 
        "your destination address", "destination address", ""
    ]);
    return placeholders.has(val);
}

// Get user's location via IP Geolocation
async function get_ip_location() {
    try {
        const res = await fetch("http://ip-api.com/json");
        if (res.ok) {
            const data = await res.json();
            if (data.status === "success") {
                return {
                    lat: parseFloat(data.lat),
                    lon: parseFloat(data.lon),
                    display_name: `Current Location (${data.city}, ${data.regionName}, ${data.country})`
                };
            }
        }
    } catch (e) {
        console.error("IP Geolocation fetch error:", e);
    }
    return null;
}

async function fallbackToIpLocation(gpsBtn, srcInput) {
    srcInput.placeholder = "Detecting location via IP...";
    const ipRes = await get_ip_location();
    if (ipRes) {
        srcInput.dataset.lat = ipRes.lat;
        srcInput.dataset.lon = ipRes.lon;
        srcInput.value = ipRes.display_name;
        showToast("Located successfully via IP", "success");
    } else {
        showToast("Failed to resolve location via GPS or IP.", "danger");
        srcInput.value = "";
    }
    gpsBtn.style.opacity = 1;
    srcInput.placeholder = "Enter dispatch hub address...";
}

// GPS positioning for Hub
function onGeolocateUser() {
    const gpsBtn = document.getElementById('btn-gps');
    const srcInput = document.getElementById('src-input');

    gpsBtn.style.opacity = 0.5;
    srcInput.placeholder = "Reading location sensors...";

    if (!navigator.geolocation) {
        fallbackToIpLocation(gpsBtn, srcInput);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            
            srcInput.dataset.lat = lat;
            srcInput.dataset.lon = lon;

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
                if (res.ok) {
                    const data = await res.json();
                    srcInput.value = data.display_name;
                    showToast("Located successfully via GPS", "success");
                } else {
                    srcInput.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                }
            } catch (e) {
                srcInput.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            }

            gpsBtn.style.opacity = 1;
            srcInput.placeholder = "Enter dispatch hub address...";
        },
        (err) => {
            console.warn("GPS lookup failed, falling back to IP Geolocation:", err);
            fallbackToIpLocation(gpsBtn, srcInput);
        },
        { enableHighAccuracy: false, timeout: 5000 }
    );
}

// Call Nominatim helper
async function fetchFromNominatim(queryStr) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&limit=1`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                };
            }
        }
    } catch (e) {
        console.error("Nominatim request error:", e);
    }
    return null;
}

// Call Komoot Photon helper (Backup API)
async function fetchFromPhoton(queryStr) {
    try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(queryStr)}&limit=1`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.features && data.features.length > 0) {
                const coords = data.features[0].geometry.coordinates;
                return {
                    lat: coords[1], // Latitude is index 1 in GeoJSON
                    lon: coords[0]  // Longitude is index 0 in GeoJSON
                };
            }
        }
    } catch (e) {
        console.error("Photon geocoder request error:", e);
    }
    return null;
}

// Dual Geocoding Resolver (Nominatim with Photon fallback)
async function fetchFromGeocoders(queryStr) {
    let result = await fetchFromNominatim(queryStr);
    if (result) return result;

    console.warn(`Nominatim geocoding failed or rate-limited for "${queryStr}". Querying Photon backup API...`);
    result = await fetchFromPhoton(queryStr);
    return result;
}

// Geocode single string address supporting coordinates, URLs, placeholders, and resilient door-number fallbacks
async function geocodeSingleAddress(addressString) {
    const query = addressString.trim();
    if (!query) return null;

    // Check geocoding cache first for instantaneous response times (0ms lookup)
    const cacheKey = query.toLowerCase();
    if (geocodeCache[cacheKey]) {
        console.log(`[Cache Hit] Resolved geocode for "${query}" instantly from local cache.`);
        return geocodeCache[cacheKey];
    }

    let result = null;

    // 1. Check for Geolocation placeholders / current location keywords
    if (is_placeholder_or_current(query)) {
        const ipRes = await get_ip_location();
        if (ipRes) {
            result = { lat: ipRes.lat, lon: ipRes.lon };
        }
    }

    // 2. Check for Google Maps URL coordinate extraction (e.g., .../@13.0891,80.1854...)
    if (!result) {
        const urlMatch = query.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
        if (urlMatch) {
            const lat = parseFloat(urlMatch[1]);
            const lon = parseFloat(urlMatch[2]);
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                result = { lat, lon };
            }
        }
    }

    // 3. Check for raw coordinate input (e.g., "13.0891, 80.1854" or "13.0891 80.1854")
    if (!result) {
        const parts = query.split(/[\s,]+/);
        if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lon = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                result = { lat, lon };
            }
        }
    }

    // 4. Try Dual-Geocoding - Full Query
    if (!result) {
        result = await fetchFromGeocoders(query);
    }

    // 5. Fallback: If address contains commas, strip the first segment and retry
    if (!result && query.includes(',')) {
        const commaParts = query.split(',');
        if (commaParts.length > 1) {
            const fallbackQuery = commaParts.slice(1).join(',').trim();
            console.log(`Geocoding failed for "${query}". Trying fallback: "${fallbackQuery}"`);
            await new Promise(r => setTimeout(r, 1200));
            result = await fetchFromGeocoders(fallbackQuery);
        }
    }

    // 6. Fallback: Regex strip common door/building prefixes
    if (!result) {
        const regexClean = query.replace(/^(no\.?\s*\d+\/?\d*\s*,?\s*|flat\s*\w+\s*,?\s*|\d+\/\d+\s*,?\s*)/i, '').trim();
        if (regexClean !== query && regexClean.length > 5) {
            console.log("Trying regex-cleared fallback: \"" + regexClean + "\"");
            await new Promise(r => setTimeout(r, 1200));
            result = await fetchFromGeocoders(regexClean);
        }
    }

    // Cache the resolved result
    if (result) {
        geocodeCache[cacheKey] = result;
        try {
            localStorage.setItem('logiroute_geocode_cache', JSON.stringify(geocodeCache));
        } catch (e) {
            console.warn("Failed to save geocode cache to localStorage:", e);
        }
    }

    return result;
}

// Main Route Optimization Solving
async function onCalculateRoute() {
    const loading = document.getElementById('loading-indicator');
    const label = document.getElementById('btn-label');
    const statsPanel = document.getElementById('stats-panel');

    // Collect all inputs
    const srcInput = document.getElementById('src-input');
    const dropoffInputs = document.querySelectorAll('.dropoff-input');

    if (!srcInput.value.trim()) {
        showToast("Please enter a Dispatch Hub location.", "danger");
        return;
    }

    loading.style.display = 'inline-block';
    label.textContent = 'Optimizing Route...';

    try {
        // Collect points
        const points = [];
        const labels = [];

        // 1. Resolve Hub
        let hubLat = srcInput.dataset.lat;
        let hubLon = srcInput.dataset.lon;
        if (hubLat && hubLon) {
            points.push({ lat: parseFloat(hubLat), lon: parseFloat(hubLon) });
            labels.push(srcInput.value.trim());
        } else {
            label.textContent = 'Geocoding Dispatch Hub...';
            const resolved = await geocodeSingleAddress(srcInput.value.trim());
            if (!resolved) throw new Error(`Could not locate Dispatch Hub: "${srcInput.value}"`);
            srcInput.dataset.lat = resolved.lat;
            srcInput.dataset.lon = resolved.lon;
            points.push(resolved);
            labels.push(srcInput.value.trim());
        }

        // 2. Resolve dropoffs sequentially to prevent Nominatim blocks
        for (let i = 0; i < dropoffInputs.length; i++) {
            const input = dropoffInputs[i];
            const val = input.value.trim();
            if (!val) continue; // Skip empty fields

            let lat = input.dataset.lat;
            let lon = input.dataset.lon;

            if (lat && lon) {
                points.push({ lat: parseFloat(lat), lon: parseFloat(lon) });
                labels.push(val);
            } else {
                // Inform user of progress
                label.textContent = `Geocoding Stop #${i+1} (respecting API limits)...`;
                
                // Strict rate limit wait delay (1200ms) to stay under the 1req/sec limit
                await new Promise(r => setTimeout(r, 1200));
                const resolved = await geocodeSingleAddress(val);
                if (!resolved) throw new Error(`Could not locate Stop #${i+1}: "${val}"`);
                input.dataset.lat = resolved.lat;
                input.dataset.lon = resolved.lon;
                points.push(resolved);
                labels.push(val);
            }
        }

        if (points.length < 2) {
            throw new Error("Please enter at least one valid delivery drop-off location.");
        }

        // Decide whether standard routing (2 locations) or TSP Trip Optimization (3+ locations)
        let routeData = null;
        let isOptimized = false;
        const coordsStr = points.map(p => `${p.lon},${p.lat}`).join(';');

        // Map mode to valid OSRM profile
        const queryMode = activeMode === 'driving' ? 'car' : activeMode;

        if (points.length === 2) {
            // Standard routing
            const osrmUrl = `https://router.project-osrm.org/route/v1/${queryMode}/${coordsStr}?overview=full&geometries=geojson&steps=true`;
            const res = await fetch(osrmUrl);
            routeData = await res.json();
        } else {
            // Solve TSP via OSRM Trip
            // source=first means start at the Hub
            // roundtrip=false means do not force a loop back to Hub
            const osrmUrl = `https://router.project-osrm.org/trip/v1/${queryMode}/${coordsStr}?source=first&roundtrip=false&overview=full&geometries=geojson&steps=true`;
            const res = await fetch(osrmUrl);
            const rawData = await res.json();
            
            if (rawData.code === 'Ok') {
                isOptimized = true;
                // Transform Trip structure to match Route structure for easier unified parsing
                routeData = {
                    code: 'Ok',
                    routes: [rawData.trips[0]],
                    waypoints: rawData.waypoints
                };
            } else {
                routeData = rawData;
            }
        }

        if (routeData.code !== 'Ok') {
            throw new Error("No driving path could connect these delivery points.");
        }

        const route = routeData.routes[0];
        const distanceKm = route.distance / 1000.0;
        const durationMins = route.duration / 60.0;

        // Sort out optimized visit sequence indices
        let optimizedSequence = [];
        if (isOptimized) {
            // OSRM returns waypoints ordered in the optimal visit path sequence
            optimizedSequence = routeData.waypoints.map(wp => wp.waypoint_index);
        } else {
            optimizedSequence = [0, 1]; // Simple line
        }

        // Render Map Overlays
        renderRouteOnMap(route, points, optimizedSequence, labels);

        // Render Statistics Panels
        renderAnalyticsStats(distanceKm, durationMins);

        // Render Steps Leg by Leg
        renderStepList(route.legs, optimizedSequence, labels);

        // Show panel
        statsPanel.style.display = 'flex';
        showToast(isOptimized ? "Route optimized successfully!" : "Route generated successfully!", "success");

    } catch (err) {
        showToast(err.message || "Error processing navigation.", "danger");
    } finally {
        loading.style.display = 'none';
        label.textContent = 'Calculate & Optimize Route';
    }
}

// Draw path and custom markers on map
function renderRouteOnMap(route, originalPoints, optimizedSequence, labels) {
    if (routeGlowLayer) map.removeLayer(routeGlowLayer);
    if (routeFlowLayer) map.removeLayer(routeFlowLayer);
    routeLegLayers.forEach(l => {
        if (l && l.layer) map.removeLayer(l.layer);
    });
    routeLegLayers = [];
    clearActiveMarkers();

    const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

    // Thick background glow line
    routeGlowLayer = L.polyline(coordinates, {
        color: '#3a86ff',
        weight: 8,
        opacity: 0.35,
        className: 'route-glow'
    }).addTo(map);

    // Flowing pulsing dashed line on top
    routeFlowLayer = L.polyline(coordinates, {
        color: '#ffffff',
        weight: 3.5,
        opacity: 0.9,
        className: 'route-flow'
    }).addTo(map);

    // Reconstruct and draw leg layers
    if (route.legs && route.legs.length > 0) {
        route.legs.forEach((leg, legIndex) => {
            const legCoords = [];
            if (leg.steps && leg.steps.length > 0) {
                leg.steps.forEach(step => {
                    if (step.geometry && step.geometry.coordinates) {
                        step.geometry.coordinates.forEach(coord => {
                            legCoords.push([coord[1], coord[0]]);
                        });
                    }
                });
            } else {
                const startPoint = originalPoints[optimizedSequence[legIndex]];
                const endPoint = originalPoints[optimizedSequence[legIndex + 1]];
                legCoords.push([startPoint.lat, startPoint.lon]);
                legCoords.push([endPoint.lat, endPoint.lon]);
            }

            const legLayer = L.polyline(legCoords, {
                color: '#3a86ff',
                weight: 6,
                opacity: 0.0,
                interactive: false
            }).addTo(map);

            routeLegLayers.push({
                layer: legLayer,
                coords: legCoords
            });
        });
    }

    // Render Numbered Pin markers based on optimized sequence
    optimizedSequence.forEach((originalIndex, orderIndex) => {
        const point = originalPoints[originalIndex];
        const label = labels[originalIndex];

        let markerColor = 'var(--primary)';
        let markerText = orderIndex; // Visit number
        let tag = `Delivery Stop #${orderIndex}`;

        if (orderIndex === 0) {
            markerColor = 'var(--success)';
            markerText = 'Start';
            tag = 'Start Dispatch Hub';
        } else if (orderIndex === optimizedSequence.length - 1) {
            markerColor = 'var(--danger)';
            markerText = 'End';
            tag = 'Final Delivery Stop';
        }

        const numberedIcon = L.divIcon({
            html: `<div style="
                background-color: ${markerColor}; 
                color: white; 
                font-family: var(--font-family);
                font-weight: 700;
                font-size: 11px;
                width: 28px; 
                height: 28px; 
                border-radius: 50%; 
                border: 2px solid white; 
                box-shadow: 0 4px 10px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
            ">${markerText}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker([point.lat, point.lon], { icon: numberedIcon }).addTo(map);
        const popupContent = `
            <div style="color:#000; font-family:var(--font-family); min-width:160px; line-height:1.4;">
                <div style="font-weight:700; color:${markerColor}; font-size:12px; margin-bottom:2px;">
                    ${tag}
                </div>
                <div style="font-size:11px; color:#555;">${label.split(',')[0]}</div>
                ${orderIndex > 0 ? `<div style="font-size:10px; color:#999; margin-top:2px;">Visit Order: ${orderIndex}</div>` : ''}
            </div>
        `;
        marker.bindPopup(popupContent);
        activeMarkers.push(marker);
    });

    // Zoom Map to Route
    map.fitBounds(routeGlowLayer.getBounds(), { padding: [60, 60], animate: true, duration: 1.2 });
}

// Render analytics stats grid
function renderAnalyticsStats(distanceKm, durationMins) {
    const container = document.getElementById('stats-container');
    container.innerHTML = '';

    let timeStr = `${Math.ceil(durationMins)} min`;
    if (durationMins >= 60) {
        const hrs = Math.floor(durationMins / 60);
        const mins = Math.round(durationMins % 60);
        timeStr = `${hrs}h ${mins}m`;
    }

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-val">${distanceKm.toFixed(2)} km</div>
            <div class="stat-lbl">Total Distance</div>
        </div>
        <div class="stat-card">
            <div class="stat-val">${timeStr}</div>
            <div class="stat-lbl">Total Time</div>
        </div>
    `;
}

// Render leg-by-leg optimized list
function renderStepList(legs, optimizedSequence, labels) {
    const list = document.getElementById('steps-list');
    list.innerHTML = '';

    legs.forEach((leg, legIndex) => {
        const originLabel = labels[optimizedSequence[legIndex]];
        const destLabel = labels[optimizedSequence[legIndex + 1]];

        // Add header separating this delivery leg
        const legHeader = document.createElement('li');
        legHeader.style.padding = '12px 0 6px 0';
        legHeader.style.fontWeight = '700';
        legHeader.style.color = 'var(--primary)';
        legHeader.style.borderBottom = '1px solid var(--border-color)';
        legHeader.style.fontSize = '0.88rem';
        legHeader.style.display = 'flex';
        legHeader.style.alignItems = 'center';
        legHeader.style.gap = '6px';
        legHeader.style.cursor = 'pointer';
        
        let originShort = originLabel.split(',')[0];
        let destShort = destLabel.split(',')[0];
        
        legHeader.innerHTML = `📦 Leg ${legIndex + 1}: ${originShort} ➜ ${destShort}`;
        
        // Dynamic Hover Interactions
        legHeader.addEventListener('mouseenter', () => {
            const legObj = routeLegLayers[legIndex];
            if (legObj && legObj.layer) {
                legObj.layer.setStyle({
                    color: '#ffd166',
                    weight: 10,
                    opacity: 0.95
                });
                legObj.layer.bringToFront();
            }
            if (activeMarkers[legIndex + 1]) {
                activeMarkers[legIndex + 1].openPopup();
            }
        });

        legHeader.addEventListener('mouseleave', () => {
            const legObj = routeLegLayers[legIndex];
            if (legObj && legObj.layer) {
                legObj.layer.setStyle({
                    color: '#3a86ff',
                    weight: 6,
                    opacity: 0.0
                });
            }
        });

        legHeader.addEventListener('click', () => {
            const legObj = routeLegLayers[legIndex];
            if (legObj && legObj.layer) {
                const bounds = legObj.layer.getBounds();
                map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.0 });
            }
        });

        list.appendChild(legHeader);

        // Add steps within this leg
        leg.steps.forEach(step => {
            const instruction = parseStep(step);
            const li = document.createElement('li');
            li.className = 'step-item';
            li.innerHTML = `<span class="step-icon-dot"></span>${instruction}`;
            list.appendChild(li);
        });
    });
}

// Parse OSRM step
function parseStep(step) {
    const maneuver = step.maneuver;
    const name = step.name;
    const type = maneuver.type;
    const modifier = maneuver.modifier;
    const dist = step.distance;

    let action = type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
    let modStr = modifier ? ` ${modifier}` : '';
    let streetStr = name ? ` onto ${name}` : '';
    let distStr = dist > 0 ? ` [for ${Math.round(dist)}m]` : '';

    if (type === 'depart') {
        return `Depart${streetStr}${distStr}.`;
    } else if (type === 'arrive') {
        return `Arrive at stop.`;
    } else if (type === 'turn') {
        return `Turn${modStr}${streetStr}${distStr}.`;
    } else if (type === 'continue') {
        return `Continue${streetStr}${distStr}.`;
    } else if (type === 'new name') {
        return `Road name changes${streetStr}${distStr}.`;
    } else {
        return `${action}${modStr}${streetStr}${distStr}.`;
    }
}

// Toast triggers
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast-banner');
    toast.className = `toast-banner ${type}`;
    document.getElementById('toast-text').textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// Start console on DOM ready
window.addEventListener('DOMContentLoaded', initConsole);

// AWS DB shipment parameter scanner
async function checkForIncomingShipment() {
    const urlParams = new URLSearchParams(window.location.search);
    const shipmentId = urlParams.get('shipment_id');
    if (shipmentId) {
        document.getElementById('shipment-select').value = shipmentId;
        loadShipmentById(shipmentId);
    } else {
        addDropoffField();
    }
}

async function loadShipmentById(shipmentId) {
    showToast(`Loading shipment #${shipmentId} from AWS database...`, "info");
    try {
        const res = await fetch(`/api/logistics/shipment/${shipmentId}`);
        if (!res.ok) {
            throw new Error(`Failed to load shipment (Status ${res.status})`);
        }
        const data = await res.json();
        if (!data.success) {
            throw new Error(data.message || "Failed to load shipment data");
        }

        // 1. Populate Shipment Metadata
        document.getElementById('shipment-meta').style.display = 'block';
        document.getElementById('meta-carrier').textContent = data.shipment.carrier_name || 'N/A';
        document.getElementById('meta-tracking').textContent = data.shipment.tracking_number || 'N/A';
        document.getElementById('meta-cost').textContent = data.shipment.shipping_cost ? `$${data.shipment.shipping_cost.toFixed(2)}` : 'N/A';
        
        if (data.shipment.estimated_delivery) {
            const eta = new Date(data.shipment.estimated_delivery);
            document.getElementById('meta-eta').textContent = eta.toLocaleString();
        } else {
            document.getElementById('meta-eta').textContent = 'N/A';
        }

        // 2. Populate Warehouse / Hub
        const srcInput = document.getElementById('src-input');
        srcInput.value = data.warehouse.name || data.warehouse.address;
        if (data.warehouse.latitude && data.warehouse.longitude) {
            srcInput.dataset.lat = data.warehouse.latitude;
            srcInput.dataset.lon = data.warehouse.longitude;
        }

        // 3. Clear existing dropoff inputs and populate with shipment dropoffs
        const container = document.getElementById('inputs-container');
        const rows = container.querySelectorAll('.dropoff-row');
        rows.forEach(r => r.remove());
        dropoffCounter = 0;

        if (data.dropoffs && data.dropoffs.length > 0) {
            data.dropoffs.forEach(dropoff => {
                const labelStr = dropoff.address;
                addDropoffField(labelStr);
                
                const inputId = `dropoff-input-${dropoffCounter}`;
                const input = document.getElementById(inputId);
                if (dropoff.latitude && dropoff.longitude) {
                    input.dataset.lat = dropoff.latitude;
                    input.dataset.lon = dropoff.longitude;
                }
            });
        } else {
            addDropoffField();
        }

        // 4. Auto-calculate the optimized delivery route
        showToast("Shipment loaded. Optimizing route...", "success");
        setTimeout(() => {
            onCalculateRoute();
        }, 800);

    } catch (err) {
        showToast(`DB Fetch Error: ${err.message}`, "danger");
        addDropoffField();
    }
}

async function loadShipmentsDropdown() {
    try {
        const res = await fetch('/api/logistics/shipments');
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.shipments) {
                const select = document.getElementById('shipment-select');
                select.innerHTML = '<option value="">Load Shipment...</option>';
                data.shipments.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.shipment_id;
                    opt.textContent = `Shipment #${s.shipment_id} (${s.carrier_name})`;
                    select.appendChild(opt);
                });
                const urlParams = new URLSearchParams(window.location.search);
                const shipmentId = urlParams.get('shipment_id');
                if (shipmentId) {
                    select.value = shipmentId;
                }
            }
        }
    } catch (e) {
        console.error("Failed to load shipments selector list:", e);
    }
}

// Toggle Google Maps-like GPS tracking & auto-follow mode
function toggleLocationTracking() {
    const btn = document.getElementById('btn-map-track');
    
    if (isTrackingUser) {
        isTrackingUser = false;
        btn.classList.remove('tracking-active');
        map.stopLocate();
        if (userLocationMarker) map.removeLayer(userLocationMarker);
        if (userAccuracyCircle) map.removeLayer(userAccuracyCircle);
        userLocationMarker = null;
        userAccuracyCircle = null;
        showToast("Auto-follow tracking stopped.", "info");
    } else {
        isTrackingUser = true;
        btn.classList.add('tracking-active');
        showToast("Starting real-time GPS tracking...", "info");
        
        map.locate({
            watch: true,
            enableHighAccuracy: true,
            setView: false
        });
    }
}

function onLocationFound(e) {
    const radius = e.accuracy / 2;
    const latlng = e.latlng;

    // Create a beautiful pulsing blue dot marker icon matching Google Maps style
    const blueDotIcon = L.divIcon({
        html: `
            <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 14px; height: 14px; background: #0078ff; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px rgba(0,120,255,0.8); z-index: 10;"></div>
                <div style="position: absolute; width: 22px; height: 22px; background: rgba(0,120,255,0.4); border-radius: 50%; animation: pulseBlue 1.6s infinite ease-in-out; z-index: 1;"></div>
            </div>
            <style>
                @keyframes pulseBlue {
                    0% { transform: scale(0.6); opacity: 1; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
            </style>
        `,
        className: 'gps-blue-dot',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });

    if (userLocationMarker) {
        userLocationMarker.setLatLng(latlng);
    } else {
        userLocationMarker = L.marker(latlng, { icon: blueDotIcon }).addTo(map);
        userLocationMarker.bindPopup("<div style='color:#000; font-family:var(--font-family); font-size:11px; text-align:center;'><b>My Location</b></div>");
    }

    if (userAccuracyCircle) {
        userAccuracyCircle.setLatLng(latlng);
        userAccuracyCircle.setRadius(radius);
    } else {
        userAccuracyCircle = L.circle(latlng, {
            radius: radius,
            color: '#0078ff',
            fillColor: '#0078ff',
            fillOpacity: 0.08,
            weight: 1,
            opacity: 0.25
        }).addTo(map);
    }

    // Pan map smoothly to stay centered on user position
    if (isTrackingUser) {
        map.setView(latlng, map.getZoom(), { animate: true, duration: 1.0 });
    }
}

function onLocationError(e) {
    showToast(`GPS Tracking Error: ${e.message}`, "danger");
    isTrackingUser = false;
    document.getElementById('btn-map-track').classList.remove('tracking-active');
}