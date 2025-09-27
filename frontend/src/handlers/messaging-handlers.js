/**
 * Messaging System Handlers
 * Manages conversations, message display, and messaging UI
 *
 * Functions to be migrated:
 * - showNewConversationForm
 * - showConversationView
 * - backToConversations
 * - handleMessageKeyPress
 * - displayFriendsForMessaging
 */

// Import dependencies
import { apiClient } from '../modules/core/api/client.js';

console.log('📱 Loading messaging handlers...');

/**
 * MessagingHandlers class for event delegation
 */
class MessagingHandlers {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keypress event delegation for message inputs
        document.addEventListener('keypress', (e) => {
            const target = e.target.closest('[data-messaging-action="handle-message-keypress"]');
            if (!target) return;

            const conversationId = target.dataset.conversationId;
            if (conversationId) {
                handleMessageKeyPress(e, conversationId);
            }
        });

        // Click event delegation for messaging actions
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-messaging-action]');
            if (!target) return;

            e.preventDefault();
            const action = target.dataset.messagingAction;
            const conversationId = target.dataset.conversationId;

            switch (action) {
                case 'send-message':
                    if (conversationId && typeof window.sendMessage === 'function') {
                        window.sendMessage(conversationId);
                    }
                    break;
            }
        });

        console.log('🎯 Messaging event delegation initialized');
    }
}

// Initialize messaging handlers
const messagingHandlers = new MessagingHandlers();

/**
 * Open a conversation and load its messages
 * Migrated from index.html line 2365
 */
async function openConversation(conversationId, username) {
    try {
        // Load messages for this conversation
        const response = await window.apiCall(`/messages/conversations/${conversationId}/messages`);

        if (response.ok) {
            showConversationView(conversationId, username, response.data.messages);
        } else {
            alert('Failed to load conversation');
        }
    } catch (error) {
        console.error('Failed to load conversation:', error);
        alert('Error loading conversation');
    }
}

/**
 * Send a message in a conversation
 * Migrated from index.html line 2451
 */
async function sendMessage(conversationId) {
    const input = document.getElementById(`messageInput-${conversationId}`);
    const content = input.value.trim();

    if (!content) return;

    try {
        const response = await window.apiCall(`/messages/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            input.value = '';
            // Refresh the conversation to show the new message
            const username = document.querySelector('#messagesBody span[style*="font-weight: bold"]')?.textContent;
            if (username) {
                openConversation(conversationId, username);
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
 * Show form to start new conversation
 * Displays UI to initiate new conversation with search guidance
 */
function showNewConversationForm() {
    const body = document.getElementById('messagesBody');

    body.innerHTML = `
        <div style="display: flex; align-items: center; padding: 1vh; border-bottom: 1px solid #eee; background: #f9f9f9; min-height: 2vh;">
            <button onclick="backToConversations()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-right: 0.5rem;">←</button>
            <span style="font-weight: bold;">New Conversation</span>
        </div>

        <div style="padding: 1rem; text-align: center;">
            <div style="color: #666; margin-bottom: 1rem;">
                <p>To start a new conversation, use the search bar at the top of the page to find users.</p>
                <p style="font-size: 0.9rem;">Search results will include options to message, follow, and add as friend.</p>
            </div>
            <button onclick="document.getElementById('searchInput').focus(); openSearch();" style="padding: 0.5rem 1rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer;">
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
 * Display conversation thread with messages
 * Shows conversation header, message history, and input area
 * @param {string} conversationId - ID of the conversation
 * @param {string} username - Username of the other participant
 * @param {Array} messages - Array of message objects
 */
function showConversationView(conversationId, username, messages) {
    const body = document.getElementById('messagesBody');

    body.innerHTML = `
        <div style="display: flex; align-items: center; padding: 1vh; border-bottom: 1px solid #eee; background: #f9f9f9; min-height: 2vh;">
            <button onclick="backToConversations()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-right: 0.5rem;">←</button>
            <div class="user-avatar" style="margin-right: 0.5rem;">${username[0].toUpperCase()}</div>
            <span style="font-weight: bold;">${username}</span>
        </div>

        <div id="messagesArea" style="height: 250px; overflow-y: auto; padding: 0.5rem; background: white;">
            ${messages.length === 0 ?
                '<div style="text-align: center; padding: 2rem; color: #666;">No messages yet. Start the conversation!</div>' :
                messages.map(msg => `
                    <div style="margin-bottom: 0.75rem; ${msg.sender.id === currentUser?.id ? 'text-align: right;' : ''}">
                        <div style="display: inline-block; max-width: 80%; padding: 0.5rem 0.75rem; border-radius: 12px; ${
                            msg.sender.id === currentUser?.id ?
                            'background: #4b5c09; color: white;' :
                            'background: #f0f0f0; color: black;'
                        }">
                            <div style="font-size: 0.9rem;">${msg.content}</div>
                            <div style="font-size: 0.7rem; margin-top: 0.25rem; opacity: 0.8;">
                                ${msg.sender.id === currentUser?.id ? '' : msg.sender.username + ' • '}${new Date(msg.createdAt).toLocaleTimeString()}
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
                onkeypress="handleMessageKeyPress(event, '${conversationId}')"
            >
            <button
                onclick="sendMessage('${conversationId}')"
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
 * Navigate back to conversation list
 * Loads the main conversations view
 */
function backToConversations() {
    loadConversations();
}

/**
 * Handle Enter key press in message input
 * Sends message when Enter is pressed (without Shift)
 * @param {Event} event - Keyboard event
 * @param {string} conversationId - ID of the conversation
 */
function handleMessageKeyPress(event, conversationId) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage(conversationId);
    }
}

// Export for module system
export {
    openConversation,
    sendMessage,
    showNewConversationForm,
    showConversationView,
    backToConversations,
    handleMessageKeyPress
};

// Global exposure for compatibility (temporary during migration)
if (typeof window !== 'undefined') {
    window.openConversation = openConversation;
    window.sendMessage = sendMessage;
    window.showNewConversationForm = showNewConversationForm;
    window.showConversationView = showConversationView;
    window.backToConversations = backToConversations;
    window.handleMessageKeyPress = handleMessageKeyPress;
    console.log('🌐 Messaging handlers available globally');
}

console.log('✅ Messaging handlers loaded');