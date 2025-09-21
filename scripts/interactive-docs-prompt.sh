#!/bin/bash

# Interactive Documentation Prompt System
# Provides smart prompts for documentation updates with user control

set -e

# Source the change detection script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/check-docs-needed.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global flags
BATCH_MODE=false
AUTO_OPEN_FILES=false
GENERATE_TEMPLATES=true

# Function to show help
show_help() {
    echo "Interactive Documentation Prompt System"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -b, --batch          Run in batch mode (no interactive prompts)"
    echo "  -o, --open-files     Automatically open documentation files"
    echo "  -n, --no-templates   Skip template generation"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                   # Interactive mode with prompts"
    echo "  $0 --batch          # Show suggestions without prompts"
    echo "  $0 --open-files     # Open docs and generate templates"
}

# Function to prompt user with options
prompt_user() {
    local question="$1"
    local options="$2"  # Format: "y:Yes,n:No,s:Skip"

    if [ "$BATCH_MODE" = true ]; then
        return 2  # Skip in batch mode
    fi

    echo -e "${CYAN}$question${NC}"

    # Parse and display options
    IFS=',' read -ra OPTION_ARRAY <<< "$options"
    for option in "${OPTION_ARRAY[@]}"; do
        IFS=':' read -ra PARTS <<< "$option"
        echo -e "${PURPLE}  ${PARTS[0]}${NC} - ${PARTS[1]}"
    done

    echo -n "Choice: "
    read -r choice

    # Return choice as exit code
    case "$choice" in
        y|Y|yes|Yes) return 0 ;;
        n|N|no|No) return 1 ;;
        s|S|skip|Skip) return 2 ;;
        l|L|later|Later) return 3 ;;
        *)
            echo -e "${RED}Invalid choice. Defaulting to skip.${NC}"
            return 2
            ;;
    esac
}

# Function to open documentation files
open_documentation_file() {
    local file="$1"
    local section="$2"

    if [ "$AUTO_OPEN_FILES" = true ] || prompt_user "Open $file for editing?" "y:Yes,n:No,s:Skip"; then
        case $? in
            0)
                echo -e "${GREEN}📂 Opening $file...${NC}"
                if command -v code > /dev/null; then
                    code "$file"
                elif command -v notepad > /dev/null; then
                    notepad "$file"
                else
                    echo -e "${YELLOW}   Please open manually: $file${NC}"
                    if [ -n "$section" ]; then
                        echo -e "${YELLOW}   Focus on section: $section${NC}"
                    fi
                fi
                ;;
            2|3)
                echo -e "${BLUE}   Skipped opening $file${NC}"
                ;;
        esac
    fi
}

# Function to generate documentation template
generate_documentation_template() {
    local template_type="$1"
    local context="$2"

    if [ "$GENERATE_TEMPLATES" = false ]; then
        return 0
    fi

    DATE=$(date +"%Y-%m-%d")
    COMMIT_MSG=$(git log -1 --pretty=format:"%s")
    COMMIT_SHA=$(git rev-parse --short HEAD)

    case "$template_type" in
        "changelog")
            echo -e "${CYAN}📝 Generated CHANGELOG.md template:${NC}"
            echo "---"
            echo "## $DATE - [Your Title Here]"
            echo ""
            echo "### 🚨 CRITICAL FIXES / 🎯 MAJOR FEATURES / 🔐 IMPROVEMENTS"
            echo "- **[Feature Name]**: $COMMIT_MSG"
            echo "  - **Root Cause**: [If fixing bug - what caused it]"
            echo "  - **Solution**: [What was implemented]"
            echo "  - **Impact**: [User-facing changes]"
            echo "  - **Files**: [Key files modified]"
            echo ""
            echo "### 🛠️ TECHNICAL DETAILS"
            echo "- **[Component Changes]**:"
            echo "  - [Specific technical implementation details]"
            echo "- **Deployment**: Changes deployed to staging environment"
            echo ""
            echo "### 📈 BUSINESS IMPACT"
            echo "- **[Impact Category]**: [Description of business/user benefit]"
            echo "---"
            ;;
        "master-docs")
            echo -e "${CYAN}📝 Suggested MASTER_DOCUMENTATION.md updates:${NC}"
            echo ""
            echo "Section to update: $context"
            echo "Last Updated timestamp: Update to $DATE"
            echo ""
            if echo "$context" | grep -q "Database"; then
                echo "Database Schema section:"
                echo "- Document any new/removed fields"
                echo "- Update model definitions"
                echo "- Add migration notes if applicable"
            elif echo "$context" | grep -q "Component"; then
                echo "UI/UX Components section:"
                echo "- Document new component functionality"
                echo "- Add usage examples"
                echo "- Update integration notes"
            elif echo "$context" | grep -q "API"; then
                echo "API Reference section:"
                echo "- Document new endpoints"
                echo "- Update parameter descriptions"
                echo "- Add example requests/responses"
            fi
            ;;
    esac
    echo ""
}

# Function to handle schema change prompts
handle_schema_changes() {
    echo -e "${YELLOW}📋 Database schema changes detected!${NC}"

    if prompt_user "Update MASTER_DOCUMENTATION.md database schema section?" "y:Yes,n:No,l:Later"; then
        case $? in
            0)
                generate_documentation_template "master-docs" "Database Schema"
                open_documentation_file "MASTER_DOCUMENTATION.md" "Database Schema"
                ;;
            3)
                echo -e "${BLUE}   Reminder: Update database schema documentation later${NC}"
                ;;
        esac
    fi
}

# Function to handle component change prompts
handle_component_changes() {
    echo -e "${YELLOW}📋 Component changes detected!${NC}"

    if prompt_user "Update MASTER_DOCUMENTATION.md UI/UX Components section?" "y:Yes,n:No,l:Later"; then
        case $? in
            0)
                generate_documentation_template "master-docs" "UI/UX Components"
                open_documentation_file "MASTER_DOCUMENTATION.md" "UI/UX Components"
                ;;
            3)
                echo -e "${BLUE}   Reminder: Update component documentation later${NC}"
                ;;
        esac
    fi
}

# Function to handle API change prompts
handle_api_changes() {
    echo -e "${YELLOW}📋 API changes detected!${NC}"

    if prompt_user "Update MASTER_DOCUMENTATION.md API Reference section?" "y:Yes,n:No,l:Later"; then
        case $? in
            0)
                generate_documentation_template "master-docs" "API Reference"
                open_documentation_file "MASTER_DOCUMENTATION.md" "API Reference"
                ;;
            3)
                echo -e "${BLUE}   Reminder: Update API documentation later${NC}"
                ;;
        esac
    fi
}

# Function to handle major bugfix prompts
handle_major_bugfixes() {
    echo -e "${YELLOW}📋 Major bug fix detected!${NC}"

    if prompt_user "Add entry to CHANGELOG.md?" "y:Yes,n:No,l:Later"; then
        case $? in
            0)
                generate_documentation_template "changelog" "Major Bug Fix"
                open_documentation_file "CHANGELOG.md" "Recent Changes"
                ;;
            3)
                echo -e "${BLUE}   Reminder: Update CHANGELOG.md later${NC}"
                ;;
        esac
    fi
}

# Function to run comprehensive documentation check
run_documentation_check() {
    echo -e "${GREEN}🔍 Smart Documentation Assistant${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo ""

    # Run change detection (sourced function)
    load_config

    local changes_detected=false
    local handled_schema=false
    local handled_components=false
    local handled_api=false
    local handled_bugfixes=false

    # Check each type of change and handle interactively
    echo -e "${BLUE}🔍 Analyzing changes for documentation needs...${NC}"
    echo ""

    if detect_schema_changes; then
        echo -e "${GREEN}   No schema changes detected${NC}"
    else
        changes_detected=true
        if [ "$BATCH_MODE" = false ]; then
            handle_schema_changes
            handled_schema=true
        fi
    fi

    if detect_component_changes; then
        echo -e "${GREEN}   No component changes detected${NC}"
    else
        changes_detected=true
        if [ "$BATCH_MODE" = false ]; then
            handle_component_changes
            handled_components=true
        fi
    fi

    if detect_api_changes; then
        echo -e "${GREEN}   No API changes detected${NC}"
    else
        changes_detected=true
        if [ "$BATCH_MODE" = false ]; then
            handle_api_changes
            handled_api=true
        fi
    fi

    if detect_major_bugfixes; then
        echo -e "${GREEN}   No major bug fixes detected${NC}"
    else
        changes_detected=true
        if [ "$BATCH_MODE" = false ]; then
            handle_major_bugfixes
            handled_bugfixes=true
        fi
    fi

    echo ""
    echo -e "${BLUE}=================================================${NC}"

    if [ "$changes_detected" = false ]; then
        echo -e "${GREEN}✅ No documentation updates needed.${NC}"
        return 0
    elif [ "$BATCH_MODE" = true ]; then
        echo -e "${YELLOW}📋 Changes detected that may need documentation (batch mode)${NC}"
        generate_suggestions 1
        return 1
    else
        echo -e "${GREEN}✅ Documentation check complete.${NC}"

        # Offer to open both files for review
        if [ "$handled_schema" = true ] || [ "$handled_components" = true ] || [ "$handled_api" = true ]; then
            if prompt_user "Review all documentation files?" "y:Yes,n:No"; then
                if [ $? -eq 0 ]; then
                    open_documentation_file "MASTER_DOCUMENTATION.md"
                    open_documentation_file "CHANGELOG.md"
                fi
            fi
        fi

        return 0
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--batch)
            BATCH_MODE=true
            shift
            ;;
        -o|--open-files)
            AUTO_OPEN_FILES=true
            shift
            ;;
        -n|--no-templates)
            GENERATE_TEMPLATES=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    run_documentation_check
fi