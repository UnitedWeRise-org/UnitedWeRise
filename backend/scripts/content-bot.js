/**
 * UnitedWeRise Content Generation Bot
 * 
 * Generates realistic political content using test accounts to simulate
 * a vibrant political discussion platform. This enables testing of:
 * - AI topic discovery and trending system
 * - Map conversation bubbles with real content
 * - Feed algorithms with diverse engagement patterns
 * - Reputation system under realistic load
 * 
 * Usage: node backend/scripts/content-bot.js [command]
 * Commands: 
 *   create-accounts - Generate additional test accounts
 *   start-posting   - Begin automated content generation
 *   stop-posting    - Stop content generation
 *   status          - Show bot status and statistics
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    API_BASE: process.env.API_BASE || 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api',
    
    // Bot behavior settings
    POSTING_INTERVAL: 30000, // 30 seconds between posts
    ENGAGEMENT_INTERVAL: 15000, // 15 seconds between likes/comments
    ACCOUNTS_TO_CREATE: 200, // Additional test accounts
    MAX_DAILY_POSTS_PER_USER: 5,
    MAX_DAILY_ENGAGEMENTS_PER_USER: 20,
    
    // Content variety settings
    POLITICAL_TOPICS_RATIO: 0.7, // 70% political, 30% general civic
    CONTROVERSIAL_RATIO: 0.3, // 30% of posts spark debate
    GEOGRAPHIC_DISTRIBUTION: true, // Spread across US states
    
    // Paths
    ACCOUNTS_FILE: path.join(__dirname, 'bot-accounts.json'),
    CONTENT_LIBRARY: path.join(__dirname, 'content-library.json'),
    BOT_STATE_FILE: path.join(__dirname, 'bot-state.json')
};

// US States for geographic distribution
const US_STATES = [
    'CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI',
    'AZ', 'WA', 'TN', 'MA', 'IN', 'MO', 'MD', 'WI', 'CO', 'MN',
    'SC', 'AL', 'LA', 'KY', 'OR', 'OK', 'CT', 'UT', 'IA', 'NV',
    'AR', 'MS', 'KS', 'NM', 'NE', 'ID', 'WV', 'HI', 'NH', 'ME',
    'MT', 'RI', 'DE', 'SD', 'ND', 'AK', 'VT', 'WY'
];

// Major US Cities for map testing
const US_CITIES = [
    { name: 'New York', state: 'NY', coords: [40.7128, -74.0060] },
    { name: 'Los Angeles', state: 'CA', coords: [34.0522, -118.2437] },
    { name: 'Chicago', state: 'IL', coords: [41.8781, -87.6298] },
    { name: 'Houston', state: 'TX', coords: [29.7604, -95.3698] },
    { name: 'Phoenix', state: 'AZ', coords: [33.4484, -112.0740] },
    { name: 'Philadelphia', state: 'PA', coords: [39.9526, -75.1652] },
    { name: 'San Antonio', state: 'TX', coords: [29.4241, -98.4936] },
    { name: 'San Diego', state: 'CA', coords: [32.7157, -117.1611] },
    { name: 'Dallas', state: 'TX', coords: [32.7767, -96.7970] },
    { name: 'San Jose', state: 'CA', coords: [37.3382, -121.8863] },
    { name: 'Austin', state: 'TX', coords: [30.2672, -97.7431] },
    { name: 'Jacksonville', state: 'FL', coords: [30.3322, -81.6557] },
    { name: 'Fort Worth', state: 'TX', coords: [32.7555, -97.3308] },
    { name: 'Columbus', state: 'OH', coords: [39.9612, -82.9988] },
    { name: 'Charlotte', state: 'NC', coords: [35.2271, -80.8431] },
    { name: 'San Francisco', state: 'CA', coords: [37.7749, -122.4194] },
    { name: 'Indianapolis', state: 'IN', coords: [39.7684, -86.1581] },
    { name: 'Seattle', state: 'WA', coords: [47.6062, -122.3321] },
    { name: 'Denver', state: 'CO', coords: [39.7392, -104.9903] },
    { name: 'Boston', state: 'MA', coords: [42.3601, -71.0589] }
];

// Content Library for realistic political discussions
const CONTENT_LIBRARY = {
    // National Political Topics
    nationalTopics: [
        {
            category: "Federal Elections",
            templates: [
                "The new campaign finance reform proposal could really change how elections work. What do you think about limiting corporate donations?",
                "Voting rights legislation is coming up again. We need to make sure everyone has access to the ballot.",
                "These gerrymandering lawsuits are getting ridiculous. Districts should be drawn fairly, not for political advantage.",
                "Term limits for Congress - yes or no? I think 12 years is plenty for anyone.",
                "The electoral college debate is heating up again. Should we move to a national popular vote?"
            ]
        },
        {
            category: "Healthcare Policy", 
            templates: [
                "Medicare expansion could help millions of seniors. The question is how to fund it sustainably.",
                "Prescription drug prices are out of control. We need real reform to bring costs down.",
                "Mental healthcare access is a crisis. Insurance companies need to stop denying coverage.",
                "The ACA has helped many people, but we can still improve it. What changes would you make?",
                "Rural hospitals are closing at an alarming rate. We need federal support to keep them open."
            ]
        },
        {
            category: "Economic Policy",
            templates: [
                "The federal minimum wage hasn't kept up with inflation. $15/hour should be the starting point.",
                "Small businesses are struggling with supply chain issues. What can government do to help?",
                "Student loan forgiveness is needed, but we also need to address the root causes of high tuition.",
                "Infrastructure spending creates jobs AND improves our economy. This should be bipartisan.",
                "The gig economy needs better worker protections. Independent contractors deserve benefits too."
            ]
        },
        {
            category: "Climate & Environment",
            templates: [
                "Clean energy jobs are the future. We need to invest in wind and solar manufacturing here at home.",
                "Climate change is affecting farmers across the country. Adaptation funding is critical.",
                "The Green New Deal has good ideas, but the implementation timeline might be too aggressive.",
                "Carbon pricing could work if we rebate the money back to working families.",
                "Environmental justice means not putting polluting industries in low-income neighborhoods."
            ]
        }
    ],

    // State/Local Topics
    localTopics: [
        {
            category: "Education",
            templates: [
                "Our school district needs more funding for teacher salaries. They deserve better pay.",
                "The new school board candidates seem promising. I hope they focus on student outcomes.",
                "School choice options are expanding, but we can't abandon public schools.",
                "Mental health support in schools is crucial after everything kids have been through.",
                "STEM education funding could really help our students compete globally."
            ]
        },
        {
            category: "Local Government",
            templates: [
                "City council meeting tonight - they're voting on the new housing development proposal.",
                "Our mayor's budget priorities seem backwards. More for police, less for social services?",
                "Public transportation needs investment. Too many people can't get to work reliably.",
                "The pothole situation is getting ridiculous. When will they fix these roads?",
                "Local businesses need support to recover. Small business grants should be expanded."
            ]
        },
        {
            category: "Housing & Development",
            templates: [
                "Affordable housing shortage is real. Zoning reform could help increase supply.",
                "Gentrification is pushing out longtime residents. We need protections for renters.",
                "The homeless encampment situation requires compassion AND practical solutions.",
                "New development should include green space requirements. Quality of life matters.",
                "First-time homebuyer programs could help young families stay in the community."
            ]
        }
    ],

    // Response templates for engagement
    responses: [
        "That's a great point about {topic}. I hadn't considered that angle.",
        "I respectfully disagree. Here's why: {reason}",
        "This is exactly what we need to be discussing in our community.",
        "The data on this issue shows {fact}. We should follow the evidence.",
        "My experience has been different, but I appreciate your perspective.",
        "This affects real people in our district. We need practical solutions.",
        "Both parties have good ideas on this. We should work together.",
        "I attended a town hall on this topic last week. The concerns are valid.",
        "Local implementation will be key to making this work.",
        "We need to think about the long-term consequences of this policy."
    ],

    // User personas for varied perspectives
    personas: [
        {
            type: "progressive_activist",
            locations: ["CA", "NY", "WA", "MA", "OR"],
            interests: ["climate", "social_justice", "workers_rights"],
            posting_style: "passionate, policy-focused"
        },
        {
            type: "conservative_citizen", 
            locations: ["TX", "FL", "GA", "SC", "TN"],
            interests: ["fiscal_responsibility", "traditional_values", "small_business"],
            posting_style: "practical, values-based"
        },
        {
            type: "moderate_parent",
            locations: ["OH", "PA", "MI", "WI", "NC"],
            interests: ["education", "healthcare", "family_policy"],
            posting_style: "pragmatic, family-centered"
        },
        {
            type: "young_professional",
            locations: ["CO", "AZ", "NV", "VA", "NC"],
            interests: ["housing", "student_loans", "career_development"],
            posting_style: "data-driven, future-focused"
        },
        {
            type: "senior_citizen",
            locations: ["FL", "AZ", "NV", "DE", "SC"],
            interests: ["medicare", "social_security", "healthcare"],
            posting_style: "experienced, concerned"
        },
        {
            type: "rural_advocate",
            locations: ["IA", "KS", "NE", "MT", "WY"],
            interests: ["agriculture", "rural_development", "infrastructure"],
            posting_style: "community-focused, practical"
        }
    ]
};

// Bot state management
class BotState {
    constructor() {
        this.accounts = [];
        this.posting = false;
        this.statistics = {
            postsCreated: 0,
            engagements: 0,
            accountsCreated: 0,
            startTime: null,
            lastPost: null
        };
        this.loadState();
    }

    loadState() {
        try {
            if (fs.existsSync(CONFIG.BOT_STATE_FILE)) {
                const data = JSON.parse(fs.readFileSync(CONFIG.BOT_STATE_FILE, 'utf8'));
                Object.assign(this, data);
            }
        } catch (error) {
            console.log('Creating new bot state file');
        }
    }

    saveState() {
        try {
            fs.writeFileSync(CONFIG.BOT_STATE_FILE, JSON.stringify(this, null, 2));
        } catch (error) {
            console.error('Failed to save bot state:', error);
        }
    }

    addAccount(account) {
        this.accounts.push(account);
        this.statistics.accountsCreated++;
        this.saveState();
    }
}

// API Helper class
class APIHelper {
    constructor() {
        this.axios = axios.create({
            baseURL: CONFIG.API_BASE,
            timeout: 10000
        });
    }

    async createAccount(userData) {
        try {
            const response = await this.axios.post('/auth/register', userData);
            return { success: true, data: response.data };
        } catch (error) {
            console.log('Registration API error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            return { 
                success: false, 
                error: error.response?.data?.message || error.message || 'Network error'
            };
        }
    }

    async login(email, password) {
        try {
            const response = await this.axios.post('/auth/login', { email, password });
            return { success: true, data: response.data };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.message || error.message 
            };
        }
    }

    async createPost(content, token, isPolitical = true) {
        try {
            const response = await this.axios.post('/posts', 
                { content, isPolitical },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return { success: true, data: response.data };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.message || error.message 
            };
        }
    }

    async likePost(postId, token) {
        try {
            const response = await this.axios.post(`/posts/${postId}/like`, {}, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return { success: true, data: response.data };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.message || error.message 
            };
        }
    }

    async getTrendingPosts() {
        try {
            const response = await this.axios.get('/feed/trending');
            return { success: true, data: response.data };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.message || error.message 
            };
        }
    }
}

// Content Generator class
class ContentGenerator {
    constructor() {
        this.usedContent = new Set();
    }

    generateUserData() {
        const persona = this.getRandomPersona();
        const city = this.getRandomCity(persona.locations);
        const firstName = this.generateFirstName();
        const lastName = this.generateLastName();
        const username = this.generateUsername(firstName, lastName);

        return {
            email: `${username}@testuser.com`,
            password: 'TestPassword123!',
            username: username,
            firstName: firstName,
            lastName: lastName,
            streetAddress: this.generateAddress(),
            city: city.name,
            state: city.state,
            zipCode: this.generateZipCode(),
            persona: persona
        };
    }

    generateContent(persona, isControversial = false) {
        const library = CONTENT_LIBRARY;
        const topics = Math.random() < CONFIG.POLITICAL_TOPICS_RATIO 
            ? library.nationalTopics 
            : library.localTopics;

        const topic = topics[Math.floor(Math.random() * topics.length)];
        const template = topic.templates[Math.floor(Math.random() * topic.templates.length)];

        // Add some variation to make content unique
        let content = this.addPersonalization(template, persona);
        
        // Avoid duplicate content
        if (this.usedContent.has(content)) {
            content = this.addVariation(content);
        }
        
        this.usedContent.add(content);

        return {
            content: content,
            category: topic.category,
            isPolitical: topics === library.nationalTopics
        };
    }

    generateResponse(originalContent) {
        const responses = CONTENT_LIBRARY.responses;
        const template = responses[Math.floor(Math.random() * responses.length)];
        
        return template
            .replace('{topic}', this.extractTopic(originalContent))
            .replace('{reason}', this.generateReason())
            .replace('{fact}', this.generateFact());
    }

    // Helper methods
    getRandomPersona() {
        return CONTENT_LIBRARY.personas[Math.floor(Math.random() * CONTENT_LIBRARY.personas.length)];
    }

    getRandomCity(preferredStates) {
        const cities = US_CITIES.filter(city => preferredStates.includes(city.state));
        return cities.length > 0 
            ? cities[Math.floor(Math.random() * cities.length)]
            : US_CITIES[Math.floor(Math.random() * US_CITIES.length)];
    }

    generateFirstName() {
        const names = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Jamie', 'Riley', 'Avery', 'Quinn', 'Sage'];
        return names[Math.floor(Math.random() * names.length)];
    }

    generateLastName() {
        const names = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas'];
        return names[Math.floor(Math.random() * names.length)];
    }

    generateUsername(firstName, lastName) {
        const variations = [
            `${firstName}${lastName}`,
            `${firstName}${lastName}${Math.floor(Math.random() * 100)}`,
            `${firstName.charAt(0)}${lastName}`,
            `${firstName}_${lastName}`,
            `${firstName.toLowerCase()}${lastName.toLowerCase()}`
        ];
        return variations[Math.floor(Math.random() * variations.length)];
    }

    generateAddress() {
        const streetNumbers = Math.floor(Math.random() * 9999) + 1;
        const streetNames = ['Main St', 'Oak Ave', 'Pine Dr', 'Elm Way', 'Cedar Ln', 'Park Blvd'];
        return `${streetNumbers} ${streetNames[Math.floor(Math.random() * streetNames.length)]}`;
    }

    generateZipCode() {
        return String(Math.floor(Math.random() * 90000) + 10000);
    }

    addPersonalization(template, persona) {
        // Add personal touches based on persona type
        if (persona.type === 'progressive_activist') {
            return template + " We need bold action on this.";
        } else if (persona.type === 'conservative_citizen') {
            return template + " Common sense solutions work best.";
        } else if (persona.type === 'moderate_parent') {
            return template + " As a parent, this really concerns me.";
        }
        return template;
    }

    addVariation(content) {
        const variations = [
            content + " What are your thoughts?",
            content + " I'd love to hear other perspectives.",
            content + " This is important for our community.",
            "Just thinking: " + content,
            content + " Anyone else concerned about this?"
        ];
        return variations[Math.floor(Math.random() * variations.length)];
    }

    extractTopic(content) {
        const words = content.split(' ');
        return words.slice(0, 3).join(' ');
    }

    generateReason() {
        const reasons = [
            "the economic impact hasn't been fully considered",
            "this could have unintended consequences", 
            "we need to look at successful examples from other states",
            "the timeline seems too rushed",
            "funding mechanisms aren't clear"
        ];
        return reasons[Math.floor(Math.random() * reasons.length)];
    }

    generateFact() {
        const facts = [
            "similar policies in other states have shown positive results",
            "recent studies indicate this approach is effective",
            "budget analysis shows this is financially viable",
            "polls show strong public support for this initiative",
            "expert consensus supports this direction"
        ];
        return facts[Math.floor(Math.random() * facts.length)];
    }
}

// Main Bot Controller
class ContentBot {
    constructor() {
        this.state = new BotState();
        this.api = new APIHelper();
        this.generator = new ContentGenerator();
        this.postingInterval = null;
        this.engagementInterval = null;
    }

    async createAccounts(count = CONFIG.ACCOUNTS_TO_CREATE) {
        console.log(`🤖 Creating ${count} test accounts...`);
        
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < count; i++) {
            const userData = this.generator.generateUserData();
            const result = await this.api.createAccount(userData);
            
            if (result.success) {
                // Login to get token
                const loginResult = await this.api.login(userData.email, userData.password);
                if (loginResult.success) {
                    userData.token = loginResult.data.token;
                    userData.userId = loginResult.data.user.id;
                    this.state.addAccount(userData);
                    successCount++;
                    
                    if (successCount % 10 === 0) {
                        console.log(`Created ${successCount} accounts so far...`);
                    }
                } else {
                    console.error(`Failed to login ${userData.username}:`, loginResult.error);
                    errorCount++;
                }
            } else {
                console.error(`Failed to create account ${userData.username}:`, result.error || 'Unknown error');
                errorCount++;
            }

            // Small delay to avoid overwhelming the server
            await this.sleep(100);
        }

        console.log(`✅ Account creation complete: ${successCount} success, ${errorCount} errors`);
        return { successCount, errorCount };
    }

    async startPosting() {
        if (this.state.posting) {
            console.log('Bot is already posting');
            return;
        }

        if (this.state.accounts.length === 0) {
            console.log('No accounts available. Create accounts first.');
            return;
        }

        console.log(`🚀 Starting content bot with ${this.state.accounts.length} accounts`);
        this.state.posting = true;
        this.state.statistics.startTime = new Date();
        this.state.saveState();

        // Start posting interval
        this.postingInterval = setInterval(() => {
            this.createRandomPost();
        }, CONFIG.POSTING_INTERVAL);

        // Start engagement interval
        this.engagementInterval = setInterval(() => {
            this.createRandomEngagement();
        }, CONFIG.ENGAGEMENT_INTERVAL);

        console.log('✅ Bot started successfully');
    }

    async stopPosting() {
        console.log('🛑 Stopping content bot...');
        
        this.state.posting = false;
        
        if (this.postingInterval) {
            clearInterval(this.postingInterval);
            this.postingInterval = null;
        }
        
        if (this.engagementInterval) {
            clearInterval(this.engagementInterval);
            this.engagementInterval = null;
        }

        this.state.saveState();
        console.log('✅ Bot stopped successfully');
    }

    async createRandomPost() {
        try {
            const account = this.getRandomAccount();
            if (!account) return;

            const isControversial = Math.random() < CONFIG.CONTROVERSIAL_RATIO;
            const contentData = this.generator.generateContent(account.persona, isControversial);
            
            const result = await this.api.createPost(
                contentData.content, 
                account.token, 
                contentData.isPolitical
            );

            if (result.success) {
                this.state.statistics.postsCreated++;
                this.state.statistics.lastPost = new Date();
                console.log(`📝 ${account.username}: ${contentData.content.substring(0, 50)}...`);
            } else {
                console.error(`Failed to create post for ${account.username}:`, result.error);
            }
        } catch (error) {
            console.error('Error creating random post:', error);
        }
    }

    async createRandomEngagement() {
        try {
            // Get trending posts to engage with
            const trending = await this.api.getTrendingPosts();
            if (!trending.success || !trending.data.posts || trending.data.posts.length === 0) {
                return;
            }

            const account = this.getRandomAccount();
            const post = trending.data.posts[Math.floor(Math.random() * trending.data.posts.length)];
            
            // Don't engage with own posts
            if (post.authorId === account?.userId) return;

            const result = await this.api.likePost(post.id, account.token);
            if (result.success) {
                this.state.statistics.engagements++;
                console.log(`❤️ ${account.username} liked: ${post.content.substring(0, 30)}...`);
            }
        } catch (error) {
            console.error('Error creating engagement:', error);
        }
    }

    getRandomAccount() {
        if (this.state.accounts.length === 0) return null;
        return this.state.accounts[Math.floor(Math.random() * this.state.accounts.length)];
    }

    showStatus() {
        console.log('\n📊 Bot Status:');
        console.log('================');
        console.log(`Accounts created: ${this.state.accounts.length}`);
        console.log(`Currently posting: ${this.state.posting ? 'Yes' : 'No'}`);
        console.log(`Posts created: ${this.state.statistics.postsCreated}`);
        console.log(`Engagements: ${this.state.statistics.engagements}`);
        
        if (this.state.statistics.startTime) {
            const runtime = Date.now() - new Date(this.state.statistics.startTime);
            console.log(`Runtime: ${Math.floor(runtime / 1000 / 60)} minutes`);
        }
        
        if (this.state.statistics.lastPost) {
            console.log(`Last post: ${new Date(this.state.statistics.lastPost).toLocaleTimeString()}`);
        }
        console.log('================\n');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI Interface
async function main() {
    const command = process.argv[2];
    const bot = new ContentBot();

    switch (command) {
        case 'create-accounts':
            const count = parseInt(process.argv[3]) || CONFIG.ACCOUNTS_TO_CREATE;
            await bot.createAccounts(count);
            break;

        case 'start-posting':
            await bot.startPosting();
            // Keep the process running
            process.on('SIGINT', async () => {
                await bot.stopPosting();
                process.exit(0);
            });
            break;

        case 'stop-posting':
            await bot.stopPosting();
            break;

        case 'status':
            bot.showStatus();
            break;

        default:
            console.log(`
🤖 UnitedWeRise Content Bot

Usage: node content-bot.js [command]

Commands:
  create-accounts [count]  Create test accounts (default: ${CONFIG.ACCOUNTS_TO_CREATE})
  start-posting           Start automated content generation
  stop-posting            Stop content generation
  status                  Show current bot status

Examples:
  node content-bot.js create-accounts 100
  node content-bot.js start-posting
  node content-bot.js status
            `);
            break;
    }
}

// Export for programmatic use
module.exports = {
    ContentBot,
    ContentGenerator,
    APIHelper,
    CONFIG
};

// Run CLI if this is the main module
if (require.main === module) {
    main().catch(console.error);
}