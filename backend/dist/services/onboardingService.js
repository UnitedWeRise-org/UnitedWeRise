"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingService = exports.OnboardingService = void 0;
const client_1 = require("@prisma/client");
const metricsService_1 = require("./metricsService");
const prisma = new client_1.PrismaClient();
// Political terms to subtly filter from search (without showing errors)
const FILTERED_POLITICAL_TERMS = [
    'republican', 'democrat', 'democratic', 'gop', 'liberal', 'conservative',
    'left-wing', 'right-wing', 'leftist', 'rightist', 'progressive', 'maga',
    'biden', 'trump', 'harris', 'desantis', 'newsom', 'sanders', 'warren',
    'party', 'parties', 'affiliation', 'partisan', 'bipartisan',
    'red state', 'blue state', 'swing state', 'purple state'
].map(term => term.toLowerCase());
class OnboardingService {
    async createOnboardingProfile(userId) {
        const profile = {
            userId,
            currentStep: 0,
            completedSteps: [],
            profileData: {}
        };
        // Store in database
        await prisma.user.update({
            where: { id: userId },
            data: {
                onboardingData: profile,
                onboardingCompleted: false
            }
        });
        return profile;
    }
    async getOnboardingSteps(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                onboardingData: true,
                emailVerified: true,
                phoneVerified: true,
                zipCode: true,
                bio: true,
                avatar: true
            }
        });
        const profile = user?.onboardingData || await this.createOnboardingProfile(userId);
        const steps = [
            {
                id: 'welcome',
                title: 'Welcome to United We Rise',
                description: 'Learn how our platform helps you engage with your representatives and community',
                required: true,
                completed: profile.completedSteps.includes('welcome')
            },
            {
                id: 'verification',
                title: 'Verify Your Account',
                description: 'Confirm your email and phone number for account security',
                required: true,
                completed: user?.emailVerified && user?.phoneVerified || false,
                data: {
                    emailVerified: user?.emailVerified || false,
                    phoneVerified: user?.phoneVerified || false
                }
            },
            {
                id: 'location',
                title: 'Find Your Representatives',
                description: 'Add your location to connect with your local and federal representatives',
                required: true,
                completed: profile.completedSteps.includes('location') || !!user?.zipCode,
                data: profile.profileData.location
            },
            {
                id: 'interests',
                title: 'Choose Your Interests',
                description: 'Select the issues and topics you care about most',
                required: false,
                completed: profile.completedSteps.includes('interests'),
                data: profile.profileData.interests || []
            },
            {
                id: 'experience',
                title: 'Your Political Engagement',
                description: 'Help us tailor your experience based on your engagement level',
                required: false,
                completed: profile.completedSteps.includes('experience'),
                data: profile.profileData.experienceLevel
            },
            {
                id: 'notifications',
                title: 'Communication Preferences',
                description: 'Choose how you\'d like to stay informed and engaged',
                required: false,
                completed: profile.completedSteps.includes('notifications'),
                data: profile.profileData.communicationPreferences
            },
            {
                id: 'profile',
                title: 'Complete Your Profile',
                description: 'Add a photo and bio to help others connect with you',
                required: false,
                completed: profile.completedSteps.includes('profile') || (!!user?.bio && !!user?.avatar),
                data: profile.profileData.profileSetup
            }
        ];
        return steps;
    }
    async completeStep(userId, stepId, stepData) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { onboardingData: true }
        });
        let profile = user?.onboardingData || await this.createOnboardingProfile(userId);
        // Add step to completed steps
        if (!profile.completedSteps.includes(stepId)) {
            profile.completedSteps.push(stepId);
        }
        // Store step data
        if (stepData) {
            profile.profileData = {
                ...profile.profileData,
                [stepId]: stepData
            };
            // Update user record for certain steps
            await this.updateUserFromStepData(userId, stepId, stepData);
        }
        // Calculate progress
        const steps = await this.getOnboardingSteps(userId);
        const requiredSteps = steps.filter(s => s.required);
        const completedRequired = requiredSteps.filter(s => s.completed).length;
        const isComplete = completedRequired === requiredSteps.length;
        if (isComplete && !profile.completedAt) {
            profile.completedAt = new Date();
            metricsService_1.metricsService.incrementCounter('onboarding_completed_total');
        }
        // Update database
        await prisma.user.update({
            where: { id: userId },
            data: {
                onboardingData: profile,
                onboardingCompleted: isComplete
            }
        });
        return profile;
    }
    async updateUserFromStepData(userId, stepId, stepData) {
        const updateData = {};
        switch (stepId) {
            case 'location':
                if (stepData.zipCode) {
                    updateData.zipCode = stepData.zipCode;
                    updateData.city = stepData.city;
                    updateData.state = stepData.state;
                }
                break;
            case 'interests':
                updateData.interests = stepData;
                break;
            case 'experience':
                updateData.politicalExperience = stepData;
                break;
            case 'notifications':
                updateData.notificationPreferences = stepData;
                break;
            case 'profile':
                if (stepData.bio)
                    updateData.bio = stepData.bio;
                if (stepData.avatar)
                    updateData.avatar = stepData.avatar;
                if (stepData.displayName)
                    updateData.displayName = stepData.displayName;
                break;
        }
        if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: updateData
            });
        }
    }
    async getOnboardingProgress(userId) {
        const steps = await this.getOnboardingSteps(userId);
        const completedSteps = steps.filter(s => s.completed);
        const requiredSteps = steps.filter(s => s.required);
        const completedRequired = requiredSteps.filter(s => s.completed);
        const nextIncompleteStep = steps.find(s => !s.completed);
        return {
            currentStep: completedSteps.length,
            totalSteps: steps.length,
            completedSteps: completedSteps.length,
            requiredCompleted: completedRequired.length,
            requiredTotal: requiredSteps.length,
            isComplete: completedRequired.length === requiredSteps.length,
            nextStep: nextIncompleteStep
        };
    }
    async skipStep(userId, stepId) {
        // Only allow skipping non-required steps
        const steps = await this.getOnboardingSteps(userId);
        const step = steps.find(s => s.id === stepId);
        if (!step || step.required) {
            throw new Error('Cannot skip required step');
        }
        return await this.completeStep(userId, stepId, { skipped: true });
    }
    // Search filtering methods
    filterSearchTerms(searchQuery) {
        if (!searchQuery)
            return searchQuery;
        const words = searchQuery.toLowerCase().split(/\s+/);
        const filteredWords = words.filter(word => {
            // Remove any word that matches our filtered political terms
            return !FILTERED_POLITICAL_TERMS.some(term => word.includes(term) || term.includes(word));
        });
        // If all words were filtered out, return a neutral search
        if (filteredWords.length === 0) {
            return 'community discussion';
        }
        return filteredWords.join(' ');
    }
    isFilteredSearchTerm(query) {
        if (!query)
            return false;
        const lowerQuery = query.toLowerCase();
        return FILTERED_POLITICAL_TERMS.some(term => lowerQuery.includes(term) || term.includes(lowerQuery));
    }
    // Get popular issues for interest selection (non-partisan framing)
    getPopularIssues() {
        return [
            'Healthcare',
            'Education',
            'Economy & Jobs',
            'Environment & Climate',
            'Infrastructure',
            'Social Security',
            'Immigration',
            'Criminal Justice',
            'Technology & Privacy',
            'Veterans Affairs',
            'Housing',
            'Transportation',
            'Energy',
            'Agriculture',
            'Small Business',
            'International Relations',
            'Civil Rights',
            'Public Safety',
            'Taxes & Budget',
            'Government Reform'
        ];
    }
    // Track onboarding analytics
    async trackOnboardingEvent(userId, event, stepId, metadata) {
        metricsService_1.metricsService.incrementCounter('onboarding_events_total', {
            event,
            step: stepId || 'unknown'
        });
        // Log detailed analytics
        console.log(`[ONBOARDING] User ${userId}: ${event}`, {
            stepId,
            metadata,
            timestamp: new Date().toISOString()
        });
    }
    async getOnboardingAnalytics() {
        // This would typically query analytics data
        // For now, return calculated metrics from user data
        const users = await prisma.user.findMany({
            where: {
                onboardingData: {
                    not: null
                }
            },
            select: {
                onboardingData: true,
                onboardingCompleted: true
            }
        });
        const totalStarted = users.length;
        const totalCompleted = users.filter(u => u.onboardingCompleted).length;
        const completionRate = totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0;
        return {
            totalStarted,
            totalCompleted,
            completionRate,
            averageStepsCompleted: 0, // Would calculate from actual data
            dropoffByStep: {} // Would calculate step-by-step dropoff rates
        };
    }
}
exports.OnboardingService = OnboardingService;
exports.onboardingService = new OnboardingService();
//# sourceMappingURL=onboardingService.js.map