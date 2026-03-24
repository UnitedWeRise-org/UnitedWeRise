/**
 * Voter Verification Service
 *
 * Abstract interface for voter file verification with pluggable implementations.
 * Currently provides a stub implementation that returns unverified status.
 * Will be replaced with TargetSmart API integration when the API key is available.
 *
 * The active implementation is selected at startup via the TARGETSMART_API_KEY
 * environment variable: if set, the TargetSmart implementation is used;
 * otherwise, the stub is used.
 */

import { logger } from './logger';

/** Result of a voter registration verification check */
export interface VoterVerificationResult {
  /** Whether the voter was matched in the voter file */
  matched: boolean;
  /** Confidence score from 0-100 (100 = exact match) */
  confidence: number;
  /** Voter ID from the state voter file, if matched */
  voterId: string | null;
  /** Party enrollment from voter file, if available */
  partyEnrollment: string | null;
  /** Registration status (e.g., ACTIVE, INACTIVE), if available */
  registrationStatus: string | null;
  /** Error message if the verification failed */
  errorMessage: string | null;
}

/** Interface for voter verification service implementations */
export interface IVoterVerificationService {
  /**
   * Verify a signer's voter registration against state voter files.
   *
   * @param state - Two-letter state code (e.g., "NY", "CA")
   * @param firstName - Signer's legal first name
   * @param lastName - Signer's legal last name
   * @param address - Signer's street address
   * @param city - Signer's city
   * @param zip - Signer's ZIP code
   * @param dob - Optional date of birth for improved match accuracy
   * @returns Verification result with match status and voter details
   */
  verify(
    state: string,
    firstName: string,
    lastName: string,
    address: string,
    city: string,
    zip: string,
    dob?: Date
  ): Promise<VoterVerificationResult>;

  /**
   * Check if the verification service is currently available and configured.
   *
   * @returns True if the service can accept verification requests
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Stub implementation that always returns an unverified result.
 *
 * Used when no voter verification API key is configured.
 * All calls return a safe default indicating no verification was performed.
 */
class StubVoterVerificationService implements IVoterVerificationService {
  /**
   * Stub verify — always returns unverified with zero confidence.
   * No external calls are made.
   */
  async verify(
    _state: string,
    _firstName: string,
    _lastName: string,
    _address: string,
    _city: string,
    _zip: string,
    _dob?: Date
  ): Promise<VoterVerificationResult> {
    logger.debug(
      { service: 'VoterVerification' },
      'Stub voter verification called — returning unverified'
    );

    return {
      matched: false,
      confidence: 0,
      voterId: null,
      partyEnrollment: null,
      registrationStatus: null,
      errorMessage: null,
    };
  }

  /**
   * Stub availability check — always returns false since no real service is configured.
   */
  async isAvailable(): Promise<boolean> {
    return false;
  }
}

/**
 * TargetSmart implementation placeholder.
 *
 * Activated when TARGETSMART_API_KEY environment variable is set.
 * Currently delegates to the stub implementation with structured logging.
 *
 * TODO: Implement full TargetSmart API integration when contract is finalized.
 * API docs: https://docs.targetsmart.com/
 */
class TargetSmartVoterVerificationService implements IVoterVerificationService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly stub: StubVoterVerificationService;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = process.env.TARGETSMART_API_URL || 'https://api.targetsmart.com/voter';
    this.stub = new StubVoterVerificationService();

    logger.info(
      { service: 'VoterVerification', provider: 'TargetSmart' },
      'TargetSmart voter verification service initialized'
    );
  }

  /**
   * Verify voter registration via TargetSmart API.
   *
   * TODO: Replace stub delegation with actual TargetSmart API call:
   * - POST to ${this.baseUrl}/match
   * - Include Authorization header with this.apiKey
   * - Map response fields to VoterVerificationResult
   * - Handle rate limiting and retry logic
   *
   * @param state - Two-letter state code
   * @param firstName - Signer's legal first name
   * @param lastName - Signer's legal last name
   * @param address - Signer's street address
   * @param city - Signer's city
   * @param zip - Signer's ZIP code
   * @param dob - Optional date of birth
   * @returns Verification result (currently from stub)
   */
  async verify(
    state: string,
    firstName: string,
    lastName: string,
    address: string,
    city: string,
    zip: string,
    dob?: Date
  ): Promise<VoterVerificationResult> {
    try {
      // TODO: Replace with actual TargetSmart API call when contract is finalized
      // The API call would go here:
      //
      // const response = await fetch(`${this.baseUrl}/match`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     state,
      //     first_name: firstName,
      //     last_name: lastName,
      //     street_address: address,
      //     city,
      //     zip,
      //     date_of_birth: dob ? dob.toISOString().split('T')[0] : undefined,
      //   }),
      // });
      //
      // if (!response.ok) {
      //   throw new Error(`TargetSmart API error: ${response.status}`);
      // }
      //
      // const data = await response.json();
      // return mapTargetSmartResponse(data);

      logger.info(
        { service: 'VoterVerification', state, provider: 'TargetSmart' },
        'TargetSmart API not yet implemented — falling back to stub'
      );

      return this.stub.verify(state, firstName, lastName, address, city, zip, dob);
    } catch (error) {
      logger.error(
        { error, service: 'VoterVerification', state },
        'TargetSmart voter verification failed'
      );

      return {
        matched: false,
        confidence: 0,
        voterId: null,
        partyEnrollment: null,
        registrationStatus: null,
        errorMessage: error instanceof Error ? error.message : 'Voter verification failed',
      };
    }
  }

  /**
   * Check if the TargetSmart service is available.
   *
   * Returns true when the API key is configured, even though the
   * implementation currently delegates to the stub. This allows the
   * signing flow to attempt verification and gracefully degrade.
   */
  async isAvailable(): Promise<boolean> {
    // TODO: Add a health check call to TargetSmart API when implemented
    return !!this.apiKey;
  }
}

/**
 * Factory function to create the appropriate voter verification service.
 *
 * Returns the TargetSmart implementation if TARGETSMART_API_KEY is set,
 * otherwise returns the stub implementation.
 *
 * @returns An IVoterVerificationService implementation
 */
export function createVoterVerificationService(): IVoterVerificationService {
  const apiKey = process.env.TARGETSMART_API_KEY;

  if (apiKey) {
    logger.info(
      { service: 'VoterVerification' },
      'TARGETSMART_API_KEY detected — using TargetSmart voter verification'
    );
    return new TargetSmartVoterVerificationService(apiKey);
  }

  logger.info(
    { service: 'VoterVerification' },
    'No TARGETSMART_API_KEY — using stub voter verification (all signatures will be UNVERIFIED)'
  );
  return new StubVoterVerificationService();
}

/** Singleton voter verification service instance */
export const voterVerificationService = createVoterVerificationService();
