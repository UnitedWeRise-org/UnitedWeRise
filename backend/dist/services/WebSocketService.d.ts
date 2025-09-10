import { Server as HTTPServer } from 'http';
import { MessageType, UnifiedMessage } from '../types/messaging';
export declare class WebSocketService {
    private io;
    private userSockets;
    constructor(httpServer: HTTPServer);
    private setupEventHandlers;
    private authenticateSocket;
    private handleSendMessage;
    private handleTypingStart;
    private handleTypingStop;
    private handleMarkRead;
    private createUnifiedMessage;
    sendMessage(data: {
        type: MessageType;
        senderId: string;
        recipientId: string;
        content: string;
        conversationId?: string;
    }): Promise<UnifiedMessage>;
    isUserOnline(userId: string): boolean;
    getOnlineUsersCount(): number;
    emitNotification(receiverId: string, notification: any): void;
}
export default WebSocketService;
//# sourceMappingURL=WebSocketService.d.ts.map