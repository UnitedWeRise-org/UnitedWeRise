"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsService = void 0;
const twilio_1 = require("twilio");
const logger_1 = require("./logger");
class SMSService {
    constructor() {
        this.client = null;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
        this.initializeClient();
    }
    initializeClient() {
        try {
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
                this.client = new twilio_1.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                logger_1.logger.info('SMS service initialized with Twilio');
            }
            else {
                logger_1.logger.warn('SMS service not configured. Please set Twilio credentials.');
            }
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to initialize SMS service');
        }
    }
    async sendSMS(to, message) {
        if (!this.client) {
            logger_1.logger.error('SMS service not configured');
            return false;
        }
        try {
            // Format phone number (remove any formatting, ensure it starts with +)
            const formattedPhone = this.formatPhoneNumber(to);
            const result = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: formattedPhone
            });
            logger_1.logger.info({ sid: result.sid, to: formattedPhone }, 'SMS sent successfully');
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error, to }, 'Failed to send SMS');
            return false;
        }
    }
    async sendVerificationCode(phoneNumber, code) {
        const message = `Your United We Rise verification code is: ${code}

This code will expire in 10 minutes. Don't share this code with anyone.

UnitedWeRise.com`;
        return await this.sendSMS(phoneNumber, message);
    }
    // Generate a 6-digit verification code
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    // Format phone number for Twilio (must include country code)
    formatPhoneNumber(phoneNumber) {
        // Remove all non-numeric characters
        const digits = phoneNumber.replace(/\D/g, '');
        // If it's a US number without country code, add +1
        if (digits.length === 10) {
            return `+1${digits}`;
        }
        // If it already has country code but no +, add it
        if (digits.length === 11 && digits.startsWith('1')) {
            return `+${digits}`;
        }
        // If it has country code for other countries
        if (digits.length > 11) {
            return `+${digits}`;
        }
        // If it already starts with +, return as is
        if (phoneNumber.startsWith('+')) {
            return phoneNumber;
        }
        // Default: assume US number
        return `+1${digits}`;
    }
    // Validate phone number format
    isValidPhoneNumber(phoneNumber) {
        const digits = phoneNumber.replace(/\D/g, '');
        // US numbers: 10 digits or 11 digits starting with 1
        if (digits.length === 10)
            return true;
        if (digits.length === 11 && digits.startsWith('1'))
            return true;
        // International numbers: generally 10-15 digits
        if (digits.length >= 10 && digits.length <= 15)
            return true;
        return false;
    }
    // Test SMS service
    async testService() {
        if (!this.client) {
            logger_1.logger.error('SMS service not configured');
            return false;
        }
        try {
            // Test by getting account info (doesn't send SMS)
            const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
            logger_1.logger.info({ accountName: account.friendlyName }, 'SMS service connection successful');
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'SMS service connection failed');
            return false;
        }
    }
}
exports.smsService = new SMSService();
//# sourceMappingURL=smsService.js.map