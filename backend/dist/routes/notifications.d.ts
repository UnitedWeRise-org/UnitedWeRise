declare const router: import("express-serve-static-core").Router;
/**
 * Creates a new notification and emits it via WebSocket for real-time delivery
 *
 * This helper function is used across the application to create notifications
 * for various user actions (likes, comments, follows, etc.). It creates the
 * notification in the database and simultaneously emits it via WebSocket for
 * instant delivery to online users.
 *
 * @param type - Type of notification (LIKE, COMMENT, FOLLOW, MENTION, FRIEND_REQUEST, FRIEND_ACCEPTED, REACTION)
 * @param senderId - ID of user who triggered the notification (null for system notifications)
 * @param receiverId - ID of user who will receive the notification
 * @param message - Human-readable notification message
 * @param postId - Optional ID of associated post
 * @param commentId - Optional ID of associated comment
 * @returns Promise<Notification | undefined> The created notification object or undefined on error
 *
 * @example
 * // Create a like notification
 * await createNotification(
 *   'LIKE',
 *   'user_123',
 *   'user_456',
 *   'John Doe liked your post',
 *   'post_789'
 * );
 *
 * @example
 * // Create a follow notification
 * await createNotification(
 *   'FOLLOW',
 *   'user_123',
 *   'user_456',
 *   'John Doe started following you'
 * );
 */
export declare const createNotification: (type: "LIKE" | "COMMENT" | "FOLLOW" | "MENTION" | "FRIEND_REQUEST" | "FRIEND_ACCEPTED" | "REACTION" | "NEW_POST" | "MESSAGE_REQUEST", senderId: string | null, receiverId: string, message: string, postId?: string, commentId?: string) => Promise<{
    sender: {
        id: string;
        username: string;
        firstName: string;
        lastName: string;
        avatar: string;
        verified: boolean;
    };
} & {
    id: string;
    createdAt: Date;
    senderId: string | null;
    postId: string | null;
    type: import(".prisma/client").$Enums.NotificationType;
    message: string;
    receiverId: string;
    commentId: string | null;
    read: boolean;
}>;
export default router;
//# sourceMappingURL=notifications.d.ts.map