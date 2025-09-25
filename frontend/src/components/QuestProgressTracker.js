/**
 * Quest Progress Tracker Component
 * Displays daily quests, progress tracking, and streak information
 * Integrates with existing quest API endpoints
 */

class QuestProgressTracker {
    constructor() {
        this.userQuests = [];
        this.userStreaks = {};
        this.isLoading = false;
        this.lastRefresh = null;
        this.refreshInterval = null;

        // Initialize on load
        this.init();
    }

    async init() {
        // Auto-load quest data on component initialization
        await this.loadQuestData();

        // Set up periodic refresh (every 5 minutes)
        this.refreshInterval = setInterval(() => {
            this.loadQuestData();
        }, 5 * 60 * 1000);

        // Listen for activity events to update progress
        this.setupActivityListeners();
    }

    /**
     * Load all quest data from API
     */
    async loadQuestData() {
        if (this.isLoading) return;

        this.isLoading = true;

        try {
            // Load data in parallel for better performance
            const [questsResponse, streaksResponse] = await Promise.all([
                window.apiCall('/quests/daily'),
                window.apiCall('/quests/streaks')
            ]);

            if (questsResponse.ok && questsResponse.data.success) {
                this.userQuests = questsResponse.data.data || [];
            }

            if (streaksResponse.ok && streaksResponse.data.success) {
                this.userStreaks = streaksResponse.data.data || {};
            }

            this.lastRefresh = new Date();
            this.render();

        } catch (error) {
            console.error('Failed to load quest data:', error);
            this.renderError('Failed to load quest progress');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Set up listeners for user activities that might affect quest progress
     */
    setupActivityListeners() {
        // Listen for custom events that indicate quest-relevant activities
        document.addEventListener('userActivity', (event) => {
            const { type, data } = event.detail;

            // Delay refresh to allow backend processing
            setTimeout(() => {
                this.loadQuestData();
            }, 1000);
        });

        // Listen for quest completion events
        document.addEventListener('questCompleted', (event) => {
            const { questId, rewards } = event.detail;
            this.handleQuestCompletion(questId, rewards);
        });
    }

    /**
     * Handle quest completion with visual feedback
     */
    handleQuestCompletion(questId, rewards) {
        // Find and update the completed quest
        const quest = this.userQuests.find(q => q.id === questId);
        if (quest) {
            quest.isCompleted = true;
            quest.progress.percentage = 100;

            // Show completion animation
            this.showQuestCompletionAnimation(quest, rewards);

            // Refresh data after animation
            setTimeout(() => {
                this.loadQuestData();
            }, 2000);
        }
    }

    /**
     * Show quest completion celebration
     */
    showQuestCompletionAnimation(quest, rewards) {
        // Create celebration modal
        const modal = document.createElement('div');
        modal.className = 'quest-completion-modal modal-overlay';

        modal.innerHTML = `
            <div class="modal quest-completion">
                <div class="completion-celebration">
                    <div class="celebration-icon">🎉</div>
                    <h2>Quest Completed!</h2>
                    <div class="completed-quest-info">
                        <h3>${quest.title}</h3>
                        <p>${quest.description}</p>
                    </div>
                    <div class="quest-rewards">
                        <h4>Rewards Earned:</h4>
                        <div class="rewards-list">
                            ${rewards.reputationPoints ? `<div class="reward"><span class="reward-icon">⭐</span> +${rewards.reputationPoints} Reputation</div>` : ''}
                            ${rewards.badgeIds ? `<div class="reward"><span class="reward-icon">🏆</span> New Badge Earned!</div>` : ''}
                            ${rewards.specialRecognition ? `<div class="reward"><span class="reward-icon">🎖️</span> ${rewards.specialRecognition}</div>` : ''}
                        </div>
                    </div>
                    <button class="continue-btn" onclick="this.closest('.modal-overlay').remove()">
                        Continue Your Journey
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);

        // Add celebration confetti effect
        this.triggerConfettiEffect();
    }

    /**
     * Simple confetti effect for quest completion
     */
    triggerConfettiEffect() {
        // Create confetti elements
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: hsl(${Math.random() * 360}, 70%, 60%);
                left: ${Math.random() * 100}vw;
                top: -10px;
                z-index: 10000;
                pointer-events: none;
                animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
            `;

            document.body.appendChild(confetti);

            // Remove after animation
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.remove();
                }
            }, 5000);
        }
    }

    /**
     * Render the quest dashboard
     */
    render() {
        const container = document.getElementById('quest-progress-container');
        if (!container) return;

        if (this.isLoading && this.userQuests.length === 0) {
            container.innerHTML = `
                <div class="quest-dashboard loading">
                    <div class="loading-spinner"></div>
                    <p>Loading your civic challenges...</p>
                </div>
            `;
            return;
        }

        const completedToday = this.userQuests.filter(q => q.isCompleted).length;
        const totalToday = this.userQuests.length;
        const dailyProgress = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

        // Get current streak info
        const currentStreak = Math.max(...Object.values(this.userStreaks).map(s => s.currentStreak || 0));

        container.innerHTML = `
            <div class="quest-dashboard">
                <div class="quest-header">
                    <div class="header-content">
                        <h3>
                            <span class="quest-icon">🎯</span>
                            Today's Civic Challenges
                        </h3>
                        <div class="quest-meta">
                            ${currentStreak > 0 ? `
                                <div class="streak-indicator" title="Current quest completion streak">
                                    <span class="streak-icon">🔥</span>
                                    <span class="streak-count">${currentStreak}</span>
                                    <span class="streak-label">day streak</span>
                                </div>
                            ` : ''}
                            <div class="refresh-info" title="Last updated: ${this.lastRefresh?.toLocaleTimeString()}">
                                <span class="refresh-icon">🔄</span>
                            </div>
                        </div>
                    </div>

                    <div class="progress-summary">
                        <div class="daily-progress">
                            <div class="progress-stats">
                                <span class="progress-text">Daily Progress: <strong>${completedToday}/${totalToday}</strong></span>
                                <span class="progress-percentage">${Math.round(dailyProgress)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${dailyProgress}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="quest-list">
                    ${this.renderQuests()}
                </div>

                ${this.renderFooter()}
            </div>
        `;

        // Add event listeners for quest actions
        this.attachQuestEventListeners();
    }

    /**
     * Render individual quests
     */
    renderQuests() {
        if (this.userQuests.length === 0) {
            return `
                <div class="no-quests">
                    <div class="no-quests-icon">🌅</div>
                    <h4>Ready for Today's Challenges?</h4>
                    <p>Check back soon for your personalized civic engagement quests!</p>
                </div>
            `;
        }

        return this.userQuests.map(quest => {
            const progress = quest.progress || { current: 0, required: 1, percentage: 0 };
            const isCompleted = quest.isCompleted || progress.percentage >= 100;

            return `
                <div class="quest-card ${isCompleted ? 'completed' : ''}" data-quest-id="${quest.id}">
                    <div class="quest-icon-badge">
                        ${this.getQuestIcon(quest.questType)}
                    </div>

                    <div class="quest-content">
                        <div class="quest-header-info">
                            <h4 class="quest-title">${quest.title}</h4>
                            <div class="quest-difficulty ${quest.difficulty?.toLowerCase() || 'beginner'}">
                                ${quest.difficulty || 'BEGINNER'}
                            </div>
                        </div>

                        <p class="quest-description">${quest.description}</p>

                        <div class="quest-progress-section">
                            <div class="quest-progress-info">
                                <span class="progress-current">${progress.current}</span>
                                <span class="progress-separator">/</span>
                                <span class="progress-required">${progress.required}</span>
                                <span class="progress-label">${this.getProgressLabel(quest.questType)}</span>
                            </div>

                            <div class="mini-progress-bar">
                                <div class="mini-progress-fill" style="width: ${progress.percentage}%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="quest-rewards">
                        ${quest.rewards?.reputationPoints ? `
                            <div class="reward-item reputation">
                                <span class="reward-icon">⭐</span>
                                <span class="reward-amount">+${quest.rewards.reputationPoints}</span>
                            </div>
                        ` : ''}

                        ${quest.rewards?.badgeIds?.length ? `
                            <div class="reward-item badge">
                                <span class="reward-icon">🏆</span>
                                <span class="reward-label">Badge</span>
                            </div>
                        ` : ''}

                        ${isCompleted ? `
                            <div class="completion-badge">
                                <span class="completion-icon">✅</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Get appropriate icon for quest type
     */
    getQuestIcon(questType) {
        const icons = {
            'LOGIN': '🚪',
            'READ_POSTS': '📖',
            'CIVIC_ACTION': '🏛️',
            'SOCIAL_INTERACTION': '💬',
            'COMPLETE_QUESTS': '🎯'
        };
        return icons[questType] || '📋';
    }

    /**
     * Get progress label for quest type
     */
    getProgressLabel(questType) {
        const labels = {
            'LOGIN': 'logins',
            'READ_POSTS': 'posts read',
            'CIVIC_ACTION': 'actions',
            'SOCIAL_INTERACTION': 'interactions',
            'COMPLETE_QUESTS': 'quests'
        };
        return labels[questType] || 'progress';
    }

    /**
     * Render dashboard footer
     */
    renderFooter() {
        return `
            <div class="quest-footer">
                <div class="footer-stats">
                    <div class="stat-item">
                        <span class="stat-icon">🎯</span>
                        <span class="stat-label">Active Quests</span>
                        <span class="stat-value">${this.userQuests.filter(q => !q.isCompleted).length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">✅</span>
                        <span class="stat-label">Completed Today</span>
                        <span class="stat-value">${this.userQuests.filter(q => q.isCompleted).length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">🔥</span>
                        <span class="stat-label">Best Streak</span>
                        <span class="stat-value">${Math.max(...Object.values(this.userStreaks).map(s => s.longestStreak || 0))}</span>
                    </div>
                </div>

                <div class="footer-actions">
                    <button class="refresh-quests-btn" onclick="questProgressTracker.loadQuestData()">
                        <span class="btn-icon">🔄</span>
                        Refresh Progress
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners for quest interactions
     */
    attachQuestEventListeners() {
        // Add click handlers for quest cards (for future expansion)
        document.querySelectorAll('.quest-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.refresh-quests-btn')) return;

                const questId = card.dataset.questId;
                // Future: Show detailed quest view
                console.log('Quest clicked:', questId);
            });
        });
    }

    /**
     * Render error state
     */
    renderError(message) {
        const container = document.getElementById('quest-progress-container');
        if (!container) return;

        container.innerHTML = `
            <div class="quest-dashboard error">
                <div class="error-content">
                    <div class="error-icon">⚠️</div>
                    <h4>Unable to Load Quests</h4>
                    <p>${message}</p>
                    <button class="retry-btn" onclick="questProgressTracker.loadQuestData()">
                        Try Again
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Cleanup when component is destroyed
     */
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        document.removeEventListener('userActivity', this.handleUserActivity);
        document.removeEventListener('questCompleted', this.handleQuestCompletion);
    }
}

// Initialize and export
const questProgressTracker = new QuestProgressTracker();
window.questProgressTracker = questProgressTracker;

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestProgressTracker;
}