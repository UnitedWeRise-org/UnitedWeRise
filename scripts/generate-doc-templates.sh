#!/bin/bash

# Advanced Documentation Template Generator
# Analyzes git diffs and generates contextual documentation templates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration defaults
INCLUDE_COMMIT_INFO=true
INCLUDE_FILE_LIST=true
VERBOSE_TEMPLATES=false
AUTO_FILL_BASICS=true

# Function to load configuration
load_template_config() {
    if [ -f ".claude-docs-config.json" ]; then
        # Simple JSON parsing (can be enhanced with jq if available)
        if grep -q '"includeCommitInfo": false' .claude-docs-config.json; then
            INCLUDE_COMMIT_INFO=false
        fi
        if grep -q '"includeFileList": false' .claude-docs-config.json; then
            INCLUDE_FILE_LIST=false
        fi
        if grep -q '"verboseTemplates": true' .claude-docs-config.json; then
            VERBOSE_TEMPLATES=true
        fi
        if grep -q '"autoFillBasics": false' .claude-docs-config.json; then
            AUTO_FILL_BASICS=false
        fi
    fi
}

# Function to analyze git changes
analyze_git_changes() {
    local analysis_file="/tmp/git_analysis_$$"

    # Ensure tmp directory exists and is writable
    if [ ! -d "/tmp" ] || [ ! -w "/tmp" ]; then
        analysis_file="./git_analysis_$$"
    fi

    echo -e "${BLUE}🔍 Analyzing git changes for template generation...${NC}"

    # Get commit information
    local commit_sha=$(git rev-parse --short HEAD)
    local commit_msg=$(git log -1 --pretty=format:"%s")
    local commit_author=$(git log -1 --pretty=format:"%an")
    local commit_date=$(git log -1 --pretty=format:"%ad" --date=short)

    # Get file changes
    local changed_files=$(git diff --name-only HEAD~1 HEAD)
    local file_count=$(echo "$changed_files" | wc -l)

    # Store analysis results
    cat > "$analysis_file" <<EOF
COMMIT_SHA=$commit_sha
COMMIT_MSG=$commit_msg
COMMIT_AUTHOR=$commit_author
COMMIT_DATE=$commit_date
FILE_COUNT=$file_count
CHANGED_FILES<<EOL
$changed_files
EOL
EOF

    echo "$analysis_file"
}

# Function to categorize commit type
categorize_commit() {
    local commit_msg="$1"

    if echo "$commit_msg" | grep -iE "fix.*critical|fix.*security|fix.*data.*contamination|resolve.*critical" > /dev/null; then
        echo "CRITICAL_FIX"
    elif echo "$commit_msg" | grep -iE "^feat:|^add:|implement|create" > /dev/null; then
        echo "FEATURE"
    elif echo "$commit_msg" | grep -iE "^fix:|^bug:" > /dev/null; then
        echo "BUG_FIX"
    elif echo "$commit_msg" | grep -iE "enhance:|improve:|optimize:|refactor:" > /dev/null; then
        echo "IMPROVEMENT"
    elif echo "$commit_msg" | grep -iE "docs:|documentation" > /dev/null; then
        echo "DOCUMENTATION"
    elif echo "$commit_msg" | grep -iE "performance|perf:" > /dev/null; then
        echo "PERFORMANCE"
    else
        echo "OTHER"
    fi
}

# Function to detect affected systems
detect_affected_systems() {
    local changed_files="$1"
    local systems=""

    if echo "$changed_files" | grep -q "schema.prisma"; then
        systems="$systems database"
    fi
    if echo "$changed_files" | grep -q "frontend/src/components"; then
        systems="$systems frontend-components"
    fi
    if echo "$changed_files" | grep -q "backend/src/routes"; then
        systems="$systems api"
    fi
    if echo "$changed_files" | grep -q "frontend/src/css\|frontend/src/styles"; then
        systems="$systems styling"
    fi
    if echo "$changed_files" | grep -q "scripts/"; then
        systems="$systems deployment"
    fi
    if echo "$changed_files" | grep -q "\.test\.\|\.spec\."; then
        systems="$systems testing"
    fi

    echo "$systems"
}

# Function to generate CHANGELOG template
generate_changelog_template() {
    local analysis_file="$1"
    source "$analysis_file"

    local commit_category=$(categorize_commit "$COMMIT_MSG")
    local affected_systems=$(detect_affected_systems "$CHANGED_FILES")

    echo -e "${CYAN}📝 CHANGELOG.md Template:${NC}"
    echo "=================================================="

    # Generate header based on commit category
    case "$commit_category" in
        "CRITICAL_FIX")
            cat <<EOF
## $COMMIT_DATE - Critical Security/Data Fix

### 🚨 CRITICAL FIXES
- **[System Name]**: $COMMIT_MSG
  - **Root Cause**: [What caused the critical issue]
  - **Solution**: [Technical fix implemented]
  - **Impact**: [How this affects users/security]
  - **Verification**: [How to verify the fix works]
EOF
            ;;
        "FEATURE")
            cat <<EOF
## $COMMIT_DATE - New Feature Implementation

### 🎯 MAJOR FEATURES
- **[Feature Name]**: $COMMIT_MSG
  - **Purpose**: [Why this feature was needed]
  - **Functionality**: [What the feature does]
  - **Impact**: [How users benefit]
  - **Usage**: [How to use the new feature]
EOF
            ;;
        "BUG_FIX")
            cat <<EOF
## $COMMIT_DATE - Bug Fixes and Improvements

### 🔧 FIXES
- **[Bug Description]**: $COMMIT_MSG
  - **Issue**: [What was broken]
  - **Solution**: [How it was fixed]
  - **Impact**: [What users will notice]
EOF
            ;;
        "IMPROVEMENT")
            cat <<EOF
## $COMMIT_DATE - System Improvements

### 🚀 ENHANCEMENTS
- **[System/Component]**: $COMMIT_MSG
  - **Improvement**: [What was enhanced]
  - **Benefit**: [Why this improvement matters]
  - **Impact**: [User experience changes]
EOF
            ;;
        *)
            cat <<EOF
## $COMMIT_DATE - [Custom Title Here]

### 📋 CHANGES
- **[Change Type]**: $COMMIT_MSG
  - **Description**: [Detailed description]
  - **Impact**: [Effect on users/system]
EOF
            ;;
    esac

    # Add technical details if verbose mode
    if [ "$VERBOSE_TEMPLATES" = true ]; then
        echo ""
        echo "### 🛠️ TECHNICAL DETAILS"

        for system in $affected_systems; do
            case "$system" in
                "database")
                    echo "- **Database Changes**:"
                    echo "  - Schema modifications applied"
                    echo "  - Migration status: [Success/Pending]"
                    ;;
                "frontend-components")
                    echo "- **Frontend Components**:"
                    echo "  - Component modifications implemented"
                    echo "  - UI/UX changes applied"
                    ;;
                "api")
                    echo "- **API Changes**:"
                    echo "  - Endpoint modifications"
                    echo "  - Request/response updates"
                    ;;
                "styling")
                    echo "- **Styling Updates**:"
                    echo "  - CSS/UI improvements"
                    echo "  - Responsive design changes"
                    ;;
                "deployment")
                    echo "- **Deployment Changes**:"
                    echo "  - Infrastructure updates"
                    echo "  - Script improvements"
                    ;;
            esac
        done

        echo "- **Deployment**: Changes deployed to staging environment"
    fi

    # Add file list if enabled
    if [ "$INCLUDE_FILE_LIST" = true ]; then
        echo ""
        echo "### 📁 FILES MODIFIED"
        echo "$CHANGED_FILES" | while read file; do
            if [ -n "$file" ]; then
                echo "- \`$file\`"
            fi
        done
    fi

    # Add commit info if enabled
    if [ "$INCLUDE_COMMIT_INFO" = true ]; then
        echo ""
        echo "### 🔗 TECHNICAL REFERENCE"
        echo "- **Commit**: $COMMIT_SHA"
        echo "- **Author**: $COMMIT_AUTHOR"
        echo "- **Date**: $COMMIT_DATE"
    fi

    echo ""
    echo "### 📈 BUSINESS IMPACT"
    echo "- **[Impact Category]**: [Description of business/user benefit]"
    echo "- **[Metric/Measurement]**: [How success will be measured]"

    echo "=================================================="
}

# Function to generate MASTER_DOCUMENTATION template
generate_master_docs_template() {
    local analysis_file="$1"
    local section="$2"
    source "$analysis_file"

    local affected_systems=$(detect_affected_systems "$CHANGED_FILES")

    echo -e "${CYAN}📝 MASTER_DOCUMENTATION.md Template for $section:${NC}"
    echo "=================================================="

    case "$section" in
        "Database Schema")
            echo "**Last Updated**: $COMMIT_DATE"
            echo ""
            echo "#### Recent Schema Changes ($COMMIT_DATE)"
            echo ""
            if echo "$CHANGED_FILES" | grep -q "schema.prisma"; then
                echo "**Schema Modifications**:"
                echo "- [Field/Model changes]: [Description]"
                echo "- [Migration notes]: [Any special considerations]"
                echo ""
                echo "**Updated Models**:"
                echo "```prisma"
                echo "// Add updated model definitions here"
                echo "```"
            fi
            ;;
        "UI/UX Components"|"Profile System Components")
            echo "**Last Updated**: $COMMIT_DATE"
            echo ""
            echo "#### Component Updates ($COMMIT_DATE)"
            echo ""
            if echo "$CHANGED_FILES" | grep -q "frontend/src/components"; then
                echo "**Modified Components**:"
                echo "$CHANGED_FILES" | grep "frontend/src/components" | while read file; do
                    if [ -n "$file" ]; then
                        local component_name=$(basename "$file" .js)
                        echo "- **$component_name**: [Description of changes]"
                    fi
                done
                echo ""
                echo "**Usage Examples**:"
                echo "```javascript"
                echo "// Add usage examples here"
                echo "```"
            fi
            ;;
        "API Reference")
            echo "**Last Updated**: $COMMIT_DATE"
            echo ""
            echo "#### API Updates ($COMMIT_DATE)"
            echo ""
            if echo "$CHANGED_FILES" | grep -q "backend/src/routes"; then
                echo "**Modified Endpoints**:"
                echo "- [Method] \`/endpoint/path\`: [Description]"
                echo ""
                echo "**Request/Response Examples**:"
                echo "```json"
                echo "// Add API examples here"
                echo "```"
            fi
            ;;
        *)
            echo "**Last Updated**: $COMMIT_DATE"
            echo ""
            echo "#### Updates ($COMMIT_DATE)"
            echo "- **Change**: [Description]"
            echo "- **Impact**: [Effect on system]"
            ;;
    esac

    echo "=================================================="
}

# Function to generate smart suggestions
generate_smart_suggestions() {
    local analysis_file="$1"
    source "$analysis_file"

    local commit_category=$(categorize_commit "$COMMIT_MSG")
    local affected_systems=$(detect_affected_systems "$CHANGED_FILES")

    echo -e "${YELLOW}💡 Smart Documentation Suggestions:${NC}"
    echo ""

    case "$commit_category" in
        "CRITICAL_FIX")
            echo "🚨 This appears to be a critical fix. Consider:"
            echo "  • Adding detailed root cause analysis"
            echo "  • Documenting verification steps"
            echo "  • Including security implications if applicable"
            echo "  • Adding to both CHANGELOG.md and incident documentation"
            ;;
        "FEATURE")
            echo "🎯 New feature detected. Consider:"
            echo "  • Adding comprehensive feature documentation"
            echo "  • Including usage examples and screenshots"
            echo "  • Updating user guides or help sections"
            echo "  • Adding API documentation if applicable"
            ;;
        "BUG_FIX")
            echo "🔧 Bug fix detected. Consider:"
            echo "  • Describing what was broken and how it's fixed"
            echo "  • Adding regression test information"
            echo "  • Updating troubleshooting guides if relevant"
            ;;
    esac

    echo ""
    echo "📋 Affected systems detected: $affected_systems"
    for system in $affected_systems; do
        case "$system" in
            "database")
                echo "  • Update Database Schema section in MASTER_DOCUMENTATION.md"
                echo "  • Document any migration requirements"
                ;;
            "frontend-components")
                echo "  • Update UI/UX Components section in MASTER_DOCUMENTATION.md"
                echo "  • Consider adding component usage examples"
                ;;
            "api")
                echo "  • Update API Reference section in MASTER_DOCUMENTATION.md"
                echo "  • Add/update endpoint documentation"
                ;;
        esac
    done
}

# Main function
main() {
    local template_type="${1:-all}"
    local section="${2:-}"

    echo -e "${GREEN}🚀 Documentation Template Generator${NC}"
    echo ""

    # Load configuration
    load_template_config

    # Analyze git changes
    local analysis_file=$(analyze_git_changes)

    # Generate templates based on request
    case "$template_type" in
        "changelog")
            generate_changelog_template "$analysis_file"
            ;;
        "master-docs")
            if [ -z "$section" ]; then
                echo -e "${RED}Error: Section required for master-docs template${NC}"
                echo "Usage: $0 master-docs \"Section Name\""
                exit 1
            fi
            generate_master_docs_template "$analysis_file" "$section"
            ;;
        "suggestions")
            generate_smart_suggestions "$analysis_file"
            ;;
        "all"|*)
            generate_smart_suggestions "$analysis_file"
            echo ""
            generate_changelog_template "$analysis_file"
            echo ""
            echo -e "${BLUE}For specific section templates, use:${NC}"
            echo "  $0 master-docs \"Database Schema\""
            echo "  $0 master-docs \"UI/UX Components\""
            echo "  $0 master-docs \"API Reference\""
            ;;
    esac

    # Cleanup
    rm -f "$analysis_file"
}

# Check if script is being run directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi