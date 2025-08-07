# United We Rise API Documentation

## Overview

The United We Rise API is a comprehensive REST API for a political social media platform. It provides endpoints for user authentication, content management, political information, moderation, and administrative functions.

## Base URL

- **Production**: `https://api.unitedwerise.com`
- **Development**: `http://localhost:3001`

## Interactive Documentation

Visit `/api/docs` for interactive Swagger documentation where you can test endpoints directly.

## Authentication

### JWT Bearer Token
Most endpoints require authentication using JWT tokens in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Session ID (Optional)
For additional security, include session ID:
```
X-Session-ID: <session-id>
```

### Rate Limiting
- **Authentication endpoints**: 5 requests per 15 minutes
- **Post creation**: 10 requests per 15 minutes  
- **General API**: 100 requests per 15 minutes

## Core Endpoints

### Authentication (`/api/auth`)

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username123",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "hcaptchaToken": "captcha-token-here"
}
```

**Response (201)**:
```json
{
  "message": "Account created successfully. Please check your email to verify your account.",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username123",
    "emailVerified": false,
    "requiresEmailVerification": true,
    "requiresPhoneVerification": true
  },
  "token": "jwt-token-here"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### User Management (`/api/users`)

#### Get User Profile
```http
GET /api/users/{username}
```

#### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Political enthusiast and community advocate",
  "website": "https://johndoe.com",
  "location": "Springfield, IL"
}
```

#### Follow/Unfollow User
```http
POST /api/users/{userId}/follow
Authorization: Bearer <token>
```

#### Get User's Followers/Following
```http
GET /api/users/{userId}/followers
GET /api/users/{userId}/following
```

### Posts (`/api/posts`)

#### Create Post
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "This is my political opinion about...",
  "imageUrl": "https://example.com/image.jpg"
}
```

#### Get Posts
```http
GET /api/posts/user/{userId}
GET /api/posts/me
```

#### Like/Unlike Post
```http
POST /api/posts/{postId}/like
Authorization: Bearer <token>
```

#### Add Comment
```http
POST /api/posts/{postId}/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great point! I agree that..."
}
```

#### Get Comments
```http
GET /api/posts/{postId}/comments?page=1&limit=20
```

### Political Information (`/api/political`)

#### Get User's Representatives
```http
GET /api/political/representatives
Authorization: Bearer <token>
```

#### Search Representatives by Address
```http
POST /api/political/representatives/search
Content-Type: application/json

{
  "address": "123 Main St, Springfield, IL 62701"
}
```

#### Update Political Profile
```http
PUT /api/political/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "streetAddress": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zipCode": "62701",
  "politicalParty": "Independent",
  "office": "Mayor of Springfield",
  "campaignWebsite": "https://campaign.com"
}
```

### Elections (`/api/elections`)

#### Get Elections by Location
```http
GET /api/elections?state=CA&level=FEDERAL&includeUpcoming=true
```

**Query Parameters:**
- `state` (optional): Two-letter state code
- `level` (optional): Election level (FEDERAL, STATE, LOCAL, MUNICIPAL)
- `zipCode` (optional): ZIP code for precise location matching
- `includeUpcoming` (optional): Include only upcoming elections (default: true)

**Response:**
```json
{
  "elections": [
    {
      "id": "election-id",
      "name": "2024 General Election",
      "type": "GENERAL",
      "level": "FEDERAL",
      "date": "2024-11-05T00:00:00.000Z",
      "state": "CA",
      "offices": [
        {
          "id": "office-id",
          "title": "President",
          "level": "FEDERAL",
          "candidates": [
            {
              "id": "candidate-id",
              "name": "John Smith",
              "party": "Democratic",
              "isIncumbent": false,
              "platformSummary": "Fighting for working families...",
              "keyIssues": ["healthcare", "economy", "environment"]
            }
          ]
        }
      ],
      "ballotMeasures": []
    }
  ],
  "count": 1
}
```

#### Get Election Details
```http
GET /api/elections/{id}
```

#### Get Candidates for Election
```http
GET /api/elections/{id}/candidates?party=Democratic&office=office-id
```

#### Register as Candidate
```http
POST /api/elections/{id}/register-candidate
Authorization: Bearer <token>
Content-Type: application/json

{
  "officeId": "office-id",
  "name": "Jane Doe",
  "party": "Democratic",
  "platformSummary": "Building a better future for all...",
  "keyIssues": ["education", "healthcare", "jobs"],
  "campaignWebsite": "https://janedoe2024.com",
  "campaignEmail": "contact@janedoe2024.com"
}
```

#### Compare Candidates
```http
POST /api/elections/candidates/compare
Content-Type: application/json

{
  "candidateIds": ["candidate-id-1", "candidate-id-2"]
}
```

### Candidates (`/api/candidates`)

#### Search Candidates
```http
GET /api/candidates?party=Democratic&state=CA&incumbent=false&search=john
```

**Query Parameters:**
- `party` (optional): Filter by political party
- `office` (optional): Filter by office type
- `state` (optional): Filter by state
- `incumbent` (optional): Filter by incumbent status
- `search` (optional): Search candidate names

#### Get Candidate Profile
```http
GET /api/candidates/{id}
```

**Response:**
```json
{
  "id": "candidate-id",
  "name": "John Smith",
  "party": "Democratic",
  "isIncumbent": false,
  "platformSummary": "Fighting for working families...",
  "keyIssues": ["healthcare", "economy", "environment"],
  "campaignWebsite": "https://johnsmith2024.com",
  "office": {
    "id": "office-id",
    "title": "Governor",
    "level": "STATE",
    "election": {
      "id": "election-id",
      "name": "2024 General Election",
      "date": "2024-11-05T00:00:00.000Z"
    }
  },
  "user": {
    "id": "user-id",
    "username": "johnsmith",
    "firstName": "John",
    "lastName": "Smith",
    "verified": true
  },
  "financialData": {
    "totalRaised": 150000.00,
    "totalSpent": 75000.00,
    "cashOnHand": 75000.00
  },
  "endorsements": [
    {
      "id": "endorsement-id",
      "reason": "Strong advocate for healthcare reform",
      "isPublic": true,
      "user": {
        "username": "supporter1",
        "firstName": "Jane",
        "lastName": "Doe"
      }
    }
  ]
}
```

#### Endorse Candidate
```http
POST /api/candidates/{id}/endorse
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Strong record on environmental issues",
  "isPublic": true
}
```

#### Remove Endorsement
```http
DELETE /api/candidates/{id}/endorse
Authorization: Bearer <token>
```

#### Get My Candidate Profiles
```http
GET /api/candidates/my-candidacy
Authorization: Bearer <token>
```

#### Update Candidate Platform
```http
PUT /api/candidates/{id}/update-platform
Authorization: Bearer <token>
Content-Type: application/json

{
  "platformSummary": "Updated platform summary...",
  "keyIssues": ["healthcare", "education", "climate"],
  "campaignWebsite": "https://updated-website.com"
}
```

#### Withdraw Candidacy
```http
POST /api/candidates/{id}/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Personal reasons"
}
```

### Verification (`/api/verification`)

#### Send Email Verification
```http
POST /api/verification/email/send
Authorization: Bearer <token>
```

#### Verify Email
```http
POST /api/verification/email/verify
Content-Type: application/json

{
  "token": "verification-token"
}
```

#### Send Phone Verification
```http
POST /api/verification/phone/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "hcaptchaToken": "captcha-token"
}
```

#### Verify Phone
```http
POST /api/verification/phone/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "code": "123456"
}
```

#### Get Verification Status
```http
GET /api/verification/status
Authorization: Bearer <token>
```

### Moderation (`/api/moderation`)

#### Submit Report
```http
POST /api/moderation/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetType": "POST",
  "targetId": "post-id",
  "reason": "SPAM",
  "description": "This post appears to be spam content..."
}
```

**Report Reasons**:
- `SPAM` - Spam content
- `HARASSMENT` - Harassment or bullying
- `HATE_SPEECH` - Hate speech or discrimination
- `MISINFORMATION` - False or misleading information
- `INAPPROPRIATE_CONTENT` - Inappropriate content
- `FAKE_ACCOUNT` - Fake or impersonated account
- `VIOLENCE_THREATS` - Threats of violence
- `SELF_HARM` - Self-harm content
- `ILLEGAL_CONTENT` - Illegal content

#### Get My Reports
```http
GET /api/moderation/reports/my?page=1&limit=20
Authorization: Bearer <token>
```

### Admin Functions (`/api/admin`) - Admin Only

#### Dashboard Overview
```http
GET /api/admin/dashboard
Authorization: Bearer <admin-token>
```

#### User Management
```http
GET /api/admin/users?search=username&status=active&role=user&page=1&limit=50
GET /api/admin/users/{userId}
POST /api/admin/users/{userId}/suspend
POST /api/admin/users/{userId}/role
```

#### Content Moderation
```http
GET /api/admin/reports?status=PENDING&priority=HIGH&page=1
POST /api/admin/reports/{reportId}/action
GET /api/admin/content/flagged
```

### Appeals (`/api/appeals`)

#### Submit Appeal
```http
POST /api/appeals
Authorization: Bearer <token>
Content-Type: application/json

{
  "suspensionId": "suspension-id",
  "reason": "I believe this suspension was issued in error because...",
  "additionalInfo": "Additional context or evidence..."
}
```

#### Get My Appeals
```http
GET /api/appeals/my?page=1&limit=10
Authorization: Bearer <token>
```

#### Get Appeal Status
```http
GET /api/appeals/{appealId}
Authorization: Bearer <token>
```

## Response Formats

### Success Response
```json
{
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "error": "Validation failed",
  "message": "The request contains invalid data",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request / Validation error
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `409` - Conflict (resource already exists)
- `429` - Too many requests (rate limited)
- `500` - Internal server error

## Error Codes and Messages

### Authentication Errors
- `INVALID_CREDENTIALS` - Invalid email or password
- `TOKEN_EXPIRED` - JWT token has expired
- `TOKEN_INVALID` - JWT token is invalid
- `ACCOUNT_SUSPENDED` - User account is suspended
- `EMAIL_NOT_VERIFIED` - Email verification required

### Validation Errors
- `VALIDATION_FAILED` - Request validation failed
- `MISSING_REQUIRED_FIELD` - Required field is missing
- `INVALID_FORMAT` - Field format is invalid
- `VALUE_TOO_LONG` - Field value exceeds maximum length

### Rate Limiting
- `RATE_LIMIT_EXCEEDED` - Too many requests from this IP
- `AUTH_RATE_LIMIT` - Authentication rate limit exceeded

### Content Moderation
- `CONTENT_FLAGGED` - Content has been flagged for review
- `ACCOUNT_RESTRICTED` - Account has posting restrictions
- `INAPPROPRIATE_CONTENT` - Content violates community guidelines

## Security Features

### Content Security
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: Prevents spam and abuse
- **Content Filtering**: Automatic detection of inappropriate content
- **User Reporting**: Community-driven content moderation

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable salt rounds
- **Session Management**: Optional session tracking
- **Multi-factor Verification**: Email and SMS verification

### Platform Security
- **CORS Protection**: Restricted cross-origin requests
- **Helmet Security**: Comprehensive security headers
- **Request Logging**: Detailed request monitoring
- **Error Handling**: Secure error responses without sensitive data exposure

## Data Models

### User
```json
{
  "id": "string",
  "email": "string",
  "username": "string",
  "firstName": "string",
  "lastName": "string",
  "avatar": "string",
  "bio": "string",
  "website": "string",
  "location": "string",
  "verified": "boolean",
  "emailVerified": "boolean",
  "phoneVerified": "boolean",
  "politicalProfileType": "CITIZEN|CANDIDATE|ELECTED_OFFICIAL|POLITICAL_ORG",
  "followersCount": "number",
  "followingCount": "number",
  "createdAt": "string"
}
```

### Post
```json
{
  "id": "string",
  "content": "string",
  "imageUrl": "string",
  "isPolitical": "boolean",
  "tags": ["string"],
  "authorId": "string",
  "author": "User",
  "likesCount": "number",
  "commentsCount": "number",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Comment
```json
{
  "id": "string",
  "content": "string",
  "userId": "string",
  "postId": "string",
  "user": "User",
  "createdAt": "string"
}
```

## Webhooks

### Content Moderation Events
When content is automatically flagged or moderated, webhooks can be triggered:

```json
{
  "event": "content.flagged",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "contentId": "content-id",
    "contentType": "POST",
    "flagType": "SPAM",
    "confidence": 0.85,
    "action": "hidden"
  }
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.unitedwerise.com',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

// Create a post
const createPost = async (content) => {
  const response = await api.post('/api/posts', {
    content,
    isPolitical: true
  });
  return response.data;
};

// Get user's representatives
const getRepresentatives = async () => {
  const response = await api.get('/api/political/representatives');
  return response.data;
};
```

### Python
```python
import requests

class UnitedWeRiseAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def create_post(self, content, is_political=False):
        response = requests.post(
            f'{self.base_url}/api/posts',
            json={'content': content, 'isPolitical': is_political},
            headers=self.headers
        )
        return response.json()
    
    def get_representatives(self):
        response = requests.get(
            f'{self.base_url}/api/political/representatives',
            headers=self.headers
        )
        return response.json()

# Usage
api = UnitedWeRiseAPI('https://api.unitedwerise.com', 'your-jwt-token')
post = api.create_post('My political opinion...', True)
```

## Testing

### Health Check
```http
GET /health
```

Returns server health status and database connectivity.

### API Status
```http
GET /api/health
```

Returns API-specific health information including:
- Database status
- WebSocket status
- Service uptime

## Support

- **Documentation**: This API documentation
- **Interactive Docs**: `/api/docs` endpoint
- **Status Page**: Check service status and uptime
- **Rate Limits**: Monitor your API usage

For technical support, please refer to the troubleshooting section in the deployment documentation.