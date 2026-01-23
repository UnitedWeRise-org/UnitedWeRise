/**
 * Messages Handlers Module - Phase 4D-2 Migration
 * Extracted from index.html script block
 * Handles messaging, conversations, and friend messaging system
 *
 * Functions Migrated:
 * - loadConversations() [line 1849] - Load user conversations
 * - displayConversations() [line 1866] - Display conversation list
 * - showNewConversationForm() [line 1919] - Show new conversation UI
 * - startConversationWithUser() [line 1946] - Start new conversation
 * - openConversation() [line 1965] - Open specific conversation
 * - showConversationView() [line 1981] - Display conversation messages
 * - backToConversations() [line 2040] - Return to conversation list
 * - handleMessageKeyPress() [line 2044] - Handle enter key in message input
 * - sendMessage() [line 2051] - Send message in conversation
 * - openMessageWith() [line 4493] - Open message with friend
 * - displayFriendsForMessaging() [line 4427] - Show friends list for messaging
 */

import { getApiBaseUrl } from '../utils/environment.js';
import { apiCall } from '../js/api-compatibility-shim.js';

export class MessagesHandlers {
    constructor() {
        /** @type {string|null} Current conversation username for message refresh */
        this.currentConversationUsername = null;
        this.setupEventListeners();
    }

    /**
     * Setup event delegation for message actions
     */
    setupEventListeners() {
        document.addEventListener('click', this.handleMessageClick.bind(this));
        document.addEventListener('keypress', this.handleKeyPress.bind(this));

        // Listen for openMessage custom event (from UserCard Message button)
        window.addEventListener('openMessage', (event) => {
            const userId = event.detail?.userId;
            if (userId) {
                this.openMessageWith(userId);
            }
        });
    }

    /**
     * Handle click events for message actions
     */
    handleMessageClick(event) {
        const target = event.target.closest('[data-messaging-action]');
        if (!target) return;

        event.preventDefault();
        event.stopPropagation();

        const action = target.dataset.messagingAction;
        const conversationId = target.dataset.conversationId;
        const userId = target.dataset.userId;
        const username = target.dataset.username;

        switch (action) {
            case 'send-message':
                if (conversationId) {
                    this.sendMessage(conversationId);
                }
                break;
            case 'start-conversation':
                if (userId && username) {
                    this.startConversationWithUser(userId, username);
                }
                break;
            case 'back-to-conversations':
                this.backToConversations();
                break;
            case 'show-new-conversation':
                this.showNewConversationForm();
                break;
            case 'open-auth-modal':
                const mode = target.dataset.mode || 'login';
                if (typeof openAuthModal === 'function') {
                    openAuthModal(mode);
                }
                break;
            case 'show-friends-list':
                if (typeof showFriendsList === 'function') {
                    showFriendsList();
                }
                break;
            case 'open-conversation':
                if (conversationId && username) {
                    this.openConversation(conversationId, username);
                }
                break;
            case 'focus-search':
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.focus();
                if (typeof openSearch === 'function') {
                    openSearch();
                }
                break;
            case 'open-message-with':
                if (userId) {
                    this.openMessageWith(userId);
                }
                break;
            case 'focus-search-back':
                const searchInputBack = document.getElementById('searchInput');
                if (searchInputBack) searchInputBack.focus();
                this.backToConversations();
                break;
        }
    }

    /**
     * Handle keypress events for message inputs
     */
    handleKeyPress(event) {
        const target = event.target.closest('[data-messaging-action="handle-message-keypress"]');
        if (!target) return;

        const conversationId = target.dataset.conversationId;
        if (conversationId) {
            this.handleMessageKeyPress(event, conversationId);
        }
    }

    /**
     * Load conversations for current user
     * Migrated from index.html line 1849
     */
    async loadConversations() {
        if (!window.currentUser) return;

        try {
            const response = await apiCall('/messages/conversations');

            if (response.ok) {
                this.displayConversations(response.data.conversations);
            } else {
                document.getElementById('messagesBody').innerHTML = '<p style="text-align: center; padding: 1rem; color: #666;">Failed to load conversations</p>';
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            document.getElementById('messagesBody').innerHTML = '<p style="text-align: center; padding: 1rem; color: #666;">Error loading conversations</p>';
        }
    }

    /**
     * Display conversations list
     * Migrated from index.html line 1866
     */
    async displayConversations(conversations) {
        const body = document.getElementById('messagesBody');

        if (!window.currentUser) {
            body.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <p>Please log in to view messages</p>
                    <button data-messaging-action="open-auth-modal" data-mode="login" style="padding: 0.5rem 1rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Log In
                    </button>
                </div>
            `;
            return;
        }

        let html = `
            <div style="padding: 1vh; border-bottom: 1px solid #eee; background: #f9f9f9; min-height: 2vh;">
                <button data-messaging-action="show-new-conversation" style="width: 100%; padding: 0.5vh; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin-bottom: 0.5vh;">
                    + New Conversation
                </button>
                <button data-messaging-action="show-friends-list" style="width: 100%; padding: 0.5vh; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
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
            conversations.forEach(conv => {
                const participant = conv.participants[0];
                const timeAgo = conv.lastMessageAt ? this.getTimeAgo(new Date(conv.lastMessageAt)) : '';

                html += `
                    <div class="conversation-item" data-messaging-action="open-conversation" data-conversation-id="${conv.id}" data-username="${participant.username}">
                        <div class="user-avatar">${(participant.firstName?.[0] || participant.username[0]).toUpperCase()}</div>
                        <div class="conversation-info">
                            <div class="conversation-name">${participant.firstName || participant.username}</div>
                            <div class="conversation-preview">${conv.lastMessageContent || 'No messages yet'} ${timeAgo ? '• ' + timeAgo : ''}</div>
                        </div>
                    </div>
                `;
            });
        }

        body.innerHTML = html;
    }

    /**
     * Show new conversation form
     * Migrated from index.html line 1919
     */
    showNewConversationForm() {
        const body = document.getElementById('messagesBody');

        body.innerHTML = `
            <div style="display: flex; align-items: center; padding: 1vh; border-bottom: 1px solid #eee; background: #f9f9f9; min-height: 2vh;">
                <button data-messaging-action="back-to-conversations" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-right: 0.5rem;">←</button>
                <span style="font-weight: bold;">New Conversation</span>
            </div>

            <div style="padding: 1rem; text-align: center;">
                <div style="color: #666; margin-bottom: 1rem;">
                    <p>To start a new conversation, use the search bar at the top of the page to find users.</p>
                    <p style="font-size: 0.9rem;">Search results will include options to message, follow, and add as friend.</p>
                </div>
                <button data-messaging-action="focus-search" style="padding: 0.5rem 1rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Open Search
                </button>
            </div>
        `;

        // Focus on search input
        setTimeout(() => {
            document.getElementById('userSearchInput')?.focus();
        }, 100);
    }

    /**
     * Start conversation with user
     * Migrated from index.html line 1946
     */
    async startConversationWithUser(userId, username) {
        try {
            const response = await apiCall('/messages/conversations', {
                method: 'POST',
                body: JSON.stringify({ participantId: userId })
            });

            if (response.ok) {
                // Open the conversation
                this.openConversation(response.data.conversation.id, username);
            } else {
                alert('Failed to start conversation');
            }
        } catch (error) {
            console.error('Failed to start conversation:', error);
            alert('Error starting conversation');
        }
    }

    /**
     * Open conversation
     * Migrated from index.html line 1965
     */
    async openConversation(conversationId, username) {
        try {
            // Load messages for this conversation
            const response = await apiCall(`/messages/conversations/${conversationId}/messages`);

            if (response.ok) {
                this.showConversationView(conversationId, username, response.data.messages);
            } else {
                alert('Failed to load conversation');
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
            alert('Error loading conversation');
        }
    }

    /**
     * Show conversation view with messages
     * Migrated from index.html line 1981
     */
    showConversationView(conversationId, username, messages) {
        const body = document.getElementById('messagesBody');
        const displayName = username || 'User';
        this.currentConversationUsername = displayName;  // Store for message refresh
        const avatarLetter = displayName[0]?.toUpperCase() || '?';

        body.innerHTML = `
            <div style="display: flex; align-items: center; padding: 1vh; border-bottom: 1px solid #eee; background: #f9f9f9; min-height: 2vh;">
                <button data-messaging-action="back-to-conversations" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-right: 0.5rem;">←</button>
                <div class="user-avatar" style="margin-right: 0.5rem;">${avatarLetter}</div>
                <span style="font-weight: bold;">${displayName}</span>
            </div>

            <div id="messagesArea" style="height: 250px; overflow-y: auto; padding: 0.5rem; background: white;">
                ${messages.length === 0 ?
                    '<div style="text-align: center; padding: 2rem; color: #666;">No messages yet. Start the conversation!</div>' :
                    messages.map(msg => `
                        <div style="margin-bottom: 0.75rem; ${msg.sender.id === window.currentUser?.id ? 'text-align: right;' : ''}">
                            <div style="display: inline-block; max-width: 80%; padding: 0.5rem 0.75rem; border-radius: 12px; ${
                                msg.sender.id === window.currentUser?.id ?
                                'background: #4b5c09; color: white;' :
                                'background: #f0f0f0; color: black;'
                            }">
                                <div style="font-size: 0.9rem;">${msg.content}</div>
                                <div style="font-size: 0.7rem; margin-top: 0.25rem; opacity: 0.8;">
                                    ${msg.sender.id === window.currentUser?.id ? '' : msg.sender.username + ' • '}${new Date(msg.createdAt).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    `).join('')
                }
            </div>

            <div style="display: flex; padding: 1vh; border-top: 1px solid #eee; background: #f9f9f9; min-height: 2vh;">
                <input
                    type="text"
                    id="messageInput-${conversationId}"
                    placeholder="Type a message..."
                    style="flex: 1; padding: 0.5vh; border: 1px solid #ddd; border-radius: 20px; margin-right: 0.5rem; outline: none;"
                    data-messaging-action="handle-message-keypress" data-conversation-id="${conversationId}"
                >
                <button
                    data-messaging-action="send-message" data-conversation-id="${conversationId}"
                    style="background: #4b5c09; color: white; border: none; padding: 0.5vh 1rem; border-radius: 20px; cursor: pointer; font-size: 0.9rem;"
                >
                    Send
                </button>
            </div>
        `;

        // Scroll to bottom of messages
        setTimeout(() => {
            const messagesArea = document.getElementById('messagesArea');
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }, 100);

        // Focus on input
        setTimeout(() => {
            document.getElementById(`messageInput-${conversationId}`)?.focus();
        }, 100);
    }

    /**
     * Back to conversations list
     * Migrated from index.html line 2040
     */
    backToConversations() {
        this.loadConversations();
    }

    /**
     * Handle message keypress (Enter to send)
     * Migrated from index.html line 2044
     */
    handleMessageKeyPress(event, conversationId) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage(conversationId);
        }
    }

    /**
     * Send message in conversation
     * Migrated from index.html line 2051
     */
    async sendMessage(conversationId) {
        const input = document.getElementById(`messageInput-${conversationId}`);
        const content = input.value.trim();

        if (!content) return;

        try {
            const response = await apiCall(`/messages/conversations/${conversationId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                input.value = '';
                // Refresh the conversation to show the new message using stored username
                if (this.currentConversationUsername) {
                    this.openConversation(conversationId, this.currentConversationUsername);
                }
            } else {
                alert('Failed to send message');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Error sending message');
        }
    }

    /**
     * Display friends for messaging
     * Migrated from index.html line 4427
     */
    displayFriendsForMessaging(friends) {
        const container = document.getElementById('friendsListContainer');

        if (friends.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                    <h3>No Friends Yet</h3>
                    <p>Add friends to start messaging them!</p>
                    <button data-messaging-action="focus-search-back" style="padding: 0.5rem 1rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;">
                        Find Friends
                    </button>
                </div>
            `;
            return;
        }

        // Sort friends by activity (most recent first)
        const sortedFriends = friends.sort((a, b) => {
            const userA = a.user1Id === window.currentUser?.id ? a.user2 : a.user1;
            const userB = b.user1Id === window.currentUser?.id ? b.user2 : b.user1;

            const lastActiveA = userA.lastActiveAt ? new Date(userA.lastActiveAt) : new Date(0);
            const lastActiveB = userB.lastActiveAt ? new Date(userB.lastActiveAt) : new Date(0);

            return lastActiveB - lastActiveA;
        });

        let html = '<div class="friends-list">';

        sortedFriends.forEach(friend => {
            const user = friend.user1Id === window.currentUser?.id ? friend.user2 : friend.user1;
            const onlineStatus = this.createOnlineStatusIndicator(user.lastActiveAt, 'small');

            html += `
                <div class="friend-item" data-messaging-action="open-message-with" data-user-id="${user.id}" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s;">
                    <div class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%; background: #4b5c09; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; margin-right: 1rem; position: relative;">
                        ${(user.firstName?.[0] || user.username[0]).toUpperCase()}
                        ${user.lastActiveAt && (new Date() - new Date(user.lastActiveAt)) < 300000 ?
                            '<div style="position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; background: #4caf50; border-radius: 50%; border: 2px solid white;"></div>' :
                            ''}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 0.25rem;">
                            ${user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username}
                        </div>
                        <div style="color: #666; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>@${user.username}</span>
                            ${onlineStatus}
                        </div>
                    </div>
                    <div style="color: #4b5c09; font-size: 1.2rem;">💬</div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Open message with user (friend messaging)
     * Migrated from index.html line 4493
     */
    async openMessageWith(userId) {
        try {
            console.log('Opening message with friend:', userId);

            // Get user info first to have their username
            const response = await apiCall(`/users/${userId}`);
            if (!response.ok || !response.data?.user?.username) {
                if (typeof showToast === 'function') {
                    showToast('Failed to load user information');
                }
                return;
            }

            const username = response.data.user.username;

            // Check if they're actually friends first
            if (window.FriendUtils && typeof window.FriendUtils.getFriendStatus === 'function') {
                const friendStatus = await window.FriendUtils.getFriendStatus(userId);
                if (!friendStatus.isFriend) {
                    showToast('You can only message friends. Send a friend request first!');
                    return;
                }
            }

            // Open the messages container if not already open
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer && (messagesContainer.style.display === 'none' || !messagesContainer.style.display)) {
                messagesContainer.style.display = 'block';
            }

            // Start conversation with the friend
            await this.startConversationWithUser(userId, username);

            console.log(`✅ Opened conversation with friend: ${username}`);

        } catch (error) {
            console.error('Failed to open message with friend:', error);
            if (typeof showToast === 'function') {
                showToast('Failed to open conversation');
            }
        }
    }

    /**
     * Create online status indicator
     * Migrated from index.html line 4386
     */
    createOnlineStatusIndicator(lastActiveAt, size = 'small') {
        if (!lastActiveAt) return '';

        const now = new Date();
        const lastActive = new Date(lastActiveAt);
        const minutesAgo = Math.floor((now - lastActive) / (1000 * 60));

        let status, color, text;

        if (minutesAgo < 5) {
            status = 'online';
            color = '#4caf50';
            text = 'Online';
        } else if (minutesAgo < 30) {
            status = 'recent';
            color = '#ff9800';
            text = `${minutesAgo}m ago`;
        } else if (minutesAgo < 1440) { // Less than 24 hours
            const hoursAgo = Math.floor(minutesAgo / 60);
            status = 'away';
            color = '#666';
            text = `${hoursAgo}h ago`;
        } else {
            const daysAgo = Math.floor(minutesAgo / 1440);
            status = 'offline';
            color = '#ccc';
            text = `${daysAgo}d ago`;
        }

        const dotSize = size === 'small' ? '8px' : size === 'medium' ? '10px' : '12px';
        const fontSize = size === 'small' ? '0.7rem' : size === 'medium' ? '0.8rem' : '0.9rem';

        return `
            <span class="online-status online-status-${status}" style="display: inline-flex; align-items: center; font-size: ${fontSize}; color: ${color};">
                <span style="width: ${dotSize}; height: ${dotSize}; background: ${color}; border-radius: 50%; margin-right: 0.25rem; display: inline-block;"></span>
                ${text}
            </span>
        `;
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
const messagesHandlers = new MessagesHandlers();

// Export functions for backward compatibility
export const loadConversations = () => messagesHandlers.loadConversations();
export const displayConversations = (conversations) => messagesHandlers.displayConversations(conversations);
export const showNewConversationForm = () => messagesHandlers.showNewConversationForm();
export const startConversationWithUser = (userId, username) => messagesHandlers.startConversationWithUser(userId, username);
export const openConversation = (conversationId, username) => messagesHandlers.openConversation(conversationId, username);
export const showConversationView = (conversationId, username, messages) => messagesHandlers.showConversationView(conversationId, username, messages);
export const backToConversations = () => messagesHandlers.backToConversations();
export const handleMessageKeyPress = (event, conversationId) => messagesHandlers.handleMessageKeyPress(event, conversationId);
export const sendMessage = (conversationId) => messagesHandlers.sendMessage(conversationId);
export const displayFriendsForMessaging = (friends) => messagesHandlers.displayFriendsForMessaging(friends);
export const openMessageWith = (userId) => messagesHandlers.openMessageWith(userId);
export const createOnlineStatusIndicator = (lastActiveAt, size) => messagesHandlers.createOnlineStatusIndicator(lastActiveAt, size);

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.loadConversations = loadConversations;
    window.displayConversations = displayConversations;
    window.showNewConversationForm = showNewConversationForm;
    window.startConversationWithUser = startConversationWithUser;
    window.openConversation = openConversation;
    window.showConversationView = showConversationView;
    window.backToConversations = backToConversations;
    window.handleMessageKeyPress = handleMessageKeyPress;
    window.sendMessage = sendMessage;
    window.displayFriendsForMessaging = displayFriendsForMessaging;
    window.openMessageWith = openMessageWith;
    window.createOnlineStatusIndicator = createOnlineStatusIndicator;
    window.messagesHandlers = messagesHandlers;
}

console.log('✅ Messages handlers module loaded (Conversations, Friends Messaging, Online Status)');