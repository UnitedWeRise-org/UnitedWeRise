# 📚 Smart Documentation Assistant System

## Overview

The Smart Documentation Assistant System automatically detects when code changes need documentation updates and provides intelligent prompts and templates to keep documentation current. This system balances automation with user control - nothing slips through the cracks, but you decide what gets documented.

## 🎯 Key Features

- **Smart Change Detection**: Automatically identifies schema changes, new components, API updates, and major bug fixes
- **Interactive Prompts**: Asks you what to document rather than doing it automatically
- **Template Generation**: Creates contextual documentation templates based on git diff analysis
- **Configurable Behavior**: Customize sensitivity, prompts, and template verbosity
- **Non-Intrusive**: Can skip, defer, or batch documentation updates
- **Learning Capable**: Designed to adapt to your documentation patterns over time

## 🚀 Quick Start

### Basic Usage (Recommended)
```bash
# Deploy with automatic documentation prompts
./scripts/quick-deploy-with-docs.sh "feat: add new user profile system"

# The system will:
# 1. Detect changes that need documentation
# 2. Prompt you for updates with smart suggestions
# 3. Generate templates if you choose to update
# 4. Deploy your changes to staging
```

### Individual Tools
```bash
# Just check what needs documentation
./scripts/check-docs-needed.sh

# Run interactive documentation assistant
./scripts/interactive-docs-prompt.sh

# Generate templates for current changes
./scripts/generate-doc-templates.sh
```

## 📋 Available Scripts

### 1. `check-docs-needed.sh`
**Purpose**: Detects changes that might need documentation
**Usage**: `./scripts/check-docs-needed.sh`
**Output**: Analysis of schema, component, API, and bug fix changes

### 2. `interactive-docs-prompt.sh`
**Purpose**: Provides interactive prompts for documentation updates
**Usage**:
```bash
./scripts/interactive-docs-prompt.sh                    # Interactive mode
./scripts/interactive-docs-prompt.sh --batch           # Show suggestions only
./scripts/interactive-docs-prompt.sh --open-files      # Auto-open files
```

### 3. `generate-doc-templates.sh`
**Purpose**: Creates contextual documentation templates
**Usage**:
```bash
./scripts/generate-doc-templates.sh                    # All templates + suggestions
./scripts/generate-doc-templates.sh changelog          # CHANGELOG.md template
./scripts/generate-doc-templates.sh master-docs "Section Name"  # Specific section
./scripts/generate-doc-templates.sh suggestions        # Smart suggestions only
```

### 4. `quick-deploy-with-docs.sh` (Main Integration)
**Purpose**: Enhanced deployment with documentation assistant
**Usage**:
```bash
./scripts/quick-deploy-with-docs.sh "commit message"
./scripts/quick-deploy-with-docs.sh --force-docs "critical fix"  # Always prompt
./scripts/quick-deploy-with-docs.sh --batch "minor update"      # Skip prompts
./scripts/quick-deploy-with-docs.sh --no-docs "docs only"       # Skip assistant
```

## ⚙️ Configuration

### Configuration File: `.claude-docs-config.json`

The system uses a JSON configuration file to customize behavior:

```json
{
  "autoPrompt": {
    "schemaChanges": true,        // Prompt for database changes
    "newComponents": true,        // Prompt for new components
    "apiChanges": true,          // Prompt for API changes
    "majorBugFixes": true,       // Prompt for critical fixes
    "minorBugFixes": false       // Skip minor bug fixes
  },
  "templates": {
    "generateSuggestions": true,  // Show smart suggestions
    "autoFillBasics": true,      // Pre-fill commit info
    "verboseTemplates": false    // Detailed vs. concise templates
  },
  "interactivity": {
    "batchMode": false,          // Default to interactive mode
    "autoOpenFiles": false,      // Don't auto-open documentation files
    "skipMinorChanges": true     // Skip prompts for minor changes
  }
}
```

### Customization Examples

**High-sensitivity mode** (prompt for everything):
```json
{
  "autoPrompt": {
    "schemaChanges": true,
    "newComponents": true,
    "modifiedComponents": true,
    "apiChanges": true,
    "majorBugFixes": true,
    "minorBugFixes": true,
    "performanceImprovements": true
  }
}
```

**Minimal mode** (only critical changes):
```json
{
  "autoPrompt": {
    "schemaChanges": true,
    "majorBugFixes": true,
    "newComponents": false,
    "apiChanges": false
  },
  "interactivity": {
    "skipMinorChanges": true
  }
}
```

## 🔍 Detection Logic

### What Gets Detected

**Schema Changes**:
- `backend/prisma/schema.prisma` modifications
- Database migration files
- Model additions/removals/changes

**Component Changes**:
- New files in `frontend/src/components/`
- Modifications to existing components
- New JavaScript modules

**API Changes**:
- New routes in `backend/src/routes/`
- Endpoint additions/modifications
- Request/response changes

**Major Bug Fixes**:
- Commit messages with "fix.*critical", "fix.*security", "fix.*data.*contamination"
- Breaking changes or migrations

### Commit Message Analysis

The system analyzes commit messages to categorize changes:
- **CRITICAL_FIX**: Security issues, data problems, critical bugs
- **FEATURE**: New functionality or major additions
- **BUG_FIX**: Standard bug fixes
- **IMPROVEMENT**: Enhancements and optimizations
- **PERFORMANCE**: Performance-related changes

## 📝 Template Examples

### CHANGELOG.md Template (Critical Fix)
```markdown
## 2025-09-21 - Critical Security/Data Fix

### 🚨 CRITICAL FIXES
- **Profile System**: Fixed data contamination bug in profile viewing
  - **Root Cause**: Missing window.Profile class export caused fallback
  - **Solution**: Added proper class exports and fixed routing conflicts
  - **Impact**: Users now see correct profile data, privacy works properly
  - **Verification**: Test profile viewing across different users

### 🛠️ TECHNICAL DETAILS
- **Frontend Components**: Profile.js exports updated
- **Backend Changes**: Route conflict resolution
- **Deployment**: Changes deployed to staging environment

### 📈 BUSINESS IMPACT
- **Security**: Eliminated privacy breach where users saw wrong data
- **Trust**: Platform maintains data integrity and user privacy
```

### MASTER_DOCUMENTATION.md Template (Component)
```markdown
**Last Updated**: 2025-09-21

#### Component Updates (2025-09-21)

**Modified Components**:
- **UserProfile**: Enhanced privacy controls and viewing system
- **UserCard**: Improved integration with profile system

**Usage Examples**:
```javascript
// Updated profile viewing
window.Profile.showUserProfile(userId);

// Class and instance exports
window.profile = new Profile();     // UI interactions
window.Profile = Profile;           // Static methods
```
```

## 🔄 Workflow Integration

### Recommended Workflow

1. **Develop**: Make your code changes
2. **Deploy**: Use `quick-deploy-with-docs.sh "your changes"`
3. **Review**: The system shows detected changes and suggestions
4. **Choose**: Approve, skip, or defer documentation updates
5. **Template**: System generates templates if you choose to update
6. **Edit**: Customize templates to match your content
7. **Deploy**: Changes go to staging with updated documentation

### Integration with Existing Scripts

The documentation assistant integrates with your existing workflow:
- Uses existing `validate-before-commit.sh` if available
- Falls back to manual validation if needed
- Calls existing `deployment-status.sh` for status checks
- Works with current git branch workflows

## 🎛️ Advanced Usage

### Batch Processing
```bash
# Check multiple commits without prompts
./scripts/interactive-docs-prompt.sh --batch

# Generate templates for review later
./scripts/generate-doc-templates.sh > /tmp/doc-templates.md
```

### Template Customization
```bash
# Generate specific section templates
./scripts/generate-doc-templates.sh master-docs "Database Schema"
./scripts/generate-doc-templates.sh master-docs "API Reference"
./scripts/generate-doc-templates.sh master-docs "UI/UX Components"
```

### Learning Mode (Future)
The system is designed to learn your documentation patterns:
- Track which changes you typically document
- Adapt prompting sensitivity based on your choices
- Remember preferred template styles and verbosity

## 🔧 Troubleshooting

### Common Issues

**Scripts not executable**:
```bash
chmod +x scripts/*.sh
```

**Configuration not loading**:
- Ensure `.claude-docs-config.json` is in project root
- Check JSON syntax with `cat .claude-docs-config.json | jq .`

**Git detection not working**:
- Ensure you're in a git repository
- Check that commits exist: `git log --oneline -5`

### Debug Mode
```bash
# Add debug output to any script
bash -x ./scripts/check-docs-needed.sh
```

## 📈 Benefits

### For Developers
- **Never miss documentation updates**: Automated detection catches everything
- **Save time**: Templates provide starting points instead of blank pages
- **Stay in flow**: Choose when to document rather than being forced
- **Learn patterns**: System adapts to your documentation style

### For Teams
- **Consistency**: Standardized templates and prompts across team
- **Quality**: Contextual suggestions improve documentation completeness
- **Efficiency**: Batch mode for CI/CD, interactive mode for development
- **Flexibility**: Configure sensitivity and behavior per team preferences

### For Documentation
- **Currency**: Documentation stays up-to-date with code changes
- **Completeness**: Systematic detection ensures comprehensive coverage
- **Context**: Templates include technical details and business impact
- **Traceability**: Links between commits, code changes, and documentation

## 🚀 Getting Started Checklist

1. ✅ Ensure scripts are executable: `chmod +x scripts/*.sh`
2. ✅ Review configuration: `cat .claude-docs-config.json`
3. ✅ Test detection: `./scripts/check-docs-needed.sh`
4. ✅ Try interactive mode: `./scripts/interactive-docs-prompt.sh`
5. ✅ Use integrated workflow: `./scripts/quick-deploy-with-docs.sh "test: documentation system"`

The Smart Documentation Assistant is now ready to help keep your documentation current and comprehensive! 🎉