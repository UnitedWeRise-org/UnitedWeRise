// Unified messaging system types for WebSocket implementation

export enum MessageType {
  USER_USER = 'USER_USER',           // Legacy sidebar messaging between users
  ADMIN_CANDIDATE = 'ADMIN_CANDIDATE' // Admin-candidate messaging system
}

export interface UnifiedMessage {
  id: string;
  type: MessageType;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional fields based on message type
  conversationId?: string;  // For USER_USER messages
  isRead?: boolean;         // For tracking read status
  metadata?: {              // For extensibility
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