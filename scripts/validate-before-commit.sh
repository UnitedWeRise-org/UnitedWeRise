#!/bin/bash
# Pre-Commit Validation Script
# Usage: ./scripts/validate-before-commit.sh

echo "🔍 Running pre-commit validation..."
echo ""

validation_failed=false

# 1. TypeScript compilation check
echo "1️⃣ Checking TypeScript compilation..."
cd backend
if npm run build > /dev/null 2>&1; then
    echo "   ✅ TypeScript compilation successful"
else
    echo "   ❌ TypeScript compilation failed"
    echo "   🔧 Run 'cd backend && npm run build' to see errors"
    validation_failed=true
fi
cd ..

# 2. Cross-reference validation
echo ""
echo "2️⃣ Validating documentation cross-references..."
if node scripts/validate-cross-references.js > /dev/null 2>&1; then
    echo "   ✅ All cross-references valid"
else
    echo "   ❌ Broken cross-references found"
    echo "   🔧 Run 'node scripts/validate-cross-references.js' to see details"
    validation_failed=true
fi

# 3. API endpoint availability test
echo ""
echo "3️⃣ Testing critical API endpoints..."
test_endpoint() {
    local endpoint=$1
    local name=$2

    if curl -s "https://dev-api.unitedwerise.org$endpoint" > /dev/null 2>&1; then
        echo "   ✅ $name responsive"
    else
        echo "   ⚠️  $name not responsive (staging may be down)"
    fi
}

test_endpoint "/health" "Health endpoint"
test_endpoint "/api/auth/me" "Auth endpoint"

# 4. Documentation freshness check
echo ""
echo "4️⃣ Checking documentation freshness..."
today=$(date +%Y-%m-%d)

# Check if MASTER_DOCUMENTATION.md was updated recently
if git log --since="7 days ago" --oneline -- MASTER_DOCUMENTATION.md | grep -q .; then
    echo "   ✅ MASTER_DOCUMENTATION.md updated within 7 days"
else
    echo "   ⚠️  MASTER_DOCUMENTATION.md not updated in 7+ days"
    echo "   💡 Consider updating if you made significant changes"
fi

# 5. Git status check
echo ""
echo "5️⃣ Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "   📝 Changes detected:"
    git status --porcelain | head -5
    if [ $(git status --porcelain | wc -l) -gt 5 ]; then
        echo "   ... and $(( $(git status --porcelain | wc -l) - 5 )) more files"
    fi
else
    echo "   ✅ Working tree clean"
fi

# Summary
echo ""
echo "📊 Validation Summary:"
if [ "$validation_failed" = true ]; then
    echo "   ❌ Validation failed - fix issues before committing"
    echo ""
    echo "🔧 Common fixes:"
    echo "   - TypeScript errors: cd backend && npm run build"
    echo "   - Cross-references: node scripts/validate-cross-references.js"
    echo "   - Documentation: Update relevant .md files"
    exit 1
else
    echo "   ✅ All validations passed - ready to commit!"
    echo ""
    echo "💡 Suggested next steps:"
    echo "   git add ."
    echo "   git commit -m 'feat/fix: Your description'"
    echo "   git push origin development"
    echo "   ./scripts/deployment-status.sh"
fi