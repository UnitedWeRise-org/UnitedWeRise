import { PrismaClient, Quest, UserQuestProgress, UserQuestStreak, QuestType, QuestCategory, QuestTimeframe, Prisma } from '@prisma/client';
import badgeService from './badge.service';

const prisma = new PrismaClient();

interface QuestRequirement {
  type: 'LOGIN' | 'READ_POSTS' | 'CIVIC_ACTION' | 'SOCIAL_INTERACTION' | 'COMPLETE_QUESTS';
  target: number;
  timeframe: 'daily' | 'weekly' | 'monthly';
  metadata?: {
    categories?: string[];
    minDuration?: number;
    actionType?: string;
    questTypes?: string[];
  };
}

interface QuestReward {
  reputationPoints?: number;
  badges?: string[];
  specialRecognition?: string;
  experiencePoints?: number;
}

interface QuestCreateInput {
  type: QuestType;
  category: QuestCategory;
  title: string;
  description: string;
  shortDescription?: string;
  requirements: QuestRequirement;
  rewards: QuestReward;
  timeframe: QuestTimeframe;
  displayOrder?: number;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
  createdBy?: string;
}

class QuestService {
  // Generate daily quests for a user
  async generateDailyQuests(userId: string): Promise<Quest[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        interests: true,
        politicalExperience: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    if (!user) throw new Error('User not found');

    // Check if user already has daily quests for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingDailyQuests = await prisma.userQuestProgress.findMany({
      where: {
        userId,
        startedAt: {
          gte: today,
          lt: tomorrow
        },
        quest: {
          timeframe: 'DAILY'
        }
      }
    });

    if (existingDailyQuests.length > 0) {
      // Return existing daily quests
      return await prisma.quest.findMany({
        where: {
          id: { in: existingDailyQuests.map(q => q.questId) }
        }
      });
    }

    // Generate new daily quests based on user profile
    const quests: Quest[] = [];

    // Always include one daily habit quest
    const habitQuest = await this.getOrCreateDailyHabitQuest();
    if (habitQuest) {
      quests.push(habitQuest);
      await this.assignQuestToUser(userId, habitQuest.id);
    }

    // Include one civic action quest
    const civicQuest = await this.getOrCreateDailyCivicQuest(user.interests);
    if (civicQuest) {
      quests.push(civicQuest);
      await this.assignQuestToUser(userId, civicQuest.id);
    }

    // Include one social engagement quest for new users
    const userAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (userAge < 30) {
      const socialQuest = await this.getOrCreateSocialQuest();
      if (socialQuest) {
        quests.push(socialQuest);
        await this.assignQuestToUser(userId, socialQuest.id);
      }
    }

    return quests;
  }

  private async getOrCreateDailyHabitQuest(): Promise<Quest | null> {
    let quest = await prisma.quest.findFirst({
      where: {
        type: 'DAILY_HABIT',
        timeframe: 'DAILY',
        isActive: true,
        title: 'Daily Check-In'
      }
    });

    if (!quest) {
      quest = await prisma.quest.create({
        data: {
          type: 'DAILY_HABIT',
          category: 'INFORMATION',
          title: 'Daily Check-In',
          description: 'Start your day by checking in with your community. Read at least 3 posts from your feed to stay informed.',
          shortDescription: 'Read 3 posts from your feed',
          requirements: {
            type: 'READ_POSTS',
            target: 3,
            timeframe: 'daily'
          } as Prisma.InputJsonValue,
          rewards: {
            reputationPoints: 2,
            experiencePoints: 10
          } as Prisma.InputJsonValue,
          timeframe: 'DAILY',
          displayOrder: 1
        }
      });
    }

    return quest;
  }

  private async getOrCreateDailyCivicQuest(userInterests: string[]): Promise<Quest | null> {
    const civicActions = [
      {
        title: 'Voice Your Opinion',
        description: 'Share your thoughts on a local issue or policy. Create a post about something happening in your community.',
        shortDescription: 'Create a civic-minded post',
        actionType: 'POST_CREATED'
      },
      {
        title: 'Support a Cause',
        description: 'Find and sign a petition that aligns with your values. Every signature counts!',
        shortDescription: 'Sign a petition',
        actionType: 'PETITION_SIGNED'
      },
      {
        title: 'Engage in Discussion',
        description: 'Join the conversation on important issues. Comment on at least 2 civic posts.',
        shortDescription: 'Comment on 2 civic posts',
        actionType: 'COMMENT_CREATED'
      }
    ];

    const randomAction = civicActions[Math.floor(Math.random() * civicActions.length)];

    let quest = await prisma.quest.findFirst({
      where: {
        type: 'DAILY_CIVIC',
        title: randomAction.title,
        timeframe: 'DAILY',
        isActive: true
      }
    });

    if (!quest) {
      quest = await prisma.quest.create({
        data: {
          type: 'DAILY_CIVIC',
          category: 'PARTICIPATION',
          title: randomAction.title,
          description: randomAction.description,
          shortDescription: randomAction.shortDescription,
          requirements: {
            type: 'CIVIC_ACTION',
            target: randomAction.actionType === 'COMMENT_CREATED' ? 2 : 1,
            timeframe: 'daily',
            metadata: {
              actionType: randomAction.actionType
            }
          } as Prisma.InputJsonValue,
          rewards: {
            reputationPoints: 3,
            experiencePoints: 20
          } as Prisma.InputJsonValue,
          timeframe: 'DAILY',
          displayOrder: 2
        }
      });
    }

    return quest;
  }

  private async getOrCreateSocialQuest(): Promise<Quest | null> {
    let quest = await prisma.quest.findFirst({
      where: {
        type: 'SOCIAL_ENGAGEMENT',
        timeframe: 'DAILY',
        isActive: true,
        title: 'Build Your Network'
      }
    });

    if (!quest) {
      quest = await prisma.quest.create({
        data: {
          type: 'SOCIAL_ENGAGEMENT',
          category: 'COMMUNITY',
          title: 'Build Your Network',
          description: 'Connect with like-minded citizens. Follow or friend request at least 1 new person today.',
          shortDescription: 'Connect with 1 new person',
          requirements: {
            type: 'SOCIAL_INTERACTION',
            target: 1,
            timeframe: 'daily'
          } as Prisma.InputJsonValue,
          rewards: {
            reputationPoints: 1,
            experiencePoints: 15
          } as Prisma.InputJsonValue,
          timeframe: 'DAILY',
          displayOrder: 3
        }
      });
    }

    return quest;
  }

  // Assign quest to user
  private async assignQuestToUser(userId: string, questId: string): Promise<UserQuestProgress> {
    return await prisma.userQuestProgress.create({
      data: {
        userId,
        questId,
        progress: { completed: 0, target: 0 } as Prisma.InputJsonValue
      }
    });
  }

  // Update quest progress
  async updateQuestProgress(userId: string, actionType: string, metadata?: any): Promise<void> {
    // Get user's active quests
    const activeQuests = await prisma.userQuestProgress.findMany({
      where: {
        userId,
        completed: false
      },
      include: {
        quest: true
      }
    });

    for (const questProgress of activeQuests) {
      const requirements = questProgress.quest.requirements as unknown as QuestRequirement;
      let shouldUpdate = false;
      let progressIncrement = 0;

      // Check if this action contributes to the quest
      switch (requirements.type) {
        case 'LOGIN':
          if (actionType === 'USER_LOGIN') {
            shouldUpdate = true;
            progressIncrement = 1;
          }
          break;

        case 'READ_POSTS':
          if (actionType === 'POST_VIEWED') {
            shouldUpdate = true;
            progressIncrement = 1;
          }
          break;

        case 'CIVIC_ACTION':
          if (requirements.metadata?.actionType === actionType) {
            shouldUpdate = true;
            progressIncrement = 1;
          }
          break;

        case 'SOCIAL_INTERACTION':
          if (['FOLLOW_ADDED', 'FRIEND_REQUEST_SENT'].includes(actionType)) {
            shouldUpdate = true;
            progressIncrement = 1;
          }
          break;
      }

      if (shouldUpdate) {
        const currentProgress = questProgress.progress as any;
        const newProgress = {
          ...currentProgress,
          completed: (currentProgress.completed || 0) + progressIncrement,
          target: requirements.target
        };

        const isCompleted = newProgress.completed >= requirements.target;

        await prisma.userQuestProgress.update({
          where: { id: questProgress.id },
          data: {
            progress: newProgress as Prisma.InputJsonValue,
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null
          }
        });

        if (isCompleted) {
          await this.handleQuestCompletion(userId, questProgress.questId);
        }
      }
    }
  }

  // Handle quest completion
  private async handleQuestCompletion(userId: string, questId: string): Promise<void> {
    const quest = await prisma.quest.findUnique({
      where: { id: questId }
    });

    if (!quest) return;

    const rewards = quest.rewards as unknown as QuestReward;

    // Award reputation points
    if (rewards.reputationPoints) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user) {
        const newScore = Math.min(100, (user.reputationScore || 70) + rewards.reputationPoints);
        await prisma.user.update({
          where: { id: userId },
          data: {
            reputationScore: newScore,
            reputationUpdatedAt: new Date()
          }
        });

        // Log reputation event
        await prisma.reputationEvent.create({
          data: {
            userId,
            eventType: 'QUEST_COMPLETED',
            impact: rewards.reputationPoints,
            reason: `Completed quest: ${quest.title}`,
            details: { questId, questTitle: quest.title } as Prisma.InputJsonValue
          }
        });
      }
    }

    // Award badges
    if (rewards.badges && rewards.badges.length > 0) {
      for (const badgeId of rewards.badges) {
        try {
          await badgeService.awardBadge(userId, badgeId, undefined, `Earned from quest: ${quest.title}`);
        } catch (error) {
          console.error(`Error awarding badge ${badgeId}:`, error);
        }
      }
    }

    // Update streak
    await this.updateUserStreak(userId, quest.type);

    // Send notification
    await prisma.notification.create({
      data: {
        type: 'REACTION',
        senderId: 'system',
        receiverId: userId,
        message: `Quest completed: ${quest.title}!`
      }
    });
  }

  // Update user streak
  private async updateUserStreak(userId: string, questType: QuestType): Promise<void> {
    let streak = await prisma.userQuestStreak.findUnique({
      where: { userId }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!streak) {
      streak = await prisma.userQuestStreak.create({
        data: {
          userId,
          currentDailyStreak: 1,
          longestDailyStreak: 1,
          lastCompletedDate: today,
          totalQuestsCompleted: 1
        }
      });
    } else {
      const lastCompleted = streak.lastCompletedDate ? new Date(streak.lastCompletedDate) : null;
      if (lastCompleted) {
        lastCompleted.setHours(0, 0, 0, 0);
      }

      const daysSinceLastCompletion = lastCompleted
        ? Math.floor((today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      let newDailyStreak = streak.currentDailyStreak;

      if (daysSinceLastCompletion === 0) {
        // Already completed today, just increment total
      } else if (daysSinceLastCompletion === 1) {
        // Consecutive day, increment streak
        newDailyStreak++;
      } else {
        // Streak broken, reset to 1
        newDailyStreak = 1;
      }

      const longestDailyStreak = Math.max(newDailyStreak, streak.longestDailyStreak);

      // Update weekly streak if applicable
      const currentWeek = Math.floor(today.getTime() / (1000 * 60 * 60 * 24 * 7));
      const lastCompletedWeek = lastCompleted
        ? Math.floor(lastCompleted.getTime() / (1000 * 60 * 60 * 24 * 7))
        : 0;

      let newWeeklyStreak = streak.currentWeeklyStreak;
      if (currentWeek === lastCompletedWeek + 1) {
        newWeeklyStreak++;
      } else if (currentWeek > lastCompletedWeek + 1) {
        newWeeklyStreak = 1;
      }

      await prisma.userQuestStreak.update({
        where: { userId },
        data: {
          currentDailyStreak: newDailyStreak,
          longestDailyStreak,
          currentWeeklyStreak: newWeeklyStreak,
          longestWeeklyStreak: Math.max(newWeeklyStreak, streak.longestWeeklyStreak),
          lastCompletedDate: today,
          totalQuestsCompleted: streak.totalQuestsCompleted + 1
        }
      });
    }
  }

  // Get user's quest progress
  async getUserQuestProgress(userId: string): Promise<any> {
    const questProgress = await prisma.userQuestProgress.findMany({
      where: { userId },
      include: {
        quest: true
      },
      orderBy: [
        { completed: 'asc' },
        { startedAt: 'desc' }
      ]
    });

    const streak = await prisma.userQuestStreak.findUnique({
      where: { userId }
    });

    const dailyQuests = questProgress.filter(qp => qp.quest.timeframe === 'DAILY');
    const weeklyQuests = questProgress.filter(qp => qp.quest.timeframe === 'WEEKLY');
    const activeQuests = questProgress.filter(qp => !qp.completed);
    const completedQuests = questProgress.filter(qp => qp.completed);

    return {
      dailyQuests,
      weeklyQuests,
      activeQuests,
      completedQuests,
      streak,
      stats: {
        totalCompleted: completedQuests.length,
        dailyStreak: streak?.currentDailyStreak || 0,
        weeklyStreak: streak?.currentWeeklyStreak || 0,
        longestStreak: streak?.longestDailyStreak || 0
      }
    };
  }

  // Create weekly quest
  async createWeeklyQuest(): Promise<Quest> {
    return await prisma.quest.create({
      data: {
        type: 'WEEKLY_ENGAGEMENT',
        category: 'COMMUNITY',
        title: 'Weekly Civic Champion',
        description: 'Complete at least 5 daily quests this week to maintain your civic engagement streak.',
        shortDescription: 'Complete 5 daily quests',
        requirements: {
          type: 'COMPLETE_QUESTS',
          target: 5,
          timeframe: 'weekly',
          metadata: {
            questTypes: ['DAILY_HABIT', 'DAILY_CIVIC']
          }
        } as Prisma.InputJsonValue,
        rewards: {
          reputationPoints: 10,
          experiencePoints: 100,
          badges: [] // Could include weekly champion badge
        } as Prisma.InputJsonValue,
        timeframe: 'WEEKLY',
        displayOrder: 10
      }
    });
  }

  // Admin: Create custom quest
  async createQuest(data: QuestCreateInput): Promise<Quest> {
    return await prisma.quest.create({
      data: {
        ...data,
        requirements: data.requirements as unknown as Prisma.InputJsonValue,
        rewards: data.rewards as unknown as Prisma.InputJsonValue
      }
    });
  }

  // Admin: Get all quests
  async getAllQuests(): Promise<Quest[]> {
    return await prisma.quest.findMany({
      include: {
        _count: {
          select: {
            userProgress: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { displayOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  // Admin: Update quest
  async updateQuest(questId: string, updates: Partial<QuestCreateInput>): Promise<Quest> {
    const data: any = {};

    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.shortDescription !== undefined) data.shortDescription = updates.shortDescription;
    if (updates.requirements !== undefined) data.requirements = updates.requirements as unknown as Prisma.InputJsonValue;
    if (updates.rewards !== undefined) data.rewards = updates.rewards as unknown as Prisma.InputJsonValue;
    if (updates.displayOrder !== undefined) data.displayOrder = updates.displayOrder;
    if (updates.isActive !== undefined) data.isActive = updates.isActive;
    if (updates.startDate !== undefined) data.startDate = updates.startDate;
    if (updates.endDate !== undefined) data.endDate = updates.endDate;

    return await prisma.quest.update({
      where: { id: questId },
      data
    });
  }

  // Admin: Get quest analytics
  async getQuestAnalytics(): Promise<any> {
    const totalQuests = await prisma.quest.count();
    const activeQuests = await prisma.quest.count({ where: { isActive: true } });

    const questProgress = await prisma.userQuestProgress.groupBy({
      by: ['questId', 'completed'],
      _count: true
    });

    const streakStats = await prisma.userQuestStreak.aggregate({
      _avg: {
        currentDailyStreak: true,
        longestDailyStreak: true,
        totalQuestsCompleted: true
      },
      _max: {
        currentDailyStreak: true,
        longestDailyStreak: true,
        totalQuestsCompleted: true
      }
    });

    return {
      totalQuests,
      activeQuests,
      questProgress,
      streakStats,
      completionRates: questProgress.map(qp => ({
        questId: qp.questId,
        completed: qp.completed,
        count: qp._count
      }))
    };
  }
}

export default new QuestService();