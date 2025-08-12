# Development Practices Guide

This document outlines best practices and procedures for developing the United We Rise platform.

## 📁 Documentation Structure

### Core Documentation Files
- **`PROJECT_SUMMARY_UPDATED.md`** - Overall project overview and architecture
- **`CURRENT_API_STATUS.md`** - Real-time API implementation status
- **`API_DOCUMENTATION.md`** - Complete API endpoint reference
- **`TEST_FILES_TRACKER.md`** - **⚠️ IMPORTANT: Track all test files here for cleanup**
- **`SESSION_HANDOFF_2025-08-08.md`** - Latest development session notes

### Deployment Documentation
- **`PRODUCTION_DEPLOYMENT_GUIDE.md`** - Azure deployment procedures
- **`AZURE_DEPLOYMENT.md`** - Azure-specific configuration
- **`SECURITY_DEPLOYMENT_CHECKLIST.md`** - Security review checklist

## 🧪 Test File Management

### Creating Test Files
When creating any test file:

1. **Add to Tracker**: Immediately add an entry to `TEST_FILES_TRACKER.md`
2. **Use Clear Naming**: `test-[feature]-[YYYYMMDD].[ext]`
3. **Add Header Comment**:
   ```javascript
   /**
    * Test: [Feature Name]
    * Created: [Date]
    * Purpose: [What this tests]
    * Cleanup: [Keep|Delete after YYYY-MM-DD|Archive]
    */
   ```

### Test File Categories
- **Temporary Tests**: Prefix with `test-temp-` (add to .gitignore)
- **Feature Tests**: Prefix with `test-[feature]-`
- **Integration Tests**: Keep in appropriate folders
- **One-time Scripts**: Mark clearly for deletion in tracker

### Weekly Cleanup Process
Every Friday:
1. Review `TEST_FILES_TRACKER.md`
2. Delete files marked for deletion
3. Archive old but useful tests to `/test-archive/`
4. Update tracker with current status

## 🔄 Development Workflow

### Local Development Setup

#### Frontend Development
The frontend is a static HTML application that can be run directly:

**Option 1: Direct File Access (Recommended for quick testing)**
1. Open `frontend/index.html` directly in your browser
2. The app automatically detects file:// protocol and uses localhost backend
3. hCaptcha is automatically bypassed for local development

**Option 2: Local Web Server**
```bash
cd frontend
npx http-server . -p 3000
# Then visit http://localhost:3000
```

#### Backend Development
```bash
cd backend
npm install
npm run dev  # Starts on http://localhost:3001
```

#### Local Development Features
- **Automatic Environment Detection**: Frontend detects localhost/file:// and adjusts API endpoints
- **hCaptcha Bypass**: Disabled for local development (see Security Notes below)
- **CORS Configuration**: Backend allows localhost origins for development

### Before Starting Work
1. Pull latest changes: `git pull origin main`
2. Check `SESSION_HANDOFF_*.md` for latest status
3. Review `TEST_FILES_TRACKER.md` for cleanup needs
4. Start backend server: `cd backend && npm run dev`

### During Development
1. Create test files as needed
2. **Always** add test files to tracker
3. Document significant changes in session notes
4. Keep test files organized by purpose

### After Work Session
1. Update relevant documentation
2. Mark test files for cleanup in tracker
3. Create session handoff if needed
4. Commit documentation updates

## 🗑️ Cleanup Guidelines

### Safe to Delete
- Test files marked "Delete" in tracker
- Files with `test-temp-` prefix older than 7 days
- One-time migration or setup scripts after success

### Keep/Archive
- Security test files
- API integration tests  
- Feature validation tests
- Successful deployment scripts

### Archive Process
```bash
# Create archive folder if needed
mkdir -p test-archive/[YYYY-MM]

# Move old but useful tests
mv test-[feature]-*.js test-archive/[YYYY-MM]/

# Update tracker
# Edit TEST_FILES_TRACKER.md to note archived location
```

## 📝 Session Handoff

When ending a development session:
1. Document current state in `SESSION_HANDOFF_[date].md`
2. Update `TEST_FILES_TRACKER.md` with new test files
3. Commit all documentation changes
4. Note any pending cleanups needed

## 🚀 Deployment Checklist

Before deploying:
1. Review and clean test files per tracker
2. Ensure no test files in production build
3. Verify all temporary files removed
4. Update documentation with deployment notes
5. **Security Check**: Ensure hCaptcha bypass only works in development

## 🔒 Security Notes

### Local Development hCaptcha Bypass
- **Purpose**: Allows registration/testing without working hCaptcha on localhost
- **Implementation**: Backend detects local IPs (127.0.0.1, ::1, 192.168.x.x, 10.x.x.x) and NODE_ENV=development
- **Security**: Only bypassed for local/private network IPs, never in production
- **Monitoring**: Console logs when bypass is triggered for debugging

### Production Security
- hCaptcha is always required in production environments
- Only bypassed for localhost, 127.0.0.1, and private network ranges
- All production deployments must verify hCaptcha is working properly

## 📊 Documentation Maintenance

### Weekly Tasks
- Review and update `TEST_FILES_TRACKER.md`
- Clean up old test files
- Archive useful tests

### Monthly Tasks
- Update `PROJECT_SUMMARY_UPDATED.md`
- Review all documentation for accuracy
- Clean test-archive folder of very old files

---

*Last Updated: August 9, 2025*
*Next Test Cleanup Review: August 16, 2025*