// Content reporting and moderation interface for United We Rise
class ContentReporting {
    constructor() {
        this.API_BASE = 'https://api.unitedwerise.org/api';
        this.init();
    }

    init() {
        this.createReportModal();
        this.createModerationStatusBar();
        this.addReportingStyles();
        this.setupGlobalReporting();
    }

    createReportModal() {
        const modalHtml = `
            <div id="reportModal" class="modal report-modal">
                <div class="modal-content report-content">
                    <div class="modal-header">
                        <h2>Report Content</h2>
                        <span class="close" onclick="contentReporting.closeReportModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div id="reportMessage" class="message-container"></div>
                        
                        <div class="report-form">
                            <div class="report-info">
                                <p>Help us maintain a safe and respectful community by reporting inappropriate content.</p>
                                <p><strong>Reporting:</strong> <span id="reportTargetInfo"></span></p>
                            </div>
                            
                            <div class="form-group">
                                <label for="reportReason">What's the issue?</label>
                                <select id="reportReason" class="form-select" onchange="contentReporting.handleReasonChange()">
                                    <option value="">Select a reason...</option>
                                    <option value="SPAM">Spam or misleading content</option>
                                    <option value="HARASSMENT">Harassment or bullying</option>
                                    <option value="HATE_SPEECH">Hate speech or discrimination</option>
                                    <option value="MISINFORMATION">False or misleading information</option>
                                    <option value="INAPPROPRIATE_CONTENT">Inappropriate content</option>
                                    <option value="FAKE_ACCOUNT">Fake or impersonated account</option>
                                    <option value="IMPERSONATION">Impersonation</option>
                                    <option value="COPYRIGHT_VIOLATION">Copyright violation</option>
                                    <option value="VIOLENCE_THREATS">Threats of violence</option>
                                    <option value="SELF_HARM">Self-harm content</option>
                                    <option value="ILLEGAL_CONTENT">Illegal content</option>
                                    <option value="OTHER">Other (please describe)</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="reportDescription">Additional details (optional)</label>
                                <textarea id="reportDescription" class="form-textarea" 
                                    placeholder="Please provide any additional context that might help us understand the issue..."
                                    maxlength="1000"></textarea>
                                <small class="char-count">0 / 1000 characters</small>
                            </div>
                            
                            <div class="report-guidelines">
                                <h4>Reporting Guidelines</h4>
                                <ul>
                                    <li>Only report content that violates our community guidelines</li>
                                    <li>False reports may result in account restrictions</li>
                                    <li>We review all reports within 24-48 hours</li>
                                    <li>You'll receive updates on the status of your report</li>
                                </ul>
                            </div>
                            
                            <div class="report-actions">
                                <button onclick="contentReporting.closeReportModal()" class="btn btn-secondary">
                                    Cancel
                                </button>
                                <button onclick="contentReporting.submitReport()" class="btn btn-primary" id="submitReportBtn">
                                    Submit Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add character counter
        document.getElementById('reportDescription').addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.querySelector('.char-count').textContent = `${count} / 1000 characters`;
        });
    }

    createModerationStatusBar() {
        const statusBarHtml = `
            <div id="moderationStatusBar" class="moderation-status-bar" style="display: none;">
                <div class="status-content">
                    <div class="status-icon">⚠️</div>
                    <div class="status-text">
                        <strong id="statusTitle">Account Status</strong>
                        <p id="statusMessage">Your account has restrictions.</p>
                    </div>
                    <div class="status-actions">
                        <button onclick="contentReporting.showAppealModal()" class="btn btn-sm btn-outline">
                            Appeal
                        </button>
                        <button onclick="contentReporting.hideStatusBar()" class="btn btn-sm btn-text">
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Insert at the top of the page, after any existing top bar
        const topBar = document.querySelector('.top-bar');
        if (topBar) {
            topBar.insertAdjacentHTML('afterend', statusBarHtml);
        } else {
            document.body.insertAdjacentHTML('afterbegin', statusBarHtml);
        }
    }

    addReportingStyles() {
        const styles = `
            <style>
            .report-modal .modal-content {
                max-width: 600px;
                width: 90%;
            }
            
            .report-content {
                padding: 0;
            }
            
            .modal-header {
                padding: 1.5rem 2rem 1rem;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-body {
                padding: 1.5rem 2rem 2rem;
            }
            
            .report-info {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1.5rem;
                border-left: 4px solid #17a2b8;
            }
            
            .form-group {
                margin-bottom: 1.5rem;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: #333;
            }
            
            .form-select, .form-textarea {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 1rem;
                transition: border-color 0.3s ease;
            }
            
            .form-select:focus, .form-textarea:focus {
                outline: none;
                border-color: #4b5c09;
                box-shadow: 0 0 0 2px rgba(75, 92, 9, 0.1);
            }
            
            .form-textarea {
                min-height: 100px;
                resize: vertical;
                font-family: inherit;
            }
            
            .char-count {
                display: block;
                text-align: right;
                color: #666;
                font-size: 0.875rem;
                margin-top: 0.25rem;
            }
            
            .report-guidelines {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 1rem;
                margin: 1.5rem 0;
            }
            
            .report-guidelines h4 {
                margin: 0 0 0.5rem 0;
                color: #856404;
            }
            
            .report-guidelines ul {
                margin: 0;
                padding-left: 1.25rem;
                color: #856404;
            }
            
            .report-guidelines li {
                margin-bottom: 0.25rem;
            }
            
            .report-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
                margin-top: 2rem;
                padding-top: 1rem;
                border-top: 1px solid #eee;
            }
            
            .moderation-status-bar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #fff3cd;
                border-bottom: 1px solid #ffeaa7;
                z-index: 1000;
                padding: 0.75rem 0;
            }
            
            .status-content {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 1rem;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .status-icon {
                font-size: 1.5rem;
                flex-shrink: 0;
            }
            
            .status-text {
                flex: 1;
            }
            
            .status-text strong {
                color: #856404;
                display: block;
                margin-bottom: 0.25rem;
            }
            
            .status-text p {
                margin: 0;
                color: #856404;
                font-size: 0.9rem;
            }
            
            .status-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .btn-sm {
                padding: 0.5rem 1rem;
                font-size: 0.875rem;
            }
            
            .btn-outline {
                background: transparent;
                border: 1px solid #856404;
                color: #856404;
            }
            
            .btn-outline:hover {
                background: #856404;
                color: white;
            }
            
            .btn-text {
                background: none;
                border: none;
                color: #856404;
                text-decoration: underline;
            }
            
            .report-button {
                background: none;
                border: none;
                color: #666;
                font-size: 0.875rem;
                cursor: pointer;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                transition: color 0.3s ease;
            }
            
            .report-button:hover {
                color: #dc3545;
                background: #f8f9fa;
            }
            
            .report-button::before {
                content: "⚠️";
                margin-right: 0.25rem;
            }
            
            /* Adjust main content when status bar is shown */
            body.has-status-bar .top-bar {
                margin-top: 60px;
            }
            
            body.has-status-bar .main-container {
                margin-top: 60px;
            }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupGlobalReporting() {
        // Add report buttons to posts and comments dynamically
        document.addEventListener('click', (e) => {
            if (e.target.matches('.report-button') || e.target.closest('.report-button')) {
                const reportBtn = e.target.closest('.report-button') || e.target;
                const targetType = reportBtn.dataset.targetType;
                const targetId = reportBtn.dataset.targetId;
                const targetInfo = reportBtn.dataset.targetInfo || 'content';
                
                this.showReportModal(targetType, targetId, targetInfo);
            }
        });
    }

    showReportModal(targetType, targetId, targetInfo) {
        this.currentReport = {
            targetType,
            targetId,
            targetInfo
        };
        
        document.getElementById('reportTargetInfo').textContent = targetInfo;
        document.getElementById('reportModal').style.display = 'block';
        
        // Reset form
        document.getElementById('reportReason').value = '';
        document.getElementById('reportDescription').value = '';
        document.querySelector('.char-count').textContent = '0 / 1000 characters';
        document.getElementById('reportMessage').innerHTML = '';
    }

    closeReportModal() {
        document.getElementById('reportModal').style.display = 'none';
        this.currentReport = null;
    }

    handleReasonChange() {
        const reason = document.getElementById('reportReason').value;
        const description = document.getElementById('reportDescription');
        const submitBtn = document.getElementById('submitReportBtn');
        
        if (reason === 'OTHER') {
            description.required = true;
            description.placeholder = 'Please describe the issue in detail...';
        } else {
            description.required = false;
            description.placeholder = 'Please provide any additional context that might help us understand the issue...';
        }
        
        submitBtn.disabled = !reason;
    }

    async submitReport() {
        const reason = document.getElementById('reportReason').value;
        const description = document.getElementById('reportDescription').value.trim();
        
        if (!reason) {
            this.showReportMessage('Please select a reason for reporting', 'error');
            return;
        }
        
        if (reason === 'OTHER' && !description) {
            this.showReportMessage('Please provide a description when selecting "Other"', 'error');
            return;
        }
        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`${this.API_BASE}/moderation/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    targetType: this.currentReport.targetType,
                    targetId: this.currentReport.targetId,
                    reason,
                    description
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showReportMessage('Report submitted successfully. We\'ll review it within 24-48 hours.', 'success');
                
                setTimeout(() => {
                    this.closeReportModal();
                }, 2000);
            } else {
                this.showReportMessage(data.error || 'Failed to submit report', 'error');
            }
        } catch (error) {
            await adminDebugError('Report submission error:', error);
            this.showReportMessage('Network error. Please try again.', 'error');
        }
    }

    showReportMessage(text, type = 'info') {
        const messageContainer = document.getElementById('reportMessage');
        messageContainer.innerHTML = `
            <div class="alert alert-${type}">
                ${text}
            </div>
        `;
    }

    // Add report button to content elements
    addReportButton(element, targetType, targetId, targetInfo) {
        const reportButton = document.createElement('button');
        reportButton.className = 'report-button';
        reportButton.setAttribute('data-target-type', targetType);
        reportButton.setAttribute('data-target-id', targetId);
        reportButton.setAttribute('data-target-info', targetInfo);
        reportButton.textContent = 'Report';
        reportButton.title = 'Report this content';
        
        return reportButton;
    }

    // Check and display user moderation status
    async checkModerationStatus() {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        try {
            const response = await fetch(`${this.API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                
                if (userData.user.isSuspended) {
                    this.showModerationStatus(userData.user);
                }
            }
        } catch (error) {
            await adminDebugError('Failed to check moderation status:', error);
        }
    }

    showModerationStatus(user) {
        const statusBar = document.getElementById('moderationStatusBar');
        const statusTitle = document.getElementById('statusTitle');
        const statusMessage = document.getElementById('statusMessage');
        
        statusTitle.textContent = 'Account Restricted';
        statusMessage.textContent = 'Your account has been temporarily restricted. Some features may be limited.';
        
        statusBar.style.display = 'block';
        document.body.classList.add('has-status-bar');
    }

    hideStatusBar() {
        const statusBar = document.getElementById('moderationStatusBar');
        statusBar.style.display = 'none';
        document.body.classList.remove('has-status-bar');
    }

    showAppealModal() {
        // This would open an appeal submission modal
        alert('Appeal functionality would be implemented here - directing to appeals page');
        // window.location.href = '/appeals';
    }
}

// Initialize content reporting when DOM is ready
function initializeContentReporting() {
    if (document.body) {
        const contentReporting = new ContentReporting();
        // Make it globally available
        window.contentReporting = contentReporting;

        // Check moderation status when auth token is available
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            contentReporting.checkModerationStatus();
        }
    } else {
        // Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', () => {
            const contentReporting = new ContentReporting();
            window.contentReporting = contentReporting;

            const authToken = localStorage.getItem('authToken');
            if (authToken) {
                contentReporting.checkModerationStatus();
            }
        });
    }
}

// Initialize
initializeContentReporting();

// Also check when user logs in
document.addEventListener('userLoggedIn', () => {
    contentReporting.checkModerationStatus();
});