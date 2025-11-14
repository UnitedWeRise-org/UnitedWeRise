import express from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireStagingAuth, AuthRequest } from '../middleware/auth';
import { CandidateReportService } from '../services/candidateReportService';
import { BlobServiceClient } from '@azure/storage-blob';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../services/logger';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
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
  ? BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
  : null;

const containerName = 'candidate-documents';

// Middleware to check if user is a candidate
const requireCandidate = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const candidate = await prisma.candidate.findUnique({
    where: { userId: req.user!.id }
  });
  
  if (!candidate) {
    return res.status(403).json({ error: 'Must be a registered candidate' });
  }
  
  req.candidate = candidate;
  next();
};

// Get verification status for current candidate
router.get('/status', requireAuth, requireCandidate, async (req: AuthRequest, res) => {
  try {
    const candidate = req.candidate!;
    
    const documents = await prisma.candidateVerificationDocument.findMany({
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
  } catch (error) {
    logger.error({ error, candidateId: req.candidate?.id }, 'Get verification status error');
    res.status(500).json({ error: 'Failed to retrieve verification status' });
  }
});

// Upload verification document
router.post('/documents', requireAuth, requireCandidate, upload.single('document'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!blobServiceClient) {
      return res.status(500).json({ error: 'Storage service not configured' });
    }
    
    const { documentType } = req.body;
    const candidate = req.candidate!;
    
    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }
    
    // Upload to Azure Blob Storage
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists({ access: 'blob' });
    
    const blobName = `${candidate.id}/${documentType}_${uuidv4()}_${req.file.originalname}`;
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
    const existingRequest = await prisma.candidateVerificationDocument.findFirst({
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
      document = await prisma.candidateVerificationDocument.update({
        where: { id: existingRequest.id },
        data: {
          documentUrl,
          documentName: req.file.originalname,
          uploadedAt: new Date()
        }
      });
    } else {
      // Create new document record
      document = await prisma.candidateVerificationDocument.create({
        data: {
          candidateId: candidate.id,
          documentType,
          documentUrl,
          documentName: req.file.originalname
        }
      });
    }
    
    // Update candidate verification status
    await prisma.candidate.update({
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
  } catch (error) {
    logger.error({ error, candidateId: req.candidate?.id, documentType: req.body.documentType }, 'Document upload error');
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get requested documents for current candidate
router.get('/requested-documents', requireAuth, requireCandidate, async (req: AuthRequest, res) => {
  try {
    const candidate = req.candidate!;
    
    const requestedDocs = await prisma.candidateVerificationDocument.findMany({
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
  } catch (error) {
    logger.error({ error, candidateId: req.candidate?.id }, 'Get requested documents error');
    res.status(500).json({ error: 'Failed to retrieve requested documents' });
  }
});

// Admin routes
const requireAdmin = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get candidates due for monthly verification
router.get('/admin/due-verification', requireStagingAuth, requireAdmin, async (req, res) => {
  try {
    const candidates = await CandidateReportService.getCandidatesDueForVerification();
    
    const firstMonday = getFirstMondayOfMonth();
    const secondMonday = getSecondMondayOfMonth();
    const today = new Date();
    
    const categorized = {
      neverVerified: candidates.filter(c => !c.lastVerificationDate),
      overdue: candidates.filter(c => 
        c.nextVerificationDue && c.nextVerificationDue < today
      ),
      dueSoon: candidates.filter(c => 
        c.nextVerificationDue && 
        c.nextVerificationDue >= today && 
        c.nextVerificationDue <= secondMonday
      ),
      withinGracePeriod: candidates.filter(c =>
        c.nextVerificationDue &&
        c.nextVerificationDue > firstMonday &&
        c.nextVerificationDue <= secondMonday &&
        today > firstMonday
      )
    };
    
    res.json(categorized);
  } catch (error) {
    logger.error({ error }, 'Get verification due candidates error');
    res.status(500).json({ error: 'Failed to retrieve candidates' });
  }
});

// Request documents from a candidate
router.post('/admin/request-documents', requireStagingAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { candidateId, documentTypes } = req.body;
    
    if (!candidateId || !documentTypes || !Array.isArray(documentTypes)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    
    const documents = await CandidateReportService.requestVerificationDocuments(
      candidateId,
      req.user!.id,
      documentTypes
    );
    
    res.json({
      message: 'Document request sent successfully',
      documentsRequested: documents.length
    });
  } catch (error) {
    logger.error({ error, candidateId: req.body.candidateId, adminId: req.user?.id }, 'Request documents error');
    res.status(500).json({ error: 'Failed to request documents' });
  }
});

// Verify a submitted document
router.post('/admin/verify-document', requireStagingAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { documentId, isValid, notes } = req.body;
    
    const document = await prisma.candidateVerificationDocument.update({
      where: { id: documentId },
      data: {
        verifiedAt: new Date(),
        verifiedBy: req.user!.id,
        isValid,
        verificationNotes: notes
      }
    });
    
    // Check if all required documents are verified
    const candidate = await prisma.candidate.findUnique({
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
      } else if (allDocsVerified) {
        verificationStatus = 'VERIFIED';
      }
      
      // Update candidate verification status and next due date
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextVerificationDue = getFirstMondayOfMonth(nextMonth);
      
      await prisma.candidate.update({
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
  } catch (error) {
    logger.error({ error, documentId: req.body.documentId, adminId: req.user?.id }, 'Verify document error');
    res.status(500).json({ error: 'Failed to verify document' });
  }
});

// Helper functions
function getFirstMondayOfMonth(date = new Date()): Date {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  while (firstDay.getDay() !== 1) {
    firstDay.setDate(firstDay.getDate() + 1);
  }
  return firstDay;
}

function getSecondMondayOfMonth(date = new Date()): Date {
  const firstMonday = getFirstMondayOfMonth(date);
  const secondMonday = new Date(firstMonday);
  secondMonday.setDate(secondMonday.getDate() + 7);
  return secondMonday;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      candidate?: any;
    }
  }
}

export default router;