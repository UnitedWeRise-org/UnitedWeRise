/**
 * Civic Engagement Controller
 * Handles quest and badge management for the admin dashboard
 */

import { AdminAPI } from '../api/AdminAPI.js';
import {
    getClaimUrl,
    parseEmailList,
    downloadCodesAsCSV,
    copyToClipboard,
    formatClaimStats,
    isClaimCodeValid,
    formatExpiration
} from '../../../utils/badge-claim-utils.js';

class CivicEngagementController {
    constructor() {
        this.currentTab = 'quests';
        this.questData = [];
        this.badgeData = [];
        this.claimCodesData = [];
        this.currentBadgeFilter = 'all'; // For claim codes filter
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
            const questResponse = await AdminAPI.get(`${window.API_CONFIG.BASE_URL}/quests/all`);
            const quests = questResponse.data || [];

            // Load badge statistics
            const badgeResponse = await AdminAPI.get(`${window.API_CONFIG.BASE_URL}/badges/all`);
            const badges = badgeResponse.data || [];

            // Load quest analytics
            const analyticsResponse = await AdminAPI.get(`${window.API_CONFIG.BASE_URL}/quests/analytics`);
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
            const response = await AdminAPI.get(`${window.API_CONFIG.BASE_URL}/quests/all`);
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
            const response = await AdminAPI.get(`${window.API_CONFIG.BASE_URL}/badges/all`);
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

        // Add qualification check and bulk award buttons at the top
        const headerHTML = `
            <div class="badge-grid-header" style="grid-column: 1 / -1; margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                <button data-action="runQualificationChecks" class="btn btn-primary">
                    🔄 Run Auto-Award Qualification Checks
                </button>
                <button data-action="showBulkAwardModal" class="btn btn-primary">
                    📧 Bulk Award by Email
                </button>
                <span style="color: #666; flex: 1;">
                    Distribute badges automatically or manually to multiple users
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
                    <button data-action="showGenerateClaimCodesModal" data-badge-id="${badge.id}" data-badge-name="${badge.name}" class="btn-small">Claim Codes</button>
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
        } else if (tabName === 'claim-codes') {
            this.loadClaimCodes();
            // Also populate the badge filter dropdown
            const filterSelect = document.getElementById('claim-codes-badge-filter');
            if (filterSelect && this.badgeData.length > 0) {
                filterSelect.innerHTML = '<option value="all">All Badges</option>' +
                    this.badgeData.map(badge => `<option value="${badge.id}">${badge.name}</option>`).join('');
            }
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

            const response = await AdminAPI.post(`${window.API_CONFIG.BASE_URL}/quests/create`, questData);

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
        let exampleHTML = '';

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
                exampleHTML = `
                    <div class="criteria-example" style="background: #e3f2fd; padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <strong>Example JSON Output:</strong>
                        <pre style="margin-top: 0.5rem; font-size: 0.85rem;">{"type": "QUEST_COMPLETION", "requirements": {"questCompletionCount": 10}}</pre>
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
                exampleHTML = `
                    <div class="criteria-example" style="background: #e3f2fd; padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <strong>Example JSON Output:</strong>
                        <pre style="margin-top: 0.5rem; font-size: 0.85rem;">{"type": "USER_ACTIVITY", "requirements": {"activityTypes": ["POST_CREATED", "COMMENT_ADDED"], "activityCount": 20, "timeframe": "30d"}}</pre>
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
                exampleHTML = `
                    <div class="criteria-example" style="background: #e3f2fd; padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <strong>Example JSON Output:</strong>
                        <pre style="margin-top: 0.5rem; font-size: 0.85rem;">{"type": "CIVIC_ACTION", "requirements": {"petitionsSigned": 5, "eventsAttended": 2}}</pre>
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
                exampleHTML = `
                    <div class="criteria-example" style="background: #e3f2fd; padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <strong>Example JSON Output:</strong>
                        <pre style="margin-top: 0.5rem; font-size: 0.85rem;">{"type": "SOCIAL_METRIC", "requirements": {"reputationScore": 100, "followersCount": 50}}</pre>
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
                exampleHTML = `
                    <div class="criteria-example" style="background: #e3f2fd; padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">
                        <strong>Example JSON Output (User Property Badge):</strong>
                        <pre style="margin-top: 0.5rem; font-size: 0.85rem;">{"type": "CUSTOM_ENDPOINT", "requirements": {"userProperty": "isSuperAdmin", "expectedValue": true}}</pre>
                    </div>
                `;
                break;
        }

        dynamicFields.innerHTML = fieldsHTML + exampleHTML;
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

            const response = await AdminAPI.postFormData(`${window.API_CONFIG.BASE_URL}/badges/create`, formData);

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

                    // Claim Code Actions
                    case 'showGenerateClaimCodesModal':
                        const claimBadgeId = e.target.getAttribute('data-badge-id');
                        const claimBadgeName = e.target.getAttribute('data-badge-name');
                        if (claimBadgeId && claimBadgeName) {
                            this.showGenerateClaimCodesModal(claimBadgeId, claimBadgeName);
                        }
                        break;

                    case 'closeClaimCodeModal':
                        this.closeClaimCodeModal();
                        break;

                    case 'generateClaimCodes':
                        this.generateClaimCodes();
                        break;

                    case 'closeClaimCodeResultsModal':
                        this.closeClaimCodeResultsModal();
                        break;

                    case 'copyCode':
                        const codeValue = e.target.getAttribute('data-code');
                        if (codeValue) {
                            this.handleCopyCode(codeValue);
                        }
                        break;

                    case 'copyUrl':
                        const urlValue = e.target.getAttribute('data-url');
                        if (urlValue) {
                            this.handleCopyUrl(urlValue);
                        }
                        break;

                    case 'downloadCodes':
                        const downloadBadgeName = e.target.getAttribute('data-badge-name');
                        if (downloadBadgeName) {
                            this.handleDownloadCodes(downloadBadgeName);
                        }
                        break;

                    case 'viewClaimDetails':
                        const codeId = e.target.getAttribute('data-code-id');
                        if (codeId) {
                            this.viewClaimDetails(codeId);
                        }
                        break;

                    case 'closeClaimDetailsModal':
                        this.closeClaimDetailsModal();
                        break;

                    case 'deactivateClaimCode':
                        const deactivateCodeId = e.target.getAttribute('data-code-id');
                        if (deactivateCodeId) {
                            this.deactivateClaimCode(deactivateCodeId);
                        }
                        break;

                    // Bulk Award Actions
                    case 'showBulkAwardModal':
                        this.showBulkAwardModal();
                        break;

                    case 'closeBulkAwardModal':
                        this.closeBulkAwardModal();
                        break;

                    case 'previewEmails':
                        this.previewEmails();
                        break;

                    case 'executeBulkAward':
                        this.executeBulkAward();
                        break;

                    case 'closeBulkAwardResultsModal':
                        this.closeBulkAwardResultsModal();
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

                    case 'toggleClaimCodeOptions':
                        this.toggleClaimCodeOptions();
                        break;

                    case 'filterClaimCodesByBadge':
                        const filterBadgeId = e.target.value;
                        this.filterClaimCodesByBadge(filterBadgeId);
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

            const response = await AdminAPI.post(`${window.API_CONFIG.BASE_URL}/admin/badges/award`, {
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

            const response = await AdminAPI.post(`${window.API_CONFIG.BASE_URL}/admin/badges/run-qualifications`, {});

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

    // ========================================
    // CLAIM CODE MANAGEMENT
    // ========================================

    /**
     * Show modal to generate claim codes for a badge
     */
    showGenerateClaimCodesModal(badgeId, badgeName) {
        try {
            const modal = document.getElementById('claim-code-modal');
            if (!modal) {
                this.showErrorMessage('Claim code modal not found in HTML');
                return;
            }

            // Set modal title and badge ID
            document.getElementById('claim-code-modal-title').textContent = `Generate Claim Codes: ${badgeName}`;
            document.getElementById('claim-code-badge-id').value = badgeId;
            document.getElementById('claim-code-badge-name').value = badgeName;

            // Reset form
            document.getElementById('code-type').value = 'SHARED';
            document.getElementById('code-count').value = '10';
            document.getElementById('max-claims').value = '';
            document.getElementById('expires-at').value = '';

            // Show/hide options based on type
            this.toggleClaimCodeOptions();

            modal.style.display = 'block';
        } catch (error) {
            console.error('Error showing claim code modal:', error);
            this.showErrorMessage('Error showing modal: ' + error.message);
        }
    }

    /**
     * Close claim code generation modal
     */
    closeClaimCodeModal() {
        const modal = document.getElementById('claim-code-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Toggle visibility of claim code options based on type
     */
    toggleClaimCodeOptions() {
        const codeType = document.getElementById('code-type').value;
        const individualOptions = document.getElementById('individual-options');
        const sharedOptions = document.getElementById('shared-options');

        if (codeType === 'INDIVIDUAL') {
            individualOptions.style.display = 'block';
            sharedOptions.style.display = 'none';
        } else {
            individualOptions.style.display = 'none';
            sharedOptions.style.display = 'block';
        }
    }

    /**
     * Generate claim codes via API
     */
    async generateClaimCodes() {
        try {
            const badgeId = document.getElementById('claim-code-badge-id').value;
            const badgeName = document.getElementById('claim-code-badge-name').value;
            const codeType = document.getElementById('code-type').value;
            const count = codeType === 'INDIVIDUAL' ? parseInt(document.getElementById('code-count').value) : undefined;
            const maxClaims = codeType === 'SHARED' ? (document.getElementById('max-claims').value ? parseInt(document.getElementById('max-claims').value) : undefined) : undefined;
            const expiresAt = document.getElementById('expires-at').value || undefined;

            // Validation
            if (codeType === 'INDIVIDUAL' && (!count || count < 1 || count > 1000)) {
                this.showErrorMessage('Please enter a valid code count (1-1000)');
                return;
            }

            // Build request payload
            const payload = {
                badgeId,
                type: codeType
            };

            if (count) payload.count = count;
            if (maxClaims) payload.maxClaims = maxClaims;
            if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();

            this.showSuccessMessage('Generating claim codes...');

            const response = await AdminAPI.post(`${window.API_CONFIG.BASE_URL}/badges/claim-codes/generate`, payload);

            if (response.success && response.data && response.data.codes) {
                this.closeClaimCodeModal();
                this.showClaimCodeResults(response.data.codes, badgeName, codeType);
                await this.loadClaimCodes(); // Refresh claim codes list
            } else {
                throw new Error(response.error || 'Failed to generate claim codes');
            }
        } catch (error) {
            console.error('Error generating claim codes:', error);
            this.showErrorMessage('Error generating claim codes: ' + error.message);
        }
    }

    /**
     * Show results modal with generated claim codes
     */
    showClaimCodeResults(codes, badgeName, codeType) {
        try {
            const modal = document.getElementById('claim-code-results-modal');
            if (!modal) {
                this.showErrorMessage('Results modal not found');
                return;
            }

            document.getElementById('claim-code-results-title').textContent = `Claim Codes Generated: ${badgeName}`;

            const resultsContainer = document.getElementById('claim-code-results-content');

            if (codeType === 'SHARED') {
                // Single shared code - show large with copy button
                const code = codes[0];
                const claimUrl = getClaimUrl(code.code);

                resultsContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <h3 style="margin-bottom: 1rem;">Shared Claim Code</h3>
                        <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
                            <div style="font-size: 2rem; font-weight: bold; letter-spacing: 2px; margin-bottom: 1rem;">
                                ${code.code}
                            </div>
                            <button data-action="copyCode" data-code="${code.code}" class="btn btn-primary">
                                📋 Copy Code
                            </button>
                        </div>
                        <div style="background: #e8f5e9; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                            <strong>Share URL:</strong>
                            <div style="font-size: 0.9rem; margin-top: 0.5rem; word-break: break-all;">
                                ${claimUrl}
                            </div>
                            <button data-action="copyUrl" data-url="${claimUrl}" class="btn btn-small" style="margin-top: 0.5rem;">
                                📋 Copy URL
                            </button>
                        </div>
                        <div style="color: #666; font-size: 0.9rem;">
                            <strong>Max Claims:</strong> ${code.maxClaims || 'Unlimited'}<br>
                            <strong>Expires:</strong> ${formatExpiration(code.expiresAt)}
                        </div>
                    </div>
                `;
            } else {
                // Individual codes - show table with download option
                resultsContainer.innerHTML = `
                    <div style="padding: 1rem;">
                        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                            <h3>${codes.length} Individual Codes Generated</h3>
                            <button data-action="downloadCodes" data-badge-name="${badgeName}" class="btn btn-primary">
                                💾 Download CSV
                            </button>
                        </div>
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                                        <th style="padding: 0.5rem; text-align: left;">Code</th>
                                        <th style="padding: 0.5rem; text-align: left;">Expires</th>
                                        <th style="padding: 0.5rem; text-align: center;">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${codes.map(code => `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding: 0.5rem; font-family: monospace;">${code.code}</td>
                                            <td style="padding: 0.5rem;">${formatExpiration(code.expiresAt)}</td>
                                            <td style="padding: 0.5rem; text-align: center;">
                                                <button data-action="copyCode" data-code="${code.code}" class="btn-small">Copy</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

                // Store codes for CSV download
                this.lastGeneratedCodes = codes;
            }

            modal.style.display = 'block';
        } catch (error) {
            console.error('Error showing claim code results:', error);
            this.showErrorMessage('Error displaying results: ' + error.message);
        }
    }

    /**
     * Close claim code results modal
     */
    closeClaimCodeResultsModal() {
        const modal = document.getElementById('claim-code-results-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Copy code to clipboard
     */
    async handleCopyCode(code) {
        const success = await copyToClipboard(code);
        if (success) {
            this.showSuccessMessage('Code copied to clipboard!');
        } else {
            this.showErrorMessage('Failed to copy code');
        }
    }

    /**
     * Copy URL to clipboard
     */
    async handleCopyUrl(url) {
        const success = await copyToClipboard(url);
        if (success) {
            this.showSuccessMessage('URL copied to clipboard!');
        } else {
            this.showErrorMessage('Failed to copy URL');
        }
    }

    /**
     * Download codes as CSV
     */
    handleDownloadCodes(badgeName) {
        if (this.lastGeneratedCodes && this.lastGeneratedCodes.length > 0) {
            downloadCodesAsCSV(this.lastGeneratedCodes, badgeName);
            this.showSuccessMessage('CSV download started');
        } else {
            this.showErrorMessage('No codes to download');
        }
    }

    /**
     * Load all claim codes for display
     */
    async loadClaimCodes(badgeId = null) {
        try {
            const url = badgeId
                ? `${window.API_CONFIG.BASE_URL}/badges/claim-codes?badgeId=${badgeId}`
                : `${window.API_CONFIG.BASE_URL}/badges/claim-codes`;

            const response = await AdminAPI.get(url);

            if (response.success && response.data) {
                this.claimCodesData = response.data;
                this.renderClaimCodesTable();
            } else {
                throw new Error(response.error || 'Failed to load claim codes');
            }
        } catch (error) {
            console.error('Error loading claim codes:', error);
            const tbody = document.getElementById('claim-codes-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading claim codes</td></tr>';
            }
        }
    }

    /**
     * Render claim codes table
     */
    renderClaimCodesTable() {
        const tbody = document.getElementById('claim-codes-table-body');
        if (!tbody) return;

        // Filter by badge if needed
        let filteredCodes = this.claimCodesData;
        if (this.currentBadgeFilter !== 'all') {
            filteredCodes = this.claimCodesData.filter(code => code.badgeId === this.currentBadgeFilter);
        }

        if (filteredCodes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No claim codes found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredCodes.map(code => {
            const validity = isClaimCodeValid(code);
            const statusClass = validity.valid ? 'active' : 'inactive';

            return `
                <tr>
                    <td style="font-family: monospace; font-weight: bold;">${code.code}</td>
                    <td>${code.badge?.name || 'Unknown Badge'}</td>
                    <td><span class="badge">${code.type}</span></td>
                    <td>${formatClaimStats(code)}</td>
                    <td>${formatExpiration(code.expiresAt)}</td>
                    <td><span class="status-badge ${statusClass}">${validity.reason}</span></td>
                    <td>
                        <button data-action="viewClaimDetails" data-code-id="${code.id}" class="btn-small">View</button>
                        ${code.isActive ? `<button data-action="deactivateClaimCode" data-code-id="${code.id}" class="btn-small">Deactivate</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Filter claim codes by badge
     */
    filterClaimCodesByBadge(badgeId) {
        this.currentBadgeFilter = badgeId;
        this.renderClaimCodesTable();
    }

    /**
     * View claim code details
     */
    async viewClaimDetails(codeId) {
        try {
            const response = await AdminAPI.get(`${window.API_CONFIG.BASE_URL}/badges/claim-codes/${codeId}/claims`);

            if (response.success && response.data) {
                this.showClaimDetailsModal(response.data);
            } else {
                throw new Error(response.error || 'Failed to load claim details');
            }
        } catch (error) {
            console.error('Error loading claim details:', error);
            this.showErrorMessage('Error loading claim details: ' + error.message);
        }
    }

    /**
     * Show modal with claim details
     */
    showClaimDetailsModal(data) {
        const modal = document.getElementById('claim-details-modal');
        if (!modal) {
            this.showErrorMessage('Claim details modal not found');
            return;
        }

        const { code, claims } = data;

        document.getElementById('claim-details-title').textContent = `Claim Code: ${code.code}`;

        const content = document.getElementById('claim-details-content');
        content.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h4>Code Information</h4>
                <div style="background: #f5f5f5; padding: 1rem; border-radius: 8px;">
                    <p><strong>Badge:</strong> ${code.badge?.name || 'Unknown'}</p>
                    <p><strong>Type:</strong> ${code.type}</p>
                    <p><strong>Claims Used:</strong> ${formatClaimStats(code)}</p>
                    <p><strong>Expires:</strong> ${formatExpiration(code.expiresAt)}</p>
                    <p><strong>Status:</strong> ${isClaimCodeValid(code).reason}</p>
                </div>
            </div>
            <div>
                <h4>Claim History (${claims.length} claims)</h4>
                ${claims.length === 0 ? '<p style="color: #666;">No claims yet</p>' : `
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                                <th style="padding: 0.5rem; text-align: left;">User</th>
                                <th style="padding: 0.5rem; text-align: left;">Claimed At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${claims.map(claim => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 0.5rem;">${claim.user?.username || claim.user?.email || 'Unknown'}</td>
                                    <td style="padding: 0.5rem;">${new Date(claim.claimedAt).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;

        modal.style.display = 'block';
    }

    /**
     * Close claim details modal
     */
    closeClaimDetailsModal() {
        const modal = document.getElementById('claim-details-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Deactivate claim code
     */
    async deactivateClaimCode(codeId) {
        try {
            if (!confirm('Deactivate this claim code? It will no longer be usable.')) {
                return;
            }

            const response = await AdminAPI.delete(`${window.API_CONFIG.BASE_URL}/badges/claim-codes/${codeId}`);

            if (response.success) {
                this.showSuccessMessage('Claim code deactivated successfully');
                await this.loadClaimCodes();
            } else {
                throw new Error(response.error || 'Failed to deactivate claim code');
            }
        } catch (error) {
            console.error('Error deactivating claim code:', error);
            this.showErrorMessage('Error deactivating claim code: ' + error.message);
        }
    }

    // ========================================
    // BULK AWARD MANAGEMENT
    // ========================================

    /**
     * Show bulk award modal
     */
    showBulkAwardModal() {
        try {
            const modal = document.getElementById('bulk-award-modal');
            if (!modal) {
                this.showErrorMessage('Bulk award modal not found');
                return;
            }

            // Populate badge dropdown
            const badgeSelect = document.getElementById('bulk-award-badge-id');
            badgeSelect.innerHTML = '<option value="">Select a badge...</option>' +
                this.badgeData.map(badge => `
                    <option value="${badge.id}">${badge.name}</option>
                `).join('');

            // Reset form
            document.getElementById('email-list').value = '';
            document.getElementById('bulk-award-reason').value = '';
            document.getElementById('email-preview').innerHTML = '';
            document.getElementById('bulk-award-btn').disabled = true;

            modal.style.display = 'block';
        } catch (error) {
            console.error('Error showing bulk award modal:', error);
            this.showErrorMessage('Error showing modal: ' + error.message);
        }
    }

    /**
     * Close bulk award modal
     */
    closeBulkAwardModal() {
        const modal = document.getElementById('bulk-award-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Preview email list before bulk award
     */
    previewEmails() {
        try {
            const emailText = document.getElementById('email-list').value;
            const result = parseEmailList(emailText);

            const preview = document.getElementById('email-preview');
            preview.innerHTML = `
                <div style="background: #f5f5f5; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <h4 style="margin-top: 0;">Preview</h4>
                    <p><strong>Valid emails found:</strong> ${result.emails.length}</p>
                    ${result.duplicates > 0 ? `<p style="color: #f59e0b;"><strong>Duplicates removed:</strong> ${result.duplicates}</p>` : ''}
                    ${result.invalid > 0 ? `<p style="color: #ef4444;"><strong>Invalid emails skipped:</strong> ${result.invalid}</p>` : ''}
                    ${result.emails.length > 0 ? `
                        <details style="margin-top: 1rem;">
                            <summary style="cursor: pointer; font-weight: bold;">View email list</summary>
                            <div style="max-height: 200px; overflow-y: auto; margin-top: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px;">
                                ${result.emails.map(email => `<div>${email}</div>`).join('')}
                            </div>
                        </details>
                    ` : ''}
                </div>
            `;

            // Enable award button if we have valid emails
            document.getElementById('bulk-award-btn').disabled = result.emails.length === 0;

            // Store parsed emails for later use
            this.parsedEmails = result.emails;
        } catch (error) {
            console.error('Error previewing emails:', error);
            this.showErrorMessage('Error parsing email list: ' + error.message);
        }
    }

    /**
     * Execute bulk badge award
     */
    async executeBulkAward() {
        try {
            const badgeId = document.getElementById('bulk-award-badge-id').value;
            const reason = document.getElementById('bulk-award-reason').value || undefined;

            if (!badgeId) {
                this.showErrorMessage('Please select a badge');
                return;
            }

            if (!this.parsedEmails || this.parsedEmails.length === 0) {
                this.showErrorMessage('Please preview the email list first');
                return;
            }

            if (!confirm(`Award badge to ${this.parsedEmails.length} users?`)) {
                return;
            }

            this.showSuccessMessage('Processing bulk award...');

            const response = await AdminAPI.post(`${window.API_CONFIG.BASE_URL}/badges/award-bulk`, {
                badgeId,
                emails: this.parsedEmails,
                reason
            });

            if (response.success && response.data) {
                this.closeBulkAwardModal();
                this.showBulkAwardResults(response.data);
                await this.loadBadges();
                await this.loadEngagementStatistics();
            } else {
                throw new Error(response.error || 'Failed to execute bulk award');
            }
        } catch (error) {
            console.error('Error executing bulk award:', error);
            this.showErrorMessage('Error executing bulk award: ' + error.message);
        }
    }

    /**
     * Show bulk award results modal
     */
    showBulkAwardResults(results) {
        try {
            const modal = document.getElementById('bulk-award-results-modal');
            if (!modal) {
                this.showErrorMessage('Results modal not found');
                return;
            }

            const { awarded, failed, details } = results;

            document.getElementById('bulk-award-results-title').textContent = 'Bulk Award Results';

            const content = document.getElementById('bulk-award-results-content');
            content.innerHTML = `
                <div style="padding: 1rem;">
                    <div style="background: #f5f5f5; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <h4 style="margin-top: 0;">Summary</h4>
                        <p><strong style="color: #10b981;">Successfully Awarded:</strong> ${awarded}</p>
                        <p><strong style="color: #ef4444;">Failed:</strong> ${failed}</p>
                    </div>
                    ${details && details.length > 0 ? `
                        <h4>Detailed Results</h4>
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                                        <th style="padding: 0.5rem; text-align: left;">Email</th>
                                        <th style="padding: 0.5rem; text-align: left;">Status</th>
                                        <th style="padding: 0.5rem; text-align: left;">Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${details.map(detail => `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding: 0.5rem;">${detail.email}</td>
                                            <td style="padding: 0.5rem;">
                                                <span style="color: ${detail.status === 'success' ? '#10b981' : '#ef4444'};">
                                                    ${detail.status === 'success' ? '✓' : '✗'} ${detail.status}
                                                </span>
                                            </td>
                                            <td style="padding: 0.5rem; font-size: 0.9rem; color: #666;">
                                                ${detail.error || detail.message || '-'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}
                </div>
            `;

            modal.style.display = 'block';
        } catch (error) {
            console.error('Error showing bulk award results:', error);
            this.showErrorMessage('Error displaying results: ' + error.message);
        }
    }

    /**
     * Close bulk award results modal
     */
    closeBulkAwardResultsModal() {
        const modal = document.getElementById('bulk-award-results-modal');
        if (modal) {
            modal.style.display = 'none';
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