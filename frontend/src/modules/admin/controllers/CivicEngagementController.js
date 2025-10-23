/**
 * Civic Engagement Controller
 * Handles quest and badge management for the admin dashboard
 */

import { AdminAPI } from '../api/AdminAPI.js';

class CivicEngagementController {
    constructor() {
        this.currentTab = 'quests';
        this.questData = [];
        this.badgeData = [];
    }

    // Standard init() method expected by AdminModuleLoader
    async init() {
        return await this.initializeCivicEngagement();
    }

    async initializeCivicEngagement() {
        try {
            await this.loadEngagementStatistics();
            await this.loadQuests();
            await this.loadBadges();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize civic engagement:', error);
        }
    }

    async loadEngagementStatistics() {
        try {
            // Load quest statistics
            const questResponse = await AdminAPI.get('/api/quests/all');
            const quests = questResponse.data || [];

            // Load badge statistics
            const badgeResponse = await AdminAPI.get('/api/badges/all');
            const badges = badgeResponse.data || [];

            // Load quest analytics
            const analyticsResponse = await AdminAPI.get('/api/quests/analytics');
            const analytics = analyticsResponse.data || {};

            // Update stats cards
            document.getElementById('total-quests').textContent = quests.filter(q => q.isActive).length;
            document.getElementById('total-badges').textContent = badges.filter(b => b.isActive).length;

            // Calculate completion rate
            const avgCompletion = analytics.completionRates ?
                (analytics.completionRates.reduce((acc, cr) => acc + (cr.completed ? cr.count : 0), 0) /
                 analytics.completionRates.reduce((acc, cr) => acc + cr.count, 0) * 100).toFixed(1) : '0';
            document.getElementById('avg-quest-completion').textContent = avgCompletion + '%';

            // Active streaks
            const activeStreaks = analytics.streakStats?._avg?.currentDailyStreak || 0;
            document.getElementById('active-streaks').textContent = Math.round(activeStreaks);

        } catch (error) {
            console.error('Failed to load engagement statistics:', error);
        }
    }

    async loadQuests() {
        try {
            const response = await AdminAPI.get('/api/quests/all');
            this.questData = response.data || [];
            this.renderQuestTable();
        } catch (error) {
            console.error('Failed to load quests:', error);
            document.getElementById('quest-table-body').innerHTML =
                '<tr><td colspan="6" class="text-center">Error loading quests</td></tr>';
        }
    }

    renderQuestTable() {
        const tbody = document.getElementById('quest-table-body');
        if (!tbody) return;

        if (this.questData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No quests found</td></tr>';
            return;
        }

        tbody.innerHTML = this.questData.map(quest => `
            <tr>
                <td>
                    <strong>${quest.title}</strong>
                    <br><small>${quest.shortDescription || quest.description}</small>
                </td>
                <td><span class="badge">${quest.type.replace('_', ' ')}</span></td>
                <td><span class="badge">${quest.timeframe}</span></td>
                <td>${quest._count?.userProgress || 0}</td>
                <td>
                    <span class="status-badge ${quest.isActive ? 'active' : 'inactive'}">
                        ${quest.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button data-action="editQuest" data-quest-id="${quest.id}" class="btn-small">Edit</button>
                    <button data-action="toggleQuestStatus" data-quest-id="${quest.id}" data-active="${!quest.isActive}" class="btn-small">
                        ${quest.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async loadBadges() {
        try {
            const response = await AdminAPI.get('/api/badges/all');
            this.badgeData = response.data || [];
            this.renderBadgeGrid();
        } catch (error) {
            console.error('Failed to load badges:', error);
            document.getElementById('badge-grid').innerHTML =
                '<div class="loading-badge">Error loading badges</div>';
        }
    }

    renderBadgeGrid() {
        const grid = document.getElementById('badge-grid');
        if (!grid) return;

        if (this.badgeData.length === 0) {
            grid.innerHTML = '<div class="loading-badge">No badges found</div>';
            return;
        }

        // Add qualification check button at the top
        const headerHTML = `
            <div class="badge-grid-header" style="grid-column: 1 / -1; margin-bottom: 1rem;">
                <button data-action="runQualificationChecks" class="btn btn-primary">
                    🔄 Run Auto-Award Qualification Checks
                </button>
                <span style="margin-left: 1rem; color: #666;">
                    Check all users against badge criteria and auto-award qualifying badges
                </span>
            </div>
        `;

        grid.innerHTML = headerHTML + this.badgeData.map(badge => `
            <div class="badge-card">
                <img src="${badge.imageUrl}" alt="${badge.name}" class="badge-image" />
                <h4>${badge.name}</h4>
                <p>${badge.description}</p>
                <div class="badge-stats">
                    <small>${badge._count?.userBadges || 0} awarded</small>
                    <br><small>${badge.isAutoAwarded ? '🤖 Auto-awarded' : '👤 Manual only'}</small>
                </div>
                <div class="badge-actions">
                    <button data-action="editBadge" data-badge-id="${badge.id}" class="btn-small">Edit</button>
                    <button data-action="awardBadgeManually" data-badge-id="${badge.id}" data-badge-name="${badge.name}" class="btn-small">Award</button>
                </div>
            </div>
        `).join('');
    }

    switchEngagementTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-action="switchEngagementTab"][data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.engagement-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // Load data if needed
        if (tabName === 'quests' && this.questData.length === 0) {
            this.loadQuests();
        } else if (tabName === 'badges' && this.badgeData.length === 0) {
            this.loadBadges();
        }
    }

    showSubSection(sectionId) {
        try {
            // Hide all subsections first
            document.querySelectorAll('.subsection').forEach(section => {
                section.style.display = 'none';
            });

            // Show the requested subsection
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.style.display = 'block';

                // Update any associated navigation buttons
                document.querySelectorAll('.subsection-nav-button').forEach(btn => {
                    btn.classList.remove('active');
                });

                const navButton = document.querySelector(`[data-action="showSubSection"][data-section="${sectionId}"]`);
                if (navButton) {
                    navButton.classList.add('active');
                }

                // Provide visual feedback
                if (window.AdminGlobalUtils) {
                    window.AdminGlobalUtils.showToast(`Viewing ${sectionId.replace('-', ' ')} section`, 'info');
                }
            } else {
                console.warn(`Subsection with ID '${sectionId}' not found`);
            }
        } catch (error) {
            console.error('Error showing subsection:', error);
            if (window.AdminGlobalUtils) {
                window.AdminGlobalUtils.showToast('Error loading section', 'error');
            }
        }
    }

    showCreateQuestModal() {
        const modal = document.getElementById('quest-modal');
        modal.style.display = 'block';
        this.resetQuestForm();
        this.updateRequirementFields(); // Initialize with default fields
    }

    closeQuestModal() {
        document.getElementById('quest-modal').style.display = 'none';
    }

    resetQuestForm() {
        document.getElementById('quest-form').reset();
        document.getElementById('quest-active').checked = true;
        document.getElementById('limited-time-fields').style.display = 'none';
        this.updateRequirementFields();
    }

    toggleLimitedTimeFields() {
        const timeframe = document.getElementById('quest-timeframe').value;
        const limitedFields = document.getElementById('limited-time-fields');
        limitedFields.style.display = timeframe === 'LIMITED_TIME' ? 'block' : 'none';
    }

    updateRequirementFields() {
        const requirementType = document.getElementById('requirement-type').value;
        const dynamicFields = document.getElementById('dynamic-requirement-fields');

        let fieldsHTML = '';

        switch (requirementType) {
            case 'READ_POSTS':
                fieldsHTML = `
                    <div class="form-group">
                        <label for="post-categories">Post Categories (optional)</label>
                        <input type="text" id="post-categories" placeholder="e.g., civic,news,politics">
                        <small>Comma-separated categories</small>
                    </div>
                    <div class="form-group">
                        <label for="min-duration">Minimum Reading Time (seconds)</label>
                        <input type="number" id="min-duration" min="1" value="30">
                    </div>
                `;
                break;

            case 'CIVIC_ACTION':
                fieldsHTML = `
                    <div class="form-group">
                        <label for="action-type">Action Type *</label>
                        <select id="action-type">
                            <option value="POST_CREATED">Create Post</option>
                            <option value="COMMENT_CREATED">Create Comment</option>
                            <option value="PETITION_SIGNED">Sign Petition</option>
                            <option value="EVENT_RSVP">RSVP to Event</option>
                        </select>
                    </div>
                `;
                break;

            case 'SOCIAL_INTERACTION':
                fieldsHTML = `
                    <div class="form-group">
                        <label>Interaction Types</label>
                        <div>
                            <label><input type="checkbox" value="FOLLOW_ADDED"> Follow Users</label>
                            <label><input type="checkbox" value="FRIEND_REQUEST_SENT"> Friend Requests</label>
                            <label><input type="checkbox" value="LIKE_ADDED"> Like Posts</label>
                            <label><input type="checkbox" value="COMMENT_CREATED"> Comment on Posts</label>
                        </div>
                    </div>
                `;
                break;

            case 'COMPLETE_QUESTS':
                fieldsHTML = `
                    <div class="form-group">
                        <label for="quest-types">Quest Types to Complete</label>
                        <select id="quest-types" multiple>
                            <option value="DAILY_HABIT">Daily Habit</option>
                            <option value="DAILY_CIVIC">Daily Civic</option>
                            <option value="CIVIC_ACTION">Civic Action</option>
                        </select>
                    </div>
                `;
                break;
        }

        dynamicFields.innerHTML = fieldsHTML;
    }

    async saveQuest() {
        try {
            const form = document.getElementById('quest-form');
            const formData = new FormData(form);

            // Build requirements object
            const requirementType = document.getElementById('requirement-type').value;
            const target = parseInt(document.getElementById('requirement-target').value);

            const requirements = {
                type: requirementType,
                target: target,
                timeframe: formData.get('timeframe').toLowerCase()
            };

            // Add metadata based on requirement type
            const metadata = {};

            if (requirementType === 'READ_POSTS') {
                const categories = document.getElementById('post-categories')?.value;
                const minDuration = document.getElementById('min-duration')?.value;
                if (categories) metadata.categories = categories.split(',').map(c => c.trim());
                if (minDuration) metadata.minDuration = parseInt(minDuration);
            } else if (requirementType === 'CIVIC_ACTION') {
                const actionType = document.getElementById('action-type')?.value;
                if (actionType) metadata.actionType = actionType;
            }

            if (Object.keys(metadata).length > 0) {
                requirements.metadata = metadata;
            }

            // Build rewards object
            const rewards = {
                reputationPoints: parseInt(document.getElementById('reputation-points').value) || 0,
                experiencePoints: parseInt(document.getElementById('experience-points').value) || 0
            };

            const badgeRewards = document.getElementById('reward-badges').value;
            if (badgeRewards.trim()) {
                rewards.badges = badgeRewards.split(',').map(id => id.trim()).filter(id => id);
            }

            // Build quest data
            const questData = {
                title: formData.get('title'),
                description: formData.get('description'),
                shortDescription: formData.get('shortDescription'),
                type: formData.get('type'),
                category: formData.get('category'),
                timeframe: formData.get('timeframe'),
                requirements: requirements,
                rewards: rewards,
                isActive: document.getElementById('quest-active').checked
            };

            // Add limited time fields if applicable
            if (questData.timeframe === 'LIMITED_TIME') {
                const startDate = formData.get('startDate');
                const endDate = formData.get('endDate');
                if (startDate) questData.startDate = new Date(startDate);
                if (endDate) questData.endDate = new Date(endDate);
            }

            const response = await AdminAPI.post('/api/quests/create', questData);

            if (response.success) {
                this.closeQuestModal();
                await this.loadQuests();
                await this.loadEngagementStatistics();
                this.showSuccessMessage('Quest created successfully!');
            } else {
                throw new Error(response.error || 'Failed to create quest');
            }

        } catch (error) {
            console.error('Failed to save quest:', error);
            this.showErrorMessage('Failed to create quest: ' + error.message);
        }
    }

    showCreateBadgeModal() {
        const modal = document.getElementById('badge-modal');
        modal.style.display = 'block';
        this.resetBadgeForm();
        this.updateCriteriaFields(); // Initialize with default fields
    }

    closeBadgeModal() {
        document.getElementById('badge-modal').style.display = 'none';
    }

    resetBadgeForm() {
        document.getElementById('badge-form').reset();
        document.getElementById('auto-awarded').checked = true;
        document.getElementById('image-preview').innerHTML = '';
        this.updateCriteriaFields();
    }

    updateCriteriaFields() {
        const criteriaType = document.getElementById('criteria-type').value;
        const dynamicFields = document.getElementById('dynamic-criteria-fields');

        let fieldsHTML = '';

        switch (criteriaType) {
            case 'QUEST_COMPLETION':
                fieldsHTML = `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="quest-completion-count">Quests to Complete</label>
                            <input type="number" id="quest-completion-count" min="1" value="1">
                        </div>
                        <div class="form-group">
                            <label for="streak-days">Streak Days (optional)</label>
                            <input type="number" id="streak-days" min="1">
                        </div>
                    </div>
                `;
                break;

            case 'USER_ACTIVITY':
                fieldsHTML = `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="activity-count">Activity Count</label>
                            <input type="number" id="activity-count" min="1" value="1">
                        </div>
                        <div class="form-group">
                            <label for="activity-timeframe">Timeframe</label>
                            <select id="activity-timeframe">
                                <option value="7d">Last 7 days</option>
                                <option value="30d">Last 30 days</option>
                                <option value="all_time">All time</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="activity-types">Activity Types</label>
                        <input type="text" id="activity-types" placeholder="POST_CREATED,COMMENT_CREATED">
                    </div>
                `;
                break;

            case 'CIVIC_ACTION':
                fieldsHTML = `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="petitions-signed">Petitions Signed</label>
                            <input type="number" id="petitions-signed" min="0">
                        </div>
                        <div class="form-group">
                            <label for="events-attended">Events Attended</label>
                            <input type="number" id="events-attended" min="0">
                        </div>
                        <div class="form-group">
                            <label for="posts-created">Posts Created</label>
                            <input type="number" id="posts-created" min="0">
                        </div>
                    </div>
                `;
                break;

            case 'SOCIAL_METRIC':
                fieldsHTML = `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="reputation-score">Reputation Score</label>
                            <input type="number" id="reputation-score" min="0" max="100">
                        </div>
                        <div class="form-group">
                            <label for="followers-count">Followers Count</label>
                            <input type="number" id="followers-count" min="0">
                        </div>
                        <div class="form-group">
                            <label for="friends-count">Friends Count</label>
                            <input type="number" id="friends-count" min="0">
                        </div>
                    </div>
                `;
                break;

            case 'CUSTOM_ENDPOINT':
                fieldsHTML = `
                    <div class="form-group">
                        <label for="custom-endpoint">Custom Endpoint</label>
                        <input type="text" id="custom-endpoint" placeholder="/api/badges/check-special-criteria">
                    </div>
                    <div class="form-group">
                        <label for="custom-params">Custom Parameters (JSON)</label>
                        <textarea id="custom-params" placeholder='{"minimumPledge": 100}'></textarea>
                    </div>
                `;
                break;
        }

        dynamicFields.innerHTML = fieldsHTML;
    }

    handleBadgeImageUpload() {
        const fileInput = document.getElementById('badge-image');
        const preview = document.getElementById('image-preview');

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Badge preview">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    async saveBadge() {
        try {
            const form = document.getElementById('badge-form');
            const formData = new FormData(form);

            // Build criteria object
            const criteriaType = document.getElementById('criteria-type').value;
            const qualificationCriteria = {
                type: criteriaType,
                requirements: {}
            };

            // Add requirements based on criteria type
            switch (criteriaType) {
                case 'QUEST_COMPLETION':
                    const questCount = document.getElementById('quest-completion-count')?.value;
                    const streakDays = document.getElementById('streak-days')?.value;
                    if (questCount) qualificationCriteria.requirements.questCompletionCount = parseInt(questCount);
                    if (streakDays) qualificationCriteria.requirements.streakDays = parseInt(streakDays);
                    break;

                case 'USER_ACTIVITY':
                    const activityCount = document.getElementById('activity-count')?.value;
                    const timeframe = document.getElementById('activity-timeframe')?.value;
                    const activityTypes = document.getElementById('activity-types')?.value;
                    if (activityCount) qualificationCriteria.requirements.activityCount = parseInt(activityCount);
                    if (timeframe) qualificationCriteria.requirements.timeframe = timeframe;
                    if (activityTypes) qualificationCriteria.requirements.activityTypes = activityTypes.split(',').map(t => t.trim());
                    break;

                case 'CIVIC_ACTION':
                    const petitions = document.getElementById('petitions-signed')?.value;
                    const events = document.getElementById('events-attended')?.value;
                    const posts = document.getElementById('posts-created')?.value;
                    if (petitions) qualificationCriteria.requirements.petitionsSigned = parseInt(petitions);
                    if (events) qualificationCriteria.requirements.eventsAttended = parseInt(events);
                    if (posts) qualificationCriteria.requirements.postsCreated = parseInt(posts);
                    break;

                case 'SOCIAL_METRIC':
                    const reputation = document.getElementById('reputation-score')?.value;
                    const followers = document.getElementById('followers-count')?.value;
                    const friends = document.getElementById('friends-count')?.value;
                    if (reputation) qualificationCriteria.requirements.reputationScore = parseInt(reputation);
                    if (followers) qualificationCriteria.requirements.followersCount = parseInt(followers);
                    if (friends) qualificationCriteria.requirements.friendsCount = parseInt(friends);
                    break;

                case 'CUSTOM_ENDPOINT':
                    const endpoint = document.getElementById('custom-endpoint')?.value;
                    const paramsText = document.getElementById('custom-params')?.value;
                    if (endpoint) qualificationCriteria.requirements.customEndpoint = endpoint;
                    if (paramsText) {
                        try {
                            qualificationCriteria.requirements.customParams = JSON.parse(paramsText);
                        } catch (e) {
                            throw new Error('Invalid JSON in custom parameters');
                        }
                    }
                    break;
            }

            // Add qualification criteria to form data
            formData.append('qualificationCriteria', JSON.stringify(qualificationCriteria));
            formData.append('isAutoAwarded', document.getElementById('auto-awarded').checked);

            const response = await AdminAPI.postFormData('/api/badges/create', formData);

            if (response.success) {
                this.closeBadgeModal();
                await this.loadBadges();
                await this.loadEngagementStatistics();
                this.showSuccessMessage('Badge created successfully!');
            } else {
                throw new Error(response.error || 'Failed to create badge');
            }

        } catch (error) {
            console.error('Failed to save badge:', error);
            this.showErrorMessage('Failed to create badge: ' + error.message);
        }
    }

    setupEventListeners() {
        // Comprehensive event delegation for all data-action attributes
        document.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (!action) return;

            // Prevent default behavior for buttons and links
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
                e.preventDefault();
            }

            try {
                switch (action) {
                    case 'showSubSection':
                        const sectionId = e.target.getAttribute('data-section');
                        if (sectionId) {
                            this.showSubSection(sectionId);
                        }
                        break;

                    case 'switchEngagementTab':
                        const tabName = e.target.getAttribute('data-tab');
                        if (tabName) {
                            this.switchEngagementTab(tabName);
                        }
                        break;

                    case 'showCreateQuestModal':
                        this.showCreateQuestModal();
                        break;

                    case 'showCreateBadgeModal':
                        this.showCreateBadgeModal();
                        break;

                    case 'closeQuestModal':
                        this.closeQuestModal();
                        break;

                    case 'closeBadgeModal':
                        this.closeBadgeModal();
                        break;

                    case 'saveQuest':
                        this.saveQuest();
                        break;

                    case 'saveBadge':
                        this.saveBadge();
                        break;

                    case 'editQuest':
                        const questId = e.target.getAttribute('data-quest-id');
                        if (questId) {
                            this.editQuest(questId);
                        }
                        break;

                    case 'toggleQuestStatus':
                        const questIdToggle = e.target.getAttribute('data-quest-id');
                        const activeStatus = e.target.getAttribute('data-active');
                        if (questIdToggle && activeStatus !== null) {
                            this.toggleQuestStatus(questIdToggle, activeStatus === 'true');
                        }
                        break;

                    case 'editBadge':
                        const badgeId = e.target.getAttribute('data-badge-id');
                        if (badgeId) {
                            this.editBadge(badgeId);
                        }
                        break;

                    case 'awardBadgeManually':
                        const badgeIdAward = e.target.getAttribute('data-badge-id');
                        const badgeName = e.target.getAttribute('data-badge-name');
                        if (badgeIdAward) {
                            this.awardBadgeManually(badgeIdAward, badgeName);
                        }
                        break;

                    case 'runQualificationChecks':
                        this.runQualificationChecks();
                        break;

                    case 'closeAwardBadgeModal':
                        this.closeAwardBadgeModal();
                        break;

                    case 'searchUsersForBadgeAward':
                        this.searchUsersForBadgeAward();
                        break;

                    case 'selectUserForBadge':
                        const selectedUserId = e.target.getAttribute('data-user-id');
                        const selectedUsername = e.target.getAttribute('data-username');
                        if (selectedUserId && selectedUsername) {
                            this.selectUserForBadgeAward(selectedUserId, selectedUsername);
                        }
                        break;

                    default:
                        console.warn(`Unhandled data-action: ${action}`);
                }
            } catch (error) {
                console.error(`Error handling action ${action}:`, error);
                if (window.AdminGlobalUtils) {
                    window.AdminGlobalUtils.showToast(`Error: ${error.message}`, 'error');
                }
            }
        });

        // Event delegation for change events (select dropdowns)
        document.addEventListener('change', (e) => {
            const action = e.target.getAttribute('data-action');
            if (!action) return;

            try {
                switch (action) {
                    case 'toggleLimitedTimeFields':
                        this.toggleLimitedTimeFields();
                        break;

                    case 'updateRequirementFields':
                        this.updateRequirementFields();
                        break;

                    case 'updateCriteriaFields':
                        this.updateCriteriaFields();
                        break;

                    default:
                        console.warn(`Unhandled change data-action: ${action}`);
                }
            } catch (error) {
                console.error(`Error handling change action ${action}:`, error);
                if (window.AdminGlobalUtils) {
                    window.AdminGlobalUtils.showToast(`Error: ${error.message}`, 'error');
                }
            }
        });

        // Modal close on outside click
        document.getElementById('quest-modal').addEventListener('click', (e) => {
            if (e.target.id === 'quest-modal') this.closeQuestModal();
        });

        document.getElementById('badge-modal').addEventListener('click', (e) => {
            if (e.target.id === 'badge-modal') this.closeBadgeModal();
        });

        const awardBadgeModal = document.getElementById('award-badge-modal');
        if (awardBadgeModal) {
            awardBadgeModal.addEventListener('click', (e) => {
                if (e.target.id === 'award-badge-modal') this.closeAwardBadgeModal();
            });
        }

        // Image upload preview
        this.handleBadgeImageUpload();

        // User search input debounced listener
        const userSearchInput = document.getElementById('user-search-input');
        if (userSearchInput) {
            let searchTimeout;
            userSearchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (userSearchInput.value.trim().length >= 2) {
                        this.searchUsersForBadgeAward();
                    }
                }, 300); // Debounce 300ms
            });
        }
    }

    showSuccessMessage(message) {
        // Using existing admin notification system
        if (window.AdminGlobalUtils) {
            window.AdminGlobalUtils.showToast(message, 'success');
        } else {
            alert(message);
        }
    }

    showErrorMessage(message) {
        // Using existing admin notification system
        if (window.AdminGlobalUtils) {
            window.AdminGlobalUtils.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    // Quest and Badge Management Methods (Event Delegation Handlers)
    editQuest(questId) {
        try {
            // TODO: Implement quest editing functionality
            console.log('Edit quest:', questId);
            this.showErrorMessage('Quest editing is not yet implemented');
        } catch (error) {
            console.error('Error editing quest:', error);
            this.showErrorMessage('Error editing quest: ' + error.message);
        }
    }

    async toggleQuestStatus(questId, isActive) {
        try {
            const response = await AdminAPI.post(`/api/quests/${questId}/toggle`, { isActive });

            if (response.success) {
                await this.loadQuests();
                await this.loadEngagementStatistics();
                this.showSuccessMessage(`Quest ${isActive ? 'activated' : 'deactivated'} successfully`);
            } else {
                throw new Error(response.error || 'Failed to toggle quest status');
            }
        } catch (error) {
            console.error('Error toggling quest status:', error);
            this.showErrorMessage('Error toggling quest status: ' + error.message);
        }
    }

    editBadge(badgeId) {
        try {
            // TODO: Implement badge editing functionality
            console.log('Edit badge:', badgeId);
            this.showErrorMessage('Badge editing is not yet implemented');
        } catch (error) {
            console.error('Error editing badge:', error);
            this.showErrorMessage('Error editing badge: ' + error.message);
        }
    }

    async awardBadgeManually(badgeId, badgeName) {
        try {
            // Show user search modal
            const modal = document.getElementById('award-badge-modal');
            if (!modal) {
                this.showErrorMessage('Award badge modal not found in HTML');
                return;
            }

            // Set modal title
            document.getElementById('award-modal-title').textContent = `Award Badge: ${badgeName}`;
            document.getElementById('award-modal-badge-id').value = badgeId;

            // Clear previous search results
            document.getElementById('user-search-input').value = '';
            document.getElementById('user-search-results').innerHTML = '';

            // Show modal
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error showing award badge modal:', error);
            this.showErrorMessage('Error awarding badge: ' + error.message);
        }
    }

    async searchUsersForBadgeAward() {
        try {
            const searchTerm = document.getElementById('user-search-input').value.trim();

            if (searchTerm.length < 2) {
                document.getElementById('user-search-results').innerHTML =
                    '<p style="color: #666; text-align: center; padding: 1rem;">Enter at least 2 characters to search</p>';
                return;
            }

            // Show loading
            document.getElementById('user-search-results').innerHTML =
                '<p style="color: #666; text-align: center; padding: 1rem;">Searching...</p>';

            const response = await AdminAPI.get(`/api/admin/users/search?q=${encodeURIComponent(searchTerm)}`);

            if (!response.success || !response.data || response.data.length === 0) {
                document.getElementById('user-search-results').innerHTML =
                    '<p style="color: #666; text-align: center; padding: 1rem;">No users found</p>';
                return;
            }

            // Render user results
            const resultsHTML = response.data.map(user => `
                <div class="user-search-result" data-user-id="${user.id}">
                    <div class="user-result-info">
                        <strong>${user.username}</strong>
                        <br><small>${user.email}</small>
                    </div>
                    <button
                        class="btn-small btn-primary"
                        data-action="selectUserForBadge"
                        data-user-id="${user.id}"
                        data-username="${user.username}">
                        Select
                    </button>
                </div>
            `).join('');

            document.getElementById('user-search-results').innerHTML = resultsHTML;
        } catch (error) {
            console.error('Error searching users:', error);
            document.getElementById('user-search-results').innerHTML =
                '<p style="color: #d00; text-align: center; padding: 1rem;">Error searching users</p>';
        }
    }

    async selectUserForBadgeAward(userId, username) {
        try {
            const badgeId = document.getElementById('award-modal-badge-id').value;

            if (!confirm(`Award this badge to ${username}?`)) {
                return;
            }

            const response = await AdminAPI.post('/api/admin/badges/award', {
                badgeId: badgeId,
                userId: userId
            });

            if (response.success) {
                this.closeAwardBadgeModal();
                await this.loadBadges();
                await this.loadEngagementStatistics();
                this.showSuccessMessage(`Badge successfully awarded to ${username}!`);
            } else {
                throw new Error(response.error || 'Failed to award badge');
            }
        } catch (error) {
            console.error('Error awarding badge:', error);
            this.showErrorMessage('Error awarding badge: ' + error.message);
        }
    }

    closeAwardBadgeModal() {
        const modal = document.getElementById('award-badge-modal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('user-search-input').value = '';
            document.getElementById('user-search-results').innerHTML = '';
        }
    }

    async runQualificationChecks() {
        try {
            if (!confirm('Run auto-award qualification checks for all users?\n\nThis will check all active auto-awarded badges and award them to qualifying users.')) {
                return;
            }

            // Show loading state
            this.showSuccessMessage('Running qualification checks... This may take a moment.');

            const response = await AdminAPI.post('/api/admin/badges/run-qualifications', {});

            if (response.success) {
                const results = response.data || {};
                const message = `Qualification checks complete!\n\n` +
                    `- Users checked: ${results.usersChecked || 0}\n` +
                    `- Badges awarded: ${results.badgesAwarded || 0}\n` +
                    `- Users qualified: ${results.usersQualified || 0}`;

                await this.loadBadges();
                await this.loadEngagementStatistics();
                this.showSuccessMessage(message);
            } else {
                throw new Error(response.error || 'Failed to run qualification checks');
            }
        } catch (error) {
            console.error('Error running qualification checks:', error);
            this.showErrorMessage('Error running qualification checks: ' + error.message);
        }
    }
}

// Make available globally for AdminModuleLoader
window.CivicEngagementController = CivicEngagementController;

// Initialize and export
const civicEngagementController = new CivicEngagementController();

// Legacy global functions removed - now using event delegation with data-action attributes
// All interactions are handled through the comprehensive event delegation system in setupEventListeners()

export { civicEngagementController };