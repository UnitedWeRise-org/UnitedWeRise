#!/bin/bash

# Enhanced Quick Deploy with Smart Documentation Assistant
# Combines existing deployment workflow with automatic documentation prompts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
ENABLE_DOC_PROMPTS=true
ENABLE_DOC_VALIDATION=true
FORCE_DOCS=false
BATCH_MODE=false

# Function to show help
show_help() {
    echo "Enhanced Quick Deploy with Documentation Assistant"
    echo ""
    echo "Usage: $0 [OPTIONS] \"commit message\""
    echo ""
    echo "Options:"
    echo "  -f, --force-docs     Always prompt for documentation updates"
    echo "  -b, --batch         Skip documentation prompts (batch mode)"
    echo "  -n, --no-docs       Skip documentation assistant entirely"
    echo "  -v, --validate      Validate documentation before deploying"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 \"feat: add new user profile system\""
    echo "  $0 --force-docs \"fix: critical security bug\""
    echo "  $0 --batch \"docs: update readme\""
}

# Function to validate documentation
validate_documentation() {
    echo -e "${BLUE}📋 Validating documentation...${NC}"

    local issues_found=false

    # Check if MASTER_DOCUMENTATION.md timestamp is recent
    if [ -f "MASTER_DOCUMENTATION.md" ]; then
        local last_modified=$(stat -c %Y "MASTER_DOCUMENTATION.md" 2>/dev/null || stat -f %m "MASTER_DOCUMENTATION.md" 2>/dev/null || echo "0")
        local now=$(date +%s)
        local days_old=$(( (now - last_modified) / 86400 ))

        if [ $days_old -gt 30 ]; then
            echo -e "${YELLOW}   ⚠️  MASTER_DOCUMENTATION.md is $days_old days old${NC}"
            issues_found=true
        fi
    else
        echo -e "${RED}   ❌ MASTER_DOCUMENTATION.md not found${NC}"
        issues_found=true
    fi

    # Check if CHANGELOG.md has recent entries
    if [ -f "CHANGELOG.md" ]; then
        local recent_date=$(date +"%Y-%m-%d")
        local yesterday=$(date -d "yesterday" +"%Y-%m-%d" 2>/dev/null || date -v -1d +"%Y-%m-%d" 2>/dev/null || echo "")

        if ! grep -q "$recent_date\|$yesterday" "CHANGELOG.md"; then
            echo -e "${YELLOW}   ⚠️  CHANGELOG.md has no recent entries${NC}"
        fi
    else
        echo -e "${RED}   ❌ CHANGELOG.md not found${NC}"
        issues_found=true
    fi

    if [ "$issues_found" = true ]; then
        echo -e "${YELLOW}   📝 Consider updating documentation before deploying${NC}"
        return 1
    else
        echo -e "${GREEN}   ✅ Documentation validation passed${NC}"
        return 0
    fi
}

# Function to run the existing deployment workflow
run_deployment() {
    local commit_msg="$1"

    echo -e "${GREEN}🚀 Starting deployment process...${NC}"

    # Use existing validation script if available
    if [ -f "$SCRIPT_DIR/validate-before-commit.sh" ]; then
        echo -e "${BLUE}🔍 Running pre-deployment validation...${NC}"
        if ! "$SCRIPT_DIR/validate-before-commit.sh"; then
            echo -e "${YELLOW}   📝 Manual validation fallback...${NC}"
            # Manual validation fallback
            git status
            if [ -d "backend" ]; then
                cd backend && npm run build && cd ..
            fi
            git log -1 --oneline
            git log origin/development..HEAD
        fi
    else
        echo -e "${YELLOW}📝 Running manual validation...${NC}"
        git status
        if [ -d "backend" ]; then
            cd backend && npm run build && cd ..
        fi
    fi

    # Ensure we're on development branch
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "development" ]; then
        echo -e "${BLUE}🔄 Switching to development branch...${NC}"
        git checkout development
        git pull origin development
    fi

    # Commit and push changes
    echo -e "${BLUE}📝 Committing changes...${NC}"
    git add .
    git commit -m "$commit_msg"
    git push origin development

    echo -e "${GREEN}✅ Deployment to staging initiated${NC}"
    echo -e "${BLUE}📱 Staging URL: https://dev.unitedwerise.org${NC}"
    echo -e "${BLUE}🖥️  Backend API: https://dev-api.unitedwerise.org${NC}"
}

# Function to run documentation assistant
run_documentation_assistant() {
    local commit_msg="$1"

    if [ "$ENABLE_DOC_PROMPTS" = false ]; then
        echo -e "${BLUE}📋 Documentation assistant disabled${NC}"
        return 0
    fi

    echo -e "${CYAN}📚 Running Smart Documentation Assistant...${NC}"

    # Determine mode based on configuration
    local doc_args=""
    if [ "$BATCH_MODE" = true ]; then
        doc_args="--batch"
    fi
    if [ "$FORCE_DOCS" = true ]; then
        doc_args="$doc_args --open-files"
    fi

    # Run the interactive documentation prompt
    if [ -f "$SCRIPT_DIR/interactive-docs-prompt.sh" ]; then
        if ! "$SCRIPT_DIR/interactive-docs-prompt.sh" $doc_args; then
            echo -e "${YELLOW}📝 Documentation updates suggested (see above)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Documentation assistant not found, running basic check...${NC}"
        if [ -f "$SCRIPT_DIR/check-docs-needed.sh" ]; then
            "$SCRIPT_DIR/check-docs-needed.sh"
        fi
    fi
}

# Function to show deployment status
show_deployment_status() {
    echo -e "${BLUE}🔍 Checking deployment status...${NC}"

    if [ -f "$SCRIPT_DIR/deployment-status.sh" ]; then
        "$SCRIPT_DIR/deployment-status.sh"
    else
        echo -e "${YELLOW}📝 Manual status check...${NC}"
        if command -v curl > /dev/null; then
            echo -e "${BLUE}   🌐 Checking staging backend...${NC}"
            if curl -s "https://dev-api.unitedwerise.org/health" | grep -q "healthy"; then
                echo -e "${GREEN}   ✅ Staging backend is healthy${NC}"
            else
                echo -e "${YELLOW}   ⚠️  Staging backend status unknown${NC}"
            fi
        fi
    fi
}

# Parse command line arguments
commit_message=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force-docs)
            FORCE_DOCS=true
            shift
            ;;
        -b|--batch)
            BATCH_MODE=true
            ENABLE_DOC_PROMPTS=false
            shift
            ;;
        -n|--no-docs)
            ENABLE_DOC_PROMPTS=false
            shift
            ;;
        -v|--validate)
            ENABLE_DOC_VALIDATION=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            if [ -z "$commit_message" ]; then
                commit_message="$1"
            else
                echo "Multiple commit messages provided. Use quotes for messages with spaces."
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate commit message
if [ -z "$commit_message" ]; then
    echo -e "${RED}Error: Commit message required${NC}"
    show_help
    exit 1
fi

# Main execution flow
main() {
    echo -e "${GREEN}🚀 Enhanced Deploy with Documentation Assistant${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${PURPLE}Commit: $commit_message${NC}"
    echo ""

    # Step 1: Documentation validation (if enabled)
    if [ "$ENABLE_DOC_VALIDATION" = true ]; then
        if ! validate_documentation; then
            echo ""
            if [ "$BATCH_MODE" = false ]; then
                echo -n "Continue with deployment despite documentation warnings? (y/N): "
                read -r response
                if [[ ! "$response" =~ ^[Yy]$ ]]; then
                    echo -e "${YELLOW}📝 Deployment cancelled. Please update documentation and try again.${NC}"
                    exit 1
                fi
            fi
        fi
        echo ""
    fi

    # Step 2: Run documentation assistant (before deployment)
    if [ "$ENABLE_DOC_PROMPTS" = true ]; then
        run_documentation_assistant "$commit_message"
        echo ""
    fi

    # Step 3: Run deployment
    run_deployment "$commit_message"
    echo ""

    # Step 4: Show deployment status
    show_deployment_status
    echo ""

    # Step 5: Final summary
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo -e "${BLUE}📱 Test your changes at: https://dev.unitedwerise.org${NC}"

    if [ "$ENABLE_DOC_PROMPTS" = true ] && [ "$BATCH_MODE" = false ]; then
        echo ""
        echo -e "${CYAN}💡 Pro tip: Update documentation while testing to keep it current!${NC}"
    fi
}

# Run main function
main