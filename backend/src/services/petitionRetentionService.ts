/**
 * Petition Data Retention Service
 *
 * Manages data retention policies and legal holds for petitions.
 * Handles automatic deletion of petition signature data after the
 * 22-month post-election retention period, and provides legal hold
 * management to prevent auto-deletion when required.
 */

import { Petition, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from './logger';
import { petitionAuditService, PETITION_AUDIT_ACTIONS, PETITION_ACTOR_TYPES } from './petitionAuditService';

export class PetitionRetentionService {
  /**
   * Find petitions eligible for data deletion.
   *
   * Criteria: electionDate + 22 months < now, legalHold is false,
   * status is not ARCHIVED. Only petitions with an electionDate set
   * are considered for automatic deletion.
   *
   * @returns Array of petitions that have exceeded the retention period
   */
  async getExpiredPetitions(): Promise<Petition[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 22);

    try {
      const petitions = await prisma.petition.findMany({
        where: {
          electionDate: {
            lte: cutoffDate,
          },
          legalHold: false,
          status: {
            not: 'ARCHIVED',
          },
        },
      });

      logger.info(
        { count: petitions.length, cutoffDate: cutoffDate.toISOString() },
        'Found expired petitions eligible for data deletion'
      );

      return petitions;
    } catch (error) {
      logger.error(
        { error, cutoffDate: cutoffDate.toISOString() },
        'Failed to query expired petitions'
      );
      throw new Error('Unable to query expired petitions');
    }
  }

  /**
   * Delete petition signature data and archive the petition.
   *
   * Uses a Prisma transaction to atomically:
   * 1. Delete all PetitionSignature records for this petition
   * 2. Update petition status to ARCHIVED and reset currentSignatures to 0
   * 3. Log the deletion via petitionAuditService
   *
   * @param petitionId - ID of the petition to delete data for
   * @throws Error if the petition is not found or the deletion fails
   */
  async deletePetitionData(petitionId: string): Promise<void> {
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
      select: { id: true, title: true, legalHold: true, status: true, currentSignatures: true },
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    if (petition.legalHold) {
      throw new Error('Cannot delete data for a petition under legal hold');
    }

    if (petition.status === 'ARCHIVED') {
      throw new Error('Petition is already archived');
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Delete all signature records
        const deleteResult = await tx.petitionSignature.deleteMany({
          where: { petitionId },
        });

        // Archive the petition and reset signature count
        await tx.petition.update({
          where: { id: petitionId },
          data: {
            status: 'ARCHIVED',
            currentSignatures: 0,
          },
        });

        logger.info(
          { petitionId, deletedSignatures: deleteResult.count },
          'Petition signature data deleted and petition archived'
        );
      });

      // Log the deletion action (outside transaction so audit failure doesn't roll back)
      await petitionAuditService.logAction(
        petitionId,
        PETITION_AUDIT_ACTIONS.DATA_DELETED,
        PETITION_ACTOR_TYPES.SYSTEM,
        undefined,
        undefined,
        {
          reason: 'Automatic data retention policy (22-month post-election)',
          previousSignatureCount: petition.currentSignatures,
        }
      );
    } catch (error) {
      logger.error(
        { error, petitionId },
        'Failed to delete petition data'
      );
      throw new Error('Unable to delete petition data');
    }
  }

  /**
   * Set legal hold on a petition to prevent auto-deletion.
   *
   * Records the admin who set the hold, the reason, and the timestamp.
   * Legal holds override the 22-month retention policy until explicitly removed.
   *
   * @param petitionId - ID of the petition to place on legal hold
   * @param adminId - ID of the admin setting the hold
   * @param reason - Reason for the legal hold
   * @throws Error if petition is not found or is already on legal hold
   */
  async setLegalHold(petitionId: string, adminId: string, reason: string): Promise<void> {
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
      select: { id: true, title: true, legalHold: true },
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    if (petition.legalHold) {
      throw new Error('Petition is already under legal hold');
    }

    try {
      await prisma.petition.update({
        where: { id: petitionId },
        data: {
          legalHold: true,
          legalHoldReason: reason,
          legalHoldSetAt: new Date(),
          legalHoldSetBy: adminId,
        },
      });

      await petitionAuditService.logAction(
        petitionId,
        PETITION_AUDIT_ACTIONS.LEGAL_HOLD_SET,
        PETITION_ACTOR_TYPES.ADMIN,
        adminId,
        undefined,
        { reason }
      );

      logger.info(
        { petitionId, adminId, reason },
        'Legal hold set on petition'
      );
    } catch (error) {
      logger.error(
        { error, petitionId, adminId },
        'Failed to set legal hold on petition'
      );
      throw new Error('Unable to set legal hold');
    }
  }

  /**
   * Remove legal hold from a petition, re-enabling auto-deletion eligibility.
   *
   * Clears the hold flag, reason, timestamp, and admin reference.
   *
   * @param petitionId - ID of the petition to release from legal hold
   * @param adminId - ID of the admin removing the hold
   * @throws Error if petition is not found or is not on legal hold
   */
  async removeLegalHold(petitionId: string, adminId: string): Promise<void> {
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId },
      select: { id: true, title: true, legalHold: true, legalHoldReason: true },
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    if (!petition.legalHold) {
      throw new Error('Petition is not under legal hold');
    }

    try {
      await prisma.petition.update({
        where: { id: petitionId },
        data: {
          legalHold: false,
          legalHoldReason: null,
          legalHoldSetAt: null,
          legalHoldSetBy: null,
        },
      });

      await petitionAuditService.logAction(
        petitionId,
        PETITION_AUDIT_ACTIONS.LEGAL_HOLD_REMOVED,
        PETITION_ACTOR_TYPES.ADMIN,
        adminId,
        undefined,
        { previousReason: petition.legalHoldReason }
      );

      logger.info(
        { petitionId, adminId },
        'Legal hold removed from petition'
      );
    } catch (error) {
      logger.error(
        { error, petitionId, adminId },
        'Failed to remove legal hold from petition'
      );
      throw new Error('Unable to remove legal hold');
    }
  }
}

export const petitionRetentionService = new PetitionRetentionService();
