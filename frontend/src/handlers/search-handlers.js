/**
 * SearchHandlers ES6 Module
 * Handles all search-related functionality including global search, filters, and results display
 */

import { getEnvironment } from '../utils/environment.js';

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
            const response = await window.apiCall(`/search/unified?${searchParams.toString()}`);
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
            const response = await window.apiCall(`/posts/${postId}`);
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
}

// Export the class as default
export default SearchHandlers;

// Create global instance for backward compatibility
window.SearchHandlers = SearchHandlers;