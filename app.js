// DOM Elements
let loadingEl, errorEl, errorMessageEl, leaderboardEl, leaderboardListEl, lastUpdateTimeEl;
let connectionStatusEl, statusTextEl;

// App state
let leaderboardData = {};
let isInitialDataLoaded = false;
let isConnected = false;

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
    connectionStatusEl = document.getElementById('connection-status');
    statusTextEl = document.getElementById('status-text');
    
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
    // Convert data to array
    const entries = [];
    
    for (const key in leaderboardData) {
        const item = leaderboardData[key];
        
        // Check if it's an object with score
        if (item && typeof item === 'object' && 'score' in item) {
            entries.push({
                name: key,
                score: parseInt(item.score) || 0
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
            <span class="score">${entry.score.toLocaleString()}</span>
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
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    lastUpdateTimeEl.textContent = timeString;
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

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Cleanup when page is closed or reloaded
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);
