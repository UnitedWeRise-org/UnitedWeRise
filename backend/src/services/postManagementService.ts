/**
 * Post Management Service
 * Modular service for handling post editing, deletion, and history management
 * Designed for easy algorithm adjustments and extensibility
 */

import { prisma } from '../lib/prisma';
import { ActivityTracker } from './activityTracker';

export interface EditHistoryEntry {
  version: number;
  content: string;
  editedAt: Date;
  editReason?: string;
  editedBy: string;
}

export interface PostEditOptions {
  content: string;
  editReason?: string;
  extendedContent?: string;
}

export interface PostDeleteOptions {
  deleteReason?: string;
  preserveComments?: boolean;
}

export interface ModularConfig {
  maxEditHistoryVersions: number;
  enableSoftDelete: boolean;
  requireEditReasons: boolean;
  archiveCommentsOnDelete: boolean;
}

export class PostManagementService {
  private static config: ModularConfig = {
    maxEditHistoryVersions: 10,
    enableSoftDelete: true,
    requireEditReasons: false,
    archiveCommentsOnDelete: true,
  };

  /**
   * Update configuration for modular behavior
   */
  static updateConfig(newConfig: Partial<ModularConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  static getConfig(): ModularConfig {
    return { ...this.config };
  }

  /**
   * Edit a post with full history tracking
   */
  static async editPost(
    postId: string,
    userId: string,
    options: PostEditOptions
  ) {
    const { content, editReason, extendedContent } = options;

    // Validate user ownership
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        content: true,
        extendedContent: true,
        editHistory: true,
        originalContent: true,
        editCount: true,
        lastEditedAt: true,
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== userId) {
      throw new Error('Unauthorized: You can only edit your own posts');
    }

    // Check if edit reason is required
    if (this.config.requireEditReasons && !editReason) {
      throw new Error('Edit reason is required');
    }

    // Prepare edit history entry
    const currentHistory = (post.editHistory as unknown as EditHistoryEntry[]) || [];
    const newVersion = currentHistory.length + 1;

    const newHistoryEntry: EditHistoryEntry = {
      version: newVersion,
      content: post.content,
      editedAt: new Date(),
      editReason,
      editedBy: userId,
    };

    // Add to history and trim if necessary
    const updatedHistory = [...currentHistory, newHistoryEntry];
    if (updatedHistory.length > this.config.maxEditHistoryVersions) {
      updatedHistory.shift(); // Remove oldest entry
    }

    // Preserve original content on first edit
    const originalContent = post.originalContent || post.content;

    // Update post
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        extendedContent,
        editHistory: updatedHistory as any,
        originalContent,
        editCount: post.editCount + 1,
        lastEditedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Track activity
    await ActivityTracker.trackPostEdited(
      userId,
      postId,
      content,
      post.content,
      editReason
    );

    return {
      post: updatedPost,
      previousContent: post.content,
      editReason,
      version: newVersion,
    };
  }

  /**
   * Delete a post with archival
   */
  static async deletePost(
    postId: string,
    userId: string,
    options: PostDeleteOptions = {}
  ) {
    const { deleteReason, preserveComments } = options;

    // Get full post with comments for archival
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        comments: this.config.archiveCommentsOnDelete
          ? {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                replies: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            }
          : false,
        photos: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== userId) {
      throw new Error('Unauthorized: You can only delete your own posts');
    }

    // Create deletion archive
    const deletionArchive = {
      originalContent: post.originalContent || post.content,
      content: post.content,
      extendedContent: post.extendedContent,
      editHistory: post.editHistory,
      deletedAt: new Date(),
      deleteReason,
      engagement: {
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
      },
      comments: this.config.archiveCommentsOnDelete ? post.comments : [],
      photos: post.photos,
    };

    let result;

    if (this.config.enableSoftDelete) {
      // Soft delete - mark as deleted but preserve in database
      result = await prisma.post.update({
        where: { id: postId },
        data: {
          deletedAt: new Date(),
          deletedReason: deleteReason,
          // Store archive in metadata field
          editHistory: deletionArchive as any,
        },
      });
    } else {
      // Hard delete - remove from database completely
      result = await prisma.post.delete({
        where: { id: postId },
      });
    }

    // Track activity with full archive
    await ActivityTracker.trackPostDeleted(
      userId,
      postId,
      post.content,
      deleteReason
    );

    return {
      deletedPost: result,
      archive: deletionArchive,
      deleteReason,
      softDelete: this.config.enableSoftDelete,
    };
  }

  /**
   * Get post edit history
   */
  static async getPostHistory(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        editHistory: true,
        originalContent: true,
        content: true,
        editCount: true,
        lastEditedAt: true,
        createdAt: true,
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.userId !== userId) {
      throw new Error('Unauthorized: You can only view history of your own posts');
    }

    const history = (post.editHistory as EditHistoryEntry[]) || [];

    return {
      postId,
      originalContent: post.originalContent,
      currentContent: post.content,
      editCount: post.editCount,
      lastEditedAt: post.lastEditedAt,
      createdAt: post.createdAt,
      history: history.map((entry, index) => ({
        ...entry,
        isOriginal: index === 0 && !post.originalContent,
        isCurrent: index === history.length - 1,
      })),
    };
  }

  /**
   * Get archived post content for deleted posts
   */
  static async getArchivedPost(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        userId: true,
        editHistory: true, // Contains archive data for soft deleted posts
        deletedAt: true,
        deleteReason: true,
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (!post.deletedAt) {
      throw new Error('Post is not deleted');
    }

    if (post.userId !== userId) {
      throw new Error('Unauthorized: You can only view archives of your own posts');
    }

    return {
      postId,
      deletedAt: post.deletedAt,
      deleteReason: post.deleteReason,
      archive: post.editHistory, // Contains full archive data
    };
  }

  /**
   * Check if user can edit post (modular permission system)
   */
  static async canEditPost(postId: string, userId: string): Promise<boolean> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        userId: true,
        deletedAt: true,
      },
    });

    if (!post) return false;
    if (post.deletedAt) return false; // Cannot edit deleted posts
    return post.userId === userId;
  }

  /**
   * Check if user can delete post (modular permission system)
   */
  static async canDeletePost(postId: string, userId: string): Promise<boolean> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        userId: true,
        deletedAt: true,
      },
    });

    if (!post) return false;
    if (post.deletedAt) return false; // Cannot delete already deleted posts
    return post.userId === userId;
  }
}

export default PostManagementService;