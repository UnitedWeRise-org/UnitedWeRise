/**
 * Configuration for sending a push notification
 *
 * @property title - Notification title (typically sender name)
 * @property body - Notification body text (message preview)
 * @property sound - Alert sound name (defaults to 'default')
 * @property badge - Badge count to display on app icon
 * @property threadId - Thread identifier for grouping (typically conversationId)
 * @property customData - Custom payload for deep linking and routing
 */
export interface PushPayload {
    title: string;
    body: string;
    sound?: string;
    badge?: number;
    threadId?: string;
    customData?: Record<string, unknown>;
}
/**
 * Apple Push Notification Service (APNs) integration
 *
 * Sends push notifications to iOS devices via APNs HTTP/2 using token-based
 * authentication (JWT/P8). Follows the singleton pattern established by
 * emailService.ts — env-gated initialization, silent failures, structured logging.
 *
 * Features:
 * - Token-based auth with base64-encoded P8 key (Azure Container Apps compatible)
 * - Automatic production/sandbox endpoint selection based on NODE_ENV
 * - Concurrent delivery to multiple devices per user
 * - Automatic cleanup of invalid/expired device tokens
 * - Fire-and-forget API — never throws, returns boolean success
 *
 * Required environment variables:
 * - APNS_KEY_ID: Key ID from Apple Developer Portal (10 characters)
 * - APNS_TEAM_ID: Apple Developer Team ID (10 characters)
 * - APNS_BUNDLE_ID: App bundle identifier (e.g., com.unitedwerise.app)
 * - APNS_KEY: Base64-encoded .p8 private key content
 */
declare class PushNotificationService {
    private client;
    constructor();
    /**
     * Initialize APNs provider with token-based authentication
     *
     * Reads credentials from environment variables. If any required variable
     * is missing, logs a warning and disables the service (no push notifications
     * will be sent). Uses base64-decoded P8 key to avoid file system dependencies.
     *
     * @private
     */
    private initializeProvider;
    /**
     * Send push notification to all iOS devices registered for a user
     *
     * Fetches all iOS device tokens for the user, sends notifications concurrently,
     * and automatically cleans up invalid/expired tokens returned by APNs.
     *
     * @param userId - Target user's database ID
     * @param payload - Notification content (title, body, sound, badge, custom data)
     * @returns True if at least one notification was sent successfully
     *
     * @example
     * const sent = await pushNotificationService.sendToUser('user_123', {
     *   title: 'John Doe',
     *   body: 'Hey, are you coming to the event?',
     *   threadId: 'conv_456',
     *   customData: { conversationId: 'conv_456', type: 'NEW_MESSAGE' }
     * });
     */
    sendToUser(userId: string, payload: PushPayload): Promise<boolean>;
    /**
     * Send a DM push notification to a recipient
     *
     * Convenience method that formats a message into an APNs payload with
     * thread grouping (by conversationId) and deep-link data for the iOS app.
     * Truncates message body to 200 characters for the notification preview.
     *
     * @param recipientId - User ID of the message recipient
     * @param senderName - Display name of the sender (shown as notification title)
     * @param messageContent - Raw message content (will be truncated)
     * @param conversationId - Conversation ID for thread grouping and deep linking
     * @param messageType - Message type for deep link routing (e.g., 'USER_USER', 'ADMIN_CANDIDATE')
     * @returns True if push was delivered to at least one device
     *
     * @example
     * await pushNotificationService.sendMessagePush(
     *   'recipient_123',
     *   'Jane Smith',
     *   'Are you coming to the town hall meeting tomorrow?',
     *   'conv_456',
     *   'USER_USER'
     * );
     */
    sendMessagePush(recipientId: string, senderName: string, messageContent: string, conversationId: string, messageType?: string): Promise<boolean>;
    /**
     * Send a push notification for an E2E encrypted DM
     *
     * For encrypted messages, the notification body shows a generic fallback text
     * ("New message") since the server cannot read the content. The encrypted payload
     * is included in the APNs data so the Notification Service Extension can decrypt
     * and display the actual message content.
     *
     * @param recipientId - User ID of the message recipient
     * @param senderName - Display name of the sender (shown as notification title)
     * @param encryptedContent - Base64-encoded encrypted message blob
     * @param conversationId - Conversation ID for thread grouping and deep linking
     * @param senderPublicKeyId - Sender's public key ID for decryption key lookup
     * @param messageType - Message type for deep link routing
     * @returns True if push was delivered to at least one device
     */
    sendEncryptedMessagePush(recipientId: string, senderName: string, encryptedContent: string, conversationId: string, senderPublicKeyId: string | null, messageType?: string): Promise<boolean>;
    /**
     * Check if the push notification service is configured and ready to send
     *
     * @returns True if APNs client is initialized with valid credentials
     */
    isConfigured(): boolean;
}
/** Singleton push notification service instance */
export declare const pushNotificationService: PushNotificationService;
export {};
//# sourceMappingURL=pushNotificationService.d.ts.map