/**
 * Civic Organizing API Routes
 *
 * Handles petitions, events, signatures, and RSVPs
 * Provides search and filtering capabilities
 */

import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import civicOrganizingService from '../services/civicOrganizingService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { logger } from '../services/logger';
import { safePaginationParams, PAGINATION_LIMITS } from '../utils/safeJson';

const router = express.Router();

// Rate limiting for civic actions
const civicActionLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each user to 10 civic actions per windowMs
  message: { error: 'Too many civic actions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const civicBrowseLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each user to 60 browse requests per minute
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * PETITION ENDPOINTS
 */

/**
 * @swagger
 * /api/civic/petitions:
 *   post:
 *     tags: [Civic]
 *     summary: Create a new petition
 *     description: Creates a civic petition or referendum with validation and targeting
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - petitionType
 *               - category
 *               - geographicScope
 *               - signatureGoal
 *               - targetOfficials
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 200
 *                 description: Petition title
 *               description:
 *                 type: string
 *                 minLength: 50
 *                 maxLength: 5000
 *                 description: Detailed petition description
 *               petitionType:
 *                 type: string
 *                 enum: [PETITION, REFERENDUM]
 *                 description: Type of petition
 *               category:
 *                 type: string
 *                 enum: [HEALTHCARE, EDUCATION, ENVIRONMENT, ECONOMY, INFRASTRUCTURE, PUBLIC_SAFETY, HOUSING, TRANSPORTATION, TECHNOLOGY, CIVIL_RIGHTS, IMMIGRATION, ENERGY, AGRICULTURE, VETERANS, SENIORS, YOUTH, LABOR, GOVERNMENT_REFORM, OTHER]
 *                 description: Petition category
 *               geographicScope:
 *                 type: string
 *                 enum: [LOCAL, COUNTY, STATE, NATIONAL, REGIONAL]
 *                 description: Geographic scope of petition
 *               signatureGoal:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000000
 *                 description: Target number of signatures
 *               targetOfficials:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of targeted officials
 *               location:
 *                 type: object
 *                 description: Geographic location data
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Petition expiration date
 *     responses:
 *       201:
 *         description: Petition created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Petition created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Petition'
 *       400:
 *         description: Validation error - invalid input
 *       401:
 *         description: Unauthorized - authentication required
 *       429:
 *         description: Too many civic actions
 *       500:
 *         description: Failed to create petition
 */
// Create petition
router.post('/petitions', 
  requireAuth,
  civicActionLimit,
  [
    body('title').isLength({ min: 10, max: 200 }).withMessage('Title must be 10-200 characters'),
    body('description').isLength({ min: 50, max: 5000 }).withMessage('Description must be 50-5000 characters'),
    body('petitionType').isIn(['PETITION', 'REFERENDUM']).withMessage('Invalid petition type'),
    body('category').isIn([
      'HEALTHCARE', 'EDUCATION', 'ENVIRONMENT', 'ECONOMY', 'INFRASTRUCTURE', 
      'PUBLIC_SAFETY', 'HOUSING', 'TRANSPORTATION', 'TECHNOLOGY', 'CIVIL_RIGHTS',
      'IMMIGRATION', 'ENERGY', 'AGRICULTURE', 'VETERANS', 'SENIORS', 'YOUTH',
      'LABOR', 'GOVERNMENT_REFORM', 'OTHER'
    ]).withMessage('Invalid category'),
    body('geographicScope').isIn(['LOCAL', 'COUNTY', 'STATE', 'NATIONAL', 'REGIONAL']).withMessage('Invalid geographic scope'),
    body('signatureGoal').isInt({ min: 1, max: 1000000 }).withMessage('Signature goal must be 1-1,000,000'),
    body('targetOfficials').isArray().withMessage('Target officials must be an array'),
    body('targetOfficials.*').isString().withMessage('Each target official must be a string'),
    body('location').optional().isObject().withMessage('Location must be an object'),
    body('expiresAt').optional().isISO8601().withMessage('Expires at must be a valid date')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = (req as any).user.id;
      const petitionData = req.body;

      // Convert expiresAt to Date if provided
      if (petitionData.expiresAt) {
        petitionData.expiresAt = new Date(petitionData.expiresAt);
      }

      const petition = await civicOrganizingService.createPetition(userId, petitionData);

      res.status(201).json({
        success: true,
        message: 'Petition created successfully',
        data: petition
      });

    } catch (error: any) {
      logger.error({ error, userId: (req as any).user?.id }, 'Create petition error');
      res.status(500).json({
        error: error.message || 'Failed to create petition'
      });
    }
  }
);

/**
 * @swagger
 * /api/civic/petitions:
 *   get:
 *     tags: [Civic]
 *     summary: Get filtered petitions
 *     description: Retrieves petitions with optional filtering by category, scope, status, and proximity
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by petition category
 *       - in: query
 *         name: geographicScope
 *         schema:
 *           type: string
 *         description: Filter by geographic scope
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, EXPIRED, CLOSED, UNDER_REVIEW]
 *         description: Filter by petition status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: proximity
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 500
 *         description: Search radius in miles
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude for proximity search
 *       - in: query
 *         name: lon
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude for proximity search
 *     responses:
 *       200:
 *         description: Petitions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     petitions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Petition'
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Failed to fetch petitions
 */
// Get petitions with filtering
router.get('/petitions',
  civicBrowseLimit,
  [
    query('category').optional().isString(),
    query('geographicScope').optional().isString(),
    query('status').optional().isIn(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CLOSED', 'UNDER_REVIEW']),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    query('proximity').optional().isFloat({ min: 1, max: 500 }).withMessage('Proximity must be 1-500 miles'),
    query('lat').optional().isFloat({ min: -90, max: 90 }),
    query('lon').optional().isFloat({ min: -180, max: 180 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { limit, offset } = safePaginationParams(
        req.query.limit as string | undefined,
        req.query.offset as string | undefined
      );
      const page = Math.floor(offset / limit) + 1;

      const filters: any = {};

      if (req.query.category) filters.category = req.query.category;
      if (req.query.geographicScope) filters.geographicScope = req.query.geographicScope;
      if (req.query.status) filters.status = req.query.status;

      if (req.query.proximity && req.query.lat && req.query.lon) {
        filters.proximity = parseFloat(req.query.proximity as string);
        filters.coordinates = {
          lat: parseFloat(req.query.lat as string),
          lon: parseFloat(req.query.lon as string)
        };
      }

      const result = await civicOrganizingService.getPetitions(filters, page, limit);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error }, 'Get petitions error');
      res.status(500).json({
        error: error.message || 'Failed to fetch petitions'
      });
    }
  }
);

/**
 * @swagger
 * /api/civic/petitions/{id}:
 *   get:
 *     tags: [Civic]
 *     summary: Get petition by ID
 *     description: Retrieves a specific petition with complete details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Petition ID
 *     responses:
 *       200:
 *         description: Petition retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Petition'
 *       400:
 *         description: Invalid petition ID
 *       404:
 *         description: Petition not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Failed to fetch petition
 */
// Get petition by ID
router.get('/petitions/:id',
  civicBrowseLimit,
  [
    param('id').isString().withMessage('Invalid petition ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const petition = await civicOrganizingService.getPetitionById(req.params.id);

      if (!petition) {
        return res.status(404).json({ error: 'Petition not found' });
      }

      res.json({
        success: true,
        data: petition
      });

    } catch (error: any) {
      logger.error({ error, petitionId: req.params.id }, 'Get petition error');
      res.status(500).json({
        error: error.message || 'Failed to fetch petition'
      });
    }
  }
);

/**
 * @swagger
 * /api/civic/petitions/{id}/sign:
 *   post:
 *     tags: [Civic]
 *     summary: Sign a petition
 *     description: Records user signature on a petition with IP tracking
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Petition ID
 *     responses:
 *       201:
 *         description: Petition signed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Petition signed successfully
 *                 data:
 *                   $ref: '#/components/schemas/PetitionSignature'
 *       400:
 *         description: Invalid petition ID or already signed
 *       401:
 *         description: Unauthorized - authentication required
 *       429:
 *         description: Too many civic actions
 *       500:
 *         description: Failed to sign petition
 */
// Sign petition
router.post('/petitions/:id/sign',
  requireAuth,
  civicActionLimit,
  [
    param('id').isString().withMessage('Invalid petition ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = (req as any).user.id;
      const petitionId = req.params.id;
      const ipAddress = req.ip;

      const signature = await civicOrganizingService.signPetition(userId, petitionId, ipAddress);

      res.status(201).json({
        success: true,
        message: 'Petition signed successfully',
        data: signature
      });

    } catch (error: any) {
      logger.error({ error, userId: (req as any).user?.id, petitionId: req.params.id }, 'Sign petition error');
      res.status(400).json({
        error: error.message || 'Failed to sign petition'
      });
    }
  }
);

/**
 * EVENT ENDPOINTS
 */

/**
 * @swagger
 * /api/civic/events:
 *   post:
 *     tags: [Civic]
 *     summary: Create a civic event
 *     description: Creates a civic event such as town hall, rally, or community meeting
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - eventType
 *               - category
 *               - scheduledDate
 *               - location
 *               - organizerInfo
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 200
 *                 description: Event title
 *               description:
 *                 type: string
 *                 minLength: 50
 *                 maxLength: 5000
 *                 description: Detailed event description
 *               eventType:
 *                 type: string
 *                 enum: [TOWN_HALL, CANDIDATE_FORUM, DEBATE, RALLY, PROTEST, MARCH, VOTER_REGISTRATION, ISSUE_FORUM, COMMUNITY_MEETING, WORKSHOP, EDUCATIONAL_SEMINAR, FUNDRAISER, VOLUNTEER_DRIVE, PETITION_DRIVE, PHONE_BANK, CANVASSING, OTHER]
 *                 description: Type of civic event
 *               category:
 *                 type: string
 *                 enum: [ELECTORAL, CIVIC_ENGAGEMENT, ORGANIZING_ACTIVITIES, EDUCATIONAL, ADVOCACY, FUNDRAISING]
 *                 description: Event category
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 description: Event start date and time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Event end date and time (optional)
 *               location:
 *                 type: object
 *                 required:
 *                   - address
 *                   - city
 *                   - state
 *                 properties:
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *               organizerInfo:
 *                 type: object
 *                 required:
 *                   - name
 *                   - contact
 *                 properties:
 *                   name:
 *                     type: string
 *                   contact:
 *                     type: string
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100000
 *                 description: Maximum attendees
 *               isVirtual:
 *                 type: boolean
 *                 description: Whether event is virtual
 *               virtualLink:
 *                 type: string
 *                 format: uri
 *                 description: Virtual meeting link
 *               rsvpRequired:
 *                 type: boolean
 *                 description: Whether RSVP is required
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Event created successfully
 *                 data:
 *                   $ref: '#/components/schemas/CivicEvent'
 *       400:
 *         description: Validation error or invalid date
 *       401:
 *         description: Unauthorized - authentication required
 *       429:
 *         description: Too many civic actions
 *       500:
 *         description: Failed to create event
 */
// Create event
router.post('/events',
  requireAuth,
  civicActionLimit,
  [
    body('title').isLength({ min: 10, max: 200 }).withMessage('Title must be 10-200 characters'),
    body('description').isLength({ min: 50, max: 5000 }).withMessage('Description must be 50-5000 characters'),
    body('eventType').isIn([
      'TOWN_HALL', 'CANDIDATE_FORUM', 'DEBATE', 'RALLY', 'PROTEST', 'MARCH',
      'VOTER_REGISTRATION', 'ISSUE_FORUM', 'COMMUNITY_MEETING', 'WORKSHOP',
      'EDUCATIONAL_SEMINAR', 'FUNDRAISER', 'VOLUNTEER_DRIVE', 'PETITION_DRIVE',
      'PHONE_BANK', 'CANVASSING', 'OTHER'
    ]).withMessage('Invalid event type'),
    body('category').isIn([
      'ELECTORAL', 'CIVIC_ENGAGEMENT', 'ORGANIZING_ACTIVITIES', 'EDUCATIONAL', 'ADVOCACY', 'FUNDRAISING'
    ]).withMessage('Invalid category'),
    body('scheduledDate').isISO8601().withMessage('Scheduled date must be a valid date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    body('location').isObject().withMessage('Location is required'),
    body('location.address').isString().withMessage('Address is required'),
    body('location.city').isString().withMessage('City is required'),
    body('location.state').isString().withMessage('State is required'),
    body('organizerInfo').isObject().withMessage('Organizer info is required'),
    body('organizerInfo.name').isString().withMessage('Organizer name is required'),
    body('organizerInfo.contact').isString().withMessage('Organizer contact is required'),
    body('capacity').optional().isInt({ min: 1, max: 100000 }).withMessage('Capacity must be 1-100,000'),
    body('isVirtual').optional().isBoolean(),
    body('virtualLink').optional().isURL().withMessage('Virtual link must be a valid URL'),
    body('rsvpRequired').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = (req as any).user.id;
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

      const event = await civicOrganizingService.createEvent(userId, eventData);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });

    } catch (error: any) {
      logger.error({ error, userId: (req as any).user?.id }, 'Create event error');
      res.status(500).json({
        error: error.message || 'Failed to create event'
      });
    }
  }
);

/**
 * @swagger
 * /api/civic/events:
 *   get:
 *     tags: [Civic]
 *     summary: Get filtered civic events
 *     description: Retrieves civic events with optional filtering by type, category, timeframe, status, and proximity
 *     parameters:
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by event category
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [week, month, future]
 *         description: Filter by timeframe
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, POSTPONED]
 *         description: Filter by event status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: proximity
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 500
 *         description: Search radius in miles
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude for proximity search
 *       - in: query
 *         name: lon
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude for proximity search
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CivicEvent'
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Failed to fetch events
 */
// Get events with filtering
router.get('/events',
  civicBrowseLimit,
  [
    query('eventType').optional().isString(),
    query('category').optional().isString(),
    query('timeframe').optional().isIn(['week', 'month', 'future']),
    query('status').optional().isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    query('proximity').optional().isFloat({ min: 1, max: 500 }).withMessage('Proximity must be 1-500 miles'),
    query('lat').optional().isFloat({ min: -90, max: 90 }),
    query('lon').optional().isFloat({ min: -180, max: 180 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { limit, offset } = safePaginationParams(
        req.query.limit as string | undefined,
        req.query.offset as string | undefined
      );
      const page = Math.floor(offset / limit) + 1;

      const filters: any = {};

      if (req.query.eventType) filters.eventType = req.query.eventType;
      if (req.query.category) filters.category = req.query.category;
      if (req.query.timeframe) filters.timeframe = req.query.timeframe;
      if (req.query.status) filters.status = req.query.status;

      if (req.query.proximity && req.query.lat && req.query.lon) {
        filters.proximity = parseFloat(req.query.proximity as string);
        filters.coordinates = {
          lat: parseFloat(req.query.lat as string),
          lon: parseFloat(req.query.lon as string)
        };
      }

      const result = await civicOrganizingService.getEvents(filters, page, limit);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error }, 'Get events error');
      res.status(500).json({
        error: error.message || 'Failed to fetch events'
      });
    }
  }
);

/**
 * @swagger
 * /api/civic/events/{id}:
 *   get:
 *     tags: [Civic]
 *     summary: Get event by ID
 *     description: Retrieves a specific civic event with complete details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CivicEvent'
 *       400:
 *         description: Invalid event ID
 *       404:
 *         description: Event not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Failed to fetch event
 */
// Get event by ID
router.get('/events/:id',
  civicBrowseLimit,
  [
    param('id').isString().withMessage('Invalid event ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const event = await civicOrganizingService.getEventById(req.params.id);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      res.json({
        success: true,
        data: event
      });

    } catch (error: any) {
      logger.error({ error, eventId: req.params.id }, 'Get event error');
      res.status(500).json({
        error: error.message || 'Failed to fetch event'
      });
    }
  }
);

/**
 * @swagger
 * /api/civic/events/{id}/rsvp:
 *   post:
 *     tags: [Civic]
 *     summary: RSVP to an event
 *     description: Records user's RSVP status for a civic event
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ATTENDING, MAYBE, NOT_ATTENDING]
 *                 default: ATTENDING
 *                 description: RSVP status
 *     responses:
 *       201:
 *         description: RSVP recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: RSVP recorded successfully
 *                 data:
 *                   $ref: '#/components/schemas/EventRSVP'
 *       400:
 *         description: Invalid event ID or RSVP status
 *       401:
 *         description: Unauthorized - authentication required
 *       429:
 *         description: Too many civic actions
 *       500:
 *         description: Failed to RSVP to event
 */
// RSVP to event
router.post('/events/:id/rsvp',
  requireAuth,
  civicActionLimit,
  [
    param('id').isString().withMessage('Invalid event ID'),
    body('status').optional().isIn(['ATTENDING', 'MAYBE', 'NOT_ATTENDING']).withMessage('Invalid RSVP status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = (req as any).user.id;
      const eventId = req.params.id;
      const status = req.body.status || 'ATTENDING';

      const rsvp = await civicOrganizingService.rsvpToEvent(userId, eventId, status);

      res.status(201).json({
        success: true,
        message: 'RSVP recorded successfully',
        data: rsvp
      });

    } catch (error: any) {
      logger.error({ error, userId: (req as any).user?.id, eventId: req.params.id }, 'RSVP event error');
      res.status(400).json({
        error: error.message || 'Failed to RSVP to event'
      });
    }
  }
);

/**
 * SEARCH ENDPOINT
 */

/**
 * @swagger
 * /api/civic/search:
 *   get:
 *     tags: [Civic]
 *     summary: Search civic content
 *     description: Search across petitions and events with text query and filters
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Search query text
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     petitions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Petition'
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CivicEvent'
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Validation error - invalid query
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Failed to search civic content
 */
// Search across petitions and events
router.get('/search',
  civicBrowseLimit,
  [
    query('q').isLength({ min: 2, max: 100 }).withMessage('Query must be 2-100 characters'),
    query('category').optional().isString(),
    query('eventType').optional().isString(),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const searchQuery = req.query.q as string;
      const { limit, offset } = safePaginationParams(
        req.query.limit as string | undefined,
        req.query.offset as string | undefined
      );
      const page = Math.floor(offset / limit) + 1;

      const filters: any = {};
      if (req.query.category) filters.category = req.query.category;
      if (req.query.eventType) filters.eventType = req.query.eventType;

      const result = await civicOrganizingService.searchCivic(searchQuery, filters, page, limit);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error({ error, query: req.query.q }, 'Search civic error');
      res.status(500).json({
        error: error.message || 'Failed to search civic content'
      });
    }
  }
);

/**
 * USER ACTIVITY ENDPOINTS
 */

/**
 * @swagger
 * /api/civic/user/petitions:
 *   get:
 *     tags: [Civic]
 *     summary: Get user's created petitions
 *     description: Retrieves all petitions created by the authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User petitions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Petition'
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Failed to fetch user petitions
 */
// Get user's created petitions
router.get('/user/petitions',
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const petitions = await civicOrganizingService.getUserPetitions(userId);

      res.json({
        success: true,
        data: petitions
      });

    } catch (error: any) {
      logger.error({ error, userId: (req as any).user?.id }, 'Get user petitions error');
      res.status(500).json({
        error: error.message || 'Failed to fetch user petitions'
      });
    }
  }
);

/**
 * @swagger
 * /api/civic/user/events:
 *   get:
 *     tags: [Civic]
 *     summary: Get user's created events
 *     description: Retrieves all events created by the authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CivicEvent'
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Failed to fetch user events
 */
// Get user's created events
router.get('/user/events',
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const events = await civicOrganizingService.getUserEvents(userId);

      res.json({
        success: true,
        data: events
      });

    } catch (error: any) {
      logger.error({ error, userId: (req as any).user?.id }, 'Get user events error');
      res.status(500).json({
        error: error.message || 'Failed to fetch user events'
      });
    }
  }
);

/**
 * @swagger
 * /api/civic/user/signatures:
 *   get:
 *     tags: [Civic]
 *     summary: Get user's signed petitions
 *     description: Retrieves all petitions the authenticated user has signed
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User signatures retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PetitionSignature'
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Failed to fetch user signatures
 */
// Get user's signed petitions
router.get('/user/signatures',
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const signatures = await civicOrganizingService.getUserSignedPetitions(userId);

      res.json({
        success: true,
        data: signatures
      });

    } catch (error: any) {
      logger.error({ error, userId: (req as any).user?.id }, 'Get user signatures error');
      res.status(500).json({
        error: error.message || 'Failed to fetch user signatures'
      });
    }
  }
);

/**
 * @swagger
 * /api/civic/user/rsvps:
 *   get:
 *     tags: [Civic]
 *     summary: Get user's RSVP'd events
 *     description: Retrieves all events the authenticated user has RSVP'd to
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User RSVPs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventRSVP'
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Failed to fetch user RSVPs
 */
// Get user's RSVP'd events
router.get('/user/rsvps',
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const rsvps = await civicOrganizingService.getUserRSVPedEvents(userId);

      res.json({
        success: true,
        data: rsvps
      });

    } catch (error: any) {
      logger.error({ error, userId: (req as any).user?.id }, 'Get user RSVPs error');
      res.status(500).json({
        error: error.message || 'Failed to fetch user RSVPs'
      });
    }
  }
);

/**
 * HEALTH CHECK
 */

/**
 * @swagger
 * /api/civic/health:
 *   get:
 *     tags: [Civic]
 *     summary: Civic service health check
 *     description: Returns operational status of the civic organizing service
 *     responses:
 *       200:
 *         description: Service is operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 service:
 *                   type: string
 *                   example: civic-organizing
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 status:
 *                   type: string
 *                   example: operational
 *       500:
 *         description: Service health check failed
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      service: 'civic-organizing',
      error: error.message
    });
  }
});

export default router;