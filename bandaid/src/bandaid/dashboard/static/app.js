/**
 * Bandaid Security Proxy Dashboard
 *
 * Fetches and displays security statistics and events with auto-refresh.
 */

// Configuration
const API_BASE = '/api';
const REFRESH_INTERVAL = 3000; // 3 seconds
let currentPage = 1;
let filters = {
    eventType: '',
    threatType: '',
    severity: ''
};
let refreshTimer = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    fetchStats();
    fetchEvents();
    startAutoRefresh();
});

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Filter buttons
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);

    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));
}

/**
 * Fetch statistics from API
 */
async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');

        const data = await response.json();
        updateStats(data);
    } catch (error) {
        console.error('Error fetching stats:', error);
        showError('stats');
    }
}

/**
 * Update statistics display
 */
function updateStats(data) {
    document.getElementById('total-requests').textContent = data.total_requests;
    document.getElementById('allowed-count').textContent = data.allowed_count;
    document.getElementById('blocked-count').textContent = data.blocked_count;

    // Calculate block rate
    const blockRate = data.total_requests > 0
        ? ((data.blocked_count / data.total_requests) * 100).toFixed(1)
        : '0.0';
    document.getElementById('block-rate').textContent = `${blockRate}%`;

    // Update threat breakdown
    updateThreatBreakdown(data.threat_breakdown);
}

/**
 * Update threat breakdown display
 */
function updateThreatBreakdown(threats) {
    const container = document.getElementById('threat-breakdown-content');

    if (!threats || Object.keys(threats).length === 0) {
        container.innerHTML = '<p class="loading">No threats detected yet.</p>';
        return;
    }

    container.innerHTML = Object.entries(threats)
        .map(([type, count]) => `
            <div class="threat-badge">
                <span>${formatThreatType(type)}</span>
                <span class="threat-badge-count">${count}</span>
            </div>
        `)
        .join('');
}

/**
 * Fetch events from API
 */
async function fetchEvents() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            per_page: 50
        });

        // Add filters if set
        if (filters.eventType) params.append('event_type', filters.eventType);
        if (filters.threatType) params.append('threat_type', filters.threatType);
        if (filters.severity) params.append('severity', filters.severity);

        const response = await fetch(`${API_BASE}/events?${params}`);
        if (!response.ok) throw new Error('Failed to fetch events');

        const data = await response.json();
        updateEvents(data);
        updatePagination(data);
    } catch (error) {
        console.error('Error fetching events:', error);
        showError('events');
    }
}

/**
 * Update events table
 */
function updateEvents(data) {
    const tbody = document.getElementById('events-table-body');

    if (!data.events || data.events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No events found.</td></tr>';
        return;
    }

    tbody.innerHTML = data.events.map(event => `
        <tr>
            <td>${formatTimestamp(event.timestamp)}</td>
            <td>${formatEventType(event.event_type)}</td>
            <td>${formatThreatType(event.threat_type)}</td>
            <td class="severity-${event.severity_level}">${event.severity_level.toUpperCase()}</td>
            <td>${formatConfidence(event.confidence_level)}</td>
            <td>${event.detection_layer || '-'}</td>
            <td><span title="${event.redacted_content}">${truncate(event.redacted_content, 50)}</span></td>
        </tr>
    `).join('');
}

/**
 * Update pagination controls
 */
function updatePagination(data) {
    document.getElementById('page-info').textContent = `Page ${data.page} of ${data.total_pages}`;
    document.getElementById('prev-page').disabled = data.page === 1;
    document.getElementById('next-page').disabled = data.page >= data.total_pages;
}

/**
 * Apply filters
 */
function applyFilters() {
    filters.eventType = document.getElementById('filter-event-type').value;
    filters.threatType = document.getElementById('filter-threat-type').value;
    filters.severity = document.getElementById('filter-severity').value;
    currentPage = 1;
    fetchEvents();
}

/**
 * Clear filters
 */
function clearFilters() {
    document.getElementById('filter-event-type').value = '';
    document.getElementById('filter-threat-type').value = '';
    document.getElementById('filter-severity').value = '';
    filters = { eventType: '', threatType: '', severity: '' };
    currentPage = 1;
    fetchEvents();
}

/**
 * Change page
 */
function changePage(delta) {
    currentPage += delta;
    fetchEvents();
}

/**
 * Start auto-refresh
 */
function startAutoRefresh() {
    refreshTimer = setInterval(() => {
        fetchStats();
        fetchEvents();
        flashRefreshIndicator();
    }, REFRESH_INTERVAL);
}

/**
 * Flash refresh indicator
 */
function flashRefreshIndicator() {
    const indicator = document.getElementById('refresh-indicator');
    indicator.style.opacity = '1';
    setTimeout(() => {
        indicator.style.opacity = '0.4';
    }, 200);
}

/**
 * Format event type
 */
function formatEventType(type) {
    const badges = {
        'blocked': '<span class="event-badge event-blocked">Blocked</span>',
        'allowed': '<span class="event-badge event-allowed">Allowed</span>',
        'medium_confidence_warning': '<span class="event-badge event-warning">Warning</span>',
        'data_leak_alert': '<span class="event-badge event-leak">Leak Alert</span>'
    };
    return badges[type] || type;
}

/**
 * Format threat type
 */
function formatThreatType(type) {
    if (!type) return '-';
    const formatted = type.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Format confidence
 */
function formatConfidence(confidence) {
    if (confidence === null || confidence === undefined) return '-';
    return `${(confidence * 100).toFixed(1)}%`;
}

/**
 * Truncate text
 */
function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Show error message
 */
function showError(section) {
    if (section === 'stats') {
        document.getElementById('total-requests').textContent = 'Error';
        document.getElementById('allowed-count').textContent = 'Error';
        document.getElementById('blocked-count').textContent = 'Error';
        document.getElementById('block-rate').textContent = 'Error';
    } else if (section === 'events') {
        document.getElementById('events-table-body').innerHTML =
            '<tr><td colspan="7" class="loading" style="color: var(--danger-color);">Error loading events. Please refresh.</td></tr>';
    }
}
