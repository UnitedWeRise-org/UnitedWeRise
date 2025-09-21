#!/bin/bash
# Development Environment Startup Script
# Usage: ./scripts/dev-start.sh

echo "🚀 Starting UnitedWeRise development environment..."
echo ""

# Ensure we're on development branch
echo "📋 Checking git status..."
git status

echo ""
echo "🔄 Switching to development branch and pulling latest..."
git checkout development
git pull origin development

echo ""
echo "🔨 Building backend (TypeScript compilation check)..."
cd backend
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Development environment ready!"
    echo "📍 Current branch: $(git branch --show-current)"
    echo "📍 Last commit: $(git log -1 --oneline)"
    echo ""
    echo "🌐 Environment URLs:"
    echo "   Staging Frontend: https://dev.unitedwerise.org"
    echo "   Staging Backend:  https://dev-api.unitedwerise.org"
    echo "   Production Frontend: https://www.unitedwerise.org"
    echo "   Production Backend:  https://api.unitedwerise.org"
else
    echo ""
    echo "❌ TypeScript compilation failed!"
    echo "🔧 Fix compilation errors before proceeding."
    exit 1
fi

cd ..
echo ""
echo "💡 Next steps:"
echo "   - Make your changes"
echo "   - Run ./scripts/validate-before-commit.sh"
echo "   - Commit and push to development"
echo "   - Deploy to staging for testing"