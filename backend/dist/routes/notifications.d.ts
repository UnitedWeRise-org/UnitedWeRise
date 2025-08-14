declare const router: import("express-serve-static-core").Router;
export declare const createNotification: (type: "LIKE" | "COMMENT" | "FOLLOW" | "MENTION" | "FRIEND_REQUEST" | "FRIEND_ACCEPTED", senderId: string | null, receiverId: string, message: string, postId?: string, commentId?: string) => Promise<void>;
export default router;
//# sourceMappingURL=notifications.d.ts.map