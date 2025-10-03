"use strict";
/**
 * Layer 0: Minimal Photo Upload - Pure File Transport Test
 *
 * Purpose: Prove Azure Container Apps allows multipart/form-data uploads
 * Features: NONE - just Multer → Azure Blob
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
const router = express_1.default.Router();
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
/**
 * POST /api/photos/upload
 *
 * Layer 0: Minimal upload endpoint
 * - NO authentication
 * - NO validation
 * - NO processing
 * - Just: File → Azure Blob → Return URL
 */
router.post('/upload', upload.single('photo'), async (req, res) => {
    const requestId = (0, uuid_1.v4)();
    log(requestId, 'REQUEST_RECEIVED', {
        hasFile: !!req.file,
        fileSize: req.file?.size,
        mimeType: req.file?.mimetype,
        fileName: req.file?.originalname
    });
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
        // Step 5: Generate unique blob name
        const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
        const blobName = `layer0-${requestId}.${fileExtension}`;
        log(requestId, 'BLOB_NAME_GENERATED', { blobName });
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
        // Step 9: Return success
        return res.status(201).json({
            success: true,
            data: {
                url: photoUrl,
                blobName,
                requestId,
                size: req.file.size,
                mimeType: req.file.mimetype
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
        layer: 0,
        description: 'Minimal photo upload - no auth, no validation',
        environment: envCheck
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map