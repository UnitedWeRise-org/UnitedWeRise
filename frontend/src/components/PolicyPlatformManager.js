/**
 * Policy Platform Manager Component
 * Manages candidate policy positions - create, edit, publish
 * Extracted from MyProfile.js for use in Candidate Dashboard
 */

class PolicyPlatformManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.editingPositionId = null;
        this.policyPositions = [];
    }

    /**
     * Initialize the policy platform manager
     */
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`Container with id ${this.containerId} not found`);
            return;
        }

        this.render();
        this.setupEventListeners();
        this.loadPolicyPositions();
    }

    /**
     * Render the policy platform interface
     */
    render() {
        this.container.innerHTML = `
            <div class="policy-platform-manager">
                <div class="policy-platform-section">
                    <div class="section-header">
                        <h3>📋 Policy Platform Management</h3>
                        <p class="section-description">
                            Share your positions on key issues with voters. Each position can include your stance, detailed explanation, and supporting evidence.
                        </p>
                    </div>

                    <!-- Create/Edit Policy Position Form -->
                    <div class="policy-form-section">
                        <div class="section-header">
                            <h4 class="form-title">📝 Create New Policy Position</h4>
                        </div>
                        <form id="policyPositionForm">
                            <input type="hidden" id="policyCategory" name="categoryId" value="cat_other">
                            <input type="hidden" id="policyStance" name="stance" value="">

                            <div class="form-group">
                                <label for="policyTitle">Position Title *</label>
                                <input type="text" id="policyTitle" name="title" required 
                                       placeholder="e.g., Expanding Healthcare Access Through Community Centers">
                            </div>

                            <div class="form-group">
                                <label for="policySummary">Brief Summary <span style="color: #666; font-size: 0.9rem;">(Optional - AI can generate if left blank)</span></label>
                                <textarea id="policySummary" name="summary" rows="3" 
                                          placeholder="Optionally provide a 1-2 sentence summary, or let AI generate one from your detailed position..."></textarea>
                            </div>

                            <div class="form-group">
                                <label for="policyContent">Detailed Position *</label>
                                <textarea id="policyContent" name="content" required rows="8" 
                                          placeholder="Explain your position in detail, including your reasoning and proposed solutions..."></textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="policyPriority">Priority Level</label>
                                    <select id="policyPriority" name="priority">
                                        <option value="10">Top Priority (10)</option>
                                        <option value="9">Very High (9)</option>
                                        <option value="8">High (8)</option>
                                        <option value="7">Above Average (7)</option>
                                        <option value="6">Moderate-High (6)</option>
                                        <option value="5" selected>Moderate (5)</option>
                                        <option value="4">Moderate-Low (4)</option>
                                        <option value="3">Below Average (3)</option>
                                        <option value="2">Low (2)</option>
                                        <option value="1">Minimal (1)</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="isPublished" checked>
                                        Publish immediately
                                    </label>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="policyKeyPoints">Key Points (one per line)</label>
                                <textarea id="policyKeyPoints" name="keyPoints" rows="4" 
                                          placeholder="• Key point 1&#10;• Key point 2&#10;• Key point 3"></textarea>
                            </div>

                            <div class="form-group">
                                <label for="policyEvidence">Supporting Links (one per line)</label>
                                <textarea id="policyEvidence" name="evidenceLinks" rows="3" 
                                          placeholder="https://example.com/research-study&#10;https://example.com/news-article"></textarea>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="btn primary submit-btn">
                                    Save Position
                                </button>
                                <button type="button" class="btn secondary cancel-btn" style="display: none;" onclick="policyPlatformManager.clearEditMode()">
                                    Cancel Edit
                                </button>
                                <button type="reset" class="btn outline reset-btn">
                                    Clear Form
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Existing Policy Positions -->
                    <div class="existing-positions-section">
                        <div class="section-header">
                            <h4>📊 My Policy Positions</h4>
                        </div>
                        <div id="policyPositionsList" class="policy-positions-list">
                            <div class="loading-message">Loading your policy positions...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
    }

    /**
     * Add component-specific styles
     */
    addStyles() {
        if (document.getElementById('policy-platform-manager-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'policy-platform-manager-styles';
        styles.innerHTML = `
            .policy-platform-manager {
                padding: 1rem;
                max-width: 1200px;
                margin: 0 auto;
            }

            .policy-platform-section {
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .policy-form-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 2rem;
            }

            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }

            .form-group {
                margin-bottom: 1rem;
            }

            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: #333;
            }

            .form-group input,
            .form-group select,
            .form-group textarea {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                font-size: 1rem;
                transition: border-color 0.2s;
            }

            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: #ff6b35;
                box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
            }

            .form-actions {
                display: flex;
                gap: 1rem;
                margin-top: 1.5rem;
            }

            .policy-positions-list {
                min-height: 200px;
            }

            .policy-position-card {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
                border: 1px solid #e9ecef;
                transition: all 0.2s;
            }

            .policy-position-card:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                transform: translateY(-2px);
            }

            .position-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 0.5rem;
            }

            .position-title {
                font-weight: 600;
                color: #333;
                font-size: 1.1rem;
            }

            .position-category {
                display: inline-block;
                padding: 0.25rem 0.5rem;
                background: #e9ecef;
                border-radius: 4px;
                font-size: 0.85rem;
            }

            .position-status {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }

            .status-badge {
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.85rem;
                font-weight: 600;
            }

            .status-published {
                background: #d4edda;
                color: #155724;
            }

            .status-draft {
                background: #fff3cd;
                color: #856404;
            }

            .position-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 1rem;
            }

            .action-btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s;
            }

            .action-btn:hover {
                transform: translateY(-1px);
            }

            .btn-edit {
                background: #007bff;
                color: white;
            }

            .btn-publish {
                background: #28a745;
                color: white;
            }

            .btn-unpublish {
                background: #ffc107;
                color: #333;
            }

            .btn-delete {
                background: #dc3545;
                color: white;
            }

            /* AI-Generated Content Styling */
            .ai-generated-summary {
                font-style: italic;
                color: #666 !important;
                background: #f8f9fa;
                padding: 0.75rem;
                border-radius: 6px;
                border-left: 3px solid #ff6b35;
                margin: 0.5rem 0;
            }

            .ai-generated-summary::before {
                content: "🤖 AI Generated: ";
                font-weight: 600;
                color: #ff6b35;
                font-style: normal;
            }

            .ai-keywords-section {
                margin: 1rem 0;
                padding: 0.75rem;
                background: #f0f7ff;
                border-radius: 6px;
                border: 1px solid #e1f0ff;
            }

            .keywords-label {
                font-size: 0.9rem;
                font-weight: 600;
                color: #333;
                margin-bottom: 0.5rem;
                display: block;
            }

            .keywords-container {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
            }

            .ai-keyword {
                background: #e1f0ff;
                color: #0066cc;
                padding: 0.3rem 0.6rem;
                border-radius: 15px;
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid #b3d9ff;
            }

            .ai-keyword:hover {
                background: #0066cc;
                color: white;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0, 102, 204, 0.3);
            }

            .ai-badge {
                background: #f0f7ff;
                color: #0066cc;
                padding: 0.2rem 0.4rem;
                border-radius: 4px;
                font-size: 0.8rem;
                border: 1px solid #b3d9ff;
            }

            .no-summary {
                color: #999;
                font-style: italic;
            }

            @media (max-width: 768px) {
                .form-row {
                    grid-template-columns: 1fr;
                }

                .form-actions {
                    flex-direction: column;
                }

                .position-actions {
                    flex-wrap: wrap;
                }

                .keywords-container {
                    gap: 0.3rem;
                }

                .ai-keyword {
                    font-size: 0.8rem;
                    padding: 0.25rem 0.5rem;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const form = document.getElementById('policyPositionForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const submitButton = form.querySelector('.submit-btn');
        const originalText = submitButton.textContent;

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            const formData = new FormData(form);
            
            // Process arrays from textarea
            const keyPointsText = formData.get('keyPoints');
            const evidenceText = formData.get('evidenceLinks');
            
            const keyPoints = keyPointsText ? 
                keyPointsText.split('\n').map(p => p.trim()).filter(p => p.length > 0) : [];
            
            const evidenceLinks = evidenceText ? 
                evidenceText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.startsWith('http')) : [];

            const requestData = {
                categoryId: formData.get('categoryId') || 'cat_other', // Default category for AI to override
                title: formData.get('title'),
                summary: formData.get('summary') || '', // Empty summary for AI to generate
                content: formData.get('content'),
                stance: formData.get('stance') || null, // Let AI determine stance
                priority: parseInt(formData.get('priority')) || 5,
                keyPoints: keyPoints,
                evidenceLinks: evidenceLinks,
                isPublished: formData.has('isPublished'),
                aiEnhanced: true // Flag to trigger AI processing
            };

            // Determine if editing or creating
            const isEditing = !!this.editingPositionId;
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing 
                ? `/candidate-policy-platform/positions/${this.editingPositionId}`
                : '/candidate-policy-platform/positions';

            const response = await window.apiCall(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(requestData)
            });

            if (response.ok && response.data?.success) {
                const action = isEditing ? 'updated' : 'saved';
                this.showToast(`Policy position ${action} successfully!`);
                form.reset();
                
                if (isEditing) {
                    this.clearEditMode();
                }
                
                // Reload positions
                setTimeout(() => this.loadPolicyPositions(), 500);
            } else {
                throw new Error(response.data?.error || `Failed to ${isEditing ? 'update' : 'save'} policy position`);
            }

        } catch (error) {
            console.error('Error saving policy position:', error);
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }

    /**
     * Load existing policy positions
     */
    async loadPolicyPositions() {
        try {
            const response = await window.apiCall('/candidate-policy-platform/categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok && response.data?.success) {
                const categories = response.data.data;
                
                // Get user's positions
                const candidateResponse = await window.apiCall(`/candidate-policy-platform/candidate/my-positions`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });

                if (candidateResponse.ok && candidateResponse.data?.success) {
                    this.policyPositions = candidateResponse.data.data || [];
                    this.displayPolicyPositions();
                }
            }
        } catch (error) {
            console.error('Error loading policy positions:', error);
            this.showToast('Failed to load policy positions', 'error');
        }
    }

    /**
     * Display policy positions
     */
    displayPolicyPositions() {
        const container = document.getElementById('policyPositionsList');
        if (!container) return;

        if (this.policyPositions.length === 0) {
            container.innerHTML = `
                <div class="no-positions">
                    <p>You haven't created any policy positions yet.</p>
                    <p>Use the form above to share your stance on important issues.</p>
                </div>
            `;
            return;
        }

        const positionsHTML = this.policyPositions.map(position => `
            <div class="policy-position-card">
                <div class="position-header">
                    <div>
                        <div class="position-category">${position.category?.icon || ''} ${position.category?.name || (position.aiExtractedCategory ? `🤖 ${position.aiExtractedCategory}` : position.categoryId)}</div>
                        <h4 class="position-title">${this.escapeHtml(position.title)}</h4>
                    </div>
                    <div class="position-status">
                        <span class="status-badge ${position.isPublished ? 'status-published' : 'status-draft'}">
                            ${position.isPublished ? '✅ Published' : '📝 Draft'}
                        </span>
                        ${position.version > 1 ? `<span class="version-badge">v${position.version}</span>` : ''}
                        ${position.aiProcessedAt ? '<span class="ai-badge" title="Enhanced with AI analysis">🤖</span>' : ''}
                    </div>
                </div>
                
                <div class="position-summary">
                    ${this.renderPositionSummary(position)}
                </div>
                
                ${this.renderAIKeywords(position)}
                
                ${position.stance || position.aiExtractedStance ? `
                    <div class="position-stance">
                        <strong>Stance:</strong> ${this.getStanceDisplay(position.stance || position.aiExtractedStance)}
                    </div>
                ` : ''}
                
                <div class="position-actions">
                    <button class="action-btn btn-edit" onclick="policyPlatformManager.editPosition('${position.id}')">
                        ✏️ Edit
                    </button>
                    ${position.isPublished ? 
                        `<button class="action-btn btn-unpublish" onclick="policyPlatformManager.togglePublish('${position.id}', false)">
                            📤 Unpublish
                        </button>` :
                        `<button class="action-btn btn-publish" onclick="policyPlatformManager.togglePublish('${position.id}', true)">
                            📢 Publish
                        </button>`
                    }
                    <button class="action-btn btn-delete" onclick="policyPlatformManager.deletePosition('${position.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = positionsHTML;
    }

    /**
     * Edit a policy position
     */
    async editPosition(positionId) {
        try {
            const response = await window.apiCall(`/candidate-policy-platform/positions/${positionId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok || !response.data?.success) {
                throw new Error('Failed to load position for editing');
            }

            const position = response.data.data;
            this.populateForm(position);
            this.editingPositionId = positionId;

            // Update UI for edit mode
            document.querySelector('.form-title').textContent = '✏️ Edit Policy Position';
            document.querySelector('.submit-btn').textContent = 'Update Position';
            document.querySelector('.cancel-btn').style.display = 'inline-block';

            // Scroll to form
            document.querySelector('.policy-form-section')?.scrollIntoView({ behavior: 'smooth' });

            this.showToast('Position loaded for editing');

        } catch (error) {
            console.error('Error loading position:', error);
            this.showToast('Failed to load position for editing', 'error');
        }
    }

    /**
     * Populate form with position data
     */
    populateForm(position) {
        const form = document.getElementById('policyPositionForm');
        if (!form) return;

        // Set form fields
        form.querySelector('[name="categoryId"]').value = position.categoryId || '';
        form.querySelector('[name="title"]').value = position.title || '';
        form.querySelector('[name="summary"]').value = position.summary || '';
        form.querySelector('[name="content"]').value = position.content || '';
        form.querySelector('[name="stance"]').value = position.stance || '';
        form.querySelector('[name="priority"]').value = position.priority || 5;
        
        // Handle arrays
        if (position.keyPoints) {
            form.querySelector('[name="keyPoints"]').value = position.keyPoints.join('\n');
        }
        
        if (position.evidenceLinks) {
            form.querySelector('[name="evidenceLinks"]').value = position.evidenceLinks.join('\n');
        }
        
        // Handle checkbox
        form.querySelector('[name="isPublished"]').checked = position.isPublished || false;
    }

    /**
     * Clear edit mode
     */
    clearEditMode() {
        this.editingPositionId = null;
        
        // Reset form UI
        document.querySelector('.form-title').textContent = '📝 Create New Policy Position';
        document.querySelector('.submit-btn').textContent = 'Save Position';
        document.querySelector('.cancel-btn').style.display = 'none';
        
        // Clear form
        document.getElementById('policyPositionForm')?.reset();
    }

    /**
     * Toggle publish status
     */
    async togglePublish(positionId, publish) {
        try {
            const response = await window.apiCall(`/candidate-policy-platform/positions/${positionId}/publish`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ isPublished: publish })
            });

            if (response.ok && response.data?.success) {
                this.showToast(`Position ${publish ? 'published' : 'unpublished'} successfully!`);
                this.loadPolicyPositions();
            } else {
                throw new Error(response.data?.error || 'Failed to update publish status');
            }
        } catch (error) {
            console.error('Error updating publish status:', error);
            this.showToast('Error: ' + error.message, 'error');
        }
    }

    /**
     * Delete a policy position (soft delete/unpublish)
     */
    async deletePosition(positionId) {
        if (!confirm('Are you sure you want to delete this policy position? This will unpublish it but keep it in your records.')) {
            return;
        }

        try {
            const response = await window.apiCall(`/candidate-policy-platform/positions/${positionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok && response.data?.success) {
                this.showToast('Position deleted successfully!');
                this.loadPolicyPositions();
            } else {
                throw new Error(response.data?.error || 'Failed to delete position');
            }
        } catch (error) {
            console.error('Error deleting position:', error);
            this.showToast('Error: ' + error.message, 'error');
        }
    }

    /**
     * Render position summary with AI-generated styling
     */
    renderPositionSummary(position) {
        const hasUserSummary = position.summary && position.summary.trim();
        const hasAISummary = position.aiGeneratedSummary && position.aiGeneratedSummary.trim();
        
        if (hasUserSummary) {
            return `<p>${this.escapeHtml(position.summary)}</p>`;
        } else if (hasAISummary) {
            return `<p class="ai-generated-summary">${this.escapeHtml(position.aiGeneratedSummary)}</p>`;
        } else {
            return `<p class="no-summary">No summary available</p>`;
        }
    }

    /**
     * Render AI-extracted keywords as clickable elements
     */
    renderAIKeywords(position) {
        if (!position.aiExtractedKeywords || position.aiExtractedKeywords.length === 0) {
            return '';
        }

        const keywordsHTML = position.aiExtractedKeywords.map(keyword => 
            `<span class="ai-keyword" onclick="policyPlatformManager.searchSimilarPositions('${this.escapeHtml(keyword)}')" title="Click to find similar positions">
                ${this.escapeHtml(keyword)}
            </span>`
        ).join('');

        return `
            <div class="ai-keywords-section">
                <span class="keywords-label">🤖 AI Keywords:</span>
                <div class="keywords-container">${keywordsHTML}</div>
            </div>
        `;
    }

    /**
     * Search for positions with similar keywords
     */
    async searchSimilarPositions(keyword) {
        try {
            // For now, show a simple message - this can be enhanced later
            this.showToast(`Searching for positions related to "${keyword}"...`);
            
            // TODO: Implement actual similar position search
            // This would query the backend for positions with similar keywords/embeddings
            console.log(`Searching for positions with keyword: ${keyword}`);
            
        } catch (error) {
            console.error('Error searching similar positions:', error);
            this.showToast('Failed to search similar positions', 'error');
        }
    }

    /**
     * Get display text for stance
     */
    getStanceDisplay(stance) {
        const stances = {
            'SUPPORT': '✅ Support',
            'OPPOSE': '❌ Oppose',
            'NEUTRAL': '🟡 Neutral',
            'CONDITIONAL': '🔄 Conditional'
        };
        return stances[stance] || stance;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Make available globally
window.PolicyPlatformManager = PolicyPlatformManager;