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