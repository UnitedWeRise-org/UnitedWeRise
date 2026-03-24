interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    required: boolean;
    completed: boolean;
    data?: any;
}
interface OnboardingProfile {
    userId: string;
    currentStep: number;
    completedSteps: string[];
    profileData: {
        location?: {
            zipCode: string;
            city: string;
            state: string;
            district?: string;
        };
        interests?: string[];
        experienceLevel?: 'new' | 'casual' | 'engaged' | 'activist';
        communicationPreferences?: {
            email: boolean;
            sms: boolean;
            pushNotifications: boolean;
            weeklyDigest: boolean;
        };
        profileSetup?: {
            bio?: string;
            avatar?: string;
            displayName?: string;
        };
    };
    completedAt?: Date;
}
export declare class OnboardingService {
    createOnboardingProfile(userId: string): Promise<OnboardingProfile>;
    getOnboardingSteps(userId: string): Promise<OnboardingStep[]>;
    completeStep(userId: string, stepId: string, stepData?: any): Promise<OnboardingProfile>;
    /**
     * Persist step-specific data to the User record.
     * Location step: US path saves ZIP/city/state, international path saves city + country (clears ZIP/state).
     * Interests step: generates interest embedding for feed personalization.
     * @param userId - The user's ID
     * @param stepId - Onboarding step identifier ('location', 'interests', etc.)
     * @param stepData - Step-specific payload from the frontend
     */
    private updateUserFromStepData;
    getOnboardingProgress(userId: string): Promise<{
        currentStep: number;
        totalSteps: number;
        completedSteps: number;
        requiredCompleted: number;
        requiredTotal: number;
        isComplete: boolean;
        nextStep?: OnboardingStep;
    }>;
    skipStep(userId: string, stepId: string): Promise<OnboardingProfile>;
    filterSearchTerms(searchQuery: string): string;
    isFilteredSearchTerm(query: string): boolean;
    /**
     * Get categorized interests for onboarding selection.
     * Returns interests grouped by category for UI rendering.
     * Includes civic/policy topics alongside general-purpose categories
     * to reflect the platform's broad social media scope.
     *
     * @returns Array of { category, interests } objects
     */
    getCategorizedInterests(): {
        category: string;
        interests: string[];
    }[];
    /**
     * Get flat list of all available interests (for backwards compatibility).
     * @returns Array of interest strings
     */
    getPopularIssues(): string[];
    trackOnboardingEvent(userId: string, event: string, stepId?: string, metadata?: any): Promise<void>;
    getOnboardingAnalytics(): Promise<{
        totalStarted: number;
        totalCompleted: number;
        completionRate: number;
        averageStepsCompleted: number;
        dropoffByStep: Record<string, number>;
    }>;
}
export declare const onboardingService: OnboardingService;
export {};
//# sourceMappingURL=onboardingService.d.ts.map