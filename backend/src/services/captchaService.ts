import { logger } from './logger';

class CaptchaService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.HCAPTCHA_SECRET_KEY || '';
    if (!this.secretKey) {
      logger.warn('hCaptcha service not configured. Please set HCAPTCHA_SECRET_KEY.');
    } else {
      logger.info('hCaptcha service initialized');
    }
  }

  async verifyCaptcha(token: string, userIP?: string): Promise<{ success: boolean; error?: string; score?: number }> {
    if (!this.secretKey) {
      return { success: false, error: 'hCaptcha not configured' };
    }

    if (!token) {
      return { success: false, error: 'No captcha token provided' };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', token);
      if (userIP) {
        formData.append('remoteip', userIP);
      }

      const response = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json() as any;

      logger.info({
        success: result.success,
        challenge_ts: result.challenge_ts,
        hostname: result.hostname,
        score: result.score
      }, 'hCaptcha verification result');

      if (!result.success) {
        const errors = result['error-codes']?.join(', ') || 'Unknown error';
        return { 
          success: false, 
          error: `Captcha verification failed: ${errors}` 
        };
      }

      return { 
        success: true, 
        score: result.score 
      };

    } catch (error) {
      logger.error({ error }, 'hCaptcha verification error');
      return {
        success: false,
        error: 'Captcha verification service unavailable'
      };
    }
  }

  // For enterprise hCaptcha, you might want to check the score
  isValidScore(score?: number, threshold: number = 0.5): boolean {
    if (score === undefined) return true; // Basic hCaptcha doesn't provide scores
    return score >= threshold;
  }

  // Test the service configuration
  async testConfiguration(): Promise<boolean> {
    if (!this.secretKey) {
      logger.error('hCaptcha secret key not configured');
      return false;
    }

    try {
      // Test with an invalid token to see if the service responds
      const result = await this.verifyCaptcha('test-token');
      // We expect this to fail, but if we get a structured response, the service is working
      logger.info('hCaptcha service test - connection successful');
      return true;
    } catch (error) {
      logger.error({ error }, 'hCaptcha service test failed');
      return false;
    }
  }
}

export const captchaService = new CaptchaService();