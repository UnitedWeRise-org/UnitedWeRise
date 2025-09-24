/**
 * AIInsightsController - Handles admin dashboard AI-powered analytics and insights
 * Comprehensive AI analytics dashboard with Azure OpenAI integration
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 4.3 - AI-powered analytics and insights controller
 */

class AIInsightsController {
    constructor() {
        this.sectionId = 'ai-insights';
        this.isInitialized = false;
        this.aiInsightsData = {};
        this.refreshInterval = null;
        this.isRealTimeMode = false;
        this.charts = new Map();
        this.currentFilters = {
            category: 'all',
            status: 'all',
            timeRange: '30d',
            analysisType: 'all'
        };
        this.aiModels = {
            contentAnalysis: 'gpt-35-turbo',
            sentimentAnalysis: 'text-davinci-003',
            topicDiscovery: 'text-embedding-ada-002',
            predictiveAnalytics: 'gpt-4'
        };

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displayAIInsightsData = this.displayAIInsightsData.bind(this);
        this.handleContentAnalysis = this.handleContentAnalysis.bind(this);
        this.handleTopicDiscovery = this.handleTopicDiscovery.bind(this);
        this.handleSentimentAnalysis = this.handleSentimentAnalysis.bind(this);
        this.displayPredictiveAnalytics = this.displayPredictiveAnalytics.bind(this);
        this.handleAIRecommendations = this.handleAIRecommendations.bind(this);
        this.generateAIReport = this.generateAIReport.bind(this);
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.toggleRealTime = this.toggleRealTime.bind(this);
        this.runAIAnalysis = this.runAIAnalysis.bind(this);
        this.setupCharts = this.setupCharts.bind(this);
        this.updateChart = this.updateChart.bind(this);
        // refreshAIInsights handled by loadData method
    }

    /**
     * Initialize the AI insights controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            await adminDebugLog('AIInsightsController', 'Starting initialization');

            // Check for Chart.js dependency
            if (typeof Chart === 'undefined') {
                await this.loadChartJS();
            }

            // Override AdminState display methods for AI insights
            if (window.AdminState) {
                window.AdminState.displayAIInsightsData = this.displayAIInsightsData.bind(this);
            }

            // Set up event listeners
            this.setupEventListeners();

            // Initialize charts containers
            this.setupCharts();

            // Load initial data
            await this.loadData();

            this.isInitialized = true;

            await adminDebugLog('AIInsightsController', 'Controller initialized successfully', {
                models: this.aiModels,
                realTimeMode: this.isRealTimeMode
            });
        } catch (error) {
            await adminDebugError('AIInsightsController', 'Initialization failed', error);
            throw error;
        }
    }

    /**
     * Load Chart.js if not available
     */
    async loadChartJS() {
        return new Promise((resolve, reject) => {
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                adminDebugLog('AIInsightsController', 'Chart.js loaded successfully');
                resolve();
            };
            script.onerror = () => {
                adminDebugError('AIInsightsController', 'Failed to load Chart.js');
                reject(new Error('Failed to load Chart.js'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Set up event listeners for AI insights section
     */
    setupEventListeners() {
        try {
            // Filter controls
            const categoryFilter = document.getElementById('suggestionCategoryFilter');
            const statusFilter = document.getElementById('suggestionStatusFilter');
            const timeRangeFilter = document.getElementById('aiTimeRange');
            const analysisTypeFilter = document.getElementById('aiAnalysisType');

            if (categoryFilter) {
                categoryFilter.addEventListener('change', (e) => {
                    this.currentFilters.category = e.target.value;
                    this.handleFilterChange();
                });
            }

            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.currentFilters.status = e.target.value;
                    this.handleFilterChange();
                });
            }

            if (timeRangeFilter) {
                timeRangeFilter.addEventListener('change', (e) => {
                    this.currentFilters.timeRange = e.target.value;
                    this.handleFilterChange();
                });
            }

            if (analysisTypeFilter) {
                analysisTypeFilter.addEventListener('change', (e) => {
                    this.currentFilters.analysisType = e.target.value;
                    this.handleFilterChange();
                });
            }

            // Action buttons
            const runAnalysisBtn = document.getElementById('runAIAnalysis');
            const generateReportBtn = document.getElementById('generateAIReport');
            const refreshInsightsBtn = document.getElementById('refreshAIInsights');
            const realTimeToggle = document.getElementById('aiRealTimeToggle');

            if (runAnalysisBtn) {
                runAnalysisBtn.addEventListener('click', this.runAIAnalysis);
            }

            if (generateReportBtn) {
                generateReportBtn.addEventListener('click', this.generateAIReport);
            }

            if (refreshInsightsBtn) {
                refreshInsightsBtn.addEventListener('click', () => this.loadData(false));
            }

            if (realTimeToggle) {
                realTimeToggle.addEventListener('change', this.toggleRealTime);
            }

            // Topic cluster clicks
            const topicContainer = document.getElementById('topicClusters');
            if (topicContainer) {
                topicContainer.addEventListener('click', (e) => {
                    if (e.target.classList.contains('topic-cluster')) {
                        this.handleTopicClusterClick(e.target.dataset.topicId);
                    }
                });
            }

            adminDebugLog('AIInsightsController', 'Event listeners set up successfully');
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error setting up event listeners', error);
        }
    }

    /**
     * Set up chart containers and configurations
     */
    setupCharts() {
        try {
            const chartConfigs = {
                sentimentChart: {
                    type: 'line',
                    element: 'sentimentChart',
                    title: 'Sentiment Analysis Over Time'
                },
                topicChart: {
                    type: 'doughnut',
                    element: 'topicChart',
                    title: 'Topic Distribution'
                },
                engagementPredictionChart: {
                    type: 'line',
                    element: 'engagementPredictionChart',
                    title: 'Engagement Predictions'
                },
                contentClassificationChart: {
                    type: 'bar',
                    element: 'contentClassificationChart',
                    title: 'Content Classification Results'
                },
                aiAccuracyChart: {
                    type: 'radar',
                    element: 'aiAccuracyChart',
                    title: 'AI Model Accuracy Metrics'
                },
                trendingTopicsChart: {
                    type: 'bubble',
                    element: 'trendingTopicsChart',
                    title: 'Trending Topics Analysis'
                }
            };

            for (const [name, config] of Object.entries(chartConfigs)) {
                const canvas = document.getElementById(config.element);
                if (canvas) {
                    this.charts.set(name, {
                        config,
                        canvas,
                        chart: null
                    });
                }
            }

            adminDebugLog('AIInsightsController', 'Chart containers set up', {
                chartsConfigured: this.charts.size
            });
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error setting up charts', error);
        }
    }

    /**
     * Load AI insights data
     */
    async loadData(useCache = true) {
        try {
            await adminDebugLog('AIInsightsController', 'Loading AI insights data', {
                filters: this.currentFilters,
                useCache
            });

            if (window.AdminState) {
                const data = await window.AdminState.loadAIInsightsData({
                    filters: this.currentFilters
                }, useCache);
                this.displayAIInsightsData(data);
                return data;
            } else {
                // Fallback to direct API call
                return await this.loadDataFallback();
            }
        } catch (error) {
            await adminDebugError('AIInsightsController', 'Error loading AI insights data', error);
            this.displayError('Failed to load AI insights data');
        }
    }

    /**
     * Fallback data loading method
     */
    async loadDataFallback() {
        try {
            const [suggestionsResponse, analysisResponse, metricsResponse] = await Promise.all([
                window.AdminAPI.get('/admin/ai-insights/suggestions', this.currentFilters),
                window.AdminAPI.get('/admin/ai-insights/analysis', this.currentFilters),
                window.AdminAPI.get('/admin/ai-insights/metrics', this.currentFilters)
            ]);

            if (suggestionsResponse.ok && analysisResponse.ok && metricsResponse.ok) {
                this.aiInsightsData = {
                    suggestions: suggestionsResponse.data.data,
                    analysis: analysisResponse.data.data,
                    metrics: metricsResponse.data.data
                };
                this.displayAIInsightsData(this.aiInsightsData);
                return this.aiInsightsData;
            } else {
                throw new Error('Failed to load AI insights data from API');
            }
        } catch (error) {
            await adminDebugError('AIInsightsController', 'Fallback data loading failed', error);
            throw error;
        }
    }

    /**
     * Display AI insights data
     */
    displayAIInsightsData(data) {
        try {
            if (!data) {
                this.displayError('No AI insights data available');
                return;
            }

            this.aiInsightsData = data;

            // Update core metrics cards
            this.updateMetricCards(data.metrics || {});

            // Display content analysis results
            this.handleContentAnalysis(data.contentAnalysis || {});

            // Display topic discovery
            this.handleTopicDiscovery(data.topicDiscovery || {});

            // Display sentiment analysis
            this.handleSentimentAnalysis(data.sentimentAnalysis || {});

            // Display predictive analytics
            this.displayPredictiveAnalytics(data.predictiveAnalytics || {});

            // Display AI recommendations
            this.handleAIRecommendations(data.recommendations || {});

            // Update all charts
            this.updateAllCharts(data);

            // Update last refresh time
            this.updateLastRefreshTime();

            adminDebugLog('AIInsightsController', 'AI insights data displayed successfully', {
                dataKeys: Object.keys(data)
            });
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error displaying AI insights data', error);
            this.displayError('Error displaying AI insights data');
        }
    }

    /**
     * Update metric cards with AI KPIs
     */
    updateMetricCards(metrics) {
        const metricElements = {
            totalSuggestions: document.getElementById('totalSuggestions'),
            implementedSuggestions: document.getElementById('implementedSuggestions'),
            aiModerationActions: document.getElementById('aiModerationActions'),
            aiAccuracy: document.getElementById('aiAccuracy'),
            topicsDiscovered: document.getElementById('topicsDiscovered'),
            sentimentScore: document.getElementById('sentimentScore'),
            predictionAccuracy: document.getElementById('predictionAccuracy'),
            contentClassified: document.getElementById('contentClassified')
        };

        for (const [key, element] of Object.entries(metricElements)) {
            if (element && metrics[key] !== undefined) {
                element.textContent = this.formatMetricValue(metrics[key], key);

                // Add trend indicator if available
                const trendElement = element.nextElementSibling;
                if (trendElement && trendElement.classList.contains('metric-trend')) {
                    this.updateTrendIndicator(trendElement, metrics[`${key}Trend`]);
                }
            }
        }
    }

    /**
     * Handle content analysis display
     */
    handleContentAnalysis(analysisData) {
        try {
            const container = document.getElementById('contentAnalysisContainer');
            if (!container) return;

            let html = '<div class="content-analysis-results">';

            // Content classification results
            if (analysisData.classification) {
                html += `
                    <div class="analysis-card">
                        <h4>📊 Content Classification</h4>
                        <div class="classification-grid">
                `;

                for (const [category, count] of Object.entries(analysisData.classification)) {
                    const percentage = analysisData.totalContent ?
                        ((count / analysisData.totalContent) * 100).toFixed(1) : 0;
                    html += `
                        <div class="classification-item">
                            <div class="classification-label">${this.formatCategoryName(category)}</div>
                            <div class="classification-count">${count} posts</div>
                            <div class="classification-percentage">${percentage}%</div>
                            <div class="classification-bar">
                                <div class="classification-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `;
                }

                html += '</div></div>';
            }

            // Content quality assessment
            if (analysisData.qualityAssessment) {
                html += `
                    <div class="analysis-card">
                        <h4>⭐ Content Quality Assessment</h4>
                        <div class="quality-metrics">
                            <div class="quality-item">
                                <span class="quality-label">Average Quality Score</span>
                                <span class="quality-score">${analysisData.qualityAssessment.averageScore?.toFixed(1)}/10</span>
                            </div>
                            <div class="quality-item">
                                <span class="quality-label">High Quality Content</span>
                                <span class="quality-percentage">${analysisData.qualityAssessment.highQualityPercentage?.toFixed(1)}%</span>
                            </div>
                            <div class="quality-item">
                                <span class="quality-label">Content Requiring Review</span>
                                <span class="quality-count">${analysisData.qualityAssessment.reviewRequired || 0} posts</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Automated moderation results
            if (analysisData.moderation) {
                html += `
                    <div class="analysis-card">
                        <h4>🛡️ AI Moderation Results</h4>
                        <div class="moderation-stats">
                            <div class="moderation-item">
                                <span class="moderation-label">Content Flagged</span>
                                <span class="moderation-count">${analysisData.moderation.flagged || 0}</span>
                            </div>
                            <div class="moderation-item">
                                <span class="moderation-label">Auto-Approved</span>
                                <span class="moderation-count">${analysisData.moderation.approved || 0}</span>
                            </div>
                            <div class="moderation-item">
                                <span class="moderation-label">Requires Human Review</span>
                                <span class="moderation-count">${analysisData.moderation.humanReview || 0}</span>
                            </div>
                            <div class="moderation-item">
                                <span class="moderation-label">Accuracy Rate</span>
                                <span class="moderation-percentage">${analysisData.moderation.accuracy?.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;

            adminDebugLog('AIInsightsController', 'Content analysis displayed');
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error displaying content analysis', error);
        }
    }

    /**
     * Handle topic discovery display
     */
    handleTopicDiscovery(topicData) {
        try {
            const container = document.getElementById('topicDiscoveryContainer');
            if (!container) return;

            let html = '<div class="topic-discovery-results">';

            // Trending topics
            if (topicData.trending) {
                html += `
                    <div class="topic-card">
                        <h4>🔥 Trending Topics</h4>
                        <div class="trending-topics-grid" id="trendingTopicsGrid">
                `;

                topicData.trending.slice(0, 8).forEach((topic, index) => {
                    const intensity = Math.min(Math.max(topic.score * 100, 20), 100);
                    html += `
                        <div class="trending-topic-item" style="opacity: ${intensity/100}">
                            <div class="topic-rank">#${index + 1}</div>
                            <div class="topic-title">${topic.title}</div>
                            <div class="topic-engagement">${topic.engagementCount} interactions</div>
                            <div class="topic-growth ${topic.growth >= 0 ? 'positive' : 'negative'}">
                                ${topic.growth >= 0 ? '↗' : '↘'} ${Math.abs(topic.growth).toFixed(1)}%
                            </div>
                        </div>
                    `;
                });

                html += '</div></div>';
            }

            // Topic clusters
            if (topicData.clusters) {
                html += `
                    <div class="topic-card">
                        <h4>🎯 Topic Clusters</h4>
                        <div class="topic-clusters-container" id="topicClusters">
                `;

                topicData.clusters.forEach(cluster => {
                    html += `
                        <div class="topic-cluster" data-topic-id="${cluster.id}">
                            <div class="cluster-title">${cluster.title}</div>
                            <div class="cluster-posts">${cluster.postCount} posts</div>
                            <div class="cluster-keywords">
                                ${cluster.keywords.slice(0, 3).map(keyword =>
                                    `<span class="keyword-tag">${keyword}</span>`
                                ).join('')}
                            </div>
                            <div class="cluster-sentiment ${this.getSentimentClass(cluster.sentiment)}">
                                ${this.getSentimentIcon(cluster.sentiment)} ${cluster.sentiment}
                            </div>
                        </div>
                    `;
                });

                html += '</div></div>';
            }

            // Semantic analysis
            if (topicData.semanticAnalysis) {
                html += `
                    <div class="topic-card">
                        <h4>🧠 Semantic Analysis</h4>
                        <div class="semantic-insights">
                            <div class="semantic-item">
                                <span class="semantic-label">Topics Identified</span>
                                <span class="semantic-value">${topicData.semanticAnalysis.topicsCount}</span>
                            </div>
                            <div class="semantic-item">
                                <span class="semantic-label">Average Coherence Score</span>
                                <span class="semantic-value">${topicData.semanticAnalysis.coherenceScore?.toFixed(2)}</span>
                            </div>
                            <div class="semantic-item">
                                <span class="semantic-label">Cross-Topic Similarity</span>
                                <span class="semantic-value">${topicData.semanticAnalysis.similarity?.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;

            adminDebugLog('AIInsightsController', 'Topic discovery displayed');
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error displaying topic discovery', error);
        }
    }

    /**
     * Handle sentiment analysis display
     */
    handleSentimentAnalysis(sentimentData) {
        try {
            const container = document.getElementById('sentimentAnalysisContainer');
            if (!container) return;

            let html = '<div class="sentiment-analysis-results">';

            // Overall sentiment metrics
            if (sentimentData.overall) {
                html += `
                    <div class="sentiment-card">
                        <h4>📊 Overall Platform Sentiment</h4>
                        <div class="sentiment-overview">
                            <div class="sentiment-gauge">
                                <div class="gauge-container">
                                    <div class="gauge-fill" style="transform: rotate(${(sentimentData.overall.score + 1) * 90}deg)"></div>
                                    <div class="gauge-center">
                                        <span class="gauge-score">${sentimentData.overall.score?.toFixed(2)}</span>
                                        <span class="gauge-label">${this.getSentimentLabel(sentimentData.overall.score)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="sentiment-breakdown">
                                <div class="sentiment-item positive">
                                    <span class="sentiment-label">Positive</span>
                                    <span class="sentiment-percentage">${sentimentData.overall.positive?.toFixed(1)}%</span>
                                </div>
                                <div class="sentiment-item neutral">
                                    <span class="sentiment-label">Neutral</span>
                                    <span class="sentiment-percentage">${sentimentData.overall.neutral?.toFixed(1)}%</span>
                                </div>
                                <div class="sentiment-item negative">
                                    <span class="sentiment-label">Negative</span>
                                    <span class="sentiment-percentage">${sentimentData.overall.negative?.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Geographic sentiment distribution
            if (sentimentData.geographic) {
                html += `
                    <div class="sentiment-card">
                        <h4>🗺️ Geographic Sentiment Distribution</h4>
                        <div class="geographic-sentiment">
                `;

                sentimentData.geographic.forEach(region => {
                    html += `
                        <div class="region-sentiment">
                            <div class="region-name">${region.name}</div>
                            <div class="region-score ${this.getSentimentClass(region.avgSentiment)}">
                                ${region.avgSentiment?.toFixed(2)}
                            </div>
                            <div class="region-posts">${region.postCount} posts</div>
                        </div>
                    `;
                });

                html += '</div></div>';
            }

            // Temporal sentiment trends
            if (sentimentData.temporal) {
                html += `
                    <div class="sentiment-card">
                        <h4>📈 Sentiment Trends Over Time</h4>
                        <div class="temporal-sentiment">
                            <canvas id="sentimentChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;

            // Update sentiment chart if temporal data is available
            if (sentimentData.temporal) {
                this.updateSentimentChart(sentimentData.temporal);
            }

            adminDebugLog('AIInsightsController', 'Sentiment analysis displayed');
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error displaying sentiment analysis', error);
        }
    }

    /**
     * Display predictive analytics
     */
    displayPredictiveAnalytics(predictiveData) {
        try {
            const container = document.getElementById('predictiveAnalyticsContainer');
            if (!container) return;

            let html = '<div class="predictive-analytics-results">';

            // Engagement predictions
            if (predictiveData.engagement) {
                html += `
                    <div class="prediction-card">
                        <h4>📈 Engagement Predictions</h4>
                        <div class="prediction-metrics">
                            <div class="prediction-item">
                                <span class="prediction-label">Predicted Daily Engagement</span>
                                <span class="prediction-value">${predictiveData.engagement.dailyPrediction?.toLocaleString()}</span>
                                <span class="prediction-confidence">±${predictiveData.engagement.confidence?.toFixed(1)}%</span>
                            </div>
                            <div class="prediction-item">
                                <span class="prediction-label">Growth Trajectory</span>
                                <span class="prediction-value ${predictiveData.engagement.growthDirection === 'up' ? 'positive' : 'negative'}">
                                    ${predictiveData.engagement.growthDirection === 'up' ? '↗' : '↘'} ${predictiveData.engagement.growthRate?.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div class="prediction-chart">
                            <canvas id="engagementPredictionChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                `;
            }

            // User behavior predictions
            if (predictiveData.userBehavior) {
                html += `
                    <div class="prediction-card">
                        <h4>👥 User Behavior Predictions</h4>
                        <div class="behavior-predictions">
                            <div class="behavior-item">
                                <span class="behavior-label">Churn Risk Users</span>
                                <span class="behavior-count">${predictiveData.userBehavior.churnRisk || 0}</span>
                                <span class="behavior-percentage">${predictiveData.userBehavior.churnPercentage?.toFixed(1)}%</span>
                            </div>
                            <div class="behavior-item">
                                <span class="behavior-label">High Engagement Potential</span>
                                <span class="behavior-count">${predictiveData.userBehavior.highEngagement || 0}</span>
                                <span class="behavior-percentage">${predictiveData.userBehavior.engagementPotential?.toFixed(1)}%</span>
                            </div>
                            <div class="behavior-item">
                                <span class="behavior-label">Content Creator Potential</span>
                                <span class="behavior-count">${predictiveData.userBehavior.creatorPotential || 0}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Content performance predictions
            if (predictiveData.contentPerformance) {
                html += `
                    <div class="prediction-card">
                        <h4>📝 Content Performance Predictions</h4>
                        <div class="content-predictions">
                `;

                predictiveData.contentPerformance.forEach(prediction => {
                    html += `
                        <div class="content-prediction-item">
                            <div class="prediction-content">${this.truncateText(prediction.content, 100)}</div>
                            <div class="prediction-score">
                                <span class="score-label">Predicted Engagement</span>
                                <span class="score-value">${prediction.predictedEngagement?.toFixed(1)}</span>
                            </div>
                            <div class="prediction-factors">
                                ${prediction.factors.map(factor =>
                                    `<span class="factor-tag">${factor}</span>`
                                ).join('')}
                            </div>
                        </div>
                    `;
                });

                html += '</div></div>';
            }

            html += '</div>';
            container.innerHTML = html;

            adminDebugLog('AIInsightsController', 'Predictive analytics displayed');
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error displaying predictive analytics', error);
        }
    }

    /**
     * Handle AI recommendations display
     */
    handleAIRecommendations(recommendationsData) {
        try {
            const container = document.getElementById('aiRecommendationsContainer');
            if (!container) return;

            let html = '<div class="ai-recommendations-results">';

            // Platform improvements
            if (recommendationsData.platformImprovements) {
                html += `
                    <div class="recommendations-card">
                        <h4>🔧 Platform Improvement Recommendations</h4>
                        <div class="recommendations-list">
                `;

                recommendationsData.platformImprovements.forEach(recommendation => {
                    html += `
                        <div class="recommendation-item ${recommendation.priority}">
                            <div class="recommendation-header">
                                <span class="recommendation-title">${recommendation.title}</span>
                                <span class="recommendation-priority">${recommendation.priority}</span>
                                <span class="recommendation-impact">Impact: ${recommendation.impact}</span>
                            </div>
                            <div class="recommendation-description">${recommendation.description}</div>
                            <div class="recommendation-metrics">
                                <span class="recommendation-effort">Effort: ${recommendation.effort}</span>
                                <span class="recommendation-roi">ROI: ${recommendation.roi}x</span>
                            </div>
                        </div>
                    `;
                });

                html += '</div></div>';
            }

            // Content strategy recommendations
            if (recommendationsData.contentStrategy) {
                html += `
                    <div class="recommendations-card">
                        <h4>📄 Content Strategy Recommendations</h4>
                        <div class="content-recommendations">
                `;

                recommendationsData.contentStrategy.forEach(strategy => {
                    html += `
                        <div class="strategy-item">
                            <div class="strategy-type">${strategy.type}</div>
                            <div class="strategy-suggestion">${strategy.suggestion}</div>
                            <div class="strategy-rationale">${strategy.rationale}</div>
                            <div class="strategy-kpis">
                                Expected improvement: <strong>${strategy.expectedImprovement}</strong>
                            </div>
                        </div>
                    `;
                });

                html += '</div></div>';
            }

            // User engagement recommendations
            if (recommendationsData.userEngagement) {
                html += `
                    <div class="recommendations-card">
                        <h4>👥 User Engagement Recommendations</h4>
                        <div class="engagement-recommendations">
                `;

                recommendationsData.userEngagement.forEach(engagement => {
                    html += `
                        <div class="engagement-item">
                            <div class="engagement-target">${engagement.targetSegment}</div>
                            <div class="engagement-action">${engagement.recommendedAction}</div>
                            <div class="engagement-timing">Best time: ${engagement.optimalTiming}</div>
                            <div class="engagement-expected">
                                Expected result: <strong>${engagement.expectedOutcome}</strong>
                            </div>
                        </div>
                    `;
                });

                html += '</div></div>';
            }

            html += '</div>';
            container.innerHTML = html;

            adminDebugLog('AIInsightsController', 'AI recommendations displayed');
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error displaying AI recommendations', error);
        }
    }

    /**
     * Generate comprehensive AI report
     */
    async generateAIReport() {
        try {
            await adminDebugLog('AIInsightsController', 'Generating AI insights report');

            // Show loading state
            const generateBtn = document.getElementById('generateAIReport');
            const originalText = generateBtn.textContent;
            generateBtn.textContent = 'Generating Report...';
            generateBtn.disabled = true;

            try {
                const response = await window.AdminAPI.post('/admin/ai-insights/generate-report', {
                    filters: this.currentFilters,
                    includeCharts: true,
                    format: 'comprehensive'
                });

                if (response.ok && response.data.success) {
                    this.displayGeneratedReport(response.data.data);
                } else {
                    throw new Error(response.data.message || 'Failed to generate AI insights report');
                }
            } finally {
                generateBtn.textContent = originalText;
                generateBtn.disabled = false;
            }
        } catch (error) {
            await adminDebugError('AIInsightsController', 'Error generating AI report', error);
            alert('Failed to generate AI insights report. Please try again.');
        }
    }

    /**
     * Display generated AI report
     */
    displayGeneratedReport(reportData) {
        try {
            const container = document.getElementById('aiReportContainer');
            if (!container) return;

            let html = `
                <div class="ai-report">
                    <div class="report-header">
                        <h3>🤖 AI Insights Report</h3>
                        <div class="report-meta">
                            <span>Generated: ${new Date().toLocaleString()}</span>
                            <span>Period: ${this.formatTimeRange(this.currentFilters.timeRange)}</span>
                            <span>AI Models Used: ${Object.values(this.aiModels).join(', ')}</span>
                        </div>
                    </div>
                    <div class="report-content">
            `;

            // Executive summary
            if (reportData.executiveSummary) {
                html += `
                    <div class="report-section">
                        <h4>📋 Executive Summary</h4>
                        <div class="executive-summary">
                            <p><strong>Key Insights:</strong> ${reportData.executiveSummary.keyInsights}</p>
                            <p><strong>Platform Health:</strong> ${reportData.executiveSummary.platformHealth}</p>
                            <p><strong>Recommendations:</strong> ${reportData.executiveSummary.topRecommendations}</p>
                        </div>
                    </div>
                `;
            }

            // AI model performance
            if (reportData.modelPerformance) {
                html += `
                    <div class="report-section">
                        <h4>🎯 AI Model Performance</h4>
                        <div class="model-performance-grid">
                `;

                for (const [model, performance] of Object.entries(reportData.modelPerformance)) {
                    html += `
                        <div class="model-performance-item">
                            <div class="model-name">${model}</div>
                            <div class="model-accuracy">Accuracy: ${performance.accuracy}%</div>
                            <div class="model-latency">Avg Latency: ${performance.latency}ms</div>
                            <div class="model-usage">Usage: ${performance.requestCount} requests</div>
                        </div>
                    `;
                }

                html += '</div></div>';
            }

            // Insights summary
            if (reportData.insights) {
                html += `
                    <div class="report-section">
                        <h4>💡 Key Insights</h4>
                        <ul class="insights-list">
                `;

                reportData.insights.forEach(insight => {
                    html += `<li class="insight-item">${insight}</li>`;
                });

                html += '</ul></div>';
            }

            html += `
                    </div>
                    <div class="report-actions">
                        <button onclick="window.aiInsightsController.exportReport('pdf')" class="btn btn-primary">
                            Export as PDF
                        </button>
                        <button onclick="window.aiInsightsController.exportReport('csv')" class="btn btn-secondary">
                            Export Data as CSV
                        </button>
                        <button onclick="window.aiInsightsController.shareReport()" class="btn btn-tertiary">
                            Share Report
                        </button>
                    </div>
                </div>
            `;

            container.innerHTML = html;
            container.scrollIntoView({ behavior: 'smooth' });

            adminDebugLog('AIInsightsController', 'AI insights report displayed successfully');
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error displaying AI report', error);
        }
    }

    /**
     * Update all AI-related charts
     */
    updateAllCharts(data) {
        try {
            // Sentiment trend chart
            if (data.sentimentAnalysis?.temporal) {
                this.updateSentimentChart(data.sentimentAnalysis.temporal);
            }

            // Topic distribution chart
            if (data.topicDiscovery?.distribution) {
                this.updateTopicChart(data.topicDiscovery.distribution);
            }

            // Engagement prediction chart
            if (data.predictiveAnalytics?.engagement) {
                this.updateEngagementPredictionChart(data.predictiveAnalytics.engagement);
            }

            // Content classification chart
            if (data.contentAnalysis?.classification) {
                this.updateContentClassificationChart(data.contentAnalysis.classification);
            }

            // AI accuracy radar chart
            if (data.metrics?.modelAccuracy) {
                this.updateAIAccuracyChart(data.metrics.modelAccuracy);
            }

            adminDebugLog('AIInsightsController', 'All AI charts updated successfully');
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error updating AI charts', error);
        }
    }

    /**
     * Update sentiment analysis chart
     */
    updateSentimentChart(temporalData) {
        this.updateChart('sentimentChart', {
            type: 'line',
            data: {
                labels: temporalData.labels,
                datasets: [{
                    label: 'Positive Sentiment',
                    data: temporalData.positive,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Neutral Sentiment',
                    data: temporalData.neutral,
                    borderColor: 'rgb(156, 163, 175)',
                    backgroundColor: 'rgba(156, 163, 175, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Negative Sentiment',
                    data: temporalData.negative,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sentiment Analysis Over Time'
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Handle filter changes
     */
    async handleFilterChange() {
        try {
            await adminDebugLog('AIInsightsController', 'Filters changed', {
                filters: this.currentFilters
            });

            // Reload data with new filters
            await this.loadData(false);
        } catch (error) {
            await adminDebugError('AIInsightsController', 'Error handling filter change', error);
        }
    }

    /**
     * Toggle real-time mode
     */
    toggleRealTime(event) {
        try {
            this.isRealTimeMode = event.target.checked;

            if (this.isRealTimeMode) {
                // Start auto-refresh every 60 seconds for AI insights
                this.refreshInterval = setInterval(() => {
                    this.loadData(false);
                }, 60000);

                adminDebugLog('AIInsightsController', 'Real-time mode enabled');
            } else {
                // Stop auto-refresh
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                    this.refreshInterval = null;
                }

                adminDebugLog('AIInsightsController', 'Real-time mode disabled');
            }
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error toggling real-time mode', error);
        }
    }

    /**
     * Run AI analysis on demand
     */
    async runAIAnalysis() {
        try {
            await adminDebugLog('AIInsightsController', 'Running on-demand AI analysis');

            const runBtn = document.getElementById('runAIAnalysis');
            const originalText = runBtn.textContent;
            runBtn.textContent = 'Running Analysis...';
            runBtn.disabled = true;

            try {
                const response = await window.AdminAPI.post('/admin/ai-insights/run-analysis', {
                    analysisTypes: ['content', 'sentiment', 'topics', 'predictions'],
                    scope: this.currentFilters
                });

                if (response.ok && response.data.success) {
                    // Refresh data to show new analysis results
                    await this.loadData(false);

                    // Show success message
                    this.showAnalysisComplete(response.data.data);
                } else {
                    throw new Error(response.data.message || 'Failed to run AI analysis');
                }
            } finally {
                runBtn.textContent = originalText;
                runBtn.disabled = false;
            }
        } catch (error) {
            await adminDebugError('AIInsightsController', 'Error running AI analysis', error);
            alert('Failed to run AI analysis. Please try again.');
        }
    }

    /**
     * Show analysis completion notification
     */
    showAnalysisComplete(results) {
        const notification = document.createElement('div');
        notification.className = 'ai-analysis-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>🤖 AI Analysis Complete</h4>
                <p>Processed ${results.itemsAnalyzed} items in ${results.processingTime}ms</p>
                <p>New insights available in dashboard</p>
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-sm">Close</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Utility methods
     */
    formatMetricValue(value, type) {
        if (typeof value !== 'number') return value;

        switch (type) {
            case 'aiAccuracy':
            case 'predictionAccuracy':
            case 'sentimentScore':
                return `${(value * 100).toFixed(1)}%`;
            case 'totalSuggestions':
            case 'implementedSuggestions':
            case 'aiModerationActions':
            case 'topicsDiscovered':
            case 'contentClassified':
                return value.toLocaleString();
            default:
                return value.toString();
        }
    }

    updateTrendIndicator(element, trend) {
        if (!trend) return;

        element.className = 'metric-trend';
        if (trend > 0) {
            element.className += ' positive';
            element.innerHTML = `↗ +${trend.toFixed(1)}%`;
        } else if (trend < 0) {
            element.className += ' negative';
            element.innerHTML = `↘ ${trend.toFixed(1)}%`;
        } else {
            element.className += ' neutral';
            element.innerHTML = '→ 0%';
        }
    }

    formatCategoryName(category) {
        return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getSentimentClass(sentiment) {
        if (typeof sentiment === 'number') {
            if (sentiment > 0.1) return 'positive';
            if (sentiment < -0.1) return 'negative';
            return 'neutral';
        }
        return sentiment?.toLowerCase() || 'neutral';
    }

    getSentimentIcon(sentiment) {
        const sentimentClass = this.getSentimentClass(sentiment);
        switch (sentimentClass) {
            case 'positive': return '😊';
            case 'negative': return '😞';
            default: return '😐';
        }
    }

    getSentimentLabel(score) {
        if (score > 0.5) return 'Very Positive';
        if (score > 0.1) return 'Positive';
        if (score > -0.1) return 'Neutral';
        if (score > -0.5) return 'Negative';
        return 'Very Negative';
    }

    formatTimeRange(range) {
        const ranges = {
            '7d': 'Last 7 days',
            '30d': 'Last 30 days',
            '90d': 'Last 90 days',
            '1y': 'Last year'
        };
        return ranges[range] || range;
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    updateChart(chartName, config) {
        try {
            const chartInfo = this.charts.get(chartName);
            if (!chartInfo || !chartInfo.canvas) return;

            // Destroy existing chart
            if (chartInfo.chart) {
                chartInfo.chart.destroy();
            }

            // Create new chart
            const ctx = chartInfo.canvas.getContext('2d');
            chartInfo.chart = new Chart(ctx, config);

            adminDebugLog('AIInsightsController', `Chart ${chartName} updated successfully`);
        } catch (error) {
            adminDebugError('AIInsightsController', `Error updating chart ${chartName}`, error);
        }
    }

    updateLastRefreshTime() {
        const element = document.getElementById('aiLastRefreshTime');
        if (element) {
            element.textContent = new Date().toLocaleTimeString();
        }
    }

    displayError(message) {
        const container = document.getElementById('aiInsightsContent');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>🤖 AI Insights Unavailable</h3>
                    <p>${message}</p>
                    <button onclick="window.aiInsightsController.loadData(false)" class="btn btn-primary">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        try {
            // Stop real-time refresh
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }

            // Destroy all charts
            for (const [name] of this.charts) {
                this.destroyChart(name);
            }
            this.charts.clear();

            // Clear data
            this.aiInsightsData = {};
            this.isInitialized = false;

            adminDebugLog('AIInsightsController', 'Controller destroyed successfully');
        } catch (error) {
            adminDebugError('AIInsightsController', 'Error during cleanup', error);
        }
    }

    destroyChart(chartName) {
        const chartInfo = this.charts.get(chartName);
        if (chartInfo && chartInfo.chart) {
            chartInfo.chart.destroy();
            chartInfo.chart = null;
        }
    }
}

// Create global instance and expose
window.AIInsightsController = AIInsightsController;

// Auto-initialization for standalone usage
if (typeof window !== 'undefined' && !window.aiInsightsController) {
    window.aiInsightsController = new AIInsightsController();
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIInsightsController;
}