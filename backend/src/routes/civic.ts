/**
 * Civic Organizing API Routes
 * 
 * Handles petitions, events, signatures, and RSVPs
 * Provides search and filtering capabilities
 */

import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import civicOrganizingService from '../services/civicOrganizingService.js';
import { authenticateUser } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

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

// Create petition
router.post('/petitions', 
  authenticateUser,
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
      console.error('Create petition error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to create petition'
      });
    }
  }
);

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

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

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
      console.error('Get petitions error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch petitions'
      });
    }
  }
);

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
      console.error('Get petition error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch petition'
      });
    }
  }
);

// Sign petition
router.post('/petitions/:id/sign',
  authenticateUser,
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
      console.error('Sign petition error:', error);
      res.status(400).json({ 
        error: error.message || 'Failed to sign petition'
      });
    }
  }
);

/**
 * EVENT ENDPOINTS
 */

// Create event
router.post('/events',
  authenticateUser,
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
      console.error('Create event error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to create event'
      });
    }
  }
);

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

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

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
      console.error('Get events error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch events'
      });
    }
  }
);

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
      console.error('Get event error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch event'
      });
    }
  }
);

// RSVP to event
router.post('/events/:id/rsvp',
  authenticateUser,
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
      console.error('RSVP event error:', error);
      res.status(400).json({ 
        error: error.message || 'Failed to RSVP to event'
      });
    }
  }
);

/**
 * SEARCH ENDPOINT
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

      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters: any = {};
      if (req.query.category) filters.category = req.query.category;
      if (req.query.eventType) filters.eventType = req.query.eventType;

      const result = await civicOrganizingService.searchCivic(query, filters, page, limit);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('Search civic error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to search civic content'
      });
    }
  }
);

/**
 * USER ACTIVITY ENDPOINTS
 */

// Get user's created petitions
router.get('/user/petitions',
  authenticateUser,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const petitions = await civicOrganizingService.getUserPetitions(userId);

      res.json({
        success: true,
        data: petitions
      });

    } catch (error: any) {
      console.error('Get user petitions error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch user petitions'
      });
    }
  }
);

// Get user's created events
router.get('/user/events',
  authenticateUser,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const events = await civicOrganizingService.getUserEvents(userId);

      res.json({
        success: true,
        data: events
      });

    } catch (error: any) {
      console.error('Get user events error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch user events'
      });
    }
  }
);

// Get user's signed petitions
router.get('/user/signatures',
  authenticateUser,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const signatures = await civicOrganizingService.getUserSignedPetitions(userId);

      res.json({
        success: true,
        data: signatures
      });

    } catch (error: any) {
      console.error('Get user signatures error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch user signatures'
      });
    }
  }
);

// Get user's RSVP'd events
router.get('/user/rsvps',
  authenticateUser,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const rsvps = await civicOrganizingService.getUserRSVPedEvents(userId);

      res.json({
        success: true,
        data: rsvps
      });

    } catch (error: any) {
      console.error('Get user RSVPs error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch user RSVPs'
      });
    }
  }
);

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      service: 'civic-organizing',
      error: error.message
    });
  }
});

export default router;