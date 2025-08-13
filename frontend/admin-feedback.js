/**
 * Admin Feedback Dashboard
 * Interface for viewing and managing AI-detected user feedback
 */

class FeedbackDashboard {
    constructor() {
        this.feedback = [];
        this.filteredFeedback = [];
        this.stats = {};
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        // Check if user is authenticated and admin
        await this.checkAdminAccess();
        
        // Load initial data
        await this.loadFeedbackData();
        await this.loadStats();
        
        // Render dashboard
        this.renderStats();
        this.renderFeedback();
        
        // Hide loading message
        document.getElementById('loadingMessage').style.display = 'none';
    }

    async checkAdminAccess() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            if (!currentUser.id) {
                throw new Error('Not authenticated');
            }
            
            // For now, we'll assume the user has admin access
            // In production, you'd want to verify admin status via API
            this.currentUser = currentUser;
            
        } catch (error) {
            this.showError('Admin access required. Please log in as an administrator.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            throw error;
        }
    }

    async loadFeedbackData() {
        try {
            console.log('🔍 Loading feedback data...');
            
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/feedback', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load feedback: ${response.status}`);
            }

            const data = await response.json();
            this.feedback = data.feedback || [];
            this.filteredFeedback = [...this.feedback];
            
            console.log(`📊 Loaded ${this.feedback.length} feedback items`);
            
        } catch (error) {
            console.error('Error loading feedback:', error);
            this.showError(`Failed to load feedback: ${error.message}`);
            
            // For testing, create mock data if API fails
            this.createMockData();
        }
    }

    async loadStats() {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) return;

            const response = await fetch('/api/feedback/stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.stats = await response.json();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.generateStatsFromData();
        }
    }

    createMockData() {
        // Create some mock feedback data for testing
        this.feedback = [
            {
                id: '1',
                content: 'This website is really slow when loading posts. Can you fix the performance issues?',
                author: { username: 'user123', firstName: 'John', lastName: 'Doe' },
                createdAt: new Date().toISOString(),
                feedbackType: 'bug_report',
                feedbackCategory: 'performance',
                feedbackPriority: 'high',
                feedbackConfidence: 0.85,
                feedbackSummary: 'User reports slow post loading performance',
                feedbackStatus: 'new',
                engagement: { likes: 3, comments: 1 }
            },
            {
                id: '2',
                content: 'It would be great if UnitedWeRise had a dark mode feature. The bright background hurts my eyes.',
                author: { username: 'nightowl', firstName: 'Jane', lastName: 'Smith' },
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                feedbackType: 'suggestion',
                feedbackCategory: 'ui_ux',
                feedbackPriority: 'medium',
                feedbackConfidence: 0.75,
                feedbackSummary: 'Request for dark mode theme option',
                feedbackStatus: 'acknowledged',
                engagement: { likes: 8, comments: 3 }
            },
            {
                id: '3',
                content: 'The navigation menu is confusing. I cant find the messages section easily.',
                author: { username: 'confused_user', firstName: 'Bob', lastName: 'Johnson' },
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                feedbackType: 'concern',
                feedbackCategory: 'ui_ux',
                feedbackPriority: 'medium',
                feedbackConfidence: 0.70,
                feedbackSummary: 'Navigation usability concerns',
                feedbackStatus: 'in_progress',
                engagement: { likes: 2, comments: 0 }
            }
        ];
        this.filteredFeedback = [...this.feedback];
        console.log('📝 Using mock feedback data for testing');
    }

    generateStatsFromData() {
        const total = this.feedback.length;
        const byStatus = this.feedback.reduce((acc, item) => {
            acc[item.feedbackStatus || 'new'] = (acc[item.feedbackStatus || 'new'] || 0) + 1;
            return acc;
        }, {});
        
        const highPriority = this.feedback.filter(item => 
            item.feedbackPriority === 'high' || item.feedbackPriority === 'critical'
        ).length;
        
        const avgConfidence = this.feedback.length > 0 
            ? this.feedback.reduce((sum, item) => sum + (item.feedbackConfidence || 0), 0) / this.feedback.length
            : 0;

        this.stats = {
            totalFeedback: total,
            byStatus: byStatus,
            highPriority: highPriority,
            averageConfidence: avgConfidence
        };
    }

    renderStats() {
        this.generateStatsFromData();
        
        document.getElementById('totalFeedback').textContent = this.stats.totalFeedback || 0;
        document.getElementById('newFeedback').textContent = this.stats.byStatus?.new || 0;
        document.getElementById('highPriority').textContent = this.stats.highPriority || 0;
        document.getElementById('avgConfidence').textContent = 
            Math.round((this.stats.averageConfidence || 0) * 100) + '%';
    }

    renderFeedback() {
        const container = document.getElementById('feedbackList');
        
        if (this.filteredFeedback.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <h3>No feedback found</h3>
                    <p>No user feedback matches the current filters, or no feedback has been detected yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredFeedback.map(item => this.renderFeedbackItem(item)).join('');
    }

    renderFeedbackItem(item) {
        const priorityClass = item.feedbackPriority ? `${item.feedbackPriority}-priority` : 'low-priority';
        const typeClass = `badge-${(item.feedbackType || 'suggestion').replace('_', '')}`;
        const categoryClass = `badge-${(item.feedbackCategory || 'general').replace('_', '')}`;
        
        const confidence = Math.round((item.feedbackConfidence || 0) * 100);
        const author = item.author ? `${item.author.firstName || ''} ${item.author.lastName || ''}`.trim() || item.author.username : 'Unknown';
        const createdAt = new Date(item.createdAt).toLocaleDateString();

        return `
            <div class="feedback-item ${priorityClass}" data-id="${item.id}">
                <div class="feedback-header">
                    <div class="feedback-meta">
                        <span class="feedback-badge ${typeClass}">
                            ${(item.feedbackType || 'suggestion').replace('_', ' ').toUpperCase()}
                        </span>
                        ${item.feedbackCategory ? `<span class="feedback-badge ${categoryClass}">${item.feedbackCategory.replace('_', ' ').toUpperCase()}</span>` : ''}
                        <span class="feedback-badge" style="background: #f5f5f5; color: #666;">
                            ${item.feedbackPriority || 'low'} priority
                        </span>
                        <span class="feedback-badge" style="background: #f0f8ff; color: #4682b4;">
                            ${confidence}% confidence
                        </span>
                    </div>
                    <div style="text-align: right; font-size: 0.9rem; color: #666;">
                        <div>${author}</div>
                        <div>${createdAt}</div>
                    </div>
                </div>
                
                <div class="feedback-content">
                    "${item.content}"
                </div>
                
                ${item.feedbackSummary ? `
                    <div style="background: #e8f4fd; padding: 0.75rem; border-radius: 4px; margin: 0.5rem 0;">
                        <strong>AI Summary:</strong> ${item.feedbackSummary}
                    </div>
                ` : ''}
                
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidence}%"></div>
                </div>
                
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                    👍 ${item.engagement?.likes || 0} likes • 💬 ${item.engagement?.comments || 0} comments
                    ${item.feedbackStatus !== 'new' ? `• Status: ${item.feedbackStatus.replace('_', ' ')}` : ''}
                </div>
                
                <div class="feedback-actions">
                    ${item.feedbackStatus === 'new' ? `
                        <button class="btn-small btn-acknowledge" onclick="updateFeedbackStatus('${item.id}', 'acknowledged')">
                            👀 Acknowledge
                        </button>
                    ` : ''}
                    ${item.feedbackStatus !== 'resolved' && item.feedbackStatus !== 'dismissed' ? `
                        <button class="btn-small btn-resolve" onclick="updateFeedbackStatus('${item.id}', 'resolved')">
                            ✅ Mark Resolved
                        </button>
                        <button class="btn-small btn-dismiss" onclick="updateFeedbackStatus('${item.id}', 'dismissed')">
                            ❌ Dismiss
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    applyFilters() {
        const typeFilter = document.getElementById('typeFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        this.filteredFeedback = this.feedback.filter(item => {
            if (typeFilter && item.feedbackType !== typeFilter) return false;
            if (categoryFilter && item.feedbackCategory !== categoryFilter) return false;
            if (priorityFilter && item.feedbackPriority !== priorityFilter) return false;
            if (statusFilter && item.feedbackStatus !== statusFilter) return false;
            return true;
        });

        this.renderFeedback();
        this.renderStats();
    }

    async updateFeedbackStatus(feedbackId, newStatus) {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`/api/feedback/${feedbackId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            // Update local data
            const item = this.feedback.find(f => f.id === feedbackId);
            if (item) {
                item.feedbackStatus = newStatus;
            }

            // Re-render
            this.applyFilters();
            this.showSuccess(`Status updated to "${newStatus.replace('_', ' ')}"`);

        } catch (error) {
            console.error('Error updating status:', error);
            this.showError('Failed to update status: ' + error.message);
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        // Create temporary success message
        const successElement = document.createElement('div');
        successElement.className = 'success';
        successElement.style.cssText = 'background: #e8f5e8; color: #388e3c; padding: 1rem; border-radius: 6px; margin: 1rem 0;';
        successElement.textContent = message;
        
        const dashboard = document.querySelector('.feedback-dashboard');
        dashboard.insertBefore(successElement, dashboard.firstChild);
        
        setTimeout(() => {
            successElement.remove();
        }, 3000);
    }

    async refreshFeedback() {
        document.getElementById('loadingMessage').style.display = 'block';
        await this.loadFeedbackData();
        await this.loadStats();
        this.applyFilters();
        document.getElementById('loadingMessage').style.display = 'none';
    }
}

// Global functions for HTML onclick handlers
function applyFilters() {
    window.feedbackDashboard.applyFilters();
}

function updateFeedbackStatus(feedbackId, newStatus) {
    window.feedbackDashboard.updateFeedbackStatus(feedbackId, newStatus);
}

function refreshFeedback() {
    window.feedbackDashboard.refreshFeedback();
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.feedbackDashboard = new FeedbackDashboard();
});