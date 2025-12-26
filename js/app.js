/**
 * GameTracker Main Application
 * Entry point and initialization
 */

const App = {
    /**
     * Initialize the application
     */
    async init() {
        console.log('🎮 GameTracker initializing...');

        // Register service worker
        this.registerServiceWorker();

        // Initialize UI
        UI.init();

        // Handle URL parameters
        this.handleUrlParams();

        // Setup global event listeners
        this.setupGlobalEvents();

        console.log('✅ GameTracker ready!');
    },

    /**
     * Register service worker for PWA
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration.scope);

                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content available
                            UI.showToast('Update available! Refresh to update.', 'success');
                        }
                    });
                });
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    },

    /**
     * Handle URL parameters (for PWA shortcuts etc)
     */
    handleUrlParams() {
        const params = new URLSearchParams(window.location.search);

        // Handle view parameter
        const view = params.get('view');
        if (view === 'search') {
            setTimeout(() => UI.navigateTo('search'), 100);
        }

        // Handle game ID parameter
        const gameId = params.get('game');
        if (gameId) {
            setTimeout(() => UI.openGameDetail(parseInt(gameId)), 100);
        }
    },

    /**
     * Setup global event listeners
     */
    setupGlobalEvents() {
        // Handle back button/gesture
        window.addEventListener('popstate', (event) => {
            if (UI.currentView === 'detail') {
                UI.navigateTo(UI.previousView || 'home', 'back');
            } else if (UI.currentView === 'search') {
                UI.navigateTo('home', 'back');
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Escape to go back
            if (event.key === 'Escape') {
                if (UI.currentView === 'detail') {
                    UI.navigateTo(UI.previousView || 'home', 'back');
                } else if (UI.currentView === 'search') {
                    if (document.activeElement === UI.elements.dockSearchInput) {
                        UI.elements.dockSearchInput.blur();
                    } else {
                        UI.navigateTo('home', 'back');
                    }
                }
            }

            // Cmd/Ctrl + K to focus search
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                UI.navigateTo('search');
            }
        });

        // Handle visibility change (app resume)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // App became visible, could check for updates here
                this.checkForGameUpdates();
            }
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            UI.showToast('You\'re back online', 'success');
        });

        window.addEventListener('offline', () => {
            UI.showToast('You\'re offline', 'error');
        });

        // Prevent pull-to-refresh on detail view (for scroll)
        let touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;

            if (scrollTop === 0 && touchY > touchStartY) {
                // At top and pulling down - allow for refresh gesture
            }
        }, { passive: true });
    },

    /**
     * Check saved games for updates (background task)
     */
    async checkForGameUpdates() {
        const savedGames = Storage.getSavedGames();

        for (const game of savedGames.slice(0, 5)) { // Check first 5 games
            if (game.lastChecked && Date.now() - game.lastChecked < 3600000) {
                continue; // Skip if checked within last hour
            }

            try {
                const news = await API.getGameNews(game.name);
                if (news.length > 0) {
                    const latestUpdate = news[0].date;
                    if (game.lastUpdateSeen && latestUpdate > new Date(game.lastUpdateSeen)) {
                        Storage.markGameHasUpdate(game.id);
                    }
                    Storage.updateGame(game.id, {
                        lastUpdateSeen: latestUpdate.toISOString(),
                        lastChecked: Date.now()
                    });
                }
            } catch (error) {
                console.log('Update check failed for', game.name);
            }

            // Small delay between checks
            await new Promise(r => setTimeout(r, 500));
        }
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

// Export for debugging
window.App = App;
