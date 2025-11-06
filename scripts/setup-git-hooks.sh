#!/bin/bash
# Setup script to install git pre-commit hooks for schema validation
# Optional - developers can choose to enable this

echo "================================================"
echo "   GIT PRE-COMMIT HOOK SETUP"
echo "================================================"
echo ""
echo "This will install a pre-commit hook that validates Prisma schema changes."
echo ""
echo "The hook will:"
echo "  ✅ Check schema.prisma syntax"
echo "  ✅ Ensure schema changes include migration files"
echo "  ✅ Prevent accidental production database errors"
echo ""
read -p "Do you want to install the pre-commit hook? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Installation cancelled"
  exit 0
fi

# Make validation script executable
echo "Making validation script executable..."
chmod +x scripts/validate-schema-precommit.sh

# Create pre-commit hook
echo "Creating pre-commit hook..."
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Auto-generated pre-commit hook for schema validation
# Created by: scripts/setup-git-hooks.sh

exec bash scripts/validate-schema-precommit.sh
EOF

# Make hook executable
chmod +x .git/hooks/pre-commit

echo ""
echo "================================================"
echo "   ✅ PRE-COMMIT HOOK INSTALLED"
echo "================================================"
echo ""
echo "The hook will now run automatically before each commit."
echo ""
echo "To bypass the hook (NOT RECOMMENDED):"
echo "  git commit --no-verify"
echo ""
echo "To uninstall:"
echo "  rm .git/hooks/pre-commit"
echo ""
