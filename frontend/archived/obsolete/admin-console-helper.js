// Admin Console Helper for UnitedWeRise
// Load this script in browser console for admin debugging tools

// Auto-detect backend URL
const BACKEND_URL = 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io';

// Get auth token from localStorage
function getAuthToken() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No auth token found. Please log in to admin dashboard first.');
        return null;
    }
    return token;
}

// Admin Console Functions
window.adminHelper = {
    // Quick suggestions check
    suggestions: async function(category = 'all', status = 'all') {
        const token = getAuthToken();
        if (!token) return;

        try {
            console.log(`🔍 Fetching ${category} suggestions with status: ${status}`);
            const response = await fetch(`${BACKEND_URL}/api/admin/ai-insights/suggestions?category=${category}&status=${status}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Suggestions Overview:', data.stats);
                console.table(data.suggestions);
                
                if (data.suggestions.length === 0) {
                    console.log('ℹ️ No suggestions found for these filters');
                } else {
                    console.log(`\n💡 Found ${data.suggestions.length} suggestions:`);
                    data.suggestions.forEach((s, i) => {
                        console.log(`${i+1}. [${s.status.toUpperCase()}] ${s.category}: ${s.summary}`);
                    });
                }
                return data;
            } else {
                console.log('⚠️ Suggestions endpoint not available yet. Showing mock data structure:');
                console.log({
                    stats: { total: 4, implemented: 1, pending: 3, accuracy: 87 },
                    suggestions: [
                        { category: 'ui_ux', status: 'new', summary: 'Example UI improvement suggestion' },
                        { category: 'features', status: 'reviewed', summary: 'Example feature request' }
                    ]
                });
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        }
    },

    // Quick error check
    errors: async function(severity = 'all', timeframe = '24h') {
        const token = getAuthToken();
        if (!token) return;

        try {
            console.log(`🐛 Fetching ${severity} errors from last ${timeframe}`);
            const response = await fetch(`${BACKEND_URL}/api/admin/errors?severity=${severity}&timeframe=${timeframe}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Error Stats:', data.stats);
                console.table(data.errors);
                return data;
            } else {
                console.log('⚠️ Detailed error endpoint not available. Checking system health...');
                return await this.health();
            }
        } catch (error) {
            console.error('Failed to fetch errors:', error);
            return await this.health();
        }
    },

    // System health check
    health: async function() {
        try {
            console.log('🏥 Checking system health...');
            const response = await fetch(`${BACKEND_URL}/health`);
            const data = await response.json();
            
            console.log(`✅ Status: ${data.status}`);
            console.log(`📊 Error Rate: ${data.requests.errorRate.toFixed(2)}%`);
            console.log(`📈 Total Requests: ${data.requests.total}`);
            console.log(`❌ Total Errors: ${data.requests.errors || 0}`);
            console.log(`⏱️ Uptime: ${Math.round(data.uptime / 3600)} hours`);
            
            if (data.requests.errorRate < 4) {
                console.log('🎉 System performing well!');
            } else if (data.requests.errorRate < 8) {
                console.log('⚠️ Error rate elevated - monitor closely');
            } else {
                console.log('🚨 High error rate - investigate immediately');
            }
            
            return data;
        } catch (error) {
            console.error('❌ Failed to check system health:', error);
        }
    },

    // Quick user feedback analysis
    analyze: async function() {
        console.log('🤖 Running quick AI analysis...');
        
        // Check suggestions by category
        console.log('\n📊 SUGGESTIONS BY CATEGORY:');
        for (const category of ['ui_ux', 'features', 'performance', 'bugs', 'moderation']) {
            await this.suggestions(category, 'all');
        }
        
        // Check system health
        console.log('\n🏥 SYSTEM HEALTH:');
        await this.health();
        
        console.log('\n✅ Analysis complete!');
    },

    // Help menu
    help: function() {
        console.log(`
🎯 ADMIN HELPER COMMANDS
========================

📝 SUGGESTIONS & FEEDBACK:
• adminHelper.suggestions() - All suggestions
• adminHelper.suggestions('features') - Feature requests only  
• adminHelper.suggestions('ui_ux', 'new') - New UI suggestions
• adminHelper.suggestions('bugs', 'implemented') - Fixed bugs

🐛 ERROR TRACKING:
• adminHelper.errors() - All recent errors
• adminHelper.errors('critical') - Critical errors only
• adminHelper.errors('warning', '7d') - Warnings from last week

🏥 SYSTEM MONITORING:
• adminHelper.health() - Current system status
• adminHelper.analyze() - Full analysis report

📊 AVAILABLE FILTERS:
Categories: 'ui_ux', 'features', 'performance', 'bugs', 'moderation'  
Statuses: 'new', 'reviewed', 'implemented', 'rejected'
Severities: 'critical', 'error', 'warning'
Timeframes: '1h', '24h', '7d'

🚀 QUICK START:
adminHelper.analyze() - Run complete analysis
adminHelper.suggestions('features', 'new') - Check new feature requests
        `);
    }
};

// Auto-announce when loaded
console.log('🎯 Admin Helper Loaded!');
console.log('Type: adminHelper.help() for commands');
console.log('Quick start: adminHelper.analyze()');

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.adminHelper;
}