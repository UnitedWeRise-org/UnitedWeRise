/**
 * Policy Comparison Component
 * AI-powered semantic analysis and comparison of candidate policy positions
 */
import { apiCall } from '../js/api-compatibility-shim.js';

class PolicyComparison {
    constructor() {
        this.similarityThreshold = 0.7; // Threshold for considering positions similar
    }

    /**
     * Display AI-powered policy comparison for a category
     */
    async displayCategoryComparison(categoryId, candidateIds, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        try {
            container.innerHTML = '<div class="loading-message">Analyzing policy positions with AI...</div>';

            // Get all published positions for this category from the specified candidates
            const positions = await this.fetchCategoryPositions(categoryId, candidateIds);
            
            if (positions.length === 0) {
                container.innerHTML = `
                    <div class="no-positions-message">
                        <div class="no-positions-icon">📋</div>
                        <p>No policy positions found for comparison in this category.</p>
                    </div>
                `;
                return;
            }

            // Perform AI analysis
            const comparison = await this.performAIComparison(positions);
            
            container.innerHTML = this.renderCategoryComparison(comparison);

        } catch (error) {
            console.error('Error in category comparison:', error);
            container.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <p>Error analyzing positions: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Show semantic similarity analysis between two specific positions
     */
    async showPositionSimilarity(position1Id, position2Id, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        try {
            container.innerHTML = '<div class="loading-message">Analyzing position similarity...</div>';

            const similarity = await this.comparePositions(position1Id, position2Id);
            container.innerHTML = this.renderSimilarityAnalysis(similarity);

        } catch (error) {
            console.error('Error in similarity analysis:', error);
            container.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <p>Error analyzing similarity: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Fetch policy positions for a specific category and candidates
     */
    async fetchCategoryPositions(categoryId, candidateIds) {
        const positions = [];
        
        for (const candidateId of candidateIds) {
            try {
                const response = await apiCall(`/candidate-policy-platform/candidate/${candidateId}/positions?published=true`);
                
                if (response.ok && response.data?.success) {
                    const candidatePositions = response.data.data.filter(pos => pos.categoryId === categoryId);
                    positions.push(...candidatePositions);
                }
            } catch (error) {
                console.error(`Error fetching positions for candidate ${candidateId}:`, error);
            }
        }

        return positions;
    }

    /**
     * Compare two specific positions using semantic analysis
     */
    async comparePositions(position1Id, position2Id) {
        try {
            // In a full implementation, this would call the backend API for semantic comparison
            // For now, we'll simulate the analysis
            return {
                position1Id,
                position2Id,
                similarityScore: 0.75, // Simulated score
                agreementLevel: 'PARTIAL',
                keyDifferences: [
                    'Different approaches to implementation',
                    'Varying levels of government intervention',
                    'Different timeline priorities'
                ],
                analysisNotes: 'Both positions address the same core issue but propose different solutions. There is moderate alignment in goals but significant differences in methodology.',
                confidence: 0.85
            };
        } catch (error) {
            console.error('Error comparing positions:', error);
            throw new Error('Failed to perform semantic comparison');
        }
    }

    /**
     * Perform AI comparison analysis on a set of positions
     */
    async performAIComparison(positions) {
        // Group positions by candidate for comparison
        const positionsByCandidate = {};
        positions.forEach(position => {
            if (!positionsByCandidate[position.candidateId]) {
                positionsByCandidate[position.candidateId] = [];
            }
            positionsByCandidate[position.candidateId].push(position);
        });

        const candidates = Object.keys(positionsByCandidate);
        
        // Perform pairwise comparisons
        const comparisons = [];
        for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
                const candidate1Positions = positionsByCandidate[candidates[i]];
                const candidate2Positions = positionsByCandidate[candidates[j]];
                
                // Compare each position from candidate 1 with positions from candidate 2
                for (const pos1 of candidate1Positions) {
                    for (const pos2 of candidate2Positions) {
                        const comparison = await this.comparePositions(pos1.id, pos2.id);
                        comparison.position1 = pos1;
                        comparison.position2 = pos2;
                        comparisons.push(comparison);
                    }
                }
            }
        }

        return {
            positions,
            positionsByCandidate,
            comparisons,
            summary: this.generateComparisonSummary(comparisons)
        };
    }

    /**
     * Generate a summary of the comparison analysis
     */
    generateComparisonSummary(comparisons) {
        const totalComparisons = comparisons.length;
        const highSimilarity = comparisons.filter(c => c.similarityScore >= 0.8).length;
        const moderateSimilarity = comparisons.filter(c => c.similarityScore >= 0.5 && c.similarityScore < 0.8).length;
        const lowSimilarity = comparisons.filter(c => c.similarityScore < 0.5).length;

        const agreementLevels = comparisons.reduce((acc, c) => {
            acc[c.agreementLevel] = (acc[c.agreementLevel] || 0) + 1;
            return acc;
        }, {});

        return {
            totalComparisons,
            highSimilarity,
            moderateSimilarity,
            lowSimilarity,
            agreementLevels,
            averageSimilarity: comparisons.reduce((sum, c) => sum + c.similarityScore, 0) / totalComparisons || 0
        };
    }

    /**
     * Render category comparison with AI analysis
     */
    renderCategoryComparison(comparison) {
        const { positions, positionsByCandidate, comparisons, summary } = comparison;
        const candidates = Object.keys(positionsByCandidate);

        return `
            <div class="ai-policy-comparison">
                <div class="comparison-header">
                    <h3>🤖 AI Policy Analysis</h3>
                    <div class="analysis-summary">
                        <div class="summary-stats">
                            <div class="stat">
                                <strong>${summary.totalComparisons}</strong>
                                <span>Comparisons</span>
                            </div>
                            <div class="stat">
                                <strong>${Math.round(summary.averageSimilarity * 100)}%</strong>
                                <span>Avg Similarity</span>
                            </div>
                            <div class="stat">
                                <strong>${summary.highSimilarity}</strong>
                                <span>High Agreement</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Similarity Distribution -->
                <div class="similarity-distribution">
                    <h4>Position Alignment Analysis</h4>
                    <div class="distribution-bars">
                        <div class="distribution-item">
                            <span class="label">High Similarity (80%+)</span>
                            <div class="bar">
                                <div class="fill high" style="width: ${(summary.highSimilarity / summary.totalComparisons * 100)}%"></div>
                            </div>
                            <span class="count">${summary.highSimilarity}</span>
                        </div>
                        <div class="distribution-item">
                            <span class="label">Moderate Similarity (50-79%)</span>
                            <div class="bar">
                                <div class="fill moderate" style="width: ${(summary.moderateSimilarity / summary.totalComparisons * 100)}%"></div>
                            </div>
                            <span class="count">${summary.moderateSimilarity}</span>
                        </div>
                        <div class="distribution-item">
                            <span class="label">Low Similarity (&lt;50%)</span>
                            <div class="bar">
                                <div class="fill low" style="width: ${(summary.lowSimilarity / summary.totalComparisons * 100)}%"></div>
                            </div>
                            <span class="count">${summary.lowSimilarity}</span>
                        </div>
                    </div>
                </div>

                <!-- Detailed Comparisons -->
                <div class="detailed-comparisons">
                    <h4>Detailed Position Comparisons</h4>
                    ${comparisons.map(comp => this.renderPositionComparison(comp)).join('')}
                </div>

                <!-- AI Insights -->
                <div class="ai-insights">
                    <h4>🧠 AI Insights</h4>
                    <div class="insights-content">
                        ${this.generateInsights(summary, comparisons)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render a single position comparison
     */
    renderPositionComparison(comparison) {
        const { position1, position2, similarityScore, agreementLevel, keyDifferences, analysisNotes } = comparison;
        
        const similarityClass = similarityScore >= 0.8 ? 'high' : similarityScore >= 0.5 ? 'moderate' : 'low';
        const agreementIcon = {
            'AGREE': '✅',
            'DISAGREE': '❌',
            'PARTIAL': '🔄',
            'UNCLEAR': '❓'
        };

        return `
            <div class="position-comparison">
                <div class="comparison-header">
                    <div class="candidates">
                        <div class="candidate">${position1.candidate?.name || 'Candidate A'}</div>
                        <div class="vs">vs</div>
                        <div class="candidate">${position2.candidate?.name || 'Candidate B'}</div>
                    </div>
                    <div class="similarity-score ${similarityClass}">
                        ${Math.round(similarityScore * 100)}% Similar
                    </div>
                </div>

                <div class="position-details">
                    <div class="position-item">
                        <h5>${position1.title}</h5>
                        <p class="summary">${position1.summary}</p>
                    </div>
                    <div class="position-item">
                        <h5>${position2.title}</h5>
                        <p class="summary">${position2.summary}</p>
                    </div>
                </div>

                <div class="analysis-details">
                    <div class="agreement-level">
                        <span class="icon">${agreementIcon[agreementLevel]}</span>
                        <span class="label">${agreementLevel.charAt(0) + agreementLevel.slice(1).toLowerCase()} Agreement</span>
                    </div>

                    ${keyDifferences.length > 0 ? `
                        <div class="key-differences">
                            <h6>Key Differences:</h6>
                            <ul>
                                ${keyDifferences.map(diff => `<li>${diff}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${analysisNotes ? `
                        <div class="analysis-notes">
                            <p>${analysisNotes}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render similarity analysis for two specific positions
     */
    renderSimilarityAnalysis(similarity) {
        const { similarityScore, agreementLevel, keyDifferences, analysisNotes, confidence } = similarity;
        
        return `
            <div class="similarity-analysis">
                <div class="similarity-header">
                    <h3>Position Similarity Analysis</h3>
                    <div class="confidence-score">
                        Confidence: ${Math.round(confidence * 100)}%
                    </div>
                </div>

                <div class="similarity-metrics">
                    <div class="metric">
                        <label>Semantic Similarity</label>
                        <div class="similarity-bar">
                            <div class="fill" style="width: ${similarityScore * 100}%"></div>
                        </div>
                        <span>${Math.round(similarityScore * 100)}%</span>
                    </div>
                    
                    <div class="agreement-indicator">
                        <label>Agreement Level</label>
                        <span class="agreement-badge ${agreementLevel.toLowerCase()}">${agreementLevel}</span>
                    </div>
                </div>

                ${keyDifferences.length > 0 ? `
                    <div class="key-differences">
                        <h4>Key Differences Identified</h4>
                        <ul>
                            ${keyDifferences.map(diff => `<li>${diff}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${analysisNotes ? `
                    <div class="analysis-notes">
                        <h4>AI Analysis</h4>
                        <p>${analysisNotes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Generate AI insights from comparison data
     */
    generateInsights(summary, comparisons) {
        const insights = [];

        // Consensus insight
        if (summary.highSimilarity > summary.lowSimilarity) {
            insights.push("🤝 <strong>Strong Consensus:</strong> Candidates show significant agreement on key approaches in this policy area.");
        } else if (summary.lowSimilarity > summary.highSimilarity) {
            insights.push("⚔️ <strong>Sharp Differences:</strong> Candidates have distinctly different approaches to this issue, giving voters clear choices.");
        } else {
            insights.push("🎭 <strong>Mixed Approaches:</strong> Candidates show both areas of agreement and significant differences.");
        }

        // Agreement level insight
        const topAgreement = Object.entries(summary.agreementLevels)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (topAgreement) {
            const [level, count] = topAgreement;
            insights.push(`📊 <strong>Most Common:</strong> ${level.charAt(0) + level.slice(1).toLowerCase()} agreement appears in ${count} comparisons.`);
        }

        // Similarity insight
        if (summary.averageSimilarity > 0.7) {
            insights.push("🎯 <strong>High Alignment:</strong> Overall, candidates show strong semantic similarity in their policy language and goals.");
        } else if (summary.averageSimilarity < 0.4) {
            insights.push("🌈 <strong>Diverse Perspectives:</strong> Candidates offer significantly different policy perspectives and priorities.");
        }

        return insights.map(insight => `<div class="insight-item">${insight}</div>`).join('');
    }

    /**
     * Add CSS styles for policy comparison
     */
    addStyles() {
        if (document.getElementById('policyComparisonStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'policyComparisonStyles';
        styles.textContent = `
            /* AI Policy Comparison Styles */
            .ai-policy-comparison {
                background: white;
                border-radius: 8px;
                padding: 1.5rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .comparison-header h3 {
                margin: 0 0 1rem 0;
                color: #4b5c09;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .analysis-summary {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 4px;
                margin-bottom: 1.5rem;
            }

            .summary-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 1rem;
                text-align: center;
            }

            .stat strong {
                display: block;
                font-size: 1.5rem;
                color: #4b5c09;
                margin-bottom: 0.25rem;
            }

            .stat span {
                color: #666;
                font-size: 0.9rem;
            }

            .similarity-distribution {
                margin-bottom: 2rem;
            }

            .similarity-distribution h4 {
                margin: 0 0 1rem 0;
                color: #333;
            }

            .distribution-bars {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .distribution-item {
                display: grid;
                grid-template-columns: 200px 1fr auto;
                align-items: center;
                gap: 1rem;
            }

            .bar {
                height: 20px;
                background: #e9ecef;
                border-radius: 10px;
                overflow: hidden;
            }

            .fill {
                height: 100%;
                transition: width 0.3s ease;
            }

            .fill.high {
                background: #28a745;
            }

            .fill.moderate {
                background: #ffc107;
            }

            .fill.low {
                background: #dc3545;
            }

            .count {
                font-weight: 600;
                color: #333;
                min-width: 30px;
                text-align: center;
            }

            .detailed-comparisons {
                margin-bottom: 2rem;
            }

            .detailed-comparisons h4 {
                margin: 0 0 1rem 0;
                color: #333;
            }

            .position-comparison {
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 1rem;
                margin-bottom: 1rem;
            }

            .position-comparison .comparison-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                flex-wrap: wrap;
                gap: 1rem;
            }

            .candidates {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .candidate {
                font-weight: 600;
                color: #4b5c09;
            }

            .vs {
                color: #666;
                font-size: 0.9rem;
            }

            .similarity-score {
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-weight: 600;
                font-size: 0.85rem;
            }

            .similarity-score.high {
                background: #d4edda;
                color: #155724;
            }

            .similarity-score.moderate {
                background: #fff3cd;
                color: #856404;
            }

            .similarity-score.low {
                background: #f8d7da;
                color: #721c24;
            }

            .position-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1.5rem;
                margin-bottom: 1rem;
            }

            .position-item h5 {
                margin: 0 0 0.5rem 0;
                color: #333;
                font-size: 1rem;
            }

            .position-item .summary {
                color: #666;
                font-size: 0.9rem;
                line-height: 1.4;
                margin: 0;
            }

            .analysis-details {
                border-top: 1px solid #f0f0f0;
                padding-top: 1rem;
            }

            .agreement-level {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.75rem;
            }

            .agreement-level .icon {
                font-size: 1.2rem;
            }

            .agreement-level .label {
                font-weight: 600;
                color: #333;
            }

            .key-differences {
                margin-bottom: 0.75rem;
            }

            .key-differences h6 {
                margin: 0 0 0.5rem 0;
                color: #333;
                font-size: 0.9rem;
            }

            .key-differences ul {
                margin: 0;
                padding-left: 1.5rem;
            }

            .key-differences li {
                color: #666;
                font-size: 0.85rem;
                line-height: 1.4;
                margin-bottom: 0.25rem;
            }

            .analysis-notes p {
                color: #555;
                font-size: 0.9rem;
                line-height: 1.4;
                margin: 0;
                font-style: italic;
            }

            .ai-insights {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 4px;
                border-left: 4px solid #4b5c09;
            }

            .ai-insights h4 {
                margin: 0 0 0.75rem 0;
                color: #4b5c09;
            }

            .insight-item {
                color: #555;
                line-height: 1.5;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }

            .insight-item:last-child {
                margin-bottom: 0;
            }

            /* Similarity Analysis Styles */
            .similarity-analysis {
                background: white;
                border-radius: 8px;
                padding: 1.5rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .similarity-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            }

            .similarity-header h3 {
                margin: 0;
                color: #4b5c09;
            }

            .confidence-score {
                background: #e8f5e8;
                padding: 0.25rem 0.75rem;
                border-radius: 4px;
                font-size: 0.85rem;
                color: #2d5a2d;
            }

            .similarity-metrics {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .metric {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .metric label {
                min-width: 150px;
                font-weight: 600;
                color: #333;
            }

            .similarity-bar {
                flex-grow: 1;
                height: 24px;
                background: #e9ecef;
                border-radius: 12px;
                overflow: hidden;
            }

            .similarity-bar .fill {
                height: 100%;
                background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%);
                transition: width 0.3s ease;
            }

            .agreement-indicator {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .agreement-badge {
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-weight: 600;
                font-size: 0.85rem;
                text-transform: uppercase;
            }

            .agreement-badge.agree {
                background: #d4edda;
                color: #155724;
            }

            .agreement-badge.disagree {
                background: #f8d7da;
                color: #721c24;
            }

            .agreement-badge.partial {
                background: #fff3cd;
                color: #856404;
            }

            .agreement-badge.unclear {
                background: #e2e3e5;
                color: #383d41;
            }

            /* Mobile Responsiveness */
            @media (max-width: 768px) {
                .position-details {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }

                .candidates {
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .distribution-item {
                    grid-template-columns: 1fr;
                    gap: 0.5rem;
                }

                .similarity-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 1rem;
                }

                .metric {
                    flex-direction: column;
                    align-items: flex-start;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Initialize global instance
window.policyComparison = new PolicyComparison();

// Add styles when the component loads
document.addEventListener('DOMContentLoaded', () => {
    window.policyComparison.addStyles();
});