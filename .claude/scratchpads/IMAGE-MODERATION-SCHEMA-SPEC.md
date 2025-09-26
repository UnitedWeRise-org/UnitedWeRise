# Image Moderation System - Database Schema Specification

## 📋 Quick Reference

### Database Objects Created
- **Migration**: `20250926_add_image_moderation_system`
- **Tables**: `ImageModerationResult`, `ImageModerationReview`
- **Enums**: `ModerationStatus`, `ModerationCategory`, `ModerationDecision`
- **Service**: `ModerationResultsService` (backend/src/services/)

### Primary Use Cases
1. **AI Analysis Storage**: Store comprehensive AI content analysis results
2. **Human Review Workflow**: Track admin review decisions and appeals
3. **Admin Dashboard**: Query moderation queue with filters and pagination
4. **Performance Analytics**: Statistics and metrics for system monitoring
5. **Bulk Operations**: Efficient batch processing for large datasets

---

## 🗄️ Database Schema

### ImageModerationResult Table
**Purpose**: Store AI analysis results for each photo

```typescript
interface ImageModerationResult {
  id: string;                          // Primary key
  photoId: string;                     // Unique foreign key to Photo
  moderationType: string;              // "AI_ANALYSIS" | "MANUAL_REVIEW"
  aiAnalysisResults: any;              // JSONB - Raw AI response
  overallConfidence: number;           // 0.0 - 1.0
  categories: ModerationCategory[];    // Array of detected categories
  primaryCategory?: ModerationCategory; // Main concern category
  riskScore: number;                   // 0.0 - 1.0 risk assessment
  isSafe: boolean;                     // Binary safety determination
  requiresHumanReview: boolean;        // Workflow flag
  detectedObjects: string[];           // Object recognition results
  detectedText?: string;               // OCR results
  textAnalysis?: any;                  // JSONB - Text sentiment/analysis
  faceCount?: number;                  // Number of faces detected
  adultContentScore?: number;          // 0.0 - 1.0
  violenceScore?: number;              // 0.0 - 1.0
  racyScore?: number;                  // 0.0 - 1.0
  hateSpeechScore?: number;            // 0.0 - 1.0
  spamScore?: number;                  // 0.0 - 1.0
  qualityScore?: number;               // 0.0 - 1.0 technical quality
  technicalMetadata?: any;             // JSONB - Technical details
  processingTime?: number;             // Milliseconds
  aiModel?: string;                    // Model identifier
  modelVersion?: string;               // Version tracking
  createdAt: Date;
  updatedAt: Date;
}
```

### ImageModerationReview Table
**Purpose**: Track human review decisions and workflow

```typescript
interface ImageModerationReview {
  id: string;                          // Primary key
  moderationResultId: string;          // Foreign key to ImageModerationResult
  reviewerId: string;                  // Foreign key to User (admin/moderator)
  decision: ModerationDecision;        // Review decision
  reason?: string;                     // Decision rationale
  notes?: string;                      // Additional reviewer notes
  confidenceOverride?: number;         // Human confidence assessment
  categoryOverride?: ModerationCategory; // Human category override
  isAppeal: boolean;                   // Appeal process flag
  originalDecision?: ModerationDecision; // For appeal tracking
  reviewedAt: Date;                    // Decision timestamp
  createdAt: Date;
  updatedAt: Date;
}
```

### Enhanced Photo Model
**Added Fields**:

```typescript
interface PhotoModerationFields {
  moderationStatus: ModerationStatus;   // Workflow status
  moderationScore?: number;            // Risk score (0.0 - 1.0)
  requiresReview: boolean;             // Needs human attention
  autoModerationPassed?: boolean;      // AI auto-approval flag
  humanReviewRequired: boolean;        // Workflow requirement
  lastModerationAt?: Date;             // Last processing timestamp
  moderationMetadata?: any;            // JSONB - Summary metadata
  moderationResults: ImageModerationResult[]; // Related results
}
```

---

## 🏷️ Enum Definitions

### ModerationStatus
```typescript
enum ModerationStatus {
  PENDING = "PENDING",           // Awaiting processing
  APPROVED = "APPROVED",         // Safe for display
  REJECTED = "REJECTED",         // Blocked content
  FLAGGED = "FLAGGED",          // Needs attention
  REVIEW_REQUIRED = "REVIEW_REQUIRED" // Requires human review
}
```

### ModerationCategory
```typescript
enum ModerationCategory {
  SAFE = "SAFE",                           // Content is safe
  INAPPROPRIATE = "INAPPROPRIATE",          // General inappropriate content
  ADULT_CONTENT = "ADULT_CONTENT",         // Adult/sexual content
  VIOLENCE = "VIOLENCE",                   // Violent content
  HATE_SPEECH = "HATE_SPEECH",            // Hate speech/discrimination
  SPAM = "SPAM",                          // Spam content
  COPYRIGHT = "COPYRIGHT",                 // Copyright violation
  POLITICAL_DISINFORMATION = "POLITICAL_DISINFORMATION", // False political info
  PERSONAL_INFORMATION = "PERSONAL_INFORMATION", // PII exposure
  OTHER = "OTHER"                         // Other concerns
}
```

### ModerationDecision
```typescript
enum ModerationDecision {
  APPROVE = "APPROVE",                 // Allow content
  REJECT = "REJECT",                   // Block content
  FLAG_FOR_REVIEW = "FLAG_FOR_REVIEW", // Escalate for review
  REQUIRE_BLUR = "REQUIRE_BLUR",       // Show with blur filter
  REQUIRE_WARNING = "REQUIRE_WARNING"   // Show with warning label
}
```

---

## ⚡ Performance Optimizations

### Strategic Indexes

#### Admin Dashboard Queries
```sql
-- Pending review queue (priority ordering)
CREATE INDEX "ImageModerationResult_isSafe_requiresHumanReview_idx"
ON "ImageModerationResult"("isSafe", "requiresHumanReview");

-- Moderation status filtering
CREATE INDEX "Photo_moderationStatus_createdAt_idx"
ON "Photo"("moderationStatus", "createdAt");

-- Risk score analysis
CREATE INDEX "ImageModerationResult_riskScore_idx"
ON "ImageModerationResult"("riskScore");
```

#### Category Filtering
```sql
-- Category-based filtering (uses PostgreSQL array operators)
CREATE INDEX "ImageModerationResult_primaryCategory_idx"
ON "ImageModerationResult"("primaryCategory");
```

#### Review Workflow
```sql
-- Review history and appeals
CREATE INDEX "ImageModerationReview_isAppeal_idx"
ON "ImageModerationReview"("isAppeal");

CREATE INDEX "ImageModerationReview_decision_idx"
ON "ImageModerationReview"("decision");
```

### Query Patterns Optimized

1. **Pending Review Queue**:
   ```sql
   WHERE requiresHumanReview = true
   AND photo.moderationStatus = 'PENDING'
   ORDER BY riskScore DESC, createdAt DESC
   ```

2. **Admin Dashboard Filters**:
   ```sql
   WHERE categories && ['ADULT_CONTENT', 'VIOLENCE']
   AND riskScore BETWEEN 0.5 AND 1.0
   AND createdAt >= '2025-01-01'
   ```

3. **Statistics Queries**:
   ```sql
   -- Parallel execution for dashboard metrics
   SELECT COUNT(*) FROM photos WHERE moderationStatus = 'PENDING';
   SELECT COUNT(*) FROM ImageModerationResult WHERE requiresHumanReview = true;
   ```

---

## 🔧 Service Layer API

### ModerationResultsService Methods

#### Core CRUD
```typescript
// Store AI analysis results
createModerationResult(data: CreateModerationResultData): Promise<ImageModerationResult>

// Retrieve with full relationships
getModerationResultByPhotoId(photoId: string): Promise<ImageModerationResult | null>
```

#### Admin Dashboard
```typescript
// Advanced querying with filters
queryModerationResults(query: ModerationResultsQuery): Promise<{
  results: ImageModerationResult[];
  totalCount: number;
  hasMore: boolean;
}>

// Priority workflow queue
getPendingReviewItems(limit?: number, offset?: number): Promise<{
  results: ImageModerationResult[];
  totalPending: number;
  hasMore: boolean;
}>
```

#### Human Review Workflow
```typescript
// Record admin decisions
createModerationReview(data: CreateModerationReviewData): Promise<ImageModerationReview>

// Dashboard metrics
getModerationStatistics(): Promise<{
  totalImages: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  flagged: number;
  highRiskImages: number;
  recentActivity: number;
}>
```

#### Bulk Operations
```typescript
// Efficient batch processing
bulkApproveImages(photoIds: string[], reviewerId: string, reason?: string): Promise<ImageModerationReview[]>
```

---

## 🔄 Workflow Logic

### Automatic Status Determination
```typescript
// AI Analysis → Photo Status Logic
if (isSafe && riskScore < 0.3 && overallConfidence > 0.8) {
  status = 'APPROVED'; // Auto-approve high confidence safe content
} else if (riskScore > 0.7 || !isSafe) {
  status = 'FLAGGED'; // Flag high-risk content
  humanReviewRequired = true;
} else if (requiresHumanReview || overallConfidence < 0.6) {
  status = 'REVIEW_REQUIRED'; // Uncertain content needs review
  humanReviewRequired = true;
}
```

### Human Review → Final Status
```typescript
// Admin Decision → Photo Status Logic
switch (decision) {
  case 'APPROVE': status = 'APPROVED'; isActive = true; break;
  case 'REJECT': status = 'REJECTED'; isActive = false; break;
  case 'FLAG_FOR_REVIEW': status = 'FLAGGED'; break;
  case 'REQUIRE_BLUR': status = 'FLAGGED'; /* UI blur logic */; break;
  case 'REQUIRE_WARNING': status = 'FLAGGED'; /* UI warning logic */; break;
}
```

---

## 📊 Integration Points

### Frontend Requirements
- **Admin Dashboard**: Moderation queue components
- **Photo Display**: Status-aware rendering logic
- **Review Interface**: Decision forms and bulk actions
- **Statistics Widgets**: Real-time metrics display

### API Endpoints (Recommended)
- `GET /api/admin/moderation/pending` - Review queue
- `GET /api/admin/moderation/results` - Query with filters
- `POST /api/admin/moderation/review` - Submit decision
- `GET /api/admin/moderation/stats` - Dashboard metrics
- `POST /api/admin/moderation/bulk-approve` - Batch operations

### Performance Targets
- **Query Response**: < 200ms for dashboard queries
- **Bulk Operations**: < 1s for 100 item batches
- **Statistics**: < 100ms for metric calculations
- **Scalability**: Handle 10,000+ photos efficiently