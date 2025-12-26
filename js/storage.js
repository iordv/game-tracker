/**
 * GameTracker Storage Service
 * Handles local storage for saved games and preferences
 */

const Storage = {
    KEYS: {
        SAVED_GAMES: 'gametracker_saved_games',
        PREFERENCES: 'gametracker_preferences',
        LAST_SYNC: 'gametracker_last_sync'
    },

    /**
     * Initialize storage
     */
    init() {
        // Ensure saved games array exists
        if (!this.get(this.KEYS.SAVED_GAMES)) {
            this.set(this.KEYS.SAVED_GAMES, []);
        }

        // Initialize preferences with defaults
        if (!this.get(this.KEYS.PREFERENCES)) {
            this.set(this.KEYS.PREFERENCES, {
                notifications: true,
                updateCheckInterval: 'daily',
                theme: 'dark'
            });
        }
    },

    /**
     * Get item from localStorage
     * @param {string} key - Storage key
     * @returns {any} Parsed value or null
     */
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },

    /**
     * Set item in localStorage
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Storage set error:', error);
            // Handle quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.cleanup();
                localStorage.setItem(key, JSON.stringify(value));
            }
        }
    },

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    },

    /**
     * Get all saved games
     * @returns {Array} Saved games array
     */
    getSavedGames() {
        return this.get(this.KEYS.SAVED_GAMES) || [];
    },

    /**
     * Check if a game is saved
     * @param {number} gameId - Game ID
     * @returns {boolean} Is saved
     */
    isGameSaved(gameId) {
        const saved = this.getSavedGames();
        return saved.some(game => game.id === gameId);
    },

    /**
     * Save a game
     * @param {Object} game - Game object to save
     */
    saveGame(game) {
        const saved = this.getSavedGames();

        // Check if already saved
        if (saved.some(g => g.id === game.id)) {
            return false;
        }

        // Add game with timestamp
        saved.unshift({
            ...game,
            savedAt: Date.now(),
            lastChecked: Date.now()
        });

        this.set(this.KEYS.SAVED_GAMES, saved);
        return true;
    },

    /**
     * Remove a saved game
     * @param {number} gameId - Game ID to remove
     */
    removeGame(gameId) {
        const saved = this.getSavedGames();
        const filtered = saved.filter(game => game.id !== gameId);
        this.set(this.KEYS.SAVED_GAMES, filtered);
        return filtered;
    },

    /**
     * Update a saved game
     * @param {number} gameId - Game ID
     * @param {Object} updates - Updates to apply
     */
    updateGame(gameId, updates) {
        const saved = this.getSavedGames();
        const index = saved.findIndex(g => g.id === gameId);

        if (index > -1) {
            saved[index] = { ...saved[index], ...updates };
            this.set(this.KEYS.SAVED_GAMES, saved);
        }
    },

    /**
     * Mark game as checked for updates
     * @param {number} gameId - Game ID
     */
    markGameChecked(gameId) {
        this.updateGame(gameId, {
            lastChecked: Date.now(),
            hasNewUpdate: false
        });
    },

    /**
     * Mark game as having new update
     * @param {number} gameId - Game ID
     */
    markGameHasUpdate(gameId) {
        this.updateGame(gameId, {
            hasNewUpdate: true
        });
    },

    /**
     * Pin a game to favorites
     * @param {number} gameId - Game ID
     */
    pinGame(gameId) {
        this.updateGame(gameId, {
            isPinned: true,
            pinnedAt: Date.now()
        });
    },

    /**
     * Unpin a game from favorites
     * @param {number} gameId - Game ID
     */
    unpinGame(gameId) {
        this.updateGame(gameId, {
            isPinned: false,
            pinnedAt: null
        });
    },

    /**
     * Toggle pin state of a game
     * @param {number} gameId - Game ID
     * @returns {boolean} New pin state
     */
    togglePinGame(gameId) {
        const saved = this.getSavedGames();
        const game = saved.find(g => g.id === gameId);
        if (game) {
            if (game.isPinned) {
                this.unpinGame(gameId);
                return false;
            } else {
                this.pinGame(gameId);
                return true;
            }
        }
        return false;
    },

    /**
     * Get pinned (favorite) games
     * @returns {Array} Pinned games sorted by pin date
     */
    getPinnedGames() {
        const saved = this.getSavedGames();
        return saved
            .filter(game => game.isPinned)
            .sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));
    },

    /**
     * Get unpinned games
     * @returns {Array} Unpinned games sorted by saved date
     */
    getUnpinnedGames() {
        const saved = this.getSavedGames();
        return saved.filter(game => !game.isPinned);
    },

    /**
     * Check if a game is pinned
     * @param {number} gameId - Game ID
     * @returns {boolean} Is pinned
     */
    isGamePinned(gameId) {
        const saved = this.getSavedGames();
        const game = saved.find(g => g.id === gameId);
        return game?.isPinned || false;
    },

    /**
     * Get preferences
     * @returns {Object} User preferences
     */
    getPreferences() {
        return this.get(this.KEYS.PREFERENCES) || {};
    },

    /**
     * Update preferences
     * @param {Object} updates - Preference updates
     */
    updatePreferences(updates) {
        const prefs = this.getPreferences();
        this.set(this.KEYS.PREFERENCES, { ...prefs, ...updates });
    },

    /**
     * Clear old cached data to free up space
     */
    cleanup() {
        // Keep only essential data
        const savedGames = this.getSavedGames();
        const preferences = this.getPreferences();

        // Clear everything
        localStorage.clear();

        // Restore essential data
        this.set(this.KEYS.SAVED_GAMES, savedGames);
        this.set(this.KEYS.PREFERENCES, preferences);
    },

    /**
     * Export all data for backup
     * @returns {Object} All stored data
     */
    exportData() {
        return {
            savedGames: this.getSavedGames(),
            preferences: this.getPreferences(),
            exportedAt: Date.now()
        };
    },

    /**
     * Import data from backup
     * @param {Object} data - Backup data
     */
    importData(data) {
        if (data.savedGames) {
            this.set(this.KEYS.SAVED_GAMES, data.savedGames);
        }
        if (data.preferences) {
            this.set(this.KEYS.PREFERENCES, data.preferences);
        }
    }
};

// Initialize storage on load
Storage.init();

// Export for use in other modules
window.Storage = Storage;
