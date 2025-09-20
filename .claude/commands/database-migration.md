# Zero-Downtime Database Migration Multi-Agent Workflow

## Overview
Coordinate database schema changes with zero downtime using specialized agents for planning, execution, verification, and rollback procedures.

**Safety First:** Comprehensive planning and testing before production changes

---

## Migration Agent Coordination

### Terminal 1 - Database Migration Planner
```bash
claude --dangerously-skip-permissions -p "You are the Database Migration Planner for United We Rise. Your role:

1. Analyze proposed schema changes and their impact
2. Design zero-downtime migration strategy
3. Plan backward compatibility and rollback procedures
4. Document complete migration plan in .claude/scratchpads/MIGRATION-PLAN.md
5. Assess risks and create mitigation strategies

Migration Planning Focus:
- Schema change impact analysis
- Application compatibility requirements
- Performance implications assessment
- Rollback strategy development
- Timeline and dependency mapping

United We Rise Specific Considerations:
- Civic platform data integrity (elections, candidates, voting records)
- Social platform performance (My Feed, posts, relationships)
- Payment system data protection
- User authentication data security

Timeline: Complete migration plan within 10-15 minutes
Deliverable: Comprehensive migration strategy with step-by-step procedures"
```

### Terminal 2 - Migration Execution Agent
```bash
claude --dangerously-skip-permissions -p "You are the Migration Execution Agent for United We Rise. Your role:

1. Execute migration plan from .claude/scratchpads/MIGRATION-PLAN.md
2. Apply schema changes step-by-step with verification
3. Log all migration steps to .claude/scratchpads/MIGRATION-LOG.md
4. Monitor database performance during migration
5. Coordinate with application update requirements

Execution Requirements:
- Test migration on staging database first
- Verify each step before proceeding
- Monitor database locks and performance
- Maintain data integrity throughout process
- Document any deviations from plan

Safety Protocols:
- Never proceed if verification fails
- Maintain rollback capability at each step
- Monitor application functionality during migration
- Alert if any critical thresholds exceeded

Timeline: Execute migration with verification at each step"
```

### Terminal 3 - Application Compatibility Agent
```bash
claude --dangerously-skip-permissions -p "You are the Application Compatibility Agent for United We Rise. Your role:

1. Monitor .claude/scratchpads/MIGRATION-LOG.md for schema changes
2. Update application code to support new schema
3. Ensure backward compatibility during transition
4. Test application functionality with new schema
5. Document changes in .claude/scratchpads/APP-COMPATIBILITY.md

Compatibility Requirements:
- Old application code works with new schema
- New application code works with old schema (if applicable)
- Gradual rollout support through feature flags
- API endpoint compatibility maintained

Testing Focus:
- Database query compatibility
- Application functionality verification
- Performance impact assessment
- Error handling validation

Deployment Coordination:
- Coordinate application deployment with schema changes
- Verify staging environment compatibility
- Prepare production deployment strategy"
```

### Terminal 4 - Migration Monitoring Agent
```bash
claude --dangerously-skip-permissions -p "You are the Migration Monitoring Agent for United We Rise. Your role:

1. Monitor database performance and health during migration
2. Track application metrics and user impact
3. Watch for errors or performance degradation
4. Document monitoring results in .claude/scratchpads/MIGRATION-MONITORING.md
5. Trigger rollback if critical issues detected

Monitoring Focus:
- Database connection pool health
- Query performance metrics
- Application response times
- Error rates and types
- User experience impact

Alert Triggers:
- Database connection failures
- Query performance degradation >50%
- Application error rate >2%
- User-facing functionality broken
- Data integrity violations detected

Rollback Authority: Can initiate emergency rollback if critical issues detected"
```

---

## Migration Strategy Framework

### Phase 1: Pre-Migration Planning
```sql
-- Schema analysis and planning
-- Example: Adding user_badges table for reputation system

-- 1. Analyze current schema dependencies
SELECT table_name, column_name, constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'users';

-- 2. Plan new table structure
CREATE TABLE user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL,
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  awarded_by INTEGER REFERENCES users(id),
  metadata JSONB DEFAULT '{}'
);

-- 3. Plan indexes for performance
CREATE INDEX CONCURRENTLY idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX CONCURRENTLY idx_user_badges_type ON user_badges(badge_type);
```

### Phase 2: Backward Compatibility Strategy
```javascript
// Application code compatibility during migration
class UserBadgeService {
  async getUserBadges(userId) {
    // Check if new table exists
    const tableExists = await this.checkTableExists('user_badges');

    if (tableExists) {
      // Use new badge system
      return await prisma.userBadges.findMany({
        where: { userId }
      });
    } else {
      // Fallback to old reputation system
      return await this.getLegacyReputationBadges(userId);
    }
  }
}
```

### Phase 3: Zero-Downtime Execution
```bash
# Migration execution with verification
# Step 1: Create new table (non-breaking)
psql -d $DATABASE_URL -c "
  BEGIN;
  CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    awarded_by INTEGER REFERENCES users(id),
    metadata JSONB DEFAULT '{}'
  );
  COMMIT;
"

# Step 2: Verify table creation
psql -d $DATABASE_URL -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_name = 'user_badges';
"

# Step 3: Create indexes concurrently (non-blocking)
psql -d $DATABASE_URL -c "
  CREATE INDEX CONCURRENTLY idx_user_badges_user_id ON user_badges(user_id);
  CREATE INDEX CONCURRENTLY idx_user_badges_type ON user_badges(badge_type);
"

# Step 4: Migrate existing data (if applicable)
# Step 5: Deploy application code that uses new schema
# Step 6: Verify functionality
# Step 7: Remove old schema (if applicable)
```

---

## Risk Assessment and Mitigation

### High Risk Scenarios
| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|-------------------|
| Data Loss | Critical | Low | Comprehensive backups, transaction rollback |
| Downtime | High | Medium | Zero-downtime strategy, rollback plan |
| Performance Degradation | Medium | High | Index optimization, connection monitoring |
| Application Breakage | High | Medium | Backward compatibility, gradual deployment |

### Rollback Procedures
```sql
-- Emergency rollback procedures
-- 1. Stop application deployments
-- 2. Revert to previous application version
-- 3. Remove new schema elements (if safe)

-- Example rollback for user_badges table
BEGIN;
-- Remove new indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_user_badges_user_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_badges_type;

-- Remove new table (only if no data loss)
DROP TABLE IF EXISTS user_badges;
COMMIT;
```

---

## Testing and Verification Procedures

### Staging Environment Testing
```bash
# Complete migration testing on staging
# 1. Apply migration to staging database
# 2. Deploy application changes to staging
# 3. Run comprehensive functionality tests
# 4. Verify performance impact
# 5. Test rollback procedures

# Staging database migration
export DATABASE_URL="$STAGING_DATABASE_URL"
npx prisma migrate deploy

# Application testing
curl -X GET "https://dev-api.unitedwerise.org/api/users/profile" \
  -H "Authorization: Bearer $STAGING_TOKEN"

# Performance testing
curl -w "@curl-format.txt" \
  "https://dev-api.unitedwerise.org/api/feed"
```

### Production Readiness Checklist
- [ ] Migration tested successfully on staging
- [ ] Application compatibility verified
- [ ] Performance impact assessed and acceptable
- [ ] Rollback procedures tested
- [ ] Monitoring alerts configured
- [ ] Database backup completed
- [ ] Team notification prepared

---

## United We Rise Specific Migration Considerations

### Civic Platform Data Integrity
```sql
-- Special considerations for civic data
-- Election data migrations
ALTER TABLE elections ADD COLUMN
  ballot_measures JSONB DEFAULT '[]';

-- Candidate information updates
ALTER TABLE candidates ADD COLUMN
  verification_status VARCHAR(20) DEFAULT 'pending';

-- Voting record system enhancements
CREATE TABLE voting_record_sources (
  id SERIAL PRIMARY KEY,
  source_name VARCHAR(100) NOT NULL,
  api_endpoint VARCHAR(255),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Social Platform Performance
```sql
-- My Feed performance optimizations
CREATE INDEX CONCURRENTLY idx_posts_feed_optimized
ON posts(created_at DESC, visibility, author_id)
WHERE visibility IN ('public', 'friends');

-- User relationship queries
CREATE INDEX CONCURRENTLY idx_user_relationships_feed
ON user_relationships(follower_id, created_at)
WHERE status = 'active';
```

### Payment System Security
```sql
-- Payment data migrations with security focus
-- Add encryption for sensitive payment data
ALTER TABLE payment_records ADD COLUMN
  encrypted_details TEXT;

-- Add audit trail for payment modifications
CREATE TABLE payment_audit_log (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER REFERENCES payment_records(id),
  action VARCHAR(50) NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  change_details JSONB
);
```

---

## Post-Migration Procedures

### Immediate Verification
- [ ] All applications connecting successfully
- [ ] Query performance within acceptable ranges
- [ ] No error spikes in application logs
- [ ] User functionality working correctly
- [ ] Admin dashboard operational

### Long-term Monitoring
- [ ] Database performance metrics tracking
- [ ] Application error rate monitoring
- [ ] User experience impact assessment
- [ ] Data integrity verification
- [ ] Storage usage optimization

### Documentation Updates
- [ ] MASTER_DOCUMENTATION.md schema updates
- [ ] API documentation reflecting changes
- [ ] Deployment procedure documentation
- [ ] Troubleshooting guide updates
- [ ] Migration lessons learned documentation