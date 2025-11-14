import { prisma } from '../lib/prisma';
import { metricsService } from './metricsService';
import { logger } from './logger';

// Using singleton prisma from lib/prisma.ts
// Migration: Phase 3-4 Pino structured logging (2025-11-13)

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

// Political terms to subtly filter from search (without showing errors)
const FILTERED_POLITICAL_TERMS = [
  'republican', 'democrat', 'democratic', 'gop', 'liberal', 'conservative',
  'left-wing', 'right-wing', 'leftist', 'rightist', 'progressive', 'maga',
  'biden', 'trump', 'harris', 'desantis', 'newsom', 'sanders', 'warren',
  'party', 'parties', 'affiliation', 'partisan', 'bipartisan',
  'red state', 'blue state', 'swing state', 'purple state'
].map(term => term.toLowerCase());

export class OnboardingService {
  
  async createOnboardingProfile(userId: string): Promise<OnboardingProfile> {
    const profile: OnboardingProfile = {
      userId,
      currentStep: 0,
      completedSteps: [],
      profileData: {}
    };

    // Store in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingData: profile as any,
        onboardingCompleted: false
      }
    });

    return profile;
  }

  async getOnboardingSteps(userId: string): Promise<OnboardingStep[]> {
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

    const profile = (user?.onboardingData as any as OnboardingProfile) || await this.createOnboardingProfile(userId);

    const steps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: 'Welcome to United We Rise',
        description: 'Learn how our platform helps you engage with your representatives and community',
        required: true,
        completed: profile.completedSteps.includes('welcome')
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
      }
    ];

    return steps;
  }

  async completeStep(userId: string, stepId: string, stepData?: any): Promise<OnboardingProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingData: true }
    });

    let profile = (user?.onboardingData as any as OnboardingProfile) || await this.createOnboardingProfile(userId);
    
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
      metricsService.incrementCounter('onboarding_completed_total');
    }

    // Update database
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingData: profile as any,
        onboardingCompleted: isComplete
      }
    });

    return profile;
  }

  private async updateUserFromStepData(userId: string, stepId: string, stepData: any) {
    const updateData: any = {};

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
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    }
  }

  async getOnboardingProgress(userId: string): Promise<{
    currentStep: number;
    totalSteps: number;
    completedSteps: number;
    requiredCompleted: number;
    requiredTotal: number;
    isComplete: boolean;
    nextStep?: OnboardingStep;
  }> {
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

  async skipStep(userId: string, stepId: string): Promise<OnboardingProfile> {
    // Only allow skipping non-required steps
    const steps = await this.getOnboardingSteps(userId);
    const step = steps.find(s => s.id === stepId);
    
    if (!step || step.required) {
      throw new Error('Cannot skip required step');
    }

    return await this.completeStep(userId, stepId, { skipped: true });
  }

  // Search filtering methods
  filterSearchTerms(searchQuery: string): string {
    if (!searchQuery) return searchQuery;

    const words = searchQuery.toLowerCase().split(/\s+/);
    const filteredWords = words.filter(word => {
      // Remove any word that matches our filtered political terms
      return !FILTERED_POLITICAL_TERMS.some(term => 
        word.includes(term) || term.includes(word)
      );
    });

    // If all words were filtered out, return a neutral search
    if (filteredWords.length === 0) {
      return 'community discussion';
    }

    return filteredWords.join(' ');
  }

  isFilteredSearchTerm(query: string): boolean {
    if (!query) return false;
    
    const lowerQuery = query.toLowerCase();
    return FILTERED_POLITICAL_TERMS.some(term => 
      lowerQuery.includes(term) || term.includes(lowerQuery)
    );
  }

  // Get popular issues for interest selection (non-partisan framing)
  getPopularIssues(): string[] {
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
  async trackOnboardingEvent(userId: string, event: string, stepId?: string, metadata?: any) {
    metricsService.incrementCounter('onboarding_events_total', {
      event,
      step: stepId || 'unknown'
    });

    // Log detailed analytics using Pino
    logger.info({
      component: 'onboarding',
      userId,
      event,
      stepId,
      metadata
    }, `Onboarding event: ${event}`);
  }

  async getOnboardingAnalytics(): Promise<{
    totalStarted: number;
    totalCompleted: number;
    completionRate: number;
    averageStepsCompleted: number;
    dropoffByStep: Record<string, number>;
  }> {
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

export const onboardingService = new OnboardingService();