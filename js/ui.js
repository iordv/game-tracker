/**
 * GameTracker UI Module
 * Handles all UI rendering and DOM manipulation
 */

const UI = {
    // DOM element references
    elements: {},

    // Current state
    currentView: 'home',
    currentGame: null,
    searchTimeout: null,

    /**
     * Initialize UI
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.renderSavedGames();
        this.loadHeroCarousel();
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Views
            homeView: document.getElementById('homeView'),
            searchView: document.getElementById('searchView'),
            detailView: document.getElementById('detailView'),
            timelineView: document.getElementById('timelineView'),

            // Home - Hero Carousel
            heroCarousel: document.getElementById('heroCarousel'),
            heroCarouselTrack: document.getElementById('heroCarouselTrack'),
            heroCarouselDots: document.getElementById('heroCarouselDots'),

            // Home - Favorites & Games Grid
            favoritesSection: document.getElementById('favoritesSection'),
            favoritesGrid: document.getElementById('favoritesGrid'),
            allGamesSection: document.getElementById('allGamesSection'),
            allGamesGrid: document.getElementById('allGamesGrid'),
            emptyState: document.getElementById('emptyState'),
            emptySearchBtn: document.getElementById('emptySearchBtn'),

            // Timeline
            timelineHighlights: document.getElementById('timelineHighlights'),
            highlightsScroll: document.getElementById('highlightsScroll'),
            timelineFeed: document.getElementById('timelineFeed'),
            timelineEmpty: document.getElementById('timelineEmpty'),

            // Search
            searchResults: document.getElementById('searchResults'),
            searchTrending: document.getElementById('searchTrending'),
            trendingGrid: document.getElementById('trendingGrid'),

            // Detail
            detailHero: document.getElementById('detailHero'),
            detailHeroBg: document.getElementById('detailHeroBg'),
            detailTitle: document.getElementById('detailTitle'),
            detailMeta: document.getElementById('detailMeta'),
            backBtn: document.getElementById('backBtn'),
            saveBtn: document.getElementById('saveBtn'),
            tabUpdates: document.getElementById('tabUpdates'),
            tabDlc: document.getElementById('tabDlc'),
            tabAbout: document.getElementById('tabAbout'),
            updatesList: document.getElementById('updatesList'),
            dlcList: document.getElementById('dlcList'),
            aboutSection: document.getElementById('aboutSection'),

            // Navigation - morphing dock
            navDock: document.getElementById('navDock'),
            navDockMain: document.getElementById('navDockMain'),
            navDockButtons: document.getElementById('navDockButtons'),
            navDockSearch: document.getElementById('navDockSearch'),
            dockSearchInput: document.getElementById('dockSearchInput'),
            navButtons: document.querySelectorAll('.nav-dock__btn'),
            navActionBtn: document.getElementById('navActionBtn'),

            // Other
            dynamicBg: document.getElementById('dynamicBg'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            toastContainer: document.getElementById('toastContainer')
        };
    },

    // Carousel state
    carouselInterval: null,
    carouselCurrentSlide: 0,

    // Search mode state
    isSearchMode: false,

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Navigation dock buttons
        this.elements.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = btn.dataset.view;
                if (view === 'library') {
                    this.navigateTo('home');
                } else {
                    this.navigateTo(view);
                }
                Animations.ripple(e, btn);
            });
        });

        // Action button (search/back toggle)
        this.elements.navActionBtn?.addEventListener('click', (e) => {
            if (this.isSearchMode) {
                // Back button - exit search mode
                this.exitSearchMode();
            } else {
                // Search button - enter search mode
                this.enterSearchMode();
            }
            Animations.ripple(e, this.elements.navActionBtn);
        });

        // Dock search input - instant search as you type
        this.elements.dockSearchInput?.addEventListener('input', (e) => {
            this.handleDockSearchInput(e.target.value);
        });

        // Empty state search button
        this.elements.emptySearchBtn?.addEventListener('click', () => {
            this.enterSearchMode();
        });

        // Back button
        this.elements.backBtn?.addEventListener('click', () => {
            this.navigateTo(this.previousView || 'home', 'back');
        });

        // Save button
        this.elements.saveBtn?.addEventListener('click', () => {
            this.toggleSaveGame();
        });

        // Tab buttons
        document.querySelectorAll('.detail-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    },

    /**
     * Navigate to a view
     * @param {string} view - View name
     * @param {string} direction - 'forward' or 'back'
     */
    async navigateTo(view, direction = 'forward') {
        if (view === this.currentView) return;

        const views = {
            home: this.elements.homeView,
            search: this.elements.searchView,
            detail: this.elements.detailView,
            timeline: this.elements.timelineView
        };

        const fromView = views[this.currentView];
        const toView = views[view];

        if (!fromView || !toView) return;

        // Store previous view for back navigation
        this.previousView = this.currentView;
        this.currentView = view;

        // Update nav dock
        this.updateNavDock(view);

        // Animate transition
        await Animations.viewTransition(fromView, toView, direction);

        // View-specific actions
        if (view === 'search') {
            // Enter search mode to trigger morphing animation
            if (!this.isSearchMode) {
                this.enterSearchMode();
            }
            this.loadTrendingGames();
        } else if (view === 'home') {
            this.renderSavedGames();
            this.loadHeroCarousel();
            this.updateDynamicBackground(null);
        } else if (view === 'timeline') {
            this.renderTimeline();
            this.updateDynamicBackground(null);
        }
    },

    /**
     * Update navigation dock active state
     * @param {string} view - Current view
     */
    updateNavDock(view) {
        const viewToNav = {
            home: 'home',
            timeline: 'timeline',
            detail: 'home'
        };

        const activeNav = viewToNav[view] || view;

        // Update main dock buttons
        this.elements.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === activeNav);
        });

        // Hide dock on detail view
        this.elements.navDock.classList.toggle('hidden', view === 'detail');
    },

    /**
     * Enter search mode - morph dock to search input
     */
    enterSearchMode() {
        this.isSearchMode = true;

        // Hide nav buttons, show search input
        this.elements.navDockButtons.classList.add('hidden');
        this.elements.navDockSearch.classList.add('active');
        this.elements.navDockMain.classList.add('search-mode');
        this.elements.navActionBtn.classList.add('search-mode');

        // Focus the input
        setTimeout(() => {
            this.elements.dockSearchInput?.focus();
        }, 100);

        // Navigate to search view (only if not already there)
        if (this.currentView !== 'search') {
            this.navigateTo('search');
        }

        // Load trending games
        this.loadTrendingGames();
    },

    /**
     * Exit search mode - return dock to navigation buttons
     */
    exitSearchMode() {
        this.isSearchMode = false;

        // Show nav buttons, hide search input
        this.elements.navDockButtons.classList.remove('hidden');
        this.elements.navDockSearch.classList.remove('active');
        this.elements.navDockMain.classList.remove('search-mode');
        this.elements.navActionBtn.classList.remove('search-mode');

        // Clear search input
        if (this.elements.dockSearchInput) {
            this.elements.dockSearchInput.value = '';
        }

        // Navigate back to home
        this.navigateTo('home');
    },

    /**
     * Handle dock search input - instant search as you type
     * @param {string} query - Search query
     */
    handleDockSearchInput(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Empty query - show trending
        if (!query.trim()) {
            this.elements.searchResults.classList.remove('active');
            this.elements.searchResults.innerHTML = '';
            this.elements.searchTrending.style.display = 'block';
            return;
        }

        // Hide trending, debounce search
        this.elements.searchTrending.style.display = 'none';

        this.searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                this.performSearch(query);
            }
        }, 300);
    },

    /**
     * Perform search
     * @param {string} query - Search query
     */
    async performSearch(query) {
        // Show loading skeleton
        this.elements.searchResults.classList.add('active');
        this.elements.searchResults.innerHTML = this.renderSkeletons('result', 5);

        try {
            const results = await API.searchGames(query);
            this.renderSearchResults(results.games);
        } catch (error) {
            console.error('Search error:', error);
            this.elements.searchResults.innerHTML = `
        <div class="search-error">
          <p>Failed to search. Please try again.</p>
        </div>
      `;
        }
    },

    /**
     * Render search results
     * @param {Array} games - Search results
     */
    renderSearchResults(games) {
        if (!games.length) {
            this.elements.searchResults.innerHTML = `
        <div class="search-empty">
          <p>No games found. Try a different search.</p>
        </div>
      `;
            return;
        }

        this.elements.searchResults.innerHTML = games.map(game => `
      <div class="search-result" data-game-id="${game.id}">
        <img class="search-result__image" 
             src="${game.image || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'}" 
             alt="${game.name}"
             loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a24%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22 font-size=%2240%22>🎮</text></svg>'">
        <div class="search-result__info">
          <h3 class="search-result__title">${this.escapeHtml(game.name)}</h3>
          <p class="search-result__meta">${game.genres?.slice(0, 2).join(', ') || 'Game'} • ${game.released?.split('-')[0] || 'TBA'}</p>
        </div>
        <svg class="search-result__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    `).join('');

        // Bind click events
        this.elements.searchResults.querySelectorAll('.search-result').forEach(result => {
            result.addEventListener('click', () => {
                const gameId = parseInt(result.dataset.gameId);
                this.openGameDetail(gameId);
            });
        });

        // Animate results
        Animations.staggerFadeIn(this.elements.searchResults.querySelectorAll('.search-result'));
    },

    /**
     * Load trending games
     */
    async loadTrendingGames() {
        if (this.trendingLoaded) return;

        this.elements.trendingGrid.innerHTML = this.renderSkeletons('card', 8);

        try {
            const games = await API.getTrendingGames();
            this.renderTrendingGames(games);
            this.trendingLoaded = true;
        } catch (error) {
            console.error('Trending error:', error);
            this.elements.trendingGrid.innerHTML = '<p>Failed to load trending games.</p>';
        }
    },

    /**
     * Render trending games
     * @param {Array} games - Trending games
     */
    renderTrendingGames(games) {
        this.elements.trendingGrid.innerHTML = games.map(game => `
      <div class="game-card" data-game-id="${game.id}">
        <img class="game-card__image" 
             src="${game.image || ''}" 
             alt="${game.name}"
             loading="lazy">
        <div class="game-card__overlay"></div>
        <div class="game-card__content">
          <h3 class="game-card__title">${this.escapeHtml(game.name)}</h3>
        </div>
      </div>
    `).join('');

        // Bind click events
        this.elements.trendingGrid.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameId = parseInt(card.dataset.gameId);
                this.openGameDetail(gameId);
            });
        });

        // Animate cards
        Animations.staggerFadeIn(this.elements.trendingGrid.querySelectorAll('.game-card'));
    },

    /**
     * Render saved games on home view with favorites and all games sections
     */
    renderSavedGames() {
        const savedGames = Storage.getSavedGames();
        const pinnedGames = Storage.getPinnedGames();
        const unpinnedGames = Storage.getUnpinnedGames();

        if (!savedGames.length) {
            this.elements.heroCarousel.classList.add('hidden');
            this.elements.favoritesSection.classList.add('hidden');
            this.elements.allGamesSection.classList.add('hidden');
            this.elements.emptyState.classList.remove('hidden');
            return;
        }

        this.elements.emptyState.classList.add('hidden');
        this.elements.allGamesSection.classList.remove('hidden');

        // Render favorites section
        if (pinnedGames.length > 0) {
            this.elements.favoritesSection.classList.remove('hidden');
            this.elements.favoritesGrid.innerHTML = this.renderGameCards(pinnedGames, true);
            this.bindGameCardEvents(this.elements.favoritesGrid);
        } else {
            this.elements.favoritesSection.classList.add('hidden');
        }

        // Render all games section
        this.elements.allGamesGrid.innerHTML = this.renderGameCards(unpinnedGames, false);
        this.bindGameCardEvents(this.elements.allGamesGrid);

        // Animate cards
        Animations.staggerFadeIn(this.elements.allGamesGrid.querySelectorAll('.game-card'));
        if (pinnedGames.length > 0) {
            Animations.staggerFadeIn(this.elements.favoritesGrid.querySelectorAll('.game-card'));
        }
    },

    /**
     * Render game cards HTML
     * @param {Array} games - Games to render
     * @param {boolean} isPinned - Whether these are pinned games
     */
    renderGameCards(games, isPinned) {
        return games.map(game => `
            <div class="game-card" data-game-id="${game.id}">
                ${game.hasNewUpdate ? '<span class="game-card__badge">Update</span>' : ''}
                <div class="game-card__favorite ${isPinned ? 'visible' : ''}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                </div>
                <img class="game-card__image" 
                     src="${game.image || ''}" 
                     alt="${game.name}"
                     loading="lazy">
                <div class="game-card__overlay"></div>
                <div class="game-card__content">
                    <h3 class="game-card__title">${this.escapeHtml(game.name)}</h3>
                </div>
            </div>
        `).join('');
    },

    /**
     * Bind touch events to game cards (long-press to favorite)
     * @param {HTMLElement} container - Container with game cards
     */
    bindGameCardEvents(container) {
        container.querySelectorAll('.game-card').forEach(card => {
            let longPressTimer = null;
            let isLongPress = false;
            let touchStartX = 0;
            let touchStartY = 0;

            const startLongPress = (x, y) => {
                touchStartX = x;
                touchStartY = y;
                isLongPress = false;

                longPressTimer = setTimeout(() => {
                    isLongPress = true;
                    card.classList.add('long-pressing');

                    // Haptic feedback
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }

                    // Toggle favorite
                    const gameId = parseInt(card.dataset.gameId);
                    const isPinned = Storage.togglePinGame(gameId);

                    // Show feedback
                    this.showToast(isPinned ? '⭐ Added to favorites!' : 'Removed from favorites');

                    // Check if this is first favorite - show tutorial
                    this.checkFirstFavoriteTutorial();

                    // Re-render after short delay
                    setTimeout(() => {
                        card.classList.remove('long-pressing');
                        this.renderSavedGames();
                    }, 300);
                }, 500); // 500ms for long press
            };

            const cancelLongPress = () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                card.classList.remove('long-pressing');
            };

            const handleMove = (x, y) => {
                // Cancel if moved too far
                const deltaX = Math.abs(x - touchStartX);
                const deltaY = Math.abs(y - touchStartY);
                if (deltaX > 10 || deltaY > 10) {
                    cancelLongPress();
                }
            };

            // Touch events
            card.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                startLongPress(touch.clientX, touch.clientY);
            }, { passive: true });

            card.addEventListener('touchmove', (e) => {
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY);
            }, { passive: true });

            card.addEventListener('touchend', (e) => {
                cancelLongPress();
                // Only open detail if it wasn't a long press
                if (!isLongPress) {
                    const gameId = parseInt(card.dataset.gameId);
                    this.openGameDetail(gameId);
                }
                isLongPress = false;
            });

            card.addEventListener('touchcancel', () => {
                cancelLongPress();
                isLongPress = false;
            });

            // Mouse events (for desktop/testing)
            card.addEventListener('mousedown', (e) => {
                startLongPress(e.clientX, e.clientY);
            });

            card.addEventListener('mousemove', (e) => {
                handleMove(e.clientX, e.clientY);
            });

            card.addEventListener('mouseup', () => {
                cancelLongPress();
                if (!isLongPress) {
                    const gameId = parseInt(card.dataset.gameId);
                    this.openGameDetail(gameId);
                }
                isLongPress = false;
            });

            card.addEventListener('mouseleave', () => {
                cancelLongPress();
            });

            // Prevent context menu on long press
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        });
    },

    /**
     * Check if we should show first favorite tutorial
     */
    checkFirstFavoriteTutorial() {
        const hasSeenTutorial = localStorage.getItem('gametracker_favorite_tutorial_seen');
        if (!hasSeenTutorial) {
            localStorage.setItem('gametracker_favorite_tutorial_seen', 'true');
            // Tutorial was needed on first add - it's now been triggered
        }
    },

    /**
     * Show first game tutorial
     */
    showFirstGameTutorial() {
        const hasSeenTutorial = localStorage.getItem('gametracker_favorite_tutorial_seen');
        if (hasSeenTutorial) return;

        // Create tutorial overlay
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.innerHTML = `
            <div class="tutorial-modal glass-material">
                <div class="tutorial-icon">👆</div>
                <h3 class="tutorial-title">Long-press to Favorite</h3>
                <p class="tutorial-text">Hold down on any game card to add it to your favorites. Favorites appear at the top of your library!</p>
                <button class="btn btn--primary tutorial-dismiss">Got it!</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });

        // Dismiss button
        overlay.querySelector('.tutorial-dismiss').addEventListener('click', () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 300);
            localStorage.setItem('gametracker_favorite_tutorial_seen', 'true');
        });

        // Dismiss on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('visible');
                setTimeout(() => overlay.remove(), 300);
                localStorage.setItem('gametracker_favorite_tutorial_seen', 'true');
            }
        });
    },

    /**
     * Load hero carousel with recent updates
     */
    async loadHeroCarousel() {
        const savedGames = Storage.getSavedGames();

        if (!savedGames.length) {
            this.elements.heroCarousel.classList.add('hidden');
            return;
        }

        this.elements.heroCarousel.classList.remove('hidden');

        // Show loading state
        this.elements.heroCarouselTrack.innerHTML = '<div class="hero-slide hero-slide--loading"><div class="loading-spinner"></div></div>';

        try {
            const updates = await API.getRecentUpdatesForGames(savedGames, 5);

            if (!updates.length) {
                this.elements.heroCarousel.classList.add('hidden');
                return;
            }

            // Cache updates for modal
            this.carouselUpdates = updates;

            // Render slides
            this.elements.heroCarouselTrack.innerHTML = updates.map((update, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}" data-game-id="${update.game.id}" data-update-index="${index}">
                    <div class="hero-slide__bg" style="background-image: url(${update.game.image})"></div>
                    <div class="hero-slide__overlay"></div>
                    <div class="hero-slide__content">
                        <span class="hero-slide__badge hero-slide__badge--${update.type}">
                            ${update.type === 'patch' ? '🔧 Patch' : update.type === 'dlc' ? '📦 DLC' : update.type === 'news' ? '📰 News' : '🚀 Release'}
                        </span>
                        <h2 class="hero-slide__title">${this.escapeHtml(update.title)}</h2>
                        <p class="hero-slide__game">${this.escapeHtml(update.game.name)}</p>
                        <p class="hero-slide__date">${this.formatDate(update.date)}</p>
                    </div>
                </div>
            `).join('');

            // Render dots
            this.elements.heroCarouselDots.innerHTML = updates.map((_, index) => `
                <button class="hero-carousel__dot ${index === 0 ? 'active' : ''}" data-slide="${index}"></button>
            `).join('');

            // Bind slide clicks - open update modal
            this.elements.heroCarouselTrack.querySelectorAll('.hero-slide').forEach(slide => {
                slide.addEventListener('click', () => {
                    const updateIndex = parseInt(slide.dataset.updateIndex);
                    const update = this.carouselUpdates[updateIndex];
                    if (update) {
                        // Show modal with just this update
                        this.showUpdateModal(update.game, [update]);
                    }
                });
            });

            // Bind dot clicks
            this.elements.heroCarouselDots.querySelectorAll('.hero-carousel__dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    const slideIndex = parseInt(dot.dataset.slide);
                    this.goToCarouselSlide(slideIndex);
                });
            });

            // Start auto-scroll
            this.startCarouselAutoScroll(updates.length);

        } catch (error) {
            console.error('Carousel error:', error);
            this.elements.heroCarousel.classList.add('hidden');
        }
    },

    /**
     * Go to specific carousel slide
     * @param {number} index - Slide index
     */
    goToCarouselSlide(index) {
        const slides = this.elements.heroCarouselTrack.querySelectorAll('.hero-slide');
        const dots = this.elements.heroCarouselDots.querySelectorAll('.hero-carousel__dot');

        if (!slides.length) return;

        // Update active states
        slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
        dots.forEach((dot, i) => dot.classList.toggle('active', i === index));

        // Scroll to slide
        const slideWidth = slides[0].offsetWidth;
        this.elements.heroCarouselTrack.scrollTo({
            left: slideWidth * index,
            behavior: 'smooth'
        });

        this.carouselCurrentSlide = index;
    },

    /**
     * Start carousel auto-scroll
     * @param {number} totalSlides - Total number of slides
     */
    startCarouselAutoScroll(totalSlides) {
        // Clear existing interval
        if (this.carouselInterval) {
            clearInterval(this.carouselInterval);
        }

        // Auto-scroll every 5 seconds
        this.carouselInterval = setInterval(() => {
            const nextSlide = (this.carouselCurrentSlide + 1) % totalSlides;
            this.goToCarouselSlide(nextSlide);
        }, 5000);
    },

    /**
     * Render timeline view with game highlights and social feed cards
     */
    async renderTimeline() {
        const savedGames = Storage.getSavedGames();

        if (!savedGames.length) {
            this.elements.timelineHighlights.classList.add('hidden');
            this.elements.timelineFeed.classList.add('hidden');
            this.elements.timelineEmpty.classList.remove('hidden');
            return;
        }

        this.elements.timelineEmpty.classList.add('hidden');
        this.elements.timelineHighlights.classList.remove('hidden');
        this.elements.timelineFeed.classList.remove('hidden');

        // Render game highlights
        this.renderGameHighlights(savedGames);

        // Show loading for feed
        this.elements.timelineFeed.innerHTML = this.renderSkeletons('update', 5);

        try {
            const updates = await API.getRecentUpdatesForGames(savedGames, 20);

            if (!updates.length) {
                this.elements.timelineFeed.classList.add('hidden');
                this.elements.timelineEmpty.classList.remove('hidden');
                return;
            }

            // Group updates by date section
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today.getTime() - 86400000);
            const thisWeek = new Date(today.getTime() - 7 * 86400000);

            let currentDateSection = null;
            let html = '';

            updates.forEach(update => {
                const updateDate = new Date(update.date);
                let dateSection;

                if (updateDate >= today) {
                    dateSection = 'Today';
                } else if (updateDate >= yesterday) {
                    dateSection = 'Yesterday';
                } else if (updateDate >= thisWeek) {
                    dateSection = 'This Week';
                } else {
                    dateSection = 'Earlier';
                }

                // Add date separator if new section
                if (dateSection !== currentDateSection) {
                    html += `<div class="timeline-separator">${dateSection}</div>`;
                    currentDateSection = dateSection;
                }

                // Get badge text and icon based on type
                const badgeConfig = {
                    patch: { text: 'Patch', icon: '🔧' },
                    dlc: { text: 'DLC', icon: '📦' },
                    release: { text: 'Release', icon: '🚀' },
                    news: { text: 'News', icon: '📰' }
                };
                const badge = badgeConfig[update.type] || badgeConfig.news;

                // Generate random engagement numbers for demo
                const likes = Math.floor(Math.random() * 5000) + 500;
                const comments = Math.floor(Math.random() * 200) + 20;

                // Add timeline entry - modern social feed card style
                html += `
                    <article class="timeline-entry" data-game-id="${update.game.id}">
                        <div class="timeline-entry__type-strip timeline-entry__type-strip--${update.type}"></div>
                        <div class="timeline-entry__banner">
                            <img class="timeline-entry__banner-image" src="${update.game.image}" alt="${this.escapeHtml(update.game.name)}" loading="lazy">
                            <div class="timeline-entry__banner-overlay"></div>
                            <div class="timeline-entry__header-overlay">
                                <img class="timeline-entry__game-image" src="${update.game.image}" alt="${this.escapeHtml(update.game.name)}" loading="lazy">
                                <div class="timeline-entry__meta">
                                    <p class="timeline-entry__game-name">${this.escapeHtml(update.game.name)}</p>
                                    <p class="timeline-entry__date">${this.formatRelativeTime(update.date)}</p>
                                </div>
                                <span class="timeline-entry__badge timeline-entry__badge--${update.type}">${badge.text}</span>
                            </div>
                        </div>
                        <div class="timeline-entry__content">
                            <h3 class="timeline-entry__title">${this.escapeHtml(update.title)}</h3>
                            ${update.content ? `<p class="timeline-entry__description">${this.escapeHtml(update.content)}</p>` : ''}
                            <div class="timeline-entry__footer">
                                <span class="timeline-entry__stat">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                    </svg>
                                    ${this.formatNumber(likes)}
                                </span>
                                <span class="timeline-entry__stat">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                    </svg>
                                    ${comments}
                                </span>
                                <span class="timeline-entry__action">
                                    View Details
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="m9 18 6-6-6-6"/>
                                    </svg>
                                </span>
                            </div>
                        </div>
                    </article>
                `;
            });

            this.elements.timelineFeed.innerHTML = html;

            // Bind click events
            this.elements.timelineFeed.querySelectorAll('.timeline-entry').forEach(entry => {
                entry.addEventListener('click', () => {
                    const gameId = parseInt(entry.dataset.gameId);
                    this.openGameDetail(gameId);
                });
            });

            // Animate entries
            Animations.staggerFadeIn(this.elements.timelineFeed.querySelectorAll('.timeline-entry'), 80);

        } catch (error) {
            console.error('Timeline error:', error);
            this.elements.timelineFeed.innerHTML = '<p class="error-text">Failed to load updates</p>';
        }
    },

    /**
     * Render game highlights (circular game covers)
     * @param {Array} games - Saved games
     */
    async renderGameHighlights(games) {
        // Fetch updates to determine which games have unread content
        let gamesWithUnread = new Set();

        try {
            // Check cached updates or fetch new ones
            const allUpdates = await API.getRecentUpdatesForGames(games, 30);

            // Cache updates by game
            games.forEach(game => {
                const gameUpdates = allUpdates.filter(u => u.game.id === game.id);
                this.gameUpdatesCache[game.id] = gameUpdates;

                // Check if game has unread updates
                if (Storage.hasUnreadUpdates(game.id, gameUpdates)) {
                    gamesWithUnread.add(game.id);
                }
            });
        } catch (error) {
            console.error('Error checking updates:', error);
            // Fall back to checking hasNewUpdate flag
            games.forEach(game => {
                if (game.hasNewUpdate) {
                    gamesWithUnread.add(game.id);
                }
            });
        }

        const html = games.map(game => {
            const hasUnread = gamesWithUnread.has(game.id);
            return `
                <div class="game-highlight" data-game-id="${game.id}">
                    <div class="game-highlight__ring ${hasUnread ? 'game-highlight__ring--active' : ''}">
                        <img class="game-highlight__image" src="${game.image}" alt="${this.escapeHtml(game.name)}" loading="lazy">
                        ${hasUnread ? '<div class="game-highlight__dot"></div>' : ''}
                    </div>
                    <span class="game-highlight__name">${this.escapeHtml(game.name)}</span>
                </div>
            `;
        }).join('');

        this.elements.highlightsScroll.innerHTML = html;

        // Bind click events - open update modal
        this.elements.highlightsScroll.querySelectorAll('.game-highlight').forEach(highlight => {
            highlight.addEventListener('click', () => {
                const gameId = parseInt(highlight.dataset.gameId);
                const game = games.find(g => g.id === gameId);
                if (game) {
                    this.openGameUpdateModal(game);
                }
            });
        });

        // Animate highlights
        Animations.staggerFadeIn(this.elements.highlightsScroll.querySelectorAll('.game-highlight'), 50);
    },

    /**
     * Format relative time (e.g., "2h ago", "3d ago")
     * @param {string} dateString - Date string
     * @returns {string} - Relative time string
     */
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return this.formatDate(dateString);
        }
    },

    /**
     * Format number with K/M suffix
     * @param {number} num - Number to format
     * @returns {string} - Formatted number
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },

    /**
     * Open game detail view
     * @param {number} gameId - Game ID
     */
    async openGameDetail(gameId) {
        this.showLoading(true);

        try {
            // Fetch game details
            const game = await API.getGameDetails(gameId);
            this.currentGame = game;

            // Render hero
            this.elements.detailHeroBg.style.backgroundImage = `url(${game.image})`;
            this.elements.detailTitle.textContent = game.name;
            this.elements.detailMeta.textContent = `${game.developers?.[0] || 'Unknown Developer'} • ${game.released?.split('-')[0] || 'TBA'}`;

            // Update save button state
            const isSaved = Storage.isGameSaved(gameId);
            this.elements.saveBtn.classList.toggle('saved', isSaved);

            // Update dynamic background
            this.updateDynamicBackground(game.image);

            // Navigate to detail view
            this.navigateTo('detail');

            // Load tab content
            this.loadUpdates(game);
            this.loadDLC(gameId, game.name);
            this.loadAbout(game, gameId);

            // Mark as checked
            if (isSaved) {
                Storage.markGameChecked(gameId);
            }

        } catch (error) {
            console.error('Game detail error:', error);
            this.showToast('Failed to load game details', 'error');
        } finally {
            this.showLoading(false);
        }
    },

    /**
     * Load game updates/news
     * @param {Object} game - Game object
     */
    async loadUpdates(game) {
        this.elements.updatesList.innerHTML = this.renderSkeletons('update', 3);

        try {
            const news = await API.getGameNews(game.name);

            if (!news.length) {
                this.elements.updatesList.innerHTML = `
          <div class="updates-empty">
            <p>No recent updates found for this game.</p>
          </div>
        `;
                return;
            }

            this.elements.updatesList.innerHTML = news.map(item => `
        <article class="update-card">
          <div class="update-card__header">
            <h3 class="update-card__title">${this.escapeHtml(item.title)}</h3>
            <time class="update-card__date">${this.formatDate(item.date)}</time>
          </div>
          <div class="update-card__content" id="content-${item.id}">
            ${this.escapeHtml(item.content)}
          </div>
          ${item.content.length > 200 ? `
            <button class="update-card__toggle" data-content-id="content-${item.id}">
              Read more
            </button>
          ` : ''}
        </article>
      `).join('');

            // Bind toggle events
            this.elements.updatesList.querySelectorAll('.update-card__toggle').forEach(btn => {
                btn.addEventListener('click', () => {
                    const contentId = btn.dataset.contentId;
                    const content = document.getElementById(contentId);
                    const isExpanded = content.classList.toggle('expanded');
                    btn.textContent = isExpanded ? 'Show less' : 'Read more';
                });
            });

        } catch (error) {
            console.error('Updates error:', error);
            this.elements.updatesList.innerHTML = '<p>Failed to load updates.</p>';
        }
    },

    /**
     * Load game DLC
     * @param {number} gameId - Game ID
     * @param {string} gameName - Game name for Steam fallback
     */
    async loadDLC(gameId, gameName) {
        this.elements.dlcList.innerHTML = this.renderSkeletons('update', 2);

        try {
            const dlc = await API.getGameDLC(gameId, gameName);

            if (!dlc.length) {
                this.elements.dlcList.innerHTML = `
          <div class="dlc-empty">
            <p>No purchasable DLC or expansions found for this game.</p>
          </div>
        `;
                return;
            }

            this.elements.dlcList.innerHTML = dlc.map(item => {
                // Determine price display and styling
                let priceHtml = '';
                if (item.price) {
                    const isFree = item.price === 'Free' || item.isFree;
                    const priceClass = isFree ? 'dlc-card__price dlc-card__price--free' : 'dlc-card__price';
                    priceHtml = `<span class="${priceClass}">${item.price}</span>`;
                } else if (item.rating) {
                    priceHtml = `<span class="dlc-card__rating">★ ${item.rating.toFixed(1)}</span>`;
                }

                return `
        <div class="dlc-card">
          <img class="dlc-card__image" 
               src="${item.image || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'}" 
               alt="${item.name}"
               loading="lazy"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a24%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22 font-size=%2230%22>📦</text></svg>'">
          <div class="dlc-card__info">
            <h3 class="dlc-card__title">${this.escapeHtml(item.name)}</h3>
            <p class="dlc-card__description">${item.released ? `Released: ${item.released}` : 'Additional Content'}</p>
            ${priceHtml}
          </div>
        </div>
      `;
            }).join('');

        } catch (error) {
            console.error('DLC error:', error);
            this.elements.dlcList.innerHTML = '<p>Failed to load DLC.</p>';
        }
    },

    /**
     * Load about section
     * @param {Object} game - Game object
     * @param {number} gameId - Game ID
     */
    async loadAbout(game, gameId) {
        // Render basic info immediately
        this.elements.aboutSection.innerHTML = `
      <p class="about-description">${this.escapeHtml(game.description?.substring(0, 600) || 'No description available.')}${game.description?.length > 600 ? '...' : ''}</p>
      
      <div class="about-details">
        <div class="about-detail">
          <span class="about-detail__label">Released</span>
          <span class="about-detail__value">${this.formatReleaseDate(game.released)}</span>
        </div>
        <div class="about-detail">
          <span class="about-detail__label">Rating</span>
          <span class="about-detail__value">${game.metacritic ? `${game.metacritic}/100` : (game.rating ? `★ ${game.rating.toFixed(1)}` : 'N/A')}</span>
        </div>
        <div class="about-detail">
          <span class="about-detail__label">Developer</span>
          <span class="about-detail__value">${game.developers?.[0] || 'Unknown'}</span>
        </div>
        <div class="about-detail">
          <span class="about-detail__label">Publisher</span>
          <span class="about-detail__value">${game.publishers?.[0] || 'Unknown'}</span>
        </div>
      </div>
      
      <div class="platforms-list">
        ${game.platforms?.map(p => `<span class="platform-tag">${p}</span>`).join('') || ''}
      </div>
      
      <div class="about-screenshots">
        <h3 class="section-title">Screenshots</h3>
        <div class="about-screenshots__grid" id="screenshotsGrid">
          <div class="skeleton" style="width:280px;aspect-ratio:16/9;flex-shrink:0;"></div>
          <div class="skeleton" style="width:280px;aspect-ratio:16/9;flex-shrink:0;"></div>
        </div>
      </div>
    `;

        // Load screenshots
        try {
            const screenshots = await API.getGameScreenshots(gameId);
            const screenshotsGrid = document.getElementById('screenshotsGrid');

            if (screenshots.length) {
                screenshotsGrid.innerHTML = screenshots.slice(0, 10).map(src => `
          <img class="about-screenshot" src="${src}" alt="Screenshot" loading="lazy">
        `).join('');
            } else {
                screenshotsGrid.innerHTML = '<p>No screenshots available.</p>';
            }
        } catch (error) {
            console.error('Screenshots error:', error);
        }
    },

    /**
     * Switch detail tab
     * @param {string} tab - Tab name
     */
    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.detail-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Update tab content
        const tabs = { updates: this.elements.tabUpdates, dlc: this.elements.tabDlc, about: this.elements.tabAbout };
        Object.entries(tabs).forEach(([name, el]) => {
            el.classList.toggle('active', name === tab);
        });
    },

    /**
     * Toggle save game
     */
    async toggleSaveGame() {
        if (!this.currentGame) return;

        const isSaved = Storage.isGameSaved(this.currentGame.id);
        const savedGamesCount = Storage.getSavedGames().length;

        if (isSaved) {
            Storage.removeGame(this.currentGame.id);
            this.elements.saveBtn.classList.remove('saved');
            this.showToast('Removed from library', 'success');
        } else {
            Storage.saveGame({
                id: this.currentGame.id,
                name: this.currentGame.name,
                slug: this.currentGame.slug,
                image: this.currentGame.image
            });
            this.elements.saveBtn.classList.add('saved');
            this.showToast('Added to library', 'success');

            // Show tutorial if this is the first game
            if (savedGamesCount === 0) {
                setTimeout(() => {
                    this.showFirstGameTutorial();
                }, 500);
            }
        }

        // Bounce animation
        Animations.bounce(this.elements.saveBtn);
    },

    /**
     * Update dynamic background based on game image
     * @param {string|null} imageUrl - Image URL or null to reset
     */
    updateDynamicBackground(imageUrl) {
        if (!imageUrl) {
            this.elements.dynamicBg.classList.remove('game-active');
            this.elements.dynamicBg.style.removeProperty('--dynamic-color');
            return;
        }

        // Extract dominant color (simplified - uses fixed accent for now)
        this.elements.dynamicBg.classList.add('game-active');
        this.elements.dynamicBg.style.setProperty('--dynamic-color', 'rgba(124, 92, 255, 0.25)');
    },

    /**
     * Show/hide loading overlay
     * @param {boolean} show - Show or hide
     */
    showLoading(show) {
        this.elements.loadingOverlay.classList.toggle('active', show);
    },

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - 'success' or 'error'
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
      <svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success'
                ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
            }
      </svg>
      <span class="toast__message">${message}</span>
    `;

        this.elements.toastContainer.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Render skeleton loading placeholders
     * @param {string} type - Skeleton type
     * @param {number} count - Number of skeletons
     */
    renderSkeletons(type, count) {
        const skeletonClass = `skeleton skeleton--${type}`;
        return Array(count).fill(`<div class="${skeletonClass}"></div>`).join('');
    },

    /**
     * Format date for display
     * @param {Date} date - Date object
     */
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    /**
     * Format release date
     * @param {string} dateStr - Date string (YYYY-MM-DD)
     */
    formatReleaseDate(dateStr) {
        if (!dateStr) return 'TBA';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ============================================
    // Update Modal Functions
    // ============================================

    /** Currently open modal overlay */
    currentModalOverlay: null,

    /** Cached updates for games */
    gameUpdatesCache: {},

    /**
     * Show update modal for a game
     * @param {Object} game - Game object
     * @param {Array} updates - Updates to display
     */
    showUpdateModal(game, updates) {
        // Remove any existing modal
        this.closeUpdateModal();

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'update-modal-overlay';

        // Get badge text helper
        const getBadgeText = (type) => {
            const badges = { patch: 'Patch', dlc: 'DLC', release: 'Release', news: 'News' };
            return badges[type] || 'News';
        };

        // Build updates HTML
        let updatesHtml = '';
        if (updates && updates.length > 0) {
            updatesHtml = updates.map(update => `
                <div class="update-modal__item">
                    <div class="update-modal__item-header">
                        <span class="update-modal__item-badge update-modal__item-badge--${update.type}">
                            ${getBadgeText(update.type)}
                        </span>
                        <span class="update-modal__item-date">${this.formatRelativeTime(update.date)}</span>
                    </div>
                    <h4 class="update-modal__item-title">${this.escapeHtml(update.title)}</h4>
                    ${update.content ? `<p class="update-modal__item-content">${this.escapeHtml(update.content)}</p>` : ''}
                </div>
            `).join('');
        } else {
            updatesHtml = `
                <div class="update-modal__empty">
                    <div class="update-modal__empty-icon">✓</div>
                    <p class="update-modal__empty-text">No new updates for this game</p>
                </div>
            `;
        }

        overlay.innerHTML = `
            <div class="update-modal">
                <div class="update-modal__handle"></div>
                <div class="update-modal__header">
                    <img class="update-modal__game-image" src="${game.image}" alt="${this.escapeHtml(game.name)}" loading="lazy">
                    <div class="update-modal__game-info">
                        <h3 class="update-modal__game-name">${this.escapeHtml(game.name)}</h3>
                        <p class="update-modal__game-meta">${updates?.length || 0} update${updates?.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div class="update-modal__content">
                    ${updatesHtml}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.currentModalOverlay = overlay;

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });

        // Close on overlay click (not modal itself)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeUpdateModal(game.id);
            }
        });

        // Prevent modal content clicks from closing
        overlay.querySelector('.update-modal').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    },

    /**
     * Close update modal
     * @param {number} gameId - Game ID to mark as read (optional)
     */
    closeUpdateModal(gameId = null) {
        if (this.currentModalOverlay) {
            this.currentModalOverlay.classList.remove('visible');

            // Mark as read if gameId provided
            if (gameId) {
                Storage.markUpdatesAsRead(gameId);
            }

            setTimeout(() => {
                if (this.currentModalOverlay) {
                    this.currentModalOverlay.remove();
                    this.currentModalOverlay = null;
                }

                // Re-render highlights to update indicators
                if (gameId && this.currentView === 'timeline') {
                    this.renderGameHighlights(Storage.getSavedGames());
                }
            }, 400);
        }
    },

    /**
     * Open update modal for a game from highlight or carousel
     * @param {Object} game - Game object
     */
    async openGameUpdateModal(game) {
        // Show loading state
        this.showLoading(true);

        try {
            // Check cache first
            let updates = this.gameUpdatesCache[game.id];

            if (!updates) {
                // Fetch updates for this game
                const allUpdates = await API.getRecentUpdatesForGames([game], 10);
                updates = allUpdates.filter(u => u.game.id === game.id);
                this.gameUpdatesCache[game.id] = updates;
            }

            this.showLoading(false);
            this.showUpdateModal(game, updates);

        } catch (error) {
            console.error('Error loading updates:', error);
            this.showLoading(false);
            this.showToast('Failed to load updates', 'error');
        }
    }
};

// Export for use in other modules
window.UI = UI;
