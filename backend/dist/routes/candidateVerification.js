"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const candidateReportService_1 = require("../services/candidateReportService");
const storage_blob_1 = require("@azure/storage-blob");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
        }
        cb(null, true);
    }
});
// Azure Blob Storage setup
const blobServiceClient = process.env.AZURE_STORAGE_CONNECTION_STRING
    ? storage_blob_1.BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
    : null;
const containerName = 'candidate-documents';
// Middleware to check if user is a candidate
const requireCandidate = async (req, res, next) => {
    const candidate = await prisma_1.prisma.candidate.findUnique({
        where: { userId: req.user.id }
    });
    if (!candidate) {
        return res.status(403).json({ error: 'Access denied' });
    }
    req.candidate = candidate;
    next();
};
// Get verification status for current candidate
router.get('/status', auth_1.requireAuth, requireCandidate, async (req, res) => {
    try {
        const candidate = req.candidate;
        const documents = await prisma_1.prisma.candidateVerificationDocument.findMany({
            where: { candidateId: candidate.id },
            orderBy: { uploadedAt: 'desc' }
        });
        res.json({
            verificationStatus: candidate.verificationStatus,
            lastVerificationDate: candidate.lastVerificationDate,
            nextVerificationDue: candidate.nextVerificationDue,
            thirdPartyVerification: candidate.thirdPartyVerification,
            documents: documents.map(doc => ({
                id: doc.id,
                type: doc.documentType,
                uploadedAt: doc.uploadedAt,
                verifiedAt: doc.verifiedAt,
                isValid: doc.isValid,
                expiresAt: doc.expiresAt
            }))
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.candidate?.id }, 'Get verification status error');
        res.status(500).json({ error: 'Failed to retrieve verification status' });
    }
});
// Upload verification document
router.post('/documents', auth_1.requireAuth, requireCandidate, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        if (!blobServiceClient) {
            return res.status(500).json({ error: 'Storage service not configured' });
        }
        const { documentType } = req.body;
        const candidate = req.candidate;
        if (!documentType) {
            return res.status(400).json({ error: 'Document type is required' });
        }
        // Upload to Azure Blob Storage
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists({ access: 'blob' });
        const blobName = `${candidate.id}/${documentType}_${(0, uuid_1.v4)()}_${req.file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        // SECURITY: Force download for PDFs to prevent XSS attacks, allow inline for images
        const isPDF = req.file.mimetype === 'application/pdf';
        const contentDisposition = isPDF ? 'attachment' : 'inline';
        await blockBlobClient.upload(req.file.buffer, req.file.size, {
            blobHTTPHeaders: {
                blobContentType: req.file.mimetype,
                blobContentDisposition: contentDisposition,
                blobCacheControl: 'private, max-age=86400' // 24 hour cache (sensitive documents)
            }
        });
        const documentUrl = blockBlobClient.url;
        // Check if this is a response to a document request
        const existingRequest = await prisma_1.prisma.candidateVerificationDocument.findFirst({
            where: {
                candidateId: candidate.id,
                documentType,
                documentUrl: '',
                requestedAt: { not: null }
            },
            orderBy: { requestedAt: 'desc' }
        });
        let document;
        if (existingRequest) {
            // Update the existing request
            document = await prisma_1.prisma.candidateVerificationDocument.update({
                where: { id: existingRequest.id },
                data: {
                    documentUrl,
                    documentName: req.file.originalname,
                    uploadedAt: new Date()
                }
            });
        }
        else {
            // Create new document record
            document = await prisma_1.prisma.candidateVerificationDocument.create({
                data: {
                    candidateId: candidate.id,
                    documentType,
                    documentUrl,
                    documentName: req.file.originalname
                }
            });
        }
        // Update candidate verification status
        await prisma_1.prisma.candidate.update({
            where: { id: candidate.id },
            data: {
                verificationStatus: 'DOCUMENTS_SUBMITTED'
            }
        });
        res.json({
            message: 'Document uploaded successfully',
            documentId: document.id,
            documentType: document.documentType
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.candidate?.id, documentType: req.body.documentType }, 'Document upload error');
        res.status(500).json({ error: 'Failed to upload document' });
    }
});
// Get requested documents for current candidate
router.get('/requested-documents', auth_1.requireAuth, requireCandidate, async (req, res) => {
    try {
        const candidate = req.candidate;
        const requestedDocs = await prisma_1.prisma.candidateVerificationDocument.findMany({
            where: {
                candidateId: candidate.id,
                requestedAt: { not: null },
                uploadedAt: null
            },
            orderBy: { requestedAt: 'desc' }
        });
        res.json({
            requestedDocuments: requestedDocs.map(doc => ({
                id: doc.id,
                documentType: doc.documentType,
                requestedAt: doc.requestedAt,
                requestedBy: doc.requestedBy
            }))
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.candidate?.id }, 'Get requested documents error');
        res.status(500).json({ error: 'Failed to retrieve requested documents' });
    }
});
// Admin routes
const requireAdmin = async (req, res, next) => {
    if (!req.user?.isAdmin) {
        // Role info logged server-side only
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};
// Get candidates due for monthly verification
router.get('/admin/due-verification', auth_1.requireStagingAuth, requireAdmin, async (req, res) => {
    try {
        const candidates = await candidateReportService_1.CandidateReportService.getCandidatesDueForVerification();
        const firstMonday = getFirstMondayOfMonth();
        const secondMonday = getSecondMondayOfMonth();
        const today = new Date();
        const categorized = {
            neverVerified: candidates.filter(c => !c.lastVerificationDate),
            overdue: candidates.filter(c => c.nextVerificationDue && c.nextVerificationDue < today),
            dueSoon: candidates.filter(c => c.nextVerificationDue &&
                c.nextVerificationDue >= today &&
                c.nextVerificationDue <= secondMonday),
            withinGracePeriod: candidates.filter(c => c.nextVerificationDue &&
                c.nextVerificationDue > firstMonday &&
                c.nextVerificationDue <= secondMonday &&
                today > firstMonday)
        };
        res.json(categorized);
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Get verification due candidates error');
        res.status(500).json({ error: 'Failed to retrieve candidates' });
    }
});
// Request documents from a candidate
router.post('/admin/request-documents', auth_1.requireStagingAuth, requireAdmin, async (req, res) => {
    try {
        const { candidateId, documentTypes } = req.body;
        if (!candidateId || !documentTypes || !Array.isArray(documentTypes)) {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }
        const documents = await candidateReportService_1.CandidateReportService.requestVerificationDocuments(candidateId, req.user.id, documentTypes);
        res.json({
            message: 'Document request sent successfully',
            documentsRequested: documents.length
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.body.candidateId, adminId: req.user?.id }, 'Request documents error');
        res.status(500).json({ error: 'Failed to request documents' });
    }
});
// Verify a submitted document
router.post('/admin/verify-document', auth_1.requireStagingAuth, requireAdmin, async (req, res) => {
    try {
        const { documentId, isValid, notes } = req.body;
        const document = await prisma_1.prisma.candidateVerificationDocument.update({
            where: { id: documentId },
            data: {
                verifiedAt: new Date(),
                verifiedBy: req.user.id,
                isValid,
                verificationNotes: notes
            }
        });
        // Check if all required documents are verified
        const candidate = await prisma_1.prisma.candidate.findUnique({
            where: { id: document.candidateId },
            include: {
                verificationDocuments: true
            }
        });
        if (candidate) {
            const allDocsVerified = candidate.verificationDocuments.every(doc => doc.verifiedAt);
            const hasInvalidDocs = candidate.verificationDocuments.some(doc => doc.isValid === false);
            let verificationStatus = candidate.verificationStatus;
            if (hasInvalidDocs) {
                verificationStatus = 'VERIFICATION_FAILED';
            }
            else if (allDocsVerified) {
                verificationStatus = 'VERIFIED';
            }
            // Update candidate verification status and next due date
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const nextVerificationDue = getFirstMondayOfMonth(nextMonth);
            await prisma_1.prisma.candidate.update({
                where: { id: candidate.id },
                data: {
                    verificationStatus,
                    lastVerificationDate: allDocsVerified ? new Date() : undefined,
                    nextVerificationDue: allDocsVerified ? nextVerificationDue : undefined
                }
            });
        }
        res.json({
            message: 'Document verified successfully',
            documentId: document.id,
            isValid: document.isValid
        });
    }
    catch (error) {
        logger_1.logger.error({ error, documentId: req.body.documentId, adminId: req.user?.id }, 'Verify document error');
        res.status(500).json({ error: 'Failed to verify document' });
    }
});
// Helper functions
function getFirstMondayOfMonth(date = new Date()) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    while (firstDay.getDay() !== 1) {
        firstDay.setDate(firstDay.getDate() + 1);
    }
    return firstDay;
}
function getSecondMondayOfMonth(date = new Date()) {
    const firstMonday = getFirstMondayOfMonth(date);
    const secondMonday = new Date(firstMonday);
    secondMonday.setDate(secondMonday.getDate() + 7);
    return secondMonday;
}
exports.default = router;
//# sourceMappingURL=candidateVerification.js.map