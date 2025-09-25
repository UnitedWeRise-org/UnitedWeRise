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
                    <button onclick="editQuest('${quest.id}')" class="btn-small">Edit</button>
                    <button onclick="toggleQuestStatus('${quest.id}', ${!quest.isActive})" class="btn-small">
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

        grid.innerHTML = this.badgeData.map(badge => `
            <div class="badge-card">
                <img src="${badge.imageUrl}" alt="${badge.name}" class="badge-image" />
                <h4>${badge.name}</h4>
                <p>${badge.description}</p>
                <div class="badge-stats">
                    <small>${badge._count?.userBadges || 0} awarded</small>
                </div>
                <div class="badge-actions">
                    <button onclick="editBadge('${badge.id}')" class="btn-small">Edit</button>
                    <button onclick="awardBadgeManually('${badge.id}')" class="btn-small">Award</button>
                </div>
            </div>
        `).join('');
    }

    switchEngagementTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[onclick="switchEngagementTab('${tabName}')"]`).classList.add('active');

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
        // Modal close on outside click
        document.getElementById('quest-modal').addEventListener('click', (e) => {
            if (e.target.id === 'quest-modal') this.closeQuestModal();
        });

        document.getElementById('badge-modal').addEventListener('click', (e) => {
            if (e.target.id === 'badge-modal') this.closeBadgeModal();
        });

        // Image upload preview
        this.handleBadgeImageUpload();
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
}

// Initialize and export
const civicEngagementController = new CivicEngagementController();

// Make functions globally accessible for HTML onclick handlers
window.switchEngagementTab = (tab) => civicEngagementController.switchEngagementTab(tab);
window.showCreateQuestModal = () => civicEngagementController.showCreateQuestModal();
window.closeQuestModal = () => civicEngagementController.closeQuestModal();
window.showCreateBadgeModal = () => civicEngagementController.showCreateBadgeModal();
window.closeBadgeModal = () => civicEngagementController.closeBadgeModal();
window.saveQuest = () => civicEngagementController.saveQuest();
window.saveBadge = () => civicEngagementController.saveBadge();
window.updateRequirementFields = () => civicEngagementController.updateRequirementFields();
window.updateCriteriaFields = () => civicEngagementController.updateCriteriaFields();
window.toggleLimitedTimeFields = () => civicEngagementController.toggleLimitedTimeFields();

export { civicEngagementController };