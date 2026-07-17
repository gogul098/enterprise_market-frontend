let warehousesLoaded = false;

// App Controller for Standalone Inventory planning
function initDashboard() {
    registerEvents();
    loadForecastingData();
}

function registerEvents() {
    document.getElementById('btn-reset').addEventListener('click', () => {
        loadForecastingData();
        showToast("Dashboard data refreshed.", "info");
    });
}

// Fetch and Draw Planning scorecards
async function loadInventoryPlanningData() {
    const loadingText = document.getElementById('planning-loading-text');
    const container = document.getElementById('planning-items-container');
    const whSelect = document.getElementById('planning-wh-select');

    loadingText.style.display = 'flex';
    container.innerHTML = '';

    const whId = whSelect.value;
    const url = whId ? `/api/warehouse/inventory-planning?warehouse_id=${whId}` : '/api/warehouse/inventory-planning';

    try {
        const res = await fetch(url, { headers: { 'X-API-Key': 'EM-2026-xK9pLm4qR7vN3wZa8bYc1dEf' } });
        if (!res.ok) throw new Error(`API returned error status ${res.status}`);
        const data = await res.json();
        
        if (!data.success) {
            throw new Error(data.message || "Failed to parse API data.");
        }

        loadingText.style.display = 'none';

        // Dynamically populate select dropdown options on the initial load
        if (!warehousesLoaded && !whId) {
            whSelect.innerHTML = '<option value="">All Warehouses</option>';
            data.planning.forEach(wh => {
                const opt = document.createElement('option');
                opt.value = wh.warehouse_id;
                opt.textContent = wh.warehouse_name;
                whSelect.appendChild(opt);
            });
            warehousesLoaded = true;
        }

        data.planning.forEach(wh => {
            // Draw Warehouse Name header
            const header = document.createElement('div');
            header.className = 'warehouse-header-tag';
            header.innerHTML = `🏢 ${wh.warehouse_name} &nbsp;•&nbsp; Capacity: ${wh.capacity} units`;
            container.appendChild(header);

            // Draw product details cards
            wh.items.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card';

                // Status colors
                let badgeColor = '#06d6a0'; // var(--success)
                if (p.risk_status.includes("CRITICAL")) badgeColor = '#ef476f'; // var(--danger)
                else if (p.risk_status.includes("LOW")) badgeColor = '#ffd166'; // var(--warning)

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
                        <div>
                            <div style="font-weight:700; font-size:1rem; color:var(--text-main);">${p.product_name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace; margin-top:2px;">${p.sku}</div>
                        </div>
                        <span style="font-size:0.65rem; font-weight:700; padding:4px 8px; border-radius:6px; background:${badgeColor}22; color:${badgeColor}; border:1px solid ${badgeColor}33; text-transform:uppercase;">
                            ${p.risk_status.split(' ')[0]}
                        </span>
                    </div>

                    <!-- Details Grid -->
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; background:rgba(255,255,255,0.02); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.03); width:100%;">
                        <div style="text-align:center;">
                            <div style="font-size:1rem; font-weight:700; color:var(--text-main);">${p.starting_stock}</div>
                            <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; margin-top:2px; font-weight:600;">Stock</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:1rem; font-weight:700; color:var(--primary);">${p.average_daily_outflow}</div>
                            <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; margin-top:2px; font-weight:600;">Daily Outflow</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:1rem; font-weight:700; color:var(--success);">${p.estimated_returns}</div>
                            <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; margin-top:2px; font-weight:600;">Daily Returns</div>
                        </div>
                    </div>

                    <!-- Restock Warning Message -->
                    ${p.risk_status.includes("CRITICAL") ? 
                        `<div style="font-size: 0.75rem; color:#ef476f; background:rgba(239,71,111,0.08); padding:8px 10px; border-radius:8px; border:1px solid rgba(239,71,111,0.15); display:flex; align-items:center; gap:6px;">
                            ⚠️ Out-of-stock risk detected! Stock is below safety limit.
                         </div>` : ''
                    }

                    <!-- Collapsible forecast trigger -->
                    <button class="btn-toggle-forecast">
                        👁️ Show 7-Day Day-by-Day Ledger
                    </button>

                    <!-- Collapsible Table -->
                    <div class="forecast-table-container">
                        <table class="forecast-table">
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    <th style="text-align:right;">Start</th>
                                    <th style="text-align:right; color:var(--primary);">Out</th>
                                    <th style="text-align:right; color:#a855f7;">In (PO)</th>
                                    <th style="text-align:right; color:var(--success);">Returns</th>
                                    <th style="text-align:right; font-weight:700;">End</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.forecast.map(f => `
                                    <tr>
                                        <td style="font-family:monospace;">${f.date}</td>
                                        <td style="text-align:right;">${f.starting_stock}</td>
                                        <td style="text-align:right; color:var(--primary);">${f.outflow}</td>
                                        <td style="text-align:right; color:#a855f7; font-weight:${f.inflow > 0 ? '700' : 'normal'};">${f.inflow > 0 ? '+' + f.inflow : '0'}</td>
                                        <td style="text-align:right; color:var(--success);">+${f.returns}</td>
                                        <td style="text-align:right; font-weight:700; color:${f.ending_stock <= wh.capacity * 0.05 ? '#ef476f' : 'var(--text-main)'};">${f.ending_stock}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;

                // Collapsible drawer toggle trigger logic
                card.querySelector('.btn-toggle-forecast').addEventListener('click', (e) => {
                    const block = card.querySelector('.forecast-table-container');
                    const btn = e.currentTarget;
                    if (block.style.display === 'block') {
                        block.style.display = 'none';
                        btn.textContent = '👁️ Show 7-Day Day-by-Day Ledger';
                    } else {
                        block.style.display = 'block';
                        btn.textContent = '🙈 Hide 7-Day Day-by-Day Ledger';
                    }
                });

                container.appendChild(card);
            });
        });

    } catch (err) {
        container.innerHTML = `
            <div style="color:#ef476f; text-align:center; font-size:0.9rem; padding:40px 10px;">
                ❌ API connection failed: ${err.message}
            </div>
        `;
    }
}

// Toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast-banner');
    toast.className = `toast-banner ${type}`;
    document.getElementById('toast-text').textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// Fetch and Draw Demand Forecasting Tab
async function loadForecastingData() {
    const container = document.getElementById('forecasting-container');
    container.innerHTML = `
        <div class="loading-text">
            <span class="spinner"></span>
            Analyzing order velocity...
        </div>
    `;

    try {
        const response = await fetch('/api/warehouse/forecasting', { headers: { 'X-API-Key': 'EM-2026-xK9pLm4qR7vN3wZa8bYc1dEf' } });
        if (!response.ok) throw new Error("API Server offline");
        const data = await response.json();

        if (!data.success) throw new Error(data.message || "Failed to load forecast data");

        container.innerHTML = '';

        data.forecasting.forEach(f => {
            const card = document.createElement('div');
            card.className = 'product-card';

            let badgeColor = 'var(--success)';
            if (f.recommendation === 'RESTOCK NOW') badgeColor = 'var(--danger)';
            else if (f.recommendation === 'RESTOCK SOON') badgeColor = 'var(--warning)';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
                    <div>
                        <div style="font-weight:700; font-size:1rem; color:var(--text-main);">${f.name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace; margin-top:2px;">${f.sku}</div>
                    </div>
                    <span style="font-size:0.65rem; font-weight:700; padding:4px 8px; border-radius:6px; background:${badgeColor}22; color:${badgeColor}; border:1px solid ${badgeColor}33; text-transform:uppercase;">
                        ${f.recommendation}
                    </span>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; background:rgba(255,255,255,0.02); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.03); text-align:center; width:100%;">
                    <div>
                        <div style="font-size:1rem; font-weight:700; color:var(--text-main);">${f.current_stock}</div>
                        <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; margin-top:2px; font-weight:600;">Stock Available</div>
                    </div>
                    <div>
                        <div style="font-size:1rem; font-weight:700; color:var(--primary);">${f.velocity_daily} / day</div>
                        <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; margin-top:2px; font-weight:600;">Sales Velocity</div>
                    </div>
                    <div>
                        <div style="font-size:1rem; font-weight:700; color:${badgeColor};">${f.days_remaining} days</div>
                        <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; margin-top:2px; font-weight:600;">Stock Life</div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--danger); text-align:center; padding:30px;">❌ Failed to load forecasting details: ${e.message}</div>`;
    }
}

// Fetch and Draw Vendor Performance Tab
async function loadVendorPerformanceData() {
    const container = document.getElementById('vendors-container');
    container.innerHTML = `
        <div class="loading-text">
            <span class="spinner"></span>
            Fetching supplier logs...
        </div>
    `;

    try {
        const response = await fetch('/api/warehouse/vendor-performance', { headers: { 'X-API-Key': 'EM-2026-xK9pLm4qR7vN3wZa8bYc1dEf' } });
        if (!response.ok) throw new Error("API Server offline");
        const data = await response.json();

        if (!data.success) throw new Error(data.message || "Failed to load vendor data");

        container.innerHTML = '';

        data.vendors.forEach(v => {
            const card = document.createElement('div');
            card.className = 'product-card';

            let gradeColor = 'var(--success)';
            if (v.score === 'B') gradeColor = 'var(--warning)';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
                    <div>
                        <div style="font-weight:700; font-size:1rem; color:var(--text-main);">${v.vendor_name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Supplier ID: #${v.vendor_id}</div>
                    </div>
                    <span style="font-size:0.9rem; font-weight:800; padding:4px 10px; border-radius:8px; background:${gradeColor}22; color:${gradeColor}; border:1px solid ${gradeColor}33;">
                        ${v.score}
                    </span>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; background:rgba(255,255,255,0.02); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.03); text-align:center; width:100%;">
                    <div>
                        <div style="font-size:1rem; font-weight:700; color:var(--text-main);">${v.fulfilled_orders}</div>
                        <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; margin-top:2px; font-weight:600;">Fulfilled</div>
                    </div>
                    <div>
                        <div style="font-size:1rem; font-weight:700; color:var(--primary);">${v.on_time_delivery_pct}%</div>
                        <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; margin-top:2px; font-weight:600;">On-Time %</div>
                    </div>
                    <div>
                        <div style="font-size:1rem; font-weight:700; color:var(--success);">${v.lead_time_days} days</div>
                        <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; margin-top:2px; font-weight:600;">Avg Lead Time</div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = `<div style="color:var(--danger); text-align:center; padding:30px;">❌ Failed to load vendor performance: ${e.message}</div>`;
    }
}

// Start
window.addEventListener('DOMContentLoaded', initDashboard);
