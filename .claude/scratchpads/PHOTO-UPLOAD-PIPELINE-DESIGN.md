# Photo Upload Pipeline Architecture Design
**Status:** 🎯 TARGET ARCHITECTURE - Phase 3 Refactoring Goal
**Created:** October 2, 2025
**Version:** 2.0.0

---

## Executive Summary

This document defines the **extensible pipeline architecture** that we will refactor to in Phase 3, after the minimal backend-first upload works in Phase 2.

**Current (Phase 2):** Monolithic `processAndUploadPhoto()` method with hardcoded sequential processing.

**Target (Phase 3):** Composable pipeline with independent stages that can be enabled/disabled/reordered via configuration.

**Benefits:**
- Easy to add new processing stages (watermarking, face detection, etc.)
- Optional stages can fail gracefully without breaking the pipeline
- Each stage is independently testable
- Metrics collection built-in (duration per stage)
- Clear separation of concerns

---

## Pipeline Interface Design

### 1. PhotoUploadContext Interface

**Purpose:** Contains all data that flows through the pipeline. Each stage can read and modify context.

```typescript
interface PhotoUploadContext {
  // Input data (immutable - set once at start)
  readonly input: {
    fileBuffer: Buffer;
    filename: string;
    mimeType: string;
    fileSize: number;
    userId: string;
    photoType: PhotoType;
    purpose: PhotoPurpose;
    caption?: string;
    gallery?: string;
    candidateId?: string;
  };

  // Processing state (mutable - updated by stages)
  processing: {
    validatedMimeType?: string;        // After FileValidationStage
    processedBuffer?: Buffer;          // After ExifStrippingStage
    thumbnailBuffer?: Buffer;          // After ThumbnailGenerationStage
    metadata?: {                       // After ImageProcessingStage
      width: number;
      height: number;
      format: string;
    };
    moderationResult?: {               // After ContentModerationStage
      approved: boolean;
      reason?: string;
      category?: string;
      confidence?: number;
    };
    azureUrls?: {                      // After AzureUploadStage
      photoUrl: string;
      thumbnailUrl: string;
    };
    photoRecord?: {                    // After DatabaseSaveStage
      id: string;
      url: string;
      thumbnailUrl: string;
      width: number;
      height: number;
    };
  };

  // Metrics (collected automatically by pipeline executor)
  metrics: {
    stageTimings: Map<string, number>;  // Stage name -> duration in ms
    totalDuration?: number;
    startTime: number;
    endTime?: number;
  };

  // Errors (optional stages can fail without breaking pipeline)
  errors: {
    stage: string;
    error: Error;
    fatal: boolean;  // If true, pipeline stops
  }[];
}
```

---

### 2. PipelineStage Interface

**Purpose:** Defines what each stage must implement. All stages are classes implementing this interface.

```typescript
interface PipelineStage {
  /**
   * Unique stage identifier (e.g., "file-validation", "exif-stripping")
   */
  readonly name: string;

  /**
   * Whether this stage is required for successful upload
   * - true: Pipeline stops if stage fails
   * - false: Failure is logged but pipeline continues
   */
  readonly required: boolean;

  /**
   * Execute this stage's processing
   *
   * @param context - Pipeline context (read and modify)
   * @returns Promise that resolves when stage completes
   * @throws Error if stage fails (caught by pipeline executor)
   */
  execute(context: PhotoUploadContext): Promise<void>;

  /**
   * Validate that context has required data for this stage
   * Called by pipeline executor before execute()
   *
   * @param context - Pipeline context to validate
   * @returns True if context is valid for this stage
   */
  canExecute(context: PhotoUploadContext): boolean;

  /**
   * Optional cleanup if stage needs to release resources
   * Called after execute() completes (success or failure)
   */
  cleanup?(context: PhotoUploadContext): Promise<void>;
}
```

---

### 3. PipelineResult Interface

**Purpose:** Defines what the pipeline executor returns.

```typescript
interface PipelineResult {
  /** Whether pipeline completed successfully */
  success: boolean;

  /** Final photo record (if successful) */
  photo?: {
    id: string;
    url: string;
    thumbnailUrl: string;
    width: number;
    height: number;
  };

  /** Errors that occurred (may include non-fatal optional stage errors) */
  errors: {
    stage: string;
    message: string;
    fatal: boolean;
  }[];

  /** Performance metrics */
  metrics: {
    totalDuration: number;
    stageTimings: { stage: string; duration: number }[];
  };

  /** Context snapshot (for debugging) */
  context?: PhotoUploadContext;
}
```

---

## Stage Implementations

### Stage 1: FileValidationStage

**Purpose:** Validate file type using magic bytes (not just MIME type).

**Required:** Yes (fatal if fails)

```typescript
class FileValidationStage implements PipelineStage {
  readonly name = 'file-validation';
  readonly required = true;

  canExecute(context: PhotoUploadContext): boolean {
    return !!context.input.fileBuffer && !!context.input.mimeType;
  }

  async execute(context: PhotoUploadContext): Promise<void> {
    console.log(`🔍 ${this.name} | Starting file validation`);

    // Check file header (magic bytes) against declared MIME type
    const buffer = context.input.fileBuffer;
    const declaredType = context.input.mimeType;

    // JPEG: FF D8 FF
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

    // PNG: 89 50 4E 47
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 &&
                  buffer[2] === 0x4E && buffer[3] === 0x47;

    // GIF: 47 49 46
    const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;

    // WebP: "RIFF" + "WEBP"
    const isWebP = buffer.toString('utf-8', 0, 4) === 'RIFF' &&
                   buffer.toString('utf-8', 8, 12) === 'WEBP';

    let actualType: string | null = null;
    if (isJpeg) actualType = 'image/jpeg';
    else if (isPng) actualType = 'image/png';
    else if (isGif) actualType = 'image/gif';
    else if (isWebP) actualType = 'image/webp';

    if (!actualType) {
      throw new Error('Invalid image file: Not a valid JPEG, PNG, WebP, or GIF');
    }

    if (actualType !== declaredType) {
      throw new Error(`File type mismatch: Declared ${declaredType} but actual ${actualType}`);
    }

    // Store validated type in context
    context.processing.validatedMimeType = actualType;
    console.log(`✅ ${this.name} | File validated as ${actualType}`);
  }
}
```

---

### Stage 2: FileSizeCheckStage

**Purpose:** Enforce file size limits before processing.

**Required:** Yes (fatal if fails)

```typescript
class FileSizeCheckStage implements PipelineStage {
  readonly name = 'file-size-check';
  readonly required = true;

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_GIF_SIZE = 5 * 1024 * 1024;   // 5MB

  canExecute(context: PhotoUploadContext): boolean {
    return context.input.fileSize > 0;
  }

  async execute(context: PhotoUploadContext): Promise<void> {
    console.log(`🔍 ${this.name} | Checking file size: ${context.input.fileSize} bytes`);

    const { fileSize, mimeType } = context.input;

    // Check GIF-specific limit
    if (mimeType === 'image/gif' && fileSize > this.MAX_GIF_SIZE) {
      throw new Error(`GIF files must be smaller than 5MB (received ${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
    }

    // Check general file size limit
    if (fileSize > this.MAX_FILE_SIZE) {
      throw new Error(`Photos must be smaller than 10MB (received ${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
    }

    console.log(`✅ ${this.name} | File size OK`);
  }
}
```

---

### Stage 3: StorageLimitCheckStage

**Purpose:** Check user hasn't exceeded storage quota.

**Required:** Yes (fatal if fails)

```typescript
class StorageLimitCheckStage implements PipelineStage {
  readonly name = 'storage-limit-check';
  readonly required = true;

  canExecute(context: PhotoUploadContext): boolean {
    return !!context.input.userId && context.input.fileSize > 0;
  }

  async execute(context: PhotoUploadContext): Promise<void> {
    console.log(`🔍 ${this.name} | Checking storage quota for user ${context.input.userId}`);

    // Reuse existing PhotoService method
    await PhotoService.validateStorageLimit(
      context.input.userId,
      context.input.fileSize
    );

    console.log(`✅ ${this.name} | Storage quota OK`);
  }
}
```

---

### Stage 4: PermissionCheckStage

**Purpose:** Validate user owns candidate for campaign photos.

**Required:** Yes (fatal if fails)

```typescript
class PermissionCheckStage implements PipelineStage {
  readonly name = 'permission-check';
  readonly required = true;

  canExecute(context: PhotoUploadContext): boolean {
    return !!context.input.userId;
  }

  async execute(context: PhotoUploadContext): Promise<void> {
    console.log(`🔍 ${this.name} | Checking permissions`);

    const { userId, candidateId } = context.input;

    // Reuse existing PhotoService method
    await PhotoService.validateUserPermissions(userId, candidateId);

    console.log(`✅ ${this.name} | Permissions OK`);
  }
}
```

---

### Stage 5: ExifStrippingStage

**Purpose:** Remove EXIF metadata and process image (resize, format conversion).

**Required:** Yes (fatal if fails)

```typescript
class ExifStrippingStage implements PipelineStage {
  readonly name = 'exif-stripping';
  readonly required = true;

  canExecute(context: PhotoUploadContext): boolean {
    return !!context.input.fileBuffer && !!context.processing.validatedMimeType;
  }

  async execute(context: PhotoUploadContext): Promise<void> {
    console.log(`🔍 ${this.name} | Processing image and stripping EXIF`);

    const { fileBuffer, photoType } = context.input;
    const mimeType = context.processing.validatedMimeType!;
    const isGif = mimeType === 'image/gif';

    // Get size preset for this photo type
    const preset = PhotoService.SIZE_PRESETS[photoType];

    let processedBuffer: Buffer;
    let metadata: sharp.Metadata;

    if (isGif) {
      // For GIFs: resize but keep format and animation
      const processed = sharp(fileBuffer, { animated: true })
        .rotate()  // Auto-rotate based on EXIF, then strips EXIF
        .resize(preset.width, preset.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .gif();

      processedBuffer = await processed.toBuffer();
      metadata = await sharp(processedBuffer).metadata();
    } else {
      // For static images: convert to WebP (automatically strips EXIF)
      const processed = sharp(fileBuffer)
        .rotate()  // Auto-rotate based on EXIF
        .resize(preset.width, preset.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 });

      processedBuffer = await processed.toBuffer();
      metadata = await sharp(processedBuffer).metadata();
    }

    // Store in context
    context.processing.processedBuffer = processedBuffer;
    context.processing.metadata = {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: isGif ? 'gif' : 'webp'
    };

    console.log(`✅ ${this.name} | Image processed (${metadata.width}x${metadata.height}), EXIF stripped`);
  }
}
```

---

### Stage 6: ThumbnailGenerationStage

**Purpose:** Generate thumbnail for faster loading.

**Required:** Yes (fatal if fails)

```typescript
class ThumbnailGenerationStage implements PipelineStage {
  readonly name = 'thumbnail-generation';
  readonly required = true;

  canExecute(context: PhotoUploadContext): boolean {
    return !!context.input.fileBuffer && !!context.input.photoType;
  }

  async execute(context: PhotoUploadContext): Promise<void> {
    console.log(`🔍 ${this.name} | Generating thumbnail`);

    const { fileBuffer, photoType } = context.input;
    const preset = PhotoService.SIZE_PRESETS[photoType];

    // Generate thumbnail (always WebP, even for GIFs)
    const thumbnailBuffer = await sharp(fileBuffer)
      .rotate()
      .resize(preset.thumbnailWidth, preset.thumbnailHeight, {
        fit: 'cover'
      })
      .webp({ quality: 75 })
      .toBuffer();

    context.processing.thumbnailBuffer = thumbnailBuffer;

    console.log(`✅ ${this.name} | Thumbnail generated (${preset.thumbnailWidth}x${preset.thumbnailHeight})`);
  }
}
```

---

### Stage 7: ContentModerationStage

**Purpose:** AI-based content moderation using Azure OpenAI Vision.

**Required:** No (optional - failure logged but doesn't break upload)

```typescript
class ContentModerationStage implements PipelineStage {
  readonly name = 'content-moderation';
  readonly required = false;  // Optional stage

  canExecute(context: PhotoUploadContext): boolean {
    return !!context.input.fileBuffer && !!context.input.photoType;
  }

  async execute(context: PhotoUploadContext): Promise<void> {
    console.log(`🔍 ${this.name} | Running AI content moderation`);

    const { fileBuffer, mimeType, fileSize, photoType, userId } = context.input;

    // Reuse existing PhotoService method
    const moderationResult = await PhotoService.performContentModeration(
      {
        buffer: fileBuffer,
        mimetype: mimeType,
        size: fileSize,
        originalname: context.input.filename
      } as any,
      photoType,
      userId
    );

    if (!moderationResult.approved) {
      throw new Error(moderationResult.reason || 'Content moderation failed');
    }

    context.processing.moderationResult = {
      approved: true,
      category: moderationResult.category,
      confidence: moderationResult.confidence
    };

    console.log(`✅ ${this.name} | Content approved (${moderationResult.category})`);
  }
}
```

---

### Stage 8: AzureUploadStage

**Purpose:** Upload processed image and thumbnail to Azure Blob Storage.

**Required:** Yes (fatal if fails)

```typescript
class AzureUploadStage implements PipelineStage {
  readonly name = 'azure-upload';
  readonly required = true;

  canExecute(context: PhotoUploadContext): boolean {
    return !!context.processing.processedBuffer &&
           !!context.processing.thumbnailBuffer &&
           !!context.processing.metadata;
  }

  async execute(context: PhotoUploadContext): Promise<void> {
    console.log(`🔍 ${this.name} | Uploading to Azure Blob Storage`);

    const { photoType, filename } = context.input;
    const { processedBuffer, thumbnailBuffer, metadata } = context.processing;

    // Generate blob filenames
    const baseFilename = `${uuidv4()}-${photoType.toLowerCase()}`;
    const ext = metadata!.format === 'gif' ? 'gif' : 'webp';
    const photoFilename = `${baseFilename}.${ext}`;
    const thumbnailFilename = `${baseFilename}-thumb.webp`;

    const mimeType = metadata!.format === 'gif' ? 'image/gif' : 'image/webp';

    // Upload main photo
    const photoUrl = await AzureBlobService.uploadFile(
      processedBuffer!,
      photoFilename,
      mimeType,
      'photos'
    );

    // Upload thumbnail
    const thumbnailUrl = await AzureBlobService.uploadFile(
      thumbnailBuffer!,
      thumbnailFilename,
      'image/webp',
      'thumbnails'
    );

    context.processing.azureUrls = {
      photoUrl,
      thumbnailUrl
    };

    console.log(`✅ ${this.name} | Uploaded to Azure: ${photoUrl}`);
  }
}
```

---

### Stage 9: DatabaseSaveStage

**Purpose:** Create database record for uploaded photo.

**Required:** Yes (fatal if fails)

```typescript
class DatabaseSaveStage implements PipelineStage {
  readonly name = 'database-save';
  readonly required = true;

  canExecute(context: PhotoUploadContext): boolean {
    return !!context.processing.azureUrls && !!context.processing.metadata;
  }

  async execute(context: PhotoUploadContext): Promise<void> {
    console.log(`🔍 ${this.name} | Saving to database`);

    const { userId, candidateId, filename, photoType, purpose, caption, gallery, fileSize } = context.input;
    const { azureUrls, metadata, processedBuffer } = context.processing;

    // Create database record
    const photo = await prisma.photo.create({
      data: {
        userId,
        candidateId,
        filename,
        url: azureUrls!.photoUrl,
        thumbnailUrl: azureUrls!.thumbnailUrl,
        photoType,
        purpose,
        gallery: gallery || (photoType === 'GALLERY' ? 'My Photos' : null),
        caption,
        originalSize: fileSize,
        compressedSize: processedBuffer!.length,
        width: metadata!.width,
        height: metadata!.height,
        mimeType: metadata!.format === 'gif' ? 'image/gif' : 'image/webp',
        isApproved: PhotoService.shouldAutoApprove(photoType, userId)
      }
    });

    // Update profile avatar if needed
    if (photoType === 'AVATAR') {
      await PhotoService.updateProfileAvatar(userId, photo.url, candidateId);
    }

    context.processing.photoRecord = {
      id: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl!,
      width: photo.width,
      height: photo.height
    };

    console.log(`✅ ${this.name} | Photo record created: ${photo.id}`);
  }
}
```

---

## Pipeline Executor Design

### PipelineExecutor Class

**Purpose:** Orchestrates execution of all stages.

```typescript
class PhotoUploadPipelineExecutor {
  private stages: PipelineStage[] = [];

  /**
   * Register a stage to the pipeline
   * Stages execute in registration order
   */
  registerStage(stage: PipelineStage): void {
    this.stages.push(stage);
    console.log(`📋 Pipeline | Registered stage: ${stage.name} (${stage.required ? 'required' : 'optional'})`);
  }

  /**
   * Execute all registered stages in order
   */
  async execute(input: PhotoUploadContext['input']): Promise<PipelineResult> {
    // Initialize context
    const context: PhotoUploadContext = {
      input,
      processing: {},
      metrics: {
        stageTimings: new Map(),
        startTime: Date.now()
      },
      errors: []
    };

    console.log('\n🚀 Pipeline | Starting photo upload pipeline');
    console.log(`📸 Pipeline | Processing ${input.photoType} for user ${input.userId}`);

    let success = true;

    // Execute each stage
    for (const stage of this.stages) {
      const stageStart = Date.now();

      try {
        // Check if stage can execute
        if (!stage.canExecute(context)) {
          console.log(`⏭️ Pipeline | Skipping ${stage.name} (preconditions not met)`);
          continue;
        }

        console.log(`▶️ Pipeline | Executing ${stage.name}...`);

        // Execute stage
        await stage.execute(context);

        // Record timing
        const duration = Date.now() - stageStart;
        context.metrics.stageTimings.set(stage.name, duration);
        console.log(`⏱️ Pipeline | ${stage.name} completed in ${duration}ms`);

      } catch (error: any) {
        const duration = Date.now() - stageStart;
        context.metrics.stageTimings.set(stage.name, duration);

        console.error(`❌ Pipeline | ${stage.name} failed after ${duration}ms:`, error.message);

        // Record error
        context.errors.push({
          stage: stage.name,
          error,
          fatal: stage.required
        });

        // If required stage fails, stop pipeline
        if (stage.required) {
          console.error(`🛑 Pipeline | FATAL ERROR - Required stage failed, stopping pipeline`);
          success = false;
          break;
        } else {
          console.warn(`⚠️ Pipeline | Optional stage failed, continuing pipeline`);
        }
      } finally {
        // Cleanup if stage implements it
        if (stage.cleanup) {
          try {
            await stage.cleanup(context);
          } catch (cleanupError) {
            console.error(`⚠️ Pipeline | Cleanup failed for ${stage.name}:`, cleanupError);
          }
        }
      }
    }

    // Finalize metrics
    context.metrics.endTime = Date.now();
    context.metrics.totalDuration = context.metrics.endTime - context.metrics.startTime;

    // Build result
    const result: PipelineResult = {
      success: success && !!context.processing.photoRecord,
      photo: context.processing.photoRecord,
      errors: context.errors.map(e => ({
        stage: e.stage,
        message: e.error.message,
        fatal: e.fatal
      })),
      metrics: {
        totalDuration: context.metrics.totalDuration!,
        stageTimings: Array.from(context.metrics.stageTimings.entries()).map(([stage, duration]) => ({
          stage,
          duration
        }))
      },
      context: process.env.NODE_ENV === 'development' ? context : undefined
    };

    if (result.success) {
      console.log(`✅ Pipeline | Upload completed successfully in ${result.metrics.totalDuration}ms`);
    } else {
      console.error(`❌ Pipeline | Upload failed after ${result.metrics.totalDuration}ms`);
    }

    return result;
  }
}
```

---

## Configuration Design

### Feature Flags for Enabling/Disabling Stages

**Purpose:** Allow runtime control of which stages execute without code changes.

```typescript
interface PipelineConfiguration {
  stages: {
    fileValidation: { enabled: boolean };
    fileSizeCheck: { enabled: boolean };
    storageLimitCheck: { enabled: boolean };
    permissionCheck: { enabled: boolean };
    exifStripping: { enabled: boolean };
    thumbnailGeneration: { enabled: boolean };
    contentModeration: {
      enabled: boolean;
      skipInDevelopment?: boolean;  // Skip AI calls in dev
    };
    azureUpload: { enabled: boolean };
    databaseSave: { enabled: boolean };
  };

  // Future: Per-photo-type configuration
  photoTypeOverrides?: {
    [key in PhotoType]?: {
      skipStages?: string[];  // Stage names to skip
      additionalStages?: string[];  // Stage names to add
    };
  };
}
```

**Default Configuration:**

```typescript
const DEFAULT_PIPELINE_CONFIG: PipelineConfiguration = {
  stages: {
    fileValidation: { enabled: true },
    fileSizeCheck: { enabled: true },
    storageLimitCheck: { enabled: true },
    permissionCheck: { enabled: true },
    exifStripping: { enabled: true },
    thumbnailGeneration: { enabled: true },
    contentModeration: {
      enabled: true,
      skipInDevelopment: true  // Save API costs in dev
    },
    azureUpload: { enabled: true },
    databaseSave: { enabled: true }
  }
};
```

**Configuration Loading:**

```typescript
class PipelineConfigurationService {
  private static config: PipelineConfiguration = DEFAULT_PIPELINE_CONFIG;

  /**
   * Load configuration from environment or database
   */
  static async loadConfiguration(): Promise<void> {
    // Future: Load from database or environment variables
    // For now, use default
    console.log('📋 Pipeline Config | Using default configuration');
  }

  /**
   * Check if stage is enabled
   */
  static isStageEnabled(stageName: string): boolean {
    const stageConfig = (this.config.stages as any)[stageName];
    if (!stageConfig) return true;  // Unknown stages default to enabled

    // Handle skipInDevelopment flag
    if (stageName === 'contentModeration' &&
        stageConfig.skipInDevelopment &&
        process.env.NODE_ENV === 'development') {
      return false;
    }

    return stageConfig.enabled;
  }

  /**
   * Update configuration at runtime
   */
  static updateConfiguration(updates: Partial<PipelineConfiguration>): void {
    this.config = {
      ...this.config,
      ...updates,
      stages: {
        ...this.config.stages,
        ...updates.stages
      }
    };
    console.log('📋 Pipeline Config | Configuration updated');
  }
}
```

---

## Pipeline Factory

**Purpose:** Build configured pipeline executor.

```typescript
class PhotoUploadPipelineFactory {
  /**
   * Create pipeline executor with all enabled stages
   */
  static async createPipeline(): Promise<PhotoUploadPipelineExecutor> {
    await PipelineConfigurationService.loadConfiguration();

    const executor = new PhotoUploadPipelineExecutor();

    // Register stages in order (if enabled)

    if (PipelineConfigurationService.isStageEnabled('fileValidation')) {
      executor.registerStage(new FileValidationStage());
    }

    if (PipelineConfigurationService.isStageEnabled('fileSizeCheck')) {
      executor.registerStage(new FileSizeCheckStage());
    }

    if (PipelineConfigurationService.isStageEnabled('storageLimitCheck')) {
      executor.registerStage(new StorageLimitCheckStage());
    }

    if (PipelineConfigurationService.isStageEnabled('permissionCheck')) {
      executor.registerStage(new PermissionCheckStage());
    }

    if (PipelineConfigurationService.isStageEnabled('exifStripping')) {
      executor.registerStage(new ExifStrippingStage());
    }

    if (PipelineConfigurationService.isStageEnabled('thumbnailGeneration')) {
      executor.registerStage(new ThumbnailGenerationStage());
    }

    if (PipelineConfigurationService.isStageEnabled('contentModeration')) {
      executor.registerStage(new ContentModerationStage());
    }

    if (PipelineConfigurationService.isStageEnabled('azureUpload')) {
      executor.registerStage(new AzureUploadStage());
    }

    if (PipelineConfigurationService.isStageEnabled('databaseSave')) {
      executor.registerStage(new DatabaseSaveStage());
    }

    return executor;
  }
}
```

---

## Usage Example

**How PhotoService would use the pipeline:**

```typescript
// In PhotoService.processAndUploadPhoto()
static async processAndUploadPhoto(options: {
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
  fileSize: number;
  userId: string;
  photoType: PhotoType;
  purpose: PhotoPurpose;
  caption?: string;
  gallery?: string;
  candidateId?: string;
}): Promise<{
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}> {
  // Create pipeline
  const pipeline = await PhotoUploadPipelineFactory.createPipeline();

  // Execute pipeline
  const result = await pipeline.execute(options);

  // Handle result
  if (!result.success) {
    const fatalError = result.errors.find(e => e.fatal);
    throw new Error(fatalError?.message || 'Photo upload failed');
  }

  return result.photo!;
}
```

---

## Adding New Stages (Example)

### Example: WatermarkStage (Future Enhancement)

```typescript
class WatermarkStage implements PipelineStage {
  readonly name = 'watermark';
  readonly required = false;  // Optional feature

  canExecute(context: PhotoUploadContext): boolean {
    return !!context.processing.processedBuffer &&
           context.input.photoType === 'CAMPAIGN';  // Only campaign photos
  }

  async execute(context: PhotoUploadContext): Promise<void> {
    console.log(`🔍 ${this.name} | Adding watermark`);

    const buffer = context.processing.processedBuffer!;

    // Add watermark using Sharp
    const watermarkedBuffer = await sharp(buffer)
      .composite([{
        input: await this.loadWatermarkImage(),
        gravity: 'southeast'
      }])
      .toBuffer();

    // Replace processed buffer
    context.processing.processedBuffer = watermarkedBuffer;

    console.log(`✅ ${this.name} | Watermark added`);
  }

  private async loadWatermarkImage(): Promise<Buffer> {
    // Load watermark from assets
    return Buffer.from('...');  // Implementation details
  }
}

// Register in factory:
if (PipelineConfigurationService.isStageEnabled('watermark')) {
  executor.registerStage(new WatermarkStage());
}
```

---

## Migration Path (Phase 2 → Phase 3)

### Step 1: Keep Current Implementation Working

Phase 2 ships with monolithic `processAndUploadPhoto()` method. This works and is tested.

### Step 2: Implement Pipeline in Parallel

Create new files without modifying existing code:
- `backend/src/services/photoUploadPipeline/executor.ts`
- `backend/src/services/photoUploadPipeline/stages/*.ts`
- `backend/src/services/photoUploadPipeline/config.ts`
- `backend/src/services/photoUploadPipeline/factory.ts`

### Step 3: Add Feature Flag

```typescript
const USE_PIPELINE_ARCHITECTURE = process.env.PHOTO_UPLOAD_PIPELINE === 'true';

static async processAndUploadPhoto(options: ...): Promise<...> {
  if (USE_PIPELINE_ARCHITECTURE) {
    // New pipeline implementation
    const pipeline = await PhotoUploadPipelineFactory.createPipeline();
    const result = await pipeline.execute(options);
    // ... handle result
  } else {
    // Old monolithic implementation (Phase 2)
    // ... existing code
  }
}
```

### Step 4: Test Pipeline in Staging

Deploy with `PHOTO_UPLOAD_PIPELINE=true` to staging. Test all scenarios.

### Step 5: Deploy to Production with Flag Off

Deploy to production with `PHOTO_UPLOAD_PIPELINE=false`. Pipeline code exists but isn't used yet.

### Step 6: Enable Pipeline in Production

Set `PHOTO_UPLOAD_PIPELINE=true` in production after monitoring staging for 48 hours.

### Step 7: Delete Old Code

After 1 week of successful pipeline usage, delete monolithic implementation.

---

## Performance Expectations

### Timing Breakdown (10MB photo)

| Stage | Expected Duration | Notes |
|-------|------------------|-------|
| File Validation | 1-5 ms | Magic bytes check very fast |
| File Size Check | <1 ms | Simple comparison |
| Storage Limit Check | 10-50 ms | Database query |
| Permission Check | 10-50 ms | Database query (can combine with above) |
| EXIF Stripping | 500-1500 ms | Sharp processing (CPU bound) |
| Thumbnail Generation | 200-500 ms | Sharp processing |
| Content Moderation | 1000-3000 ms | Azure API call |
| Azure Upload | 2000-5000 ms | Network transfer |
| Database Save | 20-100 ms | Database insert |
| **TOTAL** | **4-10 seconds** | Acceptable for 10MB file |

### Optimization Opportunities

1. **Parallel Execution:** EXIF stripping and thumbnail generation could run in parallel (both process same input buffer)
2. **Database Query Batching:** Storage limit + permission check could be single query
3. **Content Moderation Async:** Optional stage could be async (upload first, moderate after)

---

## Testing Strategy

### Unit Tests (Per Stage)

```typescript
describe('FileValidationStage', () => {
  it('should validate JPEG magic bytes', async () => {
    const context = createMockContext({
      fileBuffer: Buffer.from([0xFF, 0xD8, 0xFF, ...]),
      mimeType: 'image/jpeg'
    });

    const stage = new FileValidationStage();
    await stage.execute(context);

    expect(context.processing.validatedMimeType).toBe('image/jpeg');
  });

  it('should reject file with wrong magic bytes', async () => {
    const context = createMockContext({
      fileBuffer: Buffer.from([0x00, 0x00, 0x00, ...]),
      mimeType: 'image/jpeg'
    });

    const stage = new FileValidationStage();

    await expect(stage.execute(context)).rejects.toThrow('Invalid image file');
  });
});
```

### Integration Tests (Full Pipeline)

```typescript
describe('PhotoUploadPipeline', () => {
  it('should process valid JPEG upload end-to-end', async () => {
    const pipeline = await PhotoUploadPipelineFactory.createPipeline();

    const result = await pipeline.execute({
      fileBuffer: validJpegBuffer,
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024 * 1024,  // 1MB
      userId: 'test-user',
      photoType: 'GALLERY',
      purpose: 'PERSONAL'
    });

    expect(result.success).toBe(true);
    expect(result.photo).toBeDefined();
    expect(result.errors).toHaveLength(0);
    expect(result.metrics.totalDuration).toBeLessThan(10000);  // <10s
  });

  it('should handle optional stage failure gracefully', async () => {
    // Mock content moderation to fail
    jest.spyOn(PhotoService, 'performContentModeration').mockRejectedValue(
      new Error('AI service unavailable')
    );

    const pipeline = await PhotoUploadPipelineFactory.createPipeline();
    const result = await pipeline.execute(validInput);

    // Upload should still succeed (moderation is optional)
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].fatal).toBe(false);
    expect(result.errors[0].stage).toBe('content-moderation');
  });
});
```

---

## Metrics Collection

**Logged Metrics Per Upload:**

```typescript
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "photoType": "GALLERY",
  "success": true,
  "totalDuration": 5432,  // ms
  "stages": {
    "file-validation": { "duration": 2, "success": true },
    "file-size-check": { "duration": 1, "success": true },
    "storage-limit-check": { "duration": 45, "success": true },
    "permission-check": { "duration": 32, "success": true },
    "exif-stripping": { "duration": 1234, "success": true },
    "thumbnail-generation": { "duration": 456, "success": true },
    "content-moderation": { "duration": 2345, "success": true },
    "azure-upload": { "duration": 1289, "success": true },
    "database-save": { "duration": 28, "success": true }
  }
}
```

**Future: Analytics Dashboard**

- Average upload time per photo type
- Stage failure rates
- Content moderation rejection rate
- Storage usage trends

---

## Summary

### Phase 2 (Current/Immediate)
- Monolithic `processAndUploadPhoto()` method
- All logic in one function
- **Goal: Get it working**

### Phase 3 (Refactor Target - This Document)
- Pipeline architecture with independent stages
- Configuration-based stage enabling/disabling
- Metrics collection built-in
- Easy to add new stages (watermarking, face detection, etc.)
- **Goal: Make it maintainable and extensible**

### Benefits of Pipeline Architecture

1. **Separation of Concerns:** Each stage has single responsibility
2. **Testability:** Each stage tested independently
3. **Extensibility:** Add new stages without modifying existing code
4. **Observability:** Built-in metrics and timing per stage
5. **Reliability:** Optional stages fail gracefully
6. **Maintainability:** Clear execution flow, easy to debug

---

**Pipeline Architecture Design Status:** ✅ COMPLETE

This is the target architecture for Phase 3 refactoring. Phase 2 will ship the minimal working version, then we refactor to this pipeline architecture.
