// Enhanced Candidate System Components for United We Rise Frontend
// Integrates with the robust backend candidate system

class CandidateSystem {
    constructor() {
        this.API_BASE = 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api';
        this.currentUser = this.getCurrentUser();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCandidateProfiles();
    }

    getCurrentUser() {
        // Integration with existing auth system
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    setupEventListeners() {
        // Enhanced election display
        document.addEventListener('DOMContentLoaded', () => {
            this.enhanceElectionDisplay();
        });

        // Candidate comparison functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('compare-candidates-btn')) {
                this.showCandidateComparison(e.target.dataset.officeId);
            }
            
            if (e.target.classList.contains('contact-candidate-btn')) {
                this.showContactForm(e.target.dataset.candidateId);
            }

            if (e.target.classList.contains('view-qa-btn')) {
                this.showPublicQA(e.target.dataset.candidateId);
            }
        });
    }

    async loadCandidateProfiles() {
        // Enhance existing election display with AI-powered candidate profiles
        const electionsContainer = document.querySelector('.elections-container') || 
                                   document.querySelector('#elections') ||
                                   document.querySelector('.political-content');
        
        if (electionsContainer) {
            await this.enhanceElectionDisplay();
        }
    }

    async enhanceElectionDisplay() {
        try {
            console.log('🗳️ Loading enhanced election data...');
            
            // Use multi-tier election system
            const response = await fetch(`${this.API_BASE}/elections?state=${this.getUserState()}`);
            const data = await response.json();

            const electionsContainer = this.getOrCreateElectionsContainer();
            
            if (data.elections && data.elections.length > 0) {
                electionsContainer.innerHTML = this.renderEnhancedElections(data);
            } else {
                electionsContainer.innerHTML = this.renderNoElections(data.message);
            }

            // Add source indicator
            this.addDataSourceIndicator(data.source, data.message);

        } catch (error) {
            console.error('Failed to load elections:', error);
            this.showError('Failed to load election data. Please try again.');
        }
    }

    renderEnhancedElections(data) {
        return `
            <div class="enhanced-elections">
                <div class="elections-header">
                    <h2>🗳️ Upcoming Elections</h2>
                    <div class="data-source">
                        <span class="source-badge source-${data.source}">${data.source.toUpperCase()}</span>
                        ${data.message ? `<span class="source-message">${data.message}</span>` : ''}
                    </div>
                </div>
                
                ${data.elections.map(election => this.renderEnhancedElection(election)).join('')}
            </div>
        `;
    }

    renderEnhancedElection(election) {
        return `
            <div class="enhanced-election" data-election-id="${election.id}">
                <div class="election-header">
                    <h3>${election.name}</h3>
                    <div class="election-meta">
                        <span class="election-date">${new Date(election.date).toLocaleDateString()}</span>
                        <span class="election-type">${election.type}</span>
                    </div>
                </div>
                
                <div class="offices-grid">
                    ${election.offices?.map(office => this.renderEnhancedOffice(office)).join('') || 
                      '<p class="no-offices">Office information will be available closer to the election.</p>'}
                </div>
            </div>
        `;
    }

    renderEnhancedOffice(office) {
        const candidateCount = office.candidates?.length || 0;
        
        return `
            <div class="enhanced-office" data-office-id="${office.id}">
                <div class="office-header">
                    <h4>${office.title}</h4>
                    <div class="office-meta">
                        <span class="candidate-count">${candidateCount} candidate${candidateCount !== 1 ? 's' : ''}</span>
                        <span class="office-level">${office.level}</span>
                    </div>
                </div>
                
                ${office.description ? `<p class="office-description">${office.description}</p>` : ''}
                
                ${candidateCount > 0 ? `
                    <div class="candidates-preview">
                        ${office.candidates.slice(0, 3).map(candidate => this.renderCandidateCard(candidate)).join('')}
                        ${candidateCount > 3 ? `<div class="more-candidates">+${candidateCount - 3} more</div>` : ''}
                    </div>
                    
                    <div class="office-actions">
                        ${candidateCount >= 2 ? `
                            <button class="compare-candidates-btn btn-primary" data-office-id="${office.id}">
                                🤖 AI Compare Candidates
                            </button>
                        ` : ''}
                        <button class="view-all-candidates-btn btn-secondary" data-office-id="${office.id}">
                            View All Candidates
                        </button>
                    </div>
                ` : `
                    <div class="no-candidates">
                        <p>Candidate information will be available as campaigns file their paperwork.</p>
                    </div>
                `}
            </div>
        `;
    }

    renderCandidateCard(candidate) {
        return `
            <div class="candidate-card" data-candidate-id="${candidate.id}">
                <div class="candidate-photo">
                    ${candidate.photos?.campaignHeadshot || candidate.photos?.avatar ? 
                        `<img src="${candidate.photos.campaignHeadshot?.url || candidate.photos.avatar?.url}" 
                             alt="${candidate.name}" class="candidate-image">` :
                        `<div class="candidate-placeholder">${candidate.name.charAt(0)}</div>`
                    }
                </div>
                
                <div class="candidate-info">
                    <h5 class="candidate-name">
                        ${candidate.name}
                        ${candidate.isVerified ? '<span class="verified-badge">✓</span>' : ''}
                        ${candidate.isIncumbent ? '<span class="incumbent-badge">Incumbent</span>' : ''}
                    </h5>
                    
                    ${candidate.party ? `<div class="candidate-party">${candidate.party}</div>` : ''}
                    
                    ${candidate.platformSummary ? 
                        `<p class="candidate-summary">${candidate.platformSummary.substring(0, 120)}...</p>` : 
                        '<p class="no-summary">Campaign platform coming soon</p>'
                    }
                    
                    <div class="candidate-actions">
                        <button class="btn-sm btn-primary view-profile-btn" data-candidate-id="${candidate.id}">
                            View Profile
                        </button>
                        <button class="btn-sm btn-outline contact-candidate-btn" data-candidate-id="${candidate.id}">
                            Contact
                        </button>
                    </div>
                </div>
                
                ${candidate.policyPositions && candidate.policyPositions.length > 0 ? `
                    <div class="ai-analysis-indicator">
                        <span class="ai-badge">🤖 AI Analyzed</span>
                        <span class="policy-count">${candidate.policyPositions.length} positions</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async showCandidateComparison(officeId) {
        try {
            console.log('🤖 Loading AI candidate comparison...');
            
            // Get candidates for office
            const candidatesResponse = await fetch(`${this.API_BASE}/candidates/office/${officeId}/enhanced`);
            const candidatesData = await candidatesResponse.json();
            
            if (candidatesData.candidates.length < 2) {
                this.showMessage('At least 2 candidates are required for comparison.');
                return;
            }

            // Show loading modal
            this.showModal('Loading AI Comparison...', this.renderComparisonLoading());

            // Get AI comparison
            const comparisonResponse = await fetch(`${this.API_BASE}/candidates/compare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateIds: candidatesData.candidates.map(c => c.id),
                    officeId: officeId
                })
            });

            const comparisonData = await comparisonResponse.json();
            
            // Show comparison results
            this.showModal('🤖 AI Candidate Comparison', this.renderComparisonResults(comparisonData));

        } catch (error) {
            console.error('Comparison failed:', error);
            this.showError('Failed to generate candidate comparison. The AI service may be unavailable.');
        }
    }

    renderComparisonResults(data) {
        const { comparison, candidates, aiEnabled } = data;
        
        return `
            <div class="candidate-comparison">
                <div class="comparison-header">
                    <h3>Comparing ${candidates.length} Candidates</h3>
                    <div class="ai-status">
                        ${aiEnabled ? 
                            '<span class="ai-enabled">🤖 AI-Powered Analysis</span>' :
                            '<span class="ai-disabled">⚠️ Fallback Analysis</span>'
                        }
                    </div>
                </div>

                <!-- Candidates Overview -->
                <div class="candidates-overview">
                    ${candidates.map(candidate => `
                        <div class="comparison-candidate">
                            <div class="candidate-header">
                                ${candidate.photos?.campaignHeadshot ? 
                                    `<img src="${candidate.photos.campaignHeadshot.url}" alt="${candidate.name}">` :
                                    `<div class="placeholder">${candidate.name.charAt(0)}</div>`
                                }
                                <h4>${candidate.name}</h4>
                                ${candidate.party ? `<span class="party">${candidate.party}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Shared Issues -->
                ${comparison.sharedIssues.length > 0 ? `
                    <div class="shared-issues">
                        <h4>📊 Policy Position Comparisons</h4>
                        ${comparison.sharedIssues.map(issue => this.renderSharedIssue(issue)).join('')}
                    </div>
                ` : ''}

                <!-- Unique Positions -->
                ${comparison.uniqueIssues.length > 0 ? `
                    <div class="unique-issues">
                        <h4>🎯 Unique Policy Positions</h4>
                        ${comparison.uniqueIssues.map(unique => this.renderUniqueIssue(unique)).join('')}
                    </div>
                ` : ''}

                <!-- Overall Summary -->
                <div class="overall-summary">
                    <h4>📋 Overall Summary</h4>
                    <p>${comparison.overallSummary}</p>
                    <small class="generated-time">Generated ${new Date(comparison.generatedAt).toLocaleString()}</small>
                </div>

                <div class="comparison-actions">
                    <button class="btn-primary" onclick="this.closest('.modal').remove()">Close Comparison</button>
                    <button class="btn-outline" onclick="window.print()">Print Comparison</button>
                </div>
            </div>
        `;
    }

    renderSharedIssue(issue) {
        const agreementClass = {
            'agree': 'agreement-high',
            'disagree': 'agreement-low', 
            'mixed': 'agreement-mixed',
            'unclear': 'agreement-unclear'
        }[issue.agreement] || 'agreement-neutral';

        return `
            <div class="shared-issue ${agreementClass}">
                <div class="issue-header">
                    <h5>${issue.issue}</h5>
                    <span class="agreement-badge">${issue.agreement.toUpperCase()}</span>
                </div>
                
                <div class="issue-positions">
                    ${issue.positions.map(position => `
                        <div class="position-item">
                            <div class="candidate-name">${position.candidateName}</div>
                            <div class="position-text">${position.position}</div>
                            <div class="position-meta">
                                <span class="stance stance-${position.stance}">${position.stance.toUpperCase()}</span>
                                <span class="confidence">Confidence: ${Math.round(position.confidence * 100)}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="issue-summary">${issue.summary}</div>
            </div>
        `;
    }

    renderUniqueIssue(unique) {
        return `
            <div class="unique-issue">
                <h5>${unique.candidateName} - Unique Positions</h5>
                <div class="unique-positions">
                    ${unique.issues.map(issue => `
                        <div class="unique-position">
                            <strong>${issue.issue}:</strong> 
                            ${issue.position || issue.defaultMessage || 'Position details not available'}
                            ${issue.defaultMessage ? `
                                <button class="contact-link btn-sm" data-candidate-id="${unique.candidateId}">
                                    Ask Directly
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async showContactForm(candidateId) {
        try {
            // Get candidate info
            const response = await fetch(`${this.API_BASE}/candidates/${candidateId}/enhanced`);
            const data = await response.json();
            
            this.showModal(`Contact ${data.candidate.name}`, this.renderContactForm(data.candidate));
            
        } catch (error) {
            console.error('Failed to load candidate info:', error);
            this.showError('Failed to load candidate information.');
        }
    }

    renderContactForm(candidate) {
        return `
            <div class="candidate-contact-form">
                <div class="candidate-info-header">
                    ${candidate.photos?.campaignHeadshot ? 
                        `<img src="${candidate.photos.campaignHeadshot.url}" alt="${candidate.name}" class="contact-photo">` :
                        `<div class="contact-placeholder">${candidate.name.charAt(0)}</div>`
                    }
                    <div>
                        <h3>${candidate.name}</h3>
                        ${candidate.party ? `<p class="party">${candidate.party}</p>` : ''}
                        <p class="office">${candidate.office.title}</p>
                    </div>
                </div>

                <form id="candidateInquiryForm" class="inquiry-form">
                    <div class="form-group">
                        <label for="inquirySubject">Subject *</label>
                        <input type="text" id="inquirySubject" required 
                               placeholder="e.g., Question about healthcare policy">
                    </div>

                    <div class="form-group">
                        <label for="inquiryCategory">Category</label>
                        <select id="inquiryCategory">
                            <option value="GENERAL">General</option>
                            <option value="HEALTHCARE">Healthcare</option>
                            <option value="EDUCATION">Education</option>
                            <option value="ECONOMY">Economy</option>
                            <option value="ENVIRONMENT">Environment</option>
                            <option value="IMMIGRATION">Immigration</option>
                            <option value="INFRASTRUCTURE">Infrastructure</option>
                            <option value="ENERGY">Energy</option>
                            <option value="CIVIL_RIGHTS">Civil Rights</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="inquiryContent">Your Question *</label>
                        <textarea id="inquiryContent" rows="4" required
                                  placeholder="Ask about their policy positions, voting record, or campaign priorities..."></textarea>
                    </div>

                    ${!this.currentUser ? `
                        <div class="anonymous-inquiry">
                            <label class="checkbox-label">
                                <input type="checkbox" id="isAnonymous"> 
                                Submit anonymously (we'll ask for contact info)
                            </label>
                        </div>

                        <div id="anonymousContactInfo" style="display: none;">
                            <div class="form-group">
                                <label for="contactName">Your Name</label>
                                <input type="text" id="contactName" placeholder="Optional">
                            </div>
                            <div class="form-group">
                                <label for="contactEmail">Email Address *</label>
                                <input type="email" id="contactEmail" required 
                                       placeholder="For response notifications">
                            </div>
                        </div>
                    ` : ''}

                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Send Inquiry</button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    async showPublicQA(candidateId) {
        try {
            const response = await fetch(`${this.API_BASE}/candidate-messages/${candidateId}/public-qa`);
            const data = await response.json();
            
            const candidateResponse = await fetch(`${this.API_BASE}/candidates/${candidateId}`);
            const candidate = await candidateResponse.json();
            
            this.showModal(`${candidate.name} - Public Q&A`, this.renderPublicQA(data, candidate));
            
        } catch (error) {
            console.error('Failed to load public Q&A:', error);
            this.showError('Failed to load public Q&A.');
        }
    }

    renderPublicQA(data, candidate) {
        const { qas, totalCount } = data;
        
        return `
            <div class="public-qa">
                <div class="qa-header">
                    <h3>${candidate.name} - Public Q&A</h3>
                    <p class="qa-count">${totalCount} question${totalCount !== 1 ? 's' : ''} answered</p>
                </div>

                ${qas.length > 0 ? `
                    <div class="qa-list">
                        ${qas.map(qa => this.renderQAItem(qa)).join('')}
                    </div>
                ` : `
                    <div class="no-qa">
                        <p>No public Q&A entries yet. Be the first to ask a question!</p>
                        <button class="btn-primary contact-candidate-btn" data-candidate-id="${candidate.id}">
                            Ask a Question
                        </button>
                    </div>
                `}

                <div class="qa-actions">
                    <button class="btn-primary contact-candidate-btn" data-candidate-id="${candidate.id}">
                        Ask New Question
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
    }

    renderQAItem(qa) {
        return `
            <div class="qa-item ${qa.isPinned ? 'pinned' : ''}" data-qa-id="${qa.id}">
                ${qa.isPinned ? '<div class="pinned-indicator">📌 Pinned</div>' : ''}
                
                <div class="question">
                    <h5>Q: ${qa.question}</h5>
                    <div class="question-meta">
                        <span class="category">${qa.category}</span>
                        <span class="date">${new Date(qa.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                
                <div class="answer">
                    <p><strong>A:</strong> ${qa.answer}</p>
                </div>
                
                <div class="qa-engagement">
                    <div class="voting">
                        ${this.currentUser ? `
                            <button class="vote-btn upvote" data-qa-id="${qa.id}" data-vote="UPVOTE">
                                👍 ${qa.upvotes}
                            </button>
                            <button class="vote-btn downvote" data-qa-id="${qa.id}" data-vote="DOWNVOTE">
                                👎
                            </button>
                        ` : `
                            <span class="vote-count">👍 ${qa.upvotes} upvotes</span>
                        `}
                    </div>
                    <div class="views">👁️ ${qa.views} views</div>
                </div>
            </div>
        `;
    }

    // Utility methods
    getUserState() {
        return localStorage.getItem('userState') || 'CA'; // Default to CA for demo
    }

    getOrCreateElectionsContainer() {
        let container = document.querySelector('.enhanced-elections-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'enhanced-elections-container';
            
            // Find existing political content area
            const target = document.querySelector('.elections-container') || 
                          document.querySelector('#elections') ||
                          document.querySelector('.political-content') ||
                          document.querySelector('.main-content');
            
            if (target) {
                target.appendChild(container);
            } else {
                document.body.appendChild(container);
            }
        }
        return container;
    }

    addDataSourceIndicator(source, message) {
        const indicator = document.querySelector('.data-source-indicator');
        if (indicator) {
            indicator.innerHTML = `
                <span class="source-badge source-${source}">${source.toUpperCase()}</span>
                ${message ? `<span class="message">${message}</span>` : ''}
            `;
        }
    }

    showModal(title, content) {
        // Remove existing modal
        const existingModal = document.querySelector('.candidate-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'candidate-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup form handlers
        this.setupModalEventHandlers(modal);
    }

    setupModalEventHandlers(modal) {
        // Contact form submission
        const form = modal.querySelector('#candidateInquiryForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitInquiry(form);
            });

            // Anonymous checkbox handler
            const anonymousCheckbox = modal.querySelector('#isAnonymous');
            if (anonymousCheckbox) {
                anonymousCheckbox.addEventListener('change', (e) => {
                    const contactInfo = modal.querySelector('#anonymousContactInfo');
                    contactInfo.style.display = e.target.checked ? 'block' : 'none';
                    
                    const emailField = modal.querySelector('#contactEmail');
                    if (emailField) {
                        emailField.required = e.target.checked;
                    }
                });
            }
        }

        // Voting handlers
        modal.addEventListener('click', async (e) => {
            if (e.target.classList.contains('vote-btn')) {
                await this.handleVote(e.target);
            }
            
            if (e.target.classList.contains('contact-candidate-btn')) {
                const candidateId = e.target.dataset.candidateId;
                modal.remove();
                this.showContactForm(candidateId);
            }
        });
    }

    async submitInquiry(form) {
        const formData = new FormData(form);
        const candidateId = form.closest('.candidate-contact-form').dataset.candidateId ||
                           document.querySelector('[data-candidate-id]').dataset.candidateId;

        const inquiryData = {
            subject: formData.get('subject') || document.getElementById('inquirySubject').value,
            content: formData.get('content') || document.getElementById('inquiryContent').value,
            category: formData.get('category') || document.getElementById('inquiryCategory').value,
            isAnonymous: document.getElementById('isAnonymous')?.checked || false,
            contactName: document.getElementById('contactName')?.value,
            contactEmail: document.getElementById('contactEmail')?.value
        };

        try {
            const response = await fetch(`${this.API_BASE}/candidate-messages/${candidateId}/inquiry`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(this.currentUser ? { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } : {})
                },
                body: JSON.stringify(inquiryData)
            });

            if (response.ok) {
                this.showSuccess('Your inquiry has been sent successfully!');
                form.closest('.modal-overlay').remove();
            } else {
                const error = await response.json();
                this.showError(error.message || 'Failed to send inquiry');
            }

        } catch (error) {
            console.error('Inquiry submission failed:', error);
            this.showError('Failed to send inquiry. Please try again.');
        }
    }

    async handleVote(button) {
        if (!this.currentUser) {
            this.showMessage('Please log in to vote on questions.');
            return;
        }

        const qaId = button.dataset.qaId;
        const voteType = button.dataset.vote;
        const candidateId = button.closest('.public-qa').dataset.candidateId;

        try {
            const response = await fetch(`${this.API_BASE}/candidate-messages/${candidateId}/public-qa/${qaId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ voteType })
            });

            if (response.ok) {
                const data = await response.json();
                // Update vote count
                button.textContent = `👍 ${data.netUpvotes}`;
                this.showSuccess('Vote recorded!');
            } else {
                this.showError('Failed to record vote');
            }

        } catch (error) {
            console.error('Vote failed:', error);
            this.showError('Failed to record vote');
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showMessage(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type) {
        // Integration with existing notification system or create simple one
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    renderComparisonLoading() {
        return `
            <div class="comparison-loading">
                <div class="loading-spinner"></div>
                <p>🤖 AI is analyzing candidate positions...</p>
                <p class="loading-detail">This may take a few moments</p>
            </div>
        `;
    }

    renderNoElections(message) {
        return `
            <div class="no-elections">
                <h3>🗳️ No Elections Currently Scheduled</h3>
                <p>${message || 'Election information will be available as election dates are confirmed.'}</p>
                <div class="election-info">
                    <p>Our system automatically checks multiple sources for the most up-to-date election information.</p>
                </div>
            </div>
        `;
    }
}

// Initialize the enhanced candidate system
window.CandidateSystem = CandidateSystem;