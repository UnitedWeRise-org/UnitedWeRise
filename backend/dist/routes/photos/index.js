"use strict";
/**
 * Layer 2: Photo Upload with File Validation
 *
 * Purpose: Add comprehensive file validation to photo uploads
 * Features: Authentication + File Validation + File Transport
 * Layers:
 *   - Layer 0: Basic file transport ✅
 *   - Layer 1: Authentication ✅
 *   - Layer 2: File validation ✅
 * Logging: Every step logs with requestId for tracing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const storage_blob_1 = require("@azure/storage-blob");
const uuid_1 = require("uuid");
const auth_1 = require("../../middleware/auth");
const router = express_1.default.Router();
// Layer 2: File validation constants
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_FILE_SIZE = 100; // 100 bytes (prevents empty files)
const MAX_DIMENSION = 8000; // 8000px max width/height
const MIN_DIMENSION = 10; // 10px min width/height
// File signature validation (magic numbers)
const FILE_SIGNATURES = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]] // "RIFF" header
};
// Configure Multer for memory storage (5MB limit for safety)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});
// Structured logging helper (stderr = unbuffered, shows immediately)
const log = (requestId, stage, data = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        stage,
        ...data
    };
    process.stderr.write(JSON.stringify(logEntry) + '\n');
};
// Layer 2: File validation helper
const validateFileSignature = (buffer, mimeType) => {
    const signatures = FILE_SIGNATURES[mimeType];
    if (!signatures)
        return false;
    for (const signature of signatures) {
        let matches = true;
        for (let i = 0; i < signature.length; i++) {
            if (buffer[i] !== signature[i]) {
                matches = false;
                break;
            }
        }
        if (matches)
            return true;
    }
    return false;
};
// Layer 2: Extract image dimensions from buffer
const getImageDimensions = (buffer, mimeType) => {
    try {
        if (mimeType === 'image/png') {
            // PNG: dimensions at bytes 16-23 (big-endian)
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            return { width, height };
        }
        else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            // JPEG: scan for SOF marker (0xFFC0, 0xFFC1, 0xFFC2)
            let offset = 2;
            while (offset < buffer.length - 8) {
                if (buffer[offset] === 0xFF) {
                    const marker = buffer[offset + 1];
                    if (marker >= 0xC0 && marker <= 0xC2) {
                        const height = buffer.readUInt16BE(offset + 5);
                        const width = buffer.readUInt16BE(offset + 7);
                        return { width, height };
                    }
                    const segmentLength = buffer.readUInt16BE(offset + 2);
                    offset += segmentLength + 2;
                }
                else {
                    offset++;
                }
            }
        }
        else if (mimeType === 'image/gif') {
            // GIF: dimensions at bytes 6-9 (little-endian)
            const width = buffer.readUInt16LE(6);
            const height = buffer.readUInt16LE(8);
            return { width, height };
        }
        else if (mimeType === 'image/webp') {
            // WebP: check for VP8/VP8L/VP8X chunks
            if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
                const chunkType = buffer.toString('ascii', 12, 16);
                if (chunkType === 'VP8 ') {
                    // Lossy WebP
                    const width = buffer.readUInt16LE(26) & 0x3fff;
                    const height = buffer.readUInt16LE(28) & 0x3fff;
                    return { width, height };
                }
                else if (chunkType === 'VP8L') {
                    // Lossless WebP
                    const bits = buffer.readUInt32LE(21);
                    const width = ((bits & 0x3FFF) + 1);
                    const height = (((bits >> 14) & 0x3FFF) + 1);
                    return { width, height };
                }
                else if (chunkType === 'VP8X') {
                    // Extended WebP
                    const width = (buffer.readUIntLE(24, 3) + 1);
                    const height = (buffer.readUIntLE(27, 3) + 1);
                    return { width, height };
                }
            }
        }
    }
    catch (error) {
        return null;
    }
    return null;
};
/**
 * POST /api/photos/upload
 *
 * Layer 2: Validated upload endpoint
 * - ✅ JWT authentication (Layer 1)
 * - ✅ File validation (Layer 2)
 * - NO processing (coming in Layers 3-4)
 * - Flow: Auth → Validate → File → Azure Blob → Return URL
 */
router.post('/upload', auth_1.requireAuth, upload.single('photo'), async (req, res) => {
    const requestId = (0, uuid_1.v4)();
    log(requestId, 'REQUEST_RECEIVED', {
        userId: req.user?.id,
        hasFile: !!req.file,
        fileSize: req.file?.size,
        mimeType: req.file?.mimetype,
        fileName: req.file?.originalname
    });
    // Layer 1: Authentication validation
    if (!req.user) {
        log(requestId, 'AUTH_FAILED', { reason: 'no_user_in_request' });
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            requestId
        });
    }
    log(requestId, 'AUTH_VERIFIED', { userId: req.user.id, username: req.user.username });
    try {
        // Step 1: Validate file exists
        if (!req.file) {
            log(requestId, 'VALIDATION_FAILED', { reason: 'no_file' });
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                requestId
            });
        }
        log(requestId, 'FILE_RECEIVED', {
            size: req.file.size,
            type: req.file.mimetype
        });
        // Layer 2: File size validation
        if (req.file.size < MIN_FILE_SIZE) {
            log(requestId, 'VALIDATION_FAILED', { reason: 'file_too_small', size: req.file.size });
            return res.status(400).json({
                success: false,
                error: `File too small. Minimum size is ${MIN_FILE_SIZE} bytes.`,
                requestId
            });
        }
        if (req.file.size > MAX_FILE_SIZE) {
            log(requestId, 'VALIDATION_FAILED', { reason: 'file_too_large', size: req.file.size });
            return res.status(400).json({
                success: false,
                error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
                requestId
            });
        }
        // Layer 2: MIME type validation
        if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
            log(requestId, 'VALIDATION_FAILED', { reason: 'invalid_mime_type', mimeType: req.file.mimetype });
            return res.status(400).json({
                success: false,
                error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
                requestId
            });
        }
        // Layer 2: File extension validation
        const fileExtension = (req.file.originalname.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
            log(requestId, 'VALIDATION_FAILED', { reason: 'invalid_extension', extension: fileExtension });
            return res.status(400).json({
                success: false,
                error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
                requestId
            });
        }
        // Layer 2: File signature validation (magic numbers)
        if (!validateFileSignature(req.file.buffer, req.file.mimetype)) {
            log(requestId, 'VALIDATION_FAILED', {
                reason: 'invalid_signature',
                mimeType: req.file.mimetype,
                firstBytes: Array.from(req.file.buffer.slice(0, 8))
            });
            return res.status(400).json({
                success: false,
                error: 'File signature does not match declared type. File may be corrupted or misnamed.',
                requestId
            });
        }
        // Layer 2: Image dimension validation
        const dimensions = getImageDimensions(req.file.buffer, req.file.mimetype);
        if (!dimensions) {
            log(requestId, 'VALIDATION_FAILED', { reason: 'cannot_read_dimensions' });
            return res.status(400).json({
                success: false,
                error: 'Unable to read image dimensions. File may be corrupted.',
                requestId
            });
        }
        if (dimensions.width < MIN_DIMENSION || dimensions.height < MIN_DIMENSION) {
            log(requestId, 'VALIDATION_FAILED', {
                reason: 'dimensions_too_small',
                width: dimensions.width,
                height: dimensions.height
            });
            return res.status(400).json({
                success: false,
                error: `Image too small. Minimum dimensions: ${MIN_DIMENSION}x${MIN_DIMENSION}px`,
                requestId
            });
        }
        if (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION) {
            log(requestId, 'VALIDATION_FAILED', {
                reason: 'dimensions_too_large',
                width: dimensions.width,
                height: dimensions.height
            });
            return res.status(400).json({
                success: false,
                error: `Image too large. Maximum dimensions: ${MAX_DIMENSION}x${MAX_DIMENSION}px`,
                requestId
            });
        }
        log(requestId, 'VALIDATION_PASSED', {
            size: req.file.size,
            mimeType: req.file.mimetype,
            extension: fileExtension,
            dimensions: dimensions
        });
        // Step 2: Check environment variables
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        if (!connectionString || !accountName) {
            log(requestId, 'ENV_VARS_MISSING', {
                hasConnectionString: !!connectionString,
                hasAccountName: !!accountName
            });
            return res.status(500).json({
                success: false,
                error: 'Server misconfigured',
                requestId
            });
        }
        log(requestId, 'ENV_VARS_VERIFIED', { accountName });
        // Step 3: Initialize Azure Blob client
        const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient('photos');
        log(requestId, 'AZURE_CLIENT_CREATED', { container: 'photos' });
        // Step 4: Ensure container exists
        await containerClient.createIfNotExists({ access: 'blob' });
        log(requestId, 'CONTAINER_VERIFIED', { container: 'photos' });
        // Step 5: Generate unique blob name with user ID (use validated extension)
        const blobName = `${req.user.id}/${requestId}.${fileExtension}`;
        log(requestId, 'BLOB_NAME_GENERATED', { blobName, userId: req.user.id });
        // Step 6: Get blob client
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        // Step 7: Upload to Azure
        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: {
                blobContentType: req.file.mimetype
            }
        });
        log(requestId, 'AZURE_UPLOAD_SUCCESS', { blobName });
        // Step 8: Construct public URL
        const photoUrl = `https://${accountName}.blob.core.windows.net/photos/${blobName}`;
        log(requestId, 'UPLOAD_COMPLETE', {
            url: photoUrl,
            duration: Date.now() - new Date(requestId.split('-')[0]).getTime()
        });
        // Step 9: Return success with validation metadata
        return res.status(201).json({
            success: true,
            data: {
                url: photoUrl,
                blobName,
                requestId,
                size: req.file.size,
                mimeType: req.file.mimetype,
                dimensions: dimensions
            }
        });
    }
    catch (error) {
        log(requestId, 'ERROR', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        return res.status(500).json({
            success: false,
            error: error.message,
            requestId
        });
    }
});
/**
 * GET /api/photos/health
 *
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    const envCheck = {
        hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
        hasAccountName: !!process.env.AZURE_STORAGE_ACCOUNT_NAME,
        accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME
    };
    return res.json({
        status: 'ok',
        layer: 2,
        description: 'Authenticated photo upload with file validation',
        features: {
            authentication: true,
            validation: true,
            exifStripping: false,
            moderation: false,
            database: false
        },
        validation: {
            allowedTypes: ALLOWED_MIME_TYPES,
            allowedExtensions: ALLOWED_EXTENSIONS,
            maxSize: MAX_FILE_SIZE,
            minSize: MIN_FILE_SIZE,
            maxDimension: MAX_DIMENSION,
            minDimension: MIN_DIMENSION
        },
        environment: envCheck
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map