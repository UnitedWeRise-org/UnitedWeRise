/**
 * @module integrations/elections-system-integration
 * @description Elections System Integration for United We Rise Frontend
 * This script enhances the upcoming elections panel to use the main content area effectively
 * Migrated to ES6 modules: October 11, 2025 (Batch 9)
 */

class ElectionsSystemIntegration {
    constructor() {
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('ElectionsSystem', 'Initializing enhanced elections system integration...');
        }
        
        // Load CSS styles
        this.loadElectionsSystemStyles();
        
        // Enhance elections navigation
        this.addElectionsNavigation();
        
        // Setup sidebar state monitoring
        this.setupSidebarMonitoring();
        
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('ElectionsSystem', 'Elections system integration complete!');
        }
    }

    loadElectionsSystemStyles() {
        // Check if styles are already loaded
        if (document.querySelector('#elections-system-styles')) {
            return;
        }

        const link = document.createElement('link');
        link.id = 'elections-system-styles';
        link.rel = 'stylesheet';
        link.href = 'src/styles/elections-system.css';
        document.head.appendChild(link);
    }

    addElectionsNavigation() {
        // Elections button now handled by navigation-handlers.js via data-action="show-elections"
        // No need to enhance button here - navigation system calls toggleElectionsPanel() directly
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('ElectionsSystem', 'Elections navigation ready (handled by navigation system)');
        }
    }

    toggleElectionsPanel() {
        adminDebugLog('📅 Opening Elections in main content area...');
        
        // Hide other detail panels
        document.querySelectorAll('.detail-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        // Hide existing info panels
        document.querySelectorAll('.info-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        // Hide other main view systems when opening Elections
        const civicOrganizing = document.querySelector('.civic-organizing-container');
        if (civicOrganizing) {
            civicOrganizing.style.display = 'none';
        }
        
        const candidatesView = document.querySelector('.candidates-main-view');
        if (candidatesView) {
            candidatesView.style.display = 'none';
        }
        
        const officialsView = document.querySelector('.officials-main-view');
        if (officialsView) {
            officialsView.style.display = 'none';
        }

        // Get main content area
        const mainContent = document.querySelector('#mainContent') || 
                           document.querySelector('.main') ||
                           document.querySelector('main');
        
        if (!mainContent) {
            adminDebugError('Main content area not found');
            return;
        }

        // Clear existing content and show elections
        this.showElectionsMainView(mainContent);
    }

    showElectionsMainView(mainContent) {
        // Store original content so we can restore it later (use namespaced key to avoid collision)
        if (!mainContent.dataset.electionsOriginal) {
            mainContent.dataset.electionsOriginal = mainContent.innerHTML;
        }

        // Create full-width elections interface
        mainContent.innerHTML = `
            <div class="elections-main-view">
                <div class="elections-header">
                    <div class="header-content">
                        <h1>📅 Upcoming Elections & Contests</h1>
                        <p class="subtitle">Stay informed about all elections in your area</p>
                        <div class="header-actions">
                            <button class="header-btn primary" onclick="electionsSystemIntegration.loadElections()">
                                🔄 Refresh Elections
                            </button>
                            <button class="header-btn secondary" onclick="electionsSystemIntegration.showVotingInfo()">
                                🗳️ Voter Guide
                            </button>
                            <button class="header-btn secondary" onclick="electionsSystemIntegration.restoreMainContent()">
                                ← Back to Map
                            </button>
                        </div>
                    </div>
                </div>

                <div class="elections-content">
                    <div class="content-grid">
                        <!-- Feature Cards -->
                        <div class="feature-cards">
                            <div class="feature-card calendar">
                                <div class="card-icon">📅</div>
                                <h3>Election Calendar</h3>
                                <p>View upcoming elections and important dates</p>
                                <div class="card-features">
                                    <span class="feature-tag">Primary Dates</span>
                                    <span class="feature-tag">General Elections</span>
                                    <span class="feature-tag">Local Contests</span>
                                </div>
                            </div>

                            <div class="feature-card voter-guide">
                                <div class="card-icon">📋</div>
                                <h3>Voter Guide</h3>
                                <p>Comprehensive information about candidates and issues</p>
                                <div class="card-features">
                                    <span class="feature-tag">Candidate Profiles</span>
                                    <span class="feature-tag">Ballot Measures</span>
                                    <span class="feature-tag">Sample Ballots</span>
                                </div>
                            </div>

                            <div class="feature-card registration">
                                <div class="card-icon">✅</div>
                                <h3>Voter Registration</h3>
                                <p>Check registration status and polling locations</p>
                                <div class="card-features">
                                    <span class="feature-tag">Status Check</span>
                                    <span class="feature-tag">Polling Places</span>
                                    <span class="feature-tag">Early Voting</span>
                                </div>
                            </div>

                            <div class="feature-card reminders">
                                <div class="card-icon">🔔</div>
                                <h3>Election Reminders</h3>
                                <p>Get notified about upcoming elections and deadlines</p>
                                <div class="card-features">
                                    <span class="feature-tag">Email Alerts</span>
                                    <span class="feature-tag">SMS Reminders</span>
                                    <span class="feature-tag">Calendar Sync</span>
                                </div>
                            </div>
                        </div>

                        <!-- Elections Content Area -->
                        <div class="elections-data">
                            <div class="content-header">
                                <h2>Elections in Your Area</h2>
                                <div class="loading-indicator" id="electionsLoading" style="display: none;">
                                    <div class="spinner"></div>
                                    <span>Loading elections data...</span>
                                </div>
                            </div>
                            <div class="elections-container" id="enhancedElectionsContainer">
                                <div class="elections-placeholder">
                                    <div class="placeholder-icon">📅</div>
                                    <h3>Ready to Load Elections</h3>
                                    <p>Click "Refresh Elections" to see upcoming contests in your area</p>
                                    <p class="address-note">Ensure your address is set for personalized results</p>
                                    <button class="placeholder-btn" onclick="electionsSystemIntegration.loadElections()">
                                        Load Elections Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add comprehensive styles for the main view
        this.addElectionsMainViewStyles();

        // Update panel positioning based on current sidebar state
        this.updatePanelForSidebarState();

        // Adjust map if needed (make it smaller/overlay)
        this.adjustMapForElectionsView();
    }

    async loadElections() {
        adminDebugLog('🔄 Loading enhanced elections from backend API...');
        
        // Show loading indicator
        const loadingIndicator = document.querySelector('#electionsLoading');
        const placeholder = document.querySelector('.elections-placeholder');
        
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (placeholder) placeholder.style.display = 'none';
        
        try {
            // Get user's location for personalized results
            const userState = this.getUserState() || 'CA'; // Default to CA if no location
            
            // Fetch real election data from backend
            const response = await fetch(`/api/elections/calendar?state=${userState}&limit=50`);
            
            if (!response.ok) {
                throw new Error(`Elections API returned ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch elections');
            }
            
            // Display the real election data
            this.displayElectionsData(data.data.elections);
            
        } catch (error) {
            adminDebugError('Failed to load elections:', error);

            // Show proper error message instead of falling back to obsolete mock data
            this.showElectionsError('Unable to load election data. Please try again later.');
        } finally {
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    getUserState() {
        // Try to get user's state from their profile or localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        if (currentUser.state) {
            return currentUser.state;
        }
        
        // Try to get from user's location data
        const userLocation = localStorage.getItem('userLocation');
        if (userLocation) {
            try {
                const location = JSON.parse(userLocation);
                return location.state;
            } catch (e) {
                adminDebugLog('Could not parse user location');
            }
        }
        
        return null; // Will default to CA in loadElections
    }

    displayElectionsData(elections) {
        const container = document.querySelector('#enhancedElectionsContainer');
        
        if (!container) {
            adminDebugError('Elections container not found');
            return;
        }
        
        if (!elections || elections.length === 0) {
            container.innerHTML = `
                <div class="elections-error">
                    <div class="error-icon">📅</div>
                    <h3>No Upcoming Elections</h3>
                    <p>There are no elections scheduled in your area at this time.</p>
                    <div class="error-actions">
                        <button class="error-btn" onclick="electionsSystemIntegration.loadElections()">
                            Check Again
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Group elections by level
        const electionsByLevel = {
            FEDERAL: elections.filter(e => e.level === 'FEDERAL'),
            STATE: elections.filter(e => e.level === 'STATE'),
            LOCAL: elections.filter(e => e.level === 'LOCAL')
        };

        let enhancedHTML = '<div class="elections-enhanced">';
        
        // Display each level that has elections
        Object.entries(electionsByLevel).forEach(([level, levelElections]) => {
            if (levelElections.length > 0) {
                const levelIcon = this.getIconForLevel(level);
                const levelName = level.charAt(0) + level.slice(1).toLowerCase();
                
                enhancedHTML += `
                    <div class="level-group">
                        <div class="level-header">
                            <div class="level-info">
                                <div class="level-icon">${levelIcon}</div>
                                <div>
                                    <h3>${levelName} Elections</h3>
                                    <span class="level-timeframe">Upcoming contests</span>
                                </div>
                            </div>
                            <span class="contest-count">${levelElections.length} elections</span>
                        </div>
                        <div class="contests-grid">
                `;
                
                levelElections.forEach(election => {
                    const electionDate = new Date(election.date);
                    const statusClass = this.getStatusClassFromDate(electionDate);
                    const statusText = this.getStatusTextFromDate(electionDate);
                    
                    enhancedHTML += `
                        <div class="contest-card election-card" data-election-id="${election.id}">
                            <div class="contest-header">
                                <div class="contest-icon">${this.getElectionIcon(election.type)}</div>
                                <div class="contest-details">
                                    <div class="contest-name">${election.name}</div>
                                    <div class="contest-type">${election.type} Election</div>
                                    <div class="contest-location">${election.city || election.county || election.state}</div>
                                </div>
                                <div class="contest-status ${statusClass}">${statusText}</div>
                            </div>
                            <div class="contest-info">
                                <div class="contest-date">
                                    <strong>Election Date:</strong> ${electionDate.toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </div>
                                ${election.registrationDeadline ? `
                                    <div class="registration-deadline">
                                        <strong>Registration Deadline:</strong> ${new Date(election.registrationDeadline).toLocaleDateString()}
                                    </div>
                                ` : ''}
                                ${election.description ? `
                                    <div class="election-description">${election.description}</div>
                                ` : ''}
                            </div>
                            <div class="contest-actions">
                                <button class="action-btn primary" onclick="electionsSystemIntegration.viewElectionDetails('${election.id}')">
                                    View Details
                                </button>
                                ${election.offices.length > 0 ? `
                                    <button class="action-btn secondary" onclick="electionsSystemIntegration.viewCandidates('${election.id}')">
                                        See Candidates (${election.offices.reduce((total, office) => total + office.candidates.length, 0)})
                                    </button>
                                ` : ''}
                                ${election.ballotMeasures.length > 0 ? `
                                    <button class="action-btn secondary" onclick="electionsSystemIntegration.viewBallotMeasures('${election.id}')">
                                        Ballot Measures (${election.ballotMeasures.length})
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
                
                enhancedHTML += `
                        </div>
                    </div>
                `;
            }
        });
        
        enhancedHTML += '</div>';
        
        // Add summary stats
        const totalElections = elections.length;
        const totalCandidates = elections.reduce((total, election) => 
            total + election.offices.reduce((officeTotal, office) => officeTotal + office.candidates.length, 0), 0
        );
        const totalBallotMeasures = elections.reduce((total, election) => total + election.ballotMeasures.length, 0);
        
        const summaryHTML = `
            <div class="elections-summary">
                <h2>Elections Summary</h2>
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-number">${totalElections}</div>
                        <div class="stat-label">Upcoming Elections</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${totalCandidates}</div>
                        <div class="stat-label">Candidates</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${totalBallotMeasures}</div>
                        <div class="stat-label">Ballot Measures</div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = summaryHTML + enhancedHTML;
        adminDebugLog(`✅ Displayed ${totalElections} real elections from backend API`);
    }

    getElectionIcon(electionType) {
        switch (electionType) {
            case 'PRIMARY': return '🗳️';
            case 'GENERAL': return '📊';
            case 'SPECIAL': return '⚡';
            case 'MUNICIPAL': return '🏛️';
            default: return '📅';
        }
    }

    getStatusClassFromDate(electionDate) {
        const now = new Date();
        const timeDiff = electionDate - now;
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 30) return 'upcoming';
        if (daysDiff <= 90) return 'active';
        return 'future';
    }

    getStatusTextFromDate(electionDate) {
        const now = new Date();
        const timeDiff = electionDate - now;
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 7) return `${daysDiff} days`;
        if (daysDiff <= 30) return `${Math.ceil(daysDiff / 7)} weeks`;
        if (daysDiff <= 90) return `${Math.ceil(daysDiff / 30)} months`;
        return 'Future';
    }

    // Election detail methods
    async viewElectionDetails(electionId) {
        adminDebugLog(`📊 Viewing details for election: ${electionId}`);
        
        try {
            const response = await fetch(`/api/elections/${electionId}`);
            if (response.ok) {
                const data = await response.json();
                this.showElectionModal(data);
            } else {
                adminDebugError('Failed to fetch election details');
            }
        } catch (error) {
            adminDebugError('Error fetching election details:', error);
        }
    }

    async viewCandidates(electionId) {
        adminDebugLog(`👥 Viewing candidates for election: ${electionId}`);
        
        try {
            const response = await fetch(`/api/elections/${electionId}/candidates`);
            if (response.ok) {
                const data = await response.json();
                this.showCandidatesModal(data);
            } else {
                adminDebugError('Failed to fetch candidates');
            }
        } catch (error) {
            adminDebugError('Error fetching candidates:', error);
        }
    }

    async viewBallotMeasures(electionId) {
        adminDebugLog(`📋 Viewing ballot measures for election: ${electionId}`);
        
        // For now, show a simple alert - could be expanded to a modal
        alert('Ballot measures details coming soon!');
    }

    showElectionModal(electionData) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'elections-modal';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${electionData.name}</h3>
                    <button class="modal-close" onclick="this.closest('.elections-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="election-details">
                        <p><strong>Date:</strong> ${new Date(electionData.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</p>
                        <p><strong>Type:</strong> ${electionData.type}</p>
                        <p><strong>Level:</strong> ${electionData.level}</p>
                        ${electionData.description ? `<p><strong>Description:</strong> ${electionData.description}</p>` : ''}
                        ${electionData.officialUrl ? `<p><strong>Official Info:</strong> <a href="${electionData.officialUrl}" target="_blank">Visit Official Website</a></p>` : ''}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showCandidatesModal(candidatesData) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'elections-modal';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>Candidates - ${candidatesData.election.name}</h3>
                    <button class="modal-close" onclick="this.closest('.elections-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="candidates-list">
                        ${candidatesData.candidates.map(candidate => `
                            <div class="candidate-card">
                                <div class="candidate-header">
                                    <h4>${candidate.name}</h4>
                                    ${candidate.party ? `<span class="party-badge">${candidate.party}</span>` : ''}
                                    ${candidate.isIncumbent ? '<span class="incumbent-badge">Incumbent</span>' : ''}
                                </div>
                                ${candidate.platformSummary ? `<p class="platform">${candidate.platformSummary}</p>` : ''}
                                ${candidate.campaignWebsite ? `<a href="${candidate.campaignWebsite}" target="_blank" class="campaign-link">Campaign Website</a>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    enhanceElectionsDisplay(originalPanel) {
        const container = document.querySelector('#enhancedElectionsContainer');
        
        if (!container || !originalPanel) {
            adminDebugLog('Elections containers not found');
            return;
        }

        // Parse and enhance the elections content
        this.parseAndEnhanceElections(originalPanel, container);
    }

    parseAndEnhanceElections(originalPanel, container) {
        // Get the original elections structure
        const levels = originalPanel.querySelectorAll('details');
        
        if (levels.length === 0) {
            container.innerHTML = `
                <div class="elections-error">
                    <div class="error-icon">⚠️</div>
                    <h3>No Election Data</h3>
                    <p>Election information is not currently available.</p>
                    <div class="error-actions">
                        <button class="error-btn" onclick="electionsSystemIntegration.loadElections()">
                            Try Again
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        let enhancedHTML = '<div class="elections-enhanced">';
        
        levels.forEach(level => {
            const levelTitle = level.querySelector('summary')?.textContent || 'Elections';
            const contests = level.querySelectorAll('li a');
            
            // Create timeline based on level
            const timeframe = this.getTimeframeForLevel(levelTitle);
            const levelIcon = this.getIconForLevel(levelTitle);
            
            enhancedHTML += `
                <div class="level-group">
                    <div class="level-header">
                        <div class="level-info">
                            <div class="level-icon">${levelIcon}</div>
                            <div>
                                <h3>${levelTitle} Elections</h3>
                                <span class="level-timeframe">${timeframe}</span>
                            </div>
                        </div>
                        <span class="contest-count">${contests.length} contests</span>
                    </div>
                    <div class="contests-grid">
            `;
            
            contests.forEach(contest => {
                const contestName = contest.textContent;
                const contestType = this.categorizeContest(contestName);
                const nextElection = this.getNextElectionDate(contestName, levelTitle);
                
                enhancedHTML += `
                    <div class="contest-card">
                        <div class="contest-header">
                            <div class="contest-icon">
                                ${this.getContestIcon(contestName)}
                            </div>
                            <div class="contest-info">
                                <h4 class="contest-name">${contestName}</h4>
                                <p class="contest-type">${contestType}</p>
                                <span class="contest-level">${levelTitle}</span>
                            </div>
                        </div>
                        <div class="contest-details">
                            <div class="election-date">
                                <strong>Next Election:</strong> ${nextElection}
                            </div>
                            <div class="contest-status">
                                <span class="status-badge ${this.getStatusClass(nextElection)}">
                                    ${this.getStatusText(nextElection)}
                                </span>
                            </div>
                        </div>
                        <div class="contest-actions">
                            <button class="action-btn primary" onclick="electionsSystemIntegration.viewCandidates('${contestName}')">
                                👥 Candidates
                            </button>
                            <button class="action-btn secondary" onclick="electionsSystemIntegration.getVotingInfo('${contestName}')">
                                ℹ️ Voting Info
                            </button>
                        </div>
                    </div>
                `;
            });
            
            enhancedHTML += `
                    </div>
                </div>
            `;
        });
        
        enhancedHTML += '</div>';
        container.innerHTML = enhancedHTML;
    }

    getTimeframeForLevel(level) {
        const now = new Date();
        const year = now.getFullYear();
        
        switch (level.toLowerCase()) {
            case 'local':
                return 'Various dates throughout the year';
            case 'state':
                return `${year} & ${year + 1}`;
            case 'national':
                return `Next: November ${year % 2 === 0 ? year : year + 1}`;
            default:
                return 'Check specific dates';
        }
    }

    getIconForLevel(level) {
        switch (level.toLowerCase()) {
            case 'local': return '🏙️';
            case 'state': return '🏛️';
            case 'national': return '🇺🇸';
            default: return '📅';
        }
    }

    categorizeContest(contestName) {
        const name = contestName.toLowerCase();
        if (name.includes('mayor')) return 'Executive Office';
        if (name.includes('council')) return 'Legislative Body';
        if (name.includes('board')) return 'Administrative Board';
        if (name.includes('governor')) return 'State Executive';
        if (name.includes('senate')) return 'Upper Chamber';
        if (name.includes('house')) return 'Lower Chamber';
        if (name.includes('president')) return 'Federal Executive';
        return 'Elected Position';
    }

    getNextElectionDate(contestName, level) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        // Simplified election date logic
        if (level.toLowerCase() === 'national') {
            const isEvenYear = year % 2 === 0;
            const nextElectionYear = isEvenYear ? year : year + 1;
            return `November ${nextElectionYear}`;
        } else if (level.toLowerCase() === 'state') {
            return `November ${year}`;
        } else {
            // Local elections vary
            const months = ['March', 'May', 'November'];
            const randomMonth = months[Math.floor(Math.random() * months.length)];
            return `${randomMonth} ${year}`;
        }
    }

    getContestIcon(contestName) {
        const name = contestName.toLowerCase();
        if (name.includes('mayor')) return '👔';
        if (name.includes('council')) return '🏛️';
        if (name.includes('board')) return '📋';
        if (name.includes('governor')) return '🎯';
        if (name.includes('senate')) return '⚖️';
        if (name.includes('house')) return '🏛️';
        if (name.includes('president')) return '🇺🇸';
        return '📊';
    }

    getStatusClass(electionDate) {
        // Simple status based on keywords
        if (electionDate.includes('November 2024') || electionDate.includes('March') || electionDate.includes('May')) {
            return 'upcoming';
        }
        return 'future';
    }

    getStatusText(electionDate) {
        if (electionDate.includes('November 2024')) return 'Coming Soon';
        if (electionDate.includes('March') || electionDate.includes('May')) return 'This Year';
        return 'Future';
    }

    showElectionsError(message) {
        const container = document.querySelector('#enhancedElectionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="elections-error">
                    <div class="error-icon">⚠️</div>
                    <h3>Unable to Load Elections</h3>
                    <p>${message}</p>
                    <div class="error-actions">
                        <button class="error-btn" onclick="electionsSystemIntegration.loadElections()">
                            Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    }

    addElectionsMainViewStyles() {
        // Check if styles already added
        if (document.querySelector('#elections-main-view-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'elections-main-view-styles';
        style.textContent = `
            .elections-main-view {
                left: 3.5vw;
                right: 26%;
                height: calc(100vh - 6vh);
                position: fixed;
                top: 6vh;
                background: #f5f5f5;
                overflow-y: auto;
                z-index: 15;
                box-sizing: border-box;
                transition: left 0.3s ease;
            }

            .elections-main-view.sidebar-expanded {
                left: 10.5vw;
            }

            .elections-header {
                background: linear-gradient(135deg, #8b0000, #dc143c);
                color: white;
                padding: 2rem 2rem 1.5rem 2rem;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }

            .elections-header .header-content h1 {
                margin: 0 0 0.5rem 0;
                font-size: 2.5rem;
                font-weight: 600;
            }

            .elections-header .subtitle {
                margin: 0 0 1.5rem 0;
                font-size: 1.1rem;
                opacity: 0.9;
                font-weight: 300;
            }

            .elections-header .header-actions {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
            }

            .header-btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.95rem;
            }

            .header-btn.primary {
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
            }

            .header-btn.primary:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-1px);
            }

            .header-btn.secondary {
                background: transparent;
                color: white;
                border: 1px solid rgba(255,255,255,0.5);
            }

            .header-btn.secondary:hover {
                background: rgba(255,255,255,0.1);
                border-color: white;
            }

            .elections-content {
                padding: 2rem;
            }

            .content-grid {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 2rem;
                min-height: 600px;
            }

            .feature-cards {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                height: fit-content;
            }

            .feature-card {
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: transform 0.2s, box-shadow 0.2s;
                border-left: 4px solid #8b0000;
            }

            .feature-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            }

            .card-icon {
                font-size: 2.5rem;
                margin-bottom: 0.75rem;
            }

            .feature-card h3 {
                margin: 0 0 0.5rem 0;
                color: #8b0000;
                font-size: 1.2rem;
            }

            .feature-card p {
                margin: 0 0 1rem 0;
                color: #666;
                line-height: 1.4;
                font-size: 0.9rem;
            }

            .card-features {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }

            .feature-tag {
                background: #ffebee;
                color: #8b0000;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .elections-data {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .content-header {
                background: #f8f9fa;
                padding: 1.5rem;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .content-header h2 {
                margin: 0;
                color: #8b0000;
                font-size: 1.5rem;
            }

            .loading-indicator {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                color: #666;
                font-size: 0.9rem;
            }

            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #8b0000;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .elections-placeholder, .elections-error {
                text-align: center;
                padding: 4rem 2rem;
                color: #666;
            }

            .placeholder-icon, .error-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }

            .elections-placeholder h3, .elections-error h3 {
                margin: 0 0 0.5rem 0;
                color: #8b0000;
                font-size: 1.5rem;
            }

            .elections-placeholder p, .elections-error p {
                margin: 0 0 1rem 0;
                font-size: 1rem;
                line-height: 1.4;
            }

            .address-note {
                font-size: 0.9rem;
                color: #888;
                font-style: italic;
            }

            .placeholder-btn, .error-btn {
                padding: 1rem 2rem;
                background: linear-gradient(135deg, #8b0000, #dc143c);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                margin: 0.5rem;
            }

            .placeholder-btn:hover, .error-btn:hover {
                background: linear-gradient(135deg, #660000, #8b0000);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            .elections-enhanced {
                padding: 1rem;
            }

            .level-group {
                margin-bottom: 2rem;
            }

            .level-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                padding: 1rem;
                background: linear-gradient(135deg, #8b0000, #dc143c);
                color: white;
                border-radius: 8px;
            }

            .level-info {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .level-icon {
                font-size: 2rem;
            }

            .level-header h3 {
                margin: 0;
                font-size: 1.4rem;
            }

            .level-timeframe {
                font-size: 0.9rem;
                opacity: 0.9;
            }

            .contest-count {
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.85rem;
                font-weight: 500;
            }

            .contests-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                gap: 1rem;
            }

            .contest-card {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 1.5rem;
                transition: all 0.2s;
            }

            .contest-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                border-color: #8b0000;
            }

            .contest-header {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .contest-icon {
                font-size: 2rem;
                width: 3rem;
                height: 3rem;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #8b0000;
                color: white;
                border-radius: 50%;
            }

            .contest-info {
                flex: 1;
            }

            .contest-name {
                margin: 0 0 0.25rem 0;
                color: #8b0000;
                font-size: 1.1rem;
                font-weight: 600;
            }

            .contest-type {
                margin: 0 0 0.25rem 0;
                color: #666;
                font-size: 0.9rem;
            }

            .contest-level {
                background: #e9ecef;
                color: #495057;
                padding: 0.2rem 0.5rem;
                border-radius: 10px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .contest-details {
                margin-bottom: 1rem;
                font-size: 0.9rem;
            }

            .election-date {
                margin-bottom: 0.5rem;
                color: #333;
            }

            .contest-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .status-badge {
                padding: 0.2rem 0.6rem;
                border-radius: 10px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .status-badge.upcoming {
                background: #fff3cd;
                color: #856404;
            }

            .status-badge.future {
                background: #d1ecf1;
                color: #0c5460;
            }

            .contest-actions {
                display: flex;
                gap: 0.5rem;
            }

            .action-btn {
                flex: 1;
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 6px;
                font-size: 0.85rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .action-btn.primary {
                background: #8b0000;
                color: white;
            }

            .action-btn.secondary {
                background: transparent;
                color: #8b0000;
                border: 1px solid #8b0000;
            }

            .action-btn:hover {
                transform: translateY(-1px);
            }

            .action-btn.primary:hover {
                background: #660000;
            }

            .action-btn.secondary:hover {
                background: #8b0000;
                color: white;
            }

            /* Responsive Design */
            @media (max-width: 1200px) {
                .content-grid {
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }
                
                .feature-cards {
                    grid-template-columns: 1fr;
                    margin-bottom: 1rem;
                }
            }

            @media (max-width: 768px) {
                .elections-header {
                    padding: 1.5rem 1rem;
                }
                
                .elections-header .header-content h1 {
                    font-size: 2rem;
                }
                
                .elections-content {
                    padding: 1rem;
                }
                
                .elections-header .header-actions {
                    justify-content: stretch;
                }
                
                .header-btn {
                    flex: 1;
                    text-align: center;
                }
                
                .elections-placeholder, .elections-error {
                    padding: 2rem 1rem;
                }

                .contests-grid {
                    grid-template-columns: 1fr;
                }

                .level-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 1rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    adjustMapForElectionsView() {
        const mapContainer = document.querySelector('#mapContainer');
        if (mapContainer) {
            // Make map smaller and positioned as overlay
            mapContainer.style.cssText += `
                position: fixed !important;
                width: 300px !important;
                height: 200px !important;
                top: 70px !important;
                right: 20px !important;
                z-index: 1000 !important;
                border: 2px solid #8b0000 !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                transition: all 0.3s ease !important;
            `;

            // Add a minimize/restore button to the map
            if (!mapContainer.querySelector('.map-toggle-btn')) {
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'map-toggle-btn';
                toggleBtn.innerHTML = '−';
                toggleBtn.style.cssText = `
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: rgba(139, 0, 0, 0.9);
                    color: white;
                    border: none;
                    width: 25px;
                    height: 25px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                    z-index: 1001;
                `;
                
                toggleBtn.onclick = () => this.toggleMapSize();
                mapContainer.appendChild(toggleBtn);
            }
        }
    }

    toggleMapSize() {
        const mapContainer = document.querySelector('#mapContainer');
        const toggleBtn = document.querySelector('.map-toggle-btn');
        
        if (mapContainer && toggleBtn) {
            const isMinimized = mapContainer.style.height === '40px';
            
            if (isMinimized) {
                // Restore
                mapContainer.style.height = '200px';
                mapContainer.style.width = '300px';
                toggleBtn.innerHTML = '−';
            } else {
                // Minimize
                mapContainer.style.height = '40px';
                mapContainer.style.width = '150px';
                toggleBtn.innerHTML = '+';
            }
        }
    }

    restoreMainContent() {
        const mainContent = document.querySelector('#mainContent') ||
                           document.querySelector('.main');

        if (mainContent && mainContent.dataset.electionsOriginal) {
            mainContent.innerHTML = mainContent.dataset.electionsOriginal;
            delete mainContent.dataset.electionsOriginal;
            
            // Restore map to original state
            const mapContainer = document.querySelector('#mapContainer');
            if (mapContainer) {
                mapContainer.style.cssText = mapContainer.style.cssText.replace(/position: fixed.*?transition: all 0\.3s ease !important;/s, '');
                
                // Remove toggle button
                const toggleBtn = mapContainer.querySelector('.map-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.remove();
                }
            }
            
            adminDebugLog('✅ Restored main content');
        }
    }

    viewCandidates(contestName) {
        adminDebugLog(`👥 Viewing candidates for ${contestName}`);
        this.showMessage(`Candidate information for ${contestName} would be displayed here.`);
    }

    getVotingInfo(contestName) {
        adminDebugLog(`ℹ️ Getting voting info for ${contestName}`);
        this.showMessage(`Voting information for ${contestName} would be shown here.`);
    }

    async showVotingInfo() {
        adminDebugLog('🗳️ Loading voter guide from backend API...');
        
        try {
            const userState = this.getUserState() || 'CA';
            const response = await fetch(`/api/elections/voter-guide?state=${userState}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showVoterGuideModal(data.data);
                } else {
                    throw new Error(data.error || 'Failed to fetch voter guide');
                }
            } else {
                throw new Error(`Voter guide API returned ${response.status}`);
            }
        } catch (error) {
            adminDebugError('Failed to load voter guide:', error);
            // Fallback to static voting info
            this.showVotingInfoModal();
        }
    }

    showVoterGuideModal(voterGuideData) {
        const modal = document.createElement('div');
        modal.className = 'elections-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>🗳️ Comprehensive Voter Guide</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="voter-guide">
                        <!-- Elections Section -->
                        <div class="guide-section">
                            <h4>📅 Upcoming Elections</h4>
                            ${voterGuideData.elections.length > 0 ? `
                                <div class="elections-list">
                                    ${voterGuideData.elections.slice(0, 5).map(election => `
                                        <div class="election-item">
                                            <div class="election-header">
                                                <strong>${election.name}</strong>
                                                <span class="election-date">${new Date(election.date).toLocaleDateString()}</span>
                                            </div>
                                            ${election.registrationDeadline ? `
                                                <div class="registration-info">
                                                    Registration deadline: ${new Date(election.registrationDeadline).toLocaleDateString()}
                                                </div>
                                            ` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p>No upcoming elections found for your area.</p>'}
                        </div>

                        <!-- Registration Section -->
                        <div class="guide-section">
                            <h4>📋 Voter Registration</h4>
                            <div class="registration-info">
                                <p><strong>Registration URL:</strong> <a href="${voterGuideData.registrationInfo.registrationUrl}" target="_blank">Register to Vote</a></p>
                                ${voterGuideData.registrationInfo.deadlines.length > 0 ? `
                                    <div class="deadlines">
                                        <h5>Important Deadlines:</h5>
                                        ${voterGuideData.registrationInfo.deadlines.map(deadline => `
                                            <div class="deadline-item">
                                                <strong>${deadline.type}:</strong> ${new Date(deadline.date).toLocaleDateString()} - ${deadline.description}
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Voting Options Section -->
                        <div class="guide-section">
                            <h4>🗳️ How to Vote</h4>
                            <div class="voting-options">
                                ${voterGuideData.votingOptions.inPerson.available ? `
                                    <div class="voting-option">
                                        <h5>🏛️ In-Person Voting</h5>
                                        <p><strong>Hours:</strong> ${voterGuideData.votingOptions.inPerson.hours}</p>
                                        <div class="locations">
                                            <strong>Locations:</strong>
                                            <ul>
                                                ${voterGuideData.votingOptions.inPerson.locations.map(location => `<li>${location}</li>`).join('')}
                                            </ul>
                                        </div>
                                    </div>
                                ` : ''}

                                ${voterGuideData.votingOptions.earlyVoting.available ? `
                                    <div class="voting-option">
                                        <h5>⏰ Early Voting</h5>
                                        <p><strong>Period:</strong> ${voterGuideData.votingOptions.earlyVoting.period}</p>
                                        <div class="locations">
                                            <strong>Locations:</strong>
                                            <ul>
                                                ${voterGuideData.votingOptions.earlyVoting.locations.map(location => `<li>${location}</li>`).join('')}
                                            </ul>
                                        </div>
                                    </div>
                                ` : ''}

                                ${voterGuideData.votingOptions.absentee.available ? `
                                    <div class="voting-option">
                                        <h5>📬 Absentee/Mail-In Voting</h5>
                                        <div class="requirements">
                                            <strong>Requirements:</strong>
                                            <ul>
                                                ${voterGuideData.votingOptions.absentee.requirements.map(req => `<li>${req}</li>`).join('')}
                                            </ul>
                                        </div>
                                        ${voterGuideData.votingOptions.absentee.deadlines.length > 0 ? `
                                            <div class="deadlines">
                                                <strong>Deadlines:</strong>
                                                ${voterGuideData.votingOptions.absentee.deadlines.map(deadline => `
                                                    <div>${deadline.type}: ${new Date(deadline.date).toLocaleDateString()}</div>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="guide-section">
                            <h4>🎯 Quick Actions</h4>
                            <div class="quick-actions">
                                <button class="action-btn primary" onclick="electionsSystemIntegration.refreshElections()">
                                    🔄 Refresh Elections
                                </button>
                                <button class="action-btn secondary" onclick="window.open('${voterGuideData.registrationInfo.registrationUrl}', '_blank')">
                                    📝 Register to Vote
                                </button>
                                <button class="action-btn secondary" onclick="electionsSystemIntegration.searchCandidates()">
                                    👥 Search Candidates
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    refreshElections() {
        // Close any open modals
        const modals = document.querySelectorAll('.elections-modal');
        modals.forEach(modal => modal.remove());
        
        // Reload elections data
        this.loadElections();
    }

    searchCandidates() {
        // Close modal and show candidate search
        const modals = document.querySelectorAll('.elections-modal');
        modals.forEach(modal => modal.remove());
        
        // For now, just show an alert - could be expanded to a search interface
        alert('Candidate search feature coming soon! Use the "See Candidates" buttons on individual elections for now.');
    }

    showVotingInfoModal() {
        const modal = document.createElement('div');
        modal.className = 'elections-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>🗳️ Voting Information</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="voting-info">
                        <h4>🎯 Important Voting Information:</h4>
                        
                        <div class="info-sections">
                            <div class="info-section">
                                <div class="section-icon">📋</div>
                                <h5>Voter Registration</h5>
                                <ul>
                                    <li>Register online or at your DMV</li>
                                    <li>Deadlines vary by state</li>
                                    <li>Update registration when you move</li>
                                </ul>
                            </div>
                            
                            <div class="info-section">
                                <div class="section-icon">📍</div>
                                <h5>Polling Locations</h5>
                                <ul>
                                    <li>Find your polling place online</li>
                                    <li>Bring valid photo ID if required</li>
                                    <li>Check for early voting options</li>
                                </ul>
                            </div>
                            
                            <div class="info-section">
                                <div class="section-icon">📮</div>
                                <h5>Absentee & Mail-In Voting</h5>
                                <ul>
                                    <li>Check if you qualify for absentee voting</li>
                                    <li>Request ballot by deadline</li>
                                    <li>Follow signature requirements</li>
                                </ul>
                            </div>
                            
                            <div class="info-section">
                                <div class="section-icon">🕐</div>
                                <h5>Election Dates & Hours</h5>
                                <ul>
                                    <li>Most elections held on Tuesdays</li>
                                    <li>Polling hours vary by location</li>
                                    <li>Plan to vote during off-peak hours</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="voting-tips">
                            <h4>💡 Voting Tips:</h4>
                            <ul>
                                <li><strong>Research beforehand:</strong> Review sample ballots and candidate information</li>
                                <li><strong>Bring ID:</strong> Check your state's voter ID requirements</li>
                                <li><strong>Plan your trip:</strong> Know your polling location and hours</li>
                                <li><strong>Take your time:</strong> There's no rush once you're in the voting booth</li>
                                <li><strong>Ask for help:</strong> Poll workers can assist with questions</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles for the voting info modal
        const style = document.createElement('style');
        style.textContent = `
            .info-sections {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
                margin: 1rem 0;
            }
            
            .info-section {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                border-left: 4px solid #8b0000;
            }
            
            .section-icon {
                font-size: 2rem;
                margin-bottom: 0.5rem;
                text-align: center;
            }
            
            .info-section h5 {
                margin: 0.5rem 0;
                color: #8b0000;
                text-align: center;
            }
            
            .info-section ul {
                margin: 0;
                padding-left: 1.2rem;
                font-size: 0.9rem;
                color: #666;
            }
            
            .info-section li {
                margin: 0.3rem 0;
                line-height: 1.4;
            }
            
            .voting-tips {
                background: #ffebee;
                border: 1px solid #ffcdd2;
                border-radius: 8px;
                padding: 1rem;
                margin-top: 1.5rem;
            }
            
            .voting-tips h4 {
                margin: 0 0 0.5rem 0;
                color: #8b0000;
            }
            
            .voting-tips ul {
                margin: 0;
                padding-left: 1.2rem;
            }
            
            .voting-tips li {
                margin: 0.5rem 0;
                color: #555;
                line-height: 1.4;
            }

            .voting-tips li strong {
                color: #8b0000;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);
    }

    setupSidebarMonitoring() {
        // Monitor sidebar state changes
        const sidebar = document.querySelector('#sidebar');
        if (sidebar) {
            // Use MutationObserver to watch for class changes on sidebar
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        this.updatePanelForSidebarState();
                    }
                });
            });
            
            observer.observe(sidebar, {
                attributes: true,
                attributeFilter: ['class']
            });
            
            // Also check current state
            this.updatePanelForSidebarState();
        }
    }

    updatePanelForSidebarState() {
        const sidebar = document.querySelector('#sidebar');
        const electionsPanel = document.querySelector('.elections-main-view');
        
        if (sidebar && electionsPanel) {
            const isExpanded = sidebar.classList.contains('expanded');
            electionsPanel.classList.toggle('sidebar-expanded', isExpanded);
        }
    }

    showMessage(message) {
        // Create a simple message notification
        const notification = document.createElement('div');
        notification.className = 'notification notification-info';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #17a2b8;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            font-weight: 500;
            z-index: 1001;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Auto-initialize when script loads
const electionsIntegration = new ElectionsSystemIntegration();

// ES6 Module Exports
export { ElectionsSystemIntegration, electionsIntegration };
export default electionsIntegration;

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.ElectionsSystemIntegration = ElectionsSystemIntegration;
    window.electionsSystemIntegration = electionsIntegration;
}