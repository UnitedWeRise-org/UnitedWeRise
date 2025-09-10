declare const router: import("express-serve-static-core").Router;
export declare const createNotification: (type: "LIKE" | "COMMENT" | "FOLLOW" | "MENTION" | "FRIEND_REQUEST" | "FRIEND_ACCEPTED", senderId: string | null, receiverId: string, message: string, postId?: string, commentId?: string) => Promise<{
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