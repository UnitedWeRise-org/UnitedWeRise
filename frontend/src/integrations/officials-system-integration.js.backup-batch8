// Officials System Integration for United We Rise Frontend
// This script enhances the officials panel to use the main content area effectively

class OfficialsSystemIntegration {
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
            adminDebugLog('OfficialsSystem', 'Initializing enhanced officials system integration...');
        }
        
        // Load CSS styles
        this.loadOfficialsSystemStyles();
        
        // Enhance officials navigation
        this.addOfficialsNavigation();
        
        // Setup sidebar state monitoring
        this.setupSidebarMonitoring();
        
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('OfficialsSystem', 'Officials system integration complete!');
        }
    }

    loadOfficialsSystemStyles() {
        // Check if styles are already loaded
        if (document.querySelector('#officials-system-styles')) {
            return;
        }

        const link = document.createElement('link');
        link.id = 'officials-system-styles';
        link.rel = 'stylesheet';
        link.href = 'src/styles/officials-system.css';
        document.head.appendChild(link);
    }

    addOfficialsNavigation() {
        // Find the existing Officials thumb button and enhance it
        const sidebar = document.querySelector('#sidebar .thumbs');
        if (sidebar) {
            const officialsThumb = Array.from(sidebar.children).find(thumb => 
                thumb.textContent.includes('Officials')
            );
            
            if (officialsThumb) {
                // Store original onclick handler
                const originalOnclick = officialsThumb.onclick;
                
                // Replace with our enhanced handler
                officialsThumb.onclick = () => this.toggleOfficialsPanel();
                officialsThumb.title = 'Enhanced Officials View';
                
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('OfficialsSystem', 'Enhanced Officials button in sidebar');
                }
            }
        }
    }

    toggleOfficialsPanel() {
        adminDebugLog('🏛️ Opening Officials in main content area...');
        
        // Hide other detail panels
        document.querySelectorAll('.detail-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        // Hide existing info panels
        document.querySelectorAll('.info-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        // Hide other main view systems when opening Officials
        const civicOrganizing = document.querySelector('.civic-organizing-container');
        if (civicOrganizing) {
            civicOrganizing.style.display = 'none';
        }
        
        const candidatesView = document.querySelector('.candidates-main-view');
        if (candidatesView) {
            candidatesView.style.display = 'none';
        }
        
        const electionsView = document.querySelector('.elections-main-view');
        if (electionsView) {
            electionsView.style.display = 'none';
        }

        // Get main content area
        const mainContent = document.querySelector('#mainContent') || 
                           document.querySelector('.main') ||
                           document.querySelector('main');
        
        if (!mainContent) {
            adminDebugError('Main content area not found');
            return;
        }

        // Clear existing content and show officials
        this.showOfficialsMainView(mainContent);
    }

    showOfficialsMainView(mainContent) {
        // Store original content so we can restore it later
        if (!mainContent.dataset.originalContent) {
            mainContent.dataset.originalContent = mainContent.innerHTML;
        }

        // Create full-width officials interface
        mainContent.innerHTML = `
            <div class="officials-main-view">
                <div class="officials-header">
                    <div class="header-content">
                        <h1>🏛️ My Elected Officials</h1>
                        <p class="subtitle">Connect with your representatives at all levels of government</p>
                        <div class="header-actions">
                            <button class="header-btn primary" onclick="officialsSystemIntegration.loadOfficials()">
                                🔄 Refresh Officials
                            </button>
                            <button class="header-btn secondary" onclick="officialsSystemIntegration.showContactOptions()">
                                📧 Contact Options
                            </button>
                            <button class="header-btn secondary" onclick="officialsSystemIntegration.restoreMainContent()">
                                ← Back to Map
                            </button>
                        </div>
                    </div>
                </div>

                <div class="officials-content">
                    <div class="content-grid">
                        <!-- Feature Cards -->
                        <div class="feature-cards">
                            <div class="feature-card contact">
                                <div class="card-icon">📧</div>
                                <h3>Direct Contact</h3>
                                <p>Send messages directly to your representatives' offices</p>
                                <div class="card-features">
                                    <span class="feature-tag">Email Integration</span>
                                    <span class="feature-tag">Office Phone</span>
                                    <span class="feature-tag">Contact Forms</span>
                                </div>
                            </div>

                            <div class="feature-card voting">
                                <div class="card-icon">🗳️</div>
                                <h3>Voting Records</h3>
                                <p>View how your representatives vote on key legislation</p>
                                <div class="card-features">
                                    <span class="feature-tag">Recent Votes</span>
                                    <span class="feature-tag">Issue Tracking</span>
                                    <span class="feature-tag">Position Analysis</span>
                                </div>
                            </div>

                            <div class="feature-card levels">
                                <div class="card-icon">🏢</div>
                                <h3>All Government Levels</h3>
                                <p>Federal, state, and local representatives in one place</p>
                                <div class="card-features">
                                    <span class="feature-tag">Federal Congress</span>
                                    <span class="feature-tag">State Legislature</span>
                                    <span class="feature-tag">Local Officials</span>
                                </div>
                            </div>

                            <div class="feature-card updates">
                                <div class="card-icon">📰</div>
                                <h3>Official Updates</h3>
                                <p>Stay informed with press releases and position statements</p>
                                <div class="card-features">
                                    <span class="feature-tag">Press Releases</span>
                                    <span class="feature-tag">Position Updates</span>
                                    <span class="feature-tag">News Alerts</span>
                                </div>
                            </div>
                        </div>

                        <!-- Officials Content Area -->
                        <div class="officials-data">
                            <div class="content-header">
                                <h2>Your Representatives</h2>
                                <div class="loading-indicator" id="officialsLoading" style="display: none;">
                                    <div class="spinner"></div>
                                    <span>Loading officials data...</span>
                                </div>
                            </div>
                            <div class="officials-container" id="enhancedOfficialsContainer">
                                <div class="officials-placeholder">
                                    <div class="placeholder-icon">🏛️</div>
                                    <h3>Ready to Load Your Officials</h3>
                                    <p>Click "Refresh Officials" to see your current representatives</p>
                                    <p class="address-note">Make sure your address is set in your profile for accurate results</p>
                                    <button class="placeholder-btn" onclick="officialsSystemIntegration.loadOfficials()">
                                        Load Officials Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add comprehensive styles for the main view
        this.addOfficialsMainViewStyles();

        // Update panel positioning based on current sidebar state
        this.updatePanelForSidebarState();

        // Adjust map if needed (make it smaller/overlay)
        this.adjustMapForOfficialsView();
    }

    async loadOfficials() {
        adminDebugLog('🔄 Loading enhanced officials...');
        
        // Show loading indicator
        const loadingIndicator = document.querySelector('#officialsLoading');
        const placeholder = document.querySelector('.officials-placeholder');
        
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (placeholder) placeholder.style.display = 'none';
        
        try {
            // Check if user is logged in and has profile data
            if (!window.currentUser) {
                this.showOfficialsError('Please log in to see your elected officials.');
                return;
            }

            // Call the existing loadUserContent function to get officials data
            if (typeof window.loadUserContent === 'function') {
                await window.loadUserContent();
                
                // Wait a moment for the data to populate
                setTimeout(() => {
                    this.enhanceOfficialsDisplay();
                }, 500);
            } else {
                this.showOfficialsError('Officials loading function not available.');
            }
        } catch (error) {
            adminDebugError('Failed to load officials:', error);
            this.showOfficialsError('Failed to load officials data. Please try again.');
        } finally {
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    enhanceOfficialsDisplay() {
        const container = document.querySelector('#enhancedOfficialsContainer');
        const originalOfficialsContent = document.querySelector('#officialsContent');
        
        if (!container || !originalOfficialsContent) {
            adminDebugLog('Officials containers not found');
            return;
        }

        // Get the original officials content and enhance it
        const originalHTML = originalOfficialsContent.innerHTML;
        
        if (originalHTML.includes('No representatives found') || 
            originalHTML.includes('Please log in') ||
            originalHTML.includes('Please add your complete address')) {
            container.innerHTML = `
                <div class="officials-error">
                    <div class="error-icon">⚠️</div>
                    <h3>Unable to Load Officials</h3>
                    <p>${originalHTML.replace(/<[^>]*>/g, '')}</p>
                    <div class="error-actions">
                        <button class="error-btn" onclick="officialsSystemIntegration.openProfileSettings()">
                            Update Profile
                        </button>
                        <button class="error-btn secondary" onclick="officialsSystemIntegration.loadOfficials()">
                            Try Again
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Parse and enhance the officials content
        this.parseAndEnhanceOfficials(originalHTML, container);
    }

    parseAndEnhanceOfficials(originalHTML, container) {
        // Create enhanced officials layout
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHTML;
        
        const levels = tempDiv.querySelectorAll('.level-section');
        
        if (levels.length === 0) {
            // Fallback if structure is different
            container.innerHTML = `
                <div class="officials-enhanced">
                    <div class="original-content">
                        ${originalHTML}
                    </div>
                </div>
            `;
            return;
        }

        let enhancedHTML = '<div class="officials-enhanced">';
        
        levels.forEach(level => {
            const levelTitle = level.querySelector('h3')?.textContent || 'Officials';
            const officials = level.querySelectorAll('.rep-item');
            
            enhancedHTML += `
                <div class="level-group">
                    <div class="level-header">
                        <h3>${levelTitle}</h3>
                        <span class="official-count">${officials.length} officials</span>
                    </div>
                    <div class="officials-grid">
            `;
            
            officials.forEach(official => {
                const name = official.querySelector('.rep-name')?.textContent || 'Unknown';
                const position = official.querySelector('.rep-position')?.textContent || '';
                const party = official.querySelector('.rep-party')?.textContent || '';
                const contact = official.querySelector('.rep-contact')?.innerHTML || '';
                
                enhancedHTML += `
                    <div class="official-card">
                        <div class="official-header">
                            <div class="official-avatar">
                                ${this.getOfficialIcon(position)}
                            </div>
                            <div class="official-info">
                                <h4 class="official-name">${name}</h4>
                                <p class="official-position">${position}</p>
                                ${party ? `<span class="official-party">${party}</span>` : ''}
                            </div>
                        </div>
                        <div class="official-contact">
                            ${contact}
                        </div>
                        <div class="official-actions">
                            <button class="action-btn primary" onclick="officialsSystemIntegration.contactOfficial('${name}')">
                                📧 Contact
                            </button>
                            <button class="action-btn secondary" onclick="officialsSystemIntegration.viewOfficialDetails('${name}')">
                                📊 Details
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

    getOfficialIcon(position) {
        const pos = position.toLowerCase();
        if (pos.includes('president')) return '🇺🇸';
        if (pos.includes('senator')) return '🏛️';
        if (pos.includes('representative') || pos.includes('congress')) return '🏛️';
        if (pos.includes('governor')) return '🏢';
        if (pos.includes('mayor')) return '🏙️';
        if (pos.includes('sheriff')) return '👮';
        if (pos.includes('judge')) return '⚖️';
        return '🏛️';
    }

    showOfficialsError(message) {
        const container = document.querySelector('#enhancedOfficialsContainer');
        if (container) {
            container.innerHTML = `
                <div class="officials-error">
                    <div class="error-icon">⚠️</div>
                    <h3>Unable to Load Officials</h3>
                    <p>${message}</p>
                    <div class="error-actions">
                        <button class="error-btn" onclick="officialsSystemIntegration.loadOfficials()">
                            Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    }

    addOfficialsMainViewStyles() {
        // Check if styles already added
        if (document.querySelector('#officials-main-view-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'officials-main-view-styles';
        style.textContent = `
            .officials-main-view {
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

            .officials-main-view.sidebar-expanded {
                left: 10.5vw;
            }

            .officials-header {
                background: linear-gradient(135deg, #1a365d, #2d5a87);
                color: white;
                padding: 2rem 2rem 1.5rem 2rem;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }

            .officials-header .header-content h1 {
                margin: 0 0 0.5rem 0;
                font-size: 2.5rem;
                font-weight: 600;
            }

            .officials-header .subtitle {
                margin: 0 0 1.5rem 0;
                font-size: 1.1rem;
                opacity: 0.9;
                font-weight: 300;
            }

            .officials-header .header-actions {
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

            .officials-content {
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
                border-left: 4px solid #1a365d;
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
                color: #1a365d;
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
                background: #e6f3ff;
                color: #1a365d;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .officials-data {
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
                color: #1a365d;
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
                border-top: 2px solid #1a365d;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .officials-placeholder, .officials-error {
                text-align: center;
                padding: 4rem 2rem;
                color: #666;
            }

            .placeholder-icon, .error-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }

            .officials-placeholder h3, .officials-error h3 {
                margin: 0 0 0.5rem 0;
                color: #1a365d;
                font-size: 1.5rem;
            }

            .officials-placeholder p, .officials-error p {
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
                background: linear-gradient(135deg, #1a365d, #2d5a87);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                margin: 0.5rem;
            }

            .error-btn.secondary {
                background: transparent;
                color: #1a365d;
                border: 2px solid #1a365d;
            }

            .placeholder-btn:hover, .error-btn:hover {
                background: linear-gradient(135deg, #0f2537, #1a365d);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            .error-btn.secondary:hover {
                background: #1a365d;
                color: white;
            }

            .officials-enhanced {
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
                padding-bottom: 0.5rem;
                border-bottom: 2px solid #1a365d;
            }

            .level-header h3 {
                margin: 0;
                color: #1a365d;
                font-size: 1.4rem;
            }

            .official-count {
                background: #1a365d;
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.85rem;
                font-weight: 500;
            }

            .officials-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1rem;
            }

            .official-card {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 1.5rem;
                transition: all 0.2s;
            }

            .official-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                border-color: #1a365d;
            }

            .official-header {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .official-avatar {
                font-size: 2rem;
                width: 3rem;
                height: 3rem;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #1a365d;
                color: white;
                border-radius: 50%;
            }

            .official-info {
                flex: 1;
            }

            .official-name {
                margin: 0 0 0.25rem 0;
                color: #1a365d;
                font-size: 1.1rem;
                font-weight: 600;
            }

            .official-position {
                margin: 0 0 0.25rem 0;
                color: #666;
                font-size: 0.9rem;
            }

            .official-party {
                background: #e9ecef;
                color: #495057;
                padding: 0.2rem 0.5rem;
                border-radius: 10px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .official-contact {
                margin-bottom: 1rem;
                font-size: 0.85rem;
                color: #666;
            }

            .official-actions {
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
                background: #1a365d;
                color: white;
            }

            .action-btn.secondary {
                background: transparent;
                color: #1a365d;
                border: 1px solid #1a365d;
            }

            .action-btn:hover {
                transform: translateY(-1px);
            }

            .action-btn.primary:hover {
                background: #0f2537;
            }

            .action-btn.secondary:hover {
                background: #1a365d;
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
                .officials-header {
                    padding: 1.5rem 1rem;
                }
                
                .officials-header .header-content h1 {
                    font-size: 2rem;
                }
                
                .officials-content {
                    padding: 1rem;
                }
                
                .officials-header .header-actions {
                    justify-content: stretch;
                }
                
                .header-btn {
                    flex: 1;
                    text-align: center;
                }
                
                .officials-placeholder, .officials-error {
                    padding: 2rem 1rem;
                }

                .officials-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    adjustMapForOfficialsView() {
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
                border: 2px solid #1a365d !important;
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
                    background: rgba(26, 54, 93, 0.9);
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

    contactOfficial(officialName) {
        // This would integrate with the messaging system
        adminDebugLog(`📧 Opening contact form for ${officialName}`);
        this.showMessage(`Contact form for ${officialName} would open here.`);
    }

    viewOfficialDetails(officialName) {
        adminDebugLog(`📊 Viewing details for ${officialName}`);
        this.showMessage(`Detailed information for ${officialName} would open here.`);
    }

    showContactOptions() {
        // Show modal with contact options
        this.showContactOptionsModal();
    }

    showContactOptionsModal() {
        const modal = document.createElement('div');
        modal.className = 'officials-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>📧 Contact Your Officials</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="contact-options">
                        <h4>🎯 How to Contact Your Representatives:</h4>
                        
                        <div class="contact-methods">
                            <div class="contact-method">
                                <div class="method-icon">📧</div>
                                <h5>Email</h5>
                                <p>Send messages directly through official contact forms</p>
                                <span class="method-availability">Available for all representatives</span>
                            </div>
                            
                            <div class="contact-method">
                                <div class="method-icon">📞</div>
                                <h5>Phone</h5>
                                <p>Call during office hours for immediate assistance</p>
                                <span class="method-availability">Office numbers provided</span>
                            </div>
                            
                            <div class="contact-method">
                                <div class="method-icon">🏢</div>
                                <h5>Office Visits</h5>
                                <p>Schedule appointments at local or Washington offices</p>
                                <span class="method-availability">Advance scheduling required</span>
                            </div>
                            
                            <div class="contact-method">
                                <div class="method-icon">📝</div>
                                <h5>Written Letters</h5>
                                <p>Traditional mail for formal communications</p>
                                <span class="method-availability">Addresses provided</span>
                            </div>
                        </div>
                        
                        <div class="contact-tips">
                            <h4>💡 Tips for Effective Communication:</h4>
                            <ul>
                                <li>Be clear and concise about your issue</li>
                                <li>Include your address to verify constituency</li>
                                <li>Be respectful and professional</li>
                                <li>Follow up if you don't receive a response</li>
                                <li>Share your personal story when relevant</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles for the contact options modal
        const style = document.createElement('style');
        style.textContent = `
            .contact-methods {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
                margin: 1rem 0;
            }
            
            .contact-method {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
            }
            
            .method-icon {
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }
            
            .contact-method h5 {
                margin: 0.5rem 0;
                color: #1a365d;
            }
            
            .contact-method p {
                font-size: 0.9rem;
                color: #666;
                line-height: 1.4;
                margin: 0 0 0.5rem 0;
            }
            
            .method-availability {
                background: #1a365d;
                color: white;
                padding: 0.2rem 0.5rem;
                border-radius: 10px;
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .contact-tips {
                background: #e6f3ff;
                border: 1px solid #b3d7ff;
                border-radius: 8px;
                padding: 1rem;
                margin-top: 1.5rem;
            }
            
            .contact-tips h4 {
                margin: 0 0 0.5rem 0;
                color: #1a365d;
            }
            
            .contact-tips ul {
                margin: 0;
                padding-left: 1.2rem;
            }
            
            .contact-tips li {
                margin: 0.3rem 0;
                color: #555;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);
    }

    openProfileSettings() {
        // This would open the profile settings
        adminDebugLog('Opening profile settings...');
        if (typeof window.showProfile === 'function') {
            window.showProfile();
        } else {
            this.showMessage('Profile settings would open here.');
        }
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
        const officialsPanel = document.querySelector('.officials-main-view');
        
        if (sidebar && officialsPanel) {
            const isExpanded = sidebar.classList.contains('expanded');
            officialsPanel.classList.toggle('sidebar-expanded', isExpanded);
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

// Initialize the integration
window.OfficialsSystemIntegration = OfficialsSystemIntegration;

// Auto-initialize when script loads
const officialsIntegration = new OfficialsSystemIntegration();

// Make integration available globally for other scripts
window.officialsSystemIntegration = officialsIntegration;