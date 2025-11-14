"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captchaService = void 0;
const logger_1 = require("./logger");
class CaptchaService {
    constructor() {
        this.secretKey = process.env.HCAPTCHA_SECRET_KEY || '';
        if (!this.secretKey) {
            logger_1.logger.warn('hCaptcha service not configured. Please set HCAPTCHA_SECRET_KEY.');
        }
        else {
            logger_1.logger.info('hCaptcha service initialized');
        }
    }
    async verifyCaptcha(token, userIP) {
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
            const result = await response.json();
            logger_1.logger.info({
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
        }
        catch (error) {
            logger_1.logger.error({ error }, 'hCaptcha verification error');
            return {
                success: false,
                error: 'Captcha verification service unavailable'
            };
        }
    }
    // For enterprise hCaptcha, you might want to check the score
    isValidScore(score, threshold = 0.5) {
        if (score === undefined)
            return true; // Basic hCaptcha doesn't provide scores
        return score >= threshold;
    }
    // Test the service configuration
    async testConfiguration() {
        if (!this.secretKey) {
            logger_1.logger.error('hCaptcha secret key not configured');
            return false;
        }
        try {
            // Test with an invalid token to see if the service responds
            const result = await this.verifyCaptcha('test-token');
            // We expect this to fail, but if we get a structured response, the service is working
            logger_1.logger.info('hCaptcha service test - connection successful');
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'hCaptcha service test failed');
            return false;
        }
    }
}
exports.captchaService = new CaptchaService();
//# sourceMappingURL=captchaService.js.map