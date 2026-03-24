/**
 * Petition Short Code Service
 *
 * Generates and manages short codes and custom slugs for petition URLs.
 * Short codes are 8-character alphanumeric strings using a reduced charset
 * that excludes visually ambiguous characters (0, O, I, l, 1).
 * Custom slugs are human-readable aliases set by verified candidates.
 */

import crypto from 'crypto';
import { Petition } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from './logger';

/**
 * Base62-like charset with ambiguous characters removed.
 * Excludes: 0, O, I, l, 1 to prevent confusion in URLs and printed materials.
 */
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** Length of auto-generated short codes */
const SHORT_CODE_LENGTH = 8;

/** Maximum collision retry attempts before failing */
const MAX_RETRIES = 5;

/** Minimum length for custom slugs */
const MIN_SLUG_LENGTH = 5;

/** Maximum length for custom slugs */
const MAX_SLUG_LENGTH = 50;

/** Reserved slugs that cannot be used as custom petition URLs */
const RESERVED_SLUGS = [
  'admin',
  'sign',
  'help',
  'about',
  'api',
  'login',
  'register',
  'settings',
  'dashboard',
  'petition',
  'petitions',
  'create',
  'new',
  'edit',
  'delete',
  'search',
];

/** Validation result for custom slug checks */
interface SlugValidationResult {
  /** Whether the slug passes validation rules */
  valid: boolean;
  /** Human-readable error message if validation fails */
  error?: string;
}

export class PetitionShortCodeService {
  /**
   * Generate a unique 8-character alphanumeric short code.
   *
   * Uses cryptographically secure random bytes mapped to the reduced charset.
   * Retries on collision up to MAX_RETRIES attempts before throwing.
   *
   * @returns A unique short code string
   * @throws Error if unable to generate a unique code after maximum retries
   */
  async generateShortCode(): Promise<string> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const code = this.generateRandomCode();

      // Check for collision
      const existing = await prisma.petition.findFirst({
        where: {
          OR: [
            { shortCode: code },
            { customSlug: code },
          ],
        },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }

      logger.warn(
        { attempt, code },
        'Petition short code collision detected, retrying'
      );
    }

    logger.error(
      { maxRetries: MAX_RETRIES },
      'Failed to generate unique petition short code after max retries'
    );
    throw new Error('Unable to generate a unique short code. Please try again.');
  }

  /**
   * Validate a custom slug against format and reservation rules.
   *
   * Rules:
   * - Must be between 5 and 50 characters
   * - Only alphanumeric characters and hyphens allowed
   * - Cannot start or end with a hyphen
   * - Cannot contain consecutive hyphens
   * - Cannot be a reserved slug
   *
   * @param slug - The custom slug to validate
   * @returns Validation result with error message if invalid
   */
  validateCustomSlug(slug: string): SlugValidationResult {
    if (!slug || typeof slug !== 'string') {
      return { valid: false, error: 'Slug is required' };
    }

    const trimmed = slug.trim().toLowerCase();

    if (trimmed.length < MIN_SLUG_LENGTH) {
      return {
        valid: false,
        error: `Slug must be at least ${MIN_SLUG_LENGTH} characters long`,
      };
    }

    if (trimmed.length > MAX_SLUG_LENGTH) {
      return {
        valid: false,
        error: `Slug must be no more than ${MAX_SLUG_LENGTH} characters long`,
      };
    }

    // Only alphanumeric and hyphens
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      return {
        valid: false,
        error: 'Slug may only contain lowercase letters, numbers, and hyphens',
      };
    }

    // No leading/trailing hyphens
    if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
      return {
        valid: false,
        error: 'Slug cannot start or end with a hyphen',
      };
    }

    // No consecutive hyphens
    if (trimmed.includes('--')) {
      return {
        valid: false,
        error: 'Slug cannot contain consecutive hyphens',
      };
    }

    // Check reserved slugs
    if (RESERVED_SLUGS.includes(trimmed)) {
      return {
        valid: false,
        error: 'This slug is reserved and cannot be used',
      };
    }

    return { valid: true };
  }

  /**
   * Resolve a short code or custom slug to a petition.
   *
   * Checks both the shortCode and customSlug fields. Returns the full
   * petition record with creator information if found.
   *
   * @param codeOrSlug - The short code or custom slug to resolve
   * @returns The matching petition, or null if not found
   */
  async resolveCode(codeOrSlug: string): Promise<Petition | null> {
    if (!codeOrSlug || typeof codeOrSlug !== 'string') {
      return null;
    }

    const normalized = codeOrSlug.trim();

    try {
      const petition = await prisma.petition.findFirst({
        where: {
          OR: [
            { shortCode: normalized },
            { customSlug: normalized.toLowerCase() },
          ],
        },
      });

      return petition;
    } catch (error) {
      logger.error(
        { error, codeOrSlug: normalized },
        'Failed to resolve petition short code'
      );
      throw new Error('Unable to resolve petition code');
    }
  }

  /**
   * Check if a custom slug is available for use.
   *
   * Verifies the slug is not already in use as either a shortCode
   * or customSlug on an existing petition.
   *
   * @param slug - The custom slug to check
   * @returns True if the slug is available, false if taken
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    if (!slug || typeof slug !== 'string') {
      return false;
    }

    const normalized = slug.trim().toLowerCase();

    // Reserved slugs are never available
    if (RESERVED_SLUGS.includes(normalized)) {
      return false;
    }

    try {
      const existing = await prisma.petition.findFirst({
        where: {
          OR: [
            { shortCode: normalized },
            { customSlug: normalized },
          ],
        },
        select: { id: true },
      });

      return !existing;
    } catch (error) {
      logger.error(
        { error, slug: normalized },
        'Failed to check petition slug availability'
      );
      throw new Error('Unable to check slug availability');
    }
  }

  /**
   * Generate a random code using cryptographically secure random bytes.
   *
   * @returns An 8-character string from the reduced charset
   */
  private generateRandomCode(): string {
    const bytes = crypto.randomBytes(SHORT_CODE_LENGTH);
    let code = '';

    for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
      code += CHARSET[bytes[i] % CHARSET.length];
    }

    return code;
  }
}

export const petitionShortCodeService = new PetitionShortCodeService();
