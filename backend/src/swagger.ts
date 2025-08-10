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
        },
        // AI-Powered Topic Analysis System Schemas
        Topic: {
          type: 'object',
          description: 'AI-generated topic cluster from similar posts',
          properties: {
            id: { type: 'string', format: 'cuid', description: 'Unique topic identifier' },
            title: { type: 'string', maxLength: 200, description: 'AI-generated topic title' },
            description: { type: 'string', maxLength: 1000, description: 'Brief description of the topic' },
            category: { type: 'string', maxLength: 50, description: 'Topic category (e.g., healthcare, economy)' },
            argumentsFor: {
              type: 'array',
              items: { type: 'string', maxLength: 500 },
              description: 'AI-extracted key arguments supporting the topic'
            },
            argumentsAgainst: {
              type: 'array',
              items: { type: 'string', maxLength: 500 },
              description: 'AI-extracted key arguments opposing the topic'
            },
            neutralSummary: { type: 'string', maxLength: 2000, description: 'AI-generated neutral summary' },
            complexityScore: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Topic complexity/nuance level (0 = simple, 1 = highly nuanced)'
            },
            evidenceQuality: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Quality of supporting evidence (0 = unsupported claims, 1 = well-sourced)'
            },
            controversyScore: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Controversy level (0 = consensus, 1 = highly contentious)'
            },
            postCount: { type: 'integer', minimum: 0, description: 'Number of posts in this topic' },
            participantCount: { type: 'integer', minimum: 0, description: 'Unique users who have engaged' },
            viewCount: { type: 'integer', minimum: 0, description: 'Total topic views' },
            trendingScore: { type: 'number', minimum: 0, description: 'Algorithm-calculated trending score' },
            isActive: { type: 'boolean', description: 'Whether topic accepts new engagement' },
            lastActivityAt: { type: 'string', format: 'date-time', description: 'Last post or comment time' },
            state: { type: 'string', maxLength: 2, description: 'State relevance (optional)' },
            district: { type: 'string', maxLength: 50, description: 'District relevance (optional)' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'title', 'postCount', 'participantCount', 'trendingScore', 'isActive']
        },
        SubTopic: {
          type: 'object',
          description: 'Focused discussion within a larger topic',
          properties: {
            id: { type: 'string', format: 'cuid' },
            parentTopicId: { type: 'string', format: 'cuid', description: 'ID of parent topic' },
            title: { type: 'string', maxLength: 200, description: 'Sub-topic title' },
            summary: { type: 'string', maxLength: 1000, description: 'AI-generated summary of sub-discussion' },
            commentCount: { type: 'integer', minimum: 0, description: 'Number of comments in sub-topic' },
            participantCount: { type: 'integer', minimum: 0, description: 'Unique commenters in sub-topic' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'parentTopicId', 'title', 'commentCount']
        },
        TopicComment: {
          type: 'object',
          description: 'Threaded comment on a topic or sub-topic',
          properties: {
            id: { type: 'string', format: 'cuid' },
            content: {
              type: 'string',
              minLength: 1,
              maxLength: 2000,
              description: 'Comment content (1-2000 characters)'
            },
            authorId: { type: 'string', format: 'cuid' },
            author: { $ref: '#/components/schemas/User' },
            topicId: { type: 'string', format: 'cuid', description: 'Topic ID (if commenting on topic)' },
            subTopicId: { type: 'string', format: 'cuid', description: 'Sub-topic ID (if commenting on sub-topic)' },
            parentId: { type: 'string', format: 'cuid', description: 'Parent comment ID for threaded replies' },
            replies: {
              type: 'array',
              items: { $ref: '#/components/schemas/TopicComment' },
              description: 'Nested reply comments'
            },
            sentiment: {
              type: 'number',
              minimum: -1,
              maximum: 1,
              description: 'AI sentiment analysis (-1 negative to +1 positive)'
            },
            hostilityScore: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'AI hostility detection (0 = civil, 1 = hostile)'
            },
            argumentStrength: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'How well-reasoned the argument is (0 = poor logic, 1 = strong reasoning)'
            },
            evidenceLevel: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Quality of supporting evidence cited (0 = no evidence, 1 = strong evidence)'
            },
            topicRelevance: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Relevance to core discussion topic (0 = off-topic, 1 = highly relevant)'
            },
            isHidden: { type: 'boolean', description: 'Whether comment is hidden by moderation' },
            hideReason: { type: 'string', description: 'Reason for hiding comment' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'content', 'authorId']
        },
        TopicPost: {
          type: 'object',
          description: 'Post assignment to topic with relevance scoring',
          properties: {
            post: { $ref: '#/components/schemas/Post' },
            relevanceScore: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'AI-calculated relevance to topic (0-1)'
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        TopicDetails: {
          type: 'object',
          description: 'Complete topic information with posts and comments',
          allOf: [
            { $ref: '#/components/schemas/Topic' },
            {
              type: 'object',
              properties: {
                posts: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/TopicPost' },
                  description: 'Posts assigned to this topic'
                },
                subTopics: {
                  type: 'array',
                  items: {
                    allOf: [
                      { $ref: '#/components/schemas/SubTopic' },
                      {
                        type: 'object',
                        properties: {
                          comments: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/TopicComment' }
                          }
                        }
                      }
                    ]
                  },
                  description: 'Sub-topics with their comments'
                },
                topicComments: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/TopicComment' },
                  description: 'Direct comments on the topic'
                }
              }
            }
          ]
        },
        TopicAnalysisResult: {
          type: 'object',
          description: 'Result of AI topic analysis operation',
          properties: {
            message: { type: 'string', description: 'Success message' },
            topicsCreated: { type: 'integer', minimum: 0, description: 'Number of topics created' },
            postsAnalyzed: { type: 'integer', minimum: 0, description: 'Number of posts analyzed' }
          },
          required: ['message', 'topicsCreated', 'postsAnalyzed']
        },
        Office: {
          type: 'object',
          description: 'Political office in an election',
          properties: {
            id: { type: 'string', format: 'cuid' },
            title: { type: 'string', description: 'Office title (e.g., "Governor", "Mayor")' },
            level: {
              type: 'string',
              enum: ['FEDERAL', 'STATE', 'LOCAL', 'MUNICIPAL'],
              description: 'Office level'
            },
            description: { type: 'string', description: 'Office description' },
            state: { type: 'string', maxLength: 2, description: 'Two-letter state code' },
            district: { type: 'string', description: 'District identifier if applicable' },
            jurisdiction: { type: 'string', description: 'Local jurisdiction if applicable' },
            termLength: { type: 'integer', description: 'Term length in years' },
            salary: { type: 'number', description: 'Annual salary if public' },
            electionId: { type: 'string', format: 'cuid' },
            election: { $ref: '#/components/schemas/Election' },
            candidates: {
              type: 'array',
              items: { $ref: '#/components/schemas/Candidate' },
              description: 'Candidates running for this office'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'title', 'level', 'state', 'electionId']
        },
        BallotMeasure: {
          type: 'object',
          description: 'Ballot measure or proposition',
          properties: {
            id: { type: 'string', format: 'cuid' },
            title: { type: 'string', description: 'Short title' },
            description: { type: 'string', description: 'Full description/summary' },
            type: {
              type: 'string',
              enum: ['PROPOSITION', 'BOND_MEASURE', 'CONSTITUTIONAL_AMENDMENT', 'INITIATIVE', 'REFERENDUM'],
              description: 'Type of ballot measure'
            },
            number: { type: 'string', description: 'Ballot number (e.g., "Proposition 1")' },
            fullText: { type: 'string', description: 'Complete text of the measure' },
            fiscalImpact: { type: 'string', description: 'Economic impact analysis' },
            arguments: { type: 'object', description: 'Arguments for/against' },
            state: { type: 'string', maxLength: 2 },
            county: { type: 'string' },
            city: { type: 'string' },
            electionId: { type: 'string', format: 'cuid' },
            election: { $ref: '#/components/schemas/Election' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'title', 'description', 'type', 'state', 'electionId']
        },
        FinancialData: {
          type: 'object',
          description: 'Campaign financial information',
          properties: {
            id: { type: 'string', format: 'cuid' },
            candidateId: { type: 'string', format: 'cuid' },
            totalRaised: { type: 'number', minimum: 0, description: 'Total funds raised' },
            totalSpent: { type: 'number', minimum: 0, description: 'Total funds spent' },
            cashOnHand: { type: 'number', minimum: 0, description: 'Current cash on hand' },
            debts: { type: 'number', minimum: 0, description: 'Outstanding debts' },
            individualDonations: { type: 'number', minimum: 0 },
            pacDonations: { type: 'number', minimum: 0 },
            selfFunding: { type: 'number', minimum: 0 },
            publicFunding: { type: 'number', minimum: 0 },
            reportingPeriod: { type: 'string', description: 'Reporting period (e.g., "Q1 2024")' },
            lastUpdated: { type: 'string', format: 'date-time' },
            sourceUrl: { type: 'string', format: 'uri', description: 'Link to official filing' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'candidateId']
        },
        Endorsement: {
          type: 'object',
          description: 'User endorsement of a candidate',
          properties: {
            id: { type: 'string', format: 'cuid' },
            userId: { type: 'string', format: 'cuid' },
            user: { $ref: '#/components/schemas/User' },
            candidateId: { type: 'string', format: 'cuid' },
            candidate: { $ref: '#/components/schemas/Candidate' },
            reason: { type: 'string', maxLength: 1000, description: 'Reason for endorsement' },
            isPublic: { type: 'boolean', description: 'Whether endorsement is public' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'userId', 'candidateId', 'isPublic']
        },
        // Election System Schemas
        Election: {
          type: 'object',
          description: 'Electoral contest with offices and candidates',
          properties: {
            id: { type: 'string', format: 'cuid' },
            name: { type: 'string', description: 'Election name (e.g., "2024 General Election")' },
            type: {
              type: 'string',
              enum: ['PRIMARY', 'GENERAL', 'SPECIAL', 'LOCAL', 'RUNOFF'],
              description: 'Type of election'
            },
            level: {
              type: 'string',
              enum: ['FEDERAL', 'STATE', 'LOCAL', 'MUNICIPAL'],
              description: 'Election level'
            },
            date: { type: 'string', format: 'date-time', description: 'Election date' },
            registrationDeadline: { type: 'string', format: 'date-time' },
            state: { type: 'string', maxLength: 2, description: 'Two-letter state code' },
            county: { type: 'string', description: 'County for local elections' },
            city: { type: 'string', description: 'City for municipal elections' },
            district: { type: 'string', description: 'Legislative district if applicable' },
            isActive: { type: 'boolean', description: 'Whether election accepts candidates' },
            description: { type: 'string', description: 'Election description' },
            officialUrl: { type: 'string', format: 'uri', description: 'Official election information URL' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'name', 'type', 'level', 'date', 'state']
        },
        Candidate: {
          type: 'object',
          description: 'Political candidate running for office',
          properties: {
            id: { type: 'string', format: 'cuid' },
            name: { type: 'string', description: 'Candidate name as it appears on ballot' },
            party: { type: 'string', description: 'Political party affiliation' },
            isIncumbent: { type: 'boolean', description: 'Whether candidate currently holds office' },
            campaignWebsite: { type: 'string', format: 'uri' },
            campaignEmail: { type: 'string', format: 'email' },
            campaignPhone: { type: 'string' },
            platformSummary: { type: 'string', maxLength: 2000, description: 'Campaign platform summary' },
            keyIssues: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key campaign issues'
            },
            isVerified: { type: 'boolean', description: 'Whether candidate identity is verified' },
            isWithdrawn: { type: 'boolean', description: 'Whether candidate has withdrawn' },
            withdrawnReason: { type: 'string', description: 'Reason for withdrawal if applicable' },
            userId: { type: 'string', format: 'cuid', description: 'Platform user ID if registered' },
            user: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'name']
        },
        // Complete API Response Schemas
        ApiResponse: {
          type: 'object',
          description: 'Standard API response wrapper',
          properties: {
            success: { type: 'boolean', description: 'Whether the request was successful' },
            message: { type: 'string', description: 'Response message' },
            data: { type: 'object', description: 'Response data' },
            pagination: { $ref: '#/components/schemas/PaginationResponse' },
            timestamp: { type: 'string', format: 'date-time', description: 'Response timestamp' }
          },
          required: ['success', 'message']
        },
        ValidationErrorDetail: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'Field that failed validation' },
            message: { type: 'string', description: 'Validation error message' },
            code: { type: 'string', description: 'Error code' },
            value: { description: 'Invalid value that was provided' }
          },
          required: ['field', 'message']
        },
        DetailedError: {
          type: 'object',
          description: 'Detailed error response with validation details',
          allOf: [
            { $ref: '#/components/schemas/Error' },
            {
              type: 'object',
              properties: {
                code: { type: 'string', description: 'Specific error code' },
                timestamp: { type: 'string', format: 'date-time' },
                path: { type: 'string', description: 'API endpoint path' },
                details: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ValidationErrorDetail' }
                }
              }
            }
          ]
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
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: 'Not Found',
                message: 'The requested resource was not found'
              }
            }
          }
        },
        ConflictError: {
          description: 'Resource conflict',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: 'Conflict',
                message: 'Resource already exists'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: 'Internal Server Error',
                message: 'An unexpected error occurred'
              }
            }
          }
        },
        SuccessResponse: {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' }
            }
          }
        },
        CreatedResponse: {
          description: 'Resource created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Resource created successfully' }
                    }
                  }
                ]
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
        },
        TopicIdParam: {
          name: 'topicId',
          in: 'path',
          required: true,
          description: 'Topic ID',
          schema: { type: 'string', format: 'cuid' }
        },
        CandidateIdParam: {
          name: 'candidateId',
          in: 'path',
          required: true,
          description: 'Candidate ID',
          schema: { type: 'string', format: 'cuid' }
        },
        ElectionIdParam: {
          name: 'electionId',
          in: 'path',
          required: true,
          description: 'Election ID',
          schema: { type: 'string', format: 'cuid' }
        },
        StateParam: {
          name: 'state',
          in: 'query',
          description: 'Two-letter state code',
          schema: { type: 'string', pattern: '^[A-Z]{2}$', example: 'CA' }
        },
        CategoryParam: {
          name: 'category',
          in: 'query',
          description: 'Topic category filter',
          schema: { type: 'string', example: 'healthcare' }
        },
        SearchParam: {
          name: 'q',
          in: 'query',
          description: 'Search query',
          schema: { type: 'string', minLength: 1, maxLength: 100 }
        },
        TimeframeParam: {
          name: 'timeframe',
          in: 'query',
          description: 'Time window in hours for trending calculation',
          schema: { type: 'integer', minimum: 1, maximum: 168, default: 24 }
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
      },
      {
        name: 'Topics',
        description: 'AI-powered topic analysis and discussion system'
      },
      {
        name: 'Elections',
        description: 'Election and candidate management'
      },
      {
        name: 'Candidates',
        description: 'Political candidate profiles and endorsements'
      },
      {
        name: 'Onboarding',
        description: 'User onboarding and guided setup'
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