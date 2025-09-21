#!/bin/bash

# Smart Documentation Change Detection
# Analyzes git changes and suggests documentation updates

set -e

# Configuration (can be overridden by .claude-docs-config.json)
ENABLE_SCHEMA_DETECTION=true
ENABLE_COMPONENT_DETECTION=true
ENABLE_API_DETECTION=true
ENABLE_MAJOR_BUGFIX_DETECTION=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to check if documentation config exists
load_config() {
    if [ -f ".claude-docs-config.json" ]; then
        echo -e "${BLUE}📋 Loading documentation configuration...${NC}"
        # Simple config parsing (can be enhanced with jq)
        if grep -q '"schemaChanges": false' .claude-docs-config.json; then
            ENABLE_SCHEMA_DETECTION=false
        fi
        if grep -q '"newComponents": false' .claude-docs-config.json; then
            ENABLE_COMPONENT_DETECTION=false
        fi
        if grep -q '"apiChanges": false' .claude-docs-config.json; then
            ENABLE_API_DETECTION=false
        fi
    fi
}

# Function to detect schema changes
detect_schema_changes() {
    if [ "$ENABLE_SCHEMA_DETECTION" = false ]; then
        return 0
    fi

    echo -e "${BLUE}🔍 Checking for database schema changes...${NC}"

    # Check for schema.prisma changes
    if git diff --name-only HEAD~1 HEAD | grep -q "schema.prisma"; then
        echo -e "${YELLOW}📋 Database schema changes detected:${NC}"

        # Show specific changes
        git diff HEAD~1 HEAD --stat | grep schema.prisma | head -3

        # Check for specific types of changes
        if git diff HEAD~1 HEAD backend/prisma/schema.prisma | grep -E "^\+.*String|^\+.*Int|^\+.*Boolean|^\-.*String|^\-.*Int|^\-.*Boolean" > /dev/null; then
            echo -e "${PURPLE}   • Field additions/removals detected${NC}"
            echo -e "${PURPLE}   • Consider updating: MASTER_DOCUMENTATION.md > Database Schema section${NC}"
        fi

        if git diff HEAD~1 HEAD backend/prisma/schema.prisma | grep -E "^\+model|^\-model" > /dev/null; then
            echo -e "${PURPLE}   • Model changes detected${NC}"
            echo -e "${PURPLE}   • Consider updating: MASTER_DOCUMENTATION.md > Database Schema section${NC}"
        fi

        return 1
    fi
    return 0
}

# Function to detect new components
detect_component_changes() {
    if [ "$ENABLE_COMPONENT_DETECTION" = false ]; then
        return 0
    fi

    echo -e "${BLUE}🔍 Checking for component changes...${NC}"

    # Check for new components
    if git diff --name-only HEAD~1 HEAD | grep -E "frontend/src/components/.*\.js$|frontend/src/js/.*\.js$" > /dev/null; then
        echo -e "${YELLOW}📋 Component changes detected:${NC}"

        git diff --name-only HEAD~1 HEAD | grep -E "frontend/src/components/.*\.js$|frontend/src/js/.*\.js$" | while read file; do
            if [ ! -f "$(echo $file | sed 's/HEAD~1://')" ] 2>/dev/null; then
                echo -e "${PURPLE}   • New component: $file${NC}"
            else
                echo -e "${PURPLE}   • Modified component: $file${NC}"
            fi
        done

        echo -e "${PURPLE}   • Consider updating: MASTER_DOCUMENTATION.md > UI/UX Components section${NC}"
        return 1
    fi
    return 0
}

# Function to detect API changes
detect_api_changes() {
    if [ "$ENABLE_API_DETECTION" = false ]; then
        return 0
    fi

    echo -e "${BLUE}🔍 Checking for API changes...${NC}"

    # Check for route changes
    if git diff --name-only HEAD~1 HEAD | grep -E "backend/src/routes/.*\.ts$" > /dev/null; then
        echo -e "${YELLOW}📋 API route changes detected:${NC}"

        # Look for new endpoints
        if git diff HEAD~1 HEAD backend/src/routes/ | grep -E "^\+.*router\.(get|post|put|delete)" > /dev/null; then
            echo -e "${PURPLE}   • New API endpoints detected${NC}"
            git diff HEAD~1 HEAD backend/src/routes/ | grep -E "^\+.*router\.(get|post|put|delete)" | head -3 | sed 's/^+/     /'
            echo -e "${PURPLE}   • Consider updating: MASTER_DOCUMENTATION.md > API Reference section${NC}"
        fi

        return 1
    fi
    return 0
}

# Function to detect major bug fixes
detect_major_bugfixes() {
    if [ "$ENABLE_MAJOR_BUGFIX_DETECTION" = false ]; then
        return 0
    fi

    echo -e "${BLUE}🔍 Checking for major bug fixes...${NC}"

    # Check commit message for bug fix indicators
    COMMIT_MSG=$(git log -1 --pretty=format:"%s")

    if echo "$COMMIT_MSG" | grep -iE "fix.*critical|fix.*security|fix.*bug.*major|fix.*data.*contamination|resolve.*critical" > /dev/null; then
        echo -e "${YELLOW}📋 Major bug fix detected:${NC}"
        echo -e "${PURPLE}   • Commit: $COMMIT_MSG${NC}"
        echo -e "${PURPLE}   • Consider updating: CHANGELOG.md and potentially MASTER_DOCUMENTATION.md${NC}"
        return 1
    fi
    return 0
}

# Function to generate documentation suggestions
generate_suggestions() {
    local changes_detected=$1

    if [ $changes_detected -eq 0 ]; then
        echo -e "${GREEN}✅ No significant changes detected that require documentation updates.${NC}"
        return 0
    fi

    echo ""
    echo -e "${YELLOW}📝 Documentation Update Suggestions:${NC}"
    echo ""

    # Create timestamp for documentation
    DATE=$(date +"%Y-%m-%d")

    echo -e "${BLUE}Suggested template for CHANGELOG.md:${NC}"
    echo "---"
    echo "## $DATE - [Your Title Here]"
    echo ""
    echo "### [Category: Fixed/Added/Enhanced]"
    echo "- **[Feature Name]**: [Description]"
    echo "  - **Impact**: [User-facing impact]"
    echo "  - **Files**: [Modified files]"
    echo ""
    echo "---"
    echo ""

    return 1
}

# Main function
main() {
    echo -e "${GREEN}🔍 Smart Documentation Change Detection${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo ""

    # Load configuration
    load_config

    # Track if any changes need documentation
    changes_detected=0

    # Run all detection functions
    detect_schema_changes || changes_detected=1
    detect_component_changes || changes_detected=1
    detect_api_changes || changes_detected=1
    detect_major_bugfixes || changes_detected=1

    echo ""
    echo -e "${BLUE}=================================================${NC}"

    # Generate suggestions
    generate_suggestions $changes_detected

    return $changes_detected
}

# Check if script is being run directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi