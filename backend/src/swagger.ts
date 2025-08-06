import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'United We Rise API',
      version: '1.0.0',
      description: 'A comprehensive API for the United We Rise political social media platform',
      contact: {
        name: 'United We Rise Team',
        email: 'api@unitedwerise.com',
        url: 'https://unitedwerise.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://api.unitedwerise.com',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login'
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Session-ID',
          description: 'Session ID for additional security'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string', minLength: 3, maxLength: 30 },
            firstName: { type: 'string', maxLength: 50 },
            lastName: { type: 'string', maxLength: 50 },
            avatar: { type: 'string', format: 'uri' },
            bio: { type: 'string', maxLength: 500 },
            website: { type: 'string', format: 'uri' },
            location: { type: 'string', maxLength: 100 },
            verified: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            phoneVerified: { type: 'boolean' },
            isModerator: { type: 'boolean' },
            isAdmin: { type: 'boolean' },
            isSuspended: { type: 'boolean' },
            politicalProfileType: {
              type: 'string',
              enum: ['CITIZEN', 'CANDIDATE', 'ELECTED_OFFICIAL', 'POLITICAL_ORG']
            },
            createdAt: { type: 'string', format: 'date-time' },
            followersCount: { type: 'integer' },
            followingCount: { type: 'integer' }
          }
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            content: { type: 'string', maxLength: 2000 },
            imageUrl: { type: 'string', format: 'uri' },
            isPolitical: { type: 'boolean' },
            tags: { type: 'array', items: { type: 'string' } },
            authorId: { type: 'string', format: 'cuid' },
            author: { $ref: '#/components/schemas/User' },
            likesCount: { type: 'integer' },
            commentsCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Comment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            content: { type: 'string', maxLength: 500 },
            userId: { type: 'string', format: 'cuid' },
            postId: { type: 'string', format: 'cuid' },
            user: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Report: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            targetType: {
              type: 'string',
              enum: ['POST', 'COMMENT', 'USER', 'MESSAGE']
            },
            targetId: { type: 'string', format: 'cuid' },
            reason: {
              type: 'string',
              enum: ['SPAM', 'HARASSMENT', 'HATE_SPEECH', 'MISINFORMATION', 'INAPPROPRIATE_CONTENT', 'FAKE_ACCOUNT', 'IMPERSONATION', 'COPYRIGHT_VIOLATION', 'VIOLENCE_THREATS', 'SELF_HARM', 'ILLEGAL_CONTENT', 'OTHER']
            },
            description: { type: 'string', maxLength: 1000 },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        PoliticalProfile: {
          type: 'object',
          properties: {
            streetAddress: { type: 'string', maxLength: 200 },
            city: { type: 'string', maxLength: 100 },
            state: { type: 'string', pattern: '^[A-Z]{2}$' },
            zipCode: { type: 'string', pattern: '^\\d{5}(-\\d{4})?$' },
            politicalParty: { type: 'string', maxLength: 50 },
            office: { type: 'string', maxLength: 100 },
            officialTitle: { type: 'string', maxLength: 100 },
            campaignWebsite: { type: 'string', format: 'uri' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            total: { type: 'integer', minimum: 0 },
            pages: { type: 'integer', minimum: 0 }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Too many requests' },
                  retryAfter: { type: 'integer', description: 'Seconds until rate limit resets' }
                }
              }
            }
          }
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          schema: { type: 'integer', minimum: 1, default: 1 }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        },
        UserIdParam: {
          name: 'userId',
          in: 'path',
          required: true,
          description: 'User ID',
          schema: { type: 'string', format: 'cuid' }
        },
        PostIdParam: {
          name: 'postId',
          in: 'path',
          required: true,
          description: 'Post ID',
          schema: { type: 'string', format: 'cuid' }
        }
      }
    },
    security: [
      { bearerAuth: [] },
      { sessionAuth: [] }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User management and profiles'
      },
      {
        name: 'Posts',
        description: 'Content creation and management'
      },
      {
        name: 'Political',
        description: 'Political information and representatives'
      },
      {
        name: 'Moderation',
        description: 'Content moderation and reporting'
      },
      {
        name: 'Admin',
        description: 'Administrative functions (admin only)'
      },
      {
        name: 'Verification',
        description: 'Email and phone verification'
      },
      {
        name: 'Appeals',
        description: 'Suspension appeals system'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/swagger-docs/*.yaml'
  ]
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2563eb; }
    `,
    customSiteTitle: 'United We Rise API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true
    }
  }));

  // JSON spec endpoint
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export { specs };