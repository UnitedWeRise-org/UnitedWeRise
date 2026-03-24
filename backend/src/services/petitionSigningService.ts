/**
 * Petition Signing Service
 *
 * Core service for the Unified Digital Petition System.
 * Handles petition creation, the public signing flow, signature verification,
 * QR code generation, and petition lifecycle management.
 *
 * This service orchestrates calls to:
 * - petitionShortCodeService (URL codes)
 * - petitionAuditService (immutable audit trail)
 * - voterVerificationService (voter file checks)
 * - captchaService (bot prevention)
 */

import { Petition, PetitionSignature, PetitionStatus, PetitionCategory, IssueCategory, GeographicScope, SignatureVerificationStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from './logger';
import { petitionShortCodeService } from './petitionShortCodeService';
import { petitionAuditService, PETITION_AUDIT_ACTIONS, PETITION_ACTOR_TYPES } from './petitionAuditService';
import { voterVerificationService } from './voterVerificationService';
import { captchaService } from './captchaService';
import QRCode from 'qrcode';

// ---------------------------------------------------------------------------
// Input / Output Interfaces
// ---------------------------------------------------------------------------

/** Input data for creating a new petition */
interface CreatePetitionInput {
  /** Petition title */
  title: string;
  /** Full description of the petition purpose */
  description: string;
  /** Petition category classification */
  petitionCategory?: PetitionCategory;
  /** Issue category for topical filtering */
  category?: IssueCategory;
  /** Geographic scope of the petition */
  geographicScope?: GeographicScope;
  /** Names or titles of officials the petition targets */
  targetOfficials?: string[];
  /** Target number of signatures */
  signatureGoal?: number;
  /** JSON array of field names signers must fill out */
  requiredSignerFields?: string[];
  /** State-specific perjury/attestation language */
  declarationLanguage?: string;
  /** Whether voter registration verification is enabled */
  voterVerificationEnabled?: boolean;
  /** Party line (for ballot access petitions) */
  party?: string;
  /** Election cycle year */
  electionYear?: number;
  /** Filing deadline for the petition */
  filingDeadline?: Date;
  /** Optional custom slug for verified candidates */
  customSlug?: string;
  /** Privacy/consent text shown to signers */
  privacyConsentText?: string;
}

/** Input data for submitting a signature */
interface SignatureSubmissionInput {
  /** Signer's legal first name */
  signerFirstName: string;
  /** Signer's legal last name */
  signerLastName: string;
  /** Signer's street address */
  signerAddress?: string;
  /** Signer's city */
  signerCity?: string;
  /** Signer's state (2-letter code) */
  signerState?: string;
  /** Signer's ZIP code */
  signerZip?: string;
  /** Signer's county */
  signerCounty?: string;
  /** Signer's date of birth (ISO date string) */
  signerDateOfBirth?: string;
  /** Signer's email for follow-up */
  signerEmail?: string;
  /** Typed name confirmation (must match first+last name) */
  signatureConfirmation: string;
  /** ISO timestamp when signer affirmed attestation */
  attestedAt: string;
  /** Snapshot of the attestation language shown */
  attestationLanguageShown: string;
  /** Whether signer consented to privacy terms */
  privacyConsented: boolean;
  /** CAPTCHA verification token */
  captchaToken: string;
  /** Geolocation coordinates if signer consented */
  geolocation?: { lat: number; lng: number };
  /** Whether signer consented to geolocation collection */
  geolocationConsented?: boolean;
  /** Authenticated user ID if signed in */
  userId?: string;
}

/** Device/request metadata for a signature submission */
interface DeviceInfo {
  /** IP address of the signing device */
  ipAddress: string;
  /** User agent string from the browser */
  userAgent: string;
  /** Optional device fingerprint hash */
  deviceFingerprint?: string;
}

/** Result returned after a successful signature submission */
interface SignatureResult {
  /** Whether the signature was successfully recorded */
  success: boolean;
  /** ID of the created signature record */
  signatureId: string;
  /** Voter verification status for the signature */
  verificationStatus: SignatureVerificationStatus;
  /** Human-readable message about the verification outcome */
  verificationMessage: string;
}

/** Public-facing petition data for the signing form */
interface PetitionSigningData {
  /** Petition record (includes relations) */
  petition: Record<string, unknown>;
  /** Creator display information */
  creator: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
  /** Candidate information if this is a ballot access petition */
  candidate: {
    id: string;
    officeId: string;
    party: string | null;
  } | null;
  /** Current signature count */
  signatureCount: number;
  /** Signing URL for sharing */
  signingUrl: string;
}

/** Petition list item for creator dashboard */
interface PetitionListItem {
  /** Petition record */
  id: string;
  title: string;
  status: PetitionStatus;
  petitionCategory: PetitionCategory | null;
  signatureGoal: number | null;
  currentSignatures: number;
  shortCode: string | null;
  customSlug: string | null;
  createdAt: Date;
  /** Signing progress percentage */
  progress: number;
}

/** Detailed petition data for the creator view */
interface PetitionDetails {
  /** Full petition record */
  petition: Petition;
  /** Signature statistics */
  stats: {
    total: number;
    verified: number;
    unverified: number;
    flagged: number;
    rejected: number;
  };
  /** Signing URL */
  signingUrl: string;
}

/** Options for querying signatures */
interface SignatureQueryOptions {
  /** Page number (1-based, default: 1) */
  page?: number;
  /** Items per page (default: 50) */
  limit?: number;
  /** Filter by verification status */
  status?: SignatureVerificationStatus;
  /** Search by signer name */
  search?: string;
}

// ---------------------------------------------------------------------------
// Service Implementation
// ---------------------------------------------------------------------------

export class PetitionSigningService {
  /**
   * Create a new petition with an auto-generated short code.
   *
   * If the creator is a verified candidate, they may provide a customSlug
   * and ballot-access-specific fields (party, electionYear, filingDeadline).
   * Petitions start in DRAFT status.
   *
   * @param userId - ID of the user creating the petition
   * @param data - Petition creation input data
   * @returns The created petition record
   * @throws Error if custom slug validation fails or short code generation fails
   */
  async createPetition(userId: string, data: CreatePetitionInput): Promise<Petition> {
    // Generate short code
    const shortCode = await petitionShortCodeService.generateShortCode();

    // Validate custom slug if provided
    let customSlug: string | null = null;
    if (data.customSlug) {
      const validation = petitionShortCodeService.validateCustomSlug(data.customSlug);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid custom slug');
      }

      const available = await petitionShortCodeService.isSlugAvailable(data.customSlug);
      if (!available) {
        throw new Error('This custom slug is already in use');
      }

      customSlug = data.customSlug.trim().toLowerCase();
    }

    // Look up candidate record if user is a verified candidate
    let candidateId: string | null = null;
    if (data.petitionCategory === 'BALLOT_ACCESS') {
      const candidate = await prisma.candidate.findFirst({
        where: { userId, isVerified: true },
        select: { id: true },
      });
      if (candidate) {
        candidateId = candidate.id;
      }
    }

    try {
      const petition = await prisma.petition.create({
        data: {
          title: data.title,
          description: data.description,
          petitionCategory: data.petitionCategory || null,
          category: data.category || null,
          geographicScope: data.geographicScope || null,
          targetOfficials: data.targetOfficials || [],
          signatureGoal: data.signatureGoal || null,
          requiredSignerFields: data.requiredSignerFields
            ? (data.requiredSignerFields as unknown as Prisma.InputJsonValue)
            : undefined,
          declarationLanguage: data.declarationLanguage || null,
          voterVerificationEnabled: data.voterVerificationEnabled || false,
          party: data.party || null,
          electionYear: data.electionYear || null,
          filingDeadline: data.filingDeadline || null,
          shortCode,
          customSlug,
          candidateId,
          privacyConsentText: data.privacyConsentText || null,
          status: 'DRAFT',
          createdBy: userId,
        },
      });

      // Audit log the creation
      await petitionAuditService.logAction(
        petition.id,
        PETITION_AUDIT_ACTIONS.CREATED,
        PETITION_ACTOR_TYPES.CREATOR,
        userId,
        undefined,
        { title: data.title, petitionCategory: data.petitionCategory }
      );

      logger.info(
        { petitionId: petition.id, shortCode, userId },
        'Petition created'
      );

      return petition;
    } catch (error) {
      logger.error(
        { error, userId },
        'Failed to create petition'
      );
      throw new Error('Unable to create petition');
    }
  }

  /**
   * Publish a petition, transitioning it from DRAFT to ACTIVE status.
   *
   * Only the petition creator can publish their own petition.
   *
   * @param petitionId - ID of the petition to publish
   * @param userId - ID of the user requesting publication
   * @returns The updated petition record
   * @throws Error if petition is not found, user is not the creator, or petition is not in DRAFT status
   */
  async publishPetition(petitionId: string, userId: string): Promise<Petition> {
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    if (petition.createdBy !== userId) {
      throw new Error('Only the petition creator can publish this petition');
    }

    if (petition.status !== 'DRAFT') {
      throw new Error(`Cannot publish a petition with status: ${petition.status}`);
    }

    try {
      const updated = await prisma.petition.update({
        where: { id: petitionId },
        data: { status: 'ACTIVE' },
      });

      await petitionAuditService.logAction(
        petitionId,
        PETITION_AUDIT_ACTIONS.ACTIVATED,
        PETITION_ACTOR_TYPES.CREATOR,
        userId,
        undefined,
        { previousStatus: 'DRAFT' }
      );

      logger.info(
        { petitionId, userId },
        'Petition published (DRAFT -> ACTIVE)'
      );

      return updated;
    } catch (error) {
      logger.error(
        { error, petitionId, userId },
        'Failed to publish petition'
      );
      throw new Error('Unable to publish petition');
    }
  }

  /**
   * Get petition data for the public signing form.
   *
   * No authentication required. Returns the petition along with creator
   * and candidate information for display on the signing page.
   *
   * @param codeOrSlug - Short code or custom slug identifying the petition
   * @returns Petition signing data, or null if not found
   */
  async getPetitionForSigning(codeOrSlug: string): Promise<PetitionSigningData | null> {
    const petition = await petitionShortCodeService.resolveCode(codeOrSlug);

    if (!petition) {
      return null;
    }

    try {
      const fullPetition = await prisma.petition.findUnique({
        where: { id: petition.id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          candidate: {
            select: {
              id: true,
              officeId: true,
              party: true,
            },
          },
          _count: {
            select: { signatures: true },
          },
        },
      });

      if (!fullPetition) {
        return null;
      }

      return {
        petition: fullPetition,
        creator: fullPetition.creator,
        candidate: fullPetition.candidate || null,
        signatureCount: fullPetition._count.signatures,
        signingUrl: this.getSigningUrl(fullPetition),
      };
    } catch (error) {
      logger.error(
        { error, codeOrSlug },
        'Failed to get petition for signing'
      );
      throw new Error('Unable to load petition');
    }
  }

  /**
   * Submit a signature on a petition.
   *
   * Core signing method that handles the full signature flow:
   * 1. Validate petition is ACTIVE and not expired
   * 2. Validate required fields from petition's requiredSignerFields config
   * 3. Validate signatureConfirmation matches first + last name
   * 4. Verify CAPTCHA token via captchaService
   * 5. Check for duplicate signatures (by userId or name+address)
   * 6. If voterVerificationEnabled, call voter verification (graceful failure)
   * 7. Create PetitionSignature record with all metadata
   * 8. Increment currentSignatures atomically
   * 9. Write audit log
   * 10. Return confirmation with verification status message
   *
   * @param petitionId - ID of the petition being signed
   * @param signatureData - Signer information and confirmation data
   * @param deviceInfo - Request metadata (IP, user agent, fingerprint)
   * @returns Signature result with verification status
   * @throws Error for validation failures, duplicate signatures, or CAPTCHA failures
   */
  async submitSignature(
    petitionId: string,
    signatureData: SignatureSubmissionInput,
    deviceInfo: DeviceInfo
  ): Promise<SignatureResult> {
    // Step 1: Validate petition is ACTIVE
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    if (petition.status !== 'ACTIVE') {
      throw new Error('This petition is not currently accepting signatures');
    }

    if (petition.expiresAt && petition.expiresAt < new Date()) {
      throw new Error('This petition has expired');
    }

    // Step 2: Validate required signer fields
    const requiredFields = (petition.requiredSignerFields as string[] | null) || [];
    for (const field of requiredFields) {
      const value = (signatureData as unknown as Record<string, unknown>)[field];
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        throw new Error(`Required field missing: ${field}`);
      }
    }

    // Step 3: Validate signature confirmation matches name
    const expectedName = `${signatureData.signerFirstName} ${signatureData.signerLastName}`;
    if (
      signatureData.signatureConfirmation.trim().toLowerCase() !==
      expectedName.trim().toLowerCase()
    ) {
      throw new Error(
        'Signature confirmation does not match the name provided. Please type your full name exactly as entered above.'
      );
    }

    // Step 4: Verify CAPTCHA
    const captchaResult = await captchaService.verifyCaptcha(
      signatureData.captchaToken,
      deviceInfo.ipAddress
    );

    if (!captchaResult.success) {
      throw new Error(captchaResult.error || 'CAPTCHA verification failed');
    }

    // Step 5: Check for duplicate signatures
    if (signatureData.userId) {
      // Authenticated user duplicate check
      const existingByUser = await prisma.petitionSignature.findFirst({
        where: {
          petitionId,
          userId: signatureData.userId,
        },
        select: { id: true },
      });

      if (existingByUser) {
        throw new Error('You have already signed this petition');
      }
    } else {
      // Anonymous duplicate check: name + address exact match
      const existingByInfo = await prisma.petitionSignature.findFirst({
        where: {
          petitionId,
          signerFirstName: signatureData.signerFirstName,
          signerLastName: signatureData.signerLastName,
          signerAddress: signatureData.signerAddress || null,
        },
        select: { id: true },
      });

      if (existingByInfo) {
        throw new Error(
          'A signature with this name and address has already been recorded for this petition'
        );
      }
    }

    // Step 6: Voter verification (graceful failure)
    let verificationStatus: SignatureVerificationStatus = 'UNVERIFIED';
    let verificationMessage = 'Signature recorded successfully.';
    let voterFileMatchResult: Record<string, unknown> | null = null;
    let voterFileId: string | null = null;

    if (petition.voterVerificationEnabled) {
      const canVerify =
        signatureData.signerState &&
        signatureData.signerFirstName &&
        signatureData.signerLastName &&
        signatureData.signerAddress &&
        signatureData.signerCity &&
        signatureData.signerZip;

      if (canVerify) {
        try {
          const serviceAvailable = await voterVerificationService.isAvailable();

          if (!serviceAvailable) {
            // Service unavailable — record as unverified, log to audit
            verificationMessage =
              'Signature recorded. Voter registration verification is currently unavailable.';

            await petitionAuditService.logAction(
              petitionId,
              PETITION_AUDIT_ACTIONS.SIGNATURE_ADDED,
              PETITION_ACTOR_TYPES.SYSTEM,
              undefined,
              deviceInfo.ipAddress,
              { note: 'Voter verification service unavailable' }
            );
          } else {
            const dob = signatureData.signerDateOfBirth
              ? new Date(signatureData.signerDateOfBirth)
              : undefined;

            const result = await voterVerificationService.verify(
              signatureData.signerState!,
              signatureData.signerFirstName,
              signatureData.signerLastName,
              signatureData.signerAddress!,
              signatureData.signerCity!,
              signatureData.signerZip!,
              dob
            );

            if (result.errorMessage) {
              // API returned an error — graceful degradation
              verificationMessage =
                'Signature recorded. Unable to check voter registration at this time. Your signature is still valid.';

              await petitionAuditService.logAction(
                petitionId,
                PETITION_AUDIT_ACTIONS.SIGNATURE_ADDED,
                PETITION_ACTOR_TYPES.SYSTEM,
                undefined,
                deviceInfo.ipAddress,
                { note: 'Voter verification API error', error: result.errorMessage }
              );
            } else if (result.matched) {
              verificationStatus = 'VOTER_VERIFIED';
              voterFileMatchResult = {
                confidence: result.confidence,
                partyEnrollment: result.partyEnrollment,
                registrationStatus: result.registrationStatus,
              };
              voterFileId = result.voterId;
              verificationMessage =
                'Signature recorded and voter registration confirmed. Thank you!';
            } else {
              // No match found — stay unverified but inform gracefully
              verificationMessage =
                'Signature recorded. We were unable to confirm your voter registration, but your signature is still valid.';
            }
          }
        } catch (error) {
          // Voter verification must never prevent a signature from being recorded
          logger.error(
            { error, petitionId },
            'Voter verification error during signature submission'
          );
          verificationMessage =
            'Signature recorded. Unable to check voter registration at this time. Your signature is still valid.';
        }
      }
    }

    // Steps 7 & 8: Create signature and increment count atomically
    try {
      const signature = await prisma.$transaction(async (tx) => {
        const newSignature = await tx.petitionSignature.create({
          data: {
            petitionId,
            userId: signatureData.userId || null,
            signerFirstName: signatureData.signerFirstName,
            signerLastName: signatureData.signerLastName,
            signerAddress: signatureData.signerAddress || null,
            signerCity: signatureData.signerCity || null,
            signerState: signatureData.signerState || null,
            signerZip: signatureData.signerZip || null,
            signerCounty: signatureData.signerCounty || null,
            signerDateOfBirth: signatureData.signerDateOfBirth
              ? new Date(signatureData.signerDateOfBirth)
              : null,
            signerEmail: signatureData.signerEmail || null,
            signatureConfirmation: signatureData.signatureConfirmation,
            attestedAt: new Date(signatureData.attestedAt),
            attestationLanguageShown: signatureData.attestationLanguageShown,
            privacyConsented: signatureData.privacyConsented,
            signatureStatus: verificationStatus,
            voterFileMatchResult: voterFileMatchResult
              ? (voterFileMatchResult as Prisma.InputJsonValue)
              : undefined,
            voterFileId,
            ipAddress: deviceInfo.ipAddress,
            userAgent: deviceInfo.userAgent,
            deviceFingerprint: deviceInfo.deviceFingerprint || null,
            geolocation: signatureData.geolocation
              ? (signatureData.geolocation as unknown as Prisma.InputJsonValue)
              : undefined,
            captchaVerified: true,
            isVerified: verificationStatus === 'VOTER_VERIFIED',
          },
        });

        // Atomically increment signature count
        await tx.petition.update({
          where: { id: petitionId },
          data: {
            currentSignatures: { increment: 1 },
          },
        });

        return newSignature;
      });

      // Step 9: Audit log
      await petitionAuditService.logAction(
        petitionId,
        PETITION_AUDIT_ACTIONS.SIGNATURE_ADDED,
        signatureData.userId ? PETITION_ACTOR_TYPES.SIGNER : PETITION_ACTOR_TYPES.SIGNER,
        signatureData.userId || signature.id,
        deviceInfo.ipAddress,
        {
          verificationStatus,
          hasGeolocation: !!signatureData.geolocation,
          isAuthenticated: !!signatureData.userId,
        }
      );

      logger.info(
        { petitionId, signatureId: signature.id, verificationStatus },
        'Petition signature submitted'
      );

      // Step 10: Return confirmation
      return {
        success: true,
        signatureId: signature.id,
        verificationStatus,
        verificationMessage,
      };
    } catch (error) {
      logger.error(
        { error, petitionId },
        'Failed to create petition signature'
      );
      throw new Error('Unable to record your signature. Please try again.');
    }
  }

  /**
   * List petitions created by a specific user.
   *
   * Returns petitions ordered by creation date (newest first)
   * with progress percentage calculated from signature goal.
   *
   * @param userId - ID of the petition creator
   * @returns Array of petition list items with progress info
   */
  async getCreatorPetitions(userId: string): Promise<PetitionListItem[]> {
    try {
      const petitions = await prisma.petition.findMany({
        where: { createdBy: userId },
        select: {
          id: true,
          title: true,
          status: true,
          petitionCategory: true,
          signatureGoal: true,
          currentSignatures: true,
          shortCode: true,
          customSlug: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return petitions.map((p) => ({
        ...p,
        progress:
          p.signatureGoal && p.signatureGoal > 0
            ? Math.min(100, (p.currentSignatures / p.signatureGoal) * 100)
            : 0,
      }));
    } catch (error) {
      logger.error(
        { error, userId },
        'Failed to get creator petitions'
      );
      throw new Error('Unable to load petitions');
    }
  }

  /**
   * Get detailed petition data with signature statistics.
   *
   * Only accessible by the petition creator. Includes counts grouped
   * by verification status and the signing URL.
   *
   * @param petitionId - ID of the petition
   * @param userId - ID of the requesting user (must be the creator)
   * @returns Petition details with stats and signing URL
   * @throws Error if petition is not found or user is not the creator
   */
  async getPetitionDetails(petitionId: string, userId: string): Promise<PetitionDetails> {
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    if (petition.createdBy !== userId) {
      throw new Error('Access denied: you are not the creator of this petition');
    }

    try {
      // Get signature counts by status
      const statusCounts = await prisma.petitionSignature.groupBy({
        by: ['signatureStatus'],
        where: { petitionId },
        _count: { id: true },
      });

      const countMap = new Map(
        statusCounts.map((sc) => [sc.signatureStatus, sc._count.id])
      );

      const stats = {
        total: petition.currentSignatures,
        verified: countMap.get('VOTER_VERIFIED') || 0,
        unverified: countMap.get('UNVERIFIED') || 0,
        flagged: countMap.get('FLAGGED_DUPLICATE') || 0,
        rejected: countMap.get('REJECTED') || 0,
      };

      return {
        petition,
        stats,
        signingUrl: this.getSigningUrl(petition),
      };
    } catch (error) {
      logger.error(
        { error, petitionId },
        'Failed to get petition details'
      );
      throw new Error('Unable to load petition details');
    }
  }

  /**
   * Get paginated signatures for a petition.
   *
   * Only accessible by the petition creator. Supports filtering by
   * verification status and searching by signer name.
   *
   * @param petitionId - ID of the petition
   * @param userId - ID of the requesting user (must be the creator)
   * @param options - Pagination, filtering, and search options
   * @returns Paginated signatures with total count
   * @throws Error if petition is not found or user is not the creator
   */
  async getPetitionSignatures(
    petitionId: string,
    userId: string,
    options: SignatureQueryOptions = {}
  ): Promise<{ signatures: PetitionSignature[]; total: number }> {
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
      select: { createdBy: true },
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    if (petition.createdBy !== userId) {
      throw new Error('Access denied: you are not the creator of this petition');
    }

    const { page = 1, limit = 50, status, search } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.PetitionSignatureWhereInput = { petitionId };

    if (status) {
      where.signatureStatus = status;
    }

    if (search) {
      where.OR = [
        { signerFirstName: { contains: search, mode: 'insensitive' } },
        { signerLastName: { contains: search, mode: 'insensitive' } },
        { signerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [signatures, total] = await Promise.all([
        prisma.petitionSignature.findMany({
          where,
          orderBy: { signedAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.petitionSignature.count({ where }),
      ]);

      return { signatures, total };
    } catch (error) {
      logger.error(
        { error, petitionId },
        'Failed to get petition signatures'
      );
      throw new Error('Unable to load signatures');
    }
  }

  /**
   * Close a petition, transitioning it from ACTIVE to CLOSED status.
   *
   * Only the petition creator can close their own petition.
   * Closed petitions no longer accept new signatures.
   *
   * @param petitionId - ID of the petition to close
   * @param userId - ID of the user requesting closure
   * @returns The updated petition record
   * @throws Error if petition is not found, user is not the creator, or petition is not ACTIVE
   */
  async closePetition(petitionId: string, userId: string): Promise<Petition> {
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    if (petition.createdBy !== userId) {
      throw new Error('Only the petition creator can close this petition');
    }

    if (petition.status !== 'ACTIVE') {
      throw new Error(`Cannot close a petition with status: ${petition.status}`);
    }

    try {
      const updated = await prisma.petition.update({
        where: { id: petitionId },
        data: { status: 'CLOSED' },
      });

      await petitionAuditService.logAction(
        petitionId,
        PETITION_AUDIT_ACTIONS.CLOSED,
        PETITION_ACTOR_TYPES.CREATOR,
        userId,
        undefined,
        { finalSignatureCount: petition.currentSignatures }
      );

      logger.info(
        { petitionId, userId, finalCount: petition.currentSignatures },
        'Petition closed (ACTIVE -> CLOSED)'
      );

      return updated;
    } catch (error) {
      logger.error(
        { error, petitionId, userId },
        'Failed to close petition'
      );
      throw new Error('Unable to close petition');
    }
  }

  /**
   * Generate a QR code data URL for a petition's signing link.
   *
   * Only the petition creator can generate QR codes. The QR code
   * encodes the full signing URL and is returned as a PNG data URL.
   *
   * @param petitionId - ID of the petition
   * @param userId - ID of the requesting user (must be the creator)
   * @returns Base64-encoded PNG data URL of the QR code
   * @throws Error if petition is not found, user is not the creator, or QR generation fails
   */
  async generateQRCode(petitionId: string, userId: string): Promise<string> {
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    if (petition.createdBy !== userId) {
      throw new Error('Only the petition creator can generate QR codes');
    }

    const signingUrl = this.getSigningUrl(petition);

    try {
      const qrDataUrl = await QRCode.toDataURL(signingUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });

      await petitionAuditService.logAction(
        petitionId,
        PETITION_AUDIT_ACTIONS.QR_GENERATED,
        PETITION_ACTOR_TYPES.CREATOR,
        userId,
        undefined,
        { signingUrl }
      );

      logger.info(
        { petitionId, userId },
        'QR code generated for petition'
      );

      return qrDataUrl;
    } catch (error) {
      logger.error(
        { error, petitionId },
        'Failed to generate QR code'
      );
      throw new Error('Unable to generate QR code');
    }
  }

  /**
   * Get the full signing URL for a petition based on the current environment.
   *
   * Uses the custom slug if available, otherwise falls back to the short code.
   * Domain is determined by NODE_ENV:
   * - production: https://www.unitedwerise.org
   * - staging: https://dev.unitedwerise.org
   * - default (development): http://localhost:3000
   *
   * @param petition - Object containing shortCode and/or customSlug
   * @returns Full signing URL
   */
  getSigningUrl(petition: { shortCode: string | null; customSlug: string | null }): string {
    const code = petition.customSlug || petition.shortCode || '';
    const env = process.env.NODE_ENV;

    let domain: string;
    if (env === 'production') {
      domain = 'https://www.unitedwerise.org';
    } else if (env === 'staging') {
      domain = 'https://dev.unitedwerise.org';
    } else {
      domain = 'http://localhost:3000';
    }

    return `${domain}/sign/${code}`;
  }
}

export const petitionSigningService = new PetitionSigningService();
