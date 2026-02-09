import { Server as HTTPServer } from 'http';
export declare class WebSocketService {
    private io;
    private userSockets;
    constructor(httpServer: HTTPServer);
    private setupEventHandlers;
    private authenticateSocket;
    /**
     * Handle typing start event.
     * Accepts two formats for backwards compatibility:
     * - Web frontend: { recipientId, type } (legacy)
     * - iOS app: { conversationId } (resolves recipient from ConversationParticipant)
     */
    private handleTypingStart;
    /**
     * Handle typing stop event.
     * Accepts two formats for backwards compatibility:
     * - Web frontend: { recipientId, type } (legacy)
     * - iOS app: { conversationId } (resolves recipient from ConversationParticipant)
     */
    private handleTypingStop;
    /**
     * Handle mark_read event.
     * Accepts two formats for backwards compatibility:
     * - Web frontend: { messageIds: string[], conversationId? }
     * - iOS app: { messageId: string } (singular — wrapped into array)
     *
     * Operates on the Message table (consolidated system).
     * Broadcasts message_read event to other conversation participants.
     */
    private handleMarkRead;
    /**
     * Handle join_conversation event.
     * Joins the socket to a conversation-specific room for targeted delivery.
     * Verifies user is a participant before allowing the join.
     */
    private handleJoinConversation;
    /**
     * Handle leave_conversation event.
     * Removes the socket from a conversation-specific room.
     */
    private handleLeaveConversation;
    isUserOnline(userId: string): boolean;
    getOnlineUsersCount(): number;
    emitNotification(receiverId: string, notification: any): void;
    emitMessage(userId: string, message: any): void;
}
export default WebSocketService;
//# sourceMappingURL=WebSocketService.d.ts.map