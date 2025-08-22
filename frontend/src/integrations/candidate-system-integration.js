// Candidate System Integration for United We Rise Frontend
// This script integrates the enhanced candidate system with the existing frontend

class CandidateSystemIntegration {
    constructor() {
        this.candidateSystem = null;
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
        console.log('🎯 Initializing enhanced candidate system integration...');
        
        // Load CSS styles
        this.loadCandidateSystemStyles();
        
        // Initialize the candidate system
        if (window.CandidateSystem) {
            this.candidateSystem = new window.CandidateSystem();
        }
        
        // Enhance existing UI elements
        this.enhanceExistingElements();
        
        // Add navigation enhancements
        this.addCandidateNavigation();
        
        // Setup sidebar state monitoring
        this.setupSidebarMonitoring();
        
        console.log('✅ Candidate system integration complete!');
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
                candidateThumb.title = 'AI-Enhanced Candidates';
                candidateThumb.innerHTML = `🤖 <span class="label">Candidates</span>`;
                
                // Insert after officials thumb
                officialsThumb.parentNode.insertBefore(candidateThumb, officialsThumb.nextSibling);
                
                console.log('✅ Added Candidates button to sidebar');
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
        console.log('🤖 Opening Candidates in main content area...');
        
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
            console.error('Main content area not found');
            return;
        }

        // Clear existing content and show candidates
        this.showCandidateMainView(mainContent);
    }

    showCandidateMainView(mainContent) {
        // Store original content so we can restore it later
        if (!mainContent.dataset.originalContent) {
            mainContent.dataset.originalContent = mainContent.innerHTML;
        }

        // Create full-width candidate interface
        mainContent.innerHTML = `
            <div class="candidate-main-view">
                <div class="candidate-header">
                    <div class="header-content">
                        <h1>🤖 AI-Enhanced Candidate System</h1>
                        <p class="subtitle">Intelligent candidate analysis, comparison, and communication</p>
                        <div class="header-actions">
                            <button class="header-btn primary" onclick="candidateSystemIntegration.loadElections()">
                                🗳️ Load Elections
                            </button>
                            <button class="header-btn register" onclick="candidateSystemIntegration.showCandidateRegistration()">
                                🏆 Register as Candidate
                            </button>
                            <button class="header-btn secondary" onclick="candidateSystemIntegration.showAIAnalysis()">
                                🤖 AI Capabilities
                            </button>
                            <button class="header-btn secondary" onclick="candidateSystemIntegration.restoreMainContent()">
                                ← Back to Map
                            </button>
                        </div>
                    </div>
                </div>

                <div class="candidate-content">
                    <div class="content-grid">
                        <!-- Feature Cards -->
                        <div class="feature-cards">
                            <div class="feature-card ai-comparison">
                                <div class="card-icon">🤖</div>
                                <h3>AI-Powered Comparison</h3>
                                <p>Compare candidates using neutral AI analysis of their policy positions</p>
                                <div class="card-features">
                                    <span class="feature-tag">Qwen3 Integration</span>
                                    <span class="feature-tag">Policy Analysis</span>
                                    <span class="feature-tag">Neutral AI</span>
                                </div>
                            </div>

                            <div class="feature-card messaging">
                                <div class="card-icon">💬</div>
                                <h3>Direct Communication</h3>
                                <p>Contact candidates directly about policy positions with staff delegation</p>
                                <div class="card-features">
                                    <span class="feature-tag">Anonymous Options</span>
                                    <span class="feature-tag">Staff Delegation</span>
                                    <span class="feature-tag">Public Q&A</span>
                                </div>
                            </div>

                            <div class="feature-card elections">
                                <div class="card-icon">🗳️</div>
                                <h3>Enhanced Elections</h3>
                                <p>Multi-tier election system that never fails to load candidate information</p>
                                <div class="card-features">
                                    <span class="feature-tag">Cache System</span>
                                    <span class="feature-tag">API Fallback</span>
                                    <span class="feature-tag">Never Fails</span>
                                </div>
                            </div>

                            <div class="feature-card photos">
                                <div class="card-icon">📸</div>
                                <h3>Professional Photos</h3>
                                <p>Campaign headshots and personal photos with AI optimization</p>
                                <div class="card-features">
                                    <span class="feature-tag">Auto-Optimize</span>
                                    <span class="feature-tag">WebP Conversion</span>
                                    <span class="feature-tag">Smart Sizing</span>
                                </div>
                            </div>
                            
                            <div class="feature-card registration" onclick="candidateSystemIntegration.showCandidateRegistration()">
                                <div class="card-icon">🏆</div>
                                <h3>Run for Office</h3>
                                <p>Register as a candidate with ID.me verification and secure payment</p>
                                <div class="card-features">
                                    <span class="feature-tag register-tag">ID.me Verified</span>
                                    <span class="feature-tag register-tag">Secure Payment</span>
                                    <span class="feature-tag register-tag">Admin Approved</span>
                                </div>
                            </div>
                        </div>

                        <!-- Elections Content Area -->
                        <div class="elections-content">
                            <div class="content-header">
                                <h2>Elections & Candidates</h2>
                                <div class="loading-indicator" id="electionsLoading" style="display: none;">
                                    <div class="spinner"></div>
                                    <span>Loading election data...</span>
                                </div>
                            </div>
                            <div class="enhanced-elections-container">
                                <div class="elections-placeholder">
                                    <div class="placeholder-icon">🗳️</div>
                                    <h3>Ready to Load Elections</h3>
                                    <p>Click "Load Elections" to see enhanced candidate data with AI analysis</p>
                                    <button class="placeholder-btn" onclick="candidateSystemIntegration.loadElections()">
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
        this.addCandidateMainViewStyles();

        // Update panel positioning based on current sidebar state
        this.updatePanelForSidebarState();

        // Adjust map if needed (make it smaller/overlay)
        this.adjustMapForCandidateView();
    }

    async loadElections() {
        console.log('🗳️ Loading enhanced elections...');
        
        // Show loading indicator
        const loadingIndicator = document.querySelector('#electionsLoading');
        const placeholder = document.querySelector('.elections-placeholder');
        
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (placeholder) placeholder.style.display = 'none';
        
        try {
            if (this.candidateSystem) {
                await this.candidateSystem.enhanceElectionDisplay();
            }
        } finally {
            // Hide loading indicator
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
            
            console.log('✅ Restored main content');
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
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
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
        console.log('🏆 Opening candidate registration flow...');
        this.showCandidateRegistrationModal();
    }
    
    showCandidateRegistrationModal() {
        const modal = document.createElement('div');
        modal.className = 'candidate-registration-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container registration-container">
                <div class="modal-header registration-header">
                    <h3>🏆 Register as a Candidate</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
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
                            <h4>🔐 Identity Verification & Payment</h4>
                            <div class="verification-section">
                                <div class="verification-card">
                                    <div class="verification-icon">🆔</div>
                                    <h5>ID.me Identity Verification Required</h5>
                                    <p>To ensure the integrity of our platform, all candidates must verify their identity through ID.me. This process verifies:</p>
                                    <ul>
                                        <li>Government-issued photo ID</li>
                                        <li>Identity authenticity</li>
                                        <li>Address verification</li>
                                        <li>Background check eligibility</li>
                                    </ul>
                                    <div class="verification-status" id="verificationStatus">
                                        <span class="status-badge pending">Verification Required</span>
                                    </div>
                                    <button type="button" class="verify-btn" id="startVerification" onclick="candidateSystemIntegration.startIdmeVerification()">
                                        🔒 Start ID.me Verification
                                    </button>
                                </div>
                            </div>
                            
                            <h4 style="margin-top: 1rem;">💳 Registration Payment</h4>
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
                                            <strong>I confirm in good faith that I am running for the selected office.</strong> I acknowledge that as part of my Candidate registration, I must confirm that I continue to be eligible for this race, and will meet all filing deadlines. I acknowledge that if I fail to meet a deadline, my candidate profile may be revoked. Any revocation may be appealed in writing. I further agree to abide by all of the rules of UnitedWeRise and am in compliance with all federal, state, and local election laws and regulations.
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
                                    <input type="text" id="positionTitle" name="positionTitle" placeholder="e.g., Mayor, City Council, State Senator" required>
                                </div>
                                <div class="form-group">
                                    <label for="positionLevel">Government Level *</label>
                                    <select id="positionLevel" name="positionLevel" required>
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
                                    <input type="date" id="electionDate" name="electionDate" required>
                                </div>
                            </div>
                            
                            <h5>💯 Campaign Information</h5>
                            <div class="form-grid">
                                <div class="form-group span-2">
                                    <label for="campaignName">Campaign Name *</label>
                                    <input type="text" id="campaignName" name="campaignName" placeholder="e.g., Smith for Mayor" required>
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
                                    <input type="checkbox" id="agreeToTerms" name="agreeToTerms" required>
                                    <span class="checkmark"></span>
                                    I agree to the <a href="#" target="_blank">Terms and Conditions</a> and <a href="#" target="_blank">Privacy Policy</a>
                                </label>
                            </div>
                        </div>
                    </form>
                </div>
                
                <div class="form-navigation" style="display: flex !important; justify-content: space-between; padding: 1rem 1.5rem; border-top: 1px solid #e9ecef; background: white;">
                    <button type="button" class="nav-btn prev" id="prevStep" onclick="candidateSystemIntegration.previousStep()" style="padding: 0.75rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        ← Previous
                    </button>
                    <button type="button" class="nav-btn next" id="nextStep" onclick="candidateSystemIntegration.nextStep()" style="padding: 0.75rem 1.5rem; background: #ff6b35; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Next →
                    </button>
                    <button type="button" class="nav-btn submit" id="submitRegistration" onclick="candidateSystemIntegration.submitRegistration()" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; border-radius: 6px; cursor: pointer; display: none;">
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
    
    nextStep() {
        if (this.currentStep < 3) {
            if (this.validateCurrentStep()) {
                this.currentStep++;
                this.updateStepDisplay();
            }
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
            step.classList.toggle('active', index + 1 === this.currentStep);
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
            this.populateOfficeOptionsBasedOnPaymentLevel();
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
        const requiredFields = currentStepElement.querySelectorAll('input[required], select[required]');
        
        let isValid = true;
        let errorMessage = 'Please fill in all required fields';
        
        // Standard field validation
        requiredFields.forEach(field => {
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
        
        // Special validation for Step 2 (Verification & Payment)
        if (this.currentStep === 2) {
            // Check ID.me verification
            if (!this.idmeVerified) {
                errorMessage = 'Please complete ID.me verification first';
                isValid = false;
            }
            // Check office level selection
            else if (!this.selectedOfficeLevel) {
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
            this.showMessage(errorMessage);
        }
        
        return isValid;
    }
    
    isCurrentStepValid() {
        // Silent validation check without showing error messages
        const currentStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        
        // Only get required fields that are within the current active step
        const requiredFields = currentStepElement ? currentStepElement.querySelectorAll('input[required], select[required], textarea[required]') : [];
        
        // Debug: Log required fields found
        if (this.currentStep === 2) {
            console.log('🔍 Required fields in Step 2:', Array.from(requiredFields).map(f => ({
                id: f.id,
                type: f.type,
                name: f.name,
                value: f.value,
                checked: f.checked,
                parentStep: f.closest('.form-step')?.getAttribute('data-step')
            })));
        }
        
        // Check standard required fields only within current step
        for (let field of requiredFields) {
            // Double-check the field is actually in the current step
            const fieldStep = field.closest('.form-step')?.getAttribute('data-step');
            if (fieldStep != this.currentStep) {
                console.log('🔍 Skipping field from different step:', field.id, 'from step', fieldStep);
                continue;
            }
            
            if (field.type === 'checkbox') {
                if (!field.checked) {
                    console.log('🔍 Checkbox validation failed:', field.id, field.checked);
                    return false;
                }
            } else {
                if (!field.value.trim()) {
                    console.log('🔍 Field validation failed:', field.id, field.value);
                    return false;
                }
            }
        }
        
        // Special validation for Step 2 (Verification & Payment)
        if (this.currentStep === 2) {
            if (!this.idmeVerified) {
                console.log('🔍 ID.me verification failed');
                return false;
            }
            if (!this.selectedOfficeLevel) {
                console.log('🔍 Office level selection failed');
                return false;
            }
            if (!document.getElementById('candidateAgreement')?.checked) {
                console.log('🔍 Candidate agreement failed');
                return false;
            }
        }
        
        console.log('🔍 All validations passed for step', this.currentStep);
        return true;
    }
    
    updateNextButtonState() {
        const nextBtn = document.getElementById('nextStep');
        if (!nextBtn) return;
        
        const isValid = this.isCurrentStepValid();
        
        // Debug logging for Step 2
        if (this.currentStep === 2) {
            console.log('🔍 Step 2 Validation Debug:', {
                idmeVerified: this.idmeVerified,
                selectedOfficeLevel: this.selectedOfficeLevel,
                candidateAgreementChecked: document.getElementById('candidateAgreement')?.checked,
                candidateAgreementExists: !!document.getElementById('candidateAgreement'),
                isValid: isValid
            });
        }
        
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
    
    startIdmeVerification() {
        // TODO: Integrate with actual ID.me API
        console.log('Starting ID.me verification...');
        
        // Simulate verification process
        const statusBadge = document.querySelector('#verificationStatus .status-badge');
        const verifyBtn = document.getElementById('startVerification');
        
        statusBadge.textContent = 'Verification in Progress...';
        statusBadge.className = 'status-badge pending';
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
        
        // Simulate successful verification after 3 seconds
        setTimeout(() => {
            statusBadge.textContent = 'Verified ✓';
            statusBadge.className = 'status-badge verified';
            verifyBtn.textContent = 'Verification Complete';
            verifyBtn.style.background = '#28a745';
            this.idmeVerified = true;
            this.showMessage('ID.me verification completed successfully!');
            this.updateNextButtonState();
        }, 3000);
    }
    
    async submitRegistration() {
        if (!this.validateCurrentStep()) return;
        if (!this.idmeVerified) {
            this.showMessage('Please complete ID.me verification first');
            return;
        }
        
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
                title: formData.get('positionTitle'),
                level: formData.get('positionLevel'),
                district: formData.get('positionDistrict'),
                electionDate: formData.get('electionDate')
            },
            campaign: {
                name: formData.get('campaignName'),
                website: formData.get('campaignWebsite'),
                slogan: formData.get('campaignSlogan'),
                description: formData.get('campaignDescription')
            },
            officeLevel: this.selectedOfficeLevel,
            hasFinancialHardship: document.getElementById('requestHardshipWaiver')?.checked || false,
            hardshipReason: document.getElementById('hardshipReason')?.value || null,
            agreeToTerms: formData.get('agreeToTerms') === 'on'
        };
        
        try {
            // Make actual API call to register candidate
            console.log('Submitting candidate registration:', registrationData);
            
            const response = await fetch('https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api/candidates/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(registrationData)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showMessage('Registration submitted successfully! You will receive confirmation via email.');
                console.log('✅ Candidate registration successful:', result);
                
                // Close modal after successful submission
                setTimeout(() => {
                    document.querySelector('.candidate-registration-modal').remove();
                }, 2000);
            } else {
                throw new Error(result.message || 'Registration failed');
            }
            
        } catch (error) {
            console.error('Registration failed:', error);
            this.showMessage(`Registration failed: ${error.message}`);
        }
    }

    // Method to programmatically trigger candidate system features
    triggerCandidateFeature(feature, data = {}) {
        if (!this.candidateSystem) {
            console.error('Candidate system not initialized');
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
                console.error('Unknown candidate feature:', feature);
        }
    }
}

// Initialize the integration
window.CandidateSystemIntegration = CandidateSystemIntegration;

// Auto-initialize when script loads
const integration = new CandidateSystemIntegration();

// Make integration available globally for other scripts
window.candidateSystemIntegration = integration;