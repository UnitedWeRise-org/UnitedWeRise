/**
 * Policy Display Component
 * Displays candidate policy positions for voters
 */
import { apiCall } from '../js/api-compatibility-shim.js';

class PolicyDisplay {
    constructor() {
        this.policyCategories = {
            'cat_economy': { name: 'Economy & Jobs', icon: '💼' },
            'cat_healthcare': { name: 'Healthcare', icon: '🏥' },
            'cat_education': { name: 'Education', icon: '🎓' },
            'cat_infrastructure': { name: 'Infrastructure', icon: '🏗️' },
            'cat_environment': { name: 'Environment', icon: '🌱' },
            'cat_housing': { name: 'Housing', icon: '🏠' },
            'cat_justice': { name: 'Criminal Justice', icon: '⚖️' },
            'cat_immigration': { name: 'Immigration', icon: '🌍' },
            'cat_taxes': { name: 'Taxes & Budget', icon: '💰' },
            'cat_social': { name: 'Social Issues', icon: '👥' },
            'cat_defense': { name: 'Defense & Security', icon: '🛡️' },
            'cat_technology': { name: 'Technology & Privacy', icon: '💻' }
        };

        this.stanceConfig = {
            'SUPPORT': { icon: '✅', color: '#4b5c09', label: 'Supports' },
            'OPPOSE': { icon: '❌', color: '#dc3545', label: 'Opposes' },
            'NEUTRAL': { icon: '🟡', color: '#6c757d', label: 'Neutral' },
            'CONDITIONAL': { icon: '🔄', color: '#fd7e14', label: 'Conditional' }
        };
    }

    /**
     * Display policy positions for a single candidate
     */
    async displayCandidatePositions(candidateId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        try {
            container.innerHTML = '<div class="loading-message">Loading policy positions...</div>';

            const response = await apiCall(`/candidate-policy-platform/candidate/${candidateId}/positions?published=true`);

            if (response.ok && response.data?.success) {
                const positions = response.data.data;
                
                if (positions.length === 0) {
                    container.innerHTML = `
                        <div class="no-positions-message">
                            <div class="no-positions-icon">📋</div>
                            <p>This candidate hasn't published any policy positions yet.</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = this.renderPositionsList(positions);
                }
            } else {
                throw new Error(response.data?.error || 'Failed to load policy positions');
            }

        } catch (error) {
            console.error('Error loading candidate positions:', error);
            container.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <p>Error loading policy positions: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Display race comparison view with all candidates side-by-side
     */
    async displayRaceComparison(officeId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        try {
            container.innerHTML = '<div class="loading-message">Loading race comparison...</div>';

            const response = await apiCall(`/candidate-policy-platform/race/${officeId}/comparison`);

            if (response.ok && response.data?.success) {
                const comparisonData = response.data.data;
                container.innerHTML = this.renderRaceComparison(comparisonData);
            } else {
                throw new Error(response.data?.error || 'Failed to load race comparison');
            }

        } catch (error) {
            console.error('Error loading race comparison:', error);
            container.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <p>Error loading race comparison: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Render a list of policy positions
     */
    renderPositionsList(positions) {
        // Group positions by category
        const positionsByCategory = {};
        positions.forEach(position => {
            const categoryId = position.categoryId;
            if (!positionsByCategory[categoryId]) {
                positionsByCategory[categoryId] = [];
            }
            positionsByCategory[categoryId].push(position);
        });

        // Sort categories by display order and render
        const sortedCategories = Object.keys(positionsByCategory).sort((a, b) => {
            const categoryA = this.policyCategories[a] || { name: a };
            const categoryB = this.policyCategories[b] || { name: b };
            return categoryA.name.localeCompare(categoryB.name);
        });

        return `
            <div class="policy-positions-viewer">
                ${sortedCategories.map(categoryId => {
                    const category = this.policyCategories[categoryId] || { name: categoryId, icon: '📋' };
                    const categoryPositions = positionsByCategory[categoryId];
                    
                    return `
                        <div class="policy-category-section">
                            <div class="category-header">
                                <span class="category-icon">${category.icon}</span>
                                <h3 class="category-title">${category.name}</h3>
                                <span class="position-count">${categoryPositions.length} position${categoryPositions.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div class="category-positions">
                                ${categoryPositions
                                    .sort((a, b) => b.priority - a.priority) // Sort by priority descending
                                    .map(position => this.renderSinglePosition(position))
                                    .join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Render a single policy position
     */
    renderSinglePosition(position) {
        const stance = this.stanceConfig[position.stance];
        
        return `
            <div class="policy-position" data-position-id="${position.id}">
                <div class="position-header">
                    <h4 class="position-title">${position.title}</h4>
                    ${stance ? `
                        <div class="position-stance" style="color: ${stance.color}">
                            <span class="stance-icon">${stance.icon}</span>
                            <span class="stance-label">${stance.label}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="position-summary">
                    <p>${position.summary}</p>
                </div>

                <div class="position-details" style="display: none;">
                    <div class="detailed-content">
                        <h5>Detailed Position:</h5>
                        <div class="content-text">${this.formatContent(position.content)}</div>
                    </div>

                    ${position.keyPoints && position.keyPoints.length > 0 ? `
                        <div class="key-points">
                            <h5>Key Points:</h5>
                            <ul>
                                ${position.keyPoints.map(point => `<li>${point}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${position.evidenceLinks && position.evidenceLinks.length > 0 ? `
                        <div class="evidence-links">
                            <h5>Supporting Evidence:</h5>
                            <ul>
                                ${position.evidenceLinks.map(link => 
                                    `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${this.formatLinkText(link)}</a></li>`
                                ).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>

                <div class="position-actions">
                    <button class="expand-button" onclick="window.policyDisplay.togglePositionDetails('${position.id}')">
                        Read More
                    </button>
                    <div class="position-priority">
                        Priority: <span class="priority-value">${position.priority}/10</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render race comparison view
     */
    renderRaceComparison(comparisonData) {
        const { candidates, categories } = comparisonData;

        if (candidates.length === 0) {
            return `
                <div class="no-candidates-message">
                    <div class="no-candidates-icon">🗳️</div>
                    <p>No active candidates found for this race.</p>
                </div>
            `;
        }

        return `
            <div class="race-comparison-viewer">
                <div class="comparison-header">
                    <h3>Candidate Policy Comparison</h3>
                    <p class="comparison-subtitle">Compare where candidates stand on key issues</p>
                </div>

                <!-- Candidates Overview -->
                <div class="candidates-overview">
                    ${candidates.map(candidate => `
                        <div class="candidate-card">
                            <h4 class="candidate-name">${candidate.name}</h4>
                            <div class="candidate-party">${candidate.party || 'Independent'}</div>
                            ${candidate.campaignWebsite ? `
                                <a href="${candidate.campaignWebsite}" target="_blank" class="campaign-link">
                                    Visit Campaign →
                                </a>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>

                <!-- AI Analysis Toggle -->
                <div class="ai-analysis-toggle">
                    <button onclick="window.policyDisplay.toggleAIAnalysis()" class="ai-toggle-btn" id="aiToggleBtn">
                        🤖 Show AI Analysis
                    </button>
                    <p class="ai-toggle-description">Use artificial intelligence to analyze policy similarities and differences</p>
                </div>

                <!-- AI Analysis Section -->
                <div id="aiAnalysisSection" style="display: none;" class="ai-analysis-section">
                    <div class="ai-analysis-content">
                        <div class="loading-message">Analyzing policies with AI...</div>
                    </div>
                </div>

                <!-- Policy Categories Comparison -->
                <div class="policy-comparison-grid">
                    ${categories.map(category => this.renderCategoryComparison(category, candidates)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render category comparison section
     */
    renderCategoryComparison(category, candidates) {
        const categoryInfo = this.policyCategories[category.id] || { name: category.name, icon: '📋' };

        return `
            <div class="category-comparison">
                <div class="category-comparison-header">
                    <span class="category-icon">${categoryInfo.icon}</span>
                    <h4 class="category-name">${categoryInfo.name}</h4>
                </div>
                
                <div class="candidates-positions">
                    ${candidates.map(candidate => {
                        const candidatePositions = category.positions.filter(p => p.candidateId === candidate.id);
                        
                        return `
                            <div class="candidate-position-column">
                                <div class="candidate-name-header">${candidate.name}</div>
                                <div class="candidate-positions-list">
                                    ${candidatePositions.length > 0 ? 
                                        candidatePositions.map(position => `
                                            <div class="comparison-position">
                                                ${this.stanceConfig[position.stance] ? `
                                                    <div class="position-stance-small" style="color: ${this.stanceConfig[position.stance].color}">
                                                        ${this.stanceConfig[position.stance].icon} ${this.stanceConfig[position.stance].label}
                                                    </div>
                                                ` : ''}
                                                <div class="position-title-small">${position.title}</div>
                                                <div class="position-summary-small">${position.summary}</div>
                                                <button class="view-details-small" onclick="window.policyDisplay.showPositionModal('${position.id}')">
                                                    View Details
                                                </button>
                                            </div>
                                        `).join('') : 
                                        '<div class="no-position">No position stated</div>'
                                    }
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Toggle position details visibility
     */
    togglePositionDetails(positionId) {
        const position = document.querySelector(`[data-position-id="${positionId}"]`);
        const details = position.querySelector('.position-details');
        const button = position.querySelector('.expand-button');
        
        if (details.style.display === 'none') {
            details.style.display = 'block';
            button.textContent = 'Show Less';
        } else {
            details.style.display = 'none';
            button.textContent = 'Read More';
        }
    }

    /**
     * Show detailed position in modal
     */
    showPositionModal(positionId) {
        // For now, just toggle the details in the comparison view
        // In a full implementation, this would open a modal with full details
        console.log('Show position modal for:', positionId);
        alert('Modal view coming soon! For now, view full details on the candidate\'s profile page.');
    }

    /**
     * Format content text with basic paragraph breaks
     */
    formatContent(content) {
        return content.split('\n').map(paragraph => 
            paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
        ).join('');
    }

    /**
     * Format link text to show domain instead of full URL
     */
    formatLinkText(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '');
        } catch {
            return url;
        }
    }

    /**
     * Toggle AI analysis section
     */
    async toggleAIAnalysis() {
        const section = document.getElementById('aiAnalysisSection');
        const button = document.getElementById('aiToggleBtn');
        
        if (!section || !button) return;

        if (section.style.display === 'none') {
            section.style.display = 'block';
            button.textContent = '🤖 Hide AI Analysis';
            
            // Load AI analysis if not already loaded
            if (section.querySelector('.loading-message')) {
                await this.loadAIAnalysis();
            }
        } else {
            section.style.display = 'none';
            button.textContent = '🤖 Show AI Analysis';
        }
    }

    /**
     * Load AI analysis for the current race comparison
     */
    async loadAIAnalysis() {
        const section = document.getElementById('aiAnalysisSection');
        const content = section.querySelector('.ai-analysis-content');
        
        if (!content) return;

        try {
            // For demonstration, we'll show the AI analysis interface
            // In a real implementation, this would analyze the actual candidate positions
            if (window.policyComparison) {
                content.innerHTML = `
                    <div class="ai-demo-message">
                        <h4>🤖 AI Policy Analysis Ready</h4>
                        <p>This feature uses advanced natural language processing to analyze semantic similarities between candidate positions.</p>
                        <div class="demo-features">
                            <div class="feature-item">
                                <strong>Semantic Similarity:</strong> Measures how similar policy positions are in meaning, not just words
                            </div>
                            <div class="feature-item">
                                <strong>Agreement Detection:</strong> Identifies areas where candidates agree or disagree
                            </div>
                            <div class="feature-item">
                                <strong>Key Differences:</strong> Highlights the most important distinctions between approaches
                            </div>
                            <div class="feature-item">
                                <strong>Voter Insights:</strong> Provides analysis to help voters understand the real policy choices
                            </div>
                        </div>
                        <div class="demo-note">
                            <strong>Note:</strong> To see full AI analysis, candidates need to publish policy positions with detailed content. The AI analyzes the semantic meaning of policy text to provide accurate comparisons.
                        </div>
                    </div>
                `;
            } else {
                throw new Error('Policy comparison component not loaded');
            }

        } catch (error) {
            console.error('Error loading AI analysis:', error);
            content.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <p>Error loading AI analysis: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Add CSS styles for policy display
     */
    addStyles() {
        if (document.getElementById('policyDisplayStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'policyDisplayStyles';
        styles.textContent = `
            /* Policy Display Styles */
            .policy-positions-viewer {
                max-width: 800px;
                margin: 0 auto;
            }

            .policy-category-section {
                margin-bottom: 3rem;
            }

            .category-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #4b5c09;
                margin-bottom: 1.5rem;
            }

            .category-icon {
                font-size: 1.5rem;
            }

            .category-title {
                margin: 0;
                color: #4b5c09;
                font-size: 1.4rem;
            }

            .position-count {
                background: #f8f9fa;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.85rem;
                color: #666;
            }

            .category-positions {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .policy-position {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 1.5rem;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                transition: box-shadow 0.2s;
            }

            .policy-position:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }

            .position-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1rem;
                gap: 1rem;
            }

            .position-title {
                margin: 0;
                color: #333;
                font-size: 1.2rem;
                line-height: 1.3;
                flex-grow: 1;
            }

            .position-stance {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 600;
                font-size: 0.9rem;
                flex-shrink: 0;
            }

            .position-summary {
                margin-bottom: 1rem;
            }

            .position-summary p {
                color: #555;
                line-height: 1.5;
                margin: 0;
            }

            .position-details {
                border-top: 1px solid #f0f0f0;
                padding-top: 1rem;
                margin-top: 1rem;
            }

            .position-details h5 {
                color: #333;
                margin: 0 0 0.5rem 0;
                font-size: 1rem;
            }

            .content-text p {
                color: #555;
                line-height: 1.6;
                margin-bottom: 1rem;
            }

            .key-points {
                margin-top: 1.5rem;
            }

            .key-points ul {
                margin: 0;
                padding-left: 1.5rem;
            }

            .key-points li {
                color: #555;
                line-height: 1.5;
                margin-bottom: 0.5rem;
            }

            .evidence-links {
                margin-top: 1.5rem;
            }

            .evidence-links ul {
                margin: 0;
                padding-left: 1.5rem;
            }

            .evidence-links li {
                margin-bottom: 0.5rem;
            }

            .evidence-links a {
                color: #4b5c09;
                text-decoration: none;
            }

            .evidence-links a:hover {
                text-decoration: underline;
            }

            .position-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 1rem;
                gap: 1rem;
            }

            .expand-button {
                background: #4b5c09;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
            }

            .expand-button:hover {
                background: #3d4a07;
            }

            .position-priority {
                font-size: 0.85rem;
                color: #666;
            }

            .priority-value {
                font-weight: 600;
                color: #4b5c09;
            }

            /* Race Comparison Styles */
            .race-comparison-viewer {
                max-width: 1200px;
                margin: 0 auto;
            }

            .comparison-header {
                text-align: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #4b5c09;
            }

            .comparison-header h3 {
                margin: 0 0 0.5rem 0;
                color: #4b5c09;
                font-size: 1.8rem;
            }

            .comparison-subtitle {
                color: #666;
                margin: 0;
                font-size: 1rem;
            }

            .candidates-overview {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }

            .candidate-card {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 1rem;
                text-align: center;
            }

            .candidate-name {
                margin: 0 0 0.5rem 0;
                color: #333;
                font-size: 1.1rem;
            }

            .candidate-party {
                color: #666;
                font-size: 0.9rem;
                margin-bottom: 0.5rem;
            }

            .campaign-link {
                color: #4b5c09;
                text-decoration: none;
                font-size: 0.85rem;
            }

            .campaign-link:hover {
                text-decoration: underline;
            }

            .policy-comparison-grid {
                display: flex;
                flex-direction: column;
                gap: 2rem;
            }

            .category-comparison {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                overflow: hidden;
            }

            .category-comparison-header {
                background: #f8f9fa;
                padding: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                border-bottom: 1px solid #e0e0e0;
            }

            .category-comparison-header h4 {
                margin: 0;
                color: #4b5c09;
            }

            .candidates-positions {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1px;
                background: #e0e0e0;
            }

            .candidate-position-column {
                background: white;
                padding: 1rem;
                min-height: 200px;
            }

            .candidate-name-header {
                font-weight: 600;
                color: #333;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid #f0f0f0;
            }

            .comparison-position {
                margin-bottom: 1rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid #f8f9fa;
            }

            .comparison-position:last-child {
                border-bottom: none;
            }

            .position-stance-small {
                font-size: 0.8rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
            }

            .position-title-small {
                font-weight: 600;
                color: #333;
                margin-bottom: 0.5rem;
                font-size: 0.95rem;
                line-height: 1.3;
            }

            .position-summary-small {
                color: #555;
                font-size: 0.85rem;
                line-height: 1.4;
                margin-bottom: 0.5rem;
            }

            .view-details-small {
                background: none;
                border: 1px solid #4b5c09;
                color: #4b5c09;
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                cursor: pointer;
                font-size: 0.75rem;
            }

            .view-details-small:hover {
                background: #4b5c09;
                color: white;
            }

            .no-position {
                color: #999;
                font-style: italic;
                text-align: center;
                padding: 2rem 1rem;
            }

            /* Empty States */
            .no-positions-message,
            .no-candidates-message,
            .error-message {
                text-align: center;
                padding: 3rem 2rem;
                color: #666;
            }

            .no-positions-icon,
            .no-candidates-icon,
            .error-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                display: block;
            }

            .loading-message {
                text-align: center;
                padding: 2rem;
                color: #666;
                font-style: italic;
            }

            /* AI Analysis Styles */
            .ai-analysis-toggle {
                text-align: center;
                padding: 2rem;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 8px;
                margin-bottom: 2rem;
            }

            .ai-toggle-btn {
                background: linear-gradient(135deg, #4b5c09 0%, #3d4a07 100%);
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 25px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin: 0 auto 0.5rem auto;
            }

            .ai-toggle-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }

            .ai-toggle-description {
                color: #666;
                font-size: 0.9rem;
                margin: 0;
                line-height: 1.4;
            }

            .ai-analysis-section {
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                margin-bottom: 2rem;
                overflow: hidden;
            }

            .ai-analysis-content {
                padding: 2rem;
            }

            .ai-demo-message {
                text-align: center;
            }

            .ai-demo-message h4 {
                color: #4b5c09;
                margin: 0 0 1rem 0;
                font-size: 1.4rem;
            }

            .ai-demo-message p {
                color: #555;
                line-height: 1.5;
                margin-bottom: 2rem;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
            }

            .demo-features {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
                text-align: left;
            }

            .feature-item {
                background: white;
                padding: 1rem;
                border-radius: 6px;
                border-left: 4px solid #4b5c09;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }

            .feature-item strong {
                color: #4b5c09;
                display: block;
                margin-bottom: 0.5rem;
            }

            .demo-note {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 1rem;
                border-radius: 4px;
                color: #856404;
                font-size: 0.9rem;
                line-height: 1.4;
            }

            .demo-note strong {
                color: #533f03;
            }

            /* Mobile Responsiveness */
            @media (max-width: 768px) {
                .position-header {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .position-actions {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .candidates-overview {
                    grid-template-columns: 1fr;
                }

                .candidates-positions {
                    grid-template-columns: 1fr;
                }

                .category-comparison-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.25rem;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Initialize global instance
window.policyDisplay = new PolicyDisplay();

// Add styles when the component loads
document.addEventListener('DOMContentLoaded', () => {
    window.policyDisplay.addStyles();
});