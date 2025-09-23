#!/bin/bash

echo "==================================="
echo "   DATABASE SAFETY CHECK"
echo "==================================="
echo ""

# Check staging backend database
echo "🔍 Checking Staging Backend..."
STAGING_DB=$(az containerapp show --name unitedwerise-backend-staging --resource-group unitedwerise-rg \
  --query "properties.template.containers[0].env[?name=='DATABASE_URL'].value" -o tsv 2>/dev/null | grep -o '@[^.]*')
echo "   Staging points to: $STAGING_DB"

if [[ "$STAGING_DB" == *"dev"* ]]; then
  echo "   ✅ SAFE - Using development database"
else
  echo "   ❌ DANGER - Using production database!"
fi

echo ""

# Check production backend database
echo "🔍 Checking Production Backend..."
PROD_DB=$(az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg \
  --query "properties.template.containers[0].env[?name=='DATABASE_URL'].value" -o tsv 2>/dev/null | grep -o '@[^.]*')
echo "   Production points to: $PROD_DB"

if [[ "$PROD_DB" == *"dev"* ]]; then
  echo "   ❌ DANGER - Production using development database!"
else
  echo "   ✅ SAFE - Using production database"
fi

echo ""

# Check local development database
echo "🔍 Checking Local Development..."
if [ -f "backend/.env" ]; then
  LOCAL_DB=$(grep DATABASE_URL backend/.env | grep -o '@[^.]*')
  echo "   Local points to: $LOCAL_DB"

  if [[ "$LOCAL_DB" == *"dev"* ]]; then
    echo "   ✅ SAFE - Using development database"
  else
    echo "   ⚠️  WARNING - Using production database locally!"
    echo "   Run: cd backend && node test-db-isolation.js"
  fi
else
  echo "   ⚠️  No backend/.env file found"
fi

echo ""
echo "==================================="
echo "Summary:"
echo "- Staging → Development DB: Expected"
echo "- Production → Production DB: Expected"
echo "- Local → Development DB: Expected"
echo "==================================="