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
                <img class="game-card__image" 
                     src="${game.image || ''}" 
                     alt="${game.name}"
                     loading="lazy">
                <div class="game-card__overlay"></div>
                <div class="game-card__content">
                    <h3 class="game-card__title">${this.escapeHtml(game.name)}</h3>
                </div>
                <button class="game-card__pin ${isPinned ? 'pinned' : ''}" 
                        data-game-id="${game.id}" 
                        aria-label="${isPinned ? 'Unpin from favorites' : 'Pin to favorites'}">
                    <svg viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                </button>
            </div>
        `).join('');
    },

    /**
     * Bind click events to game cards
     * @param {HTMLElement} container - Container with game cards
     */
    bindGameCardEvents(container) {
        container.querySelectorAll('.game-card').forEach(card => {
            // Card click - open detail
            card.addEventListener('click', (e) => {
                // Don't navigate if clicking pin button
                if (e.target.closest('.game-card__pin')) return;
                const gameId = parseInt(card.dataset.gameId);
                this.openGameDetail(gameId);
            });

            // Add tilt effect
            card.addEventListener('mousemove', (e) => Animations.tilt3D(card, e));
            card.addEventListener('mouseleave', () => Animations.resetTilt(card));
        });

        // Pin button click handlers
        container.querySelectorAll('.game-card__pin').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gameId = parseInt(btn.dataset.gameId);
                const isPinned = Storage.togglePinGame(gameId);
                this.showToast(isPinned ? 'Added to favorites!' : 'Removed from favorites');
                this.renderSavedGames(); // Re-render to update sections
            });
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

            // Render slides
            this.elements.heroCarouselTrack.innerHTML = updates.map((update, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}" data-game-id="${update.game.id}">
                    <div class="hero-slide__bg" style="background-image: url(${update.game.image})"></div>
                    <div class="hero-slide__overlay"></div>
                    <div class="hero-slide__content">
                        <span class="hero-slide__badge hero-slide__badge--${update.type}">
                            ${update.type === 'patch' ? '🔧 Patch' : update.type === 'dlc' ? '📦 DLC' : '🚀 Release'}
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

            // Bind slide clicks
            this.elements.heroCarouselTrack.querySelectorAll('.hero-slide').forEach(slide => {
                slide.addEventListener('click', () => {
                    const gameId = parseInt(slide.dataset.gameId);
                    this.openGameDetail(gameId);
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
     * Render timeline view
     */
    async renderTimeline() {
        const savedGames = Storage.getSavedGames();

        if (!savedGames.length) {
            this.elements.timelineFeed.classList.add('hidden');
            this.elements.timelineEmpty.classList.remove('hidden');
            return;
        }

        this.elements.timelineEmpty.classList.add('hidden');
        this.elements.timelineFeed.classList.remove('hidden');

        // Show loading
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

                // Get badge text based on type
                const badgeText = update.type === 'patch' ? 'Patch' : update.type === 'dlc' ? 'DLC' : update.type === 'release' ? 'Release' : 'News';

                // Add timeline entry - modern social feed card style
                html += `
                    <article class="timeline-entry" data-game-id="${update.game.id}">
                        <div class="timeline-entry__type-strip timeline-entry__type-strip--${update.type}"></div>
                        <div class="timeline-entry__banner">
                            <img class="timeline-entry__banner-image" src="${update.game.image}" alt="${this.escapeHtml(update.game.name)}" loading="lazy">
                            <div class="timeline-entry__banner-overlay"></div>
                        </div>
                        <div class="timeline-entry__content">
                            <div class="timeline-entry__header">
                                <img class="timeline-entry__game-image" src="${update.game.image}" alt="${this.escapeHtml(update.game.name)}" loading="lazy">
                                <div class="timeline-entry__meta">
                                    <p class="timeline-entry__game-name">${this.escapeHtml(update.game.name)}</p>
                                    <p class="timeline-entry__date">${this.formatDate(update.date)}</p>
                                </div>
                                <span class="timeline-entry__badge timeline-entry__badge--${update.type}">${badgeText}</span>
                            </div>
                            <h3 class="timeline-entry__title">${this.escapeHtml(update.title)}</h3>
                            ${update.content ? `<p class="timeline-entry__description">${this.escapeHtml(update.content)}</p>` : ''}
                            <div class="timeline-entry__footer">
                                <span class="timeline-entry__action">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="m9 18 6-6-6-6"/>
                                    </svg>
                                    View Details
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
    }
};

// Export for use in other modules
window.UI = UI;
