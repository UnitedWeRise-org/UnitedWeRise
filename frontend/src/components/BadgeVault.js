/**
 * Badge Vault Component
 * User interface for managing badge collection and display preferences
 * Allows users to select which badges appear on their nameplate
 */

import { apiCall } from '../js/api-compatibility-shim.js';

class BadgeVault {
    constructor() {
        this.userBadges = [];
        this.availableBadges = [];
        this.vaultSettings = {
            publicVisibility: true,
            categoryPreference: ['CIVIC', 'SOCIAL', 'ACHIEVEMENT'],
            rarityPriority: true
        };
        this.isLoading = false;
        this.isDirty = false; // Track unsaved changes

        this.init();
    }

    async init() {
        // Only initialize if user is authenticated
        if (!window.currentUser) {
            console.log('BadgeVault: Waiting for authentication...');
            // Listen for auth and initialize when user logs in
            window.addEventListener('userLoggedIn', () => {
                this.init();
            }, { once: true });
            return;
        }

        // Load user's badge collection and available badges
        await this.loadBadgeData();
        this.setupAutoSave();
    }

    /**
     * Load badge data from API
     */
    async loadBadgeData() {
        if (this.isLoading) return;

        this.isLoading = true;

        try {
            // Load user's badge vault and available badges in parallel
            const [vaultResponse, availableResponse] = await Promise.all([
                apiCall('/badges/vault'),
                apiCall('/badges/available')
            ]);

            if (vaultResponse.ok && vaultResponse.data.success) {
                const vaultData = vaultResponse.data.data;
                this.userBadges = vaultData.badges || [];
                this.vaultSettings = { ...this.vaultSettings, ...vaultData.settings };
            }

            if (availableResponse.ok && availableResponse.data.success) {
                this.availableBadges = availableResponse.data.data || [];
            }

        } catch (error) {
            console.error('Failed to load badge data:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Set up auto-save for badge display changes
     */
    setupAutoSave() {
        // Auto-save changes every 3 seconds when dirty
        setInterval(() => {
            if (this.isDirty) {
                this.saveBadgeSettings();
            }
        }, 3000);
    }

    /**
     * Save badge display settings to backend
     */
    async saveBadgeSettings() {
        try {
            // Prepare display badges data
            const displayBadges = this.userBadges
                .filter(badge => badge.isDisplayed)
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .slice(0, 5) // Limit to 5 badges
                .map((badge, index) => ({
                    badgeId: badge.badgeId,
                    displayOrder: index + 1,
                    isDisplayed: true
                }));

            const response = await apiCall('/badges/display', 'POST', {
                displayBadges: displayBadges,
                settings: this.vaultSettings
            });

            if (response.ok && response.data.success) {
                this.isDirty = false;
                this.showSaveStatus('saved');
            } else {
                this.showSaveStatus('error');
            }

        } catch (error) {
            console.error('Failed to save badge settings:', error);
            this.showSaveStatus('error');
        }
    }

    /**
     * Show save status indicator
     */
    showSaveStatus(status) {
        const indicator = document.querySelector('.save-status');
        if (!indicator) return;

        indicator.className = `save-status ${status}`;

        const messages = {
            'saving': '💾 Saving...',
            'saved': '✅ Saved',
            'error': '❌ Save failed'
        };

        indicator.textContent = messages[status] || '';

        // Hide status after 2 seconds
        if (status !== 'saving') {
            setTimeout(() => {
                indicator.className = 'save-status';
                indicator.textContent = '';
            }, 2000);
        }
    }

    /**
     * Toggle badge display status
     */
    toggleBadgeDisplay(badgeId) {
        const badge = this.userBadges.find(b => b.badgeId === badgeId);
        if (!badge) return;

        const currentDisplayed = this.userBadges.filter(b => b.isDisplayed);

        if (badge.isDisplayed) {
            // Remove from display
            badge.isDisplayed = false;
            badge.displayOrder = null;

            // Reorder remaining badges
            this.reorderDisplayBadges();
        } else {
            // Add to display if under limit
            if (currentDisplayed.length < 5) {
                badge.isDisplayed = true;
                badge.displayOrder = currentDisplayed.length + 1;
            } else {
                this.showMessage('You can only display up to 5 badges at once', 'warning');
                return;
            }
        }

        this.isDirty = true;
        this.showSaveStatus('saving');
        this.renderBadgeVault();
    }

    /**
     * Reorder display badges after removal
     */
    reorderDisplayBadges() {
        const displayedBadges = this.userBadges.filter(b => b.isDisplayed);
        displayedBadges.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        displayedBadges.forEach((badge, index) => {
            badge.displayOrder = index + 1;
        });
    }

    /**
     * Move badge up in display order
     */
    moveBadgeUp(badgeId) {
        const badge = this.userBadges.find(b => b.badgeId === badgeId);
        if (!badge || !badge.isDisplayed || badge.displayOrder <= 1) return;

        // Find badge to swap with
        const swapBadge = this.userBadges.find(b =>
            b.isDisplayed && b.displayOrder === badge.displayOrder - 1
        );

        if (swapBadge) {
            const tempOrder = badge.displayOrder;
            badge.displayOrder = swapBadge.displayOrder;
            swapBadge.displayOrder = tempOrder;

            this.isDirty = true;
            this.showSaveStatus('saving');
            this.renderBadgeVault();
        }
    }

    /**
     * Move badge down in display order
     */
    moveBadgeDown(badgeId) {
        const badge = this.userBadges.find(b => b.badgeId === badgeId);
        const maxOrder = this.userBadges.filter(b => b.isDisplayed).length;

        if (!badge || !badge.isDisplayed || badge.displayOrder >= maxOrder) return;

        // Find badge to swap with
        const swapBadge = this.userBadges.find(b =>
            b.isDisplayed && b.displayOrder === badge.displayOrder + 1
        );

        if (swapBadge) {
            const tempOrder = badge.displayOrder;
            badge.displayOrder = swapBadge.displayOrder;
            swapBadge.displayOrder = tempOrder;

            this.isDirty = true;
            this.showSaveStatus('saving');
            this.renderBadgeVault();
        }
    }

    /**
     * Show badge vault modal
     */
    showVault() {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'badge-vault-modal modal-overlay';
        modal.innerHTML = this.renderVaultModal();

        document.body.appendChild(modal);

        // Close modal handlers
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeVault(modal);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeVault(modal);
            }
        });

        // Render the vault content
        this.renderBadgeVault();
    }

    /**
     * Close badge vault modal
     */
    closeVault(modal) {
        if (this.isDirty) {
            if (confirm('You have unsaved changes. Save before closing?')) {
                this.saveBadgeSettings();
            }
        }

        if (modal && modal.parentNode) {
            modal.remove();
        }
    }

    /**
     * Render the vault modal structure
     */
    renderVaultModal() {
        return `
            <div class="modal badge-vault-modal-content">
                <div class="modal-header">
                    <h2>
                        <span class="vault-icon">🏆</span>
                        Badge Vault
                    </h2>
                    <div class="header-actions">
                        <div class="save-status"></div>
                        <button class="close-modal" onclick="badgeVault.closeVault(this.closest('.modal-overlay'))">×</button>
                    </div>
                </div>

                <div class="modal-content">
                    <div class="vault-tabs">
                        <button class="tab-btn active" data-tab="display">Display Settings</button>
                        <button class="tab-btn" data-tab="collection">Full Collection</button>
                        <button class="tab-btn" data-tab="settings">Preferences</button>
                    </div>

                    <div class="vault-content" id="badge-vault-content">
                        <!-- Content rendered by renderBadgeVault() -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render badge vault content based on active tab
     */
    renderBadgeVault() {
        const container = document.getElementById('badge-vault-content');
        if (!container) return;

        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'display';

        // Setup tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderBadgeVault();
            };
        });

        switch (activeTab) {
            case 'display':
                container.innerHTML = this.renderDisplayTab();
                break;
            case 'collection':
                container.innerHTML = this.renderCollectionTab();
                break;
            case 'settings':
                container.innerHTML = this.renderSettingsTab();
                break;
        }
    }

    /**
     * Render display settings tab
     */
    renderDisplayTab() {
        const displayedBadges = this.userBadges
            .filter(b => b.isDisplayed)
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        const earnedBadges = this.userBadges.filter(b => !b.isDisplayed);

        return `
            <div class="display-tab">
                <div class="display-section">
                    <h3>Nameplate Display (${displayedBadges.length}/5)</h3>
                    <p class="section-description">These badges appear next to your name in posts and comments</p>

                    <div class="nameplate-preview">
                        <div class="preview-nameplate">
                            <div class="preview-avatar">👤</div>
                            <div class="preview-name">
                                Your Name
                                <div class="preview-badges">
                                    ${displayedBadges.map(userBadge => `
                                        <img src="${userBadge.badge.imageUrl}"
                                             alt="${userBadge.badge.name}"
                                             class="preview-badge ${userBadge.badge.rarity?.toLowerCase()}"
                                             title="${userBadge.badge.name}">
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="displayed-badges">
                        ${displayedBadges.length > 0 ? `
                            <div class="badge-list displayed">
                                ${displayedBadges.map(userBadge => this.renderDisplayBadgeItem(userBadge)).join('')}
                            </div>
                        ` : `
                            <div class="empty-display">
                                <div class="empty-icon">🎯</div>
                                <p>No badges selected for display</p>
                                <p class="empty-hint">Choose up to 5 badges from your collection below</p>
                            </div>
                        `}
                    </div>
                </div>

                <div class="available-section">
                    <h3>Your Badge Collection</h3>
                    <p class="section-description">Click badges to add them to your nameplate display</p>

                    ${earnedBadges.length > 0 ? `
                        <div class="badge-grid">
                            ${earnedBadges.map(userBadge => this.renderCollectionBadgeItem(userBadge)).join('')}
                        </div>
                    ` : `
                        <div class="empty-collection">
                            <div class="empty-icon">🏆</div>
                            <p>All your badges are currently displayed!</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Render a badge item in the display list
     */
    renderDisplayBadgeItem(userBadge) {
        const badge = userBadge.badge;
        const rarityPercentage = this.getBadgeRarityPercentage(badge.rarity);

        return `
            <div class="display-badge-item" data-badge-id="${userBadge.badgeId}">
                <div class="badge-display-info">
                    <img src="${badge.imageUrl}" alt="${badge.name}" class="badge-image ${badge.rarity?.toLowerCase()}">
                    <div class="badge-details">
                        <h4>${badge.name}</h4>
                        <p class="badge-description">${badge.description}</p>
                        <div class="badge-stats">
                            <span class="rarity ${badge.rarity?.toLowerCase()}">${badge.rarity}</span>
                            <span class="rarity-percent">${rarityPercentage}% have this</span>
                        </div>
                    </div>
                </div>
                <div class="badge-controls">
                    <div class="order-controls">
                        <button class="order-btn" onclick="badgeVault.moveBadgeUp('${userBadge.badgeId}')"
                                ${userBadge.displayOrder <= 1 ? 'disabled' : ''}>↑</button>
                        <span class="order-number">${userBadge.displayOrder}</span>
                        <button class="order-btn" onclick="badgeVault.moveBadgeDown('${userBadge.badgeId}')"
                                ${userBadge.displayOrder >= this.userBadges.filter(b => b.isDisplayed).length ? 'disabled' : ''}>↓</button>
                    </div>
                    <button class="remove-btn" onclick="badgeVault.toggleBadgeDisplay('${userBadge.badgeId}')">Remove</button>
                </div>
            </div>
        `;
    }

    /**
     * Render a badge item in the collection grid
     */
    renderCollectionBadgeItem(userBadge) {
        const badge = userBadge.badge;
        const rarityPercentage = this.getBadgeRarityPercentage(badge.rarity);

        return `
            <div class="collection-badge-item ${badge.rarity?.toLowerCase()}"
                 data-badge-id="${userBadge.badgeId}"
                 onclick="badgeVault.toggleBadgeDisplay('${userBadge.badgeId}')"
                 title="Click to add to nameplate display">
                <img src="${badge.imageUrl}" alt="${badge.name}" class="badge-image">
                <div class="badge-info">
                    <h4>${badge.name}</h4>
                    <div class="badge-meta">
                        <span class="rarity ${badge.rarity?.toLowerCase()}">${badge.rarity}</span>
                        <span class="earned-date">Earned ${new Date(userBadge.earnedAt).toLocaleDateString()}</span>
                    </div>
                    <p class="badge-description">${badge.description}</p>
                    <div class="rarity-info">
                        <span class="rarity-percent">${rarityPercentage}% of users have this badge</span>
                    </div>
                </div>
                <div class="add-overlay">
                    <span class="add-icon">+</span>
                </div>
            </div>
        `;
    }

    /**
     * Render full collection tab
     */
    renderCollectionTab() {
        const categories = ['CIVIC', 'SOCIAL', 'ACHIEVEMENT', 'MILESTONE', 'SPECIAL'];

        return `
            <div class="collection-tab">
                <div class="collection-header">
                    <div class="collection-stats">
                        <div class="stat">
                            <span class="stat-number">${this.userBadges.length}</span>
                            <span class="stat-label">Badges Earned</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${this.availableBadges.length}</span>
                            <span class="stat-label">Total Available</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${Math.round((this.userBadges.length / this.availableBadges.length) * 100)}%</span>
                            <span class="stat-label">Collection Complete</span>
                        </div>
                    </div>
                </div>

                ${categories.map(category => this.renderCategorySection(category)).join('')}
            </div>
        `;
    }

    /**
     * Render a category section in the collection tab
     */
    renderCategorySection(category) {
        const categoryBadges = this.userBadges.filter(ub => ub.badge.category === category);
        const availableInCategory = this.availableBadges.filter(b => b.category === category);

        if (categoryBadges.length === 0) return '';

        return `
            <div class="category-section">
                <h3>${category.charAt(0) + category.slice(1).toLowerCase()} Badges (${categoryBadges.length}/${availableInCategory.length})</h3>
                <div class="category-badges">
                    ${categoryBadges.map(userBadge => this.renderFullCollectionBadge(userBadge)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render badge in full collection view
     */
    renderFullCollectionBadge(userBadge) {
        const badge = userBadge.badge;
        const rarityPercentage = this.getBadgeRarityPercentage(badge.rarity);

        return `
            <div class="full-collection-badge ${badge.rarity?.toLowerCase()}" data-badge-id="${userBadge.badgeId}">
                <img src="${badge.imageUrl}" alt="${badge.name}" class="badge-image">
                <div class="badge-overlay">
                    <h4>${badge.name}</h4>
                    <p class="badge-description">${badge.description}</p>
                    <div class="badge-details">
                        <span class="rarity ${badge.rarity?.toLowerCase()}">${badge.rarity}</span>
                        <span class="rarity-percent">${rarityPercentage}%</span>
                        <span class="earned-date">${new Date(userBadge.earnedAt).toLocaleDateString()}</span>
                    </div>
                    ${userBadge.isDisplayed ? '<div class="displayed-indicator">📌 Displayed</div>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render settings tab
     */
    renderSettingsTab() {
        return `
            <div class="settings-tab">
                <div class="settings-section">
                    <h3>Badge Vault Preferences</h3>

                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox"
                                   ${this.vaultSettings.publicVisibility ? 'checked' : ''}
                                   onchange="badgeVault.updateSetting('publicVisibility', this.checked)">
                            <span class="setting-title">Public Badge Vault</span>
                        </label>
                        <p class="setting-description">Allow other users to view your complete badge collection</p>
                    </div>

                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox"
                                   ${this.vaultSettings.rarityPriority ? 'checked' : ''}
                                   onchange="badgeVault.updateSetting('rarityPriority', this.checked)">
                            <span class="setting-title">Rarity Priority</span>
                        </label>
                        <p class="setting-description">Automatically prioritize rarer badges in your display</p>
                    </div>

                    <div class="setting-group">
                        <span class="setting-title">Preferred Categories</span>
                        <p class="setting-description">Choose which types of badges you prefer to display</p>
                        <div class="category-preferences">
                            ${['CIVIC', 'SOCIAL', 'ACHIEVEMENT', 'MILESTONE', 'SPECIAL'].map(category => `
                                <label class="category-option">
                                    <input type="checkbox"
                                           ${this.vaultSettings.categoryPreference.includes(category) ? 'checked' : ''}
                                           onchange="badgeVault.updateCategoryPreference('${category}', this.checked)">
                                    <span>${category.charAt(0) + category.slice(1).toLowerCase()}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update a vault setting
     */
    updateSetting(setting, value) {
        this.vaultSettings[setting] = value;
        this.isDirty = true;
        this.showSaveStatus('saving');
    }

    /**
     * Update category preference
     */
    updateCategoryPreference(category, enabled) {
        if (enabled) {
            if (!this.vaultSettings.categoryPreference.includes(category)) {
                this.vaultSettings.categoryPreference.push(category);
            }
        } else {
            this.vaultSettings.categoryPreference = this.vaultSettings.categoryPreference.filter(c => c !== category);
        }
        this.isDirty = true;
        this.showSaveStatus('saving');
    }

    /**
     * Get badge rarity percentage (placeholder)
     */
    getBadgeRarityPercentage(rarity) {
        const rarityPercentages = {
            'COMMON': 45,
            'UNCOMMON': 25,
            'RARE': 15,
            'EPIC': 5,
            'LEGENDARY': 1
        };
        return rarityPercentages[rarity] || 30;
    }

    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        // Simple message display - could be enhanced with toast notifications
        alert(message);
    }

    /**
     * Cleanup when component is destroyed
     */
    destroy() {
        if (this.isDirty) {
            this.saveBadgeSettings();
        }
    }
}

// Initialize and export
const badgeVault = new BadgeVault();
window.badgeVault = badgeVault;

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadgeVault;
}