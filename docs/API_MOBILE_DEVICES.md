# Mobile Device API Reference

**Status**: Production Ready
**Last Updated**: 2026-02-07
**Version**: 1.1.0

---

## For Claude Code: When to Read This File

**Read this documentation when the user mentions ANY of these keywords:**
- Device Token, Push Notification, APNs, FCM
- Mobile App, iOS App, Android App
- Device Registration, Device Management
- Notification delivery, Push registration

**What this file contains:**
- Complete API documentation for all 3 Device Management endpoints
- Database model: DeviceToken
- Request/response schemas with JSON examples
- iOS/Android integration patterns
- Error handling and troubleshooting guides

**How to use this documentation:**
1. Read companion files:
   - `backend/src/routes/devices.ts` (current implementation)
   - `backend/prisma/schema.prisma` (DeviceToken model)
   - `docs/DATABASE_SCHEMA.md` (DeviceToken section)
2. Follow established JSON schemas for requests/responses
3. Test on development environment before deploying

---

## Overview

The Mobile Device API manages push notification device tokens for iOS and Android apps. When a user logs into the mobile app, the app registers its device token with the backend. This enables the platform to send push notifications for:

- New direct messages
- Friend requests received
- Comments on user's posts
- Reactions on user's posts
- Quest completion reminders

## Base URL

- **Production**: `https://api.unitedwerise.org/api/devices`
- **Staging**: `https://dev-api.unitedwerise.org/api/devices`

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header or httpOnly cookie.

---

## Database Model

### DeviceToken Model

```prisma
model DeviceToken {
  id          String   @id @default(cuid())
  userId      String
  deviceToken String   @unique
  platform    String   // "ios" or "android"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deviceName  String?
  appVersion  String?

  user User @relation("DeviceTokens", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([platform])
}
```

**Key Behaviors:**
- Device tokens are unique across the entire system
- If a token is registered by a different user, it gets reassigned (user switched accounts)
- All tokens for a user are deleted when the user account is deleted (CASCADE)

---

## API Endpoints

### POST /api/devices/register

Register a device token for push notifications. Called after successful authentication on mobile app.

**Authentication**: Required (JWT)

**Request Body:**
```json
{
  "deviceToken": "a1b2c3d4e5f6g7h8i9j0...",
  "platform": "ios",
  "deviceName": "iPhone 15 Pro",
  "appVersion": "1.0.0"
}
```

**Request Schema:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deviceToken` | string | Yes | APNs token (iOS) or FCM token (Android). Minimum 32 characters. |
| `platform` | string | Yes | Must be "ios" or "android" |
| `deviceName` | string | No | Optional device name for user-facing display |
| `appVersion` | string | No | Optional app version for debugging |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "id": "clxxxxxxxxxxxxxxxxxx",
    "platform": "ios",
    "deviceName": "iPhone 15 Pro",
    "createdAt": "2026-01-22T12:00:00.000Z",
    "updatedAt": "2026-01-22T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing or invalid deviceToken/platform
- `401 Unauthorized`: Missing or invalid authentication token

**Example Usage (iOS):**
```swift
func registerDeviceToken(_ token: Data) async throws {
    let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()

    let body: [String: Any] = [
        "deviceToken": tokenString,
        "platform": "ios",
        "deviceName": UIDevice.current.name,
        "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
    ]

    let response = try await apiClient.post("/api/devices/register", body: body)
}
```

**Behavior Notes:**
- If the token already exists for the same user, it updates the record
- If the token exists for a different user, it reassigns to the current user
- Token format validation: minimum 32 characters

---

### DELETE /api/devices/:deviceToken

Unregister a device token. Called during logout to stop receiving push notifications on that device.

**Authentication**: Required (JWT)

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `deviceToken` | string | The device token to unregister |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Device token unregistered successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Token belongs to a different user
- `404 Not Found`: Device token not found

**Example Usage (iOS):**
```swift
func unregisterDeviceToken(_ token: String) async throws {
    let encodedToken = token.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? token
    try await apiClient.delete("/api/devices/\(encodedToken)")
}
```

**Security Note:**
Users can only delete their own device tokens. Attempting to delete another user's token returns 403 Forbidden.

---

### GET /api/devices

Get all registered devices for the current user. Useful for device management UI.

**Authentication**: Required (JWT)

**Request Parameters**: None

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxxxxxxxxxxxxxx",
      "platform": "ios",
      "deviceName": "iPhone 15 Pro",
      "createdAt": "2026-01-22T12:00:00.000Z",
      "updatedAt": "2026-01-22T14:30:00.000Z"
    },
    {
      "id": "clyyyyyyyyyyyyyyyyyy",
      "platform": "ios",
      "deviceName": "iPad Pro",
      "createdAt": "2026-01-20T08:00:00.000Z",
      "updatedAt": "2026-01-20T08:00:00.000Z"
    }
  ]
}
```

**Response Schema:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the device record |
| `platform` | string | "ios" or "android" |
| `deviceName` | string | Device name (may be null) |
| `createdAt` | string | ISO 8601 timestamp of registration |
| `updatedAt` | string | ISO 8601 timestamp of last update |

**Note**: The actual device token is NOT returned for security reasons.

---

## iOS Integration Guide

### 1. Request Notification Permission

```swift
import UserNotifications

func requestNotificationPermission() async throws -> Bool {
    let center = UNUserNotificationCenter.current()
    let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])

    if granted {
        await MainActor.run {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    return granted
}
```

### 2. Handle Device Token Registration

```swift
// In AppDelegate or App struct
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Task {
        do {
            try await NotificationManager.shared.registerDeviceToken(deviceToken)
        } catch {
            print("Failed to register device token: \(error)")
        }
    }
}

func application(_ application: UIApplication,
                 didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("Failed to register for remote notifications: \(error)")
}
```

### 3. Register Token with Backend

```swift
class NotificationManager {
    static let shared = NotificationManager()

    func registerDeviceToken(_ token: Data) async throws {
        guard AuthManager.shared.isAuthenticated else { return }

        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()

        let body: [String: Any] = [
            "deviceToken": tokenString,
            "platform": "ios",
            "deviceName": await UIDevice.current.name,
            "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        ]

        _ = try await APIClient.shared.post("/api/devices/register", body: body)
    }

    func unregisterDeviceToken() async throws {
        guard let tokenString = storedDeviceToken else { return }

        let encodedToken = tokenString.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? tokenString
        _ = try await APIClient.shared.delete("/api/devices/\(encodedToken)")
    }
}
```

### 4. Unregister on Logout

```swift
func logout() async throws {
    // Unregister device token first
    try? await NotificationManager.shared.unregisterDeviceToken()

    // Then logout
    try await AuthManager.shared.logout()
}
```

---

## Error Handling

### Common Error Codes

| HTTP Status | Error | Description |
|-------------|-------|-------------|
| 400 | Invalid device token | Token is missing, not a string, or less than 32 characters |
| 400 | Invalid platform | Platform must be "ios" or "android" |
| 401 | Access denied | No authentication token provided |
| 403 | Not authorized | Attempting to delete another user's token |
| 404 | Token not found | Device token doesn't exist in database |
| 500 | Server error | Internal server error during operation |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message describing the issue"
}
```

---

## Troubleshooting

### Token Not Receiving Notifications

1. **Verify token is registered**: Call `GET /api/devices` to check if token appears in list
2. **Check platform**: Ensure "ios" or "android" is correctly specified
3. **Token format**: iOS APNs tokens should be 64-character hex strings
4. **Re-register**: APNs tokens can change; re-register on each app launch

### Token Registration Fails

1. **Authentication**: Ensure user is logged in before registering
2. **Token length**: Must be at least 32 characters
3. **Platform value**: Must be exactly "ios" or "android" (lowercase)

### Notifications Not Delivered

1. **APNs Configuration**: Verify APNs key is configured in backend
2. **Token validity**: Old tokens may be invalid; re-register
3. **User preferences**: Check if user has disabled notifications
4. **App state**: Background/terminated app handling differs

---

## Backend Push Notification Service

**File**: `backend/src/services/pushNotificationService.ts`

The `PushNotificationService` singleton handles sending push notifications to registered iOS devices via APNs HTTP/2 with token-based authentication (JWT/P8).

### Architecture

```
Message Created → Check recipient online (WebSocket) → If offline → Query DeviceTokens → Send via APNs
                                                                                        ↓
                                                                          Invalid tokens auto-cleaned
```

### Integration Points

Push notifications are sent from three message creation paths:

| Path | File | Trigger |
|------|------|---------|
| WebSocket DM | `WebSocketService.ts` | `handleSendMessage()` and `sendMessage()` |
| REST DM | `routes/messages.ts` | `POST /conversations/:id/messages` |
| Admin message | `routes/admin.ts` | `POST /admin/candidates/:id/messages` |

All calls are fire-and-forget — push failures never block message delivery.

### APNs Payload Format

```json
{
  "aps": {
    "alert": { "title": "Sender Name", "body": "Message preview..." },
    "badge": 1,
    "sound": "default",
    "mutable-content": 1,
    "thread-id": "<conversationId>"
  },
  "conversationId": "<id>",
  "messageType": "USER_USER",
  "type": "NEW_MESSAGE"
}
```

- `thread-id`: Groups notifications by conversation in iOS Notification Center
- `mutable-content`: Enables Notification Service Extension for rich notifications
- Custom keys (`conversationId`, `messageType`, `type`) enable deep linking

### Environment Configuration

| Variable | Description |
|----------|-------------|
| `APNS_KEY_ID` | Key ID from Apple Developer Portal (10 characters) |
| `APNS_TEAM_ID` | Apple Developer Team ID (10 characters) |
| `APNS_BUNDLE_ID` | iOS app bundle identifier |
| `APNS_KEY` | Base64-encoded .p8 private key |

**APNs endpoint selection**: Production (`NODE_ENV=production`) uses `api.push.apple.com`, all other environments use `api.sandbox.push.apple.com`.

### Invalid Token Cleanup

When APNs returns `BadDeviceToken`, `Unregistered`, or `DeviceTokenNotForTopic`, the service automatically deletes the invalid token from the database. This keeps the DeviceToken table clean without manual intervention.

---

## Future Enhancements

- [x] ~~APNs integration for actual notification delivery~~ (Implemented 2026-02-07)
- [ ] FCM integration for Android support
- [ ] Notification preferences per event type
- [ ] Silent push for background data sync
- [ ] Rich notifications with images and actions
- [ ] Accurate badge count (unread conversation count)
