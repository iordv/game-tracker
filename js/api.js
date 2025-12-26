/**
 * GameTracker API Service
 * Handles all API interactions with RAWG and Steam News
 * Now with robust Proxy Rotation for reliable CORS fetching
 */

const API = {
    // RAWG API configuration
    RAWG_BASE: 'https://api.rawg.io/api',
    RAWG_KEY: 'c542e67aec3a4340908f9de9e86038af', // Free tier API key

    // Steam News API (no key required for public news)
    STEAM_NEWS_BASE: 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2',

    // CORS Proxies to rotate through
    PROXIES: [
        { url: 'https://corsproxy.io/?', encode: false },
        { url: 'https://api.allorigins.win/raw?url=', encode: true },
        { url: 'https://thingproxy.freeboard.io/fetch/', encode: false }
    ],

    // Cache duration (5 minutes for search, 15 minutes for game details)
    CACHE_DURATION: {
        search: 5 * 60 * 1000,
        details: 15 * 60 * 1000,
        news: 10 * 60 * 1000
    },

    // In-memory cache
    cache: new Map(),

    /**
     * Get cached data if valid
     */
    getCache(key, type = 'search') {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION[type];
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    },

    /**
     * Set cache data
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    },

    /**
     * Fetch with Proxy Rotation
     * Tries multiple proxies until one works
     */
    async fetchWithProxy(targetUrl) {
        let lastError;

        for (const proxy of this.PROXIES) {
            try {
                const finalUrl = proxy.encode ?
                    proxy.url + encodeURIComponent(targetUrl) :
                    proxy.url + targetUrl;

                const response = await fetch(finalUrl);

                if (response.ok) {
                    return response;
                }
            } catch (error) {
                console.warn(`Proxy ${proxy.url} failed:`, error);
                lastError = error;
            }
        }

        throw lastError || new Error('All proxies failed');
    },

    /**
     * Search for games
     * @param {string} query - Search term
     * @param {number} page - Page number
     * @returns {Promise<Object>} Search results
     */
    async searchGames(query, page = 1) {
        const cacheKey = `search:${query}:${page}`;
        const cached = this.getCache(cacheKey, 'search');
        if (cached) return cached;

        try {
            const params = new URLSearchParams({
                key: this.RAWG_KEY,
                search: query,
                page,
                page_size: 20,
                search_precise: true
            });

            const response = await fetch(`${this.RAWG_BASE}/games?${params}`);

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();

            // Format results
            const results = {
                games: data.results.map(game => this.formatGameBasic(game)),
                count: data.count,
                next: data.next,
                previous: data.previous
            };

            this.setCache(cacheKey, results);
            return results;

        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    },

    /**
     * Get trending games
     * @returns {Promise<Array>} Trending games
     */
    async getTrendingGames() {
        const cacheKey = 'trending';
        const cached = this.getCache(cacheKey, 'search');
        if (cached) return cached;

        try {
            // Get games from last 3 months, ordered by popularity
            const today = new Date();
            const threeMonthsAgo = new Date(today.setMonth(today.getMonth() - 3));
            const dateRange = `${threeMonthsAgo.toISOString().split('T')[0]},${new Date().toISOString().split('T')[0]}`;

            const params = new URLSearchParams({
                key: this.RAWG_KEY,
                dates: dateRange,
                ordering: '-added',
                page_size: 12
            });

            const response = await fetch(`${this.RAWG_BASE}/games?${params}`);

            if (!response.ok) {
                throw new Error(`Trending fetch failed: ${response.status}`);
            }

            const data = await response.json();
            const games = data.results.map(game => this.formatGameBasic(game));

            this.setCache(cacheKey, games);
            return games;

        } catch (error) {
            console.error('Trending fetch error:', error);
            throw error;
        }
    },

    /**
     * Get detailed game information
     * @param {number} gameId - RAWG game ID
     * @returns {Promise<Object>} Game details
     */
    async getGameDetails(gameId) {
        const cacheKey = `game:${gameId}`;
        const cached = this.getCache(cacheKey, 'details');
        if (cached) return cached;

        try {
            const params = new URLSearchParams({
                key: this.RAWG_KEY
            });

            // Fetch game details
            const response = await fetch(`${this.RAWG_BASE}/games/${gameId}?${params}`);

            if (!response.ok) {
                throw new Error(`Game details fetch failed: ${response.status}`);
            }

            const data = await response.json();
            const game = this.formatGameDetails(data);

            this.setCache(cacheKey, game);
            return game;

        } catch (error) {
            console.error('Game details error:', error);
            throw error;
        }
    },

    /**
     * Get game screenshots
     * @param {number} gameId - RAWG game ID
     * @returns {Promise<Array>} Screenshots
     */
    async getGameScreenshots(gameId) {
        const cacheKey = `screenshots:${gameId}`;
        const cached = this.getCache(cacheKey, 'details');
        if (cached) return cached;

        try {
            const params = new URLSearchParams({
                key: this.RAWG_KEY
            });

            const response = await fetch(`${this.RAWG_BASE}/games/${gameId}/screenshots?${params}`);

            if (!response.ok) {
                throw new Error(`Screenshots fetch failed: ${response.status}`);
            }

            const data = await response.json();
            const screenshots = data.results.map(s => s.image);

            this.setCache(cacheKey, screenshots);
            return screenshots;

        } catch (error) {
            console.error('Screenshots error:', error);
            return [];
        }
    },

    /**
   * Get game DLC and additions
   * @param {number} gameId - RAWG game ID
   * @param {string} gameName - Game name for Steam lookup
   * @returns {Promise<Array>} DLC list
   */
    async getGameDLC(gameId, gameName = null) {
        const cacheKey = `dlc:${gameId}`;
        const cached = this.getCache(cacheKey, 'details');
        if (cached) return cached;

        let dlc = [];

        try {
            // 1. First try Steam Store API - most accurate for DLC with pricing
            if (gameName) {
                dlc = await this.getSteamDLC(gameName);
            }

            // 2. If no Steam DLC, try RAWG additions endpoint
            // RAWG additions = actual DLC/expansions, not related games
            if (dlc.length === 0) {
                const params = new URLSearchParams({
                    key: this.RAWG_KEY
                });

                const additionsResponse = await fetch(`${this.RAWG_BASE}/games/${gameId}/additions?${params}`);
                if (additionsResponse.ok) {
                    const additionsData = await additionsResponse.json();
                    dlc = additionsData.results.map(item => ({
                        id: item.id,
                        name: item.name,
                        slug: item.slug,
                        image: item.background_image,
                        released: item.released,
                        rating: item.rating,
                        price: null, // RAWG doesn't provide pricing
                        source: 'rawg'
                    }));
                }
            }

            // NOTE: We intentionally do NOT use game-series endpoint
            // as it returns related games (sequels, prequels) not DLC

            this.setCache(cacheKey, dlc);
            return dlc;

        } catch (error) {
            console.error('DLC error:', error);
            return [];
        }
    },

    /**
     * Get DLC from Steam Store API
     * @param {string} gameName - Game name
     * @returns {Promise<Array>} DLC list with accurate pricing
     */
    async getSteamDLC(gameName) {
        try {
            const steamAppId = await this.findSteamAppId(gameName);
            if (!steamAppId) return [];

            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const storeUrl = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}`;

            const response = await this.fetchWithProxy(storeUrl);
            if (!response.ok) return [];

            const data = await response.json();
            const gameData = data[steamAppId]?.data;

            if (!gameData || !gameData.dlc || gameData.dlc.length === 0) {
                return [];
            }

            // Get details for first 10 DLCs
            const dlcIds = gameData.dlc.slice(0, 10);
            const dlcList = [];

            for (const dlcId of dlcIds) {
                try {
                    const dlcUrl = `https://store.steampowered.com/api/appdetails?appids=${dlcId}`;
                    const dlcResponse = await this.fetchWithProxy(dlcUrl);

                    if (dlcResponse.ok) {
                        const dlcData = await dlcResponse.json();
                        const dlcInfo = dlcData[dlcId]?.data;

                        if (dlcInfo) {
                            // Determine price display
                            let priceDisplay = null;
                            if (dlcInfo.is_free) {
                                priceDisplay = 'Free';
                            } else if (dlcInfo.price_overview) {
                                priceDisplay = dlcInfo.price_overview.final_formatted;
                            } else {
                                priceDisplay = 'See Store';
                            }

                            dlcList.push({
                                id: dlcId,
                                name: dlcInfo.name,
                                slug: dlcInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                                image: dlcInfo.header_image,
                                released: dlcInfo.release_date?.date || null,
                                price: priceDisplay,
                                isFree: dlcInfo.is_free || false,
                                source: 'steam'
                            });
                        }
                    }
                } catch (e) {
                    console.log('DLC detail fetch failed:', dlcId);
                }
            }

            return dlcList;

        } catch (error) {
            console.error('Steam DLC error:', error);
            return [];
        }
    },

    /**
     * Get game news/updates from Steam
     * @param {string} gameName - Game name for Steam lookup
     * @param {number} steamAppId - Optional Steam App ID
     * @returns {Promise<Array>} News items
     */
    async getGameNews(gameName, steamAppId = null) {
        // If we don't have a Steam App ID, try to find one
        if (!steamAppId) {
            steamAppId = await this.findSteamAppId(gameName);
        }

        if (!steamAppId) {
            return []; // No Steam presence
        }

        const cacheKey = `news:${steamAppId}`;
        const cached = this.getCache(cacheKey, 'news');
        if (cached) return cached;

        try {
            // Use CORS proxies
            const steamUrl = `${this.STEAM_NEWS_BASE}?appid=${steamAppId}&count=15&maxlength=500&format=json`;

            const response = await this.fetchWithProxy(steamUrl);

            if (!response.ok) {
                throw new Error(`Steam news fetch failed: ${response.status}`);
            }

            const data = await response.json();

            if (!data.appnews || !data.appnews.newsitems) {
                return [];
            }

            const news = data.appnews.newsitems
                .filter(item => {
                    // Filter to patch notes and updates
                    const title = item.title.toLowerCase();
                    const isPatch = title.includes('patch') ||
                        title.includes('update') ||
                        title.includes('hotfix') ||
                        title.includes('changelog') ||
                        title.includes('release') ||
                        title.includes('notes') ||
                        title.includes('fix') ||
                        title.includes('version');
                    return isPatch || item.feed_type === 1; // Steam announcements
                })
                .map(item => ({
                    id: item.gid,
                    title: this.cleanTitle(item.title),
                    content: this.cleanContent(item.contents),
                    date: new Date(item.date * 1000),
                    url: item.url,
                    author: item.author || 'Developer'
                }));

            this.setCache(cacheKey, news);
            return news;

        } catch (error) {
            console.error('Steam news error:', error);
            return [];
        }
    },

    /**
     * Find Steam App ID by game name
     * @param {string} gameName - Game name
     * @returns {Promise<number|null>} Steam App ID
     */
    async findSteamAppId(gameName) {
        const cacheKey = `steamid:${gameName.toLowerCase()}`;
        const cached = this.getCache(cacheKey, 'details');
        if (cached !== null) return cached;

        try {
            // Use Steam store search API via CORS proxy
            const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&cc=us&l=en`;

            const response = await this.fetchWithProxy(searchUrl);

            if (!response.ok) {
                throw new Error(`Steam search failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.items && data.items.length > 0) {
                // Find best match
                const normalizedName = gameName.toLowerCase().replace(/[^a-z0-9]/g, '');
                const match = data.items.find(item => {
                    const itemName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return itemName.includes(normalizedName) || normalizedName.includes(itemName);
                }) || data.items[0];

                const appId = match.id;
                this.setCache(cacheKey, appId);
                return appId;
            }

            this.setCache(cacheKey, null);
            return null;

        } catch (error) {
            console.error('Steam ID lookup error:', error);
            return null;
        }
    },

    /**
     * Get recent updates for multiple saved games
     * Combines patches, DLC releases, and upcoming releases into a chronological feed
     * @param {Array} games - Array of saved game objects
     * @param {number} limit - Maximum number of updates to return
     * @returns {Promise<Array>} Recent updates sorted by date
     */
    async getRecentUpdatesForGames(games, limit = 15) {
        const cacheKey = `recent_updates:${games.map(g => g.id).join(',')}`;
        const cached = this.getCache(cacheKey, 'news');
        if (cached) return cached;

        const updates = [];

        // Fetch updates for each game (limit concurrent requests)
        const fetchPromises = games.slice(0, 10).map(async (game) => {
            const gameUpdates = [];

            try {
                // Get news/patches
                // Get news/patches
                const news = await this.getGameNews(game.name);
                news.slice(0, 10).forEach(item => { // Increased slice to get more history
                    // Determine type based on title
                    const titleToCheck = item.title.toLowerCase();
                    const isPatch = titleToCheck.includes('patch') ||
                        titleToCheck.includes('update') ||
                        titleToCheck.includes('hotfix') ||
                        titleToCheck.includes('fix') ||
                        titleToCheck.includes('changelog') ||
                        titleToCheck.includes('version') ||
                        titleToCheck.includes('notes');

                    gameUpdates.push({
                        id: `news_${game.id}_${item.id}`,
                        type: isPatch ? 'patch' : 'news',
                        game: {
                            id: game.id,
                            name: game.name,
                            image: game.image,
                            slug: game.slug
                        },
                        title: item.title,
                        content: item.content?.substring(0, 150) || '',
                        date: item.date,
                        url: item.url
                    });
                });

                // Get DLC
                const dlc = await this.getGameDLC(game.id, game.name);
                dlc.slice(0, 2).forEach(item => {
                    // Parse release date
                    let releaseDate = new Date();
                    if (item.released) {
                        const parsed = new Date(item.released);
                        if (!isNaN(parsed)) releaseDate = parsed;
                    }

                    gameUpdates.push({
                        id: `dlc_${game.id}_${item.id}`,
                        type: 'dlc',
                        game: {
                            id: game.id,
                            name: game.name,
                            image: game.image,
                            slug: game.slug
                        },
                        title: item.name,
                        content: `New content available: ${item.name}`,
                        date: releaseDate,
                        price: item.price,
                        dlcImage: item.image
                    });
                });

                // Check for upcoming release (future games)
                if (game.released) {
                    const releaseDate = new Date(game.released);
                    const now = new Date();
                    if (releaseDate > now) {
                        gameUpdates.push({
                            id: `release_${game.id}`,
                            type: 'release',
                            game: {
                                id: game.id,
                                name: game.name,
                                image: game.image,
                                slug: game.slug
                            },
                            title: `${game.name} releases soon!`,
                            content: `Coming ${releaseDate.toLocaleDateString()}`,
                            date: releaseDate
                        });
                    }
                }

            } catch (error) {
                console.log('Failed to fetch updates for:', game.name);
            }

            return gameUpdates;
        });

        // Wait for all fetches
        const results = await Promise.all(fetchPromises);
        results.forEach(gameUpdates => updates.push(...gameUpdates));

        // Sort by date (newest first) and limit
        const sortedUpdates = updates
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        this.setCache(cacheKey, sortedUpdates);
        return sortedUpdates;
    },

    /**
     * Format basic game data
     */
    formatGameBasic(game) {
        return {
            id: game.id,
            name: game.name,
            slug: game.slug,
            image: game.background_image,
            rating: game.rating,
            metacritic: game.metacritic,
            released: game.released,
            genres: game.genres?.map(g => g.name) || [],
            platforms: game.platforms?.map(p => p.platform.name) || []
        };
    },

    /**
     * Format detailed game data
     */
    formatGameDetails(game) {
        return {
            id: game.id,
            name: game.name,
            slug: game.slug,
            image: game.background_image,
            description: game.description_raw || this.stripHtml(game.description) || 'No description available.',
            rating: game.rating,
            metacritic: game.metacritic,
            released: game.released,
            updated: game.updated,
            website: game.website,
            genres: game.genres?.map(g => g.name) || [],
            platforms: game.platforms?.map(p => p.platform.name) || [],
            developers: game.developers?.map(d => d.name) || [],
            publishers: game.publishers?.map(p => p.name) || [],
            esrbRating: game.esrb_rating?.name || 'Not Rated',
            playtime: game.playtime,
            stores: game.stores?.map(s => ({
                name: s.store.name,
                url: s.url
            })) || []
        };
    },

    /**
     * Clean HTML from content
     */
    stripHtml(html) {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    },

    /**
     * Clean news title
     */
    cleanTitle(title) {
        return title
            .replace(/\[.*?\]/g, '') // Remove brackets
            .replace(/\{.*?\}/g, '') // Remove braces
            .trim();
    },

    /**
     * Clean news content
     */
    cleanContent(content) {
        if (!content) return '';

        // Remove BBCode and HTML
        return content
            .replace(/\[.*?\]/g, '')
            .replace(/<[^>]*>/g, '')
            .replace(/\{STEAM.*?\}/g, '')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
            .substring(0, 800);
    }
};

// Export for use in other modules
window.API = API;
