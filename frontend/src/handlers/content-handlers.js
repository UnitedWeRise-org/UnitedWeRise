/**
 * Content Handlers Module - Phase 6 of ES6 Modularization
 * Extracted from index.html lines 1153-3055
 * Handles core content loading and display functionality
 *
 * Functions Extracted:
 * - loadMOTD() & displayMOTD() [lines 1778-1816]
 * - loadTrendingPosts() & updateTrendingTopicsPanel() [lines 1901-1950]
 * - loadElectedOfficials() & updateOfficialsPanel() [lines 1205-1350]
 * - loadConversations() & displayConversations() [lines 3006-3055]
 * - loadUserContent() [lines 1153-1204]
 */

import { getApiBaseUrl } from '../utils/environment.js';

export class ContentHandlers {
    constructor() {
        this.currentMOTDData = null;
        this.dismissalToken = null;
        this.setupGlobalVariables();
        this.setupEventListeners();
    }

    /**
     * Setup event delegation for trending and content actions
     */
    setupEventListeners() {
        document.addEventListener('click', this.handleContentClick.bind(this));
    }

    /**
     * Handle click events for trending and content actions
     */
    handleContentClick(event) {
        const target = event.target.closest('[data-trending-action], [data-content-action]');
        if (!target) return;

        event.preventDefault();
        event.stopPropagation();

        const action = target.dataset.trendingAction || target.dataset.contentAction;
        const topicId = target.dataset.topicId;
        const postId = target.dataset.postId;

        switch (action) {
            case 'enter-topic-mode':
                if (typeof window.enterTopicMode === 'function' && topicId) {
                    window.enterTopicMode(topicId);
                }
                break;
            case 'exit-topic-mode':
                if (typeof window.exitTopicMode === 'function') {
                    window.exitTopicMode();
                }
                break;
            case 'like-trending-post':
                if (typeof window.likeTrendingPost === 'function' && postId) {
                    window.likeTrendingPost(postId);
                }
                break;
            case 'show-trending-comment-box':
                if (typeof window.showTrendingCommentBox === 'function' && postId) {
                    window.showTrendingCommentBox(postId);
                }
                break;
            case 'add-trending-comment':
                if (typeof window.addTrendingComment === 'function' && postId) {
                    window.addTrendingComment(postId);
                }
                break;
            case 'hide-trending-comment-box':
                if (typeof window.hideTrendingCommentBox === 'function' && postId) {
                    window.hideTrendingCommentBox(postId);
                }
                break;
            case 'view-comments':
                if (typeof window.viewComments === 'function' && postId) {
                    window.viewComments(postId);
                }
                break;
            case 'load-trending-updates':
                event.preventDefault();
                if (typeof window.loadTrendingUpdates === 'function') {
                    window.loadTrendingUpdates();
                }
                break;
            case 'like-post':
                if (typeof window.likePost === 'function' && postId) {
                    window.likePost(postId);
                }
                break;
            case 'toggle-comments':
                if (typeof window.toggleComments === 'function' && postId) {
                    window.toggleComments(postId);
                }
                break;
            case 'load-trending-posts-show-main-feed':
                if (typeof window.loadTrendingPosts === 'function' && typeof window.showMainFeed === 'function') {
                    window.loadTrendingPosts();
                    window.showMainFeed();
                }
                break;
        }
    }

    /**
     * Setup global variables for backward compatibility
     */
    setupGlobalVariables() {
        // Make variables globally accessible for legacy code
        if (typeof window !== 'undefined') {
            window.currentMOTDData = null;
            window.dismissalToken = null;
        }
    }

    /**
     * Load Message of the Day
     * Extracted from index.html line 1778
     */
    async loadMOTD() {
        try {
            // Get dismissal token for anonymous users
            this.dismissalToken = localStorage.getItem('motd-dismissal-token') || this.generateDismissalToken();

            const headers = {};
            headers['X-Dismissal-Token'] = this.dismissalToken;

            // Use environment-aware API base URL (imported from environment.js)
            const API_BASE = getApiBaseUrl().replace('/api', '');
            const response = await fetch(`${API_BASE}/motd/current`, {
                credentials: 'include', // Include cookies for authentication
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.motd) {
                    this.currentMOTDData = data.data.motd;
                    this.dismissalToken = data.data.dismissalToken;
                    window.currentMOTDData = this.currentMOTDData; // Global sync

                    // Store dismissal token for future use
                    localStorage.setItem('motd-dismissal-token', this.dismissalToken);

                    // Check if this MOTD was already dismissed locally
                    const dismissedMOTDs = JSON.parse(localStorage.getItem('dismissed-motds') || '[]');
                    if (!dismissedMOTDs.includes(this.currentMOTDData.id)) {
                        this.displayMOTD(this.currentMOTDData);
                    }
                }
            } else if (response.status === 404) {
                // MOTD endpoint not configured - silently skip (not an error)
                return;
            }
        } catch (error) {
            // Only log non-404 errors
            if (error.message && !error.message.includes('404')) {
                console.error('Failed to load MOTD:', error);
            }
        }
    }

    /**
     * Generate dismissal token for anonymous users
     * Extracted from index.html line 1812
     */
    generateDismissalToken() {
        return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Display Message of the Day
     * Extracted from index.html line 1816
     */
    displayMOTD(motd) {
        const panel = document.getElementById('motd-panel');
        const title = document.getElementById('motd-title');
        const body = document.getElementById('motd-body');

        if (!panel || !title || !body) return;

        if (motd.title) {
            title.textContent = motd.title;
            title.style.display = 'block';
        } else {
            title.style.display = 'none';
        }

        body.innerHTML = motd.content;
        panel.style.display = 'block';

        // Ensure dismiss button functionality
        const dismissBtn = document.getElementById('motd-dismiss');
        if (dismissBtn) {
            dismissBtn.onclick = () => this.dismissMOTD(motd.id);
        }
    }

    /**
     * Dismiss MOTD (helper function)
     */
    dismissMOTD(motdId) {
        const dismissedMOTDs = JSON.parse(localStorage.getItem('dismissed-motds') || '[]');
        if (!dismissedMOTDs.includes(motdId)) {
            dismissedMOTDs.push(motdId);
            localStorage.setItem('dismissed-motds', JSON.stringify(dismissedMOTDs));
        }

        const panel = document.getElementById('motd-panel');
        if (panel) panel.style.display = 'none';
    }

    /**
     * Load trending posts and topics
     * Extracted from index.html line 1901
     */
    async loadTrendingPosts() {
        try {
            // Try AI topic discovery first, fallback to posts if needed
            let response;
            try {
                response = await window.apiCall('/topic-navigation/trending?limit=20');
                if (response.ok && response.data.topics && response.data.topics.length > 0) {
                    this.updateTrendingTopicsPanel(response.data.topics);
                    return;
                }
            } catch (topicError) {
                console.log('AI topics unavailable for sidebar, falling back to posts:', topicError.message);
            }

            // Fallback to post-based trending for sidebar
            response = await window.apiCall('/feed/trending');

            if (response.ok) {
                this.updateTrendingPanel(response.data.posts);
            } else {
                console.error('Failed to load trending content:', response.data?.error);
            }
        } catch (error) {
            console.error('Failed to load trending content:', error);
        }
    }

    /**
     * Update trending topics panel with AI topics
     * Extracted from index.html line 1929
     */
    updateTrendingTopicsPanel(topics) {
        const content = document.getElementById('trendingContent');

        if (!content) return;

        if (topics.length === 0) {
            content.innerHTML = '<p>No trending topics available.</p>';
            return;
        }

        let html = '<div class="trending-topics-list">';

        topics.forEach((topic, index) => {
            const isFeature = index === 0;
            const timeAgo = this.getTimeAgo(new Date(topic.createdAt || Date.now()));

            html += `
                <div class="trending-topic-card" style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; cursor: pointer; transition: all 0.2s;" data-topic-enter="${topic.id}" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='none'">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <span style="font-size: 1.2rem;">${isFeature ? '🔥' : '🏷️'}</span>
                        <div style="font-weight: bold; font-size: 1rem; flex: 1; color: #333;">${topic.title}</div>
                        <span style="font-size: 0.8rem; color: #666;">${timeAgo}</span>
                    </div>
                    <div style="color: #666; font-size: 0.9rem; line-height: 1.4; margin-bottom: 0.75rem;">${topic.description || 'Trending discussion topic'}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #999;">
                        <span>${topic.postCount || 0} posts</span>
                        <span style="color: #4b5c09; font-weight: 500;">View Discussion →</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        content.innerHTML = html;

        // Add event delegation for topic clicks
        content.addEventListener('click', (event) => {
            const topicCard = event.target.closest('[data-topic-enter]');
            if (topicCard) {
                const topicId = topicCard.getAttribute('data-topic-enter');
                if (window.enterTopicMode) {
                    window.enterTopicMode(topicId);
                }
            }
        });
    }

    /**
     * Update trending panel with posts (fallback)
     * Extracted from fallback logic in loadTrendingPosts
     */
    updateTrendingPanel(posts) {
        const content = document.getElementById('trendingContent');
        if (!content || !posts) return;

        if (posts.length === 0) {
            content.innerHTML = '<p>No trending posts available.</p>';
            return;
        }

        let html = '<div class="trending-posts-list">';
        posts.slice(0, 5).forEach(post => {
            const timeAgo = this.getTimeAgo(new Date(post.createdAt));
            html += `
                <div class="trending-post" style="padding: 0.75rem; border-bottom: 1px solid #eee; cursor: pointer;" data-post-id="${post.id}">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">${post.author?.firstName} ${post.author?.lastName}</div>
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</div>
                    <div style="font-size: 0.8rem; color: #999;">${timeAgo} • ${post.likeCount || 0} likes</div>
                </div>
            `;
        });
        html += '</div>';
        content.innerHTML = html;
    }

    /**
     * Load user-specific content
     * Extracted from index.html line 1153
     */
    async loadUserContent() {
        // Load user's elected officials if they have an address
        try {
            const response = await window.apiCall('/users/profile');

            if (response.ok) {
                const data = response.data;

                // Update currentUser with complete profile data
                if (data.user && window.currentUser) {
                    // Debug: Check what's in the profile data
                    console.log('🔍 Profile data before merge:', data.user);
                    console.log('🔍 currentUser before merge:', window.currentUser);

                    // Only merge non-null values to avoid overwriting good data with undefined
                    const mergedUser = { ...window.currentUser };
                    for (const [key, value] of Object.entries(data.user)) {
                        if (value !== null && value !== undefined) {
                            mergedUser[key] = value;
                        }
                    }
                    window.currentUser = mergedUser;
                    console.log('User profile data merged into currentUser:', window.currentUser);

                    // Re-update the greeting if it got cleared
                    const displayName = window.currentUser.firstName || window.currentUser.username || 'User';
                    const greetingElement = document.getElementById('userGreeting');
                    if (greetingElement) {
                        greetingElement.textContent = `Hello, ${displayName}!`;
                        console.log('🔧 Re-set greeting after profile merge to:', greetingElement.textContent);
                    }

                    // Update radio button availability now that we have address data
                    if (window.updateRadioButtonAvailability) {
                        window.updateRadioButtonAvailability();
                    }

                    // Load representatives if we have address
                    if (data.user.zipCode && data.user.state) {
                        this.loadElectedOfficials(data.user.zipCode, data.user.state);
                    }

                    // Update map location if we have address
                    if (window.mapInstance && window.currentUser.state && window.getCurrentUserLocation) {
                        window.getCurrentUserLocation();
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load user content:', error);
        }
    }

    /**
     * Load elected officials
     * Extracted from index.html line 1205
     */
    async loadElectedOfficials(zipCode, state) {
        try {
            const response = await window.apiCall('/political/representatives');

            if (response.ok && response.data) {
                const representatives = response.data.representatives;
                this.updateOfficialsPanel(representatives);

                // Extract district information for boundary loading
                console.log('Representatives data received:', representatives);

                if (representatives && representatives.federal) {
                    console.log('Federal representatives:', representatives.federal);

                    const districtRep = representatives.federal.find(rep =>
                        rep.office && rep.office.includes('Representative')
                    );

                    console.log('Found district rep:', districtRep);

                    if (districtRep && window.currentUser) {
                        let districtNumber = null;
                        let stateAbbr = null;

                        // First try to use the district field directly
                        if (districtRep.district) {
                            console.log('District field found:', districtRep.district);

                            // District field might be like "IL-10" or just "10"
                            const districtMatch = districtRep.district.match(/(?:(\w{2})-)?(\d+)/);
                            if (districtMatch) {
                                stateAbbr = districtMatch[1] || window.currentUser.state;
                                districtNumber = districtMatch[2];
                            }
                        }

                        // Store district info in currentUser
                        if (districtNumber && stateAbbr) {
                            window.currentUser.district = districtNumber;
                            window.currentUser.state = stateAbbr;

                            console.log(`District info extracted: ${window.currentUser.state}-${window.currentUser.district}`);

                            // Load boundary if currently at local zoom
                            if (window.currentZoomLevel === 'local' && window.boundaryManager && window.currentLocation) {
                                console.log('Loading district boundary...');
                                window.boundaryManager.loadBoundary('district', window.currentUser.district, window.currentUser.state);
                            }
                        }
                    }
                }
            } else {
                console.log('No representatives data available yet - may need address in profile');
            }
        } catch (error) {
            console.error('Failed to load representatives:', error);
        }
    }

    /**
     * Update officials panel display
     * Extracted from index.html line 1288
     */
    updateOfficialsPanel(representatives) {
        const content = document.getElementById('officialsContent');
        if (!content) return;

        // Check if representatives object has any data
        const totalReps = (representatives.federal || []).length +
                        (representatives.state || []).length +
                        (representatives.local || []).length;

        if (totalReps === 0) {
            content.innerHTML = '<p>No representatives found. Please add your complete address in your profile.</p>';
            return;
        }

        let html = '<div>';

        // Federal representatives
        if (representatives.federal && representatives.federal.length > 0) {
            html += '<h4>Federal Representatives</h4>';
            representatives.federal.forEach(rep => {
                html += `
                    <div style="margin-bottom: 1rem; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.5rem;">
                            <img src="${rep.photoUrl || '/images/default-official.png'}" alt="${rep.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <div style="font-weight: bold; color: #2c3e50;">${rep.name}</div>
                                <div style="color: #666; font-size: 0.9rem;">${rep.office || 'Federal Representative'}</div>
                                <div style="color: #666; font-size: 0.8rem;">${rep.party || ''}</div>
                            </div>
                        </div>
                        ${rep.phones && rep.phones.length > 0 ? `<div style="font-size: 0.9rem; color: #666;">📞 ${rep.phones[0]}</div>` : ''}
                        ${rep.urls && rep.urls.length > 0 ? `<div style="font-size: 0.9rem;"><a href="${rep.urls[0]}" target="_blank" style="color: #4b5c09;">Official Website</a></div>` : ''}
                    </div>
                `;
            });
        }

        // State representatives
        if (representatives.state && representatives.state.length > 0) {
            html += '<h4>State Representatives</h4>';
            representatives.state.forEach(rep => {
                html += `
                    <div style="margin-bottom: 1rem; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
                        <div style="font-weight: bold; color: #2c3e50;">${rep.name}</div>
                        <div style="color: #666; font-size: 0.9rem;">${rep.office || 'State Representative'}</div>
                        <div style="color: #666; font-size: 0.8rem;">${rep.party || ''}</div>
                        ${rep.phones && rep.phones.length > 0 ? `<div style="font-size: 0.9rem; color: #666;">📞 ${rep.phones[0]}</div>` : ''}
                    </div>
                `;
            });
        }

        // Local representatives
        if (representatives.local && representatives.local.length > 0) {
            html += '<h4>Local Representatives</h4>';
            representatives.local.forEach(rep => {
                html += `
                    <div style="margin-bottom: 1rem; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
                        <div style="font-weight: bold; color: #2c3e50;">${rep.name}</div>
                        <div style="color: #666; font-size: 0.9rem;">${rep.office || 'Local Representative'}</div>
                        <div style="color: #666; font-size: 0.8rem;">${rep.party || ''}</div>
                    </div>
                `;
            });
        }

        html += '</div>';
        content.innerHTML = html;
    }

    /**
     * Load conversations
     * Extracted from index.html line 3006
     */
    async loadConversations() {
        if (!window.currentUser) return;

        try {
            const response = await window.apiCall('/messages/conversations');

            if (response.ok) {
                this.displayConversations(response.data.conversations);
            } else {
                const messagesBody = document.getElementById('messagesBody');
                if (messagesBody) {
                    messagesBody.innerHTML = '<p style="text-align: center; padding: 1rem; color: #666;">Failed to load conversations</p>';
                }
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            const messagesBody = document.getElementById('messagesBody');
            if (messagesBody) {
                messagesBody.innerHTML = '<p style="text-align: center; padding: 1rem; color: #666;">Error loading conversations</p>';
            }
        }
    }

    /**
     * Display conversations
     * Extracted from index.html line 3023
     */
    async displayConversations(conversations) {
        const body = document.getElementById('messagesBody');
        if (!body) return;

        if (!window.currentUser) {
            body.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <p>Please log in to view messages</p>
                    <button data-auth-modal="login" style="padding: 0.5rem 1rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Log In
                    </button>
                </div>
            `;
            return;
        }

        let html = `
            <div style="padding: 1vh; border-bottom: 1px solid #eee; background: #f9f9f9; min-height: 2vh;">
                <button data-conversation-action="new" style="width: 100%; padding: 0.5vh; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin-bottom: 0.5vh;">
                    + New Conversation
                </button>
                <button data-conversation-action="friends" style="width: 100%; padding: 0.5vh; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                    👥 Message Friends
                </button>
            </div>
        `;

        if (conversations.length === 0) {
            html += `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <p>No conversations yet</p>
                    <p style="font-size: 0.9rem;">Start your first conversation with a friend!</p>
                </div>
            `;
        } else {
            conversations.forEach(conversation => {
                const lastMessage = conversation.lastMessage;
                const timeAgo = lastMessage ? this.getTimeAgo(new Date(lastMessage.createdAt)) : '';

                html += `
                    <div class="conversation-item" data-conversation-id="${conversation.id}" style="padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.backgroundColor='white'">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <div style="font-weight: 500; color: #333;">${conversation.otherParticipant?.firstName} ${conversation.otherParticipant?.lastName}</div>
                            <div style="font-size: 0.8rem; color: #999;">${timeAgo}</div>
                        </div>
                        ${lastMessage ? `<div style="color: #666; font-size: 0.9rem;">${lastMessage.content.substring(0, 50)}${lastMessage.content.length > 50 ? '...' : ''}</div>` : '<div style="color: #999; font-style: italic;">No messages yet</div>'}
                        ${conversation.unreadCount ? `<div style="background: #4b5c09; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; margin-top: 0.5rem;">${conversation.unreadCount}</div>` : ''}
                    </div>
                `;
            });
        }

        body.innerHTML = html;

        // Add event delegation for conversation actions
        body.addEventListener('click', (event) => {
            const target = event.target;

            // Handle conversation item clicks
            const conversationItem = target.closest('[data-conversation-id]');
            if (conversationItem) {
                const conversationId = conversationItem.getAttribute('data-conversation-id');
                if (window.openConversation) {
                    window.openConversation(conversationId);
                }
                return;
            }

            // Handle conversation action buttons
            const actionButton = target.closest('[data-conversation-action]');
            if (actionButton) {
                const action = actionButton.getAttribute('data-conversation-action');
                if (action === 'new' && window.showNewConversationForm) {
                    window.showNewConversationForm();
                } else if (action === 'friends' && window.showFriendsList) {
                    window.showFriendsList();
                }
                return;
            }

            // Handle auth modal buttons
            const authButton = target.closest('[data-auth-modal]');
            if (authButton) {
                const mode = authButton.getAttribute('data-auth-modal');
                if (window.openAuthModal) {
                    window.openAuthModal(mode);
                }
            }
        });
    }

    /**
     * Helper function to get time ago string
     */
    getTimeAgo(date) {
        if (!date) return '';

        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
    }
}

// Create global instance
const contentHandlers = new ContentHandlers();

// Export functions for backward compatibility
export const loadMOTD = () => contentHandlers.loadMOTD();
export const displayMOTD = (motd) => contentHandlers.displayMOTD(motd);
export const loadTrendingPosts = () => contentHandlers.loadTrendingPosts();
export const updateTrendingTopicsPanel = (topics) => contentHandlers.updateTrendingTopicsPanel(topics);
export const loadUserContent = () => contentHandlers.loadUserContent();
export const loadElectedOfficials = (zipCode, state) => contentHandlers.loadElectedOfficials(zipCode, state);
export const updateOfficialsPanel = (representatives) => contentHandlers.updateOfficialsPanel(representatives);
export const loadConversations = () => contentHandlers.loadConversations();
export const displayConversations = (conversations) => contentHandlers.displayConversations(conversations);

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.loadMOTD = loadMOTD;
    window.displayMOTD = displayMOTD;
    window.loadTrendingPosts = loadTrendingPosts;
    window.updateTrendingTopicsPanel = updateTrendingTopicsPanel;
    window.loadUserContent = loadUserContent;
    window.loadElectedOfficials = loadElectedOfficials;
    window.updateOfficialsPanel = updateOfficialsPanel;
    window.loadConversations = loadConversations;
    window.displayConversations = displayConversations;
    window.contentHandlers = contentHandlers;
}

console.log('✅ Content handlers module loaded (MOTD, Trending, Officials, Conversations)');