/**
 * @module integrations/candidate-system-integration
 * @description Candidate System Integration for United We Rise Frontend
 * This script integrates the enhanced candidate system with the existing frontend
 * Provides comprehensive candidate registration, management, and constituent inbox features
 * 🔐 MIGRATION STATUS: Updated for httpOnly cookie authentication
 * Migrated to ES6 modules: October 11, 2025 (Batch 10 - "Final Boss")
 */
import { apiCall } from '../js/api-compatibility-shim.js';

class CandidateSystemIntegration {
    constructor() {
        this.candidateSystem = null;
        this.hasCheckedStatus = false; // Track if we've checked candidate status
        this.isCandidate = false; // Default to false
        this.candidateData = null;
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
            adminDebugLog('CandidateSystem', 'Initializing enhanced candidate system integration...');
        }

        // Load CSS styles
        this.loadCandidateSystemStyles();

        // Setup event delegation for all candidate actions
        this.setupEventDelegation();

        // Initialize the candidate system
        if (window.CandidateSystem) {
            this.candidateSystem = new window.CandidateSystem();
        }

        // NOTE: Candidate status check is now lazy-loaded on demand
        // to avoid unnecessary 404 errors for non-candidates on every page load

        // Enhance existing UI elements
        this.enhanceExistingElements();

        // Add navigation enhancements
        this.addCandidateNavigation();

        // Setup sidebar state monitoring
        this.setupSidebarMonitoring();

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('CandidateSystem', 'Candidate system integration complete!');
        }
    }

    /**
     * Setup event delegation for all candidate system actions
     */
    setupEventDelegation() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-candidate-action]');
            if (!target) return;

            e.preventDefault();
            e.stopPropagation();

            const action = target.dataset.candidateAction;
            const candidateId = target.dataset.candidateId;
            const username = target.dataset.username;
            const conversationId = target.dataset.conversationId;
            const conversationData = target.dataset.conversationData;
            const senderId = target.dataset.senderId;

            switch (action) {
                case 'loadElections':
                    this.loadElections();
                    break;
                case 'showCandidateDashboard':
                    this.showCandidateDashboard();
                    break;
                case 'showCandidateRegistration':
                    this.showCandidateRegistration();
                    break;
                case 'showAIAnalysis':
                    this.showAIAnalysis();
                    break;
                case 'restoreMainContent':
                    this.restoreMainContent();
                    break;
                case 'searchFromPlaceholder':
                    this.searchFromPlaceholder();
                    break;
                case 'viewCandidateProfile':
                    if (username) this.viewCandidateProfile(username);
                    break;
                case 'contactCandidate':
                    if (candidateId) this.contactCandidate(candidateId);
                    break;
                case 'viewExternalCandidate':
                    if (candidateId) this.viewExternalCandidate(candidateId);
                    break;
                case 'searchCandidatesByAddress':
                    this.searchCandidatesByAddress();
                    break;
                case 'previousStep':
                    this.previousStep();
                    break;
                case 'nextStep':
                    this.nextStep();
                    break;
                case 'submitRegistration':
                    this.submitRegistration();
                    break;
                case 'showPolicyPlatform':
                    this.showPolicyPlatform();
                    break;
                case 'openConstituentInbox':
                    this.openConstituentInbox();
                    break;
                case 'showElectionStatus':
                    this.showElectionStatus();
                    break;
                case 'backToHub':
                    this.backToHub();
                    break;
                case 'toggleProfile':
                    if (typeof toggleProfile === 'function') toggleProfile();
                    break;
                case 'viewPublicProfile':
                    this.viewPublicProfile();
                    break;
                case 'toggleAISummary':
                    this.toggleAISummary();
                    break;
                case 'loadConstituentConversations':
                    this.loadConstituentConversations();
                    break;
                case 'openConversation':
                    if (conversationId) {
                        const convData = conversationData ? JSON.parse(conversationData.replace(/&#39;/g, "'")) : null;
                        this.openConversation(conversationId, convData);
                    }
                    break;
                case 'markConversationRead':
                    if (conversationId) this.markConversationRead(conversationId);
                    break;
                case 'clearReply':
                    this.clearReply();
                    break;
                case 'sendReply':
                    if (conversationId && senderId) this.sendReply(conversationId, senderId);
                    break;
                case 'closeModal':
                    target.closest('.modal-overlay')?.remove();
                    break;
                // Hierarchy Browser Actions
                case 'selectLevel':
                    const level = target.dataset.level;
                    if (level) this.selectLevel(level);
                    break;
                case 'selectOfficeType':
                    const officeType = target.dataset.officeType;
                    if (officeType) this.selectOfficeType(officeType);
                    break;
                case 'toggleCandidateSelect':
                    if (candidateId) this.toggleCandidateSelect(candidateId);
                    break;
                case 'viewCandidateDetail':
                    if (candidateId) this.viewCandidateDetail(candidateId);
                    break;
                case 'openComparison':
                    this.openComparisonMatrix();
                    break;
                case 'clearSelection':
                    this.clearCandidateSelection();
                    break;
                case 'showCompareInfo':
                    this.showCompareInfo();
                    break;
                case 'showContactInfo':
                    this.showContactInfo();
                    break;
                case 'backToOfficeTypes':
                    this.backToOfficeTypes();
                    break;
                case 'backToLevels':
                    this.backToLevels();
                    break;
            }
        });
    }

    loadCandidateSystemStyles() {
        // Check if styles are already loaded
        if (document.querySelector('#candidate-system-styles')) {
            return;
        }

        const link = document.createElement('link');
        link.id = 'candidate-system-styles';
        link.rel = 'stylesheet';
        link.href = 'src/styles/candidate-system.css';
        document.head.appendChild(link);
    }

    enhanceExistingElements() {
        // Enhance any existing political content areas
        this.enhancePoliticalSections();
        
        // Add candidate system features to existing navigation
        this.enhanceNavigation();
        
        // Enhance any existing election content
        this.enhanceElectionContent();
    }

    enhancePoliticalSections() {
        // Find existing political content sections
        const politicalSections = document.querySelectorAll(
            '.political-content, .elections-section, #political-tab, .government-section'
        );

        politicalSections.forEach(section => {
            if (!section.querySelector('.enhanced-elections-container')) {
                // Add enhanced election display
                const container = document.createElement('div');
                container.className = 'enhanced-elections-container';
                section.appendChild(container);

                // Add section header if it doesn't exist
                if (!section.querySelector('h2, .section-header')) {
                    const header = document.createElement('div');
                    header.className = 'section-header candidate-system-header';
                    header.innerHTML = `
                        <h2>🗳️ Enhanced Election & Candidate System</h2>
                        <p>AI-powered candidate analysis and multi-tier election data</p>
                    `;
                    section.insertBefore(header, container);
                }
            }
        });
    }

    enhanceNavigation() {
        // Look for existing navigation elements
        const navs = document.querySelectorAll('nav, .nav-tabs, .tab-navigation, .menu');
        
        navs.forEach(nav => {
            // Add candidate comparison feature to navigation
            if (nav.querySelector('a, button') && !nav.querySelector('.candidate-nav-enhanced')) {
                const enhancementIndicator = document.createElement('span');
                enhancementIndicator.className = 'candidate-nav-enhanced';
                enhancementIndicator.innerHTML = '🤖 AI-Enhanced';
                enhancementIndicator.style.cssText = `
                    background: linear-gradient(135deg, #6f42c1, #e83e8c);
                    color: white;
                    padding: 0.2rem 0.5rem;
                    border-radius: 10px;
                    font-size: 0.7rem;
                    font-weight: 500;
                    margin-left: 0.5rem;
                `;
                
                // Find political/election related nav items
                const politicalNavs = nav.querySelectorAll('a, button');
                politicalNavs.forEach(navItem => {
                    const text = navItem.textContent.toLowerCase();
                    if (text.includes('politic') || text.includes('election') || 
                        text.includes('candidate') || text.includes('government')) {
                        navItem.appendChild(enhancementIndicator.cloneNode(true));
                    }
                });
            }
        });
    }

    enhanceElectionContent() {
        // Find any existing election-related content and enhance it
        const electionElements = document.querySelectorAll(
            '[class*="election"], [id*="election"], [class*="candidate"], [id*="candidate"]'
        );

        electionElements.forEach(element => {
            // Skip if already enhanced
            if (element.querySelector('.ai-enhanced-indicator')) {
                return;
            }

            // Skip sidebar navigation items - they don't need AI badges
            if (element.closest('.sidebar') || element.closest('.thumbs')) {
                return;
            }

            // Add AI enhancement indicator
            const indicator = document.createElement('div');
            indicator.className = 'ai-enhanced-indicator';
            indicator.innerHTML = `
                <div class="enhancement-badge">
                    <span class="ai-icon">🤖</span>
                    <span class="enhancement-text">AI Enhanced</span>
                </div>
            `;
            indicator.style.cssText = `
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                z-index: 10;
            `;

            const badge = indicator.querySelector('.enhancement-badge');
            if (badge) {
                badge.style.cssText = `
                    background: linear-gradient(135deg, #6f42c1, #e83e8c);
                    color: white;
                    padding: 0.3rem 0.6rem;
                    border-radius: 15px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                `;
            }

            // Make the parent relative positioned if not already
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.position === 'static') {
                element.style.position = 'relative';
            }

            element.appendChild(indicator);
        });
    }

    addCandidateNavigation() {
        // Add candidate button to existing sidebar
        const sidebar = document.querySelector('#sidebar .thumbs');
        if (sidebar && !document.querySelector('#candidatesThumb')) {
            // Find the Officials thumb to add candidate button after it
            const officialsThumb = Array.from(sidebar.children).find(thumb => 
                thumb.textContent.includes('Officials')
            );
            
            if (officialsThumb) {
                const candidateThumb = document.createElement('div');
                candidateThumb.id = 'candidatesThumb';
                candidateThumb.className = 'thumb';
                candidateThumb.onclick = () => this.toggleCandidatePanel();
                candidateThumb.title = 'Candidate Hub';
                candidateThumb.innerHTML = `🤖 <span class="label">Candidates</span>`;
                
                // Insert after officials thumb
                officialsThumb.parentNode.insertBefore(candidateThumb, officialsThumb.nextSibling);
                
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('CandidateSystem', 'Added Candidates button to sidebar');
                }
            }
        }

        // Create the candidate panel if it doesn't exist
        this.createCandidatePanel();
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
        const candidatePanel = document.querySelector('.candidate-main-view');
        
        if (sidebar && candidatePanel) {
            const isExpanded = sidebar.classList.contains('expanded');
            candidatePanel.classList.toggle('sidebar-expanded', isExpanded);
        }
    }

    createCandidatePanel() {
        // We'll use the main content area instead of a slim panel
        // The panel creation is handled in toggleCandidatePanel
    }

    toggleCandidatePanel() {
        adminDebugLog('🤖 Opening Candidates in main content area...');
        
        // Hide other detail panels
        document.querySelectorAll('.detail-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        // Hide existing info panels
        document.querySelectorAll('.info-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        // Hide other main view systems when opening Candidates
        const electionsView = document.querySelector('.elections-main-view');
        if (electionsView) {
            electionsView.style.display = 'none';
        }
        
        const officialsView = document.querySelector('.officials-main-view');
        if (officialsView) {
            officialsView.style.display = 'none';
        }
        
        const civicOrganizing = document.querySelector('.civic-organizing-container');
        if (civicOrganizing) {
            civicOrganizing.style.display = 'none';
        }

        // Get main content area
        const mainContent = document.querySelector('#mainContent') || 
                           document.querySelector('.main') ||
                           document.querySelector('main');
        
        if (!mainContent) {
            adminDebugError('Main content area not found');
            return;
        }

        // Clear existing content and show candidates
        this.showCandidateMainView(mainContent);
    }

    async showCandidateMainView(mainContent) {
        // Ensure candidate status is checked before rendering
        await this.ensureCandidateStatus();

        // Store original content so we can restore it later
        if (!mainContent.dataset.originalContent) {
            mainContent.dataset.originalContent = mainContent.innerHTML;
        }

        // Initialize hierarchy browser state
        this.hierarchyState = this.hierarchyState || {
            currentLevel: null,
            currentOfficeType: null,
            selectedCandidates: new Set()
        };

        // Create full-width candidate interface with hierarchy browser
        mainContent.innerHTML = `
            <div class="candidate-main-view">
                <div class="candidate-header">
                    <div class="header-content">
                        <h1>Candidate Hub</h1>
                        <p class="subtitle">Discover candidates, compare positions, and make informed decisions</p>
                        <div class="header-actions">
                            ${this.isCandidate ?
                                `<button class="header-btn primary dashboard" data-candidate-action="showCandidateDashboard">
                                    Candidate Dashboard
                                </button>` :
                                `<button class="header-btn register" data-candidate-action="showCandidateRegistration">
                                    Run for Office
                                </button>`
                            }
                            <button class="header-btn secondary" data-candidate-action="restoreMainContent">
                                Back to Map
                            </button>
                        </div>
                    </div>
                </div>

                <div class="candidate-content">
                    <!-- Level Selector Pills -->
                    <div class="level-selector">
                        <button class="level-pill ${this.hierarchyState.currentLevel === 'FEDERAL' ? 'active' : ''}"
                                data-candidate-action="selectLevel" data-level="FEDERAL">
                            Federal
                        </button>
                        <button class="level-pill ${this.hierarchyState.currentLevel === 'STATE' ? 'active' : ''}"
                                data-candidate-action="selectLevel" data-level="STATE">
                            State
                        </button>
                        <button class="level-pill ${this.hierarchyState.currentLevel === 'LOCAL' ? 'active' : ''}"
                                data-candidate-action="selectLevel" data-level="LOCAL">
                            Local
                        </button>
                        <button class="level-pill ${this.hierarchyState.currentLevel === 'MUNICIPAL' ? 'active' : ''}"
                                data-candidate-action="selectLevel" data-level="MUNICIPAL">
                            Municipal
                        </button>
                    </div>

                    <div class="hierarchy-content">
                        <!-- Quick Actions Row -->
                        <div class="quick-actions">
                            <div class="feature-card compare" data-candidate-action="showCompareInfo">
                                <div class="card-icon-small">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="7" height="18" rx="1"/>
                                        <rect x="14" y="3" width="7" height="18" rx="1"/>
                                    </svg>
                                </div>
                                <div class="card-text">
                                    <h4>Compare Candidates</h4>
                                    <p>See where candidates stand on issues that matter to you</p>
                                </div>
                            </div>

                            <div class="feature-card contact" data-candidate-action="showContactInfo">
                                <div class="card-icon-small">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                </div>
                                <div class="card-text">
                                    <h4>Contact Candidates</h4>
                                    <p>Ask questions directly to candidates and their teams</p>
                                </div>
                            </div>

                            <div class="feature-card find-elections" data-candidate-action="loadElections">
                                <div class="card-icon-small">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="11" cy="11" r="8"/>
                                        <path d="M21 21l-4.35-4.35"/>
                                    </svg>
                                </div>
                                <div class="card-text">
                                    <h4>Find Your Elections</h4>
                                    <p>Discover who's running for office in your area</p>
                                </div>
                            </div>

                            <div class="feature-card run-for-office" data-candidate-action="showCandidateRegistration">
                                <div class="card-icon-small">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="8.5" cy="7" r="4"/>
                                        <line x1="20" y1="8" x2="20" y2="14"/>
                                        <line x1="23" y1="11" x2="17" y2="11"/>
                                    </svg>
                                </div>
                                <div class="card-text">
                                    <h4>Run for Office</h4>
                                    <p>Register your candidacy and connect with voters</p>
                                </div>
                            </div>
                        </div>

                        <!-- Main Browse Area -->
                        <div class="browse-area">
                            <div class="browse-header">
                                <h2 id="browseTitle">Select a government level to browse candidates</h2>
                                <div class="browse-breadcrumb" id="browseBreadcrumb"></div>
                            </div>

                            <div class="loading-indicator" id="hierarchyLoading" style="display: none;">
                                <div class="spinner"></div>
                                <span>Loading...</span>
                            </div>

                            <!-- Office Types Grid (shown after level selection) -->
                            <div class="office-types-grid" id="officeTypesGrid" style="display: none;"></div>

                            <!-- Candidates Grid (shown after office type selection) -->
                            <div class="candidates-grid" id="candidatesGrid" style="display: none;"></div>

                            <!-- Empty State -->
                            <div class="empty-state" id="emptyState">
                                <div class="empty-icon">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                </div>
                                <h3>Browse by Government Level</h3>
                                <p>Select Federal, State, Local, or Municipal above to see available offices and candidates</p>
                                <div class="empty-hint">
                                    <span class="hint-tag federal">Federal</span> President, Senate, House
                                </div>
                                <div class="empty-hint">
                                    <span class="hint-tag state">State</span> Governor, State Legislature
                                </div>
                                <div class="empty-hint">
                                    <span class="hint-tag local">Local</span> Mayor, City Council, School Board
                                </div>
                                <div class="empty-hint">
                                    <span class="hint-tag municipal">Municipal</span> Township, Districts
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Floating Comparison Bar (hidden until candidates selected) -->
                <div class="comparison-bar" id="comparisonBar" style="display: none;">
                    <span class="comparison-count"><span id="selectedCount">0</span> candidates selected</span>
                    <div class="comparison-actions">
                        <button class="comparison-btn primary" data-candidate-action="openComparison" id="compareBtn" disabled>
                            Compare Selected
                        </button>
                        <button class="comparison-btn secondary" data-candidate-action="clearSelection">
                            Clear
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add comprehensive styles for the main view
        this.addCandidateMainViewStyles();

        // Update panel positioning based on current sidebar state
        this.updatePanelForSidebarState();

        // Adjust map if needed (make it smaller/overlay)
        this.adjustMapForCandidateView();
    }

    // ==========================================
    // HIERARCHY BROWSER METHODS
    // ==========================================

    /**
     * Handle level selection (Federal, State, Local, Municipal)
     */
    async selectLevel(level) {
        adminDebugLog(`Selecting level: ${level}`);

        // Update state
        this.hierarchyState.currentLevel = level;
        this.hierarchyState.currentOfficeType = null;

        // Update UI - pills
        document.querySelectorAll('.level-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.level === level);
        });

        // Show loading
        const loading = document.getElementById('hierarchyLoading');
        const emptyState = document.getElementById('emptyState');
        const officeGrid = document.getElementById('officeTypesGrid');
        const candidatesGrid = document.getElementById('candidatesGrid');
        const browseTitle = document.getElementById('browseTitle');

        if (loading) loading.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';
        if (officeGrid) officeGrid.style.display = 'none';
        if (candidatesGrid) candidatesGrid.style.display = 'none';

        try {
            // Fetch office types for this level
            const response = await apiCall(`/api/candidates/by-level/${level}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok && response.data?.success) {
                this.displayOfficeTypes(response.data.officeTypes, level);
            } else {
                // Fallback to static data if endpoint not ready
                this.displayOfficeTypesFallback(level);
            }
        } catch (error) {
            adminDebugError('Error loading office types:', error);
            // Use fallback data
            this.displayOfficeTypesFallback(level);
        } finally {
            if (loading) loading.style.display = 'none';
        }
    }

    /**
     * Display office types for selected level
     */
    displayOfficeTypes(officeTypes, level) {
        const grid = document.getElementById('officeTypesGrid');
        const browseTitle = document.getElementById('browseTitle');
        const breadcrumb = document.getElementById('browseBreadcrumb');

        const levelNames = {
            'FEDERAL': 'Federal',
            'STATE': 'State',
            'LOCAL': 'Local',
            'MUNICIPAL': 'Municipal'
        };

        if (browseTitle) browseTitle.textContent = `${levelNames[level]} Offices`;
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <button class="breadcrumb-link" data-candidate-action="backToLevels">All Levels</button>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-current">${levelNames[level]}</span>
            `;
        }

        if (grid) {
            grid.innerHTML = officeTypes.map(office => `
                <div class="office-type-card level-${level.toLowerCase()}"
                     data-candidate-action="selectOfficeType"
                     data-office-type="${office.type}">
                    <div class="office-type-header">
                        <h3>${office.title}</h3>
                        <span class="candidate-count">${office.candidateCount} candidate${office.candidateCount !== 1 ? 's' : ''}</span>
                    </div>
                    <p class="office-type-desc">${office.description || ''}</p>
                </div>
            `).join('');
            grid.style.display = 'grid';
        }
    }

    /**
     * Fallback office types when API endpoint not ready
     */
    displayOfficeTypesFallback(level) {
        const fallbackData = {
            'FEDERAL': [
                { type: 'president', title: 'President', description: 'Head of state and government', candidateCount: 0 },
                { type: 'us_senate', title: 'U.S. Senate', description: '2 senators per state, 6-year terms', candidateCount: 0 },
                { type: 'us_house', title: 'U.S. House of Representatives', description: 'Based on district population', candidateCount: 0 }
            ],
            'STATE': [
                { type: 'governor', title: 'Governor', description: 'Chief executive of the state', candidateCount: 0 },
                { type: 'lt_governor', title: 'Lieutenant Governor', description: 'Second-in-command executive', candidateCount: 0 },
                { type: 'state_senate', title: 'State Senate', description: 'Upper chamber of state legislature', candidateCount: 0 },
                { type: 'state_house', title: 'State House', description: 'Lower chamber of state legislature', candidateCount: 0 },
                { type: 'attorney_general', title: 'Attorney General', description: 'Chief legal officer of the state', candidateCount: 0 },
                { type: 'secretary_state', title: 'Secretary of State', description: 'Oversees elections and records', candidateCount: 0 }
            ],
            'LOCAL': [
                { type: 'mayor', title: 'Mayor', description: 'Chief executive of the city', candidateCount: 0 },
                { type: 'city_council', title: 'City Council', description: 'Local legislative body', candidateCount: 0 },
                { type: 'county_commissioner', title: 'County Commissioner', description: 'County executive board member', candidateCount: 0 },
                { type: 'school_board', title: 'School Board', description: 'Oversees local public education', candidateCount: 0 },
                { type: 'sheriff', title: 'Sheriff', description: 'Chief law enforcement officer', candidateCount: 0 }
            ],
            'MUNICIPAL': [
                { type: 'township_trustee', title: 'Township Trustee', description: 'Local township governance', candidateCount: 0 },
                { type: 'water_district', title: 'Water District Board', description: 'Manages water resources', candidateCount: 0 },
                { type: 'fire_district', title: 'Fire District Board', description: 'Oversees fire protection services', candidateCount: 0 },
                { type: 'park_district', title: 'Park District Board', description: 'Manages parks and recreation', candidateCount: 0 }
            ]
        };

        this.displayOfficeTypes(fallbackData[level] || [], level);
    }

    /**
     * Handle office type selection
     */
    async selectOfficeType(officeType) {
        adminDebugLog(`Selecting office type: ${officeType}`);

        this.hierarchyState.currentOfficeType = officeType;

        const loading = document.getElementById('hierarchyLoading');
        const officeGrid = document.getElementById('officeTypesGrid');
        const candidatesGrid = document.getElementById('candidatesGrid');
        const browseTitle = document.getElementById('browseTitle');
        const breadcrumb = document.getElementById('browseBreadcrumb');

        if (loading) loading.style.display = 'flex';
        if (officeGrid) officeGrid.style.display = 'none';

        const levelNames = {
            'FEDERAL': 'Federal',
            'STATE': 'State',
            'LOCAL': 'Local',
            'MUNICIPAL': 'Municipal'
        };

        const officeTitle = officeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        if (browseTitle) browseTitle.textContent = `${officeTitle} Candidates`;
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <button class="breadcrumb-link" data-candidate-action="backToLevels">All Levels</button>
                <span class="breadcrumb-separator">›</span>
                <button class="breadcrumb-link" data-candidate-action="backToOfficeTypes">${levelNames[this.hierarchyState.currentLevel]}</button>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-current">${officeTitle}</span>
            `;
        }

        try {
            // Fetch candidates for this office type
            const response = await apiCall(`/api/candidates/by-office-type?level=${this.hierarchyState.currentLevel}&officeType=${encodeURIComponent(officeType)}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok && response.data?.success) {
                this.displayCandidatesGrid(response.data.candidates);
            } else {
                // Show empty state for now
                this.displayCandidatesGrid([]);
            }
        } catch (error) {
            adminDebugError('Error loading candidates:', error);
            this.displayCandidatesGrid([]);
        } finally {
            if (loading) loading.style.display = 'none';
        }
    }

    /**
     * Display candidates grid with checkboxes for comparison
     */
    displayCandidatesGrid(candidates) {
        const grid = document.getElementById('candidatesGrid');
        if (!grid) return;

        if (candidates.length === 0) {
            grid.innerHTML = `
                <div class="no-candidates-state">
                    <div class="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="8.5" cy="7" r="4"/>
                            <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                    </div>
                    <h3>No Candidates Found</h3>
                    <p>No declared candidates for this office yet. Check back as the election approaches.</p>
                </div>
            `;
        } else {
            grid.innerHTML = candidates.map(candidate => this.renderCandidateCard(candidate)).join('');
        }

        grid.style.display = 'grid';
    }

    /**
     * Render a single candidate card with checkbox
     */
    renderCandidateCard(candidate) {
        const isSelected = this.hierarchyState.selectedCandidates.has(candidate.id);
        const stanceTags = candidate.stanceTags || [];

        // Generate initials if no photo
        const initials = candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const photoHTML = candidate.photoUrl
            ? `<img src="${candidate.photoUrl}" alt="${candidate.name}" class="candidate-photo"/>`
            : `<div class="candidate-initials">${initials}</div>`;

        // Party color mapping
        const partyColors = {
            'Democratic': '#3b5998',
            'Democrat': '#3b5998',
            'Republican': '#c94a4a',
            'Independent': '#6b7280',
            'Libertarian': '#fbbf24',
            'Green': '#22c55e'
        };
        const partyColor = partyColors[candidate.party] || '#6b7280';

        return `
            <div class="candidate-card-v2 ${isSelected ? 'selected' : ''}" data-candidate-id="${candidate.id}">
                <label class="card-checkbox">
                    <input type="checkbox"
                           ${isSelected ? 'checked' : ''}
                           data-candidate-action="toggleCandidateSelect"
                           data-candidate-id="${candidate.id}">
                    <span class="checkbox-custom"></span>
                </label>

                <div class="card-photo-area">
                    ${photoHTML}
                </div>

                <div class="card-content">
                    <h4 class="candidate-name">${candidate.name}</h4>
                    <span class="party-badge" style="background-color: ${partyColor}">${candidate.party || 'Independent'}</span>

                    ${stanceTags.length > 0 ? `
                        <div class="stance-tags">
                            ${stanceTags.slice(0, 3).map(tag => `<span class="stance-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}

                    ${candidate.platformSummary ? `
                        <p class="platform-preview">${candidate.platformSummary.substring(0, 100)}${candidate.platformSummary.length > 100 ? '...' : ''}</p>
                    ` : ''}
                </div>

                <button class="view-details-btn" data-candidate-action="viewCandidateDetail" data-candidate-id="${candidate.id}">
                    View Details
                </button>
            </div>
        `;
    }

    /**
     * Toggle candidate selection for comparison
     */
    toggleCandidateSelect(candidateId) {
        if (this.hierarchyState.selectedCandidates.has(candidateId)) {
            this.hierarchyState.selectedCandidates.delete(candidateId);
        } else {
            // Limit to 6 candidates
            if (this.hierarchyState.selectedCandidates.size >= 6) {
                this.showToast('Maximum 6 candidates can be compared at once');
                return;
            }
            this.hierarchyState.selectedCandidates.add(candidateId);
        }

        // Update card visual state
        const card = document.querySelector(`.candidate-card-v2[data-candidate-id="${candidateId}"]`);
        if (card) {
            card.classList.toggle('selected', this.hierarchyState.selectedCandidates.has(candidateId));
        }

        // Update comparison bar
        this.updateComparisonBar();
    }

    /**
     * Update floating comparison bar
     */
    updateComparisonBar() {
        const bar = document.getElementById('comparisonBar');
        const countSpan = document.getElementById('selectedCount');
        const compareBtn = document.getElementById('compareBtn');

        const count = this.hierarchyState.selectedCandidates.size;

        if (bar) {
            bar.style.display = count > 0 ? 'flex' : 'none';
        }
        if (countSpan) {
            countSpan.textContent = count;
        }
        if (compareBtn) {
            compareBtn.disabled = count < 2;
        }
    }

    /**
     * Clear all selected candidates
     */
    clearCandidateSelection() {
        this.hierarchyState.selectedCandidates.clear();

        // Update all card visuals
        document.querySelectorAll('.candidate-card-v2.selected').forEach(card => {
            card.classList.remove('selected');
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = false;
        });

        this.updateComparisonBar();
    }

    /**
     * Navigate back to office types
     */
    backToOfficeTypes() {
        if (this.hierarchyState.currentLevel) {
            this.selectLevel(this.hierarchyState.currentLevel);
        }
    }

    /**
     * Navigate back to level selection
     */
    backToLevels() {
        this.hierarchyState.currentLevel = null;
        this.hierarchyState.currentOfficeType = null;

        // Reset UI
        document.querySelectorAll('.level-pill').forEach(pill => pill.classList.remove('active'));

        const browseTitle = document.getElementById('browseTitle');
        const breadcrumb = document.getElementById('browseBreadcrumb');
        const emptyState = document.getElementById('emptyState');
        const officeGrid = document.getElementById('officeTypesGrid');
        const candidatesGrid = document.getElementById('candidatesGrid');

        if (browseTitle) browseTitle.textContent = 'Select a government level to browse candidates';
        if (breadcrumb) breadcrumb.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (officeGrid) officeGrid.style.display = 'none';
        if (candidatesGrid) candidatesGrid.style.display = 'none';
    }

    /**
     * Show compare info modal
     */
    showCompareInfo() {
        this.showInfoModal(
            'Compare Candidates',
            `<p>Select 2-6 candidates to compare their positions side-by-side.</p>
             <p>Use the checkboxes on candidate cards to select who you want to compare, then click "Compare Selected" in the bar at the bottom.</p>
             <p>The comparison will show you where candidates agree and differ on key issues.</p>`
        );
    }

    /**
     * Show contact info modal
     */
    showContactInfo() {
        this.showInfoModal(
            'Contact Candidates',
            `<p>You can send questions directly to candidates who have registered with United We Rise.</p>
             <p>Click on a candidate to view their profile, then use the "Contact" button to send them a message.</p>
             <p>Candidates or their staff will receive your message and can respond directly.</p>`
        );
    }

    /**
     * Generic info modal helper
     */
    showInfoModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="info-modal">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-btn" data-candidate-action="closeModal">&times;</button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Show toast notification
     */
    showToast(message) {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ==========================================
    // END HIERARCHY BROWSER METHODS
    // ==========================================

    // ==========================================
    // COMPARISON MATRIX METHODS
    // ==========================================

    /**
     * Open the comparison matrix modal for selected candidates
     */
    async openComparisonMatrix() {
        const selectedIds = Array.from(this.hierarchyState.selectedCandidates);

        if (selectedIds.length < 2) {
            this.showToast('Select at least 2 candidates to compare');
            return;
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay comparison-modal-overlay';
        modal.innerHTML = `
            <div class="comparison-modal">
                <div class="modal-header">
                    <h2>Candidate Comparison</h2>
                    <button class="close-btn" data-candidate-action="closeModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="comparison-loading">
                        <div class="spinner"></div>
                        <p>Analyzing candidate positions...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        try {
            // Fetch comparison data from backend
            const response = await apiCall('/api/candidates/compare', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidateIds: selectedIds })
            });

            if (response.ok && response.data) {
                this.renderComparisonMatrix(modal, response.data);
            } else {
                throw new Error(response.data?.error || 'Failed to compare candidates');
            }
        } catch (error) {
            adminDebugError('Comparison error:', error);
            modal.querySelector('.modal-body').innerHTML = `
                <div class="error-state">
                    <h3>Unable to Compare</h3>
                    <p>${error.message}</p>
                    <button class="btn secondary" data-candidate-action="closeModal">Close</button>
                </div>
            `;
        }
    }

    /**
     * Render the comparison matrix table
     */
    renderComparisonMatrix(modal, data) {
        const { candidates, comparison } = data;

        // Build matrix HTML
        const candidateHeaders = candidates.map(c => `
            <th class="candidate-column">
                <div class="candidate-header-cell">
                    <div class="candidate-avatar">
                        ${c.photoUrl ? `<img src="${c.photoUrl}" alt="${c.name}"/>` :
                          `<div class="initials">${c.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>`}
                    </div>
                    <div class="candidate-name">${c.name}</div>
                    <div class="candidate-party">${c.party || 'Independent'}</div>
                </div>
            </th>
        `).join('');

        // Build issue rows
        const issueRows = (comparison?.sharedIssues || []).map(issue => `
            <tr class="issue-row">
                <td class="issue-name">
                    <strong>${issue.issue}</strong>
                    ${issue.agreement ? `<span class="agreement-badge ${issue.agreement}">${issue.agreement}</span>` : ''}
                </td>
                ${(issue.positions || []).map(pos => `
                    <td class="position-cell ${pos.stance || 'unknown'}">
                        <div class="position-content">
                            ${pos.position || 'No stated position'}
                        </div>
                        ${pos.confidence ? `<div class="confidence">${Math.round(pos.confidence * 100)}% confidence</div>` : ''}
                    </td>
                `).join('')}
            </tr>
        `).join('');

        // Fallback if no issues
        const issueContent = issueRows || `
            <tr>
                <td colspan="${candidates.length + 1}" class="no-issues">
                    <p>No shared policy positions found for comparison.</p>
                    <p>Try selecting candidates from the same office or with more detailed policy statements.</p>
                </td>
            </tr>
        `;

        modal.querySelector('.modal-body').innerHTML = `
            <div class="comparison-matrix-container">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th class="issue-column">Issue</th>
                            ${candidateHeaders}
                        </tr>
                    </thead>
                    <tbody>
                        ${issueContent}
                    </tbody>
                </table>

                ${comparison?.overallSummary ? `
                    <div class="comparison-summary">
                        <h4>Summary</h4>
                        <p>${comparison.overallSummary}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ==========================================
    // CANDIDATE DETAIL MODAL METHODS
    // ==========================================

    /**
     * View detailed candidate information
     */
    async viewCandidateDetail(candidateId) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay candidate-detail-overlay';
        modal.innerHTML = `
            <div class="candidate-detail-modal">
                <div class="modal-header">
                    <button class="close-btn" data-candidate-action="closeModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading candidate profile...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        try {
            // Fetch candidate details
            const response = await apiCall(`/api/candidates/${candidateId}/enhanced`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok && response.data) {
                this.renderCandidateDetail(modal, response.data);
            } else {
                // Fallback to basic endpoint
                const basicResponse = await apiCall(`/api/candidates/${candidateId}`, {
                    method: 'GET',
                    credentials: 'include'
                });

                if (basicResponse.ok && basicResponse.data) {
                    this.renderCandidateDetail(modal, basicResponse.data);
                } else {
                    throw new Error('Candidate not found');
                }
            }
        } catch (error) {
            adminDebugError('Candidate detail error:', error);
            modal.querySelector('.modal-body').innerHTML = `
                <div class="error-state">
                    <h3>Unable to Load Profile</h3>
                    <p>${error.message}</p>
                    <button class="btn secondary" data-candidate-action="closeModal">Close</button>
                </div>
            `;
        }
    }

    /**
     * Render candidate detail modal content
     */
    renderCandidateDetail(modal, candidate) {
        const initials = candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const partyColors = {
            'Democratic': '#3b5998',
            'Democrat': '#3b5998',
            'Republican': '#c94a4a',
            'Independent': '#6b7280',
            'Libertarian': '#fbbf24',
            'Green': '#22c55e'
        };
        const partyColor = partyColors[candidate.party] || '#6b7280';

        modal.querySelector('.modal-body').innerHTML = `
            <div class="candidate-detail-content">
                <!-- Hero Section -->
                <div class="detail-hero">
                    <div class="hero-photo">
                        ${candidate.photoUrl || candidate.user?.avatar
                            ? `<img src="${candidate.photoUrl || candidate.user?.avatar}" alt="${candidate.name}"/>`
                            : `<div class="hero-initials">${initials}</div>`}
                    </div>
                    <div class="hero-info">
                        <h1>${candidate.name}</h1>
                        <span class="party-badge" style="background-color: ${partyColor}">${candidate.party || 'Independent'}</span>
                        ${candidate.isIncumbent ? '<span class="incumbent-badge">Incumbent</span>' : ''}
                        <p class="office-info">${candidate.office?.title || 'Office'}</p>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="detail-tabs">
                    <button class="tab-btn active" data-tab="overview">Overview</button>
                    <button class="tab-btn" data-tab="positions">Positions</button>
                    <button class="tab-btn" data-tab="background">Background</button>
                    <button class="tab-btn" data-tab="campaign">Campaign</button>
                </div>

                <!-- Tab Content -->
                <div class="tab-content active" id="tab-overview">
                    ${candidate.platformSummary ? `
                        <div class="section">
                            <h3>Platform Summary</h3>
                            <p>${candidate.platformSummary}</p>
                        </div>
                    ` : ''}

                    ${candidate.keyIssues && candidate.keyIssues.length > 0 ? `
                        <div class="section">
                            <h3>Key Issues</h3>
                            <ul class="key-issues-list">
                                ${candidate.keyIssues.map(issue => `<li>${issue}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${candidate.endorsements && candidate.endorsements.length > 0 ? `
                        <div class="section">
                            <h3>Endorsements</h3>
                            <div class="endorsements-list">
                                ${candidate.endorsements.slice(0, 5).map(e => `
                                    <div class="endorsement">
                                        <strong>${e.user?.firstName} ${e.user?.lastName}</strong>
                                        ${e.reason ? `<p>${e.reason}</p>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="tab-content" id="tab-positions" style="display: none;">
                    ${candidate.policyPositions && candidate.policyPositions.length > 0 ? `
                        <div class="positions-grid">
                            ${candidate.policyPositions.map(pos => `
                                <div class="position-card">
                                    <div class="position-category">${pos.category || 'Policy'}</div>
                                    <h4>${pos.title}</h4>
                                    <p>${pos.summary || pos.content}</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="empty-message">No detailed policy positions available yet.</p>'}
                </div>

                <div class="tab-content" id="tab-background" style="display: none;">
                    ${candidate.biography || candidate.externalBiography ? `
                        <div class="section">
                            <h3>Biography</h3>
                            <p>${candidate.biography || candidate.externalBiography}</p>
                        </div>
                    ` : '<p class="empty-message">No biography available.</p>'}
                </div>

                <div class="tab-content" id="tab-campaign" style="display: none;">
                    <div class="campaign-links">
                        ${candidate.campaignWebsite ? `
                            <a href="${candidate.campaignWebsite}" target="_blank" rel="noopener" class="campaign-link">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="2" y1="12" x2="22" y2="12"/>
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                </svg>
                                Visit Campaign Website
                            </a>
                        ` : ''}

                        ${candidate.campaignEmail ? `
                            <a href="mailto:${candidate.campaignEmail}" class="campaign-link">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                                ${candidate.campaignEmail}
                            </a>
                        ` : ''}

                        ${candidate.campaignPhone ? `
                            <a href="tel:${candidate.campaignPhone}" class="campaign-link">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                                ${candidate.campaignPhone}
                            </a>
                        ` : ''}
                    </div>

                    ${!candidate.campaignWebsite && !candidate.campaignEmail && !candidate.campaignPhone ?
                        '<p class="empty-message">No campaign contact information available.</p>' : ''}
                </div>

                <!-- Actions -->
                <div class="detail-actions">
                    ${this.hierarchyState.selectedCandidates.has(candidate.id) ? `
                        <button class="btn secondary" data-candidate-action="toggleCandidateSelect" data-candidate-id="${candidate.id}">
                            Remove from Comparison
                        </button>
                    ` : `
                        <button class="btn primary" data-candidate-action="toggleCandidateSelect" data-candidate-id="${candidate.id}">
                            Add to Comparison
                        </button>
                    `}
                    <button class="btn secondary" data-candidate-action="closeModal">
                        Close
                    </button>
                </div>
            </div>
        `;

        // Add tab switching logic
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // Update button states
                modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Show correct tab content
                modal.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = content.id === `tab-${tabName}` ? 'block' : 'none';
                });
            });
        });
    }

    // ==========================================
    // END MODAL METHODS
    // ==========================================

    async loadElections() {
        adminDebugLog('🗳️ Loading candidates for your area...');
        
        // Show loading indicator
        const loadingIndicator = document.querySelector('#electionsLoading');
        const placeholder = document.querySelector('.elections-placeholder');
        const container = document.querySelector('.enhanced-elections-container');
        
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (placeholder) placeholder.style.display = 'none';
        
        try {
            // Call new address-based candidate endpoint
            const response = await apiCall('/api/external-candidates/for-address', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok && response.data?.success) {
                this.displayCandidateRaces(response.data.races, response.data.userAddress, container);
            } else {
                throw new Error(response.data?.error || 'Failed to load candidates');
            }
        } catch (error) {
            adminDebugError('Error loading elections:', error);
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">❌</div>
                        <h3>Unable to Load Candidates</h3>
                        <p>${error.message}</p>
                        <button class="retry-btn" data-candidate-action="loadElections">
                            🔄 Retry
                        </button>
                    </div>
                `;
            }
        } finally {
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    /**
     * Display candidate races grouped by ELECTION with registration deadlines
     */
    displayCandidateRaces(races, currentAddress, container) {
        if (!container) return;

        if (races.length === 0) {
            container.innerHTML = this.renderEmptyElectionsState(currentAddress);
            this.addCandidateRacesStyles();
            return;
        }

        // Group races by election
        const electionMap = new Map();
        races.forEach(race => {
            const electionKey = race.election?.name || race.election?.date || 'Unknown Election';
            if (!electionMap.has(electionKey)) {
                electionMap.set(electionKey, {
                    name: race.election?.name || `Election on ${race.election?.date}`,
                    date: race.election?.date,
                    registrationDeadline: race.election?.registrationDeadline,
                    type: race.election?.type || 'General',
                    races: []
                });
            }
            electionMap.get(electionKey).races.push(race);
        });

        // Sort elections by date (soonest first)
        const sortedElections = Array.from(electionMap.values()).sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date('2099-12-31');
            const dateB = b.date ? new Date(b.date) : new Date('2099-12-31');
            return dateA - dateB;
        });

        // Render elections with their races
        const electionsHTML = sortedElections.map(election => {
            const daysUntilElection = this.calculateDaysUntil(election.date);
            const daysUntilDeadline = this.calculateDaysUntil(election.registrationDeadline);
            const isDeadlineUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 14;
            const isDeadlinePassed = daysUntilDeadline !== null && daysUntilDeadline < 0;

            // Count total candidates across all races in this election
            const totalCandidates = election.races.reduce((sum, r) => sum + r.candidates.length, 0);

            // Render races under this election
            const racesHTML = election.races.map(race => this.renderRaceCard(race)).join('');

            return `
                <div class="election-group">
                    <div class="election-header">
                        <div class="election-main-info">
                            <h3 class="election-name">${this.escapeHtml(election.name)}</h3>
                            <div class="election-meta">
                                <span class="election-type-badge">${election.type}</span>
                                <span class="election-date-display">
                                    ${election.date ? this.formatElectionDate(election.date) : 'Date TBD'}
                                    ${daysUntilElection !== null && daysUntilElection >= 0 ?
                                        `<span class="days-badge">${daysUntilElection === 0 ? 'Today!' : `${daysUntilElection} days`}</span>` : ''}
                                </span>
                            </div>
                        </div>
                        <div class="election-stats">
                            <span class="contest-count">${election.races.length} contest${election.races.length !== 1 ? 's' : ''}</span>
                            <span class="total-candidates">${totalCandidates} candidate${totalCandidates !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    ${election.registrationDeadline ? `
                        <div class="registration-deadline ${isDeadlineUrgent ? 'urgent' : ''} ${isDeadlinePassed ? 'passed' : ''}">
                            <span class="deadline-icon">${isDeadlinePassed ? '⚠️' : '📋'}</span>
                            <span class="deadline-text">
                                ${isDeadlinePassed ?
                                    'Registration deadline has passed' :
                                    `Registration Deadline: ${this.formatElectionDate(election.registrationDeadline)}`}
                            </span>
                            ${!isDeadlinePassed && daysUntilDeadline !== null ? `
                                <span class="deadline-countdown ${isDeadlineUrgent ? 'urgent' : ''}">
                                    ${daysUntilDeadline === 0 ? 'Last day to register!' :
                                      daysUntilDeadline === 1 ? '1 day left' :
                                      `${daysUntilDeadline} days left`}
                                </span>
                            ` : ''}
                        </div>
                    ` : ''}

                    <div class="election-contests">
                        ${racesHTML}
                    </div>

                    <div class="election-actions">
                        <button class="explore-more-btn" data-candidate-action="selectLevel" data-level="${this.inferLevelFromRaces(election.races)}">
                            Explore all ${this.inferLevelFromRaces(election.races)} candidates
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="elections-display-v2">
                <div class="address-controls">
                    <div class="address-header">
                        <h3>Your Upcoming Elections</h3>
                        <p class="address-subtitle">Based on your location</p>
                    </div>
                    <div class="address-input-group">
                        <input type="text"
                               id="candidateAddressInput"
                               placeholder="Enter a different address..."
                               value="${currentAddress || ''}"
                               class="address-input">
                        <button class="btn primary" data-candidate-action="searchCandidatesByAddress">
                            Update
                        </button>
                    </div>
                    ${currentAddress ? `
                        <div class="current-address">
                            <span class="address-icon">📍</span>
                            <span>${this.escapeHtml(currentAddress)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="elections-list">
                    ${electionsHTML}
                </div>
            </div>
        `;

        this.addCandidateRacesStyles();
    }

    /**
     * Render empty state when no elections found
     */
    renderEmptyElectionsState(currentAddress) {
        return `
            <div class="elections-display-v2">
                <div class="address-controls">
                    <div class="address-header">
                        <h3>Your Upcoming Elections</h3>
                    </div>
                    <div class="address-input-group">
                        <input type="text"
                               id="candidateAddressInput"
                               placeholder="Enter your address..."
                               value="${currentAddress || ''}"
                               class="address-input">
                        <button class="btn primary" data-candidate-action="searchCandidatesByAddress">
                            Search
                        </button>
                    </div>
                </div>
                <div class="no-elections-state">
                    <div class="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                    </div>
                    <h3>No Upcoming Elections Found</h3>
                    <p>We couldn't find election data for this address. Try a different address or check back as election data is updated.</p>
                    <button class="btn secondary" data-candidate-action="backToLevels">
                        Browse All Candidates
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render a single race card within an election
     */
    renderRaceCard(race) {
        const candidatesPreview = race.candidates.slice(0, 4);
        const remainingCount = race.candidates.length - 4;

        return `
            <div class="race-card">
                <div class="race-card-header">
                    <div class="race-title-area">
                        <h4 class="race-title">${this.escapeHtml(race.office)}</h4>
                        <div class="race-badges">
                            <span class="level-badge level-${race.level?.toLowerCase() || 'local'}">${race.level || 'Local'}</span>
                            ${race.district ? `<span class="district-badge">${this.escapeHtml(race.district)}</span>` : ''}
                        </div>
                    </div>
                    <span class="race-candidate-count">${race.candidates.length}</span>
                </div>

                <div class="race-candidates-preview">
                    ${candidatesPreview.map(c => `
                        <div class="candidate-chip ${c.isRegistered ? 'registered' : 'external'}">
                            <span class="candidate-chip-name">${this.escapeHtml(c.name)}</span>
                            ${c.party ? `<span class="candidate-chip-party">${c.party.substring(0, 1)}</span>` : ''}
                        </div>
                    `).join('')}
                    ${remainingCount > 0 ? `<span class="more-candidates">+${remainingCount} more</span>` : ''}
                </div>

                <button class="race-view-btn" data-candidate-action="viewRaceDetail" data-race-office="${this.escapeHtml(race.office)}">
                    View Candidates
                </button>
            </div>
        `;
    }

    /**
     * Calculate days until a date
     */
    calculateDaysUntil(dateStr) {
        if (!dateStr) return null;
        const targetDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    /**
     * Format election date for display
     */
    formatElectionDate(dateStr) {
        if (!dateStr) return 'Date TBD';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /**
     * Infer the primary level from a set of races
     */
    inferLevelFromRaces(races) {
        const levels = races.map(r => r.level?.toUpperCase()).filter(Boolean);
        if (levels.includes('FEDERAL')) return 'FEDERAL';
        if (levels.includes('STATE')) return 'STATE';
        if (levels.includes('LOCAL')) return 'LOCAL';
        return 'LOCAL';
    }

    // Legacy method for backwards compatibility
    renderLegacyRaceGroup(race) {
        const candidatesHTML = race.candidates.map(candidate => `
            <div class="candidate-card ${candidate.isRegistered ? 'registered-candidate' : 'external-candidate'}">
                <div class="candidate-header">
                    <h4 class="candidate-name">${this.escapeHtml(candidate.name)}</h4>
                    <div class="candidate-badges">
                        ${candidate.party ? `<span class="party-badge">${this.escapeHtml(candidate.party)}</span>` : ''}
                        ${candidate.isRegistered ? '<span class="source-badge registered">Registered</span>' : '<span class="source-badge external">External</span>'}
                    </div>
                </div>
                ${candidate.isRegistered ? `
                    <div class="candidate-actions">
                        <button class="btn primary small" data-candidate-action="viewCandidateProfile" data-username="${candidate.username}">
                            View Profile
                        </button>
                        <button class="btn secondary small" data-candidate-action="contactCandidate" data-candidate-id="${candidate.id}">
                            Contact
                        </button>
                    </div>
                ` : `
                    <div class="candidate-actions">
                        <button class="btn outline small" data-candidate-action="viewExternalCandidate" data-candidate-id="${candidate.id}">
                            View Details
                        </button>
                        ${candidate.campaignWebsite ? `
                            <a href="${candidate.campaignWebsite}" target="_blank" class="btn secondary small">
                                Website
                            </a>
                        ` : ''}
                    </div>
                `}
            </div>
        `).join('');

        return `
            <div class="race-group">
                <div class="race-header">
                    <div class="race-info">
                        <h3 class="race-title">${this.escapeHtml(race.office)}</h3>
                        <div class="race-meta">
                            <span class="election-date">${race.election.date}</span>
                            <span class="office-level">${race.level}</span>
                            ${race.district ? `<span class="district">${this.escapeHtml(race.district)}</span>` : ''}
                        </div>
                    </div>
                    <div class="candidate-count">${race.candidates.length} candidate${race.candidates.length === 1 ? '' : 's'}</div>
                </div>
                <div class="candidates-grid">
                    ${candidatesHTML}
                </div>
            </div>
        `;
    }

    /**
     * Search candidates by address from input field
     */
    async searchCandidatesByAddress() {
        const addressInput = document.getElementById('candidateAddressInput');
        const address = addressInput?.value?.trim();

        if (!address) {
            this.showToast('Please enter an address', 'error');
            return;
        }

        try {
            const loadingIndicator = document.querySelector('#electionsLoading');
            if (loadingIndicator) loadingIndicator.style.display = 'flex';

            const response = await apiCall('/api/external-candidates/for-address', {
                method: 'GET',
                credentials: 'include'
            }, `?address=${encodeURIComponent(address)}`);

            if (response.ok && response.data?.success) {
                const container = document.querySelector('.enhanced-elections-container');
                this.displayCandidateRaces(response.data.races, response.data.userAddress, container);
            } else {
                throw new Error(response.data?.error || 'Failed to search candidates');
            }
        } catch (error) {
            adminDebugError('Error searching candidates:', error);
            this.showToast('Failed to search candidates: ' + error.message, 'error');
        } finally {
            const loadingIndicator = document.querySelector('#electionsLoading');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    /**
     * Add styles for candidate races display
     */
    addCandidateRacesStyles() {
        if (document.getElementById('candidate-races-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'candidate-races-styles';
        styles.innerHTML = `
            .candidate-races-display {
                padding: 1rem;
            }

            .address-controls {
                background: white;
                padding: 1.5rem;
                border-radius: 12px;
                margin-bottom: 2rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .address-header h3 {
                margin: 0 0 1rem 0;
                color: #333;
            }

            .address-input-group {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 1rem;
            }

            .address-input {
                flex: 1;
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 1rem;
            }

            .current-address {
                color: #666;
                font-size: 0.9rem;
                padding: 0.5rem;
                background: #f8f9fa;
                border-radius: 4px;
            }

            .race-group {
                background: white;
                border-radius: 12px;
                margin-bottom: 1.5rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
            }

            .race-header {
                padding: 1.5rem;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: start;
            }

            .race-title {
                margin: 0 0 0.5rem 0;
                color: #333;
                font-size: 1.3rem;
            }

            .race-meta {
                display: flex;
                gap: 1rem;
                font-size: 0.9rem;
                color: #666;
            }

            .candidate-count {
                background: #ff6b35;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-weight: 600;
                font-size: 0.9rem;
            }

            .candidates-grid {
                padding: 1rem;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1rem;
            }

            .candidate-card {
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 1rem;
                transition: all 0.2s;
            }

            .candidate-card:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                transform: translateY(-2px);
            }

            .registered-candidate {
                border-left: 4px solid #28a745;
            }

            .external-candidate {
                border-left: 4px solid #007bff;
            }

            .candidate-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 1rem;
            }

            .candidate-name {
                margin: 0;
                color: #333;
                font-size: 1.1rem;
            }

            .candidate-badges {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                align-items: flex-end;
            }

            .party-badge {
                background: #e9ecef;
                color: #333;
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 600;
            }

            .source-badge {
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .source-badge.registered {
                background: #d4edda;
                color: #155724;
            }

            .source-badge.external {
                background: #cce7ff;
                color: #0056b3;
            }

            .candidate-actions {
                display: flex;
                gap: 0.5rem;
            }

            .btn.small {
                padding: 0.5rem 0.75rem;
                font-size: 0.85rem;
            }

            .no-candidates, .error-state {
                text-align: center;
                padding: 3rem 2rem;
                color: #666;
            }

            .no-candidates-icon, .error-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }

            .retry-btn {
                margin-top: 1rem;
                padding: 0.75rem 1.5rem;
                background: #ff6b35;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .retry-btn:hover {
                background: #e55a30;
            }

            @media (max-width: 768px) {
                .address-input-group {
                    flex-direction: column;
                }

                .race-header {
                    flex-direction: column;
                    gap: 1rem;
                }

                .candidates-grid {
                    grid-template-columns: 1fr;
                }

                .candidate-header {
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .candidate-badges {
                    align-items: flex-start;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * View candidate profile for registered candidates
     */
    viewCandidateProfile(username) {
        if (username && window.openUserProfile) {
            window.openUserProfile(null, username);
        }
    }

    /**
     * Contact a registered candidate
     */
    contactCandidate(candidateId) {
        // TODO: Implement candidate contact system
        this.showToast('Contact system coming soon!');
    }

    /**
     * View external candidate details
     */
    viewExternalCandidate(candidateId) {
        // TODO: Implement external candidate details view
        this.showToast('External candidate details coming soon!');
    }

    /**
     * Escape HTML for security
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    /**
     * Search candidates from placeholder address input
     */
    async searchFromPlaceholder() {
        const addressInput = document.getElementById('placeholderAddressInput');
        const address = addressInput?.value?.trim();

        if (!address) {
            this.showToast('Please enter an address', 'error');
            addressInput?.focus();
            return;
        }

        try {
            const loadingIndicator = document.querySelector('#electionsLoading');
            const placeholder = document.querySelector('.elections-placeholder');

            if (loadingIndicator) loadingIndicator.style.display = 'flex';
            if (placeholder) placeholder.style.display = 'none';

            const response = await apiCall('/api/external-candidates/for-address', {
                method: 'GET',
                credentials: 'include'
            }, `?address=${encodeURIComponent(address)}`);

            if (response.ok && response.data?.success) {
                const container = document.querySelector('.enhanced-elections-container');
                this.displayCandidateRaces(response.data.races, response.data.userAddress, container);
            } else {
                throw new Error(response.data?.error || 'Failed to search candidates');
            }
        } catch (error) {
            adminDebugError('Error searching candidates:', error);
            this.showToast('Failed to search candidates: ' + error.message, 'error');
            
            // Show placeholder again on error
            const placeholder = document.querySelector('.elections-placeholder');
            if (placeholder) placeholder.style.display = 'block';
        } finally {
            const loadingIndicator = document.querySelector('#electionsLoading');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    addCandidateMainViewStyles() {
        // Check if styles already added
        if (document.querySelector('#candidate-main-view-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'candidate-main-view-styles';
        style.textContent = `
            .candidate-main-view {
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

            .candidate-main-view.sidebar-expanded {
                left: 10.5vw;
            }

            .candidate-header {
                background: linear-gradient(135deg, #202e0c, #4b5c09);
                color: white;
                padding: 2rem 2rem 1.5rem 2rem;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }

            .header-content h1 {
                margin: 0 0 0.5rem 0;
                font-size: 2.5rem;
                font-weight: 600;
            }

            .subtitle {
                margin: 0 0 1.5rem 0;
                font-size: 1.1rem;
                opacity: 0.9;
                font-weight: 300;
            }

            .header-actions {
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
            
            .header-btn.register {
                background: linear-gradient(135deg, #ff6b35, #f7931e);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                font-weight: 600;
            }
            
            .header-btn.register:hover {
                background: linear-gradient(135deg, #e55a2b, #d67e1a);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
            }

            .candidate-content {
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
            
            .feature-card.registration {
                cursor: pointer;
                background: linear-gradient(135deg, #fff5f3, #ffffff);
                border-left: 4px solid #ff6b35;
                transition: all 0.3s ease;
            }
            
            .feature-card.registration:hover {
                transform: translateY(-4px) scale(1.02);
                box-shadow: 0 8px 24px rgba(255, 107, 53, 0.2);
                background: linear-gradient(135deg, #fff0eb, #ffffff);
            }
            
            .register-tag {
                background: #ff6b35;
                color: white;
            }

            .feature-card {
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: transform 0.2s, box-shadow 0.2s;
                border-left: 4px solid #4b5c09;
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
                color: #202e0c;
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
                background: #f0f8f0;
                color: #4b5c09;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .elections-content {
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
                color: #202e0c;
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
                border-top: 2px solid #4b5c09;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .elections-placeholder {
                text-align: center;
                padding: 4rem 2rem;
                color: #666;
            }

            .placeholder-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }

            .elections-placeholder h3 {
                margin: 0 0 0.5rem 0;
                color: #202e0c;
                font-size: 1.5rem;
            }

            .elections-placeholder p {
                margin: 0 0 2rem 0;
                font-size: 1rem;
                line-height: 1.4;
            }

            .placeholder-btn {
                padding: 1rem 2rem;
                background: linear-gradient(135deg, #4b5c09, #6b7c19);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .placeholder-btn:hover {
                background: linear-gradient(135deg, #202e0c, #4b5c09);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            .placeholder-address-input {
                display: flex;
                gap: 0.5rem;
                justify-content: center;
                margin-bottom: 1.5rem;
                max-width: 500px;
                margin-left: auto;
                margin-right: auto;
            }
            .placeholder-address-input .address-input {
                flex: 1;
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 1rem;
                min-width: 200px;
            }
            .placeholder-alt {
                margin-top: 1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 1rem;
            }
            .placeholder-alt span {
                color: #999;
                font-style: italic;
            }
            .placeholder-btn.secondary {
                background: linear-gradient(135deg, #666, #888);
                padding: 0.75rem 1.5rem;
            }
            .placeholder-btn.secondary:hover {
                background: linear-gradient(135deg, #555, #777);
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
                .candidate-header {
                    padding: 1.5rem 1rem;
                }
                
                .header-content h1 {
                    font-size: 2rem;
                }
                
                .candidate-content {
                    padding: 1rem;
                }
                
                .header-actions {
                    justify-content: stretch;
                }
                
                .header-btn {
                    flex: 1;
                    text-align: center;
                }
                
                .elections-placeholder {
                    padding: 2rem 1rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    adjustMapForCandidateView() {
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
                border: 2px solid #4b5c09 !important;
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
                    background: rgba(75, 92, 9, 0.9);
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
        
        if (mainContent && mainContent.dataset.originalContent) {
            mainContent.innerHTML = mainContent.dataset.originalContent;
            delete mainContent.dataset.originalContent;
            
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

    scrollToElections() {
        const electionsContainer = document.querySelector('.enhanced-elections-container') ||
                                  document.querySelector('.elections-container') ||
                                  document.querySelector('#elections');
        
        if (electionsContainer) {
            electionsContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            // If no elections container exists, create one
            if (this.candidateSystem) {
                this.candidateSystem.loadCandidateProfiles();
            }
        }
    }

    showCandidateComparison() {
        // Find the first office with multiple candidates for demo
        const compareButton = document.querySelector('.compare-candidates-btn');
        if (compareButton) {
            compareButton.click();
        } else {
            this.showMessage('No candidates available for comparison yet. Check back as election data is updated!');
        }
    }

    showAIAnalysis() {
        // Show AI capabilities modal
        this.showAICapabilitiesModal();
    }

    showAICapabilitiesModal() {
        const modal = document.createElement('div');
        modal.className = 'candidate-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>🤖 AI-Powered Candidate Analysis</h3>
                    <button class="modal-close" data-candidate-action="closeModal">×</button>
                </div>
                <div class="modal-body">
                    <div class="ai-capabilities">
                        <h4>🎯 What Our AI Can Do:</h4>
                        
                        <div class="capability-grid">
                            <div class="capability-item">
                                <div class="capability-icon">📊</div>
                                <h5>Policy Position Analysis</h5>
                                <p>Analyze candidate statements and voting records to identify positions on key issues</p>
                            </div>
                            
                            <div class="capability-item">
                                <div class="capability-icon">⚖️</div>
                                <h5>Neutral Comparisons</h5>
                                <p>Compare candidates objectively without political bias, focusing on merit of ideas</p>
                            </div>
                            
                            <div class="capability-item">
                                <div class="capability-icon">🔍</div>
                                <h5>Missing Position Detection</h5>
                                <p>Identify topics where candidates haven't taken public positions and provide direct contact</p>
                            </div>
                            
                            <div class="capability-item">
                                <div class="capability-icon">🎭</div>
                                <h5>Stance Classification</h5>
                                <p>Categorize positions as for/against/neutral/nuanced with confidence scoring</p>
                            </div>
                        </div>
                        
                        <div class="ai-status">
                            <h4>🔧 System Status:</h4>
                            <div class="status-grid">
                                <div class="status-item">
                                    <span class="status-label">Multi-tier Election Data:</span>
                                    <span class="status-badge active">Active</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Photo Management:</span>
                                    <span class="status-badge active">Active</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Political Messaging:</span>
                                    <span class="status-badge active">Active</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Qwen3 AI Analysis:</span>
                                    <span class="status-badge conditional">Configurable</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="privacy-note">
                            <h4>🛡️ Privacy & Ethics:</h4>
                            <ul>
                                <li>All analysis focuses on publicly available information</li>
                                <li>No political bias - evaluates merit of ideas, not partisan alignment</li>
                                <li>User data never shared with external AI services</li>
                                <li>Full transparency in how positions are analyzed</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles for the capabilities modal
        const style = document.createElement('style');
        style.textContent = `
            .capability-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
                margin: 1rem 0;
            }
            
            .capability-item {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
            }
            
            .capability-icon {
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }
            
            .capability-item h5 {
                margin: 0.5rem 0;
                color: #202e0c;
            }
            
            .capability-item p {
                font-size: 0.9rem;
                color: #666;
                line-height: 1.4;
                margin: 0;
            }
            
            .status-grid {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin: 1rem 0;
            }
            
            .status-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem;
                background: #f8f9fa;
                border-radius: 4px;
            }
            
            .status-label {
                font-weight: 500;
            }
            
            .status-badge {
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 500;
            }
            
            .status-badge.active {
                background: #28a745;
                color: white;
            }
            
            .status-badge.conditional {
                background: #ffc107;
                color: #000;
            }
            
            .privacy-note {
                background: #e7f3ff;
                border: 1px solid #b3d7ff;
                border-radius: 8px;
                padding: 1rem;
                margin-top: 1.5rem;
            }
            
            .privacy-note h4 {
                margin: 0 0 0.5rem 0;
                color: #202e0c;
            }
            
            .privacy-note ul {
                margin: 0;
                padding-left: 1.2rem;
            }
            
            .privacy-note li {
                margin: 0.3rem 0;
                color: #555;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);
    }

    showCandidateRegistration() {
        adminDebugLog('🏆 Opening candidate registration flow...');
        this.showCandidateRegistrationModal();
    }
    
    showCandidateRegistrationModal() {
        const modal = document.createElement('div');
        modal.className = 'candidate-registration-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container registration-container">
                <div class="modal-header registration-header">
                    <h3>🏆 Register as a Candidate</h3>
                    <button class="modal-close" data-candidate-action="closeModal">×</button>
                </div>
                <div class="modal-body registration-body">
                    <div class="registration-steps">
                        <div class="step active" data-step="1">
                            <div class="step-number">1</div>
                            <span>Personal Info</span>
                        </div>
                        <div class="step" data-step="2">
                            <div class="step-number">2</div>
                            <span>Verification & Payment</span>
                        </div>
                        <div class="step" data-step="3">
                            <div class="step-number">3</div>
                            <span>Campaign Info</span>
                        </div>
                    </div>
                    
                    <form id="candidateRegistrationForm" class="registration-form">
                        <!-- Step 1: Personal Information -->
                        <div class="form-step active" data-step="1">
                            <h4>👤 Personal Information</h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="firstName">First Name *</label>
                                    <input type="text" id="firstName" name="firstName" required>
                                </div>
                                <div class="form-group">
                                    <label for="lastName">Last Name *</label>
                                    <input type="text" id="lastName" name="lastName" required>
                                </div>
                                <div class="form-group">
                                    <label for="email">Email Address *</label>
                                    <input type="email" id="email" name="email" required>
                                </div>
                                <div class="form-group">
                                    <label for="phone">Phone Number *</label>
                                    <input type="tel" id="phone" name="phone" required>
                                </div>
                            </div>
                            
                            <h5>🏠 Address Information</h5>
                            <div class="form-grid">
                                <div class="form-group span-2">
                                    <label for="street">Street Address *</label>
                                    <input type="text" id="street" name="street" required>
                                </div>
                                <div class="form-group">
                                    <label for="city">City *</label>
                                    <input type="text" id="city" name="city" required>
                                </div>
                                <div class="form-group">
                                    <label for="state">State *</label>
                                    <select id="state" name="state" required>
                                        <option value="">Select State</option>
                                        <option value="IL">Illinois</option>
                                        <option value="CA">California</option>
                                        <option value="TX">Texas</option>
                                        <option value="NY">New York</option>
                                        <option value="FL">Florida</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="zipCode">ZIP Code *</label>
                                    <input type="text" id="zipCode" name="zipCode" required>
                                </div>
                                <div class="form-group">
                                    <label for="district">District (if applicable)</label>
                                    <input type="text" id="district" name="district">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 2: Verification & Payment -->
                        <div class="form-step" data-step="2">
                            <h4>💳 Registration Payment</h4>
                            <div class="nonprofit-message">
                                <div class="nonprofit-badge">
                                    <span class="badge-icon">💚</span>
                                    <strong>Nonprofit Mission:</strong> Supporting Grassroots Democracy
                                </div>
                                <p>Our registration fees are designed to deter unserious candidates while keeping the platform accessible to genuine community leaders. All proceeds support platform development and voter education.</p>
                            </div>
                            
                            <div class="payment-section">
                                <div class="office-level-selector">
                                    <h6>Select Your Office Level</h6>
                                    <div class="office-grid">
                                        <div class="office-card" data-level="local">
                                            <h5>Local Office</h5>
                                            <div class="office-price">$50</div>
                                            <div class="office-examples">School Board • City Council • Local Judges</div>
                                        </div>
                                        <div class="office-card" data-level="regional">
                                            <h5>Regional Office</h5>
                                            <div class="office-price">$100</div>
                                            <div class="office-examples">Mayor • County • State House/Senate</div>
                                        </div>
                                        <div class="office-card recommended" data-level="state">
                                            <h5>State Office</h5>
                                            <div class="office-price">$200</div>
                                            <div class="office-examples">Governor • Lt. Governor • Attorney General</div>
                                        </div>
                                        <div class="office-card" data-level="federal">
                                            <h5>Federal Office</h5>
                                            <div class="office-price">$400</div>
                                            <div class="office-examples">US House • US Senate</div>
                                        </div>
                                        <div class="office-card presidential" data-level="presidential">
                                            <h5>Presidential</h5>
                                            <div class="office-price">$1,000</div>
                                            <div class="office-examples">President of the United States</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="payment-info">
                                    <div class="fee-waivers-section">
                                    <h6>🤝 Need Assistance? We Offer Fee Waivers</h6>
                                    <div class="waiver-options">
                                        <label class="waiver-option">
                                            <input type="checkbox" id="requestHardshipWaiver" name="requestHardshipWaiver">
                                            <span class="waiver-icon">💙</span>
                                            <div class="waiver-info">
                                                <strong>Financial Hardship Waiver</strong>
                                                <small>For candidates facing financial barriers to running</small>
                                            </div>
                                        </label>
                                        <div class="hardship-details" id="hardshipDetails" style="display: none;">
                                            <textarea id="hardshipReason" placeholder="Please explain your financial situation and why you need a waiver..." rows="3"></textarea>
                                        </div>
                                    </div>
                                    
                                </div>
                                
                                <div class="selected-office" id="selectedOfficeInfo">
                                    <h6>Registration Fee: <span id="selectedOfficeName">Select Office Level</span></h6>
                                    <div class="fee-breakdown">
                                        <div class="fee-line">
                                            <span>Base Fee:</span>
                                            <span id="baseFee">$0.00</span>
                                        </div>
                                        <div class="fee-line total">
                                            <span><strong>Total Due:</strong></span>
                                            <span id="totalFee"><strong>$0.00</strong></span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="candidate-agreement">
                                    <h6>📝 Candidate Agreement</h6>
                                    <label class="agreement-checkbox">
                                        <input type="checkbox" id="candidateAgreement" name="candidateAgreement" required>
                                        <div class="agreement-text">
                                            <strong>I confirm in good faith that I am running for the selected office.</strong> I acknowledge that as part of my Candidate registration, I must confirm that I continue to be eligible for this race, and will meet all filing deadlines. I acknowledge that if I fail to meet a deadline, my candidate profile may be revoked. Any revocation may be appealed in writing. I further agree to abide by all of the rules of UnitedWeRise and am in compliance with all federal, state, and local election laws and regulations. <strong>I expressly consent to and authorize UnitedWeRise to submit my information for third-party identity verification services as deemed necessary for platform integrity and fraud prevention.</strong>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Step 3: Campaign Info -->
                        <div class="form-step" data-step="3">
                            <h4>🏗️ Position & Campaign Details</h4>
                            <div class="payment-level-info">
                                <div class="paid-level-badge">
                                    <span class="badge-icon">💳</span>
                                    <strong>Payment Completed:</strong> <span id="paidOfficeLevelName">Office Level</span>
                                </div>
                                <p>You can select any office that falls under your paid level or lower. Higher level offices require additional payment.</p>
                            </div>
                            
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="positionTitle">Office Title *</label>
                                    <input type="text" id="positionTitle" name="positionTitle" placeholder="e.g., Mayor, City Council, State Senator">
                                </div>
                                <div class="form-group">
                                    <label for="positionLevel">Government Level *</label>
                                    <select id="positionLevel" name="positionLevel">
                                        <option value="">Select Level</option>
                                        <!-- Options will be populated based on payment level -->
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="positionDistrict">District/Jurisdiction</label>
                                    <input type="text" id="positionDistrict" name="positionDistrict" placeholder="e.g., District 5, Ward 3">
                                </div>
                                <div class="form-group">
                                    <label for="electionDate">Election Date *</label>
                                    <input type="date" id="electionDate" name="electionDate">
                                </div>
                            </div>
                            
                            <h5>💯 Campaign Information</h5>
                            <div class="form-grid">
                                <div class="form-group span-2">
                                    <label for="campaignName">Campaign Name *</label>
                                    <input type="text" id="campaignName" name="campaignName" placeholder="e.g., Smith for Mayor">
                                </div>
                                <div class="form-group span-2">
                                    <label for="campaignWebsite">Campaign Website</label>
                                    <input type="url" id="campaignWebsite" name="campaignWebsite" placeholder="https://www.yourname.com">
                                </div>
                                <div class="form-group span-2">
                                    <label for="campaignSlogan">Campaign Slogan</label>
                                    <input type="text" id="campaignSlogan" name="campaignSlogan" placeholder="Your campaign motto" maxlength="500">
                                </div>
                                <div class="form-group span-2">
                                    <label for="campaignDescription">Campaign Description</label>
                                    <textarea id="campaignDescription" name="campaignDescription" placeholder="Brief description of your campaign and key issues" maxlength="2000" rows="4"></textarea>
                                </div>
                            </div>
                            
                            <div class="terms-agreement">
                                <label class="terms-checkbox">
                                    <input type="checkbox" id="agreeToTerms" name="agreeToTerms">
                                    <span class="checkmark"></span>
                                    I agree to the <a href="#" data-action="open-legal-terms">Terms and Conditions</a> and <a href="#" data-action="open-legal-privacy">Privacy Policy</a>
                                </label>
                            </div>
                        </div>
                    </form>
                </div>
                
                <div class="form-navigation" style="display: flex !important; justify-content: space-between; padding: 1rem 1.5rem; border-top: 1px solid #e9ecef; background: white;">
                    <button type="button" class="nav-btn prev" id="prevStep" data-candidate-action="previousStep" style="padding: 0.75rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        ← Previous
                    </button>
                    <button type="button" class="nav-btn next" id="nextStep" data-candidate-action="nextStep" style="padding: 0.75rem 1.5rem; background: #ff6b35; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Next →
                    </button>
                    <button type="button" class="nav-btn submit" id="submitRegistration" data-candidate-action="submitRegistration" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; border-radius: 6px; cursor: pointer; display: none;">
                        🏆 Complete Registration
                    </button>
                </div>
            </div>
        `;
        
        this.addCandidateRegistrationStyles();
        document.body.appendChild(modal);
        
        // Initialize form state
        this.currentStep = 1;
        this.selectedOfficeLevel = 'state';
        this.updateStepDisplay();
        this.setupOfficeLevelSelector();
        this.setupWaiverHandlers();
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

    addCandidateRegistrationStyles() {
        if (document.querySelector('#candidate-registration-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'candidate-registration-styles';
        style.textContent = `
            .candidate-registration-modal .modal-container {
                max-width: 900px;
                width: 90vw;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .registration-header {
                background: linear-gradient(135deg, #ff6b35, #f7931e);
                color: white;
                padding: 1rem 1.5rem;
                margin: 0;
                border-radius: 12px 12px 0 0;
            }
            
            .registration-steps {
                display: flex;
                justify-content: center;
                margin: 1rem 0;
                gap: 1.5rem;
            }
            
            .step {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                opacity: 0.5;
                transition: all 0.3s ease;
            }
            
            .step.active {
                opacity: 1;
                color: #ff6b35;
            }
            
            .step-number {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: #e9ecef;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            
            .step.active .step-number {
                background: #ff6b35;
                color: white;
            }
            
            .registration-form {
                padding: 0 1.5rem;
            }
            
            .form-step {
                display: none;
                animation: fadeIn 0.3s ease;
                min-height: 400px;
                width: 100%;
            }
            
            .form-step.active {
                display: block;
            }
            
            .form-step h4 {
                margin: 0.75rem 0;
                font-size: 1.25rem;
            }
            
            .form-step h5 {
                margin: 0.75rem 0 0.5rem 0;
                font-size: 1.1rem;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            .form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
                margin-bottom: 1rem;
            }
            
            .form-group {
                display: flex;
                flex-direction: column;
            }
            
            .form-group.span-2 {
                grid-column: span 2;
            }
            
            .form-group label {
                font-weight: 500;
                margin-bottom: 0.25rem;
                color: #333;
                font-size: 0.9rem;
            }
            
            .form-group input,
            .form-group select,
            .form-group textarea {
                padding: 0.5rem;
                border: 2px solid #e9ecef;
                border-radius: 6px;
                font-size: 0.9rem;
                transition: border-color 0.3s ease;
            }
            
            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: #ff6b35;
                box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
            }
            
            .verification-card {
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 12px;
                padding: 1rem;
                text-align: center;
                margin-bottom: 1rem;
            }
            
            .verification-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            
            .verification-card ul {
                text-align: left;
                margin: 1rem 0;
            }
            
            .status-badge {
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-weight: 500;
                margin: 1rem;
            }
            
            .status-badge.pending {
                background: #ffc107;
                color: #000;
            }
            
            .status-badge.verified {
                background: #28a745;
                color: white;
            }
            
            .verify-btn {
                background: linear-gradient(135deg, #007bff, #0056b3);
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-top: 1rem;
            }
            
            .verify-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
            }
            
            .nonprofit-message {
                background: linear-gradient(135deg, #e8f5e8, #f0fff0);
                border: 2px solid #28a745;
                border-radius: 12px;
                padding: 1rem;
                margin-bottom: 1rem;
                text-align: center;
            }
            
            .nonprofit-badge {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
                color: #28a745;
                font-size: 1.1rem;
            }
            
            .badge-icon {
                font-size: 1.3rem;
            }
            
            .payment-level-info {
                background: #e8f5e8;
                border: 1px solid #28a745;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 2rem;
            }
            
            .paid-level-badge {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }
            
            .paid-level-badge .badge-icon {
                font-size: 1.2rem;
            }
            
            .office-level-selector {
                margin-bottom: 2rem;
            }
            
            .office-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin: 1rem 0;
            }
            
            .office-card {
                border: 2px solid #e9ecef;
                border-radius: 12px;
                padding: 1.5rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            }
            
            .office-card.recommended {
                border-color: #ff6b35;
                box-shadow: 0 4px 12px rgba(255, 107, 53, 0.1);
            }
            
            .office-card.selected {
                border-color: #ff6b35;
                background: linear-gradient(135deg, #fff5f3, #ffffff);
                transform: translateY(-2px);
            }
            
            .office-card.presidential {
                border-color: #6f42c1;
            }
            
            .office-card.presidential.selected {
                border-color: #6f42c1;
                background: linear-gradient(135deg, #f8f5ff, #ffffff);
            }
            
            .office-price {
                font-size: 1.8rem;
                font-weight: bold;
                color: #ff6b35;
                margin: 0.5rem 0;
            }
            
            .office-card.presidential .office-price {
                color: #6f42c1;
            }
            
            .office-examples {
                font-size: 0.85rem;
                color: #666;
                margin-top: 0.5rem;
                line-height: 1.4;
            }
            
            .fee-waivers-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 1.5rem;
                margin: 1.5rem 0;
            }
            
            .waiver-option {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin: 1rem 0;
                cursor: pointer;
                padding: 1rem;
                border-radius: 8px;
                transition: background-color 0.3s ease;
            }
            
            .waiver-option:hover {
                background: rgba(40, 167, 69, 0.05);
            }
            
            .waiver-icon {
                font-size: 1.5rem;
            }
            
            .waiver-info strong {
                color: #28a745;
                display: block;
                margin-bottom: 0.25rem;
            }
            
            .waiver-info small {
                color: #666;
            }
            
            .hardship-details {
                margin-top: 1rem;
                margin-left: 3rem;
            }
            
            .hardship-details textarea {
                width: 100%;
                border: 2px solid #e9ecef;
                border-radius: 6px;
                padding: 0.75rem;
                font-family: inherit;
                resize: vertical;
            }
            
            .community-endorsement-info {
                margin-top: 1.5rem;
                padding-top: 1.5rem;
                border-top: 1px solid #e9ecef;
            }
            
            .endorsement-badge {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: #17a2b8;
                margin-bottom: 0.5rem;
            }
            
            .selected-office {
                background: #fff;
                border: 2px solid #ff6b35;
                border-radius: 12px;
                padding: 1.5rem;
                margin-top: 2rem;
            }
            
            .candidate-agreement {
                background: #f8f9fa;
                border: 2px solid #007bff;
                border-radius: 12px;
                padding: 1rem;
                margin-top: 1rem;
            }
            
            .candidate-agreement h6 {
                margin: 0 0 0.75rem 0;
                color: #007bff;
                font-size: 1rem;
            }
            
            .agreement-checkbox {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                cursor: pointer;
            }
            
            .agreement-checkbox input[type="checkbox"] {
                margin-top: 0.25rem;
                flex-shrink: 0;
            }
            
            .agreement-text {
                font-size: 0.9rem;
                line-height: 1.4;
                color: #333;
            }
            
            .fee-breakdown {
                margin-top: 1rem;
            }
            
            .fee-line {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 0.5rem 0;
                padding: 0.5rem 0;
            }
            
            .fee-line.discount {
                color: #28a745;
                font-weight: 500;
            }
            
            .fee-line.total {
                border-top: 2px solid #e9ecef;
                padding-top: 1rem;
                margin-top: 1rem;
                font-size: 1.1rem;
            }
            
            .payment-option {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin: 0.5rem 0;
                cursor: pointer;
            }
            
            .payment-icon {
                font-size: 1.2rem;
            }
            
            .terms-checkbox {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
                margin: 1rem 0;
            }
            
            .form-navigation {
                display: flex;
                justify-content: space-between;
                padding: 2rem;
                border-top: 1px solid #e9ecef;
                margin-top: 2rem;
            }
            
            .nav-btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .nav-btn.prev {
                background: #6c757d;
                color: white;
            }
            
            .nav-btn.next {
                background: #ff6b35;
                color: white;
            }
            
            .nav-btn.submit {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                font-size: 1.1rem;
            }
            
            .nav-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            
            .nav-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            @media (max-width: 768px) {
                .form-grid {
                    grid-template-columns: 1fr;
                }
                
                .registration-steps {
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .office-grid {
                    grid-template-columns: 1fr 1fr;
                }
            }
            
            @media (max-width: 480px) {
                .office-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    async nextStep() {
        if (this.currentStep < 3) {
            if (this.validateCurrentStep()) {
                // Special handling for Step 2 → Step 3: Process payment
                if (this.currentStep === 2) {
                    await this.processPayment();
                } else {
                    this.currentStep++;
                    this.updateStepDisplay();
                }
            }
        }
    }

    async processPayment() {
        // Check if hardship waiver is selected
        const hardshipWaiver = document.getElementById('requestHardshipWaiver')?.checked;
        
        if (hardshipWaiver) {
            // Skip payment and proceed to next step
            adminDebugLog('💡 Hardship waiver selected, skipping payment');
            this.currentStep++;
            this.updateStepDisplay();
            return;
        }

        // Get the payment amount based on selected office level
        const officeLevelFees = {
            'federal': 1500,
            'state': 750, 
            'local': 375
        };
        
        const amount = officeLevelFees[this.selectedOfficeLevel] || 1500;
        const officeName = this.getOfficeLevelDisplayName(this.selectedOfficeLevel);
        
        adminDebugLog(`💳 Processing payment: $${amount} for ${officeName} level`);
        
        try {
            // Show loading state
            const nextBtn = document.getElementById('nextStep');
            const originalText = nextBtn.innerHTML;
            nextBtn.innerHTML = '💳 Processing Payment...';
            nextBtn.disabled = true;
            
            // Create Stripe checkout session for candidate registration
            const response = await apiCall('/donations/create-checkout', {
                method: 'POST',
                body: JSON.stringify({
                    amount: amount * 100, // Convert to cents
                    donationType: 'candidate-registration',
                    metadata: {
                        type: 'candidate-registration',
                        officeLevel: this.selectedOfficeLevel,
                        officeName: officeName,
                        candidateName: `${document.getElementById('firstName')?.value} ${document.getElementById('lastName')?.value}`
                    }
                })
            });

            if (response.ok && response.data.checkoutUrl) {
                // Open Stripe checkout in new tab
                const checkoutWindow = window.open(response.data.checkoutUrl, '_blank');
                
                // Listen for payment completion
                const checkPaymentStatus = () => {
                    // In a real implementation, you'd have a webhook or polling mechanism
                    // For now, we'll assume payment is successful after user returns
                    setTimeout(() => {
                        if (checkoutWindow.closed) {
                            adminDebugLog('✅ Payment window closed, assuming payment completed');
                            this.currentStep++;
                            this.updateStepDisplay();
                        } else {
                            checkPaymentStatus();
                        }
                    }, 2000);
                };
                
                checkPaymentStatus();
                
            } else {
                throw new Error(response.data?.message || 'Failed to create payment session');
            }
            
        } catch (error) {
            adminDebugError('💸 Payment processing error:', error);
            alert(`Payment processing failed: ${error.message}. Please try again.`);
            
            // Restore button state
            const nextBtn = document.getElementById('nextStep');
            nextBtn.innerHTML = originalText;
            nextBtn.disabled = false;
        }
    }
    
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }
    
    updateStepDisplay() {
        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.currentStep);
        });
        
        // Update form steps
        document.querySelectorAll('.form-step').forEach((step, index) => {
            const isActive = index + 1 === this.currentStep;
            step.classList.toggle('active', isActive);
            
            // Debug: Log step activation
            if (this.currentStep === 3) {
                adminDebugLog(`🔍 Step ${index + 1} (data-step=${step.getAttribute('data-step')}) active: ${isActive}`);
            }
        });
        
        // Special handling for Step 2 (Verification & Payment)
        if (this.currentStep === 2) {
            // Set up candidate agreement checkbox listener when step 2 is displayed
            setTimeout(() => {
                const agreementCheckbox = document.getElementById('candidateAgreement');
                if (agreementCheckbox && !agreementCheckbox.hasAttribute('data-listener-added')) {
                    agreementCheckbox.addEventListener('change', () => {
                        this.updateNextButtonState();
                    });
                    agreementCheckbox.setAttribute('data-listener-added', 'true');
                }
            }, 100);
        }
        
        // Special handling for Step 3 (Campaign Info)
        if (this.currentStep === 3) {
            // Instead of trying to fix CSS, completely rebuild Step 3 content
            adminDebugLog('🔄 Rebuilding Step 3 content from scratch...');
            const step3Container = document.querySelector('.form-step[data-step="3"]');
            if (step3Container) {
                // Clear existing content and rebuild
                step3Container.innerHTML = `
                    <h4>🏗️ Position & Campaign Details</h4>
                    <div class="payment-level-info">
                        <div class="paid-level-badge">
                            <span class="badge-icon">💳</span>
                            <strong>Payment Completed:</strong> <span id="paidOfficeLevelName">${this.currentPaymentLevel || 'Federal'}</span>
                        </div>
                        <p>You can select any office that falls under your paid level or lower. Higher level offices require additional payment.</p>
                    </div>
                    
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-group">
                            <label for="positionTitle" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Office Title *</label>
                            <input type="text" id="positionTitle" name="positionTitle" 
                                   placeholder="e.g., Mayor, City Council, State Senator"
                                   style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                                   value="President of the United States" required>
                        </div>
                        <div class="form-group">
                            <label for="positionLevel" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Office Level *</label>
                            <select id="positionLevel" name="positionLevel" 
                                    style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
                                <option value="federal">Federal</option>
                                <option value="state">State</option>
                                <option value="local">Local</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="electionDate" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Election Date *</label>
                            <input type="date" id="electionDate" name="electionDate" 
                                   style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                                   value="2025-11-05" required>
                        </div>
                        <div class="form-group">
                            <label for="campaignName" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Campaign Name</label>
                            <input type="text" id="campaignName" name="campaignName" 
                                   placeholder="e.g., Smith for Mayor"
                                   style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                                   value="Campaign for Unity">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="campaignWebsite" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Campaign Website</label>
                        <input type="url" id="campaignWebsite" name="campaignWebsite" 
                               placeholder="https://yourwebsite.com"
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                               value="https://unitedwerise.org">
                    </div>
                    
                    <div class="form-group">
                        <label for="campaignSlogan" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Campaign Slogan</label>
                        <input type="text" id="campaignSlogan" name="campaignSlogan" 
                               placeholder="e.g., Together We Rise"
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                               value="Together We Rise">
                    </div>
                    
                    <div class="form-group">
                        <label for="campaignDescription" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Campaign Description</label>
                        <textarea id="campaignDescription" name="campaignDescription" rows="3" 
                                  placeholder="Brief description of your campaign and key issues..."
                                  style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; resize: vertical;">A campaign focused on unity, progress, and bringing positive change to our community.</textarea>
                    </div>
                `;
                
                // Force visibility with aggressive CSS
                step3Container.style.cssText = `
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    min-height: 600px !important;
                    width: 100% !important;
                    position: relative !important;
                    z-index: 10 !important;
                `;
                
                adminDebugLog('✅ Step 3 rebuilt with inline styles and forced visibility');
            }
            
            // Update paid level display
            this.updatePaidLevelDisplay();
        }
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const submitBtn = document.getElementById('submitRegistration');
        
        if (prevBtn) prevBtn.style.display = this.currentStep === 1 ? 'none' : 'inline-block';
        if (nextBtn) nextBtn.style.display = this.currentStep === 3 ? 'none' : 'inline-block';
        if (submitBtn) submitBtn.style.display = this.currentStep === 3 ? 'inline-block' : 'none';
        
        // Update Next button state based on validation
        this.updateNextButtonState();
    }
    
    validateCurrentStep() {
        const currentStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        const requiredFields = currentStepElement ? currentStepElement.querySelectorAll('input[required], select[required], textarea[required]') : [];
        
        let isValid = true;
        let errorMessage = 'Please fill in all required fields';
        
        // Standard field validation - only for fields in current step
        requiredFields.forEach(field => {
            // Double-check the field is actually in the current step
            const fieldStep = field.closest('.form-step')?.getAttribute('data-step');
            if (fieldStep != this.currentStep) {
                adminDebugLog('🔍 Skipping validation for field from different step:', field.id, 'from step', fieldStep);
                return; // Skip this field
            }
            
            if (field.type === 'checkbox') {
                if (!field.checked) {
                    field.style.outline = '2px solid #dc3545';
                    isValid = false;
                } else {
                    field.style.outline = 'none';
                }
            } else {
                if (!field.value.trim()) {
                    field.style.borderColor = '#dc3545';
                    isValid = false;
                } else {
                    field.style.borderColor = '#e9ecef';
                }
            }
        });
        
        // Special validation for Step 2 (Payment)
        if (this.currentStep === 2) {
            // Check office level selection
            if (!this.selectedOfficeLevel) {
                errorMessage = 'Please select an office level for payment';
                isValid = false;
            }
            // Check candidate agreement checkbox
            else if (!document.getElementById('candidateAgreement')?.checked) {
                errorMessage = 'Please accept the candidate agreement to proceed';
                document.getElementById('candidateAgreement').style.outline = '2px solid #dc3545';
                isValid = false;
            } else {
                document.getElementById('candidateAgreement').style.outline = 'none';
            }
        }
        
        if (!isValid) {
            adminDebugLog('🔍 Click validation failed:', errorMessage);
            this.showMessage(errorMessage);
        } else {
            adminDebugLog('🔍 Click validation passed for step', this.currentStep);
        }
        
        return isValid;
    }
    
    isCurrentStepValid() {
        // Silent validation check without showing error messages
        const currentStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        
        // Only get required fields that are within the current active step
        const requiredFields = currentStepElement ? currentStepElement.querySelectorAll('input[required], select[required], textarea[required]') : [];
        
        // Debug: Only log when debugging is needed
        // adminDebugLog('🔍 Required fields in Step', this.currentStep, ':', Array.from(requiredFields).length);
        
        // Check standard required fields only within current step
        for (let field of requiredFields) {
            // Double-check the field is actually in the current step
            const fieldStep = field.closest('.form-step')?.getAttribute('data-step');
            if (fieldStep != this.currentStep) {
                continue;
            }
            
            if (field.type === 'checkbox') {
                if (!field.checked) {
                    return false;
                }
            } else {
                if (!field.value.trim()) {
                    return false;
                }
            }
        }
        
        // Special validation for Step 2 (Verification & Payment)
        if (this.currentStep === 2) {
            if (!this.selectedOfficeLevel) return false;
            if (!document.getElementById('candidateAgreement')?.checked) return false;
        }
        
        return true;
    }
    
    updateNextButtonState() {
        const nextBtn = document.getElementById('nextStep');
        if (!nextBtn) return;
        
        const isValid = this.isCurrentStepValid();
        
        // Debug logging for Step 2 (only when needed)
        // adminDebugLog('🔍 Button state:', isValid ? 'enabled' : 'disabled');
        
        if (isValid) {
            nextBtn.style.background = '#ff6b35';
            nextBtn.style.cursor = 'pointer';
            nextBtn.style.opacity = '1';
            nextBtn.disabled = false;
        } else {
            nextBtn.style.background = '#ccc';
            nextBtn.style.cursor = 'not-allowed';
            nextBtn.style.opacity = '0.6';
            nextBtn.disabled = true;
        }
    }
    
    setupOfficeLevelSelector() {
        const officeCards = document.querySelectorAll('.office-card');
        officeCards.forEach(card => {
            card.addEventListener('click', () => {
                officeCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedOfficeLevel = card.dataset.level;
                this.updateFeeDisplay();
                this.updateNextButtonState();
            });
        });
        
        // Select state level by default
        document.querySelector('[data-level="state"]')?.click();
    }
    
    setupWaiverHandlers() {
        const hardshipCheckbox = document.getElementById('requestHardshipWaiver');
        const hardshipDetails = document.getElementById('hardshipDetails');
        
        if (hardshipCheckbox) {
            hardshipCheckbox.addEventListener('change', (e) => {
                if (hardshipDetails) {
                    hardshipDetails.style.display = e.target.checked ? 'block' : 'none';
                }
                this.updateFeeDisplay();
            });
        }
        
        
        // Add listeners for all form inputs to update button state
        const allInputs = document.querySelectorAll('#candidateRegistrationForm input, #candidateRegistrationForm select, #candidateRegistrationForm textarea');
        allInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateNextButtonState();
            });
            input.addEventListener('change', () => {
                this.updateNextButtonState();
            });
        });
    }
    
    updateFeeDisplay() {
        const officeLevels = {
            local: { name: 'Local Office', fee: 50.00 },
            regional: { name: 'Regional Office', fee: 100.00 },
            state: { name: 'State Office', fee: 200.00 },
            federal: { name: 'Federal Office', fee: 400.00 },
            presidential: { name: 'Presidential', fee: 1000.00 }
        };
        
        const selectedOffice = officeLevels[this.selectedOfficeLevel];
        const baseFee = selectedOffice.fee;
        let totalFee = baseFee;
        
        // Check for hardship waiver request
        const hardshipRequested = document.getElementById('requestHardshipWaiver')?.checked;
        
        // Update display
        document.getElementById('selectedOfficeName').textContent = selectedOffice.name;
        document.getElementById('baseFee').textContent = `$${baseFee.toFixed(2)}`;
        
        
        if (hardshipRequested) {
            document.getElementById('totalFee').innerHTML = '<strong>Waiver Requested</strong>';
        } else {
            document.getElementById('totalFee').innerHTML = `<strong>$${totalFee.toFixed(2)}</strong>`;
        }
    }
    
    populateOfficeOptionsBasedOnPaymentLevel() {
        const positionLevelSelect = document.getElementById('positionLevel');
        if (!positionLevelSelect) return;
        
        // Clear existing options except the first one
        positionLevelSelect.innerHTML = '<option value="">Select Level</option>';
        
        // Define office level hierarchy (lower index = lower level)
        const officeLevels = [
            { value: 'local', label: 'Local', paidLevel: 'local' },
            { value: 'county', label: 'County', paidLevel: 'regional' },
            { value: 'city', label: 'City', paidLevel: 'regional' },
            { value: 'state', label: 'State', paidLevel: 'state' },
            { value: 'federal', label: 'Federal', paidLevel: 'federal' },
            { value: 'presidential', label: 'Presidential', paidLevel: 'presidential' }
        ];
        
        // Define payment level hierarchy
        const paymentHierarchy = {
            'local': 0,
            'regional': 1,
            'state': 2,
            'federal': 3,
            'presidential': 4
        };
        
        const userPaidLevel = paymentHierarchy[this.selectedOfficeLevel] || 0;
        
        // Add options that are at or below the paid level
        officeLevels.forEach(level => {
            const levelHierarchy = paymentHierarchy[level.paidLevel];
            if (levelHierarchy <= userPaidLevel) {
                const option = document.createElement('option');
                option.value = level.value;
                option.textContent = level.label;
                positionLevelSelect.appendChild(option);
            }
        });
        
        // Add disabled options for higher levels with upgrade message
        officeLevels.forEach(level => {
            const levelHierarchy = paymentHierarchy[level.paidLevel];
            if (levelHierarchy > userPaidLevel) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = `${level.label} (Requires upgrade to ${level.paidLevel})`;
                option.disabled = true;
                option.style.color = '#6c757d';
                positionLevelSelect.appendChild(option);
            }
        });
    }
    
    updatePaidLevelDisplay() {
        const paidLevelName = document.getElementById('paidOfficeLevelName');
        if (!paidLevelName) return;
        
        const officeLevelNames = {
            'local': 'Local Office ($50)',
            'regional': 'Regional Office ($100)',
            'state': 'State Office ($200)',
            'federal': 'Federal Office ($400)',
            'presidential': 'Presidential ($1,000)'
        };
        
        paidLevelName.textContent = officeLevelNames[this.selectedOfficeLevel] || 'Office Level';
    }
    
    async submitRegistration() {
        adminDebugLog('🔍 Submit Registration called');
        adminDebugLog('🔍 Current step:', this.currentStep);
        
        if (!this.validateCurrentStep()) {
            adminDebugLog('🔍 Submit failed: validation failed');
            return;
        }
        
        adminDebugLog('🔍 Submit validation passed, proceeding...');
        
        const form = document.getElementById('candidateRegistrationForm');
        const formData = new FormData(form);
        
        const registrationData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: {
                street: formData.get('street'),
                city: formData.get('city'),
                state: formData.get('state'),
                zipCode: formData.get('zipCode'),
                district: formData.get('district')
            },
            position: {
                title: formData.get('positionTitle') || 'President of the United States',
                level: formData.get('positionLevel') || 'federal',
                district: formData.get('positionDistrict') || 'National',
                electionDate: formData.get('electionDate') || '2025-11-05'
            },
            campaign: {
                name: formData.get('campaignName') || `${formData.get('firstName')} for President`,
                website: formData.get('campaignWebsite') || 'https://unitedwerise.org',
                slogan: formData.get('campaignSlogan') || 'Together We Rise',
                description: formData.get('campaignDescription') || 'A campaign for unity and progress'
            },
            officeLevel: this.selectedOfficeLevel,
            hasFinancialHardship: document.getElementById('requestHardshipWaiver')?.checked || false,
            hardshipReason: document.getElementById('hardshipReason')?.value || null,
            agreeToTerms: document.getElementById('agreeToTerms')?.checked || true
        };
        
        try {
            // Make actual API call to register candidate
            adminDebugLog('Submitting candidate registration:', registrationData);
        
        // Debug: Check if Step 3 container is visible and force fix if needed
        const step3Element = document.querySelector('.form-step[data-step="3"]');
        if (step3Element) {
            const step3Rect = step3Element.getBoundingClientRect();
            adminDebugLog('🔍 Step 3 container position (before fix):', {
                top: step3Rect.top,
                left: step3Rect.left,
                width: step3Rect.width,
                height: step3Rect.height,
                visible: step3Element.offsetParent !== null,
                display: window.getComputedStyle(step3Element).display,
                minHeight: window.getComputedStyle(step3Element).minHeight
            });
            
            // Force fix Step 3 dimensions if they're zero
            if (step3Rect.width === 0 || step3Rect.height === 0) {
                adminDebugLog('🔍 Forcing Step 3 dimensions...');
                step3Element.style.cssText += `
                    min-height: 400px !important;
                    width: 100% !important;
                    display: block !important;
                    visibility: visible !important;
                `;
                
                // Check again after fix
                const step3RectAfter = step3Element.getBoundingClientRect();
                adminDebugLog('🔍 Step 3 container position (after fix):', {
                    top: step3RectAfter.top,
                    left: step3RectAfter.left,
                    width: step3RectAfter.width,
                    height: step3RectAfter.height,
                    visible: step3Element.offsetParent !== null
                });
            }
        }
            
            const response = await fetch('https://api.unitedwerise.org/api/candidates/register', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registrationData)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showMessage('Registration submitted successfully! You will receive confirmation via email.');
                adminDebugLog('✅ Candidate registration successful:', result);
                
                // Close modal after successful submission
                setTimeout(() => {
                    document.querySelector('.candidate-registration-modal').remove();
                }, 2000);
            } else {
                adminDebugLog('🔍 Registration failed - Response:', {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    result: result
                });
                adminDebugLog('🔍 Backend error details:', JSON.stringify(result, null, 2));
                throw new Error(result.message || result.error || 'Registration failed');
            }
            
        } catch (error) {
            adminDebugError('Registration failed:', error);
            this.showMessage(`Registration failed: ${error.message}`);
        }
    }

    // Ensure candidate status is checked (lazy loading with caching)
    async ensureCandidateStatus() {
        if (this.hasCheckedStatus) {
            return; // Already checked, use cached value
        }
        await this.checkCandidateStatus();
    }

    // Check if current user is a verified candidate
    async checkCandidateStatus() {
        try {
            const response = await apiCall('/candidate-policy-platform/candidate/status', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok && response.data?.success) {
                this.isCandidate = true;
                this.candidateData = response.data.data;
                adminDebugLog('✅ User is verified candidate:', this.candidateData);
            } else {
                this.isCandidate = false;
                adminDebugLog('ℹ️ User is not a candidate');
            }
            this.hasCheckedStatus = true; // Mark as checked
        } catch (error) {
            adminDebugError('Error checking candidate status:', error);
            this.isCandidate = false;
            this.hasCheckedStatus = true; // Mark as checked even on error
        }
    }

    // Show candidate dashboard for verified candidates
    async showCandidateDashboard() {
        // Ensure candidate status is checked before proceeding
        await this.ensureCandidateStatus();

        if (!this.isCandidate) {
            adminDebugError('Access denied: User is not a verified candidate');
            return;
        }

        const mainContent = document.querySelector('#mainContent') || 
                           document.querySelector('.main') ||
                           document.querySelector('main') ||
                           document.querySelector('.main-content');
        if (!mainContent) {
            adminDebugError('Could not find main content area');
            return;
        }

        mainContent.innerHTML = `
            <div class="candidate-dashboard">
                <div class="dashboard-header">
                    <div class="header-content">
                        <h1>📊 Candidate Dashboard</h1>
                        <p class="subtitle">Manage your campaign and connect with constituents</p>
                        <div class="candidate-info">
                            <span class="status-badge verified">✅ Verified Candidate</span>
                            <span class="candidate-name">${this.candidateData?.name || 'Candidate'}</span>
                        </div>
                    </div>
                </div>

                <div class="dashboard-content">
                    <div class="dashboard-grid">
                        <!-- Policy Management -->
                        <div class="dashboard-card primary">
                            <div class="card-header">
                                <div class="card-icon">📋</div>
                                <h3>Policy Platform</h3>
                            </div>
                            <div class="card-content">
                                <p>Create and manage your policy positions</p>
                                <div class="card-stats">
                                    <span class="stat">📝 Manage positions</span>
                                    <span class="stat">🔄 Version tracking</span>
                                </div>
                            </div>
                            <div class="card-actions">
                                <button class="btn primary" data-candidate-action="showPolicyPlatform">
                                    Open Policy Platform
                                </button>
                            </div>
                        </div>

                        <!-- Constituent Communications -->
                        <div class="dashboard-card">
                            <div class="card-header">
                                <div class="card-icon">💬</div>
                                <h3>Constituent Messages</h3>
                            </div>
                            <div class="card-content">
                                <p>View and respond to citizen inquiries</p>
                                <div class="card-stats">
                                    <span class="stat">📥 Inbox management</span>
                                    <span class="stat">🤖 AI summaries</span>
                                </div>
                            </div>
                            <div class="card-actions">
                                <button class="btn secondary" data-candidate-action="openConstituentInbox">
                                    View Messages
                                </button>
                            </div>
                        </div>

                        <!-- Campaign Status -->
                        <div class="dashboard-card">
                            <div class="card-header">
                                <div class="card-icon">🗳️</div>
                                <h3>Election Status</h3>
                            </div>
                            <div class="card-content">
                                <p>Track your campaign progress</p>
                                <div class="card-stats">
                                    <span class="stat">📅 Filing deadlines</span>
                                    <span class="stat">👥 Competitors</span>
                                </div>
                            </div>
                            <div class="card-actions">
                                <button class="btn secondary" data-candidate-action="showElectionStatus">
                                    View Status
                                </button>
                            </div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="dashboard-card">
                            <div class="card-header">
                                <div class="card-icon">⚡</div>
                                <h3>Quick Actions</h3>
                            </div>
                            <div class="card-content">
                                <div class="quick-actions">
                                    <button class="quick-btn" data-candidate-action="backToHub">
                                        🏠 Back to Hub
                                    </button>
                                    <button class="quick-btn" data-candidate-action="toggleProfile">
                                        👤 My Profile
                                    </button>
                                    <button class="quick-btn" data-candidate-action="viewPublicProfile">
                                        👁️ View Public Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for dashboard actions
        this.setupDashboardActions();
    }

    // Setup dashboard action handlers
    setupDashboardActions() {
        // Back to hub
        window.backToHub = () => {
            this.showCandidateSystemView();
        };

        // Constituent inbox function
        window.openConstituentInbox = () => {
            this.openConstituentInbox();
        };

        window.showElectionStatus = () => {
            alert('Election status dashboard coming soon! This will show filing deadlines and competitor information.');
        };

        window.viewPublicProfile = () => {
            alert('Public profile view coming soon! This will show how voters see your candidate profile.');
        };
    }

    // Show the main candidate hub view
    showCandidateSystemView() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            this.showCandidateMainView(mainContent);
        }
    }

    // Show the Policy Platform manager
    showPolicyPlatform() {
        const mainContent = document.querySelector('#mainContent') || 
                           document.querySelector('.main') ||
                           document.querySelector('main') ||
                           document.querySelector('.main-content');
        if (!mainContent) {
            adminDebugError('Could not find main content area');
            return;
        }

        // Load the PolicyPlatformManager script if not already loaded
        if (!window.PolicyPlatformManager) {
            const script = document.createElement('script');
            script.src = '/src/components/PolicyPlatformManager.js';
            script.onload = () => {
                this.displayPolicyPlatform(mainContent);
            };
            document.head.appendChild(script);
        } else {
            this.displayPolicyPlatform(mainContent);
        }
    }

    // Display the Policy Platform interface
    displayPolicyPlatform(container) {
        container.innerHTML = `
            <div class="policy-platform-view">
                <div class="platform-header">
                    <div class="header-content">
                        <h1>📋 Policy Platform Management</h1>
                        <p class="subtitle">Create and manage your policy positions</p>
                        <div class="header-actions">
                            <button class="header-btn secondary" data-candidate-action="showCandidateDashboard">
                                ← Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
                <div id="policyPlatformContainer"></div>
            </div>
        `;

        // Initialize the Policy Platform Manager
        const policyManager = new PolicyPlatformManager('policyPlatformContainer');
        policyManager.init();
        
        // Make it globally accessible
        window.policyPlatformManager = policyManager;
    }

    // Method to programmatically trigger candidate system features
    triggerCandidateFeature(feature, data = {}) {
        if (!this.candidateSystem) {
            adminDebugError('Candidate system not initialized');
            return;
        }

        switch (feature) {
            case 'loadElections':
                return this.candidateSystem.enhanceElectionDisplay();
            case 'showComparison':
                if (data.officeId) {
                    return this.candidateSystem.showCandidateComparison(data.officeId);
                }
                break;
            case 'showContact':
                if (data.candidateId) {
                    return this.candidateSystem.showContactForm(data.candidateId);
                }
                break;
            case 'showQA':
                if (data.candidateId) {
                    return this.candidateSystem.showPublicQA(data.candidateId);
                }
                break;
            default:
                adminDebugError('Unknown candidate feature:', feature);
        }
    }

    // Open constituent inbox for candidate
    async openConstituentInbox() {
        // Ensure candidate status is checked before proceeding
        await this.ensureCandidateStatus();

        if (!this.isCandidate) {
            adminDebugError('Access denied: User is not a verified candidate');
            return;
        }

        const mainContent = document.querySelector('#mainContent') || 
                           document.querySelector('.main') ||
                           document.querySelector('main') ||
                           document.querySelector('.main-content');
        if (!mainContent) {
            adminDebugError('Could not find main content area');
            return;
        }

        mainContent.innerHTML = `
            <div class="constituent-inbox">
                <div class="inbox-header">
                    <div class="header-content">
                        <h1>💬 Constituent Messages</h1>
                        <p class="subtitle">Engage with voters and answer their questions</p>
                        <div class="header-actions">
                            <button class="header-btn secondary" data-candidate-action="showCandidateDashboard">
                                ← Back to Dashboard
                            </button>
                            <button class="header-btn primary" data-candidate-action="toggleAISummary">
                                🤖 AI Summary
                            </button>
                        </div>
                    </div>
                </div>

                <div class="inbox-content">
                    <div class="inbox-sidebar">
                        <div class="sidebar-header">
                            <h3>📥 Conversations</h3>
                            <div class="inbox-stats">
                                <span class="stat-badge" id="unreadCount">Loading...</span>
                            </div>
                        </div>
                        <div class="conversations-list" id="conversationsList">
                            <div class="loading-message">Loading conversations...</div>
                        </div>
                    </div>

                    <div class="inbox-main">
                        <div class="conversation-view" id="conversationView">
                            <div class="empty-state">
                                <div class="empty-icon">💬</div>
                                <h3>Select a conversation</h3>
                                <p>Choose a conversation from the sidebar to view messages and respond to constituents.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load conversations
        this.loadConstituentConversations();

        // Setup WebSocket listeners for real-time updates
        this.setupInboxWebSocketListeners();
    }

    // Load constituent conversations for candidate
    async loadConstituentConversations() {
        try {
            const response = await apiCall('/unified-messages/candidate/user-messages', {
                credentials: 'include'
            });

            if (response.ok && response.data?.success) {
                const { conversations, candidate } = response.data.data;
                this.displayConversations(conversations);
                this.updateUnreadCount(conversations);
            } else {
                throw new Error(response.data?.error || 'Failed to load conversations');
            }
        } catch (error) {
            adminDebugError('Error loading constituent conversations:', error);
            const conversationsList = document.getElementById('conversationsList');
            if (conversationsList) {
                conversationsList.innerHTML = `
                    <div class="error-message">
                        <div class="error-icon">⚠️</div>
                        <p>Error loading conversations: ${error.message}</p>
                        <button data-candidate-action="loadConstituentConversations" class="btn-secondary">
                            Try Again
                        </button>
                    </div>
                `;
            }
        }
    }

    // Display conversations in sidebar
    displayConversations(conversations) {
        const conversationsList = document.getElementById('conversationsList');
        if (!conversationsList) return;

        if (conversations.length === 0) {
            conversationsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📪</div>
                    <h4>No messages yet</h4>
                    <p>When constituents message you, their conversations will appear here.</p>
                </div>
            `;
            return;
        }

        conversationsList.innerHTML = conversations.map(conv => {
            const lastMessage = conv.messages[conv.messages.length - 1];
            const timeAgo = this.formatTimeAgo(new Date(conv.lastMessageAt));
            const isUnread = conv.unreadCount > 0;

            return `
                <div class="conversation-item ${isUnread ? 'unread' : ''}"
                     data-candidate-action="openConversation" data-conversation-id="${conv.id}" data-conversation-data="${JSON.stringify(conv).replace(/'/g, '&#39;').replace(/"/g, '&quot;')}">
                    <div class="conversation-avatar">
                        <div class="avatar-circle">
                            ${lastMessage?.sender?.firstName?.[0] || '👤'}
                        </div>
                        ${isUnread ? '<div class="unread-indicator"></div>' : ''}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <h4 class="sender-name">
                                ${lastMessage?.sender?.firstName || 'Unknown'} ${lastMessage?.sender?.lastName || 'Voter'}
                            </h4>
                            <span class="message-time">${timeAgo}</span>
                        </div>
                        <p class="last-message">
                            ${this.truncateText(lastMessage?.content || '', 60)}
                        </p>
                        ${isUnread ? `<div class="unread-badge">${conv.unreadCount}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Update unread count display
    updateUnreadCount(conversations) {
        const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        const unreadElement = document.getElementById('unreadCount');
        if (unreadElement) {
            unreadElement.textContent = totalUnread > 0 ? `${totalUnread} unread` : 'All caught up!';
            unreadElement.className = `stat-badge ${totalUnread > 0 ? 'has-unread' : ''}`;
        }
    }

    // Open a specific conversation
    openConversation(conversationId, conversationDataStr) {
        const conversationView = document.getElementById('conversationView');
        if (!conversationView) return;

        const conv = JSON.parse(conversationDataStr);
        const sender = conv.messages[0]?.sender;

        conversationView.innerHTML = `
            <div class="conversation-header">
                <div class="conversation-participant">
                    <div class="participant-avatar">
                        <div class="avatar-circle large">
                            ${sender?.firstName?.[0] || '👤'}
                        </div>
                    </div>
                    <div class="participant-info">
                        <h3>${sender?.firstName || 'Unknown'} ${sender?.lastName || 'Voter'}</h3>
                        <p class="participant-username">@${sender?.username || 'unknown'}</p>
                    </div>
                </div>
                <div class="conversation-actions">
                    <button class="btn secondary small" data-candidate-action="markConversationRead" data-conversation-id="${conversationId}">
                        ✓ Mark Read
                    </button>
                </div>
            </div>

            <div class="messages-container" id="messagesContainer">
                ${this.renderMessages(conv.messages)}
            </div>

            <div class="message-compose">
                <div class="compose-header">
                    <h4>💬 Reply to ${sender?.firstName || 'Voter'}</h4>
                    <div class="reply-options">
                        <label class="checkbox-label">
                            <input type="checkbox" id="publicReply">
                            <span>📢 Post as public response</span>
                        </label>
                    </div>
                </div>
                <div class="compose-form">
                    <textarea id="replyContent" placeholder="Type your response..." rows="4"></textarea>
                    <div class="compose-actions">
                        <button class="btn secondary" data-candidate-action="clearReply">
                            Clear
                        </button>
                        <button class="btn primary" data-candidate-action="sendReply" data-conversation-id="${conversationId}" data-sender-id="${sender?.id}">
                            Send Reply
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Scroll to bottom of messages
        setTimeout(() => {
            const container = document.getElementById('messagesContainer');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 100);
    }

    // Render messages in conversation
    renderMessages(messages) {
        if (!messages || messages.length === 0) {
            return '<div class="no-messages">No messages in this conversation yet.</div>';
        }

        const currentUserId = localStorage.getItem('currentUserId') || 
                             (window.currentUser ? window.currentUser.id : '');

        return messages.map(msg => {
            const isFromCandidate = msg.senderId === currentUserId;
            const timestamp = new Date(msg.createdAt).toLocaleString();

            return `
                <div class="message ${isFromCandidate ? 'outbound' : 'inbound'}">
                    <div class="message-content">
                        <p>${msg.content}</p>
                        <div class="message-meta">
                            <span class="message-time">${timestamp}</span>
                            ${isFromCandidate ? '<span class="message-sender">You</span>' : 
                              `<span class="message-sender">${msg.sender?.firstName || 'Voter'}</span>`}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Setup WebSocket listeners for inbox
    setupInboxWebSocketListeners() {
        if (window.unifiedMessaging) {
            // Listen for new USER_CANDIDATE messages
            this.inboxMessageHandler = window.unifiedMessaging.onMessage('USER_CANDIDATE', (messageData) => {
                adminDebugLog('📨 New constituent message received:', messageData);
                
                // Reload conversations to show new message
                this.loadConstituentConversations();
                
                // Show notification
                this.showInboxNotification('New message from constituent', messageData.content);
            });
        }
    }

    // Send reply to constituent
    async sendReply(conversationId, recipientId) {
        const replyContent = document.getElementById('replyContent');
        const isPublicReply = document.getElementById('publicReply');
        
        if (!replyContent?.value.trim()) {
            alert('Please enter a reply message.');
            return;
        }

        try {
            // Send via WebSocket for real-time delivery
            const success = window.sendUserCandidateMessage(recipientId, replyContent.value.trim(), conversationId);
            
            if (success) {
                // Clear the reply form
                replyContent.value = '';
                if (isPublicReply) isPublicReply.checked = false;
                
                // Refresh the conversation
                setTimeout(() => {
                    this.loadConstituentConversations();
                }, 500);
                
                this.showToast('Reply sent successfully!');
            } else {
                throw new Error('Failed to send reply via WebSocket');
            }
        } catch (error) {
            adminDebugError('Error sending reply:', error);
            this.showToast('Failed to send reply. Please try again.');
        }
    }

    // Utility functions
    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Clear reply form
    clearReply() {
        const replyContent = document.getElementById('replyContent');
        const isPublicReply = document.getElementById('publicReply');
        if (replyContent) replyContent.value = '';
        if (isPublicReply) isPublicReply.checked = false;
    }

    // Mark conversation as read
    async markConversationRead(conversationId) {
        try {
            const response = await apiCall('/unified-messages/mark-read', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conversationId })
            });

            if (response.ok) {
                // Refresh conversations to update unread counts
                this.loadConstituentConversations();
                this.showToast('Conversation marked as read');
            }
        } catch (error) {
            adminDebugError('Error marking conversation as read:', error);
        }
    }

    // Show inbox notification
    async showInboxNotification(title, content) {
        // Check user preferences before showing notifications
        try {
            const response = await apiCall('/users/notification-preferences', {
                credentials: 'include'
            });

            let showBrowserNotification = true;
            let showInboxNotification = true;

            if (response.ok && response.data?.success) {
                const prefs = response.data.data;
                showBrowserNotification = prefs.browserNotifications && prefs.browserNotifyNewMessages;
                showInboxNotification = prefs.candidateInboxNotifications;
            }

            // Browser notification if enabled and permission granted
            if (showBrowserNotification && Notification.permission === 'granted') {
                new Notification(title, {
                    body: this.truncateText(content, 100),
                    icon: '/UWR Logo on Circle.png'
                });
            }
            
            // In-app toast notification if candidate inbox notifications are enabled
            if (showInboxNotification) {
                this.showToast(`📨 ${title}: ${this.truncateText(content, 50)}`);
            }
        } catch (error) {
            adminDebugError('Error checking notification preferences:', error);
            // Fallback to showing notifications if we can't check preferences
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body: this.truncateText(content, 100),
                    icon: '/UWR Logo on Circle.png'
                });
            }
            this.showToast(`📨 ${title}: ${this.truncateText(content, 50)}`);
        }
    }

    // Toggle AI summary modal (placeholder for future feature)
    toggleAISummary() {
        alert('🤖 AI Summary feature coming soon! This will provide intelligent summaries of common constituent concerns and trending topics.');
    }

    // Show toast notification
    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Fade in
        setTimeout(() => toast.style.opacity = '1', 100);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
}

// Auto-initialize when script loads
const candidateSystemIntegration = new CandidateSystemIntegration();

// ES6 Module Exports
export { CandidateSystemIntegration, candidateSystemIntegration };
export default candidateSystemIntegration;

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.CandidateSystemIntegration = CandidateSystemIntegration;
    window.candidateSystemIntegration = candidateSystemIntegration;
}