/**
 * Petition Audit Service
 *
 * Append-only audit logging for all petition-related actions.
 * Provides an immutable record of petition lifecycle events for
 * legal compliance, accountability, and fraud detection.
 *
 * This service never updates or deletes audit records.
 */

import { PetitionAuditLog, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from './logger';

/** Petition audit action type constants */
export const PETITION_AUDIT_ACTIONS = {
  CREATED: 'CREATED',
  ACTIVATED: 'ACTIVATED',
  SIGNATURE_ADDED: 'SIGNATURE_ADDED',
  SIGNATURE_FLAGGED: 'SIGNATURE_FLAGGED',
  SIGNATURE_VERIFIED: 'SIGNATURE_VERIFIED',
  SIGNATURE_REJECTED: 'SIGNATURE_REJECTED',
  EXPORTED: 'EXPORTED',
  CLOSED: 'CLOSED',
  QR_GENERATED: 'QR_GENERATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
} as const;

export type PetitionAuditAction = typeof PETITION_AUDIT_ACTIONS[keyof typeof PETITION_AUDIT_ACTIONS];

/** Actor type constants for audit log entries */
export const PETITION_ACTOR_TYPES = {
  CREATOR: 'CREATOR',
  SIGNER: 'SIGNER',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM',
} as const;

export type PetitionActorType = typeof PETITION_ACTOR_TYPES[keyof typeof PETITION_ACTOR_TYPES];

/** Options for querying petition audit logs */
interface GetAuditLogOptions {
  /** Maximum number of entries to return (default: 50) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
  /** Filter by action type */
  action?: string;
}

export class PetitionAuditService {
  /**
   * Log an action on a petition (append-only, never update/delete).
   *
   * Audit logging failures are caught and logged but never propagate
   * to avoid disrupting the primary operation.
   *
   * @param petitionId - ID of the petition this action relates to
   * @param action - Action type from PETITION_AUDIT_ACTIONS
   * @param actorType - Type of actor performing the action (CREATOR, SIGNER, ADMIN, SYSTEM)
   * @param actorId - Optional ID of the actor (user ID, signature ID, or system identifier)
   * @param ipAddress - Optional IP address of the actor
   * @param details - Optional structured data about the action
   * @returns The created audit log entry ID, or null if logging failed
   */
  async logAction(
    petitionId: string,
    action: string,
    actorType: string,
    actorId?: string,
    ipAddress?: string,
    details?: Record<string, unknown>
  ): Promise<string | null> {
    try {
      const record = await prisma.petitionAuditLog.create({
        data: {
          petitionId,
          action,
          actorType,
          actorId: actorId || null,
          ipAddress: ipAddress || null,
          details: details ? (details as Prisma.InputJsonValue) : undefined,
        },
      });

      logger.info(
        {
          auditId: record.id,
          petitionId,
          action,
          actorType,
          actorId,
        },
        `Petition audit log: ${action}`
      );

      return record.id;
    } catch (error) {
      // Audit logging must never break the main flow
      logger.error(
        { error, petitionId, action, actorType, actorId },
        'Failed to create petition audit log'
      );
      return null;
    }
  }

  /**
   * Get audit log entries for a petition.
   *
   * Returns entries in reverse chronological order with optional
   * filtering by action type and pagination support.
   *
   * @param petitionId - ID of the petition to retrieve logs for
   * @param options - Query options (limit, offset, action filter)
   * @returns Array of audit log entries
   */
  async getAuditLog(
    petitionId: string,
    options: GetAuditLogOptions = {}
  ): Promise<PetitionAuditLog[]> {
    const { limit = 50, offset = 0, action } = options;

    const where: Prisma.PetitionAuditLogWhereInput = {
      petitionId,
    };

    if (action) {
      where.action = action;
    }

    try {
      const logs = await prisma.petitionAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return logs;
    } catch (error) {
      logger.error(
        { error, petitionId },
        'Failed to retrieve petition audit log'
      );
      throw new Error('Unable to retrieve audit log');
    }
  }

  /**
   * Count audit log entries for a petition, optionally filtered by action.
   *
   * @param petitionId - ID of the petition
   * @param action - Optional action type filter
   * @returns Total count of matching audit log entries
   */
  async getAuditLogCount(petitionId: string, action?: string): Promise<number> {
    const where: Prisma.PetitionAuditLogWhereInput = { petitionId };

    if (action) {
      where.action = action;
    }

    try {
      return await prisma.petitionAuditLog.count({ where });
    } catch (error) {
      logger.error(
        { error, petitionId },
        'Failed to count petition audit log entries'
      );
      throw new Error('Unable to count audit log entries');
    }
  }
}

export const petitionAuditService = new PetitionAuditService();
