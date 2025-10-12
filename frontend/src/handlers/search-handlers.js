/**
 * SearchHandlers ES6 Module
 * Handles all search-related functionality including global search, filters, and results display
 */

import { getEnvironment } from '../utils/environment.js';
import { apiCall } from '../js/api-compatibility-shim.js';

class SearchHandlers {
    constructor() {
        this.currentQuery = '';
        this.activeFilters = {
            type: 'all',
            location: '',
            time: '',
            topic: ''
        };
        this.currentSearchResults = { users: [], posts: [], officials: [], topics: [] };
        this.globalSearchTimeout = null;

        this.setupEventListeners();
        console.log('SearchHandlers initialized');
    }

    setupEventListeners() {
        // Search input handling
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('focus', () => this.openSearch());
            searchInput.addEventListener('input', (e) => this.performGlobalSearch(e.target.value));
        }

        // Mobile search button
        const mobileSearchBtn = document.querySelector('.mobile-search-btn');
        if (mobileSearchBtn) {
            mobileSearchBtn.addEventListener('click', () => this.toggleMobileSearch());
        }

        // Close search button
        const closeSearchBtn = document.querySelector('.search-header button');
        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', () => this.closeSearch());
        }

        // Advanced filters toggle
        const advancedToggle = document.querySelector('button[onclick*="toggleAdvancedFilters"]');
        if (advancedToggle) {
            advancedToggle.removeAttribute('onclick');
            advancedToggle.addEventListener('click', () => this.toggleAdvancedFilters());
        }

        // Search type filters
        const searchTypeInputs = document.querySelectorAll('input[name="searchType"]');
        searchTypeInputs.forEach(input => {
            input.removeAttribute('onchange');
            input.addEventListener('change', () => this.updateSearchResults());
        });

        // Advanced filter dropdowns
        const filterSelects = ['locationFilter', 'timeFilter', 'topicFilter'];
        filterSelects.forEach(filterId => {
            const select = document.getElementById(filterId);
            if (select) {
                select.removeAttribute('onchange');
                select.addEventListener('change', () => this.updateSearchResults());
            }
        });

        // Handle search input in mobile modal (if exists)
        const mobileSearchInput = document.querySelector('.mobile-search-modal input[type="search"]');
        if (mobileSearchInput) {
            mobileSearchInput.addEventListener('input', (e) => this.performGlobalSearch(e.target.value));
        }
    }

    // Enhanced search functionality
    openSearch() {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) {
            searchContainer.style.display = 'flex';

            // Close other panels if available
            if (window.closeAllPanels && typeof window.closeAllPanels === 'function') {
                window.closeAllPanels();
            }

            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();

                // Initialize search if there's already a query
                if (searchInput.value.length >= 2) {
                    this.performGlobalSearch(searchInput.value);
                }
            }
        }
    }

    closeSearch() {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) {
            searchContainer.style.display = 'none';
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        this.currentQuery = '';
        this.currentSearchResults = { users: [], posts: [], officials: [], topics: [] };

        // Clear mobile search input if exists
        const mobileSearchInput = document.querySelector('.mobile-search-modal input[type="search"]');
        if (mobileSearchInput) {
            mobileSearchInput.value = '';
        }
    }

    async performGlobalSearch(query) {
        clearTimeout(this.globalSearchTimeout);
        this.currentQuery = query;

        if (!query || query.length < 2) {
            const resultsContainer = document.getElementById('globalSearchResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div style="text-align: center; color: #666; padding: 2rem;">
                        Start typing to search users, posts, officials, and topics...
                    </div>
                `;
            }
            return;
        }

        this.globalSearchTimeout = setTimeout(async () => {
            await this.executeEnhancedSearch(query);
        }, 300);
    }

    // Enhanced search execution with multiple content types
    async executeEnhancedSearch(query) {
        if (!window.currentUser) {
            const resultsContainer = document.getElementById('globalSearchResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div style="text-align: center; color: #666; padding: 2rem;">
                        Please log in to search
                    </div>
                `;
            }
            return;
        }

        try {
            // Get current filters
            const searchType = document.querySelector('input[name="searchType"]:checked')?.value || 'all';
            const locationFilter = document.getElementById('locationFilter')?.value || '';
            const timeFilter = document.getElementById('timeFilter')?.value || '';
            const topicFilter = document.getElementById('topicFilter')?.value || '';

            // Update active filters
            this.activeFilters = {
                type: searchType,
                location: locationFilter,
                time: timeFilter,
                topic: topicFilter
            };

            console.log('🔍 Search debug - query:', query, 'filters:', this.activeFilters);

            // Show loading state
            const resultsContainer = document.getElementById('globalSearchResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <div class="spinner" style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #4b5c09; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <div style="margin-top: 0.5rem;">Searching...</div>
                    </div>
                `;
            }

            // Prepare search parameters
            const searchParams = new URLSearchParams({
                q: query,
                types: searchType === 'all' ? 'users,posts,officials,topics,candidates' : searchType
            });

            if (locationFilter) searchParams.append('location', locationFilter);
            if (timeFilter) searchParams.append('time', timeFilter);
            if (topicFilter) searchParams.append('topic', topicFilter);

            // Execute search API call
            const response = await apiCall(`/search/unified?${searchParams.toString()}`);
            console.log('🔍 Search response:', response);

            if (response.ok && response.data && response.data.success) {
                this.currentSearchResults = response.data.data || { users: [], posts: [], officials: [], topics: [], candidates: [] };
                await this.displayUnifiedSearchResults(this.currentSearchResults, query);
            } else {
                throw new Error(response.data?.error || 'Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            const resultsContainer = document.getElementById('globalSearchResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div style="text-align: center; color: #d32f2f; padding: 2rem;">
                        Search error: ${error.message}
                    </div>
                `;
            }
        }
    }

    async displayUnifiedSearchResults(results, query) {
        const resultsContainer = document.getElementById('globalSearchResults');
        if (!resultsContainer) return;

        const { users = [], posts = [], officials = [], topics = [], candidates = [] } = results;
        const totalResults = users.length + posts.length + officials.length + topics.length + candidates.length;

        if (totalResults === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; color: #666; padding: 2rem;">
                    <h3>No results found for "${query}"</h3>
                    <p>Try adjusting your search filters or using different keywords.</p>
                </div>
            `;
            return;
        }

        let html = `<div style="padding: 1rem; color: #4b5c09; font-weight: bold;">Found ${totalResults} results for "${query}"</div>`;

        // Render each section if it has results
        if (users.length > 0) {
            html += this.renderSearchSection('👤 Users', users, this.renderUserResult.bind(this));
        }
        if (posts.length > 0) {
            html += this.renderSearchSection('📝 Posts', posts, this.renderPostResult.bind(this));
        }
        if (officials.length > 0) {
            html += this.renderSearchSection('🏛️ Officials', officials, this.renderOfficialResult.bind(this));
        }
        if (candidates.length > 0) {
            html += this.renderSearchSection('🗳️ Candidates', candidates, this.renderCandidateResult.bind(this));
        }
        if (topics.length > 0) {
            html += this.renderSearchSection('🏷️ Topics', topics, this.renderTopicResult.bind(this));
        }

        resultsContainer.innerHTML = html;
    }

    // Helper function to render search sections
    renderSearchSection(title, results, renderFunction) {
        const header = `
            <div style="background: #f5f5f5; padding: 0.5rem 1rem; font-weight: bold; color: #4b5c09; border-bottom: 1px solid #ddd;">
                ${title} (${results.length})
            </div>
        `;

        const items = results.map(item => renderFunction(item)).join('');

        return header + '<div>' + items + '</div>';
    }

    renderUserResult(user) {
        return `
            <div class="search-result-item" onclick="window.searchHandlers.openUserProfile(${user.id}, '${user.username}')" style="padding: 0.75rem 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <img src="${user.profilePicture || '/images/default-avatar.png'}" alt="${user.username}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <div style="font-weight: bold; color: #333;">${user.displayName || user.username}</div>
                        <div style="color: #666; font-size: 0.9rem;">@${user.username}</div>
                        ${user.location ? `<div style="color: #888; font-size: 0.8rem;">📍 ${user.location}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderPostResult(post) {
        const truncatedContent = post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content;
        const timeAgo = this.formatTimeAgo(new Date(post.createdAt));

        return `
            <div class="search-result-item" onclick="window.searchHandlers.showPostInFeed(${post.id})" style="padding: 0.75rem 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
                <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                    <img src="${post.user?.profilePicture || '/images/default-avatar.png'}" alt="${post.user?.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                    <div style="flex: 1;">
                        <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.25rem;">
                            <strong>${post.user?.displayName || post.user?.username}</strong> • ${timeAgo}
                        </div>
                        <div style="color: #333; line-height: 1.4;">${truncatedContent}</div>
                        ${post.mediaUrl ? '<div style="color: #4b5c09; font-size: 0.8rem; margin-top: 0.25rem;">📷 Has media</div>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderOfficialResult(official) {
        return `
            <div class="search-result-item" onclick="window.searchHandlers.showOfficialDetails(${official.id})" style="padding: 0.75rem 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <img src="${official.photo || '/images/default-official.png'}" alt="${official.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <div style="font-weight: bold; color: #333;">${official.name}</div>
                        <div style="color: #4b5c09; font-size: 0.9rem;">${official.title}</div>
                        ${official.state ? `<div style="color: #888; font-size: 0.8rem;">📍 ${official.state}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderCandidateResult(candidate) {
        return `
            <div class="search-result-item" onclick="window.searchHandlers.showCandidateDetails(${candidate.id})" style="padding: 0.75rem 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <img src="${candidate.profilePicture || '/images/default-candidate.png'}" alt="${candidate.fullName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <div style="font-weight: bold; color: #333;">${candidate.fullName}</div>
                        <div style="color: #4b5c09; font-size: 0.9rem;">${candidate.office} Candidate</div>
                        ${candidate.state ? `<div style="color: #888; font-size: 0.8rem;">📍 ${candidate.state}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderTopicResult(topic) {
        return `
            <div class="search-result-item" onclick="window.searchHandlers.enterTopicMode('${topic.id}')" style="padding: 0.75rem 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; background: #4b5c09; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">
                        🏷️
                    </div>
                    <div>
                        <div style="font-weight: bold; color: #333;">${topic.name}</div>
                        <div style="color: #666; font-size: 0.9rem;">${topic.postCount || 0} posts</div>
                        ${topic.description ? `<div style="color: #888; font-size: 0.8rem;">${topic.description}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Update search results when filters change
    async updateSearchResults() {
        if (this.currentQuery && this.currentQuery.length >= 2) {
            await this.executeEnhancedSearch(this.currentQuery);
        }
    }

    // Toggle advanced filters
    toggleAdvancedFilters() {
        const filtersDiv = document.getElementById('advancedFilters');
        const toggleSpan = document.getElementById('advancedFiltersToggle');

        if (filtersDiv && toggleSpan) {
            if (filtersDiv.style.display === 'none') {
                filtersDiv.style.display = 'block';
                toggleSpan.textContent = '▲ Advanced Filters';
            } else {
                filtersDiv.style.display = 'none';
                toggleSpan.textContent = '▼ Advanced Filters';
            }
        }
    }

    // Mobile search toggle (placeholder - implementation depends on existing mobile UI)
    toggleMobileSearch() {
        console.log('Mobile search toggle - implementation needed based on existing mobile UI');
        // This would typically show/hide a mobile search modal or overlay
        // Implementation depends on the existing mobile search UI structure
    }

    // Navigation methods for search results
    async openUserProfile(userId, username) {
        try {
            this.closeSearch();

            // Show loading state
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <div class="spinner" style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #4b5c09; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <div style="margin-top: 0.5rem;">Loading ${username}'s profile...</div>
                    </div>
                `;
            }

            // Use existing profile loading functionality if available
            if (window.Profile && typeof window.Profile.loadUserProfile === 'function') {
                await window.Profile.loadUserProfile(userId);
            } else {
                console.log('Profile loading functionality not available');
            }
        } catch (error) {
            console.error('Error opening user profile:', error);
        }
    }

    async showPostInFeed(postId) {
        try {
            this.closeSearch();

            // Load single post and display in My Feed
            const response = await apiCall(`/posts/${postId}`);
            if (response.ok && response.data) {
                // Show the post in main content
                const mainContent = document.getElementById('mainContent');
                if (mainContent) {
                    mainContent.innerHTML = `
                        <div style="text-align: center; padding: 2rem;">
                            Post loading functionality needs integration with existing feed system
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error showing post:', error);
        }
    }

    async showOfficialDetails(officialId) {
        try {
            this.closeSearch();

            // Load official information in main content
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        Official details loading functionality needs integration
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error showing official details:', error);
        }
    }

    async showCandidateDetails(candidateId) {
        try {
            this.closeSearch();

            // Load candidate information
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        Candidate details loading functionality needs integration
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error showing candidate details:', error);
        }
    }

    async enterTopicMode(topicId) {
        try {
            this.closeSearch();

            // Use existing topic navigation system if available
            if (window.TopicNavigation && typeof window.TopicNavigation.enterTopic === 'function') {
                await window.TopicNavigation.enterTopic(topicId);
                if (window.showToast && typeof window.showToast === 'function') {
                    window.showToast('Viewing topic discussions');
                }
            } else {
                console.log('Topic navigation functionality not available');
            }
        } catch (error) {
            console.error('Error entering topic mode:', error);
        }
    }

    // Utility method for time formatting
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    /**
     * Display all search results with category sections
     * Migrated from index.html line 2737
     */
    displayAllSearchResults() {
        const resultsContainer = document.getElementById('globalSearchResults');
        const { users, posts, officials, topics } = this.currentSearchResults;

        // Separate candidates from officials
        const candidates = officials ? officials.filter(o => o.politicalProfileType === 'CANDIDATE') : [];
        const actualOfficials = officials ? officials.filter(o => o.politicalProfileType === 'ELECTED_OFFICIAL') : [];

        const totalResults = users.length + posts.length + candidates.length + actualOfficials.length + topics.length;

        if (totalResults === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; color: #666; padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
                    <h3>No Results Found</h3>
                    <p>Try different keywords or adjust your filters</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="padding: 1rem; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #4b5c09;">
                Found ${totalResults} results for "${this.currentQuery}"
            </div>
        `;

        // Display each category with results
        if (users.length > 0) {
            html += this.renderSearchSection('👤 Users', users, this.renderUserResult.bind(this));
        }
        if (candidates.length > 0) {
            html += this.renderSearchSection('🗳️ Candidates', candidates, this.renderCandidateResult.bind(this));
        }
        if (actualOfficials.length > 0) {
            html += this.renderSearchSection('🏛️ Officials', actualOfficials, this.renderOfficialResult.bind(this));
        }
        if (posts.length > 0) {
            html += this.renderSearchSection('📝 Posts', posts, this.renderPostResult.bind(this));
        }
        if (topics.length > 0) {
            html += this.renderSearchSection('🏷️ Topics', topics, this.renderTopicResult.bind(this));
        }

        resultsContainer.innerHTML = html;
    }

    /**
     * Display filtered results for a specific type
     * Migrated from index.html line 2785
     */
    displayFilteredSearchResults(type) {
        const resultsContainer = document.getElementById('globalSearchResults');
        let results = this.currentSearchResults[type];

        // Handle separation of candidates and officials
        if (type === 'officials') {
            results = this.currentSearchResults.officials ? this.currentSearchResults.officials.filter(o => o.politicalProfileType === 'ELECTED_OFFICIAL') : [];
        } else if (type === 'candidates') {
            results = this.currentSearchResults.officials ? this.currentSearchResults.officials.filter(o => o.politicalProfileType === 'CANDIDATE') : [];
        }

        if (results.length === 0) {
            const typeLabels = {
                users: '👤 Users',
                posts: '📝 Posts',
                officials: '🏛️ Officials',
                candidates: '🗳️ Candidates',
                topics: '🏷️ Topics'
            };

            resultsContainer.innerHTML = `
                <div style="text-align: center; color: #666; padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
                    <h3>No ${typeLabels[type]} Found</h3>
                    <p>Try different keywords or remove filters</p>
                </div>
            `;
            return;
        }

        const renderFunctions = {
            users: this.renderUserResult.bind(this),
            posts: this.renderPostResult.bind(this),
            officials: this.renderOfficialResult.bind(this),
            candidates: this.renderCandidateResult.bind(this),
            topics: this.renderTopicResult.bind(this)
        };

        let html = results.map(result => renderFunctions[type](result)).join('');
        resultsContainer.innerHTML = html;
    }

    /**
     * Open user profile (enhanced version)
     * Migrated from index.html line 2994
     */
    async openUserProfile(userId, username) {
        try {
            this.closeSearch();

            // Show loading state
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <h2>Loading @${username}'s Profile</h2>
                        <p>Loading profile and posts...</p>
                    </div>
                `;
            }

            // Load user's profile using the MyProfile component
            if (window.Profile) {
                await window.Profile.showUserProfile(userId);
            } else {
                // Fallback to basic profile view
                await this.openUserFeed(userId, username);
            }

        } catch (error) {
            console.error('Failed to open user profile:', error);
            if (typeof showToast === 'function') {
                showToast('Failed to load user profile');
            }
        }
    }

    /**
     * Show specific post in feed
     * Migrated from index.html line 3022
     */
    async showPostInFeed(postId) {
        try {
            this.closeSearch();

            // Load single post and display in My Feed
            const response = await apiCall(`/posts/${postId}`);
            if (response.ok && response.data) {
                // Show the post in main content
                if (typeof showMyFeedInMain === 'function') {
                    showMyFeedInMain();
                }

                // Highlight the specific post
                setTimeout(() => {
                    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
                    if (postElement) {
                        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        postElement.style.border = '2px solid #4b5c09';
                        postElement.style.borderRadius = '8px';
                        setTimeout(() => {
                            postElement.style.border = '';
                            postElement.style.borderRadius = '';
                        }, 3000);
                    }
                }, 1000);

                if (typeof showToast === 'function') {
                    showToast('Post found in feed');
                }
            } else {
                if (typeof showToast === 'function') {
                    showToast('Post not found or not accessible');
                }
            }

        } catch (error) {
            console.error('Failed to show post:', error);
            if (typeof showToast === 'function') {
                showToast('Failed to load post');
            }
        }
    }

    /**
     * Legacy function for compatibility
     * Migrated from index.html line 3063
     */
    async openUserFeed(userId, username) {
        try {
            this.closeSearch();

            // Show loading state
            const feedElement = document.getElementById('postsFeed');
            if (feedElement) {
                feedElement.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <h2>Loading @${username}'s Profile</h2>
                        <p>Loading profile and posts...</p>
                    </div>
                `;
            }

            // Load user's profile and posts in parallel
            const [profileResponse, postsResponse] = await Promise.all([
                apiCall(`/users/${userId}`),
                apiCall(`/posts/user/${userId}`)
            ]);

            if (profileResponse.ok && postsResponse.ok) {
                const userProfile = profileResponse.data.user;
                const posts = postsResponse.data.posts || [];

                // Create profile header (simplified for space)
                let html = `
                    <div style="background: linear-gradient(135deg, #4b5c09 0%, #6b7f1a 100%); color: white; padding: 2rem; margin-bottom: 1rem; border-radius: 8px;">
                        <h1>${userProfile.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}` : userProfile.username}</h1>
                        <p>@${userProfile.username} • ${userProfile.followersCount || 0} followers</p>
                        ${userId !== window.currentUser?.id ? `
                            <button onclick="toggleFollow('${userId}', this)" style="padding: 0.5rem 1rem; background: #fff; color: #4b5c09; border: none; border-radius: 4px;">Follow</button>
                            <button onclick="startConversationWithUser('${userId}', '${username}')" style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.2); color: white; border: 2px solid rgba(255,255,255,0.3); border-radius: 4px; margin-left: 0.5rem;">Message</button>
                        ` : ''}
                    </div>
                    <div style="border-bottom: 2px solid #4b5c09; margin-bottom: 1rem; padding-bottom: 0.5rem;">
                        <h2 style="margin: 0; color: #4b5c09;">Posts (${posts.length})</h2>
                    </div>
                `;

                if (posts.length === 0) {
                    html += `<div style="text-align: center; padding: 2rem; color: #666;"><p>This user hasn't posted anything yet.</p></div>`;
                } else {
                    posts.forEach(post => {
                        html += `
                            <div class="post-item" data-post-id="${post.id}" style="background: white; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div style="font-weight: bold; margin-bottom: 0.5rem;">${post.author.firstName || post.author.username}</div>
                                <div style="margin-bottom: 1rem;">${post.content}</div>
                                <div style="color: #666; font-size: 0.9rem;">👍 ${post.likesCount || 0} • 💬 ${post.commentsCount || 0} • ${new Date(post.createdAt).toLocaleDateString()}</div>
                            </div>
                        `;
                    });
                }

                if (feedElement) {
                    feedElement.innerHTML = html;
                }
            }
        } catch (error) {
            console.error('Error loading user feed:', error);
        }
    }

    /**
     * Add friend functionality
     * Migrated from index.html line 3211
     */
    async addFriend(userId) {
        console.log('Adding friend:', userId);

        if (window.FriendUtils && typeof window.FriendUtils.sendFriendRequest === 'function') {
            await window.FriendUtils.sendFriendRequest(userId);
        } else {
            // Fallback implementation
            try {
                const response = await apiCall('/friends/request', {
                    method: 'POST',
                    body: JSON.stringify({ targetUserId: userId })
                });

                if (response.ok) {
                    if (typeof showToast === 'function') {
                        showToast('Friend request sent!');
                    }
                } else {
                    if (typeof showToast === 'function') {
                        showToast('Failed to send friend request');
                    }
                }
            } catch (error) {
                console.error('Error sending friend request:', error);
                if (typeof showToast === 'function') {
                    showToast('Error sending friend request');
                }
            }
        }
    }

    /**
     * Render follow button for users
     * Migrated from index.html line 2688
     */
    renderFollowButton(userId, containerElement) {
        if (!window.currentUser || userId === window.currentUser.id) return '';

        try {
            // Get follow status from CACHED data
            const status = this.getCachedRelationshipStatus(userId);
            const isFollowing = status.isFollowing;

            const buttonHtml = `
                <button onclick="toggleFollow('${userId}', this)"
                    data-user-id="${userId}"
                    data-following="${isFollowing}"
                    style="padding: 0.25rem 0.5rem; background: ${isFollowing ? '#666' : '#4b5c09'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    ${isFollowing ? 'Following' : 'Follow'}
                </button>
            `;

            return buttonHtml;
        } catch (error) {
            console.error('Error loading cached follow status:', error);
            return `
                <button onclick="toggleFollow('${userId}', this)"
                    data-user-id="${userId}"
                    data-following="false"
                    style="padding: 0.25rem 0.5rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    Follow
                </button>
            `;
        }
    }

    /**
     * Get cached relationship status
     */
    getCachedRelationshipStatus(userId) {
        if (window.getCachedRelationshipStatus) {
            return window.getCachedRelationshipStatus(userId);
        }
        // Fallback
        return { isFollowing: false, isFriend: false };
    }
}

// Export the class as default
export default SearchHandlers;

// Create global instance for backward compatibility
const searchHandlers = new SearchHandlers();
window.SearchHandlers = SearchHandlers;
window.searchHandlers = searchHandlers;

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.displayAllSearchResults = () => searchHandlers.displayAllSearchResults();
    window.displayFilteredSearchResults = (type) => searchHandlers.displayFilteredSearchResults(type);
    window.openUserProfile = (userId, username) => searchHandlers.openUserProfile(userId, username);
    window.showPostInFeed = (postId) => searchHandlers.showPostInFeed(postId);
    window.openUserFeed = (userId, username) => searchHandlers.openUserFeed(userId, username);
    window.addFriend = (userId) => searchHandlers.addFriend(userId);
    window.renderFollowButton = (userId, containerElement) => searchHandlers.renderFollowButton(userId, containerElement);
}