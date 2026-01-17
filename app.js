// DOM Elements
let loadingEl, errorEl, errorMessageEl, leaderboardEl, leaderboardListEl, lastUpdateTimeEl, lastUpdateLabelEl;
let connectionStatusEl, statusTextEl;
let versionButtons;

// Countdown elements
let countdownEl, countdownExpiredEl;
let countdownDaysEl, countdownHoursEl, countdownMinutesEl, countdownSecondsEl;

// Countdown target: 18/01/2026 at 20:00 Italian time (CET = UTC+1)
const COUNTDOWN_TARGET = new Date('2026-01-18T19:00:00Z');

// App state
let leaderboardData = {};
let leaderboardV1Data = null;
let leaderboardV2Data = null;
let currentVersion = 'current'; // 'current', 'v1', 'v2'
let isInitialDataLoaded = false;
let isConnected = false;

// Static dates for archived leaderboards
const LEADERBOARD_DATES = {
    v1: { start: '2025-12-16', end: '2026-01-17' },
    v2: { start: '2026-02-18', end: '2026-02-18' }
};

// Loading timeout (10 seconds)
const LOADING_TIMEOUT = 10000;
let loadingTimeoutId = null;

// Reconnecting timeout (20 seconds before showing Disconnected)
const RECONNECTING_TIMEOUT = 20000;
let reconnectingTimeoutId = null;

// Firebase references for cleanup
let leaderboardRef = null;
let connectedRef = null;

async function init() {
    // Initialize DOM references
    loadingEl = document.getElementById('loading');
    errorEl = document.getElementById('error');
    errorMessageEl = document.getElementById('error-message');
    leaderboardEl = document.getElementById('leaderboard');
    leaderboardListEl = document.getElementById('leaderboard-list');
    lastUpdateTimeEl = document.getElementById('last-update-time');
    lastUpdateLabelEl = document.getElementById('last-update-label');
    connectionStatusEl = document.getElementById('connection-status');
    statusTextEl = document.getElementById('status-text');
    versionButtons = document.querySelectorAll('.version-btn');
    
    // Initialize countdown elements
    countdownEl = document.getElementById('countdown');
    countdownExpiredEl = document.getElementById('countdown-expired');
    countdownDaysEl = document.getElementById('countdown-days');
    countdownHoursEl = document.getElementById('countdown-hours');
    countdownMinutesEl = document.getElementById('countdown-minutes');
    countdownSecondsEl = document.getElementById('countdown-seconds');
    
    // Start countdown timer
    initCountdown();
    
    // Setup version button listeners
    versionButtons.forEach(btn => {
        btn.addEventListener('click', () => switchVersion(btn.dataset.version));
    });
    
    // Load static JSON data for v1 and v2
    await loadStaticLeaderboards();
    
    // Set loading timeout
    loadingTimeoutId = setTimeout(onLoadingTimeout, LOADING_TIMEOUT);
    
    // Connect to Firebase (no authentication required)
    try {
        console.log('Connecting to Firebase...');
        
        // Monitor connection state
        connectedRef = database.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            if (snap.val() === true) {
                // Connected: cancel any pending timeout
                if (reconnectingTimeoutId) {
                    clearTimeout(reconnectingTimeoutId);
                    reconnectingTimeoutId = null;
                }
                setConnectionStatus('connected');
            } else {
                if (isInitialDataLoaded) {
                    // Show Reconnecting first
                    setConnectionStatus('reconnecting');
                    
                    // After timeout, show Disconnected
                    if (reconnectingTimeoutId) {
                        clearTimeout(reconnectingTimeoutId);
                    }
                    reconnectingTimeoutId = setTimeout(() => {
                        if (!isConnected) {
                            setConnectionStatus('disconnected');
                        }
                    }, RECONNECTING_TIMEOUT);
                }
            }
        });
        
        // Connect to database
        leaderboardRef = database.ref('Leaderboard');
        
        // Listen for real-time changes
        leaderboardRef.on('value', onDataReceived, onDataError);
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error.\nPlease try again later.');
    }
}

async function loadStaticLeaderboards() {
    try {
        // Load V1 leaderboard
        const v1Response = await fetch('leaderboard-v1-export.json');
        const v1Data = await v1Response.json();
        leaderboardV1Data = v1Data.Leaderboard || {};
        
        // Load V2 leaderboard
        const v2Response = await fetch('leaderboard-v2-export.json');
        const v2Data = await v2Response.json();
        leaderboardV2Data = v2Data.Leaderboard || {};
    } catch (error) {
        console.error('Error loading static leaderboards:', error);
    }
}

function switchVersion(version) {
    currentVersion = version;
    
    // Update button states
    versionButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.version === version);
    });
    
    // Update connection status visibility
    if (version === 'current') {
        connectionStatusEl.style.display = 'flex';
    } else {
        connectionStatusEl.style.display = 'none';
    }
    
    // Re-render leaderboard with appropriate data
    updateLeaderboard();
    showLeaderboard();
    updateLastUpdateTime();
}

function onLoadingTimeout() {
    if (!isInitialDataLoaded) {
        showError('Connection timeout!\nPlease check your internet connection.');
    }
}

function onDataReceived(snapshot) {
    // Cancel timeout if exists
    if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
    }
    
    isInitialDataLoaded = true;
    
    const data = snapshot.val();
    
    if (data) {
        leaderboardData = data;
        updateLeaderboard();
        showLeaderboard();
    } else {
        // Empty database
        leaderboardData = {};
        updateLeaderboard();
        showLeaderboard();
    }
    
    // Update timestamp
    updateLastUpdateTime();
}

function onDataError(error) {
    console.error('Database error:', error);
    setConnectionStatus('disconnected');
    showError('Database connection error.\nPlease try again later.');
}

function setConnectionStatus(status) {
    if (!connectionStatusEl || !statusTextEl) return;
    
    connectionStatusEl.className = 'connection-status ' + status;
    
    switch (status) {
        case 'connected':
            statusTextEl.textContent = 'Live';
            isConnected = true;
            break;
        case 'disconnected':
            statusTextEl.textContent = 'Disconnected';
            isConnected = false;
            break;
        case 'reconnecting':
            statusTextEl.textContent = 'Reconnecting...';
            isConnected = false;
            break;
    }
}

function showError(message) {
    setConnectionStatus('disconnected');
    loadingEl.classList.add('hidden');
    leaderboardEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    errorMessageEl.textContent = message;
}

function showLeaderboard() {
    loadingEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    leaderboardEl.classList.remove('hidden');
}

function updateLeaderboard() {
    // Select data based on current version
    let dataToDisplay;
    switch (currentVersion) {
        case 'v1':
            dataToDisplay = leaderboardV1Data || {};
            break;
        case 'v2':
            dataToDisplay = leaderboardV2Data || {};
            break;
        default:
            dataToDisplay = leaderboardData;
    }

    // Convert data to array
    const entries = [];

    for (const key in dataToDisplay) {
        const item = dataToDisplay[key];

        // Check if it's an object with score
        if (item && typeof item === 'object' && 'score' in item) {
            entries.push({
                name: key,
                score: parseInt(item.score) || 0,
                time: parseFloat(item.time).toFixed(2) || null // Add time in seconds
            });
        }
    }

    // Sort by score descending
    entries.sort((a, b) => b.score - a.score);

    // Generate HTML
    leaderboardListEl.innerHTML = '';

    if (entries.length === 0) {
        leaderboardListEl.innerHTML = '<li class="leaderboard-entry"><span class="player-name" style="text-align: center; width: 100%;">No scores registered</span></li>';
        return;
    }

    entries.forEach((entry, index) => {
        const rank = index + 1;
        const displayName = entry.name;
        const isTop10 = rank <= 10;

        const li = document.createElement('li');
        li.className = `leaderboard-entry${isTop10 ? ` top-10 rank-${rank}` : ''}`;
        li.innerHTML = `
            <span class="rank">${getRankDisplay(rank)}</span>
            <span class="player-name">${escapeHtml(displayName)}</span>
            <span class="score">${entry.score.toLocaleString()}${entry.time && currentVersion !== 'v1' ? `<span class='time'> ${entry.time}s</span>` : ''}</span>
        `;

        leaderboardListEl.appendChild(li);
    });
}

function getRankDisplay(rank) {
    switch (rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return `#${rank}`;
    }
}

function truncateName(name, maxLength) {
    if (name.length <= maxLength) {
        return name;
    }
    return name.substring(0, maxLength - 3) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateLastUpdateTime() {
    if (currentVersion === 'current') {
        lastUpdateLabelEl.textContent = 'Last update';
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        lastUpdateTimeEl.textContent = timeString;
    } else {
        // Show date range for archived leaderboards
        lastUpdateLabelEl.textContent = 'Active';
        const dates = LEADERBOARD_DATES[currentVersion];
        if (dates) {
            const startDate = new Date(dates.start);
            const endDate = new Date(dates.end);
            const formatDate = (date) => date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            lastUpdateTimeEl.textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
        } else {
            lastUpdateTimeEl.textContent = '--';
        }
    }
}

function cleanup() {
    console.log('Cleaning up Firebase connections...');
    
    // Clear any pending timeouts
    if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
    }
    if (reconnectingTimeoutId) {
        clearTimeout(reconnectingTimeoutId);
        reconnectingTimeoutId = null;
    }
    
    // Disconnect Firebase listeners
    if (leaderboardRef) {
        leaderboardRef.off();
        leaderboardRef = null;
    }
    if (connectedRef) {
        connectedRef.off();
        connectedRef = null;
    }
    
    // Sign out from Firebase Auth
    if (firebase.auth().currentUser) {
        firebase.auth().signOut();
    }
}

// Countdown Timer
function initCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const now = new Date();
    const diff = COUNTDOWN_TARGET - now;
    
    if (diff <= 0) {
        if (countdownEl) countdownEl.classList.add('hidden');
        if (countdownExpiredEl) countdownExpiredEl.classList.remove('hidden');
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    // Hide days container if days is 0
    const daysContainer = document.getElementById('countdown-days-container');
    if (daysContainer) {
        daysContainer.style.display = days === 0 ? 'none' : 'flex';
    }
    
    if (countdownDaysEl) countdownDaysEl.textContent = String(days).padStart(2, '0');
    if (countdownHoursEl) countdownHoursEl.textContent = String(hours).padStart(2, '0');
    if (countdownMinutesEl) countdownMinutesEl.textContent = String(minutes).padStart(2, '0');
    if (countdownSecondsEl) countdownSecondsEl.textContent = String(seconds).padStart(2, '0');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Cleanup when page is closed or reloaded
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);
