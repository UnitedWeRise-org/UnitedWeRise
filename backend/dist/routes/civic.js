"use strict";
/**
 * Civic Organizing API Routes
 *
 * Handles petitions, events, signatures, and RSVPs
 * Provides search and filtering capabilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const civicOrganizingService_js_1 = __importDefault(require("../services/civicOrganizingService.js"));
const auth_js_1 = require("../middleware/auth.js");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = express_1.default.Router();
// Rate limiting for civic actions
const civicActionLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each user to 10 civic actions per windowMs
    message: { error: 'Too many civic actions. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const civicBrowseLimit = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // limit each user to 60 browse requests per minute
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
/**
 * PETITION ENDPOINTS
 */
// Create petition
router.post('/petitions', auth_js_1.requireAuth, civicActionLimit, [
    (0, express_validator_1.body)('title').isLength({ min: 10, max: 200 }).withMessage('Title must be 10-200 characters'),
    (0, express_validator_1.body)('description').isLength({ min: 50, max: 5000 }).withMessage('Description must be 50-5000 characters'),
    (0, express_validator_1.body)('petitionType').isIn(['PETITION', 'REFERENDUM']).withMessage('Invalid petition type'),
    (0, express_validator_1.body)('category').isIn([
        'HEALTHCARE', 'EDUCATION', 'ENVIRONMENT', 'ECONOMY', 'INFRASTRUCTURE',
        'PUBLIC_SAFETY', 'HOUSING', 'TRANSPORTATION', 'TECHNOLOGY', 'CIVIL_RIGHTS',
        'IMMIGRATION', 'ENERGY', 'AGRICULTURE', 'VETERANS', 'SENIORS', 'YOUTH',
        'LABOR', 'GOVERNMENT_REFORM', 'OTHER'
    ]).withMessage('Invalid category'),
    (0, express_validator_1.body)('geographicScope').isIn(['LOCAL', 'COUNTY', 'STATE', 'NATIONAL', 'REGIONAL']).withMessage('Invalid geographic scope'),
    (0, express_validator_1.body)('signatureGoal').isInt({ min: 1, max: 1000000 }).withMessage('Signature goal must be 1-1,000,000'),
    (0, express_validator_1.body)('targetOfficials').isArray().withMessage('Target officials must be an array'),
    (0, express_validator_1.body)('targetOfficials.*').isString().withMessage('Each target official must be a string'),
    (0, express_validator_1.body)('location').optional().isObject().withMessage('Location must be an object'),
    (0, express_validator_1.body)('expiresAt').optional().isISO8601().withMessage('Expires at must be a valid date')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        const userId = req.user.id;
        const petitionData = req.body;
        // Convert expiresAt to Date if provided
        if (petitionData.expiresAt) {
            petitionData.expiresAt = new Date(petitionData.expiresAt);
        }
        const petition = await civicOrganizingService_js_1.default.createPetition(userId, petitionData);
        res.status(201).json({
            success: true,
            message: 'Petition created successfully',
            data: petition
        });
    }
    catch (error) {
        console.error('Create petition error:', error);
        res.status(500).json({
            error: error.message || 'Failed to create petition'
        });
    }
});
// Get petitions with filtering
router.get('/petitions', civicBrowseLimit, [
    (0, express_validator_1.query)('category').optional().isString(),
    (0, express_validator_1.query)('geographicScope').optional().isString(),
    (0, express_validator_1.query)('status').optional().isIn(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CLOSED', 'UNDER_REVIEW']),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    (0, express_validator_1.query)('proximity').optional().isFloat({ min: 1, max: 500 }).withMessage('Proximity must be 1-500 miles'),
    (0, express_validator_1.query)('lat').optional().isFloat({ min: -90, max: 90 }),
    (0, express_validator_1.query)('lon').optional().isFloat({ min: -180, max: 180 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filters = {};
        if (req.query.category)
            filters.category = req.query.category;
        if (req.query.geographicScope)
            filters.geographicScope = req.query.geographicScope;
        if (req.query.status)
            filters.status = req.query.status;
        if (req.query.proximity && req.query.lat && req.query.lon) {
            filters.proximity = parseFloat(req.query.proximity);
            filters.coordinates = {
                lat: parseFloat(req.query.lat),
                lon: parseFloat(req.query.lon)
            };
        }
        const result = await civicOrganizingService_js_1.default.getPetitions(filters, page, limit);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Get petitions error:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch petitions'
        });
    }
});
// Get petition by ID
router.get('/petitions/:id', civicBrowseLimit, [
    (0, express_validator_1.param)('id').isString().withMessage('Invalid petition ID')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        const petition = await civicOrganizingService_js_1.default.getPetitionById(req.params.id);
        if (!petition) {
            return res.status(404).json({ error: 'Petition not found' });
        }
        res.json({
            success: true,
            data: petition
        });
    }
    catch (error) {
        console.error('Get petition error:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch petition'
        });
    }
});
// Sign petition
router.post('/petitions/:id/sign', auth_js_1.requireAuth, civicActionLimit, [
    (0, express_validator_1.param)('id').isString().withMessage('Invalid petition ID')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        const userId = req.user.id;
        const petitionId = req.params.id;
        const ipAddress = req.ip;
        const signature = await civicOrganizingService_js_1.default.signPetition(userId, petitionId, ipAddress);
        res.status(201).json({
            success: true,
            message: 'Petition signed successfully',
            data: signature
        });
    }
    catch (error) {
        console.error('Sign petition error:', error);
        res.status(400).json({
            error: error.message || 'Failed to sign petition'
        });
    }
});
/**
 * EVENT ENDPOINTS
 */
// Create event
router.post('/events', auth_js_1.requireAuth, civicActionLimit, [
    (0, express_validator_1.body)('title').isLength({ min: 10, max: 200 }).withMessage('Title must be 10-200 characters'),
    (0, express_validator_1.body)('description').isLength({ min: 50, max: 5000 }).withMessage('Description must be 50-5000 characters'),
    (0, express_validator_1.body)('eventType').isIn([
        'TOWN_HALL', 'CANDIDATE_FORUM', 'DEBATE', 'RALLY', 'PROTEST', 'MARCH',
        'VOTER_REGISTRATION', 'ISSUE_FORUM', 'COMMUNITY_MEETING', 'WORKSHOP',
        'EDUCATIONAL_SEMINAR', 'FUNDRAISER', 'VOLUNTEER_DRIVE', 'PETITION_DRIVE',
        'PHONE_BANK', 'CANVASSING', 'OTHER'
    ]).withMessage('Invalid event type'),
    (0, express_validator_1.body)('category').isIn([
        'ELECTORAL', 'CIVIC_ENGAGEMENT', 'ORGANIZING_ACTIVITIES', 'EDUCATIONAL', 'ADVOCACY', 'FUNDRAISING'
    ]).withMessage('Invalid category'),
    (0, express_validator_1.body)('scheduledDate').isISO8601().withMessage('Scheduled date must be a valid date'),
    (0, express_validator_1.body)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    (0, express_validator_1.body)('location').isObject().withMessage('Location is required'),
    (0, express_validator_1.body)('location.address').isString().withMessage('Address is required'),
    (0, express_validator_1.body)('location.city').isString().withMessage('City is required'),
    (0, express_validator_1.body)('location.state').isString().withMessage('State is required'),
    (0, express_validator_1.body)('organizerInfo').isObject().withMessage('Organizer info is required'),
    (0, express_validator_1.body)('organizerInfo.name').isString().withMessage('Organizer name is required'),
    (0, express_validator_1.body)('organizerInfo.contact').isString().withMessage('Organizer contact is required'),
    (0, express_validator_1.body)('capacity').optional().isInt({ min: 1, max: 100000 }).withMessage('Capacity must be 1-100,000'),
    (0, express_validator_1.body)('isVirtual').optional().isBoolean(),
    (0, express_validator_1.body)('virtualLink').optional().isURL().withMessage('Virtual link must be a valid URL'),
    (0, express_validator_1.body)('rsvpRequired').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        const userId = req.user.id;
        const eventData = req.body;
        // Convert dates
        eventData.scheduledDate = new Date(eventData.scheduledDate);
        if (eventData.endDate) {
            eventData.endDate = new Date(eventData.endDate);
        }
        // Validate date logic
        if (eventData.scheduledDate < new Date()) {
            return res.status(400).json({ error: 'Event cannot be scheduled in the past' });
        }
        if (eventData.endDate && eventData.endDate <= eventData.scheduledDate) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }
        const event = await civicOrganizingService_js_1.default.createEvent(userId, eventData);
        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: event
        });
    }
    catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({
            error: error.message || 'Failed to create event'
        });
    }
});
// Get events with filtering
router.get('/events', civicBrowseLimit, [
    (0, express_validator_1.query)('eventType').optional().isString(),
    (0, express_validator_1.query)('category').optional().isString(),
    (0, express_validator_1.query)('timeframe').optional().isIn(['week', 'month', 'future']),
    (0, express_validator_1.query)('status').optional().isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    (0, express_validator_1.query)('proximity').optional().isFloat({ min: 1, max: 500 }).withMessage('Proximity must be 1-500 miles'),
    (0, express_validator_1.query)('lat').optional().isFloat({ min: -90, max: 90 }),
    (0, express_validator_1.query)('lon').optional().isFloat({ min: -180, max: 180 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filters = {};
        if (req.query.eventType)
            filters.eventType = req.query.eventType;
        if (req.query.category)
            filters.category = req.query.category;
        if (req.query.timeframe)
            filters.timeframe = req.query.timeframe;
        if (req.query.status)
            filters.status = req.query.status;
        if (req.query.proximity && req.query.lat && req.query.lon) {
            filters.proximity = parseFloat(req.query.proximity);
            filters.coordinates = {
                lat: parseFloat(req.query.lat),
                lon: parseFloat(req.query.lon)
            };
        }
        const result = await civicOrganizingService_js_1.default.getEvents(filters, page, limit);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch events'
        });
    }
});
// Get event by ID
router.get('/events/:id', civicBrowseLimit, [
    (0, express_validator_1.param)('id').isString().withMessage('Invalid event ID')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        const event = await civicOrganizingService_js_1.default.getEventById(req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json({
            success: true,
            data: event
        });
    }
    catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch event'
        });
    }
});
// RSVP to event
router.post('/events/:id/rsvp', auth_js_1.requireAuth, civicActionLimit, [
    (0, express_validator_1.param)('id').isString().withMessage('Invalid event ID'),
    (0, express_validator_1.body)('status').optional().isIn(['ATTENDING', 'MAYBE', 'NOT_ATTENDING']).withMessage('Invalid RSVP status')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        const userId = req.user.id;
        const eventId = req.params.id;
        const status = req.body.status || 'ATTENDING';
        const rsvp = await civicOrganizingService_js_1.default.rsvpToEvent(userId, eventId, status);
        res.status(201).json({
            success: true,
            message: 'RSVP recorded successfully',
            data: rsvp
        });
    }
    catch (error) {
        console.error('RSVP event error:', error);
        res.status(400).json({
            error: error.message || 'Failed to RSVP to event'
        });
    }
});
/**
 * SEARCH ENDPOINT
 */
// Search across petitions and events
router.get('/search', civicBrowseLimit, [
    (0, express_validator_1.query)('q').isLength({ min: 2, max: 100 }).withMessage('Query must be 2-100 characters'),
    (0, express_validator_1.query)('category').optional().isString(),
    (0, express_validator_1.query)('eventType').optional().isString(),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        const query = req.query.q;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filters = {};
        if (req.query.category)
            filters.category = req.query.category;
        if (req.query.eventType)
            filters.eventType = req.query.eventType;
        const result = await civicOrganizingService_js_1.default.searchCivic(query, filters, page, limit);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Search civic error:', error);
        res.status(500).json({
            error: error.message || 'Failed to search civic content'
        });
    }
});
/**
 * USER ACTIVITY ENDPOINTS
 */
// Get user's created petitions
router.get('/user/petitions', auth_js_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const petitions = await civicOrganizingService_js_1.default.getUserPetitions(userId);
        res.json({
            success: true,
            data: petitions
        });
    }
    catch (error) {
        console.error('Get user petitions error:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch user petitions'
        });
    }
});
// Get user's created events
router.get('/user/events', auth_js_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const events = await civicOrganizingService_js_1.default.getUserEvents(userId);
        res.json({
            success: true,
            data: events
        });
    }
    catch (error) {
        console.error('Get user events error:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch user events'
        });
    }
});
// Get user's signed petitions
router.get('/user/signatures', auth_js_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const signatures = await civicOrganizingService_js_1.default.getUserSignedPetitions(userId);
        res.json({
            success: true,
            data: signatures
        });
    }
    catch (error) {
        console.error('Get user signatures error:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch user signatures'
        });
    }
});
// Get user's RSVP'd events
router.get('/user/rsvps', auth_js_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const rsvps = await civicOrganizingService_js_1.default.getUserRSVPedEvents(userId);
        res.json({
            success: true,
            data: rsvps
        });
    }
    catch (error) {
        console.error('Get user RSVPs error:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch user RSVPs'
        });
    }
});
/**
 * HEALTH CHECK
 */
router.get('/health', async (req, res) => {
    try {
        // Simple health check - could expand to check database connectivity
        res.json({
            success: true,
            service: 'civic-organizing',
            timestamp: new Date().toISOString(),
            status: 'operational'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            service: 'civic-organizing',
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=civic.js.map