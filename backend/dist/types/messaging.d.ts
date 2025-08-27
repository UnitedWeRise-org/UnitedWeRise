export declare enum MessageType {
    USER_USER = "USER_USER",// Legacy sidebar messaging between users
    ADMIN_CANDIDATE = "ADMIN_CANDIDATE"
}
export interface UnifiedMessage {
    id: string;
    type: MessageType;
    senderId: string;
    recipientId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    conversationId?: string;
    isRead?: boolean;
    metadata?: {
        [key: string]: any;
    };
}
export interface WebSocketMessagePayload {
    type: 'NEW_MESSAGE' | 'MESSAGE_READ' | 'TYPING_START' | 'TYPING_STOP';
    messageType: MessageType;
    data: any;
    timestamp: Date;
}
export interface ConversationMeta {
    id: string;
    type: MessageType;
    participants: string[];
    lastMessageAt: Date;
    unreadCount: number;
}
//# sourceMappingURL=messaging.d.ts.map