# Phase 2: Documentation Restructuring Plan

**Created**: 2025-10-09
**Status**: Planning
**Goal**: Split monolithic MASTER_DOCUMENTATION.md into modular, maintainable documentation system
**Estimated Effort**: 20-25 developer days across 3-4 weeks

---

## Executive Summary

### Current State
- **MASTER_DOCUMENTATION.md**: 20,115 lines (711 KB) - monolithic single-file documentation
- **Specialized docs created** (Phase 1): 4 modular documents extracted (230KB total)
  - `API_QUESTS_BADGES.md` (38KB) - Quest and badge system API
  - `API_SAVED_POSTS_GALLERY.md` (37KB) - Saved posts and gallery API
  - `DATABASE_SCHEMA.md` (71KB) - Comprehensive database documentation
  - `CIVIC_ENGAGEMENT.md` (84KB) - Civic organizing features
- **Phase 1 cleanup planned**: Removal of 2,992 lines of redundancy (see REDUNDANCY_REMOVAL_PLAN.md)
- **Projected post-Phase-1 size**: ~17,000 lines after redundancy removal

### Problems with Current Structure
1. **Difficult navigation**: Finding specific information requires scrolling through 20K lines
2. **Slow to load**: 711KB file causes editor lag and slow searches
3. **Merge conflicts**: Multiple developers editing same large file causes conflicts
4. **Hard to maintain**: Updates scattered across single massive file
5. **Poor organization**: Related content dispersed across different sections
6. **Intimidating for new developers**: 20K lines overwhelms onboarding

### Target State
- **Modular documentation system**: 15-20 focused documents (average 500-2,000 lines each)
- **Clear separation of concerns**: Architecture, APIs, Operations, Development, Features
- **Easy navigation**: Documentation hub (README.md) with clear paths to all content
- **Professional structure**: Matches industry standards (similar to AWS, Stripe, GitHub docs)
- **Maintainable**: Smaller files easier to edit, review, and update
- **Fast to load**: Individual files load instantly, better search performance

### Success Metrics
- MASTER_DOCUMENTATION.md reduced to < 5,000 lines OR archived entirely
- Zero broken cross-references after migration
- New developer can find setup guide in < 1 minute
- Experienced developer can find any API endpoint in < 2 minutes
- Documentation contribution time reduced by 50% (easier to edit smaller files)
- 100% of existing content preserved or relocated (no information loss)

---

## Proposed Documentation Structure

```
docs/
├── README.md                           (NEW: Navigation hub, 200 lines)
├── GETTING_STARTED.md                  (NEW: New developer onboarding, 500 lines)
├── ARCHITECTURE.md                     (NEW: System design and decisions, 2,000 lines)
├── OPERATIONS.md                       (NEW: Deployment and infrastructure, 2,500 lines)
├── DEVELOPMENT_GUIDE.md                (NEW: Development patterns and practices, 1,500 lines)
├── TROUBLESHOOTING.md                  (NEW: Diagnostic guides by symptom, 2,000 lines)
│
├── API_REFERENCE.md                    (NEW: Core API endpoints, 3,000 lines)
├── API_QUESTS_BADGES.md                (EXISTS: Quest/badge APIs, 1,150 lines)
├── API_SAVED_POSTS_GALLERY.md          (EXISTS: Saved posts/gallery APIs, 1,100 lines)
│
├── DATABASE_SCHEMA.md                  (EXISTS: Database models, 2,100 lines)
├── CIVIC_ENGAGEMENT.md                 (EXISTS: Civic organizing, 2,500 lines)
├── SECURITY.md                         (NEW: Security architecture, 1,500 lines)
├── PERFORMANCE.md                      (NEW: Performance optimization, 1,000 lines)
│
├── FEATURE_DOCS/                       (NEW DIRECTORY: Individual feature deep-dives)
│   ├── FEED_ALGORITHM.md               (Feed generation and probability cloud, 800 lines)
│   ├── GEOGRAPHIC_PRIVACY.md           (H3 geospatial and privacy system, 1,000 lines)
│   ├── WEBSOCKET_MESSAGING.md          (Real-time messaging architecture, 700 lines)
│   ├── PAYMENT_SYSTEM.md               (Stripe nonprofit payments, 600 lines)
│   ├── MOBILE_UI.md                    (Mobile-responsive UI system, 500 lines)
│   ├── PHOTO_TAGGING.md                (Photo upload and tagging, 500 lines)
│   ├── RELATIONSHIP_SYSTEM.md          (Friends/followers, 400 lines)
│   ├── AI_TRENDING_TOPICS.md           (AI topic discovery, 500 lines)
│   ├── ELECTION_TRACKING.md            (Election and candidate systems, 800 lines)
│   ├── REPUTATION_SYSTEM.md            (Reputation scoring, 400 lines)
│   └── SEARCH_SYSTEM.md                (Enhanced search, 400 lines)
│
├── CHANGELOG.md                        (EXISTS: Historical timeline)
├── MASTER_DOCUMENTATION.md             (LEGACY: Archived or minimal reference, < 5,000 lines)
└── CLAUDE.md                           (EXISTS: Development protocols - in root, not docs/)
```

**Total projected lines**: ~25,000 lines across 25 files (average 1,000 lines/file)
**Note**: Slightly more than current 20K lines due to necessary duplication for context (cross-references add headers/intros)

---

## Detailed File Breakdown

### docs/README.md (NEW - Navigation Hub)

**Purpose**: Central documentation index and navigation hub
**Size**: ~200 lines
**Priority**: Phase 2.1 (Week 1)

**Content Structure**:
```markdown
# United We Rise - Documentation

## Overview
Brief project description (3-4 paragraphs)

## Quick Navigation

### Getting Started
- [New Developer Setup](GETTING_STARTED.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Development Guide](DEVELOPMENT_GUIDE.md)

### API Reference
- [Core APIs](API_REFERENCE.md) - Authentication, users, posts, feed
- [Quest & Badge APIs](API_QUESTS_BADGES.md)
- [Saved Posts & Gallery APIs](API_SAVED_POSTS_GALLERY.md)

### Operations & Deployment
- [Deployment Procedures](OPERATIONS.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Performance Monitoring](PERFORMANCE.md)

### System Documentation
- [Database Schema](DATABASE_SCHEMA.md)
- [Security Architecture](SECURITY.md)
- [Civic Engagement Features](CIVIC_ENGAGEMENT.md)

### Feature Documentation
- [Feed Algorithm](FEATURE_DOCS/FEED_ALGORITHM.md)
- [Geographic Privacy](FEATURE_DOCS/GEOGRAPHIC_PRIVACY.md)
- [WebSocket Messaging](FEATURE_DOCS/WEBSOCKET_MESSAGING.md)
- [All Features →](FEATURE_DOCS/)

## Common Tasks
- [Deploy to staging](OPERATIONS.md#staging-deployment)
- [Run database migration](OPERATIONS.md#database-migrations)
- [Debug authentication issues](TROUBLESHOOTING.md#authentication-errors)
- [Add new API endpoint](DEVELOPMENT_GUIDE.md#api-patterns)

## Documentation Standards
- [Contributing to docs](DEVELOPMENT_GUIDE.md#documentation-standards)
- [Style guide](DEVELOPMENT_GUIDE.md#documentation-style)

## Change History
See [CHANGELOG.md](../CHANGELOG.md) for complete development timeline
```

**Source Content**:
- New navigation structure based on modular docs
- Executive summary from MASTER_DOCUMENTATION.md (lines 79-122) condensed to 3-4 paragraphs
- Quick links to common developer tasks

---

### docs/GETTING_STARTED.md (NEW - Developer Onboarding)

**Purpose**: Get new developers productive in < 2 hours
**Size**: ~500 lines
**Priority**: Phase 2.1 (Week 1)

**Content Structure**:
```markdown
# Getting Started - United We Rise Development

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Azure CLI (for deployment)
- Git

## Local Development Setup

### 1. Clone Repository
[Commands]

### 2. Backend Setup
[Database connection, environment variables, npm install]

### 3. Frontend Setup
[Static file serving or local dev server]

### 4. Verify Installation
[Health check commands]

## Your First Contribution

### Understanding the Codebase
- [Architecture overview](ARCHITECTURE.md) - System design
- [Directory structure](ARCHITECTURE.md#directory-structure)
- [ES6 module system](ARCHITECTURE.md#es6-modules)

### Making Your First Change
1. Find a good first issue
2. Create feature branch
3. Make changes
4. Test locally
5. Submit PR

## Common Development Tasks

### Running Tests
[Commands]

### Database Migrations
[See OPERATIONS.md for full procedures, basic commands here]

### Deploying to Staging
[See OPERATIONS.md for full procedures, basic commands here]

## Where to Find What

### I want to add a new feature
→ [Development Guide](DEVELOPMENT_GUIDE.md)

### I want to add/modify API endpoint
→ [API Reference](API_REFERENCE.md)
→ [Development Guide - API Patterns](DEVELOPMENT_GUIDE.md#api-patterns)

### I need to understand database schema
→ [Database Schema](DATABASE_SCHEMA.md)

### I'm getting errors
→ [Troubleshooting Guide](TROUBLESHOOTING.md)

## Development Environment

### Staging vs Production
[Environment detection, URLs, when to use each]

### Admin Access
[How to access admin dashboard, admin credentials for staging]

## Getting Help
- Check [Troubleshooting Guide](TROUBLESHOOTING.md)
- Review [CHANGELOG.md](../CHANGELOG.md) for recent changes
- Ask team on [communication channel]
```

**Source Content**:
- Currently scattered across MASTER_DOCUMENTATION.md and CLAUDE.md
- Consolidate setup procedures from both files
- Add clear navigation to other docs

---

### docs/ARCHITECTURE.md (NEW - System Design)

**Purpose**: Comprehensive system architecture and design decisions
**Size**: ~2,000 lines
**Priority**: Phase 2.1 (Week 1)

**Content Structure**:
```markdown
# System Architecture - United We Rise

## Table of Contents
[Detailed TOC]

## System Overview

### Revolutionary Concept
[Geography-based social graph explanation]

### Core Innovation
[Key differentiators from traditional social media]

### High-Level Architecture
[System diagram showing all components]

## Technology Stack

### Backend Stack
[Node.js, Express, TypeScript, Prisma, etc.]
**Why these technologies**: [Architectural decision records]

### Frontend Stack
[Vanilla JS, ES6 modules, Web APIs]
**Why vanilla JavaScript**: [Decision rationale]

### Infrastructure Stack
[Azure services, why Azure, cost considerations]

## Directory Structure
[Complete repository structure with explanations]

## ES6 Module System

### Module Architecture
[Dependency graph, loading phases]

### Module Types
[Handler modules, utility modules, components]

### Import/Export Patterns
[Established patterns with examples]

### Loading Orchestration
[main.js 8-phase loading system]

### Historic Context: Inline Code Elimination
[Condensed 40-line version of achievement - see REDUNDANCY_REMOVAL_PLAN.md Category 4.1]

**Key Statistics**:
- 7,413 lines inline code migrated to 105 ES6 modules
- Zero inline JavaScript in index.html
- 8-phase dependency chain

**Critical Success Factors**:
1. Dependency graph mapping before migration
2. Strict module boundaries
3. Centralized state management

**Lessons Learned**: [Brief 3-4 points]

See CHANGELOG.md for detailed migration history.

## Environment Detection System

### Frontend Environment Detection
[Code: frontend/src/utils/environment.js]
[How detection works, hostname-based]

### Backend Environment Detection
[Code: backend/src/utils/environment.ts]
[How detection works, NODE_ENV-based]

### Environment Mapping
[Production, staging, development mappings]

### Key Benefits
[Why this system is critical]

## System Integration Workflows

### User Registration Flow
[Complete end-to-end flow diagram]

### Payment Processing Flow
[Stripe integration end-to-end]

### Content Creation and Moderation
[Post creation → AI analysis → publication]

### Geographic Data Processing
[Location capture → H3 indexing → privacy displacement]

### Authentication & Session Management
[JWT flow, Google OAuth flow]

### Cross-System Data Synchronization
[How systems communicate, event patterns]

## Architectural Patterns

### API Design Pattern
[RESTful conventions, error handling, response format]

### Database Access Pattern
[Prisma singleton, connection pooling]

### Error Handling Pattern
[Try-catch conventions, logging, user messaging]

### Frontend Component Pattern
[Module structure, event handling, state management]

## Key Architectural Decisions

### Decision: Geography-Based Feed Algorithm
**Context**: [Why this is revolutionary]
**Decision**: [H3 geospatial indexing + probability cloud]
**Consequences**: [Trade-offs, benefits]
**Status**: Implemented
**See**: [FEATURE_DOCS/FEED_ALGORITHM.md]

### Decision: Vanilla JavaScript (No React/Vue/Angular)
**Context**: [Initial framework overhead concerns]
**Decision**: [ES6 modules with vanilla JS]
**Consequences**: [Pros/cons, when we might reconsider]
**Status**: Established pattern
**See**: [Lines 197-244 of current MASTER_DOCUMENTATION.md]

### Decision: Dual Database Architecture (Dev + Production)
**Context**: [Need for safe development environment]
**Decision**: [Separate Azure PostgreSQL instances]
**Consequences**: [Cost, safety benefits, migration complexity]
**Status**: Implemented
**See**: [OPERATIONS.md - Database Architecture]

[Additional ADRs for major architectural decisions]

## Integration Architecture

### External Services Integration
- Azure OpenAI: [How integrated, fallback strategies]
- Azure Blob Storage: [Media handling]
- Stripe: [Payment processing]
- Geocodio: [Address → coordinates]
- Qdrant: [Semantic search vector DB]

### WebSocket Architecture
[Real-time messaging system design]
See [FEATURE_DOCS/WEBSOCKET_MESSAGING.md] for details

### Caching Strategy
[What is cached, TTL policies, invalidation strategy]

## Scalability Considerations

### Current Capacity
[Azure Container Apps auto-scaling configuration]

### Database Scalability
[Connection pooling, indexing strategy, read replicas future consideration]

### Storage Scalability
[Azure Blob storage approach, CDN integration]

### Performance Baselines
[Current metrics, targets, monitoring]
See [PERFORMANCE.md] for detailed performance documentation

## Security Architecture

### Authentication Flow
[JWT + bcrypt, Google OAuth integration]

### Authorization Model
[Role-based access, admin vs user vs candidate]

### Data Privacy
[Geographic privacy system overview]
See [SECURITY.md] for comprehensive security documentation

## Future Architecture Considerations

### Microservices Migration Path
[When and how to split monolith if needed]

### Database Sharding Strategy
[Future consideration for massive scale]

### Multi-Region Deployment
[Geographic distribution for global audience]

---

**Cross-References**:
- [Operations Guide](OPERATIONS.md) - Deployment procedures
- [Security Documentation](SECURITY.md) - Security details
- [Performance Guide](PERFORMANCE.md) - Performance optimization
- [Feature Documentation](FEATURE_DOCS/) - Individual feature deep-dives
```

**Source Content from MASTER_DOCUMENTATION.md**:
- Lines 79-122: Executive Summary → Overview section
- Lines 178-303: System Architecture → Technology Stack section
- Lines 304-406: Environment Detection → Environment Detection System section
- Lines 409-530: ES6 Module System → ES6 Module System section (entire)
- Lines 531-839: System Integration Workflows → System Integration Workflows section
- Lines 5653-5830: Inline Code Elimination → Condensed to 40 lines in ES6 Module System section

**Additional Content**:
- Architectural Decision Records (ADRs) for major decisions
- Why technology choices were made (currently missing)
- Future architecture considerations

---

### docs/API_REFERENCE.md (NEW - Core API Documentation)

**Purpose**: Complete API endpoint reference for core functionality
**Size**: ~3,000 lines
**Priority**: Phase 2.1 (Week 1)

**Content Structure**:
```markdown
# API Reference - United We Rise

## Table of Contents
[Organized by functional area]

## Overview

### API Base URLs
- Production: https://api.unitedwerise.org
- Staging: https://dev-api.unitedwerise.org

### Authentication
All authenticated endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Response Format
[Standard response format explanation]

### Error Handling
[Standard error response format]

### Rate Limiting
[Rate limit policies]

## Authentication Endpoints

### POST /api/auth/register
**Description**: Register new user account

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "zipCode": "90210"
}
```

**Response**: [Success response, error responses]

**Security Notes**: [Password requirements, rate limiting]

**Related Endpoints**: [Links to login, verify-email, etc.]

[Continue for all authentication endpoints...]

## User Management Endpoints

### GET /api/users/profile/:userId
[Full documentation]

### PUT /api/users/profile
[Full documentation]

[Continue for all user endpoints...]

## Post Management Endpoints

### POST /api/posts/create
[Full documentation including photo upload multipart/form-data]

### GET /api/posts/:postId
[Full documentation]

### PUT /api/posts/:postId
[Full documentation]

### DELETE /api/posts/:postId
[Full documentation]

[Continue for all post endpoints...]

## Comment Endpoints
[All comment-related endpoints]

## Feed Endpoints

### GET /api/feed/my-feed
**Description**: Get personalized feed based on geography and follows

**Query Parameters**:
- `page` (optional): Page number (default: 0)
- `limit` (optional): Posts per page (default: 15)

**Response**: [Format with pagination info]

**Algorithm**: See [FEATURE_DOCS/FEED_ALGORITHM.md] for feed generation details

[Continue for all feed endpoints...]

## Relationship Endpoints (Friends/Followers)

### POST /api/relationships/send-friend-request
[Full documentation]

[Continue for all relationship endpoints...]

## Notification Endpoints
[All notification-related endpoints]

## Search Endpoints
[All search-related endpoints]

See [FEATURE_DOCS/SEARCH_SYSTEM.md] for search algorithm details

## Media Endpoints

### POST /api/media/upload
[Photo upload endpoint documentation]

See [FEATURE_DOCS/PHOTO_TAGGING.md] for photo system details

[Continue for all media endpoints...]

## Messaging Endpoints

### WebSocket Connection
[How to establish WebSocket connection]

See [FEATURE_DOCS/WEBSOCKET_MESSAGING.md] for messaging system details

[REST API endpoints for messaging...]

## Geographic/Location Endpoints
[Location-based endpoints]

See [FEATURE_DOCS/GEOGRAPHIC_PRIVACY.md] for privacy system details

## Admin Endpoints

**Note**: Admin endpoints require admin role authentication

### GET /api/admin/health
[Health check endpoint]

[Continue for admin endpoints...]

---

**Cross-References**:
- [Quest & Badge APIs](API_QUESTS_BADGES.md)
- [Saved Posts & Gallery APIs](API_SAVED_POSTS_GALLERY.md)
- [Civic Engagement APIs](CIVIC_ENGAGEMENT.md)
- [Development Guide](DEVELOPMENT_GUIDE.md) - How to add new endpoints
```

**Source Content from MASTER_DOCUMENTATION.md**:
- Lines 3090-4119: API Reference section (entire section, 1,029 lines)
- Remove duplicate API listings from system-specific sections (per REDUNDANCY_REMOVAL_PLAN Phase 2)

**Important Notes**:
- This consolidates ALL core API endpoints into single reference
- System-specific API docs (Quests, Saved Posts, Civic Engagement) remain in their specialized files
- Each system section in MASTER_DOCUMENTATION.md will cross-reference this file instead of duplicating endpoint docs

---

### docs/OPERATIONS.md (NEW - Deployment & Infrastructure)

**Purpose**: Operational procedures for deployment, monitoring, and maintenance
**Size**: ~2,500 lines
**Priority**: Phase 2.2 (Week 1-2)

**Content Structure**:
```markdown
# Operations Guide - United We Rise

## Table of Contents
[Detailed TOC]

## Overview

### Environments
- **Production**: www.unitedwerise.org + api.unitedwerise.org
- **Staging**: dev.unitedwerise.org + dev-api.unitedwerise.org
- **Local Development**: localhost

### Azure Infrastructure
- Resource Group: unitedwerise-rg
- Container Registry: uwracr2425
- Production Backend: unitedwerise-backend
- Staging Backend: unitedwerise-backend-staging
- Databases: unitedwerise-db (prod), unitedwerise-db-dev (staging/dev)

## Deployment Procedures

### Pre-Deployment Checklist
```bash
[Commands from CLAUDE.md lines 63-70]
```

### Deploying to Staging

#### Frontend Deployment (Automatic)
[GitHub Actions workflow, how it triggers, monitoring]

#### Backend Deployment (Manual)
```bash
[Complete bash script from CLAUDE.md lines 71-120]
```

**Monitoring deployment**:
[How to check ACR build status, container app status, health endpoint]

### Deploying to Production

**CRITICAL**: Only deploy to production with explicit approval

```bash
[Complete bash script from CLAUDE.md lines 122-175]
```

**Post-deployment verification**:
[Checklist of verification steps]

### Deployment Troubleshooting

#### Deployment Failure Diagnosis Workflow

**Step 1: Verify Local Changes Committed**
[Commands and expected output from CLAUDE.md lines 200-210]

**Step 2: Verify GitHub Actions Status**
[How to check workflow status]

**Step 3: Verify Frontend Deployment**
[Cache-busting, verification steps]

**Step 4: Verify Docker Build Status**
[ACR build monitoring]

**Step 5: Verify Container App Status**
[Traffic split checks, revision management]

**Step 6: Verify Container Image**
[Image digest verification]

**Step 7: Verify Deployed Code Matches Local**
[SHA comparison]

**Step 8: Verify Container Restart**
[Uptime checks]

**Nuclear Option: Complete Deployment Reset**
[Full redeployment procedure from CLAUDE.md lines 380-425]

#### Common Deployment Failure Patterns
[From CLAUDE.md lines 427-451]

## Database Operations

### Database Architecture

#### Production Database
```
Server: unitedwerise-db.postgres.database.azure.com
Database: postgres
Schema: public
Connection Limit: 10 (Prisma singleton)
```

#### Development Database
```
Server: unitedwerise-db-dev.postgres.database.azure.com
Database: postgres
Schema: public
```

**CRITICAL**: Always verify which database before migrations
```bash
echo $DATABASE_URL | grep -o '@[^.]*'
# Must show @unitedwerise-db-dev for safe development
```

### Database Migrations

**REQUIRED WORKFLOW** (Never use `prisma db push` for permanent changes!)

#### Development: Create Migration
```bash
[Complete migration creation workflow from CLAUDE.md]
```

#### Staging: Auto-Apply via Deployment
[How migrations auto-apply on staging deployment]

#### Production: Manual Migration Application
```bash
[Complete production migration workflow from CLAUDE.md]
```

### Database Migration Safety Checks
[Pre-migration checklist from CLAUDE.md]

### Database Migration Troubleshooting
[Common issues and solutions from CLAUDE.md lines 550-650]

### Database Backup & Restore

#### Creating Backup
```bash
[Azure backup commands]
```

#### Restoring from Backup
```bash
[Azure restore commands]
```

## Monitoring & Health Checks

### Health Check Endpoints

#### Backend Health
```bash
curl https://api.unitedwerise.org/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 12345,
  "releaseSha": "abc123",
  "database": "connected"
}
```

#### Frontend Health
[How to verify frontend is deployed and serving]

### Monitoring Tools

#### Azure Portal Monitoring
[What metrics to watch, how to access]

#### Application Insights
[Logging, error tracking, performance monitoring]

#### Database Monitoring
[Connection pool monitoring, query performance]

### Log Access

#### Container App Logs
```bash
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50
```

#### Application Logs
[How to access application-level logs]

## Configuration Management

### Environment Variables

#### Production Environment Variables
[List of all env vars with descriptions, no sensitive values]

#### Staging Environment Variables
[List of staging-specific variables]

### Secrets Management
[How secrets are stored in Azure, rotation procedures]

## CI/CD Pipeline

### GitHub Actions Workflows

#### Frontend Deployment Workflow
[Workflow file location, triggers, steps]

#### Backend Deployment Workflow
[Currently manual, future automation considerations]

### Deployment Notifications
[How to get notified of deployments]

## Emergency Procedures

### Emergency Backend Restart
```bash
[Force restart commands]
```

### Emergency Rollback
```bash
[Rollback procedures]
```

### Database Emergency Restore
[Emergency restoration steps]

### Incident Response
See [TROUBLESHOOTING.md] for diagnostic procedures

## Maintenance Tasks

### Regular Maintenance Schedule
- **Daily**: Monitor error rates, check health endpoints
- **Weekly**: Review logs, check disk usage, validate backups
- **Monthly**: Review and rotate secrets, update dependencies

### Dependency Updates
[How to update npm packages, testing procedures]

### Certificate Renewal
[SSL certificate management]

## Performance Optimization

### Scaling Configuration
[Azure Container Apps scaling rules]

### Database Performance
[Indexing strategy, connection pooling]

See [PERFORMANCE.md] for detailed performance documentation

## Cost Management

### Azure Cost Monitoring
[How to monitor costs, budget alerts]

### Cost Optimization Tips
[Ways to reduce infrastructure costs]

---

**Cross-References**:
- [Architecture Documentation](ARCHITECTURE.md) - Infrastructure architecture
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Error diagnostics
- [Database Schema](DATABASE_SCHEMA.md) - Schema documentation
- [Development Guide](DEVELOPMENT_GUIDE.md) - Development workflows
```

**Source Content**:
- **From CLAUDE.md** (lines 38-461): Complete deployment procedures (this is operational content, belongs here not in MASTER_DOCUMENTATION.md)
- **From CLAUDE.md** (lines 463-747): Complete database migration safety protocol
- **From MASTER_DOCUMENTATION.md** (lines 8639-8875): Deployment & Infrastructure section (consolidate with CLAUDE.md content, remove redundancy)
- **From MASTER_DOCUMENTATION.md** (lines 1303-1328): Database architecture section

**Consolidation Strategy**:
- CLAUDE.md has more detailed operational procedures → Use as primary source
- MASTER_DOCUMENTATION.md has architectural context → Merge into architecture section
- Create single authoritative operations document
- Update CLAUDE.md to reference this document for detailed procedures (keep quick-reference commands in CLAUDE.md)

---

### docs/DEVELOPMENT_GUIDE.md (NEW - Development Practices)

**Purpose**: Development patterns, best practices, and contribution guidelines
**Size**: ~1,500 lines
**Priority**: Phase 2.2 (Week 1-2)

**Content Structure**:
```markdown
# Development Guide - United We Rise

## Table of Contents
[Detailed TOC]

## Overview

This guide documents established patterns, best practices, and contribution guidelines for United We Rise development.

**See also**:
- [Architecture](ARCHITECTURE.md) - System design and technology decisions
- [Getting Started](GETTING_STARTED.md) - New developer onboarding
- [Operations](OPERATIONS.md) - Deployment and infrastructure
- Global development protocols in `~/.claude/CLAUDE.md` - Fundamental rules and decision framework

## Code Style & Standards

### TypeScript Backend Standards
[Established patterns, naming conventions]

### JavaScript Frontend Standards
[ES6 module conventions, naming, structure]

### CSS Standards
[CSS organization, naming conventions]

## API Development Patterns

### Adding New API Endpoint

**Step-by-step procedure**:
1. Define route in appropriate routes file
2. Implement controller logic
3. Add database access via Prisma
4. Add error handling
5. Add authentication/authorization middleware
6. Test endpoint
7. Document in API_REFERENCE.md

**Standard API pattern**:
```typescript
router.post('/endpoint', authenticateToken, async (req, res) => {
  try {
    const validated = validateInput(req.body);
    const result = await businessLogic(validated);
    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Endpoint failed:', error);
    return res.status(500).json({
      success: false,
      error: 'User-facing message'
    });
  }
});
```

### API Response Format Standards
[Established response format, error handling conventions]

### Authentication Middleware
[How to use authenticateToken, optionalAuth, adminAuth]

## Frontend Development Patterns

### Creating New Frontend Module

**ES6 module pattern**:
```javascript
// Import dependencies
import { apiCall } from '../config/api.js';
import { getCurrentEnvironment } from '../utils/environment.js';

// Module state (if needed)
let moduleState = {};

// Initialize function
export function initModuleName() {
  // Setup code
}

// Public functions
export function publicFunction() {
  // Implementation
}

// Private functions (not exported)
function privateHelper() {
  // Implementation
}
```

### Event Handling Pattern
[addEventListener conventions, event delegation]

### State Management
[How to manage state in vanilla JS, global state access]

### Component Creation Pattern
[Established pattern for creating reusable components]

## Database Development Patterns

### Adding New Database Model

**Procedure**:
1. Edit backend/prisma/schema.prisma
2. Create migration: `npx prisma migrate dev --name "description"`
3. Review generated SQL
4. Test on development database
5. Generate Prisma client: `npx prisma generate`
6. Verify TypeScript compilation
7. Document in DATABASE_SCHEMA.md
8. Commit migration files

**Naming conventions**:
- Table names: PascalCase singular (User, Post, Comment)
- Fields: camelCase
- Relations: descriptive names

### Database Query Patterns

**Standard query pattern with error handling**:
```typescript
try {
  const result = await prisma.model.findUnique({
    where: { id: id },
    include: { relatedModel: true }
  });

  if (!result) {
    throw new Error('Not found');
  }

  return result;
} catch (error) {
  logger.error('Query failed:', error);
  throw error;
}
```

### Transaction Pattern
[When to use transactions, how to implement]

## Error Handling

### Backend Error Handling
[Standard error handling pattern, logging conventions]

### Frontend Error Handling
[How to handle API errors, user messaging]

### Error Logging
[What to log, log levels, sensitive data handling]

## Testing Strategy

### Backend Testing

**Unit tests**: Test business logic in isolation
**Integration tests**: Test API endpoints end-to-end
**Database tests**: Test Prisma queries

[Testing framework, how to run tests, writing test cases]

### Frontend Testing
[Testing approach for vanilla JS, manual testing procedures]

### Testing Checklist
[What to test before submitting PR]

## Git Workflow

### Branch Naming
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Hotfixes: `hotfix/description`

### Commit Message Format
[Established commit message conventions]

**Examples**:
- `feat: Add quest completion tracking`
- `fix: Resolve authentication race condition`
- `refactor: Extract feed algorithm to separate module`
- `docs: Update API reference with new endpoints`

### Pull Request Process
1. Create feature branch from development
2. Make changes
3. Test locally
4. Push to origin
5. Create PR to development branch
6. Address review feedback
7. Merge after approval

### Code Review Guidelines
[What reviewers look for, how to conduct reviews]

## Security Best Practices

### Input Validation
[How to validate user input, established patterns]

### Authentication
[How to use authentication middleware, JWT handling]

### Authorization
[How to check permissions, role-based access]

### Sensitive Data Handling
[Logging sensitive data, PII protection]

See [SECURITY.md] for comprehensive security documentation

## Performance Best Practices

### Backend Performance
- Use database indexes appropriately
- Implement pagination for large result sets
- Use async/await properly
- Avoid N+1 queries

### Frontend Performance
- Lazy load modules when possible
- Minimize DOM manipulations
- Use event delegation
- Optimize images before upload

See [PERFORMANCE.md] for detailed performance optimization

## Documentation Standards

### Code Documentation
[When to add comments, JSDoc conventions]

### API Documentation
[How to document new endpoints in API_REFERENCE.md]

### Updating Documentation
[When to update docs, what to document]

**Documentation files**:
- API changes → Update API_REFERENCE.md
- Database changes → Update DATABASE_SCHEMA.md
- Deployment changes → Update OPERATIONS.md
- Architectural changes → Update ARCHITECTURE.md
- Feature details → Update or create FEATURE_DOCS/ document
- Historical changes → Update CHANGELOG.md

### Documentation Style Guide
- Use clear, concise language
- Include code examples for complex concepts
- Add cross-references to related documentation
- Keep examples up-to-date with codebase
- Use proper markdown formatting

## Contributing Guidelines

### Before Starting Work
1. Check existing issues and PRs
2. Discuss major changes with team
3. Ensure you understand architecture
4. Review relevant documentation

### During Development
1. Follow established patterns
2. Write tests for new functionality
3. Update documentation
4. Test thoroughly locally

### Submitting Changes
1. Ensure code compiles without errors
2. Verify tests pass
3. Update documentation
4. Create clear PR description
5. Request review

### After Merge
1. Monitor deployment to staging
2. Verify changes work in staging
3. Report any issues immediately

## Common Development Tasks

### Adding New Feature
[Step-by-step process for feature development]

### Fixing Bug
[Bug fix workflow, testing, verification]

### Refactoring Code
[When to refactor, how to do it safely]

### Updating Dependencies
[How to update npm packages, testing]

## Troubleshooting Development Issues

### TypeScript Compilation Errors
[Common issues and solutions]

### Module Import Errors
[Fixing import/export issues]

### Database Connection Issues
[Local development database troubleshooting]

See [TROUBLESHOOTING.md] for comprehensive diagnostic guides

## Tools & Resources

### Development Tools
- VSCode: Recommended editor
- Azure CLI: Required for deployments
- Postman: API testing
- DBeaver: Database management

### Useful Commands
```bash
# Backend
cd backend
npm run build          # Compile TypeScript
npm run dev           # Run development server
npx prisma studio     # Open database GUI

# Git
git status            # Check status
git log --oneline     # View commits
git diff             # View changes
```

---

**Cross-References**:
- [Architecture](ARCHITECTURE.md) - System design
- [API Reference](API_REFERENCE.md) - API documentation
- [Operations](OPERATIONS.md) - Deployment procedures
- [Security](SECURITY.md) - Security practices
- [Troubleshooting](TROUBLESHOOTING.md) - Debugging guides
```

**Source Content from MASTER_DOCUMENTATION.md**:
- Lines 15632-16357: Development Practices section (726 lines, condense per REDUNDANCY_REMOVAL_PLAN Phase 4.3)
- Lines 409-530: ES6 module patterns
- Lines 3090-4119: API response format standards
- New content: Testing strategy, contribution guidelines

**Source Content from ~/.claude/CLAUDE.md**:
- Reference global development protocols (don't duplicate, just reference)

---

### docs/SECURITY.md (NEW - Security Architecture)

**Purpose**: Comprehensive security documentation
**Size**: ~1,500 lines
**Priority**: Phase 2.2 (Week 2)

**Content Structure**:
```markdown
# Security Documentation - United We Rise

## Table of Contents
[Detailed TOC]

## Overview

### Security Principles
- Defense in depth
- Principle of least privilege
- Secure by default
- Privacy by design

### Threat Model
[Key threats we protect against]

## Authentication Architecture

### JWT Authentication

**Token generation**:
[How tokens are created, expiration, refresh]

**Token validation**:
[Middleware implementation, how tokens are validated]

### Google OAuth Integration

**OAuth flow**:
[Complete OAuth flow diagram and implementation]

**Security considerations**:
[CSRF protection, state validation]

### Password Security

**Hashing**: bcrypt with salt rounds
**Password requirements**: [Minimum requirements]
**Password reset flow**: [Secure reset implementation]

## Authorization Model

### Role-Based Access Control (RBAC)

**Roles**:
- User: Standard user permissions
- Candidate: Candidate-specific permissions
- Admin: Full system access

**Permission checking**:
[How permissions are checked, middleware]

### Resource-Level Authorization
[How ownership is verified, privacy controls]

## Data Privacy Protection

### Geographic Privacy System

**Privacy displacement algorithm**:
[H3 geospatial indexing, privacy radius, displacement]

See [FEATURE_DOCS/GEOGRAPHIC_PRIVACY.md] for complete technical details

### Personal Information Protection

**PII handling**:
- Email addresses: Stored encrypted
- Passwords: bcrypt hashed, never logged
- Location data: Privacy-displaced before storage
- Payment information: Tokenized via Stripe, never stored directly

### EXIF Stripping

**Photo privacy**:
[How EXIF data is stripped from uploaded photos]

## Content Moderation & Safety

### Automated Content Moderation

**AI moderation**:
[Azure OpenAI content filtering]

**Reputation system**:
[How reputation affects visibility]

### Reporting System
[How users can report content, review process]

### User Warnings & Suspensions
[Moderation actions, appeal process]

## API Security

### Rate Limiting

**Rate limits**:
- Authentication endpoints: [Limits]
- API endpoints: [Limits]
- Upload endpoints: [Limits]

**Implementation**: [How rate limiting is enforced]

### Input Validation

**Validation approach**:
[Centralized validation, sanitization]

**SQL Injection prevention**: Prisma ORM parameterized queries
**XSS prevention**: Output encoding, CSP headers
**CSRF prevention**: [CSRF tokens, SameSite cookies]

### API Authentication
[Bearer token requirements, token validation]

## Infrastructure Security

### Network Security

**HTTPS enforcement**: All traffic over TLS
**Certificate management**: [Azure-managed certificates]
**Firewall rules**: [Azure NSG configuration]

### Database Security

**Connection security**: TLS-encrypted connections
**Access control**: Limited to backend services
**Backup encryption**: [Azure backup encryption]

### Secrets Management

**Azure Key Vault**: [How secrets are stored]
**Environment variables**: [Secure env var management]
**Rotation policy**: [Secret rotation procedures]

## Payment Security

### Stripe Integration Security

**PCI DSS compliance**: Stripe handles card data
**Webhook validation**: [Signature verification]
**Idempotency**: [Duplicate payment prevention]

See [FEATURE_DOCS/PAYMENT_SYSTEM.md] for payment flow details

## Security Best Practices

### For Backend Developers

**Always**:
- Validate all inputs
- Use parameterized queries
- Log security events
- Encrypt sensitive data
- Use authentication middleware

**Never**:
- Log passwords or tokens
- Trust user input
- Bypass authentication
- Store secrets in code
- Expose sensitive data in errors

### For Frontend Developers

**Always**:
- Validate inputs client-side (UX)
- Use HTTPS for API calls
- Handle auth tokens securely
- Sanitize displayed content

**Never**:
- Store sensitive data in localStorage
- Trust data without validation
- Bypass API authentication
- Log sensitive information

## Vulnerability Response

### Reporting Security Issues
[How to report vulnerabilities, contact information]

### Security Incident Response

**Incident response plan**:
1. Assess impact
2. Contain threat
3. Notify affected users if required
4. Implement fix
5. Post-incident review

### Patch Management
[How security patches are prioritized and deployed]

## Compliance Considerations

### Data Protection
[GDPR considerations, user data rights]

### Nonprofit Regulations
[501(c)(3) compliance for donation processing]

## Security Monitoring

### Logging Security Events

**Events logged**:
- Failed authentication attempts
- Authorization failures
- Unusual API access patterns
- Admin actions

**Log retention**: [Retention policy]

### Intrusion Detection
[Monitoring for suspicious activity]

### Security Auditing
[Regular security review procedures]

## Security Testing

### Security Test Procedures

**Regular testing**:
- Dependency vulnerability scanning
- Authentication testing
- Authorization testing
- Input validation testing

**Tools**: [Security testing tools used]

## Security Checklist for New Features

Before deploying new feature:

- [ ] Input validation implemented
- [ ] Authentication required where appropriate
- [ ] Authorization checks in place
- [ ] Sensitive data encrypted
- [ ] Security events logged
- [ ] Rate limiting considered
- [ ] No secrets in code
- [ ] Error messages don't leak sensitive info
- [ ] Tested for common vulnerabilities

---

**Cross-References**:
- [API Reference](API_REFERENCE.md) - API authentication details
- [Architecture](ARCHITECTURE.md) - Security architecture
- [Development Guide](DEVELOPMENT_GUIDE.md) - Security best practices
- [Feature: Geographic Privacy](FEATURE_DOCS/GEOGRAPHIC_PRIVACY.md)
```

**Source Content from MASTER_DOCUMENTATION.md**:
- Lines 7976-8086: Security & Authentication section
- Lines 10368-10593: Geographic Privacy Protection section (overview, details in feature doc)
- Database encryption and security sections
- New content: Vulnerability response, compliance, monitoring

---

### docs/PERFORMANCE.md (NEW - Performance Optimization)

**Purpose**: Performance baselines, optimization strategies, and monitoring
**Size**: ~1,000 lines
**Priority**: Phase 2.3 (Week 2)

**Content Structure**:
```markdown
# Performance Guide - United We Rise

## Table of Contents
[Detailed TOC]

## Overview

### Performance Goals
- API response time: < 200ms average
- Page load time: < 3 seconds
- Database queries: < 100ms
- Feed generation: < 500ms

### Current Baseline
[Current performance metrics from PERFORMANCE_BASELINE.md]

## Backend Performance

### API Performance Optimization

**Database connection pooling**:
[Prisma singleton pattern, connection limits]

**Query optimization**:
[Indexing strategy, N+1 query prevention]

**Async operations**:
[Post creation async AI analysis, background jobs]

### Database Performance

**Indexing strategy**:
[Which fields are indexed, why]

See [DATABASE_SCHEMA.md] for complete index documentation

**Query patterns**:
[Efficient query patterns, what to avoid]

**Connection management**:
[Singleton Prisma client, connection pooling configuration]

### Caching Strategy

**Response caching**:
[What is cached, TTL policies]

**CDN caching**:
[Static asset caching, cache invalidation]

**Database query caching**:
[Prisma caching, custom caching]

### Background Job Processing

**Async AI analysis**:
[How post AI analysis runs asynchronously, impact on performance]

**Job queue**: [Future consideration for heavy background tasks]

## Frontend Performance

### Initial Load Optimization

**Module loading**:
[ES6 module loading strategy, lazy loading]

**Asset optimization**:
- Images: [Optimization strategy]
- CSS: [Minification, critical CSS]
- JavaScript: [Minification, code splitting opportunities]

### Runtime Performance

**DOM manipulation optimization**:
[Efficient DOM updates, virtual scrolling for long lists]

**Event handling**:
[Event delegation to reduce listeners]

**Infinite scroll**:
[Efficient post loading, pagination strategy]

### Image Performance

**Upload optimization**:
[Client-side resize before upload, format conversion]

**Display optimization**:
[Lazy loading, responsive images, thumbnail generation]

**EXIF stripping**:
[Performance impact of EXIF removal]

## Network Performance

### API Call Optimization

**Request batching**: [Where applicable]
**Pagination**: [Standard pagination strategy]
**Compression**: [Gzip/Brotli compression]

### WebSocket Performance

**Connection management**:
[Connection pooling, reconnection strategy]

**Message optimization**:
[Efficient message format]

See [FEATURE_DOCS/WEBSOCKET_MESSAGING.md] for details

## Monitoring & Profiling

### Performance Monitoring

**Application Insights**:
[Metrics tracked, how to access]

**Custom metrics**:
- API response times
- Database query times
- Feed generation times
- Error rates

### Profiling Tools

**Backend profiling**:
[Node.js profiling tools, how to use]

**Frontend profiling**:
[Browser DevTools, performance timeline]

**Database profiling**:
[PostgreSQL query analysis]

## Performance Testing

### Load Testing

**Tools**: [Load testing tools used]

**Test scenarios**:
- Concurrent users
- Feed generation under load
- Database load
- WebSocket connections

**Baseline results**: [Current load test results]

### Performance Benchmarks

**API endpoint benchmarks**:
[Response time benchmarks for key endpoints]

**Database query benchmarks**:
[Query time benchmarks]

## Scalability Considerations

### Current Capacity

**Azure Container Apps**:
[Auto-scaling configuration, current limits]

**Database capacity**:
[Connection limits, storage capacity]

**Storage capacity**:
[Azure Blob storage, projected growth]

### Scaling Strategies

**Horizontal scaling**:
[Container app scaling, load balancing]

**Database scaling**:
[Vertical scaling options, read replicas consideration]

**CDN scaling**:
[Global CDN distribution]

## Performance Optimization History

### Recent Optimizations

**August 2024: Database Connection Pool Fix**:
- Problem: Connection exhaustion after 47+ hours
- Solution: Singleton Prisma client pattern
- Impact: Reduced connections from 600+ to max 10
- Result: Zero connection exhaustion errors

**August 2024: Async AI Analysis**:
- Problem: Post creation taking 2-3 seconds
- Solution: Move AI analysis to background
- Impact: 10x faster post creation
- Result: <100ms post creation response

[Continue with other major optimizations...]

## Performance Best Practices

### For Backend Developers
- Use database indexes appropriately
- Implement pagination for large result sets
- Profile queries before optimizing
- Use async/await properly
- Avoid synchronous file operations
- Cache expensive computations

### For Frontend Developers
- Lazy load modules when possible
- Minimize DOM manipulations
- Use event delegation
- Optimize images before upload
- Implement virtual scrolling for long lists
- Debounce expensive operations

## Performance Troubleshooting

### Slow API Responses
[Diagnostic steps, common causes]

### Slow Database Queries
[How to identify slow queries, optimization strategies]

### Slow Page Load
[Diagnostic steps, optimization strategies]

See [TROUBLESHOOTING.md] for detailed troubleshooting guides

---

**Cross-References**:
- [Architecture](ARCHITECTURE.md) - System architecture
- [Database Schema](DATABASE_SCHEMA.md) - Indexing strategy
- [Operations](OPERATIONS.md) - Monitoring and scaling
- [Troubleshooting](TROUBLESHOOTING.md) - Performance issues
```

**Source Content from MASTER_DOCUMENTATION.md**:
- Lines 15058-15283: Performance Optimization System section
- Database connection pool fix from recent deployments
- Async AI analysis optimization

**Source Content from PERFORMANCE_BASELINE.md**:
- Current performance metrics (if file exists)

---

### docs/TROUBLESHOOTING.md (NEW - Diagnostic Guide)

**Purpose**: Symptom-based troubleshooting guide for common issues
**Size**: ~2,000 lines
**Priority**: Phase 2.3 (Week 2)

**Content Structure**:
```markdown
# Troubleshooting Guide - United We Rise

## Table of Contents
[Organized by symptom/error category]

## Overview

This guide helps diagnose and resolve common issues. Organization is by **symptom** (what you observe) rather than by system component.

**Quick Diagnostic Flowchart**:
[Visual flowchart: Error type → Diagnostic section]

## Authentication Errors

### Symptom: "Invalid credentials" on login

**Diagnostic steps**:
1. Verify email is correct
2. Check password is correct
3. Verify user account exists in database
4. Check if account is suspended

**Common causes**:
- User typo
- Account not yet created
- Account suspended

**Resolution**: [Step-by-step fix]

### Symptom: "Token expired" errors

**Diagnostic steps**:
[Token validation checks, token expiration verification]

**Common causes**:
- JWT token expired (24-hour TTL)
- System clock skew
- Token invalidated on logout

**Resolution**: [How to refresh token, when to re-authenticate]

### Symptom: Google OAuth fails

**Diagnostic steps**:
[OAuth flow verification, error log analysis]

**Common causes**:
- GOOGLE_CLIENT_ID misconfigured
- Redirect URI mismatch
- User cancelled OAuth flow

**Resolution**: [Environment variable check, Google Console configuration]

[Continue with all authentication error patterns from MASTER_DOCUMENTATION.md lines 17749-17932]

## Environment Detection Issues

### Symptom: API calls going to wrong environment

**Diagnostic steps**:
```javascript
// Check detected environment
console.log('Current environment:', getCurrentEnvironment());
console.log('API base URL:', API_CONFIG.BASE_URL);
```

**Common causes**:
- Hostname not matching expected pattern
- Environment detection misconfigured
- Browser cache serving old environment.js

**Resolution**: [How to fix environment detection]

[Continue with environment issues from MASTER_DOCUMENTATION.md lines 17933-18096]

## API & Network Errors

### Symptom: API calls return 500 errors

**Diagnostic steps**:
1. Check backend health endpoint
2. Review backend logs
3. Verify database connection
4. Check specific endpoint logs

**Common causes**:
- Backend service down
- Database connection exhausted
- Uncaught exception in endpoint
- Database query failure

**Resolution**: [Step-by-step diagnostic and fix]

### Symptom: API calls return 404 errors

**Diagnostic steps**:
[Endpoint verification, routing check]

**Common causes**:
- Endpoint path incorrect
- Backend not deployed with new endpoint
- Routing configuration issue

**Resolution**: [Verification steps]

### Symptom: Rate limiting (429 errors)

**Diagnostic steps**:
[Rate limit verification, request frequency analysis]

**Common causes**:
- Too many requests in short time
- Polling too frequently
- Missing request debouncing

**Resolution**: [How to implement debouncing, rate limit reset time]

[Continue with API errors from MASTER_DOCUMENTATION.md lines 18097-18299]

## Database Errors

### Symptom: "Database connection failed"

**Diagnostic steps**:
```bash
# Check database connectivity
psql "postgresql://user:pass@host:5432/db"

# Check connection pool
# [Commands to check Prisma connection pool]
```

**Common causes**:
- Database server down
- Connection string misconfigured
- Firewall blocking connection
- Connection pool exhausted

**Resolution**: [Step-by-step fix including connection pool restart]

### Symptom: Migration fails with "already exists"

**Diagnostic steps**:
[Migration status check, schema comparison]

**Common causes**:
- Table created outside migration system (db push)
- Migration tracking out of sync
- Previous migration partially applied

**Resolution**:
[Use `prisma migrate resolve --applied` if table exists, full procedure from CLAUDE.md]

[Continue with database errors from MASTER_DOCUMENTATION.md lines 18300-18540]

## Deployment Errors

### Symptom: Deployment appears stuck

**Use the comprehensive 8-step diagnosis workflow**:

#### Step 1: Verify Local Changes Committed and Pushed
[Commands from OPERATIONS.md deployment troubleshooting section]

#### Step 2: Verify GitHub Actions Status
[How to check workflow status, interpret results]

#### Step 3: Verify Frontend Deployment
[Cache-busting, verification steps]

#### Step 4: Verify Docker Build Status
[ACR build monitoring, how to interpret status]

#### Step 5: Verify Container App Deployment Status
[Traffic split checks, revision management]

#### Step 6: Verify Container is Running New Image
[Image digest verification, log checking]

#### Step 7: Verify Deployed Code Matches Local Code
[SHA comparison procedure]

#### Step 8: Verify Container Has Restarted Recently
[Uptime verification]

**Nuclear Option**: [Complete deployment reset procedure]

### Symptom: Deployment succeeded but old code still running

**Most common cause**: Traffic split between old and new revisions

**Resolution**:
```bash
# Force single revision mode
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-mode Single
```

[Continue with deployment errors from MASTER_DOCUMENTATION.md lines 18541-18872 and OPERATIONS.md deployment troubleshooting]

## Frontend & Display Issues

### Symptom: JavaScript errors in console

**Diagnostic steps**:
1. Read error message completely
2. Check browser console for stack trace
3. Verify modules loaded correctly
4. Check for network errors

**Common causes**:
- Module import path incorrect
- Function called before module initialized
- API call failed
- Browser cache serving old code

**Resolution**: [Step-by-step debugging procedure]

### Symptom: Feed not loading / infinite scroll broken

**Diagnostic steps**:
[Check API endpoint, verify response format, check scroll event listener]

**Common causes**:
- API endpoint returning error
- Pagination offset incorrect
- Scroll event handler not attached
- Race condition in post loading

**Resolution**: [How to fix infinite scroll]

### Symptom: Images not displaying

**Diagnostic steps**:
[Check image URL, verify blob storage, check CORS]

**Common causes**:
- Image upload failed
- Blob storage URL incorrect
- CORS policy blocking load
- Image deleted

**Resolution**: [Step-by-step fix]

[Continue with frontend issues from MASTER_DOCUMENTATION.md lines 18873-19308]

## WebSocket Issues

### Symptom: Real-time messages not working

**Diagnostic steps**:
[WebSocket connection check, message delivery verification]

**Common causes**:
- WebSocket connection not established
- Backend WebSocket service down
- Network blocking WebSocket
- Token authentication failed

**Resolution**: [WebSocket reconnection, authentication verification]

See [FEATURE_DOCS/WEBSOCKET_MESSAGING.md] for WebSocket architecture details

## Performance Issues

### Symptom: Slow API responses

**Diagnostic steps**:
1. Check API response time in network tab
2. Check backend logs for slow queries
3. Verify database performance
4. Check if specific endpoint or all endpoints

**Common causes**:
- Database query not indexed
- N+1 query problem
- Large result set without pagination
- Backend under heavy load

**Resolution**: [Performance profiling, query optimization]

See [PERFORMANCE.md] for detailed performance optimization

### Symptom: Slow page load

**Diagnostic steps**:
[Browser performance profiling, network waterfall analysis]

**Common causes**:
- Large JavaScript bundle
- Unoptimized images
- Many API calls on load
- Slow API responses

**Resolution**: [Frontend optimization steps]

## Payment Issues

### Symptom: Payment fails

**Diagnostic steps**:
[Stripe dashboard check, webhook log verification]

**Common causes**:
- Card declined
- Stripe webhook not received
- Payment intent creation failed
- Network timeout

**Resolution**: [Step-by-step payment troubleshooting]

See [FEATURE_DOCS/PAYMENT_SYSTEM.md] for payment system details

## Known Issues & Workarounds

### Issue: Browser cache causes stale code after deployment

**Workaround**: Hard refresh (Ctrl+Shift+R)

**Permanent fix**: [Implement cache-busting strategies]

### Issue: [Other known issues from MASTER_DOCUMENTATION.md lines 15285-15631]

[List actively open issues with workarounds]

## Getting Additional Help

If this guide doesn't resolve your issue:

1. Check [CHANGELOG.md](../CHANGELOG.md) for recent changes that may have introduced issue
2. Review [Architecture documentation](ARCHITECTURE.md) to understand system design
3. Check [Operations guide](OPERATIONS.md) for infrastructure issues
4. Search GitHub issues for similar problems
5. Contact development team with:
   - Symptom description
   - Steps to reproduce
   - Error messages/logs
   - Environment (production/staging/local)
   - Screenshots if applicable

---

**Cross-References**:
- [Operations](OPERATIONS.md) - Deployment troubleshooting
- [Architecture](ARCHITECTURE.md) - System design
- [Development Guide](DEVELOPMENT_GUIDE.md) - Development patterns
- [Performance](PERFORMANCE.md) - Performance issues
```

**Source Content from MASTER_DOCUMENTATION.md**:
- Lines 17724-19308: Complete troubleshooting section (1,585 lines)
  - Lines 17749-17932: Authentication errors
  - Lines 17933-18096: Environment detection issues
  - Lines 18097-18299: API & network errors
  - Lines 18300-18540: Database errors
  - Lines 18541-18872: Deployment errors
  - Lines 18873-19308: Frontend & display issues
- Lines 15285-15631: Known issues & bugs

**Reorganization Strategy**:
- Organize by **symptom** (what user observes) rather than system component
- Add diagnostic flowchart at beginning
- Cross-reference to detailed architecture/operations docs
- Keep solutions concise, link to comprehensive guides

---

### docs/FEATURE_DOCS/ (NEW DIRECTORY)

**Purpose**: Deep-dive documentation for complex features
**Priority**: Phase 2.4 (Week 3)

#### docs/FEATURE_DOCS/FEED_ALGORITHM.md

**Size**: ~800 lines

**Content**:
- Feed generation algorithm
- Probability cloud system
- H3 geospatial scoring
- Geographic radius calculations
- Engagement scoring
- Content mixing strategy
- A/B testing considerations
- Performance optimization

**Source**: Lines 5030-5652 from MASTER_DOCUMENTATION.md (Proposed Feed Algorithm Redesign section)

---

#### docs/FEATURE_DOCS/GEOGRAPHIC_PRIVACY.md

**Size**: ~1,000 lines

**Content**:
- H3 geospatial indexing system
- Privacy displacement algorithm
- Resolution levels and radii
- Geocodio integration
- Address → coordinates conversion
- Map rendering with displaced locations
- Privacy considerations
- Performance implications

**Source**: Lines 10368-10593 from MASTER_DOCUMENTATION.md (Geographic Privacy Protection section)

---

#### docs/FEATURE_DOCS/WEBSOCKET_MESSAGING.md

**Size**: ~700 lines

**Content**:
- WebSocket architecture
- Connection management
- Room-based messaging
- Message types and formats
- Authentication flow
- Reconnection strategy
- Scalability considerations
- Error handling

**Source**: Lines 12100-12299 from MASTER_DOCUMENTATION.md (Unified WebSocket Messaging System section)

---

#### docs/FEATURE_DOCS/PAYMENT_SYSTEM.md

**Size**: ~600 lines

**Content**:
- Stripe nonprofit integration
- Payment flow (donation intent → processing → confirmation)
- Webhook handling
- Idempotency
- Refund processing
- Tax receipt generation
- Security considerations
- Testing procedures

**Source**: Lines 12300-12800 from MASTER_DOCUMENTATION.md (Stripe Nonprofit Payment System section, condensed per REDUNDANCY_REMOVAL_PLAN Phase 5.2)

---

#### docs/FEATURE_DOCS/MOBILE_UI.md

**Size**: ~500 lines

**Content**:
- Mobile-responsive UI system
- Breakpoint strategy
- Touch-optimized interactions
- Mobile navigation
- Performance on mobile devices
- Progressive Web App considerations

**Source**: Lines 5831-6241 from MASTER_DOCUMENTATION.md (Mobile UI System section)

---

#### docs/FEATURE_DOCS/PHOTO_TAGGING.md

**Size**: ~500 lines

**Content**:
- Photo upload system
- EXIF stripping for privacy
- Tagging system
- Tag privacy controls
- Image storage (Azure Blob)
- Thumbnail generation
- Performance optimization

**Source**: Lines 10065-10367 from MASTER_DOCUMENTATION.md (Media & Photos section)

---

#### docs/FEATURE_DOCS/RELATIONSHIP_SYSTEM.md

**Size**: ~400 lines

**Content**:
- Friend vs follower model
- Relationship lifecycle
- Notification system
- Privacy implications
- Database schema
- Performance considerations

**Source**: Lines 10594-10897 from MASTER_DOCUMENTATION.md (Relationship System section, condensed per REDUNDANCY_REMOVAL_PLAN Phase 5.4)

---

#### docs/FEATURE_DOCS/AI_TRENDING_TOPICS.md

**Size**: ~500 lines

**Content**:
- Azure OpenAI integration
- Semantic topic clustering
- Trend detection algorithm
- Topic lifecycle
- Vector database (Qdrant)
- Performance optimization
- Cost management

**Source**: Lines 11929-12099 from MASTER_DOCUMENTATION.md (AI Trending Topics System section, condensed per REDUNDANCY_REMOVAL_PLAN Phase 5.4)

---

#### docs/FEATURE_DOCS/ELECTION_TRACKING.md

**Size**: ~800 lines

**Content**:
- Election data structures
- Candidate registration
- Ballot measure tracking
- Legislative bill tracking
- External data integration
- Verification system
- Reporting system

**Source**: Lines 11300-11928 from MASTER_DOCUMENTATION.md (Election Tracking System + Candidate Registration sections, condensed per REDUNDANCY_REMOVAL_PLAN Phase 5.4)

---

#### docs/FEATURE_DOCS/REPUTATION_SYSTEM.md

**Size**: ~400 lines

**Content**:
- Reputation scoring algorithm
- Behavior-based adjustments
- Reputation impacts (content visibility)
- AI-powered reputation analysis
- Appeals system
- Administrative controls

**Source**: Lines 10898-11147 from MASTER_DOCUMENTATION.md (Reputation System section)

---

#### docs/FEATURE_DOCS/SEARCH_SYSTEM.md

**Size**: ~400 lines

**Content**:
- Enhanced search architecture
- PostgreSQL full-text search
- Semantic search (Qdrant vector DB)
- Search result ranking
- Filter implementation
- Performance optimization

**Source**: Lines 11148-11299 from MASTER_DOCUMENTATION.md (Enhanced Search System section)

---

## Content Mapping Table

| Current MASTER_DOCUMENTATION.md Location | New Location | Lines | Action |
|------------------------------------------|--------------|-------|--------|
| Lines 1-12 (Header, warnings) | README.md + archive note in MASTER_DOC | 12 | Move header to README, add archive notice |
| Lines 13-28 (Critical notice) | MASTER_DOCUMENTATION.md (if kept) or remove | 16 | Keep if MASTER_DOC archived as reference |
| Lines 29-78 (Table of Contents) | README.md | 50 | Transform into navigation structure |
| Lines 79-122 (Executive Summary) | README.md + ARCHITECTURE.md | 44 | Condense to 3-4 paragraphs in README, expand in ARCHITECTURE |
| Lines 125-177 (Production Status) | README.md + OPERATIONS.md | 53 | Current status in README, deployment history in OPERATIONS |
| Lines 178-303 (System Architecture) | ARCHITECTURE.md | 126 | Move entire section |
| Lines 304-406 (Environment Detection) | ARCHITECTURE.md | 103 | Move to Environment Detection section |
| Lines 409-530 (ES6 Module System) | ARCHITECTURE.md | 122 | Move entire section |
| Lines 531-839 (System Integration Workflows) | ARCHITECTURE.md | 309 | Move to Integration Architecture section |
| Lines 840-1287 (Database Schema - Core) | DATABASE_SCHEMA.md | 448 | Already extracted (Phase 1) |
| Lines 1288-2172 (Database Schema - Extended) | DATABASE_SCHEMA.md | 885 | Already extracted (Phase 1) |
| Lines 2173-3089 (Critical Database Models) | DATABASE_SCHEMA.md | 917 | Already extracted (Phase 1) |
| Lines 3090-4119 (API Reference) | API_REFERENCE.md | 1030 | Move entire section, consolidate duplicates |
| Lines 4120-5029 (Various APIs scattered) | API_REFERENCE.md | 910 | Consolidate into API_REFERENCE.md |
| Lines 5030-5652 (Feed Algorithm Redesign) | FEATURE_DOCS/FEED_ALGORITHM.md | 623 | Move to feature doc |
| Lines 5653-5830 (Inline Code Elimination) | ARCHITECTURE.md (condensed to ~40 lines) | 177 → 40 | Condense per REDUNDANCY_REMOVAL_PLAN Phase 5.1 |
| Lines 5831-6241 (Mobile UI System) | FEATURE_DOCS/MOBILE_UI.md | 411 | Move to feature doc |
| Lines 6242-7975 (UI/UX Components) | ARCHITECTURE.md or new UI_COMPONENTS.md | 1734 | Consider separate UI doc if too large |
| Lines 7976-8086 (Security & Auth) | SECURITY.md | 111 | Move to security doc |
| Lines 8087-8638 (Various system features) | Respective FEATURE_DOCS/ | 552 | Split into feature docs |
| Lines 8639-8875 (Deployment & Infrastructure) | OPERATIONS.md | 237 | Move, consolidate with CLAUDE.md procedures (remove redundancy ~170 lines) |
| Lines 8876-10064 (Admin & Monitoring) | OPERATIONS.md | 1189 | Move monitoring sections to OPERATIONS |
| Lines 10065-10367 (Media & Photos) | FEATURE_DOCS/PHOTO_TAGGING.md | 303 | Move to feature doc |
| Lines 10368-10593 (Geographic Privacy) | FEATURE_DOCS/GEOGRAPHIC_PRIVACY.md | 226 | Move to feature doc |
| Lines 10594-10897 (Relationship System) | FEATURE_DOCS/RELATIONSHIP_SYSTEM.md | 304 | Move to feature doc, condense ~80 lines |
| Lines 10898-11147 (Reputation System) | FEATURE_DOCS/REPUTATION_SYSTEM.md | 250 | Move to feature doc |
| Lines 11148-11299 (Search System) | FEATURE_DOCS/SEARCH_SYSTEM.md | 152 | Move to feature doc |
| Lines 11300-11928 (Election + Candidate) | FEATURE_DOCS/ELECTION_TRACKING.md | 629 | Move to feature doc, condense ~100 lines |
| Lines 11929-12099 (AI Trending Topics) | FEATURE_DOCS/AI_TRENDING_TOPICS.md | 171 | Move to feature doc, condense ~80 lines |
| Lines 12100-12299 (WebSocket Messaging) | FEATURE_DOCS/WEBSOCKET_MESSAGING.md | 200 | Move to feature doc |
| Lines 12300-12800 (Stripe Payment) | FEATURE_DOCS/PAYMENT_SYSTEM.md | 501 | Move to feature doc, condense ~200 lines |
| Lines 12801-13660 (Various civic features) | CIVIC_ENGAGEMENT.md | 860 | Already extracted (Phase 1) |
| Lines 13661-13765 (Deployment Lessons) | CHANGELOG.md | 105 | Relocate per REDUNDANCY_REMOVAL_PLAN Phase 3.2 |
| Lines 13766-15057 (Various features) | Respective FEATURE_DOCS/ or CIVIC_ENGAGEMENT.md | 1292 | Distribute to appropriate docs |
| Lines 15058-15283 (Performance Optimization) | PERFORMANCE.md | 226 | Move to performance doc |
| Lines 15284-15631 (Known Issues) | TROUBLESHOOTING.md | 348 | Move to troubleshooting, keep only recent issues |
| Lines 15632-16357 (Development Practices) | DEVELOPMENT_GUIDE.md | 726 | Move, condense ~200 lines per REDUNDANCY_REMOVAL_PLAN Phase 4.3 |
| Lines 16358-17383 (Session History) | CHANGELOG.md | 1026 | Relocate ~975 lines per REDUNDANCY_REMOVAL_PLAN Phase 4.1 |
| Lines 17384-17723 (Future Roadmap + Status) | README.md or separate ROADMAP.md | 340 | Move to README or create ROADMAP.md |
| Lines 17724-19308 (Troubleshooting) | TROUBLESHOOTING.md | 1585 | Move, reorganize by symptom, minor condensing ~100 lines |
| Lines 19309-19697 (Various sections) | Appropriate new docs | 389 | Distribute |
| Lines 19698-19875 (Recently Resolved) | CHANGELOG.md | 178 | Relocate per REDUNDANCY_REMOVAL_PLAN Phase 4.2 |
| Lines 19876-20115 (Remaining content) | Appropriate docs or archive | 240 | Evaluate and distribute |

**Summary**:
- **Total current lines**: 20,115
- **Lines moving to new docs**: ~18,000
- **Lines to CHANGELOG.md**: ~1,375 (historical content)
- **Lines condensed/removed**: ~2,992 (per Phase 1 REDUNDANCY_REMOVAL_PLAN)
- **Final MASTER_DOCUMENTATION.md**: < 5,000 lines (or archived entirely)

---

## Implementation Phases

### Phase 2.1: Create Core Documentation (Week 1, Days 1-5)

**Goal**: Establish navigation structure and core architectural docs

#### Tasks:
- [ ] **Day 1**: Create `docs/README.md` (navigation hub)
  - Extract executive summary from MASTER_DOCUMENTATION.md lines 79-122
  - Create navigation structure for all planned docs
  - Add quick links to common tasks
  - Estimated effort: 4 hours

- [ ] **Day 2**: Create `docs/ARCHITECTURE.md`
  - Move lines 178-303 (System Architecture)
  - Move lines 304-406 (Environment Detection)
  - Move lines 409-530 (ES6 Module System)
  - Move lines 531-839 (System Integration Workflows)
  - Condense lines 5653-5830 (Inline Code Elimination) to ~40 lines
  - Add Architectural Decision Records (ADRs)
  - Estimated effort: 8 hours

- [ ] **Day 3**: Create `docs/API_REFERENCE.md`
  - Move lines 3090-4119 (primary API Reference section)
  - Identify and consolidate duplicate API listings from system sections
  - Add cross-references to specialized API docs
  - Standardize endpoint documentation format
  - Estimated effort: 8 hours

- [ ] **Day 4**: Create `docs/GETTING_STARTED.md`
  - Extract setup procedures from CLAUDE.md
  - Extract quick start from MASTER_DOCUMENTATION.md
  - Create new onboarding content
  - Add "where to find what" navigation
  - Estimated effort: 6 hours

- [ ] **Day 5**: Validation and cross-referencing
  - Test all internal links in new docs
  - Add cross-references between docs
  - Update existing specialized docs (API_QUESTS_BADGES.md, etc.) with links to new structure
  - Git commit Phase 2.1 completion
  - Estimated effort: 4 hours

**Deliverables**: 4 new core documentation files with complete cross-referencing

---

### Phase 2.2: Create Operational Documentation (Week 1-2, Days 6-10)

**Goal**: Consolidate operational procedures and development practices

#### Tasks:
- [ ] **Day 6**: Create `docs/OPERATIONS.md` (Part 1: Deployment)
  - Move lines 8639-8875 from MASTER_DOCUMENTATION.md
  - Consolidate with CLAUDE.md deployment procedures (lines 63-461)
  - Remove redundancy (~170 lines per REDUNDANCY_REMOVAL_PLAN)
  - Create single authoritative deployment guide
  - Estimated effort: 8 hours

- [ ] **Day 7**: Create `docs/OPERATIONS.md` (Part 2: Database & Monitoring)
  - Consolidate database migration procedures from CLAUDE.md (lines 463-747)
  - Add database architecture from MASTER_DOCUMENTATION.md lines 1303-1328
  - Add monitoring sections from MASTER_DOCUMENTATION.md lines 8876-10064
  - Estimated effort: 8 hours

- [ ] **Day 8**: Create `docs/DEVELOPMENT_GUIDE.md`
  - Move lines 15632-16357 (Development Practices, condense ~200 lines)
  - Extract patterns from ARCHITECTURE.md ES6 modules section
  - Add API development patterns
  - Add contribution guidelines
  - Estimated effort: 8 hours

- [ ] **Day 9**: Update CLAUDE.md references
  - Update CLAUDE.md to reference OPERATIONS.md for detailed procedures
  - Keep quick-reference commands in CLAUDE.md
  - Remove redundant content from CLAUDE.md
  - Estimated effort: 3 hours

- [ ] **Day 10**: Validation and testing
  - Test deployment procedures with OPERATIONS.md
  - Verify all cross-references work
  - Git commit Phase 2.2 completion
  - Estimated effort: 3 hours

**Deliverables**: 2 new operational guides, updated CLAUDE.md

---

### Phase 2.3: Create Specialized Documentation (Week 2, Days 11-15)

**Goal**: Create security, performance, and troubleshooting guides

#### Tasks:
- [ ] **Day 11**: Create `docs/SECURITY.md`
  - Move lines 7976-8086 (Security & Authentication)
  - Move lines 10368-10593 (Geographic Privacy overview - full details in feature doc)
  - Add vulnerability response procedures
  - Add compliance considerations
  - Estimated effort: 8 hours

- [ ] **Day 12**: Create `docs/PERFORMANCE.md`
  - Move lines 15058-15283 (Performance Optimization System)
  - Add database connection pool fix details
  - Add async AI analysis optimization
  - Reference PERFORMANCE_BASELINE.md if exists
  - Estimated effort: 6 hours

- [ ] **Day 13-14**: Create `docs/TROUBLESHOOTING.md`
  - Move lines 17724-19308 (entire troubleshooting section, 1,585 lines)
  - Reorganize by symptom instead of component
  - Add diagnostic flowchart
  - Condense verbosity (~100 lines per REDUNDANCY_REMOVAL_PLAN Phase 5.5)
  - Move known issues from lines 15285-15631
  - Estimated effort: 12 hours (2 days)

- [ ] **Day 15**: Validation
  - Test troubleshooting procedures
  - Verify all cross-references
  - Git commit Phase 2.3 completion
  - Estimated effort: 4 hours

**Deliverables**: 3 new specialized documentation files

---

### Phase 2.4: Create Feature Deep-Dives (Week 3, Days 16-20)

**Goal**: Extract complex features into standalone documentation

#### Tasks:
- [ ] **Day 16**: Create FEATURE_DOCS directory and initial features
  - Create `docs/FEATURE_DOCS/` directory
  - Create `FEED_ALGORITHM.md` (lines 5030-5652, 623 lines)
  - Create `GEOGRAPHIC_PRIVACY.md` (lines 10368-10593, 226 lines)
  - Estimated effort: 8 hours

- [ ] **Day 17**: Create messaging and payment feature docs
  - Create `WEBSOCKET_MESSAGING.md` (lines 12100-12299, 200 lines)
  - Create `PAYMENT_SYSTEM.md` (lines 12300-12800, condense to ~400 lines)
  - Estimated effort: 8 hours

- [ ] **Day 18**: Create UI and photo feature docs
  - Create `MOBILE_UI.md` (lines 5831-6241, 411 lines)
  - Create `PHOTO_TAGGING.md` (lines 10065-10367, 303 lines)
  - Estimated effort: 8 hours

- [ ] **Day 19**: Create relationship and AI feature docs
  - Create `RELATIONSHIP_SYSTEM.md` (lines 10594-10897, condense to ~220 lines)
  - Create `AI_TRENDING_TOPICS.md` (lines 11929-12099, condense to ~100 lines)
  - Create `REPUTATION_SYSTEM.md` (lines 10898-11147, 250 lines)
  - Create `SEARCH_SYSTEM.md` (lines 11148-11299, 152 lines)
  - Estimated effort: 8 hours

- [ ] **Day 20**: Create election tracking feature doc
  - Create `ELECTION_TRACKING.md` (lines 11300-11928, condense to ~530 lines)
  - Add cross-references from all feature docs to related docs
  - Git commit Phase 2.4 completion
  - Estimated effort: 6 hours

**Deliverables**: 11 feature-specific documentation files in FEATURE_DOCS/ directory

---

### Phase 2.5: Cleanup and Validation (Week 3-4, Days 21-25)

**Goal**: Complete migration, validate, and finalize documentation structure

#### Tasks:
- [ ] **Day 21**: Relocate historical content to CHANGELOG.md
  - Move lines 16358-17383 (Session History, ~975 lines) to CHANGELOG.md
  - Move lines 13661-13765 (Deployment Lessons Learned, 105 lines) to CHANGELOG.md
  - Move lines 19698-19875 (Recently Resolved Issues, ~150 lines) to CHANGELOG.md
  - Total relocation: ~1,230 lines
  - Estimated effort: 6 hours

- [ ] **Day 22**: Remove redundancy from MASTER_DOCUMENTATION.md
  - Execute REDUNDANCY_REMOVAL_PLAN Phase 1: Remove CLAUDE.md duplications (170 lines)
  - Execute Phase 2: Consolidate API documentation (250 lines)
  - Execute Phase 3: Remove internal duplications (110 lines)
  - Execute Phase 5: Condense verbose sections (1,087 lines)
  - Total removal: ~1,617 lines (some already removed in previous phases)
  - Estimated effort: 8 hours

- [ ] **Day 23**: Decide MASTER_DOCUMENTATION.md fate
  - **Option A**: Archive MASTER_DOCUMENTATION.md entirely
    - Rename to `MASTER_DOCUMENTATION.archive.md`
    - Add notice at top pointing to new documentation structure
    - Keep in repository for historical reference
  - **Option B**: Reduce to minimal reference (< 1,000 lines)
    - Keep only: Header, navigation to new docs, critical notices
    - Serve as legacy entry point during transition
  - Update all references to MASTER_DOCUMENTATION.md to point to new docs
  - Estimated effort: 6 hours

- [ ] **Day 24**: Comprehensive validation
  - **Link validation**:
    ```bash
    # Test all internal links in all new docs
    grep -r '\[.*\](.*\.md' docs/ | # Extract all markdown links
    # Verify each link target exists
    ```
  - **Cross-reference validation**: Verify all "See X for details" references are correct
  - **Content completeness**: Verify no sections lost during migration
  - **Formatting consistency**: Standardize headers, code blocks, lists across all docs
  - Estimated effort: 8 hours

- [ ] **Day 25**: Finalization and communication
  - Update README.md in root to reference new docs/ structure
  - Update CLAUDE.md global instructions to reference new structure
  - Create migration guide for developers: "Documentation has moved - find what you need"
  - Add entry to CHANGELOG.md documenting Phase 2 restructuring
  - Create GitHub PR with all Phase 2 changes
  - Estimated effort: 4 hours

**Deliverables**:
- Clean, modular documentation structure
- MASTER_DOCUMENTATION.md archived or reduced to < 1,000 lines
- Zero broken references
- Communication to development team

---

## Migration Strategy

### Approach: Incremental Migration with Validation

**Key Principle**: Create new docs alongside existing MASTER_DOCUMENTATION.md, then archive old doc after validation

#### Step 1: Create New Files (Phases 2.1-2.4)
- Create all new documentation files in `docs/` directory
- MASTER_DOCUMENTATION.md remains untouched during creation
- Allows rollback if issues discovered
- Enables parallel validation

#### Step 2: Add Cross-References During Migration
- As each new doc is created, add cross-references to related new docs
- Build comprehensive link network
- Ensures navigability before old doc is archived

#### Step 3: Validate After Each Phase (Phases 2.1-2.4 end)
- Test all links in newly created docs
- Verify content accuracy
- Git commit after each phase for rollback capability
- Fix any issues before moving to next phase

#### Step 4: Relocate Historical Content (Phase 2.5, Day 21)
- Move session history to CHANGELOG.md
- This creates backup before any deletion
- Historical content preserved even if mistakes made

#### Step 5: Remove Redundancy (Phase 2.5, Day 22)
- Execute redundancy removal plan
- Safe because all content now exists in new docs
- Keep MASTER_DOCUMENTATION.md until fully validated

#### Step 6: Archive or Reduce MASTER_DOCUMENTATION.md (Phase 2.5, Day 23)
- **Option A (Recommended)**: Archive entirely
  - Rename to `MASTER_DOCUMENTATION.archive.md`
  - Add redirect notice at top
  - Keep for historical reference
- **Option B**: Reduce to minimal reference
  - Keep only navigation and critical notices
  - <1,000 lines total

#### Step 7: Final Validation (Phase 2.5, Day 24)
- Comprehensive link checking
- Content completeness verification
- No information loss

### Handling Cross-References

#### Internal Cross-References (within docs/)
Use relative links:
```markdown
[See Architecture](./ARCHITECTURE.md#system-overview)
[API Reference](./API_REFERENCE.md#authentication-endpoints)
[Feature: Feed Algorithm](./FEATURE_DOCS/FEED_ALGORITHM.md)
```

#### Root-Level References (to CHANGELOG.md, CLAUDE.md)
Use relative paths from docs/ directory:
```markdown
[See CHANGELOG.md](../CHANGELOG.md)
[Development protocols in CLAUDE.md](../CLAUDE.md)
```

#### Reference from Root to docs/
In root README.md:
```markdown
[Documentation](docs/README.md)
[API Reference](docs/API_REFERENCE.md)
```

#### MASTER_DOCUMENTATION.md Redirects
If keeping minimal MASTER_DOCUMENTATION.md, add redirects:
```markdown
# MASTER DOCUMENTATION (ARCHIVED)

**This documentation has been restructured for better maintainability.**

**New documentation location**: [docs/README.md](docs/README.md)

## Find What You Need

- **System architecture** → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **API reference** → [docs/API_REFERENCE.md](docs/API_REFERENCE.md)
- **Deployment procedures** → [docs/OPERATIONS.md](docs/OPERATIONS.md)
- **Development guide** → [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)
- **Troubleshooting** → [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Complete documentation index** → [docs/README.md](docs/README.md)

---

[Optional: Keep critical notices, minimal content]
```

### Git Strategy

#### Commit Strategy
- **Commit after each phase**: Enables rollback to any phase
- **Descriptive commit messages**:
  ```
  docs: Phase 2.1 - Create core documentation (README, ARCHITECTURE, API_REFERENCE, GETTING_STARTED)
  docs: Phase 2.2 - Create operational documentation (OPERATIONS, DEVELOPMENT_GUIDE)
  docs: Phase 2.3 - Create specialized documentation (SECURITY, PERFORMANCE, TROUBLESHOOTING)
  docs: Phase 2.4 - Create feature deep-dive documentation (11 feature docs)
  docs: Phase 2.5 - Archive MASTER_DOCUMENTATION.md and finalize restructuring
  ```

#### Branch Strategy
- **Create feature branch**: `feature/docs-phase2-restructuring`
- **Regular commits**: After each phase completion
- **Single PR**: One large PR with all Phase 2 changes (or separate PRs per phase if preferred)

#### File Moves vs New Files
- **Use `git mv` when appropriate**: Preserves history
- **New files for new structure**: Most docs are new consolidations, not direct moves
- **Archive old file**: `git mv MASTER_DOCUMENTATION.md MASTER_DOCUMENTATION.archive.md`

### Validation Checklist

#### Content Validation
- [ ] All content from MASTER_DOCUMENTATION.md has a new home
- [ ] No information loss (100% content preserved or relocated to CHANGELOG.md)
- [ ] Historical content properly moved to CHANGELOG.md (~1,375 lines)
- [ ] Redundancy removed (~2,992 lines per Phase 1 plan)
- [ ] Feature-specific content in appropriate FEATURE_DOCS/ files

#### Link Validation
- [ ] All internal links work (no 404s within docs)
- [ ] All cross-references to specialized docs work (API_QUESTS_BADGES.md, DATABASE_SCHEMA.md, etc.)
- [ ] All references to CHANGELOG.md and CLAUDE.md work
- [ ] All anchor links to specific sections work (#section-name)
- [ ] No broken image links (if any diagrams)

#### Structure Validation
- [ ] docs/README.md provides clear navigation to all docs
- [ ] ARCHITECTURE.md covers all system design topics
- [ ] API_REFERENCE.md covers all core API endpoints (no duplicates)
- [ ] OPERATIONS.md consolidates deployment procedures (no CLAUDE.md redundancy)
- [ ] TROUBLESHOOTING.md organized by symptom (easy to navigate)
- [ ] FEATURE_DOCS/ contains all 11 planned feature documents
- [ ] Each doc has clear table of contents

#### Cross-Reference Validation
- [ ] Architecture references Operations for deployment
- [ ] Operations references Architecture for infrastructure design
- [ ] API Reference cross-references specialized API docs
- [ ] Troubleshooting references Architecture, Operations, and Feature docs
- [ ] Feature docs reference each other where appropriate
- [ ] All docs reference CHANGELOG.md for historical context

#### Formatting Validation
- [ ] Consistent heading structure (# Title, ## Section, ### Subsection)
- [ ] Consistent code block formatting
- [ ] Consistent list formatting (bullet vs numbered)
- [ ] Consistent cross-reference format
- [ ] All docs have Table of Contents
- [ ] All docs have "Cross-References" section at bottom

#### Migration Completeness
- [ ] MASTER_DOCUMENTATION.md reduced to < 5,000 lines OR archived
- [ ] CHANGELOG.md contains all historical session content
- [ ] CLAUDE.md updated to reference new documentation structure
- [ ] Root README.md updated to reference docs/README.md
- [ ] No orphaned content (everything has a home)

#### Git Validation
- [ ] All new files committed
- [ ] Git history preserved where appropriate
- [ ] Descriptive commit messages
- [ ] No accidental file deletions
- [ ] `.gitignore` doesn't exclude new docs

---

## Risks and Mitigation

### Risk 1: Breaking Existing Bookmarks/Links

**Impact**: High - Developers may have bookmarked specific sections of MASTER_DOCUMENTATION.md

**Mitigation**:
1. **Keep MASTER_DOCUMENTATION.md with redirects** for 6 months minimum
   - Rename to `MASTER_DOCUMENTATION.archive.md` but keep a minimal `MASTER_DOCUMENTATION.md` with redirect notices
   - Add clear redirects at top: "This section has moved to [new location]"
2. **Announce documentation restructuring** to all developers
   - Provide migration guide: "Find what you need - old location → new location"
   - Update bookmarks/links in team wiki, Slack, etc.
3. **Maintain anchor compatibility where possible**
   - If section name doesn't change, keep same anchor ID
   - Example: `#system-architecture` in old doc → `#system-architecture` in ARCHITECTURE.md

**Recovery**: If bookmarks critical, create redirect stubs indefinitely

---

### Risk 2: Information Fragmentation

**Impact**: Medium - Developers may not find related information across multiple docs

**Mitigation**:
1. **Strong cross-referencing strategy**
   - Every doc has "Cross-References" section at bottom
   - Related topics link to each other
   - Example: Security doc links to Authentication in API Reference, Geographic Privacy in Feature Docs
2. **Comprehensive docs/README.md navigation hub**
   - Quick links to common tasks
   - "Find what you need" decision tree
   - Search-optimized keywords
3. **Clear doc purposes**
   - Each doc has clear "Purpose" statement at top
   - Table of Contents in every doc
   - Consistent structure across docs

**Recovery**: Add more cross-references if confusion occurs

---

### Risk 3: Duplicate Content Re-Emerging

**Impact**: Medium - Without central monolithic doc, duplication may creep back in

**Mitigation**:
1. **Clear ownership guidelines**
   - API endpoint documentation ONLY in API_REFERENCE.md (or specialized API docs)
   - Deployment procedures ONLY in OPERATIONS.md
   - Security topics ONLY in SECURITY.md
   - Feature details ONLY in FEATURE_DOCS/
2. **Documentation contribution guidelines** in DEVELOPMENT_GUIDE.md
   - "Before adding documentation, check if topic already covered"
   - "If updating feature, update corresponding feature doc"
   - "Don't duplicate, cross-reference"
3. **Regular documentation audits**
   - Quarterly review for duplicate content
   - Automated link checking
   - Content freshness review

**Recovery**: Periodic consolidation sprints (every 6 months)

---

### Risk 4: Inconsistent Formatting

**Impact**: Low - Multiple smaller docs may have formatting inconsistencies

**Mitigation**:
1. **Documentation style guide** in DEVELOPMENT_GUIDE.md
   - Standard heading structure
   - Code block conventions
   - List formatting rules
   - Cross-reference format
2. **Templates for new docs**
   - Template structure for feature docs
   - Template for API documentation
   - Consistent sections: Overview, Table of Contents, Cross-References
3. **Pre-commit validation**
   - Markdown linting
   - Link checking
   - Formatting validation

**Recovery**: Formatting cleanup sprint if needed

---

### Risk 5: Phase Failure During Migration

**Impact**: High - Migration gets stuck halfway, leaving documentation in inconsistent state

**Mitigation**:
1. **Phase-based approach with validation**
   - Complete validation after each phase
   - Git commit after each phase (rollback capability)
   - Don't proceed to next phase if validation fails
2. **Create new docs alongside old**
   - MASTER_DOCUMENTATION.md stays intact until final phase
   - No information loss at any point
   - Can pause migration and resume later
3. **Clear success criteria per phase**
   - Phase 2.1: 4 core docs created, links validated
   - Phase 2.2: 2 operational docs created, CLAUDE.md updated
   - Phase 2.3: 3 specialized docs created
   - Phase 2.4: 11 feature docs created
   - Phase 2.5: Historical content relocated, MASTER_DOC archived

**Recovery**: Rollback to last completed phase if issues arise

---

### Risk 6: Developer Confusion During Transition

**Impact**: Medium - Developers unsure where to find or add documentation during migration

**Mitigation**:
1. **Clear communication plan**
   - Announce Phase 2 start: "Documentation restructuring in progress"
   - Announce Phase 2 completion: "Documentation restructured - here's how to navigate"
   - Provide migration guide: Old locations → New locations
2. **Staged rollout**
   - Phase 2.1-2.4: New docs created but old MASTER_DOCUMENTATION.md still available
   - Phase 2.5: Archive old doc only after all new docs validated
   - Transition period: Both old and new docs available
3. **Update contribution guidelines immediately**
   - Add note to MASTER_DOCUMENTATION.md during migration: "Documentation restructuring in progress, see docs/README.md"
   - Update CLAUDE.md to reference new structure

**Recovery**: Extended transition period if confusion widespread

---

## Success Criteria

### Quantitative Criteria

- [x] **MASTER_DOCUMENTATION.md reduced to < 5,000 lines** (or archived entirely)
  - Current: 20,115 lines
  - Target: < 5,000 lines (75% reduction) OR archived

- [x] **Zero broken cross-references**
  - All internal links functional
  - All anchor links work
  - All references to external docs (CHANGELOG.md, CLAUDE.md) work

- [x] **All content preserved**
  - 100% of unique technical content preserved in new docs
  - 100% of historical content relocated to CHANGELOG.md
  - No information loss

- [x] **Modular structure achieved**
  - 15-20 focused documentation files
  - Average file size: 500-2,000 lines
  - Clear separation of concerns

### Qualitative Criteria

- [x] **Navigation improved**
  - New developer can find setup guide in < 1 minute
  - Experienced developer can find any API endpoint in < 2 minutes
  - Clear documentation hub (docs/README.md) with intuitive navigation

- [x] **Maintainability improved**
  - Smaller files easier to edit (< 2,000 lines per file)
  - Clear ownership of documentation sections
  - Reduced merge conflicts (editing separate files)
  - Documentation contribution time reduced by 50%

- [x] **Professional structure**
  - Matches industry standard documentation organization
  - Similar to AWS, Stripe, GitHub documentation structures
  - Easy for external developers to understand

- [x] **Performance improved**
  - Individual docs load faster (< 100KB each vs 711KB monolith)
  - Better search performance (grep/search tools work faster on smaller files)
  - Editor responsiveness improved (no lag when editing)

### User Experience Criteria

- [x] **Developer Onboarding**
  - GETTING_STARTED.md provides clear path from zero to first contribution
  - New developers productive within 2 hours
  - Clear "where to find what" guidance

- [x] **Developer Productivity**
  - API Reference quickly searchable
  - Troubleshooting guide organized by symptom (find solutions faster)
  - Operations guide provides clear deployment procedures
  - Development guide provides established patterns

- [x] **Documentation Contribution**
  - Clear guidelines for where to add new documentation
  - Easier to submit documentation PRs (smaller files, less conflict)
  - Documentation reviews faster (focused PRs on specific docs)

---

## Timeline

### Week 1: Core & Operational Documentation
- **Days 1-5**: Phase 2.1 - Core Documentation
  - Create README.md, ARCHITECTURE.md, API_REFERENCE.md, GETTING_STARTED.md
  - Establish documentation structure and navigation
- **Days 6-10**: Phase 2.2 - Operational Documentation
  - Create OPERATIONS.md, DEVELOPMENT_GUIDE.md
  - Consolidate deployment procedures from CLAUDE.md
  - Update CLAUDE.md references

### Week 2: Specialized Documentation
- **Days 11-15**: Phase 2.3 - Specialized Documentation
  - Create SECURITY.md, PERFORMANCE.md, TROUBLESHOOTING.md
  - Reorganize troubleshooting by symptom

### Week 3: Feature Documentation
- **Days 16-20**: Phase 2.4 - Feature Deep-Dives
  - Create FEATURE_DOCS/ directory
  - Create 11 feature-specific documentation files
  - Extract complex feature documentation from monolith

### Week 4: Cleanup & Validation
- **Days 21-25**: Phase 2.5 - Cleanup and Validation
  - Relocate historical content to CHANGELOG.md
  - Remove redundancy from MASTER_DOCUMENTATION.md
  - Archive or reduce MASTER_DOCUMENTATION.md
  - Comprehensive validation
  - Communication and rollout

### Total Estimated Effort: 20-25 Developer Days

**Breakdown**:
- Core documentation: 5 days (30 hours)
- Operational documentation: 5 days (30 hours)
- Specialized documentation: 5 days (30 hours)
- Feature documentation: 5 days (30 hours)
- Cleanup & validation: 5 days (30 hours)

**Assumptions**:
- Single developer working full-time: 4 weeks calendar time
- Multiple developers in parallel: 2-3 weeks calendar time
- Part-time effort: 6-8 weeks calendar time

---

## Next Steps

### Immediate Actions (Before Starting Phase 2.1)

1. **Review and Approve This Plan**
   - Team review of proposed structure
   - Approval to proceed with restructuring
   - Agreement on timeline

2. **Communicate to Development Team**
   - Announce Phase 2 restructuring project
   - Explain benefits and timeline
   - Set expectations for transition period

3. **Prepare Development Environment**
   - Create `feature/docs-phase2-restructuring` branch
   - Backup current MASTER_DOCUMENTATION.md
   - Ensure all developers have latest version

4. **Execute Phase 1 (if not already complete)**
   - Complete redundancy removal per REDUNDANCY_REMOVAL_PLAN.md
   - This reduces MASTER_DOCUMENTATION.md from 20,115 to ~17,000 lines
   - Makes Phase 2 migration cleaner

### Starting Phase 2.1

Once approved, begin Day 1:
1. Create `docs/README.md`
2. Establish navigation structure
3. Begin content migration

### Monitoring Progress

Track progress using:
- [ ] Phase 2.1 checklist (Days 1-5)
- [ ] Phase 2.2 checklist (Days 6-10)
- [ ] Phase 2.3 checklist (Days 11-15)
- [ ] Phase 2.4 checklist (Days 16-20)
- [ ] Phase 2.5 checklist (Days 21-25)

### Post-Implementation

After Phase 2.5 completion:
1. **Announce completion** to development team
2. **Provide migration guide**: Old locations → New locations
3. **Update bookmarks** in team wiki, communication channels
4. **Monitor for issues**: First 2 weeks after rollout
5. **Address feedback**: Adjust documentation based on developer feedback
6. **Add to CHANGELOG.md**: Document Phase 2 restructuring completion

---

## Appendix: Alternatives Considered

### Alternative 1: Keep MASTER_DOCUMENTATION.md as Primary

**Approach**: Keep monolithic doc, add specialized docs as supplements

**Pros**:
- No migration effort required
- No broken bookmarks/links
- Developers familiar with current structure

**Cons**:
- Doesn't solve core problems (hard to navigate, slow to load, merge conflicts)
- Redundancy continues to grow
- Maintainability remains poor

**Decision**: Rejected - Doesn't address root issues

---

### Alternative 2: Split into Only 5-7 Large Files

**Approach**: Partial split (API, Database, Architecture, Operations, Features)

**Pros**:
- Less migration effort than full modularization
- Some improvement in navigability
- Fewer files to manage

**Cons**:
- Still large files (3,000-4,000 lines each)
- Doesn't fully solve load performance
- Less clear separation of concerns
- Still intimidating for new developers

**Decision**: Rejected - Insufficient improvement

---

### Alternative 3: Move to External Documentation Platform (GitBook, ReadTheDocs)

**Approach**: Migrate documentation to external platform with better UI

**Pros**:
- Professional UI with search, navigation
- Better mobile experience
- Version-specific documentation

**Cons**:
- Additional infrastructure to maintain
- Learning curve for external tool
- Potential sync issues between code and docs
- Cost considerations
- Markdown files still need restructuring

**Decision**: Rejected for Phase 2 - Can consider for future phase after modularization complete

---

### Alternative 4: Automated Documentation Generation from Code

**Approach**: Use JSDoc, TypeDoc, or similar to auto-generate API docs

**Pros**:
- API docs stay in sync with code
- Less manual documentation maintenance
- Industry standard for API documentation

**Cons**:
- Doesn't address architectural documentation, operations, troubleshooting
- Requires significant code annotation effort
- Doesn't solve monolithic doc problem

**Decision**: Partial adoption - Can use for API Reference in future, but manual docs still needed for architecture, operations, features

---

## Appendix: Documentation Maintenance Plan

### Ongoing Maintenance (Post-Phase 2)

#### Weekly Maintenance
- **Review new PRs for documentation updates**
  - Verify documentation updated with code changes
  - Check for duplicated content
  - Validate links in changed docs

#### Monthly Maintenance
- **Link validation**
  - Automated link checking across all docs
  - Fix any broken cross-references
  - Update outdated links

- **Content freshness review**
  - Review "Recently Resolved Issues" in TROUBLESHOOTING.md
  - Move resolved issues >30 days old to CHANGELOG.md
  - Update "Current Production Status" in README.md

#### Quarterly Maintenance
- **Content audit**
  - Check for duplicate content
  - Consolidate if duplication found
  - Review for outdated information

- **Structure review**
  - Evaluate if new docs needed (new major features)
  - Consider merging docs if too granular
  - Update navigation in README.md

#### Annual Maintenance
- **Comprehensive documentation review**
  - Full content accuracy audit
  - Style guide compliance check
  - Formatting standardization
  - Major version updates

### Documentation Ownership

**Core Documentation** (README, ARCHITECTURE, GETTING_STARTED):
- Owner: Lead developer or architect
- Review: Quarterly

**API Documentation** (API_REFERENCE, specialized API docs):
- Owner: Backend team lead
- Review: Monthly (high-change area)

**Operations Documentation** (OPERATIONS, DEPLOYMENT):
- Owner: DevOps/Infrastructure lead
- Review: After each major infrastructure change

**Development Documentation** (DEVELOPMENT_GUIDE):
- Owner: Development team collectively
- Review: Quarterly

**Specialized Documentation** (SECURITY, PERFORMANCE, TROUBLESHOOTING):
- Owner: Respective domain experts
- Review: Quarterly or after major incidents

**Feature Documentation** (FEATURE_DOCS/):
- Owner: Feature developer/team
- Review: When feature changes

### Documentation Contribution Guidelines

**When adding new feature**:
1. Create or update feature doc in FEATURE_DOCS/
2. Add API endpoints to API_REFERENCE.md (or specialized API doc)
3. Update ARCHITECTURE.md if architectural change
4. Update CHANGELOG.md with feature addition
5. Add cross-references between related docs

**When fixing bug**:
1. Update TROUBLESHOOTING.md if common issue
2. Update CHANGELOG.md with bug fix
3. Update affected feature doc if behavior changed

**When changing deployment/operations**:
1. Update OPERATIONS.md with new procedures
2. Update CLAUDE.md if quick-reference commands changed
3. Update CHANGELOG.md with operational changes

**When deprecating feature**:
1. Mark as deprecated in relevant docs
2. Add deprecation notice to CHANGELOG.md
3. Update ROADMAP.md (if exists) with timeline
4. After removal, move documentation to "Archived Features" section

---

**End of Phase 2 Restructuring Plan**
**Status**: Ready for Review and Approval
**Next Action**: Team review and approval to proceed with Phase 2.1
