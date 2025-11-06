#!/bin/bash
# Pre-commit validation for Prisma schema changes
# Ensures schema.prisma changes include migration files

set -e

echo "🔍 Pre-commit: Validating Prisma schema changes..."

cd backend

# Check if schema.prisma is being committed (staged changes)
if git diff --cached --name-only | grep -q "prisma/schema.prisma"; then
  echo "   📝 schema.prisma modified, checking for migration..."

  # Step 1: Validate schema syntax
  if ! npx prisma validate --schema=prisma/schema.prisma 2>/dev/null; then
    echo ""
    echo "   ❌ Schema syntax error detected!"
    echo "   Run: cd backend && npx prisma validate"
    echo ""
    exit 1
  fi

  # Step 2: Check if migration was created
  if git diff --cached --name-only | grep -q "prisma/migrations/.*\.sql"; then
    echo "   ✅ Schema changes include migration file"
    echo ""
    echo "✅ Pre-commit validation passed"
    exit 0
  else
    echo ""
    echo "   ❌ ERROR: Schema modified without creating migration!"
    echo ""
    echo "   You changed backend/prisma/schema.prisma but did not create a migration."
    echo "   This will cause production database errors (500 responses)."
    echo ""
    echo "   📋 To fix this:"
    echo "      1. cd backend"
    echo "      2. npx prisma migrate dev --name \"describe_your_changes\""
    echo "      3. git add prisma/migrations/"
    echo "      4. git commit"
    echo ""
    echo "   💡 Or bypass this check (NOT RECOMMENDED):"
    echo "      git commit --no-verify"
    echo ""
    exit 1
  fi
fi

# No schema changes detected
echo "   ℹ️  No schema.prisma changes detected in commit"
echo "✅ Pre-commit validation passed"
exit 0
