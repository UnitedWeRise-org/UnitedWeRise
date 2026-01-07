/**
 * @module features/search/global-search
 * @description Enhanced global search functionality
 * Extracted from index.html lines 6280-6995
 * 
 * @example
 * import { openSearch, performGlobalSearch } from '@/modules/features/search/global-search';
 * openSearch();
 */

import { apiClient } from '../../core/api/client.js';
import { userState } from '../../core/state/user.js';
import { escapeHTML, isValidURL } from '../../../utils/security.js';

// Search state management
let currentSearchQuery = '';
let currentSearchResults = {
    users: [],
    posts: [],
    officials: [],
    topics: []
};
let globalSearchTimeout;

/**
 * Open search interface
 * Extracted from index.html line 6289
 */
export function openSearch() {
    document.getElementById('searchContainer').style.display = 'flex';
    if (typeof window.closeAllPanels === 'function') {
        window.closeAllPanels(); // Close other panels
    }
    document.getElementById('searchInput').focus();
    
    // Initialize search if there's already a query
    const searchInput = document.getElementById('searchInput');
    if (searchInput.value.length >= 2) {
        performGlobalSearch(searchInput.value);
    }
}

/**
 * Close search interface
 * Extracted from index.html line 6301
 */
export function closeSearch() {
    document.getElementById('searchContainer').style.display = 'none';
    document.getElementById('searchInput').value = '';
    currentSearchQuery = '';
    currentSearchResults = { users: [], posts: [], officials: [], topics: [] };
    
    // Reset filters
    const allRadio = document.querySelector('input[name="searchType"][value="all"]');
    if (allRadio) allRadio.checked = true;
    
    const locationFilter = document.getElementById('locationFilter');
    if (locationFilter) locationFilter.value = '';
    
    const timeFilter = document.getElementById('timeFilter');
    if (timeFilter) timeFilter.value = '';
    
    const topicFilter = document.getElementById('topicFilter');
    if (topicFilter) topicFilter.value = '';
    
    const advancedFilters = document.getElementById('advancedFilters');
    if (advancedFilters) advancedFilters.style.display = 'none';
    
    const advancedFiltersToggle = document.getElementById('advancedFiltersToggle');
    if (advancedFiltersToggle) advancedFiltersToggle.textContent = '▼ Advanced Filters';
    
    const globalSearchResults = document.getElementById('globalSearchResults');
    if (globalSearchResults) {
        globalSearchResults.innerHTML = `
            <div style="text-align: center; color: #666; padding: 2rem;">
                Start typing to search across users, posts, officials, and topics
            </div>
        `;
    }
}

/**
 * Toggle advanced filters
 * Extracted from index.html line 6323
 */
export function toggleAdvancedFilters() {
    const filtersDiv = document.getElementById('advancedFilters');
    const toggleSpan = document.getElementById('advancedFiltersToggle');
    
    if (filtersDiv.style.display === 'none') {
        filtersDiv.style.display = 'block';
        toggleSpan.textContent = '▲ Advanced Filters';
    } else {
        filtersDiv.style.display = 'none';
        toggleSpan.textContent = '▼ Advanced Filters';
    }
}

/**
 * Perform global search with debouncing
 * Extracted from index.html line 6337
 */
export async function performGlobalSearch(query) {
    clearTimeout(globalSearchTimeout);
    currentSearchQuery = query;
    
    if (!query || query.length < 2) {
        document.getElementById('globalSearchResults').innerHTML = `
            <div style="text-align: center; color: #666; padding: 2rem;">
                Type at least 2 characters to search
            </div>
        `;
        return;
    }

    // Show loading state
    document.getElementById('globalSearchResults').innerHTML = `
        <div style="text-align: center; color: #666; padding: 2rem;">
            <div style="margin-bottom: 1rem;">🔍 Searching...</div>
            <div style="font-size: 0.9rem;">Looking across users, posts, officials, and topics</div>
        </div>
    `;

    globalSearchTimeout = setTimeout(async () => {
        await executeEnhancedSearch(query);
    }, 300);
}

/**
 * Update search results when filters change
 * Extracted from index.html line 6364
 */
export async function updateSearchResults() {
    if (currentSearchQuery && currentSearchQuery.length >= 2) {
        await executeEnhancedSearch(currentSearchQuery);
    }
}

/**
 * Enhanced search execution with multiple content types
 * Extracted from index.html line 6371
 */
async function executeEnhancedSearch(query) {
    if (!window.currentUser) {
        document.getElementById('globalSearchResults').innerHTML = `
            <div style="text-align: center; color: #666; padding: 2rem;">
                Please log in to search
            </div>
        `;
        return;
    }

    try {
        // Get current filters
        const searchTypeElement = document.querySelector('input[name="searchType"]:checked');
        const searchType = searchTypeElement ? searchTypeElement.value : 'all';
        
        const locationFilter = document.getElementById('locationFilter');
        const timeFilter = document.getElementById('timeFilter');
        const topicFilter = document.getElementById('topicFilter');
        
        // Build search parameters
        const searchParams = new URLSearchParams({
            q: query,
            limit: '20'
        });
        
        if (locationFilter && locationFilter.value) searchParams.append('location', locationFilter.value);
        if (timeFilter && timeFilter.value) searchParams.append('time', timeFilter.value);
        if (topicFilter && topicFilter.value) searchParams.append('topic', topicFilter.value);

        // Execute searches based on type
        let searchPromises = [];
        
        if (searchType === 'all') {
            // Use unified search endpoint (1 call instead of 4)
            searchPromises = [
                apiClient.call(`/search/unified?${searchParams.toString()}&types=users,posts,officials,topics`).catch(() => ({success: false, data: {users: [], posts: [], officials: [], topics: []}}))
            ];
        } else if (searchType === 'candidates') {
            // For candidates filter, search officials but filter client-side
            const endpoint = `/search/unified?${searchParams.toString()}&types=officials`;
            searchPromises = [apiClient.call(endpoint)];
        } else {
            // Search specific type - use unified endpoint with single type
            const endpoint = `/search/unified?${searchParams.toString()}&types=${searchType}`;
            searchPromises = [apiClient.call(endpoint)];
        }

        const results = await Promise.all(searchPromises);
        
        // Process unified search results
        const result = results[0];
        if (result && result.success && result.data) {
            const searchData = result.data;
            currentSearchResults = {
                users: searchData.users || [],
                posts: searchData.posts || [],
                officials: searchData.officials || [],
                topics: searchData.topics || []
            };
            
            if (searchType === 'all') {
                displayAllSearchResults();
            } else {
                displayFilteredSearchResults(searchType);
            }
        } else {
            // Fallback to empty results
            currentSearchResults = {
                users: [],
                posts: [],
                officials: [],
                topics: []
            };
            
            if (searchType === 'all') {
                displayAllSearchResults();
            } else {
                displayFilteredSearchResults(searchType);
            }
        }

    } catch (error) {
        console.error('Enhanced search error:', error);
        document.getElementById('globalSearchResults').innerHTML = `
            <div style="text-align: center; color: #d32f2f; padding: 2rem;">
                Search error occurred. Please try again.
            </div>
        `;
    }
}

/**
 * Display all search results with category sections
 * Extracted from index.html line 6466
 */
function displayAllSearchResults() {
    const resultsContainer = document.getElementById('globalSearchResults');
    const { users, posts, officials, topics } = currentSearchResults;
    
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

    const safeQuery = escapeHTML(currentSearchQuery);
    let html = `
        <div style="padding: 1rem; border-bottom: 1px solid #eee; background: #f9f9f9; font-weight: bold; color: #4b5c09;">
            Found ${totalResults} results for "${safeQuery}"
        </div>
    `;

    // Display each category with results
    if (users.length > 0) {
        html += renderSearchSection('👤 Users', users, renderUserResult);
    }
    if (candidates.length > 0) {
        html += renderSearchSection('🗳️ Candidates', candidates, renderCandidateResult);
    }
    if (actualOfficials.length > 0) {
        html += renderSearchSection('🏛️ Officials', actualOfficials, renderOfficialResult);
    }
    if (posts.length > 0) {
        html += renderSearchSection('📝 Posts', posts, renderPostResult);
    }
    if (topics.length > 0) {
        html += renderSearchSection('🏷️ Topics', topics, renderTopicResult);
    }

    resultsContainer.innerHTML = html;
}

/**
 * Display filtered results for a specific type
 * Extracted from index.html line 6514
 */
function displayFilteredSearchResults(type) {
    const resultsContainer = document.getElementById('globalSearchResults');
    let results = currentSearchResults[type];
    
    // Handle separation of candidates and officials
    if (type === 'officials') {
        results = currentSearchResults.officials ? currentSearchResults.officials.filter(o => o.politicalProfileType === 'ELECTED_OFFICIAL') : [];
    } else if (type === 'candidates') {
        results = currentSearchResults.officials ? currentSearchResults.officials.filter(o => o.politicalProfileType === 'CANDIDATE') : [];
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
        users: renderUserResult,
        posts: renderPostResult,
        officials: renderOfficialResult,
        candidates: renderCandidateResult,
        topics: renderTopicResult
    };

    let html = results.map(result => renderFunctions[type](result)).join('');
    resultsContainer.innerHTML = html;
}

/**
 * Helper function to render search sections
 * Extracted from index.html line 6557
 */
function renderSearchSection(title, results, renderFunction) {
    return `
        <div style="background: #f5f5f5; padding: 0.5rem 1rem; font-weight: bold; color: #4b5c09; border-bottom: 1px solid #ddd;">
            ${title} (${results.length})
        </div>
        ${results.slice(0, 5).map(result => renderFunction(result)).join('')}
        ${results.length > 5 ? `
            <div style="padding: 0.5rem 1rem; text-align: center; color: #666; font-size: 0.9rem; border-bottom: 1px solid #eee;">
                +${results.length - 5} more results...
            </div>
        ` : ''}
    `;
}

/**
 * Render individual result types
 * Extracted from index.html line 6572
 */
function renderUserResult(user) {
    const currentUser = window.currentUser;
    const safeFirstName = escapeHTML(user.firstName);
    const safeLastName = escapeHTML(user.lastName);
    const safeUsername = escapeHTML(user.username);
    const safeState = escapeHTML(user.state);
    const safeDistrict = escapeHTML(user.district);
    const safeInitial = escapeHTML((user.firstName?.[0] || user.username[0]).toUpperCase());
    const safeDisplayName = user.firstName ? `${safeFirstName} ${safeLastName || ''}` : safeUsername;

    return `
        <div class="search-result-item search-result-hover" data-search-result-action="openUserProfile" data-user-id="${escapeHTML(user.id)}" data-username="${safeUsername}" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
            <div class="user-avatar user-card-trigger" data-search-result-action="showUserCard" data-user-id="${escapeHTML(user.id)}" data-username="${safeUsername}"
                 style="margin-right: 1rem; width: 40px; height: 40px; border-radius: 50%; background: #4b5c09; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer;"
                 title="Click to view profile card">
                ${safeInitial}
            </div>
            <div style="flex: 1;">
                <div class="user-card-trigger" data-search-result-action="showUserCard" data-user-id="${escapeHTML(user.id)}" data-username="${safeUsername}"
                     style="font-weight: bold; font-size: 1rem; cursor: pointer;"
                     title="Click to view profile card">
                    ${safeDisplayName}
                </div>
                <div style="color: #666; font-size: 0.9rem;">@${safeUsername}</div>
                <div style="color: #666; font-size: 0.8rem;">${user.followersCount || 0} followers${user.state ? ` • ${safeState}` : ''}${user.district ? ` • District ${safeDistrict}` : ''}</div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;" data-search-result-action="stopPropagation">
                ${user.verified ? '<span style="color: #1d9bf0; margin-right: 0.5rem;">✓</span>' : ''}
                ${user.id !== currentUser?.id ? `
                    <button data-search-result-action="toggleFollow" data-user-id="${escapeHTML(user.id)}" data-is-following="${user.isFollowing || false}"
                        style="padding: 0.25rem 0.5rem; background: ${user.isFollowing ? '#666' : '#4b5c09'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-right: 0.25rem;">
                        ${user.isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button data-search-result-action="sendFriendRequest" data-user-id="${escapeHTML(user.id)}"
                        style="padding: 0.25rem 0.5rem; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-right: 0.25rem;">
                        Add Friend
                    </button>
                    <button data-search-result-action="startConversation" data-user-id="${escapeHTML(user.id)}" data-username="${safeUsername}"
                        style="padding: 0.25rem 0.5rem; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                        Message
                    </button>
                ` : '<span style="color: #666; font-size: 0.8rem;">You</span>'}
            </div>
        </div>
    `;
}

function renderPostResult(post) {
    const timeAgo = window.getTimeAgo ? window.getTimeAgo(new Date(post.createdAt)) : new Date(post.createdAt).toLocaleDateString();
    const safeAuthorFirstName = escapeHTML(post.author?.firstName);
    const safeAuthorLastName = escapeHTML(post.author?.lastName);
    const safeAuthorUsername = escapeHTML(post.author?.username || 'unknown');
    const safeContent = escapeHTML(post.content);
    const safeAuthorInitial = escapeHTML((post.author?.firstName?.[0] || post.author?.username?.[0] || 'U').toUpperCase());
    const safeAuthorDisplayName = post.author?.firstName ? `${safeAuthorFirstName} ${safeAuthorLastName || ''}` : (safeAuthorUsername !== 'unknown' ? safeAuthorUsername : 'Unknown User');
    const safeContentPreview = safeContent.length > 150 ? safeContent.substring(0, 150) + '...' : safeContent;
    const safeTopics = post.topics ? escapeHTML(post.topics.slice(0, 2).join(', ')) : '';

    return `
        <div class="search-result-item search-result-hover" data-search-result-action="showPost" data-post-id="${escapeHTML(post.id)}" style="padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
            <div style="display: flex; align-items: start; gap: 0.75rem;">
                <div class="user-avatar" style="width: 32px; height: 32px; border-radius: 50%; background: #4b5c09; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                    ${safeAuthorInitial}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 0.9rem; margin-bottom: 0.25rem;">
                        ${safeAuthorDisplayName}
                        <span style="color: #666; font-weight: normal;">@${safeAuthorUsername} • ${timeAgo}</span>
                    </div>
                    <div style="color: #333; line-height: 1.4; margin-bottom: 0.5rem;">
                        ${safeContentPreview}
                    </div>
                    <div style="color: #666; font-size: 0.8rem; display: flex; gap: 1rem;">
                        <span>❤️ ${post.likesCount || 0}</span>
                        <span>💬 ${post.commentsCount || 0}</span>
                        ${post.topics ? `<span>🏷️ ${safeTopics}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderOfficialResult(official) {
    const isCandidate = official.politicalProfileType === 'CANDIDATE';
    const safeName = escapeHTML(official.name);
    const safeFirstName = escapeHTML(official.firstName);
    const safeLastName = escapeHTML(official.lastName);
    const safeUsername = escapeHTML(official.username || '');
    const safeOffice = escapeHTML(official.office || official.officialTitle || official.title || 'Office Unknown');
    const safeParty = escapeHTML(official.party);
    const safeState = escapeHTML(official.state);
    const safeDistrict = escapeHTML(official.district);
    const safeChamber = escapeHTML(official.chamber);
    const safeDisplayName = safeName || (official.firstName ? `${safeFirstName} ${safeLastName || ''}` : safeUsername || 'Unknown');
    const safeLocation = official.state ? safeState : (official.district ? safeDistrict : 'Federal');

    return `
        <div class="search-result-item search-result-hover" data-search-result-action="${isCandidate ? 'openUserProfile' : 'showOfficialDetails'}" data-user-id="${escapeHTML(official.id)}" data-username="${safeUsername}" data-official-id="${escapeHTML(official.id)}" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
            <div style="margin-right: 1rem; width: 40px; height: 40px; border-radius: 50%; background: #1976d2; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                🏛️
            </div>
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 1rem;">${safeDisplayName}</div>
                <div style="color: #666; font-size: 0.9rem;">${safeOffice} ${official.politicalProfileType === 'ELECTED_OFFICIAL' ? '(Incumbent)' : ''}</div>
                <div style="color: #666; font-size: 0.8rem;">
                    ${official.party ? `${safeParty} • ` : ''}${safeLocation}
                    ${official.chamber ? ` • ${safeChamber}` : ''}
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;" data-search-result-action="stopPropagation">
                <button data-search-result-action="viewOfficialProfile" data-official-id="${escapeHTML(official.id)}"
                    style="padding: 0.25rem 0.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    View Profile
                </button>
                ${official.contactInfo ? `
                    <button data-search-result-action="contactOfficial" data-official-id="${escapeHTML(official.id)}"
                        style="padding: 0.25rem 0.5rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                        Contact
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function renderCandidateResult(candidate) {
    const safeFirstName = escapeHTML(candidate.firstName);
    const safeLastName = escapeHTML(candidate.lastName);
    const safeUsername = escapeHTML(candidate.username);
    const safeOffice = escapeHTML(candidate.office || candidate.officialTitle || 'Office Unknown');
    const safeState = escapeHTML(candidate.state || 'Location Unknown');
    const safeCandidateStatus = escapeHTML(candidate.candidateStatus);
    const safeDisplayName = candidate.firstName ? `${safeFirstName} ${safeLastName || ''}` : safeUsername;

    return `
        <div class="search-result-item search-result-hover" data-search-result-action="openCandidateProfile" data-candidate-id="${escapeHTML(candidate.id)}" data-username="${safeUsername}" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
            <div style="margin-right: 1rem; width: 40px; height: 40px; border-radius: 50%; background: #4b5c09; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                🗳️
            </div>
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 1rem;">${safeDisplayName}</div>
                <div style="color: #666; font-size: 0.9rem;">${safeOffice} Candidate</div>
                <div style="color: #666; font-size: 0.8rem;">
                    ${safeState}
                    ${candidate.candidateStatus ? ` • ${safeCandidateStatus}` : ''}
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;" data-search-result-action="stopPropagation">
                <button data-search-result-action="viewCandidateProfile" data-candidate-id="${escapeHTML(candidate.id)}" data-username="${safeUsername}"
                    style="padding: 0.25rem 0.5rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    View Profile
                </button>
                ${candidate.isExternallySourced ? `
                    <span style="padding: 0.25rem 0.5rem; background: #17a2b8; color: white; border-radius: 4px; font-size: 0.7rem;">
                        External
                    </span>
                ` : ''}
            </div>
        </div>
    `;
}

function renderTopicResult(topic) {
    const safeName = escapeHTML(topic.name);
    const safeDescription = escapeHTML(topic.description || 'Political discussion topic');

    return `
        <div class="search-result-item search-result-hover" data-search-result-action="enterTopic" data-topic-id="${escapeHTML(topic.id)}" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
            <div style="margin-right: 1rem; width: 40px; height: 40px; border-radius: 50%; background: #ff9800; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                🏷️
            </div>
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 1rem;">${safeName}</div>
                <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.25rem;">
                    ${safeDescription}
                </div>
                <div style="color: #666; font-size: 0.8rem; display: flex; gap: 1rem;">
                    <span>📝 ${topic.postCount || 0} posts</span>
                    <span>👥 ${topic.participantCount || 0} participants</span>
                    ${topic.trending ? '<span style="color: #ff9800;">🔥 Trending</span>' : ''}
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;" data-search-result-action="stopPropagation">
                <button data-search-result-action="viewTopic" data-topic-id="${escapeHTML(topic.id)}"
                    style="padding: 0.25rem 0.5rem; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    View Topic
                </button>
            </div>
        </div>
    `;
}

/**
 * Search result action functions
 */
export async function openUserProfile(userId, username) {
    try {
        closeSearch();

        // Show loading state
        const mainContent = document.getElementById('mainContent');
        const safeUsername = escapeHTML(username);
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h2>Loading @${safeUsername}'s Profile</h2>
                    <p>Loading profile and posts...</p>
                </div>
            `;
        }

        // Load user's profile using the MyProfile component
        if (window.Profile) {
            await window.Profile.showUserProfile(userId);
        } else {
            // Fallback to basic profile view
            await openUserFeed(userId, username);
        }

    } catch (error) {
        console.error('Failed to open user profile:', error);
        if (window.showToast) {
            window.showToast('Failed to load user profile');
        }
    }
}

export async function showPostInFeed(postId) {
    try {
        closeSearch();
        
        // Load single post and display in My Feed
        const response = await apiClient.call(`/posts/${postId}`);
        if (response.ok && response.data) {
            // Show the post in main content
            if (typeof window.showMyFeedInMain === 'function') {
                window.showMyFeedInMain();
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
            
            if (window.showToast) {
                window.showToast('Post found in feed');
            }
        } else {
            if (window.showToast) {
                window.showToast('Post not found or not accessible');
            }
        }
        
    } catch (error) {
        console.error('Failed to show post:', error);
        if (window.showToast) {
            window.showToast('Failed to load post');
        }
    }
}

export async function showOfficialDetails(officialId) {
    try {
        closeSearch();
        
        // Load official information in main content
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h2>Loading Official Information</h2>
                    <p>Loading details...</p>
                </div>
            `;
        }

        const response = await apiClient.call(`/legislative/officials/${officialId}`);
        if (response.ok && response.data) {
            const official = response.data;
            displayOfficialProfile(official);
        } else {
            if (mainContent) {
                mainContent.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #d32f2f;">
                        <h2>Official Not Found</h2>
                        <p>Could not load official information</p>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('Failed to load official:', error);
        if (window.showToast) {
            window.showToast('Failed to load official information');
        }
    }
}

function displayOfficialProfile(official) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    const safeName = escapeHTML(official.name);
    const safeOffice = escapeHTML(official.office || official.title);
    const safeParty = escapeHTML(official.party);
    const safeState = escapeHTML(official.state);
    const safeDistrict = escapeHTML(official.district);
    const safeChamber = escapeHTML(official.chamber);
    const safePhone = escapeHTML(official.phone);
    const safeEmail = escapeHTML(official.email);
    const safeWebsite = escapeHTML(official.website);
    const safeAddress = escapeHTML(official.address);
    const safeNextElection = escapeHTML(official.nextElection);
    const safeTermStart = escapeHTML(official.termStart);
    const safeTermEnd = escapeHTML(official.termEnd);
    const safeCommittees = official.committees ? escapeHTML(official.committees.join(', ')) : '';
    const safeLocation = official.state ? safeState : (official.district ? safeDistrict : 'Federal');

    mainContent.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; padding: 2rem;">
            <div style="background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; margin-bottom: 2rem;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: #1976d2; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-right: 1.5rem;">
                        🏛️
                    </div>
                    <div>
                        <h1 style="margin: 0; font-size: 2rem; color: #333;">${safeName}</h1>
                        <h2 style="margin: 0.5rem 0; font-size: 1.3rem; color: #666; font-weight: normal;">${safeOffice}</h2>
                        <div style="color: #666; font-size: 1rem;">
                            ${official.party ? `${safeParty} • ` : ''}${safeLocation}
                            ${official.chamber ? ` • ${safeChamber}` : ''}
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <div>
                        <h3 style="color: #4b5c09; border-bottom: 2px solid #4b5c09; padding-bottom: 0.5rem;">Contact Information</h3>
                        ${official.phone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ''}
                        ${official.email ? `<p><strong>Email:</strong> ${safeEmail}</p>` : ''}
                        ${official.website && isValidURL(official.website) ? `<p><strong>Website:</strong> <a href="${safeWebsite}" target="_blank" rel="noopener noreferrer">${safeWebsite}</a></p>` : ''}
                        ${official.address ? `<p><strong>Address:</strong> ${safeAddress}</p>` : ''}
                    </div>
                    <div>
                        <h3 style="color: #4b5c09; border-bottom: 2px solid #4b5c09; padding-bottom: 0.5rem;">Political Information</h3>
                        ${official.nextElection ? `<p><strong>Next Election:</strong> ${safeNextElection}</p>` : ''}
                        ${official.termStart ? `<p><strong>Term Start:</strong> ${safeTermStart}</p>` : ''}
                        ${official.termEnd ? `<p><strong>Term End:</strong> ${safeTermEnd}</p>` : ''}
                        ${official.committees ? `<p><strong>Committees:</strong> ${safeCommittees}</p>` : ''}
                    </div>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: center;">
                    ${official.contactInfo ? `
                        <button data-search-result-action="contactOfficial" data-official-id="${escapeHTML(official.id)}" style="padding: 0.75rem 1.5rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">
                            Contact ${safeName}
                        </button>
                    ` : ''}
                    <button data-search-result-action="viewVotingRecords" data-bioguide-id="${escapeHTML(official.bioguideId || official.id)}" style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">
                        View Voting Records
                    </button>
                    <button data-search-result-action="viewOfficialNews" data-official-name="${safeName}" style="padding: 0.75rem 1.5rem; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;">
                        Recent News
                    </button>
                </div>
            </div>
        </div>
    `;
}

export async function enterTopicMode(topicId) {
    try {
        closeSearch();
        
        // Use existing topic navigation system if available
        if (window.TopicNavigation && typeof window.TopicNavigation.enterTopic === 'function') {
            await window.TopicNavigation.enterTopic(topicId);
            if (window.showToast) {
                window.showToast('Viewing topic discussions');
            }
        } else {
            // Fallback to basic topic view
            if (typeof window.showMyFeedInMain === 'function') {
                window.showMyFeedInMain();
            }
            if (window.showToast) {
                window.showToast('Topic mode activated - showing related posts');
            }
        }
        
    } catch (error) {
        console.error('Failed to enter topic mode:', error);
        if (window.showToast) {
            window.showToast('Failed to load topic');
        }
    }
}

// Placeholder functions for official actions
function contactOfficial(officialId) {
    if (window.showToast) {
        window.showToast('Contact feature coming soon!');
    }
}

function viewOfficialProfile(officialId) {
    showOfficialDetails(officialId);
}

function viewVotingRecords(bioguideId) {
    if (window.LegislativeIntegration) {
        window.LegislativeIntegration.showVotingRecords(bioguideId);
    } else if (window.showToast) {
        window.showToast('Voting records feature coming soon!');
    }
}

function viewOfficialNews(officialName) {
    if (window.LegislativeIntegration) {
        window.LegislativeIntegration.showOfficialNews(officialName);
    } else if (window.showToast) {
        window.showToast('Official news feature coming soon!');
    }
}

// Legacy function for compatibility
async function openUserFeed(userId, username) {
    try {
        closeSearch();

        // Show loading state
        const feedElement = document.getElementById('postsFeed');
        const safeUsername = escapeHTML(username);
        if (feedElement) {
            feedElement.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h2>Loading @${safeUsername}'s Profile</h2>
                    <p>Loading profile and posts...</p>
                </div>
            `;
        }

        // Load user's profile and posts in parallel
        const [profileResponse, postsResponse] = await Promise.all([
            apiClient.call(`/users/${userId}`),
            apiClient.call(`/posts/user/${userId}`)
        ]);

        if (profileResponse.ok && postsResponse.ok) {
            const userProfile = profileResponse.data.user;
            const posts = postsResponse.data.posts || [];

            // Display basic profile information
            const safeFirstName = escapeHTML(userProfile.firstName);
            const safeLastName = escapeHTML(userProfile.lastName);
            const safeProfileUsername = escapeHTML(userProfile.username);
            const safeBio = escapeHTML(userProfile.bio);
            const safeDisplayName = userProfile.firstName ? `${safeFirstName} ${safeLastName || ''}` : safeProfileUsername;

            if (feedElement) {
                feedElement.innerHTML = `
                    <div style="background: linear-gradient(135deg, #4b5c09 0%, #6b7f1a 100%); color: white; padding: 2rem; margin-bottom: 1rem; border-radius: 8px;">
                        <h1>${safeDisplayName}</h1>
                        <p>@${safeProfileUsername}</p>
                        <p>${userProfile.followersCount || 0} followers • ${userProfile.followingCount || 0} following</p>
                        ${userProfile.bio ? `<p>${safeBio}</p>` : ''}
                    </div>
                    <div id="userPostsList"></div>
                `;

                // Display posts if available
                if (posts.length > 0 && typeof window.displayPosts === 'function') {
                    window.displayPosts(posts, 'userPostsList');
                }
            }
        }

    } catch (error) {
        console.error('Failed to load user profile:', error);
        if (window.showToast) {
            window.showToast('Failed to load user profile');
        }
    }
}

// Setup search input event listener when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupSearchInput();
        setupEventDelegation();
    });
} else {
    setupSearchInput();
    setupEventDelegation();
}

/**
 * Setup event delegation for search results
 */
function setupEventDelegation() {
    // Add hover styles for search results
    if (!document.getElementById('search-result-hover-styles')) {
        const style = document.createElement('style');
        style.id = 'search-result-hover-styles';
        style.textContent = `.search-result-hover:hover { background-color: #f9f9f9 !important; }`;
        document.head.appendChild(style);
    }

    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-search-result-action]');
        if (!target) return;

        const action = target.dataset.searchResultAction;
        const userId = target.dataset.userId;
        const username = target.dataset.username;
        const postId = target.dataset.postId;
        const officialId = target.dataset.officialId;
        const candidateId = target.dataset.candidateId;
        const topicId = target.dataset.topicId;
        const bioguideId = target.dataset.bioguideId;
        const officialName = target.dataset.officialName;

        switch (action) {
            case 'openUserProfile':
                openUserProfile(userId, username);
                break;
            case 'showUserCard':
                e.stopPropagation();
                showUserCardFromSearch(e, userId, { context: 'search', username });
                break;
            case 'toggleFollow':
                e.stopPropagation();
                if (window.FollowUtils) {
                    window.FollowUtils.toggleFollow(userId, target.dataset.isFollowing === 'true');
                }
                break;
            case 'sendFriendRequest':
                e.stopPropagation();
                if (window.FriendUtils) {
                    window.FriendUtils.sendFriendRequest(userId);
                }
                break;
            case 'startConversation':
                e.stopPropagation();
                if (typeof startConversationWithUser === 'function') {
                    startConversationWithUser(userId, username);
                }
                break;
            case 'showPost':
                showPostInFeed(postId);
                break;
            case 'showOfficialDetails':
                showOfficialDetails(officialId);
                break;
            case 'viewOfficialProfile':
                e.stopPropagation();
                viewOfficialProfile(officialId);
                break;
            case 'contactOfficial':
                e.stopPropagation();
                contactOfficial(officialId);
                break;
            case 'openCandidateProfile':
                openUserProfile(candidateId, username);
                break;
            case 'viewCandidateProfile':
                e.stopPropagation();
                openUserProfile(candidateId, username);
                break;
            case 'enterTopic':
                enterTopicMode(topicId);
                break;
            case 'viewTopic':
                e.stopPropagation();
                enterTopicMode(topicId);
                break;
            case 'viewVotingRecords':
                e.stopPropagation();
                viewVotingRecords(bioguideId);
                break;
            case 'viewOfficialNews':
                e.stopPropagation();
                viewOfficialNews(officialName);
                break;
            case 'stopPropagation':
                e.stopPropagation();
                break;
        }
    });
}

function setupSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', async function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                await performGlobalSearch(this.value);
            }
        });
        
        searchInput.addEventListener('input', async function(e) {
            await performGlobalSearch(this.value);
        });
    }
}

/**
 * Show user card from search results
 * @param {Event} event - Click event
 * @param {string} userId - User ID to show
 * @param {Object} context - Additional context
 */
async function showUserCardFromSearch(event, userId, context = {}) {
    if (!userId) {
        console.warn('Global Search: No user ID provided for user card');
        return;
    }

    try {
        // Ensure UserCard component is loaded
        if (typeof window.UserCard === 'undefined') {
            console.warn('Global Search: UserCard component not loaded');
            return;
        }

        // Create UserCard instance if it doesn't exist
        if (!window.userCard) {
            window.userCard = new window.UserCard();
        }

        // Show the user card anchored to the clicked element
        await window.userCard.showCard(event.target.closest('.user-card-trigger'), userId, context);

    } catch (error) {
        console.error('Global Search: Error showing user card:', error);
    }
}

// Maintain backward compatibility by exposing functions globally
if (typeof window !== 'undefined') {
    window.openSearch = openSearch;
    window.closeSearch = closeSearch;
    window.toggleAdvancedFilters = toggleAdvancedFilters;
    window.performGlobalSearch = performGlobalSearch;
    window.updateSearchResults = updateSearchResults;
    window.openUserProfile = openUserProfile;
    window.showPostInFeed = showPostInFeed;
    window.showOfficialDetails = showOfficialDetails;
    window.enterTopicMode = enterTopicMode;
    window.contactOfficial = contactOfficial;
    window.viewOfficialProfile = viewOfficialProfile;
    window.viewVotingRecords = viewVotingRecords;
    window.viewOfficialNews = viewOfficialNews;
    window.showUserCardFromSearch = showUserCardFromSearch;
}

export default {
    openSearch,
    closeSearch,
    toggleAdvancedFilters,
    performGlobalSearch,
    updateSearchResults,
    openUserProfile,
    showPostInFeed,
    showOfficialDetails,
    enterTopicMode
};