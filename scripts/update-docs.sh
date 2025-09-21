#!/bin/bash
# Documentation Update Automation
# Usage: ./scripts/update-docs.sh

echo "📚 Updating documentation metadata..."
echo ""

current_date=$(date +"%B %d, %Y")
current_iso_date=$(date +"%Y-%m-%d")

echo "📅 Current date: $current_date"
echo ""

# Update MASTER_DOCUMENTATION.md last updated
echo "1️⃣ Updating MASTER_DOCUMENTATION.md..."
if grep -q "Last Updated:" MASTER_DOCUMENTATION.md; then
    sed -i "s/Last Updated: .*/Last Updated: $current_date/" MASTER_DOCUMENTATION.md
    echo "   ✅ Updated last modified date"
else
    echo "   ⚠️  No 'Last Updated:' field found"
fi

# Update API_QUICK_REFERENCE.md
echo ""
echo "2️⃣ Updating API_QUICK_REFERENCE.md..."
if [ -f "API_QUICK_REFERENCE.md" ] && grep -q "Last Updated:" API_QUICK_REFERENCE.md; then
    sed -i "s/\\*\\*Last Updated\\*\\*: .*/\\*\\*Last Updated\\*\\*: $current_iso_date/" API_QUICK_REFERENCE.md
    echo "   ✅ Updated API reference date"
else
    echo "   ⚠️  API_QUICK_REFERENCE.md not found or no date field"
fi

# Update CHANGELOG.md with session entry
echo ""
echo "3️⃣ Adding CHANGELOG.md entry..."
if [ -f "CHANGELOG.md" ]; then
    # Create backup
    cp CHANGELOG.md CHANGELOG.md.backup

    # Add new entry after the header
    {
        head -n 5 CHANGELOG.md
        echo ""
        echo "## [$current_iso_date] - Documentation Update"
        echo ""
        echo "### Changed"
        echo "- Updated documentation timestamps"
        echo "- Automated documentation maintenance"
        echo ""
        tail -n +6 CHANGELOG.md
    } > CHANGELOG.md.tmp

    mv CHANGELOG.md.tmp CHANGELOG.md
    rm -f CHANGELOG.md.backup
    echo "   ✅ Added CHANGELOG entry"
else
    echo "   ⚠️  CHANGELOG.md not found"
fi

# Validate cross-references
echo ""
echo "4️⃣ Validating documentation cross-references..."
if node scripts/validate-cross-references.js > /dev/null 2>&1; then
    echo "   ✅ All cross-references valid"
else
    echo "   ❌ Cross-reference validation failed"
    echo "   🔧 Run 'node scripts/validate-cross-references.js' for details"
fi

# Git status check
echo ""
echo "5️⃣ Git status after updates..."
if [ -n "$(git status --porcelain)" ]; then
    echo "   📝 Modified files:"
    git status --porcelain | grep -E "\\.md$"
    echo ""
    echo "💡 Ready to commit documentation updates:"
    echo "   git add *.md"
    echo "   git commit -m 'docs: Update documentation timestamps and metadata'"
else
    echo "   ✅ No changes detected"
fi

echo ""
echo "📚 Documentation update complete!"